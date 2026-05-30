import { datasetRegistry } from "./registry";
import type {
  ChartSnapshot,
  DatasetRegistryItem,
  HeadlineMetric,
  DatasetStatus,
} from "./types";
import {
  formatCompactUsd,
  formatSignedPercent,
  formatSignedUsd,
} from "../formatters";
import {
  cumulative_sum,
  long_short_imbalance,
  marketShares,
  rolling_20d,
  safeChangePct,
  streak_count,
  supply_pressure_score,
} from "../metrics";
import {
  fetchChainRevenue,
  fetchStablecoinSupplyByChain,
  fetchDexVolumeByChain,
  fetchProtocolRevenue,
  fetchDexProtocols,
  fetchPerpProtocols,
  fetchCexTransparency,
} from "./sources/defillama";
import {
  fetchBtcEtfFlows,
  fetchEthEtfFlows,
  type EtfFlowRow,
} from "./sources/farside";
import { fetchStablecoinNetTransfersLatest } from "./sources/dune";
import { largeHolderMissingConfig } from "./sources/etherscan";
import { whaleTransferMissingConfig } from "./sources/whaleAlert";
import {
  loadLatestChartSnapshot,
  markSnapshotStale,
  saveChartSnapshot,
  sourceRun,
} from "./storage";

