import "server-only";
import { getChainspectAvgTxFee, getChainspectBlockTime, getChainspectDevelopers, getChainspectRealTimeTps } from "@/lib/chainspect";
import { getDepinRevenue } from "@/lib/depinpulse";
import { getBenjiValueByNetwork, getBuidlValueByNetwork, getChainRevenue, getChainTvl, getStablecoinSupplyByChain } from "@/lib/defillama";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { autoApproveSource, canAutoApproveCoinGecko, getAllLogoSources, getLogo, logoSlug, setAdminSetting, updateLogoFetchState, upsertLogo, upsertLogoSource } from "@/lib/admin/logoDb";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";

type ScanMetric = {
  id: string;
  label: string;
  category: "chain" | "project" | "asset";
  load: (limit: number) => Promise<{ rows: { name: string }[] }>;
};

export type MetricLogoScanAction =
  | "already_approved"
  | "auto_approved"
  | "candidate_added"
  | "missing_coingecko_id"
  | "coingecko_fetch_failed"
  | "auto_approve_skipped"
  | "visual_rejected"
  | "previous_rejection"
  | "existing_admin_source";

export type MetricLogoScanDetail = {
  name: string;
  slug: string;
  category: ScanMetric["category"];
  sourceMetricIds: string[];
  existedBefore: boolean;
  hadApprovedLogo: boolean;
  coingeckoId: string | null;
  coinmarketcapId: string | null;
  fetchedImageUrl: string | null;
  actionTaken: MetricLogoScanAction;
  reason: string;
  error: string | null;
};

export type MetricLogoScanSummary = {
  timestamp: string;
  limit: number;
  metricsScanned: number;
  rowsChecked: number;
  newEntities: number;
  autoApproved: number;
  candidates: number;
  missingCoinGeckoIds: number;
  skippedAutoApprove: number;
  needsReview: number;
  errors: string[];
  issueTypes: string[];
  details: MetricLogoScanDetail[];
};

