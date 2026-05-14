import "server-only";
import { getChainspectAvgTxFee, getChainspectBlockTime, getChainspectDevelopers, getChainspectRealTimeTps } from "@/lib/chainspect";
import { getDepinRevenue } from "@/lib/depinpulse";
import { getBenjiValueByNetwork, getBuidlValueByNetwork, getChainRevenue, getChainTvl, getStablecoinSupplyByChain } from "@/lib/defillama";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { autoApproveSource, canAutoApproveCoinGecko, getAllLogoSources, getLogo, setAdminSetting, updateLogoFetchState, upsertLogo, upsertLogoSource } from "@/lib/admin/logoDb";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";

type ScanMetric = {
  id: string;
  label: string;
  category: "chain" | "project" | "asset";
  load: (limit: number) => Promise<{ rows: { name: string }[] }>;
};

export type MetricLogoScanSummary = {
  timestamp: string;
  limit: number;
  metricsScanned: number;
  rowsChecked: number;
  newEntities: number;
  autoApproved: number;
  needsReview: number;
  errors: string[];
  issueTypes: string[];
};

export const METRIC_LOGO_SCAN_SETTING = "last_metric_logo_discovery_summary";

export function parseMetricLogoScanSummary(raw: string | null): MetricLogoScanSummary | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MetricLogoScanSummary>;
    if (!parsed.timestamp) return null;
    return {
      timestamp: String(parsed.timestamp),
      limit: Number(parsed.limit ?? 30),
      metricsScanned: Number(parsed.metricsScanned ?? 0),
      rowsChecked: Number(parsed.rowsChecked ?? 0),
      newEntities: Number(parsed.newEntities ?? 0),
      autoApproved: Number(parsed.autoApproved ?? 0),
      needsReview: Number(parsed.needsReview ?? 0),
      errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : [],
      issueTypes: Array.isArray(parsed.issueTypes) ? parsed.issueTypes.map(String) : [],
    };
  } catch {
    return null;
  }
}

const scanMetrics: ScanMetric[] = [
  { id: "chain_revenue_30d", label: "Top chains by revenue", category: "chain", load: (limit) => getChainRevenue(limit, "30d") },
  { id: "chain_tvl_current", label: "Top chains by TVL", category: "chain", load: getChainTvl },
  { id: "stablecoin_supply", label: "Top chains by stablecoin supply", category: "chain", load: getStablecoinSupplyByChain },
  { id: "chain_realtime_tps", label: "Top chains by TPS", category: "chain", load: getChainspectRealTimeTps },
  { id: "chain_block_time", label: "Top chains by block time", category: "chain", load: getChainspectBlockTime },
  { id: "chain_avg_tx_fee", label: "Top chains by average tx fee", category: "chain", load: getChainspectAvgTxFee },
  { id: "chain_developers", label: "Top chains by developers", category: "chain", load: getChainspectDevelopers },
  { id: "depin_revenue_30d", label: "Top DePIN projects by revenue", category: "project", load: (limit) => getDepinRevenue(limit, "30d") },
  { id: "buidl_network_value", label: "BUIDL onchain marketcap", category: "asset", load: getBuidlValueByNetwork },
  { id: "benji_network_value", label: "BENJI onchain marketcap", category: "asset", load: getBenjiValueByNetwork },
];

async function fetchCoinGeckoLogoSource(coinId: string) {
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, {
    headers: { accept: "application/json", ...(process.env.COINGECKO_DEMO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY } : {}) },
  });
  if (!response.ok) throw new Error(`CoinGecko lookup for ${coinId} failed (${response.status}).`);
  const json = await response.json();
  const imageUrl = json.image?.large || json.image?.small || json.image?.thumb || "";
  if (!imageUrl) throw new Error(`CoinGecko did not return an image URL for ${coinId}.`);
  return { imageUrl, sourceUrl: `https://www.coingecko.com/en/coins/${coinId}`, metadata: { coinId, symbol: json.symbol, name: json.name } };
}

export async function runMetricLogoDiscovery(limit = 30): Promise<MetricLogoScanSummary> {
  if (!hasDatabaseConfig()) throw new Error("DATABASE_URL is required for metric logo discovery.");
  const boundedLimit = Math.max(3, Math.min(30, Math.floor(limit || 30)));
  const seen = new Map<string, { name: string; category: ScanMetric["category"]; metrics: string[] }>();
  const errors: string[] = [];
  let metricsScanned = 0;

  for (const metric of scanMetrics) {
    try {
      const data = await metric.load(boundedLimit);
      metricsScanned += 1;
      for (const row of data.rows.slice(0, boundedLimit)) {
        const logo = await upsertLogo(row.name, metric.category);
        const existing = seen.get(logo.slug);
        seen.set(logo.slug, { name: logo.name, category: metric.category, metrics: [...(existing?.metrics ?? []), metric.id] });
      }
    } catch (error) {
      errors.push(`${metric.id}: ${error instanceof Error ? error.message : "Unknown scan error"}`);
    }
  }

  const allSources = (await getAllLogoSources()).rows;
  const sourcesByLogo = new Map<string, typeof allSources>();
  for (const source of allSources) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);

  let newEntities = 0;
  let autoApproved = 0;
  let needsReview = 0;
  for (const [slug, discovered] of seen) {
    const logo = await getLogo(slug);
    if (!logo) continue;
    const insertedRecently = new Date(logo.created_at ?? 0).getTime() > Date.now() - 1000 * 60 * 10;
    if (insertedRecently) newEntities += 1;
    const sources = sourcesByLogo.get(logo.id) ?? [];
    if (logo.approved_logo_url) continue;
    const coinId = (logo.coingecko_id && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
    if (!coinId) {
      needsReview += 1;
      await query("UPDATE logos SET notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\\n' END || $2 WHERE slug = $1", [slug, `newly_discovered_entity / discovered_missing_logo from metrics: ${discovered.metrics.join(", ")}`]);
      continue;
    }
    try {
      const source = await fetchCoinGeckoLogoSource(coinId);
      const auto = canAutoApproveCoinGecko(logo, sources, source.imageUrl, source.sourceUrl);
      const created = await upsertLogoSource({ logoId: logo.id, provider: "coingecko", ...source, metadata: { ...source.metadata, metricScan: true, issueType: auto.ok ? "auto_logo_imported" : "discovered_missing_logo", metrics: discovered.metrics, approvalOrigin: auto.ok ? "auto" : "candidate", autoApproveReason: auto.reason }, status: auto.ok ? "approved" : "candidate" });
      if (auto.ok) {
        await autoApproveSource(created.id);
        autoApproved += 1;
      } else {
        needsReview += 1;
      }
      await updateLogoFetchState(logo.slug, "coingecko", null);
    } catch (error) {
      needsReview += 1;
      const message = error instanceof Error ? error.message : "Unknown CoinGecko scan error";
      errors.push(`${slug}: ${message}`);
      await updateLogoFetchState(logo.slug, "coingecko", `metric_scan_error: ${message}`);
    }
  }

  const summary: MetricLogoScanSummary = {
    timestamp: new Date().toISOString(),
    limit: boundedLimit,
    metricsScanned,
    rowsChecked: seen.size,
    newEntities,
    autoApproved,
    needsReview,
    errors: errors.slice(0, 10),
    issueTypes: ["newly_discovered_entity", "missing_from_logo_db", "discovered_missing_logo", "metric_scan_error", "auto_logo_imported"],
  };
  await setAdminSetting(METRIC_LOGO_SCAN_SETTING, JSON.stringify(summary));
  return summary;
}