const exports = ["1600x900", "1200x1200", "1080x1350"] as const;
const STALE_STATUS = "stale";
const emptySeries = () => ({
  bars: [],
  lines: [],
  areas: [],
  cards: [],
  tables: [],
  calendar: [],
});
function base(d: DatasetRegistryItem, period: string): ChartSnapshot {
  return {
    datasetId: d.id,
    datasetSlug: d.slug,
    title: d.name,
    subtitle: d.description,
    date: new Date().toISOString().slice(0, 10),
    period,
    category: d.category,
    status: d.status,
    freshness: {
      status:
        d.status === "source_config_required"
          ? "source_config_required"
          : "missing",
      lastUpdatedAt: null,
      source: d.primarySource,
      fallbackUsed: false,
      missingConfig: d.requiredEnv.filter((k) => !process.env[k]),
      message: null,
    },
    headlineMetrics: [],
    series: emptySeries(),
    insights: [],
    sourceLabel: d.sourceLabel,
    sourceUrl: null,
    exportFormats: [...exports],
    warnings: [],
    metadata: { category: d.category, chartType: d.chartTemplates[0] },
  };
}
const metric = (
  label: string,
  value: number | string | null,
  formattedValue: string,
  change: number | null = null,
): HeadlineMetric => ({
  label,
  value,
  formattedValue,
  change,
  changeLabel: change == null ? null : formatSignedPercent(change),
  trend:
    change == null
      ? "neutral"
      : change > 0
        ? "up"
        : change < 0
          ? "down"
          : "flat",
});
function valueFor(row: any, period: string) {
  if (period === "24h")
    return row.value24h ?? row.revenue_24h ?? row.volume_24h ?? row.value;
  if (period === "30d" || period === "monthly")
    return row.value30d ?? row.value7d ?? row.value24h ?? row.value;
  return row.value7d ?? row.value24h ?? row.value30d ?? row.value;
}
function rankRows(rows: any[], period: string, labelKey = "name") {
  const sorted = [...rows]
    .map((r) => ({
      ...r,
      value: valueFor(r, period),
      name: r[labelKey] || r.name || r.chain || r.protocol || r.exchange,
    }))
    .filter((r) => Number.isFinite(r.value) && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
  const shares = marketShares(sorted.map((r) => ({ value: r.value })));
  return sorted.map((r, i) => ({ ...r, rank: i + 1, marketShare: shares[i] }));
}
async function withFallback(
  d: DatasetRegistryItem,
  period: string,
  builder: () => Promise<ChartSnapshot>,
): Promise<ChartSnapshot> {
  try {
    const snap = await builder();
    if (
      snap.status === "active" &&
      (snap.series.bars.length ||
        snap.series.cards.length ||
        snap.series.tables.length ||
        snap.series.calendar.length ||
        snap.series.lines.length)
    )
      await saveChartSnapshot(snap);
    return snap;
  } catch (error: any) {
    const latest = await loadLatestChartSnapshot(d.slug);
    if (latest)
      return markSnapshotStale(
        latest,
        `Source fetch failed; serving latest successful snapshot. ${error?.message || ""}`,
      );
    return {
      ...base(d, period),
      status: "source_error",
      freshness: {
        status: "source_error",
        lastUpdatedAt: null,
        source: d.primarySource,
        fallbackUsed: false,
        missingConfig: [],
        message: error?.message || "Source fetch failed",
      },
      sourceUrl: error?.url || null,
      warnings: [
        "No successful cached snapshot is available. Empty chart panels are suppressed and no fake data is emitted.",
      ],
    };
  }
}
async function resultOrThrow<T extends { ok: boolean; [k: string]: any }>(
  slug: string,
  source: string,
  started: string,
  result: T,
) {
  if (!result.ok) {
    await sourceRun(
      slug,
      result.source || source,
      started,
      result.status || "source_error",
      0,
      result.message || "Source failed",
      null,
    );
    const err: any = new Error(result.message || "Source failed");
    err.url = result.url || null;
    throw err;
  }
  await sourceRun(
    slug,
    result.source || source,
    started,
    "success",
    result.rowsFetched || 0,
    null,
    result.data,
  );
  return result;
}

async function buildDefillamaLeaderboard(
  d: DatasetRegistryItem,
  period: string,
  fetcher: any,
  noun: string,
) {
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const fetched = await fetcher();
    const result: any = await resultOrThrow(
      d.slug,
      fetched.source || "DefiLlama",
      started,
      fetched,
    );
    const rows = rankRows(result.data, period);
    const total = rows.reduce((a, r) => a + r.value, 0);
    if (!rows.length) throw new Error(`${d.name} returned no ranked rows`);
    const top = rows[0];
    return {
      ...base(d, period),
      status: "active",
      freshness: {
        status: "fresh",
        lastUpdatedAt: new Date().toISOString(),
        source: "DefiLlama",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric("Leader", top.name, top.name),
        metric(`${period.toUpperCase()} total`, total, formatCompactUsd(total)),
        metric(
          "Leader share",
          top.marketShare,
          formatSignedPercent(top.marketShare).replace("+", ""),
        ),
      ],
      series: {
        ...emptySeries(),
        bars: rows.map((r) => ({
          name: r.name,
          value: r.value,
          rank: r.rank,
          marketShare: r.marketShare,
          chain: r.chain,
          category: r.category,
          openInterest: r.openInterest,
        })),
        tables: rows,
      },
      insights: [
        `${top.name} leads ${noun} for ${period}.`,
        `Top ${rows.length} rows represent ${formatCompactUsd(total)} in tracked ${noun}.`,
        `${rows[1]?.name || "The second-ranked row"} is the next largest contributor.`,
      ],
      sourceUrl: result.url,
      metadata: {
        ...base(d, period).metadata,
        rowsFetched: result.rowsFetched,
      },
    };
  });
}
async function buildStablecoinSupply(d: DatasetRegistryItem, period: string) {
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const result: any = await resultOrThrow(
      d.slug,
      "DefiLlama",
      started,
      await fetchStablecoinSupplyByChain(),
    );
    const sorted = rankRows(
      result.data.map((r: any) => ({ ...r, value: r.supply, name: r.chain })),
      period,
    );
    const total = sorted.reduce((a, r) => a + r.value, 0);
    const top = sorted[0];
    if (!top) throw new Error("Stablecoin supply returned no chain rows");
    return {
      ...base(d, period),
      status: "active",
      freshness: {
        status: "fresh",
        lastUpdatedAt: new Date().toISOString(),
        source: "DefiLlama",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric("Total tracked supply", total, formatCompactUsd(total)),
        metric("Largest chain", top.name, top.name),
        metric(
          "Top-chain share",
          top.marketShare,
          formatSignedPercent(top.marketShare).replace("+", ""),
        ),
      ],
      series: {
        ...emptySeries(),
        bars: sorted.map((r) => ({
          name: r.name,
          value: r.value,
          rank: r.rank,
          marketShare: r.marketShare,
          usdc: r.usdc,
          usdt: r.usdt,
        })),
        cards: sorted.slice(0, 6),
      },
      insights: [
        `${top.name} is the largest tracked stablecoin chain.`,
        `USDC/USDT splits are included when DefiLlama exposes issuer-level chain supply.`,
        `Top-chain share is ${formatSignedPercent(top.marketShare).replace("+", "")}.`,
      ],
      sourceUrl: result.url,
      metadata: {
        ...base(d, period).metadata,
        rowsFetched: result.rowsFetched,
      },
    };
  });
}
type CompletedEtfDay = { total: EtfFlowRow; issuers: EtfFlowRow[] };
const hasIssuerFlow = (row: EtfFlowRow) => !row.isTotal && row.flowUsd != null;
function completedEtfDays(rows: EtfFlowRow[]) {
  const byDate = new Map<
    string,
    { total?: EtfFlowRow; issuers: EtfFlowRow[] }
  >();
  for (const row of rows) {
    const entry = byDate.get(row.date) || { issuers: [] };
    if (row.isTotal && row.flowUsd != null) entry.total = row;
    if (hasIssuerFlow(row)) entry.issuers.push(row);
    byDate.set(row.date, entry);
  }
  return [...byDate.entries()]
    .map(([date, entry]) =>
      entry.total && entry.issuers.length
        ? { date, total: entry.total, issuers: entry.issuers }
        : null,
    )
    .filter((day): day is CompletedEtfDay & { date: string } => Boolean(day))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function getLatestCompletedBtcEtfRow(rows: EtfFlowRow[]) {
  return completedEtfDays(rows.filter((r) => r.asset === "BTC")).at(-1) || null;
}
export function getLatestCompletedBtcEtfDays(rows: EtfFlowRow[], count = 5) {
  return completedEtfDays(rows.filter((r) => r.asset === "BTC")).slice(-count);
}
export function getIssuerBreadth(rows: EtfFlowRow[]) {
  return {
    positive: rows.filter((r) => Number(r.flowUsd) > 0).length,
    negative: rows.filter((r) => Number(r.flowUsd) < 0).length,
  };
}
export function formatIssuerFlow(value: number | null | undefined) {
  return formatSignedUsd(Number(value) || 0);
}
export function getTopIssuerContributors(rows: EtfFlowRow[], count = 5) {
  return issuerBars(rows).slice(0, count);
}
function summarizeEtf(rows: EtfFlowRow[], asset: "BTC" | "ETH") {
  const days = completedEtfDays(rows.filter((r) => r.asset === asset));
  const totals = days.map((d) => d.total);
  const values = totals.map((r) => r.flowUsd || 0);
  const cumulative = cumulative_sum(values);
  const latestDay = days.at(-1) || null;
  const latest = latestDay?.total;
  const issuerLatest = latestDay?.issuers || [];
  const inflow =
    [...issuerLatest]
      .filter((r) => Number(r.flowUsd) > 0)
      .sort((a, b) => (b.flowUsd || 0) - (a.flowUsd || 0))[0] || null;
  const outflow =
    [...issuerLatest]
      .filter((r) => Number(r.flowUsd) < 0)
      .sort((a, b) => (a.flowUsd || 0) - (b.flowUsd || 0))[0] || null;
  const five = values.slice(-5).reduce((a, b) => a + b, 0);
  const twenty = rolling_20d(values) || 0;
  return {
    asset,
    days,
    totals,
    values,
    cumulative,
    latest,
    latestCompletedDate: latest?.date || null,
    issuerLatest,
    inflow,
    outflow,
    five,
    twenty,
    streak: streak_count(values),
    totalFlow: cumulative.at(-1) || 0,
    weekly: values.slice(-5).reduce((a, b) => a + b, 0),
    monthly: values.slice(-20).reduce((a, b) => a + b, 0),
  };
}
function issuerBars(
  rows: EtfFlowRow[],
  inflow?: EtfFlowRow | null,
  outflow?: EtfFlowRow | null,
) {
  return rows
    .filter(
      (r) => Number.isFinite(Number(r.flowUsd)) && Number(r.flowUsd) !== 0,
    )
    .map((r) => ({
      name: r.issuer,
      ticker: r.ticker,
      value: r.flowUsd,
      asset: r.asset,
      isLargestInflow: r.ticker === inflow?.ticker,
      isLargestOutflow: r.ticker === outflow?.ticker,
    }))
    .sort(
      (a, b) => Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0),
    );
}
function dateNetFlowLabel(date: string | null) {
  if (!date) return "NET FLOW";
  return `${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).toUpperCase()} NET FLOW`;
}
function dayMetricLabel(
  value: number | null | undefined,
  positiveLabel: string,
  negativeLabel: string,
) {
  const n = Number(value) || 0;
  if (n > 0) return positiveLabel;
  if (n < 0) return negativeLabel;
  return "Flattest Day";
}
function sourceSafeBase(
  d: DatasetRegistryItem,
  period: string,
  title: string,
  subtitle: string,
) {
  const sourceLabel =
    d.slug === "btc-etf-flowboard"
      ? "Farside"
      : d.sourceLabel.replace(/^Source:\s*/i, "");
  return {
    ...base(d, period),
    title,
    subtitle,
    sourceLabel,
    exportFormats: ["1200x1200" as const],
  };
}
function humanDate(date: string | null) {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
      })
    : "";
}
function issuerShare(driver: any, rows: EtfFlowRow[]) {
  const totalSameSign = rows
    .filter(
      (r) =>
        Number(r.flowUsd) * Number(driver?.flowUsd ?? driver?.value ?? 0) > 0,
    )
    .reduce((a, r) => a + Math.abs(Number(r.flowUsd) || 0), 0);
  const denom =
    totalSameSign ||
    rows.reduce((a, r) => a + Math.abs(Number(r.flowUsd) || 0), 0) ||
    Math.abs(Number(driver?.flowUsd ?? driver?.value ?? 0)) ||
    1;
  return Math.round(
    (Math.abs(Number(driver?.flowUsd ?? driver?.value ?? 0)) / denom) * 100,
  );
}
function driverMetric(row: any, share: number) {
  return metric(
    "Top Driver",
    row?.value ?? row?.flowUsd ?? null,
    row ? `${row.ticker || row.name} · ${share}%` : "Pending",
  );
}
function issuerMetric(label: string, row: any) {
  return metric(
    label,
    row?.value ?? row?.flowUsd ?? null,
    row
      ? `${row.ticker || row.name} · ${formatIssuerFlow(row.value ?? row.flowUsd)}`
      : "Pending",
  );
}
export function buildBtcEtfDailyCard(
  d: DatasetRegistryItem,
  period: string,
  flowResult: any,
  price?: any,
) {
  const summary = summarizeEtf(flowResult.data.rows, "BTC");
  if (!summary.latest)
    throw new Error(
      "BTC ETF flow parser found no completed total + issuer rows",
    );
  const contributors = getTopIssuerContributors(summary.issuerLatest, 5);
  const driver = contributors[0] || null;
  const share = driver ? issuerShare(driver, summary.issuerLatest) : 0;
  const noInflow =
    !summary.inflow &&
    summary.issuerLatest.some((row) => Number.isFinite(Number(row.flowUsd)));
  const driverSentence = driver
    ? `${driver.ticker} drove roughly ${share}% of the move.`
    : "Issuer driver data is unavailable.";
  return {
    ...sourceSafeBase(
      d,
      period,
      "BTC ETF Daily Flowboard",
      "Latest capital movement across US spot Bitcoin ETFs.",
    ),
    status: "active" as const,
    freshness: {
      status: "fresh" as const,
      lastUpdatedAt: new Date().toISOString(),
      source: "Farside",
      fallbackUsed: false,
      missingConfig: [],
      message: null,
    },
    headlineMetrics: [
      metric(
        dateNetFlowLabel(summary.latestCompletedDate),
        summary.latest.flowUsd,
        formatSignedUsd(summary.latest.flowUsd),
      ),
      driverMetric(driver, share),
      metric(
        "Since Launch",
        summary.totalFlow,
        formatSignedUsd(summary.totalFlow),
      ),
    ],
    series: {
      ...emptySeries(),
      bars: [],
      lines: [],
      cards: [
        {
          label: "Top Driver",
          value: driver?.name || "Pending",
          ticker: driver?.ticker || null,
          amount: driver?.value || null,
          share,
        },
        {
          label: "Since Launch",
          value: formatSignedUsd(summary.totalFlow),
          amount: summary.totalFlow,
        },
      ],
      tables: contributors,
    },
    insights: [
      `BTC ETFs recorded ${formatSignedUsd(summary.latest.flowUsd)} on ${humanDate(summary.latest.date)}.`,
      driverSentence,
      noInflow
        ? "No issuer posted inflows."
        : `${summary.inflow?.ticker || summary.inflow?.issuer} led issuer inflows.`,
    ],
    sourceUrl: flowResult.url,
    warnings: flowResult.data.warnings || [],
    metadata: {
      ...base(d, period).metadata,
      asset: "BTC",
      view: "daily",
      latestCompletedDate: summary.latestCompletedDate,
      maxIssuerContributors: contributors.length,
      defaultExportFormat: "1200x1200",
    },
  };
}
export function buildBtcEtfWeeklyCard(
  d: DatasetRegistryItem,
  period: string,
  flowResult: any,
  price?: any,
) {
  const summary = summarizeEtf(flowResult.data.rows, "BTC");
  if (summary.days.length < 1)
    throw new Error("BTC ETF weekly flowboard found no completed rows");
  const weekDays = getLatestCompletedBtcEtfDays(flowResult.data.rows, 5);
  const weeklyNet = weekDays.reduce((a, d) => a + (d.total.flowUsd || 0), 0);
  const issuerMap = new Map<string, any>();
  for (const day of weekDays)
    for (const row of day.issuers.filter((r) => Number(r.flowUsd) !== 0)) {
      const g = issuerMap.get(row.ticker) || {
        name: row.issuer,
        ticker: row.ticker,
        value: 0,
        asset: "BTC",
      };
      g.value += row.flowUsd || 0;
      issuerMap.set(row.ticker, g);
    }
  const allIssuers = [...issuerMap.values()]
    .filter((row) => Number(row.value) !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const issuers = allIssuers.slice(0, 5);
  const topIssuer = allIssuers[0] || null;
  const topIssuerShare = topIssuer
    ? Math.round(
        (Math.abs(topIssuer.value) /
          (allIssuers.reduce(
            (a, row) => a + Math.abs(Number(row.value) || 0),
            0,
          ) ||
            Math.abs(topIssuer.value) ||
            1)) *
          100,
      )
    : 0;
  const largestDay = [...weekDays].sort(
    (a, b) => Math.abs(b.total.flowUsd || 0) - Math.abs(a.total.flowUsd || 0),
  )[0];
  const largestOutflowDay =
    [...weekDays]
      .filter((day) => Number(day.total.flowUsd) < 0)
      .sort((a, b) => (a.total.flowUsd || 0) - (b.total.flowUsd || 0))[0] ||
    null;
  const largestMetricDay = largestOutflowDay || largestDay;
  const largestLabel = largestOutflowDay ? "Largest Outflow" : "Largest Move";
  return {
    ...sourceSafeBase(
      d,
      period,
      "BTC ETF Weekly Flowboard",
      "Five-session view of BTC ETF capital movement.",
    ),
    status: "active" as const,
    freshness: {
      status: "fresh" as const,
      lastUpdatedAt: new Date().toISOString(),
      source: "Farside",
      fallbackUsed: false,
      missingConfig: [],
      message: null,
    },
    headlineMetrics: [
      metric("WEEKLY NET FLOW", weeklyNet, formatSignedUsd(weeklyNet)),
      metric(
        largestLabel,
        largestMetricDay?.total.flowUsd ?? null,
        largestMetricDay
          ? formatSignedUsd(largestMetricDay.total.flowUsd)
          : "Pending",
      ),
      driverMetric(topIssuer, topIssuerShare),
      metric(
        "Since Launch",
        summary.totalFlow,
        formatSignedUsd(summary.totalFlow),
      ),
    ],
    series: {
      ...emptySeries(),
      bars: weekDays.map((day, index) => ({
        date: day.date,
        name: day.date,
        value: day.total.flowUsd || 0,
        magnitude: Math.abs(day.total.flowUsd || 0),
        valueLabel: formatSignedUsd(day.total.flowUsd || 0),
        isLatest: index === weekDays.length - 1,
        isLargest: day.date === largestDay?.date,
        sign: Number(day.total.flowUsd || 0) >= 0 ? "positive" : "negative",
      })),
      lines: [],
      cards: [
        {
          label: largestLabel,
          value: largestMetricDay
            ? formatSignedUsd(largestMetricDay.total.flowUsd)
            : "Pending",
          date: largestMetricDay?.date || null,
        },
        {
          label: "Top Driver",
          value: topIssuer?.name || "Pending",
          ticker: topIssuer?.ticker || null,
          amount: topIssuer?.value || null,
          share: topIssuerShare,
        },
        {
          label: "Since Launch",
          value: formatSignedUsd(summary.totalFlow),
          amount: summary.totalFlow,
        },
      ],
      tables: issuers,
    },
    insights: [
      `BTC ETFs recorded ${formatSignedUsd(weeklyNet)} net flow over the last 5 completed trading sessions.`,
      topIssuer
        ? `${topIssuer.ticker} was the top weekly driver at roughly ${topIssuerShare}%.`
        : "Issuer detail is unavailable.",
      largestDay
        ? `${humanDate(largestDay.date)} was the ${largestLabel.toLowerCase()}.`
        : "",
    ],
    sourceUrl: flowResult.url,
    warnings: flowResult.data.warnings || [],
    metadata: {
      ...base(d, period).metadata,
      asset: "BTC",
      view: "weekly",
      latestCompletedDate: summary.latestCompletedDate,
      completedDayCount: weekDays.length,
      hiddenIssuerCount: Math.max(0, allIssuers.length - issuers.length),
      weeklyPrimaryMetric: "WEEKLY NET FLOW",
      signedZeroBaseline: true,
      largestAbsoluteMoveDate: largestDay?.date || null,
      defaultExportFormat: "1200x1200",
    },
  };
}
export function buildBtcEtfMonthlyIssuerCard(
  d: DatasetRegistryItem,
  period: string,
  flowResult: any,
  price?: any,
) {
  const summary = summarizeEtf(flowResult.data.rows, "BTC");
  if (!summary.latestCompletedDate)
    throw new Error("BTC ETF monthly report found no completed rows");
  const month = new Date().toISOString().slice(0, 7);
  const monthDays = summary.days.filter((day) => day.date.startsWith(month));
  const monthlyNet = monthDays.reduce((a, d) => a + (d.total.flowUsd || 0), 0);
  const issuerMap = new Map<string, any>();
  for (const day of monthDays)
    for (const row of day.issuers.filter((r) => Number(r.flowUsd) !== 0)) {
      const g = issuerMap.get(row.ticker) || {
        name: row.issuer,
        ticker: row.ticker,
        value: 0,
        asset: "BTC",
      };
      g.value += row.flowUsd || 0;
      issuerMap.set(row.ticker, g);
    }
  const allIssuers = [...issuerMap.values()]
    .filter((row) => Number(row.value) !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const issuers = allIssuers.slice(0, 5);
  if (!monthDays.length)
    throw new Error("No completed current-month BTC ETF rows parsed");
  if (!issuers.length)
    throw new Error("No completed current-month BTC ETF issuer rows parsed");
  const topInflow =
    [...allIssuers]
      .filter((row) => Number(row.value) > 0)
      .sort((a, b) => b.value - a.value)[0] || null;
  const topOutflow =
    [...allIssuers]
      .filter((row) => Number(row.value) < 0)
      .sort((a, b) => a.value - b.value)[0] || null;
  const largestInflowDay =
    [...monthDays]
      .filter((day) => Number(day.total.flowUsd) > 0)
      .sort((a, b) => (b.total.flowUsd || 0) - (a.total.flowUsd || 0))[0] ||
    null;
  const largestOutflowDay =
    [...monthDays]
      .filter((day) => Number(day.total.flowUsd) < 0)
      .sort((a, b) => (a.total.flowUsd || 0) - (b.total.flowUsd || 0))[0] ||
    null;
  const smallestOutflowDay = !largestInflowDay
    ? [...monthDays].sort(
        (a, b) =>
          Math.abs(a.total.flowUsd || 0) - Math.abs(b.total.flowUsd || 0),
      )[0]
    : null;
  const inflowMetricDay = largestInflowDay || smallestOutflowDay;
  const inflowMetricLabel = largestInflowDay
    ? "Largest Inflow Day"
    : "Smallest Outflow";
  const latestDay = monthDays.at(-1);
  return {
    ...sourceSafeBase(
      d,
      period,
      "BTC ETF Monthly Flow Report",
      "Month-to-date capital movement across US spot Bitcoin ETFs.",
    ),
    status: "active" as const,
    freshness: {
      status: "fresh" as const,
      lastUpdatedAt: new Date().toISOString(),
      source: "Farside",
      fallbackUsed: false,
      missingConfig: [],
      message: null,
    },
    headlineMetrics: [
      metric("MONTHLY NET FLOW", monthlyNet, formatSignedUsd(monthlyNet)),
      metric(
        inflowMetricLabel,
        inflowMetricDay?.total.flowUsd ?? null,
        inflowMetricDay
          ? formatSignedUsd(inflowMetricDay.total.flowUsd)
          : "Pending",
      ),
      metric(
        "Largest Outflow Day",
        largestOutflowDay?.total.flowUsd ?? null,
        largestOutflowDay
          ? formatSignedUsd(largestOutflowDay.total.flowUsd)
          : "Pending",
      ),
      metric(
        "Since Launch",
        summary.totalFlow,
        formatSignedUsd(summary.totalFlow),
      ),
    ],
    series: {
      ...emptySeries(),
      bars: monthDays.map((day) => ({
        date: day.date,
        name: day.date,
        value: day.total.flowUsd || 0,
        valueLabel: formatSignedUsd(day.total.flowUsd || 0),
        isLatest: day.date === latestDay?.date,
        isLargestInflow: day.date === largestInflowDay?.date,
        isLargestOutflow: day.date === largestOutflowDay?.date,
        showLabel:
          day.date === latestDay?.date ||
          day.date === largestInflowDay?.date ||
          day.date === largestOutflowDay?.date,
      })),
      lines: [],
      cards: [
        {
          label: inflowMetricLabel,
          date: inflowMetricDay?.date || null,
        },
        {
          label: "Largest Outflow Day",
          date: largestOutflowDay?.date || null,
        },
        {
          label: "Top Inflow Issuer",
          value: topInflow?.name || "None",
          ticker: topInflow?.ticker || null,
          amount: topInflow?.value || null,
        },
        {
          label: "Largest Outflow Issuer",
          value: topOutflow?.name || "None",
          ticker: topOutflow?.ticker || null,
          amount: topOutflow?.value || null,
        },
        {
          label: "Monthly Net Flow",
          value: formatSignedUsd(monthlyNet),
          amount: monthlyNet,
        },
        {
          label: "Since Launch",
          value: formatSignedUsd(summary.totalFlow),
          amount: summary.totalFlow,
        },
      ],
      tables: issuers,
    },
    insights: [
      `BTC ETFs recorded ${formatSignedUsd(monthlyNet)} month-to-date.`,
      topOutflow
        ? `${topOutflow.ticker} posted the largest issuer outflow this month.`
        : "No issuer posted month-to-date outflows.",
      topInflow
        ? `${topInflow.ticker} leads issuer inflows this month.`
        : "No issuer posted month-to-date inflows.",
    ],
    sourceUrl: flowResult.url,
    warnings: flowResult.data.warnings || [],
    metadata: {
      ...base(d, period).metadata,
      asset: "BTC",
      view: "monthly",
      month,
      latestCompletedDate: summary.latestCompletedDate,
      issuerSummaryRows: issuers.length,
      hiddenIssuerCount: Math.max(0, allIssuers.length - issuers.length),
      monthlyVisual: "mtd_signed_daily_flow_chart",
      signedZeroBaseline: true,
      keyDays: {
        largestInflowDay: largestInflowDay?.date || null,
        largestOutflowDay: largestOutflowDay?.date || null,
        latestCompletedDay: latestDay?.date || null,
      },
      defaultExportFormat: "1200x1200",
    },
  };
}
async function buildEtfFlowSnapshot(
  d: DatasetRegistryItem,
  period: string,
  asset: "BTC" | "ETH",
) {
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const flowResult: any = await resultOrThrow(
      d.slug,
      "Farside",
      started,
      asset === "BTC" ? await fetchBtcEtfFlows() : await fetchEthEtfFlows(),
    );
    if (asset === "BTC") {
      if (period === "weekly")
        return buildBtcEtfWeeklyCard(d, period, flowResult);
      if (period === "monthly")
        return buildBtcEtfMonthlyIssuerCard(d, period, flowResult);
      return buildBtcEtfDailyCard(d, period || "daily", flowResult);
    }
    const summary = summarizeEtf(flowResult.data.rows, asset);
    if (!summary.latest)
      throw new Error(
        `${asset} ETF flow parser found no completed total + issuer rows`,
      );
    const lines = summary.totals.map((r, i) => ({
      date: r.date,
      value: r.flowUsd || 0,
      cumulative: summary.cumulative[i],
    }));
    const bars = issuerBars(
      summary.issuerLatest,
      summary.inflow,
      summary.outflow,
    );
    return {
      ...sourceSafeBase(
        d,
        period,
        `${asset} ETF Flowboard`,
        `${asset} ETF daily net flow and issuer rotation from Farside.`,
      ),
      status: "active" as const,
      freshness: {
        status: "fresh" as const,
        lastUpdatedAt: new Date().toISOString(),
        source: "Farside Investors",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric(
          "Latest Net Flow",
          summary.latest.flowUsd,
          formatSignedUsd(summary.latest.flowUsd),
        ),
        metric("5D Flow", summary.five, formatSignedUsd(summary.five)),
        metric("20D Flow", summary.twenty, formatSignedUsd(summary.twenty)),
        metric(
          "Cumulative Flow",
          summary.totalFlow,
          formatSignedUsd(summary.totalFlow),
        ),
      ],
      series: {
        ...emptySeries(),
        bars,
        lines,
        cards: [
          {
            label: "Largest inflow issuer",
            value: summary.inflow?.issuer || "Pending",
            ticker: summary.inflow?.ticker || null,
            amount: summary.inflow?.flowUsd || null,
          },
          {
            label: "Largest outflow issuer",
            value: summary.outflow?.issuer || "Pending",
            ticker: summary.outflow?.ticker || null,
            amount: summary.outflow?.flowUsd || null,
          },
        ],
        tables: summary.issuerLatest,
      },
      insights: [
        `${asset} ETFs recorded ${formatSignedUsd(summary.latest.flowUsd)} on ${summary.latest.date}.`,
        `${summary.inflow?.ticker || summary.inflow?.issuer} had the largest issuer inflow.`,
        `${summary.outflow?.ticker || summary.outflow?.issuer} had the largest issuer outflow.`,
        `The ${asset} 20D rolling flow is ${formatSignedUsd(summary.twenty)}.`,
      ],
      sourceUrl: flowResult.url,
      warnings: flowResult.data.warnings || [],
      metadata: {
        ...base(d, period).metadata,
        asset,
        latestCompletedDate: summary.latestCompletedDate,
      },
    };
  });
}
async function buildBtcEth(d: DatasetRegistryItem, period: string) {
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const btc: any = await resultOrThrow(
      d.slug,
      "Farside",
      started,
      await fetchBtcEtfFlows(),
    );
    const eth: any = await resultOrThrow(
      d.slug,
      "Farside",
      started,
      await fetchEthEtfFlows(),
    );
    const b = summarizeEtf(btc.data.rows, "BTC");
    const e = summarizeEtf(eth.data.rows, "ETH");
    const winner = b.weekly >= e.weekly ? "BTC" : "ETH";
    return {
      ...base(d, period),
      status: "active",
      freshness: {
        status: "fresh",
        lastUpdatedAt: new Date().toISOString(),
        source: "Farside Investors",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric("Weekly winner", winner, winner),
        metric("BTC weekly flow", b.weekly, formatSignedUsd(b.weekly)),
        metric("ETH weekly flow", e.weekly, formatSignedUsd(e.weekly)),
      ],
      series: {
        ...emptySeries(),
        bars: [
          { name: "BTC 5D", value: b.five },
          { name: "ETH 5D", value: e.five },
          { name: "BTC 20D", value: b.twenty },
          { name: "ETH 20D", value: e.twenty },
        ],
        lines: [
          ...b.totals.map((r, i) => ({
            date: r.date,
            btc: r.flowUsd,
            cumulativeBtc: b.cumulative[i],
          })),
          ...e.totals.map((r, i) => ({
            date: r.date,
            eth: r.flowUsd,
            cumulativeEth: e.cumulative[i],
          })),
        ],
        cards: [
          {
            asset: "BTC",
            weekly: b.weekly,
            monthly: b.monthly,
            cumulative: b.totalFlow,
            rolling5d: b.five,
            rolling20d: b.twenty,
          },
          {
            asset: "ETH",
            weekly: e.weekly,
            monthly: e.monthly,
            cumulative: e.totalFlow,
            rolling5d: e.five,
            rolling20d: e.twenty,
          },
        ],
      },
      insights: [
        `${winner} leads the latest five-session ETF flow battle.`,
        `BTC cumulative net flow is ${formatSignedUsd(b.totalFlow)}.`,
        `ETH cumulative net flow is ${formatSignedUsd(e.totalFlow)}.`,
      ],
      sourceUrl: btc.url,
      metadata: { ...base(d, period).metadata, winner },
    };
  });
}
async function buildIssuerMonthly(d: DatasetRegistryItem, period: string) {
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const btc: any = await resultOrThrow(
      d.slug,
      "Farside",
      started,
      await fetchBtcEtfFlows(),
    );
    const eth: any = await resultOrThrow(
      d.slug,
      "Farside",
      started,
      await fetchEthEtfFlows(),
    );
    const month = new Date().toISOString().slice(0, 7);
    const grouped = new Map<string, any>();
    for (const row of [...btc.data.rows, ...eth.data.rows].filter(
      (r) => !r.isTotal && r.flowUsd != null && r.date.startsWith(month),
    )) {
      const key = `${row.asset}-${row.issuer}`;
      const g = grouped.get(key) || {
        name: row.issuer,
        issuer: row.issuer,
        asset: row.asset,
        value: 0,
      };
      g.value += row.flowUsd || 0;
      grouped.set(key, g);
    }
    const rows = [...grouped.values()].sort(
      (a, b) => Math.abs(b.value) - Math.abs(a.value),
    );
    if (!rows.length)
      throw new Error("No current-month ETF issuer flow rows parsed");
    return {
      ...base(d, period),
      status: "active",
      freshness: {
        status: "fresh",
        lastUpdatedAt: new Date().toISOString(),
        source: "Farside Investors",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric("Issuer rows", rows.length, String(rows.length)),
        metric(
          "Largest monthly net flow",
          rows[0].value,
          formatSignedUsd(rows[0].value),
        ),
      ],
      series: { ...emptySeries(), bars: rows.slice(0, 15), tables: rows },
      insights: [
        `${rows[0].issuer} has the largest absolute month-to-date ETF issuer flow.`,
        `BTC and ETH issuers are grouped separately when feasible.`,
        `Monthly aggregation uses parsed daily Farside flow rows.`,
      ],
      sourceUrl: btc.url,
      metadata: { ...base(d, period).metadata, month },
    };
  });
}
async function buildDuneStablecoin(d: DatasetRegistryItem, period: string) {
  const miss = d.requiredEnv.filter((k) => !process.env[k]);
  if (miss.length)
    return {
      ...base(d, period),
      status: "source_config_required" as const,
      freshness: {
        status: "source_config_required" as const,
        lastUpdatedAt: null,
        source: "Dune",
        fallbackUsed: false,
        missingConfig: miss,
        message:
          "Dune API key and latest-result query id are required; page loads never execute Dune queries.",
      },
      insights: [
        "Configure Dune credentials, then run a scheduled or manual refresh to persist the latest result.",
      ],
    };
  return withFallback(d, period, async () => {
    const started = new Date().toISOString();
    const result: any = await resultOrThrow(
      d.slug,
      "Dune",
      started,
      await fetchStablecoinNetTransfersLatest(),
    );
    const rows = result.data.sort(
      (a: any, b: any) => Math.abs(b.net_flow) - Math.abs(a.net_flow),
    );
    const total = rows.reduce((a: any, r: any) => a + r.net_flow, 0);
    return {
      ...base(d, period),
      status: "active",
      freshness: {
        status: "fresh",
        lastUpdatedAt: new Date().toISOString(),
        source: "Dune latest result",
        fallbackUsed: false,
        missingConfig: [],
        message: null,
      },
      headlineMetrics: [
        metric("Net flow", total, formatSignedUsd(total)),
        metric(
          "Top inflow chain",
          rows[0]?.chain || "N/A",
          rows[0]?.chain || "N/A",
        ),
      ],
      series: {
        ...emptySeries(),
        bars: rows.map((r: any) => ({
          name: r.chain,
          value: r.net_flow,
          ...r,
        })),
        tables: rows,
      },
      insights: [
        `Tracked chains show ${formatSignedUsd(total)} net stablecoin movement.`,
        "Dune latest-result is read only during refresh, not executed on page load.",
      ],
      sourceUrl: result.url,
      metadata: {
        ...base(d, period).metadata,
        rowsFetched: result.rowsFetched,
      },
    };
  });
}
function configSnapshot(
  d: DatasetRegistryItem,
  period: string,
  message: string,
  missing = d.requiredEnv.filter((k) => !process.env[k]),
): ChartSnapshot {
  return {
    ...base(d, period),
    status: (d.status === "disabled"
      ? "disabled"
      : "source_config_required") as DatasetStatus,
    freshness: {
      status: (d.status === "disabled"
        ? "manual_review_required"
        : "source_config_required") as
        | "manual_review_required"
        | "source_config_required",
      lastUpdatedAt: null,
      source: d.primarySource,
      fallbackUsed: false,
      missingConfig: missing,
      message,
    },
    warnings: [message],
    insights: [
      message,
      d.notes || "No fake or placeholder data is emitted for this dataset.",
    ],
  };
}
export async function buildChartSnapshot(
  slug: string,
  period?: string,
): Promise<ChartSnapshot | null> {
  const d = datasetRegistry.find((x) => x.slug === slug);
  if (!d) return null;
  const p = period || d.defaultPeriod;
  switch (slug) {
    case "chain-revenue-league":
      return buildDefillamaLeaderboard(
        {
          ...d,
          name: "Chain Fees League",
          description:
            "Top chains by network-level fees from DefiLlama chain breakdowns; protocol revenue is excluded.",
          requiredFields: ["chain", "fees_24h", "fees_7d", "fees_30d"],
        },
        p,
        fetchChainRevenue,
        "chain fees",
      );
    case "chain-stablecoin-supply":
      return buildStablecoinSupply(d, p);
    case "dex-volume-by-chain":
      return buildDefillamaLeaderboard(
        d,
        p,
        fetchDexVolumeByChain,
        "DEX chain volume",
      );
    case "protocol-revenue-league":
      return buildDefillamaLeaderboard(
        d,
        p,
        fetchProtocolRevenue,
        "protocol revenue",
      );
    case "dex-protocol-volume":
      return buildDefillamaLeaderboard(
        d,
        p,
        fetchDexProtocols,
        "DEX protocol volume",
      );
    case "perp-protocol-volume-oi":
      return buildDefillamaLeaderboard(
        d,
        p,
        fetchPerpProtocols,
        "perp protocol activity",
      );
    case "cex-transparency":
      return buildDefillamaLeaderboard(
        d,
        p,
        fetchCexTransparency,
        "exchange reserves",
      );
    case "btc-etf-flowboard":
      return buildEtfFlowSnapshot(d, p, "BTC");
    case "eth-etf-flowboard":
      return buildEtfFlowSnapshot(d, p, "ETH");
    case "btc-vs-eth-etf-flow-battle":
      return buildBtcEth(d, p);
    case "etf-issuer-monthly-report":
      return buildIssuerMonthly(d, p);
    case "stablecoin-net-transfers-by-chain":
      return buildDuneStablecoin(d, p);
    case "digital-asset-treasuries":
      return configSnapshot(
        d,
        p,
        "Digital asset treasury data is disabled until a licensed provider/schema is configured.",
        ["DIGITAL_ASSET_TREASURIES_SOURCE_URL"].filter((k) => !process.env[k]),
      );
    case "monthly-unlock-watch":
      return configSnapshot(
        d,
        p,
        "Monthly unlock data is disabled until a reliable unlock provider is configured.",
        ["TOKEN_UNLOCKS_SOURCE_URL"].filter((k) => !process.env[k]),
      );
    case "large-holders-board":
      return configSnapshot(
        d,
        p,
        "Large holders require configured explorer ingestion before activation.",
        largeHolderMissingConfig(),
      );
    case "whale-transfers":
      return configSnapshot(
        d,
        p,
        "Whale transfers require Whale Alert or explorer collector credentials before activation.",
        whaleTransferMissingConfig(),
      );
    case "binance-liquidation-pulse":
      return configSnapshot(
        d,
        p,
        "Binance Liquidation Pulse requires the external collector to persist Binance Futures liquidation snapshots; no page/API request opens a websocket.",
        ["ENABLE_BINANCE_LIQUIDATION_PULSE"].filter((k) => !process.env[k]),
      );
    default:
      return configSnapshot(d, p, "Dataset is not enabled.");
  }
}
export async function refreshDataset(slug: string, period?: string) {
  return buildChartSnapshot(slug, period);
}
export async function refreshAllDatasets() {
  const out = [];
  for (const d of datasetRegistry)
    out.push(await buildChartSnapshot(d.slug, d.defaultPeriod));
  return out;
}
export { supply_pressure_score, long_short_imbalance };
