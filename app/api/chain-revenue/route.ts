import { NextRequest, NextResponse } from "next/server";
import { getChainspectAvgTxFee, getChainspectBlockTime, getChainspectDevelopers, getChainspectRealTimeTps } from "@/lib/chainspect";
import { getDepinRevenue } from "@/lib/depinpulse";
import { getBenjiValueByNetwork, getBuidlValueByNetwork, getChainRevenue, getChainTvl, getStablecoinSupplyByChain } from "@/lib/defillama";
import { parsePrompt } from "@/lib/parser";
import { approvedLogoCandidateOverlay, approvedLogoCandidateSlugs, logoSlug } from "@/lib/admin/logoDb";
import { buildChartSnapshot } from "@/lib/onchainData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rawPrompt = request.nextUrl.searchParams.get("prompt") || "Top 10 chains by stablecoin supply";
  const prompt = rawPrompt.slice(0, 240);
  const parsed = parsePrompt(prompt);
  const btcEtfPeriod = /btc\s*etf/i.test(prompt)
    ? /monthly|issuer\s+report/i.test(prompt)
      ? "monthly"
      : /weekly|week/i.test(prompt)
        ? "weekly"
        : "daily"
    : null;

  try {
    if (btcEtfPeriod) {
      const chart = await buildChartSnapshot("btc-etf-flowboard", btcEtfPeriod);
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
        methodology: `Methodology: ${chart.title} uses completed Farside BTC ETF rows only. Pending rows without total and issuer values are skipped.`,
        insight: chart.insights.join(" "),
        query: { timeframe: btcEtfPeriod, limit: 0, labels: ["Capital Flows", "BTC ETF", btcEtfPeriod[0].toUpperCase() + btcEtfPeriod.slice(1)], metric: "btc_etf" },
      }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    const data =
      parsed.metric === "depin_revenue"
        ? await getDepinRevenue(parsed.limit, parsed.timeframe === "24h" ? "24h" : "30d")
        : parsed.metric === "chain_developers"
          ? await getChainspectDevelopers(parsed.limit)
          : parsed.metric === "chain_avg_tx_fee"
            ? await getChainspectAvgTxFee(parsed.limit)
            : parsed.metric === "chain_block_time"
              ? await getChainspectBlockTime(parsed.limit)
              : parsed.metric === "chain_realtime_tps"
                ? await getChainspectRealTimeTps(parsed.limit)
                : parsed.metric === "benji_network_value"
                  ? await getBenjiValueByNetwork(parsed.limit)
                  : parsed.metric === "buidl_network_value"
                    ? await getBuidlValueByNetwork(parsed.limit)
                    : parsed.metric === "chain_stablecoin_supply"
                      ? await getStablecoinSupplyByChain(parsed.limit)
                      : parsed.metric === "chain_tvl"
                        ? await getChainTvl(parsed.limit)
                        : await getChainRevenue(parsed.limit, parsed.timeframe);

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
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error", query: parsed },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
