import { NextRequest, NextResponse } from "next/server";
import { getChainspectAvgTxFee, getChainspectBlockTime, getChainspectDevelopers, getChainspectRealTimeTps } from "@/lib/chainspect";
import { getDepinRevenue } from "@/lib/depinpulse";
import { getBenjiValueByNetwork, getBuidlValueByNetwork, getChainRevenue, getChainTvl, getStablecoinSupplyByChain } from "@/lib/defillama";
import { parsePrompt } from "@/lib/parser";
import { approvedLogoCandidateOverlay, approvedLogoCandidateSlugs, logoSlug } from "@/lib/admin/logoDb";
import { PUBLIC_CACHE_CONTROL, PublicDataUnavailableError, readPublicChartSnapshot } from "@/lib/onchain/publicSnapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_HEADERS = { "Cache-Control": PUBLIC_CACHE_CONTROL };
const metricCache = new Map<string, { at: number; value: Awaited<ReturnType<typeof getChainRevenue>> }>();

async function cachedMetric<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = metricCache.get(key);
  if (hit && Date.now() - hit.at < 300_000) return hit.value as T;
  const value = await load();
  metricCache.set(key, { at: Date.now(), value: value as Awaited<ReturnType<typeof getChainRevenue>> });
  return value;
}

export async function GET(request: NextRequest) {
  const rawPrompt = request.nextUrl.searchParams.get("prompt") || "BTC ETF Daily Flowboard";
  const prompt = rawPrompt.slice(0, 240);
  const parsed = parsePrompt(prompt);
  const mentionsEth = /\beth\b|ethereum/i.test(prompt);
  const mentionsBtc = /\bbtc\b|bitcoin/i.test(prompt);
  const etfPeriod = /monthly|issuer\s+report/i.test(prompt)
    ? "monthly"
    : /weekly|week/i.test(prompt)
      ? "weekly"
      : "daily";
  const ethOnlyEtf = mentionsEth && !mentionsBtc && /\betf\b/i.test(prompt);
  const btcOnlyEtf = /btc\s*etf|bitcoin\s*etf/i.test(prompt) && !mentionsEth;
  const splitFlowboard =
    !btcOnlyEtf &&
    !ethOnlyEtf &&
    /etf daily flowboard|btc\s*\+\s*eth|bitcoin\s+and\s+ethereum/i.test(prompt);
  const btcEtfPeriod = btcOnlyEtf && !splitFlowboard ? etfPeriod : null;
  const ethEtfPeriod = ethOnlyEtf ? etfPeriod : null;

  try {
    if (ethEtfPeriod) {
      const chart = await readPublicChartSnapshot("eth-etf-flowboard", ethEtfPeriod);
      const periodLabel = ethEtfPeriod[0].toUpperCase() + ethEtfPeriod.slice(1);
      if (!chart || chart.status === "source_error") {
        return NextResponse.json({ ok: false, error: "ETH ETF source data could not be refreshed. No fake data is emitted.", query: { labels: ["Capital Flows", "ETH ETF", periodLabel] } }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
      }
      return NextResponse.json({
        ok: true,
        visualType: "eth_etf_card",
        chart,
        rows: [],
        source: chart.sourceLabel.replace(/^Source:\s*/i, ""),
        updatedAt: chart.freshness.lastUpdatedAt || "-",
        title: chart.title,
        eyebrow: "Capital Flows · ETH ETF",
        description: chart.subtitle,
        methodology: `${chart.title} shows completed ETH ETF capital flow data with issuer detail when available.`,
        insight: chart.insights.join(" "),
        query: { timeframe: ethEtfPeriod, limit: 0, labels: ["Capital Flows", "ETH ETF", periodLabel], metric: "eth_etf" },
      }, { headers: PUBLIC_HEADERS });
    }
    if (splitFlowboard) {
      const chart = await readPublicChartSnapshot("btc-eth-etf-daily-flowboard", "daily");
      if (!chart || chart.status === "source_error") {
        return NextResponse.json({ ok: false, error: "ETF flow source data could not be refreshed. No fake data is emitted.", query: { labels: ["Capital Flows", "BTC + ETH ETF", "Daily"] } }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
      }
      return NextResponse.json({
        ok: true,
        visualType: "btc_eth_split_card",
        chart,
        rows: [],
        source: chart.sourceLabel.replace(/^Source:\s*/i, ""),
        updatedAt: chart.freshness.lastUpdatedAt || "-",
        title: chart.title,
        eyebrow: "Capital Flows · BTC + ETH ETF",
        description: chart.subtitle,
        methodology: "ETF Daily Flowboard shows the latest completed US spot Bitcoin and Ethereum ETF flows, with the top three issuers in each market.",
        insight: chart.insights.join(" "),
        query: { timeframe: "daily", limit: 0, labels: ["Capital Flows", "BTC + ETH ETF", "Daily"], metric: "btc_eth_etf" },
      }, { headers: PUBLIC_HEADERS });
    }
    if (btcEtfPeriod) {
      const chart = await readPublicChartSnapshot("btc-etf-flowboard", btcEtfPeriod);
      if (!chart || chart.status === "source_error") {
        return NextResponse.json({ ok: false, error: "BTC ETF source data could not be refreshed. No fake data is emitted.", query: { labels: ["Capital Flows", "BTC ETF", btcEtfPeriod[0].toUpperCase() + btcEtfPeriod.slice(1)] } }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } });
      }
      return NextResponse.json({
        ok: true,
        visualType: "btc_etf_card",
        chart,
        rows: [],
        source: chart.sourceLabel.replace(/^Source:\s*/i, ""),
        updatedAt: chart.freshness.lastUpdatedAt || "-",
        title: chart.title,
        eyebrow: "Capital Flows · BTC ETF",
        description: chart.subtitle,
        methodology: `${chart.title} shows completed BTC ETF capital flow data with issuer detail when available.`,
        insight: chart.insights.join(" "),
        query: { timeframe: btcEtfPeriod, limit: 0, labels: ["Capital Flows", "BTC ETF", btcEtfPeriod[0].toUpperCase() + btcEtfPeriod.slice(1)], metric: "btc_etf" },
      }, { headers: PUBLIC_HEADERS });
    }
    const data = await cachedMetric(`${parsed.metric}:${parsed.limit}:${parsed.timeframe}`, async () => {
      if (parsed.metric === "depin_revenue") return getDepinRevenue(parsed.limit, parsed.timeframe === "24h" ? "24h" : "30d");
      if (parsed.metric === "chain_developers") return getChainspectDevelopers(parsed.limit);
      if (parsed.metric === "chain_avg_tx_fee") return getChainspectAvgTxFee(parsed.limit);
      if (parsed.metric === "chain_block_time") return getChainspectBlockTime(parsed.limit);
      if (parsed.metric === "chain_realtime_tps") return getChainspectRealTimeTps(parsed.limit);
      if (parsed.metric === "benji_network_value") return getBenjiValueByNetwork(parsed.limit);
      if (parsed.metric === "buidl_network_value") return getBuidlValueByNetwork(parsed.limit);
      if (parsed.metric === "chain_stablecoin_supply") return getStablecoinSupplyByChain(parsed.limit);
      if (parsed.metric === "chain_tvl") return getChainTvl(parsed.limit);
      return getChainRevenue(parsed.limit, parsed.timeframe);
    });

    const overlay = await approvedLogoCandidateOverlay(data.rows.map((row) => row.name));
    let approvedLogoOverlayCount = 0;
    const rows = data.rows.map((row) => {
      const logoCandidates =
        approvedLogoCandidateSlugs(row.name)
          .map((slug) => overlay.get(slug))
          .find((urls) => urls?.length) ?? overlay.get(logoSlug(row.name));
      if (logoCandidates?.length) approvedLogoOverlayCount += 1;
      return logoCandidates?.length ? { ...row, logo: logoCandidates[0], logoCandidates } : row;
    });

    return NextResponse.json({
      ok: true,
      query: parsed,
      ...data,
      rows,
      ...(process.env.NODE_ENV === "development" ? { _debug: { approvedLogoOverlayCount } } : {}),
    }, { headers: PUBLIC_HEADERS });
  } catch (error) {
    if (error instanceof PublicDataUnavailableError) {
      return NextResponse.json(
        { ok: false, error: "Stored chart data is unavailable.", query: parsed },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error", query: parsed },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