export const METRIC_LOGO_SCAN_SETTING = "last_metric_logo_discovery_summary";
export const METRIC_LOGO_SCAN_DETAILS_SETTING = "last_metric_logo_discovery_details";

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
      candidates: Number((parsed as any).candidates ?? 0),
      missingCoinGeckoIds: Number((parsed as any).missingCoinGeckoIds ?? 0),
      skippedAutoApprove: Number((parsed as any).skippedAutoApprove ?? 0),
      needsReview: Number(parsed.needsReview ?? 0),
      errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : [],
      issueTypes: Array.isArray(parsed.issueTypes) ? parsed.issueTypes.map(String) : [],
      details: Array.isArray((parsed as any).details) ? (parsed as any).details.map((detail: any) => ({
        name: String(detail.name ?? ""),
        slug: String(detail.slug ?? ""),
        category: (detail.category === "chain" || detail.category === "asset" || detail.category === "project") ? detail.category : "project",
        sourceMetricIds: Array.isArray(detail.sourceMetricIds) ? detail.sourceMetricIds.map(String) : [],
        existedBefore: Boolean(detail.existedBefore),
        hadApprovedLogo: Boolean(detail.hadApprovedLogo),
        coingeckoId: detail.coingeckoId ? String(detail.coingeckoId) : null,
        coinmarketcapId: detail.coinmarketcapId ? String(detail.coinmarketcapId) : null,
        fetchedImageUrl: detail.fetchedImageUrl ? String(detail.fetchedImageUrl) : null,
        actionTaken: String(detail.actionTaken ?? "auto_approve_skipped") as MetricLogoScanAction,
        reason: String(detail.reason ?? ""),
        error: detail.error ? String(detail.error) : null,
      })) : [],
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
  const seen = new Map<string, { name: string; category: ScanMetric["category"]; metrics: string[]; existedBefore: boolean }>();
  const errors: string[] = [];
  const details: MetricLogoScanDetail[] = [];
  let metricsScanned = 0;

  for (const metric of scanMetrics) {
    try {
      const data = await metric.load(boundedLimit);
      metricsScanned += 1;
      for (const row of data.rows.slice(0, boundedLimit)) {
        const before = await getLogo(logoSlug(row.name));
        const logo = await upsertLogo(row.name, metric.category);
        const existing = seen.get(logo.slug);
        seen.set(logo.slug, { name: logo.name, category: metric.category, metrics: [...(existing?.metrics ?? []), metric.id], existedBefore: Boolean(existing?.existedBefore ?? before) });
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
  let candidates = 0;
  let missingCoinGeckoIds = 0;
  let skippedAutoApprove = 0;
  let needsReview = 0;
  for (const [slug, discovered] of seen) {
    const logo = await getLogo(slug);
    if (!logo) continue;
    const insertedRecently = new Date(logo.created_at ?? 0).getTime() > Date.now() - 1000 * 60 * 10;
    if (insertedRecently && !discovered.existedBefore) newEntities += 1;
    const sources = sourcesByLogo.get(logo.id) ?? [];
    const coinId = (logo.coingecko_id && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
    const baseDetail = {
      name: logo.name,
      slug: logo.slug,
      category: discovered.category,
      sourceMetricIds: discovered.metrics,
      existedBefore: discovered.existedBefore,
      hadApprovedLogo: Boolean(logo.approved_logo_url),
      coingeckoId: coinId || null,
      coinmarketcapId: logo.coinmarketcap_id || null,
    };
    if (logo.approved_logo_url) {
      details.push({ ...baseDetail, fetchedImageUrl: logo.approved_logo_url, actionTaken: "already_approved", reason: "Approved logo already exists", error: null });
      continue;
    }
    if (!coinId) {
      needsReview += 1;
      missingCoinGeckoIds += 1;
      details.push({ ...baseDetail, fetchedImageUrl: null, actionTaken: "missing_coingecko_id", reason: "Missing CoinGecko ID mapping", error: null });
      await query("UPDATE logos SET notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END || $2 WHERE slug = $1", [slug, `newly_discovered_entity / discovered_missing_logo / metric_scan_missing_coingecko_id from metrics: ${discovered.metrics.join(", ")}`]);
      continue;
    }
    try {
      const source = await fetchCoinGeckoLogoSource(coinId);
      const auto = canAutoApproveCoinGecko(logo, sources, source.imageUrl, source.sourceUrl);
      const created = await upsertLogoSource({ logoId: logo.id, provider: "coingecko", ...source, metadata: { ...source.metadata, metricScan: true, issueType: auto.ok ? "auto_logo_imported" : "discovered_missing_logo", metrics: discovered.metrics, approvalOrigin: auto.ok ? "auto" : "candidate", autoApproveReason: auto.reason }, status: auto.ok ? "approved" : "candidate" });
      if (auto.ok) {
        await autoApproveSource(created.id);
        autoApproved += 1;
        details.push({ ...baseDetail, fetchedImageUrl: source.imageUrl, actionTaken: "auto_approved", reason: auto.reason, error: null });
      } else {
        needsReview += 1;
        candidates += 1;
        skippedAutoApprove += 1;
        const actionTaken: MetricLogoScanAction = auto.reason.includes("visual") ? "visual_rejected" : auto.reason.includes("previously rejected") ? "previous_rejection" : auto.reason.includes("admin-approved") ? "existing_admin_source" : "auto_approve_skipped";
        details.push({ ...baseDetail, fetchedImageUrl: source.imageUrl, actionTaken, reason: auto.reason, error: null });
      }
      await updateLogoFetchState(logo.slug, "coingecko", null);
    } catch (error) {
      needsReview += 1;
      const message = error instanceof Error ? error.message : "Unknown CoinGecko scan error";
      errors.push(`${slug}: ${message}`);
      details.push({ ...baseDetail, fetchedImageUrl: null, actionTaken: "coingecko_fetch_failed", reason: "CoinGecko fetch failed", error: message });
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
    candidates,
    missingCoinGeckoIds,
    skippedAutoApprove,
    needsReview,
    errors: errors.slice(0, 10),
    issueTypes: ["newly_discovered_entity", "missing_from_logo_db", "discovered_missing_logo", "metric_scan_error", "auto_logo_imported", "auto_approve_skipped", "metric_scan_missing_coingecko_id", "metric_scan_candidate_added"],
    details: details.slice(0, 200),
  };
  await setAdminSetting(METRIC_LOGO_SCAN_SETTING, JSON.stringify(summary));
  await setAdminSetting(METRIC_LOGO_SCAN_DETAILS_SETTING, JSON.stringify(summary.details));
  return summary;
}
