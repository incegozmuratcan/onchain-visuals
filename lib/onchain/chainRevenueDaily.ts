/**
 * Chain Revenue Daily: DefiLlama chain revenue for one exact UTC calendar day.
 *
 * Chains come from the dailyRevenue overview, filtered to protocolType "chain"
 * and category "Chain". Each chain's value comes from its own summary
 * totalDataChart point for the target day. total24h is never read: it is a
 * rolling window that mixes two calendar days.
 *
 * DefiLlama fills a finished UTC day late, chain by chain. A day is complete
 * only when (1) its chain count reaches COVERAGE_RATIO of the median count of
 * the previous PRIOR_DAYS days, and (2) every chain from the previous day's
 * top 10 has a positive value on it. Anything less is incomplete, not small.
 *
 * This file has no imports so the share scripts can transpile it on its own.
 */

export const CHAIN_REVENUE_OVERVIEW_URL =
  "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue";

export function chainRevenueSummaryUrl(slug: string) {
  return `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=dailyRevenue`;
}

export const COVERAGE_RATIO = 0.95;
export const PRIOR_DAYS = 3;
export const TOP_COUNT = 10;
/** More failed summary fetches than this fraction makes the whole fetch a source error. */
export const MAX_FAILED_FETCH_RATIO = 0.05;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Card names where DefiLlama's label is a ticker or a run-together word. */
const DISPLAY_NAMES: Record<string, string> = {
  bsc: "BNB Chain",
  doge: "Dogecoin",
  bitcoincash: "Bitcoin Cash",
  near: "NEAR",
  core: "Core",
  cosmoshub: "Cosmos Hub",
  energyweb: "Energy Web",
};

export type RevenueChain = {
  slug: string;
  name: string;
  /** Icon key from the overview logo file name, e.g. "op mainnet" for rsz_op mainnet.jpg. */
  logoKey: string;
};

/** Day (YYYY-MM-DD) → chain slug → revenue in USD. */
export type RevenueDays = Record<string, Record<string, number>>;

export type ChainRevenueRow = {
  rank: number;
  slug: string;
  name: string;
  logo: string;
  value: number;
  formattedValue: string;
  /** Bar width in percent of the track. Square-root scale so small chains stay visible. */
  barPercent: number;
  share: number;
};

export type ChainRevenueAssessment = {
  date: string;
  complete: boolean;
  chainCount: number;
  threshold: number;
  priorDates: string[];
  priorCounts: number[];
  priorMedian: number;
  priorTop: string[];
  missingPriorTop: string[];
  total: number;
  problems: string[];
  message: string;
};

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(day: string, delta: number) {
  return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS));
}

/** The latest completed UTC calendar day: the day before `now` in UTC. */
export function latestCompletedUtcDay(now: Date = new Date()) {
  return addUtcDays(utcDay(now), -1);
}

export function chainDisplayName(slug: string, name: string) {
  return DISPLAY_NAMES[slug] || String(name || slug).trim();
}

function logoKeyFrom(logo: unknown, slug: string) {
  const match = String(logo || "").match(/rsz_([^/?#]+?)\.(?:jpg|jpeg|png|webp|svg)$/i);
  return match ? decodeURIComponent(match[1]) : slug;
}

/**
 * DefiLlama's chain icon. The overview logo field is an old `/chains/rsz_<name>.jpg`
 * path that now 404s; the same name under `/icons/chains/` serves the image.
 */
export function defillamaChainLogoUrl(logoKey: string) {
  return `https://icons.llamao.fi/icons/chains/rsz_${encodeURIComponent(logoKey)}?w=96`;
}

/**
 * Reviewed brand marks for the chains that hold the top 10, as drawn on the
 * approved v17 card (public/logos/chain-revenue). Every other chain uses its
 * DefiLlama icon; the card falls back to an initial circle if that fails.
 */
export const CURATED_CHAIN_LOGOS: Record<string, string> = {
  tron: "/logos/chain-revenue/tron.png",
  ethereum: "/logos/chain-revenue/ethereum.png",
  base: "/logos/chain-revenue/base.png",
  "hyperliquid-l1": "/logos/chain-revenue/hyperliquid-l1.png",
  polygon: "/logos/chain-revenue/polygon.png",
  bsc: "/logos/chain-revenue/bsc.png",
  solana: "/logos/chain-revenue/solana.png",
  "robinhood-chain": "/logos/chain-revenue/robinhood-chain.png",
  arbitrum: "/logos/chain-revenue/arbitrum.png",
  avalanche: "/logos/chain-revenue/avalanche.png",
};

export function chainRevenueLogoUrl(slug: string, logoKey: string = slug) {
  return CURATED_CHAIN_LOGOS[slug] || defillamaChainLogoUrl(logoKey);
}

export function listRevenueChains(overview: any): RevenueChain[] {
  const protocols = Array.isArray(overview?.protocols) ? overview.protocols : [];
  const seen = new Set<string>();
  const out: RevenueChain[] = [];
  for (const p of protocols) {
    if (p?.protocolType !== "chain" || p?.category !== "Chain") continue;
    const slug = String(p.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      name: chainDisplayName(slug, p.displayName || p.name),
      logoKey: logoKeyFrom(p.logo, slug),
    });
  }
  return out;
}

/** Calendar-day points from one summary totalDataChart, keyed by UTC day. */
export function summaryDailyPoints(summary: any): Record<string, number> {
  const out: Record<string, number> = {};
  const points = Array.isArray(summary?.totalDataChart) ? summary.totalDataChart : [];
  for (const point of points) {
    const ts = num(Array.isArray(point) ? point[0] : point?.date);
    const value = num(Array.isArray(point) ? point[1] : point?.value);
    if (ts == null || value == null) continue;
    const ms = ts < 1e12 ? ts * 1000 : ts;
    if (ms % DAY_MS !== 0) continue; // only whole UTC-day points
    out[utcDay(new Date(ms))] = value;
  }
  return out;
}

/** Folds per-chain summaries into day → chain → value, keeping only `keepDays` recent days. */
export function buildRevenueDays(
  summaries: { slug: string; summary: any }[],
  keepFrom?: string,
): RevenueDays {
  const days: RevenueDays = {};
  for (const { slug, summary } of summaries) {
    const points = summaryDailyPoints(summary);
    for (const [day, value] of Object.entries(points)) {
      if (keepFrom && day < keepFrom) continue;
      (days[day] ||= {})[slug] = value;
    }
  }
  return days;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function ranked(day: Record<string, number> | undefined) {
  return Object.entries(day || {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function assessChainRevenueDay(days: RevenueDays, date: string): ChainRevenueAssessment {
  const target = days[date] || {};
  const chainCount = Object.keys(target).length;
  const priorDates = Array.from({ length: PRIOR_DAYS }, (_, i) => addUtcDays(date, -(i + 1)));
  const priorCounts = priorDates.map((day) => Object.keys(days[day] || {}).length);
  const priorMedian = median(priorCounts);
  const threshold = Math.ceil(priorMedian * COVERAGE_RATIO);
  const priorTop = ranked(days[priorDates[0]])
    .filter(([, value]) => value > 0)
    .slice(0, TOP_COUNT)
    .map(([slug]) => slug);
  const missingPriorTop = priorTop.filter((slug) => !(Number(target[slug]) > 0));
  const total = Object.values(target).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const problems: string[] = [];
  if (!DATE_RE.test(date)) problems.push(`${date} is not a YYYY-MM-DD day`);
  if (priorCounts.some((count) => count === 0)) {
    problems.push(`prior days ${priorDates.join(", ")} have counts ${priorCounts.join(", ")}`);
  }
  if (chainCount < threshold || chainCount === 0) {
    problems.push(`${chainCount} chains reported; need ${threshold} (${Math.round(COVERAGE_RATIO * 100)}% of median ${priorMedian})`);
  }
  if (missingPriorTop.length) {
    problems.push(`missing ${priorDates[0]} top-10 chains ${missingPriorTop.join(", ")}`);
  }
  const complete = problems.length === 0;
  return {
    date,
    complete,
    chainCount,
    threshold,
    priorDates,
    priorCounts,
    priorMedian,
    priorTop,
    missingPriorTop,
    total,
    problems,
    message: complete
      ? `Chain revenue ${date} is complete: ${chainCount} chains (need ${threshold}), all ${priorTop.length} prior top-10 chains present.`
      : `Chain revenue ${date} is not complete yet: ${problems.join("; ")}.`,
  };
}

/** Newest day on or before `latest` that passes the completeness gate. */
export function latestCompleteChainRevenueDay(days: RevenueDays, latest: string, lookback = 4) {
  for (let i = 0; i < lookback; i += 1) {
    const day = addUtcDays(latest, -i);
    const assessment = assessChainRevenueDay(days, day);
    if (assessment.complete) return assessment;
  }
  return null;
}

/** "$593.2K", "$1.05M", "$950". */
export function formatChainRevenueAmount(value: number) {
  const v = Math.max(0, Number(value) || 0);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 999_950) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export function formatChainRevenueShare(share: number) {
  return `${(Math.max(0, Number(share) || 0) * 100).toFixed(1)}%`;
}

/** Square-root bar scale (the approved v17 card): #1 fills the track. */
export function chainRevenueBarPercent(value: number, max: number) {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.round(1000 * Math.sqrt(Math.min(1, value / max))) / 10;
}

export function rankChainRevenueDay(
  days: RevenueDays,
  date: string,
  chains: RevenueChain[],
  count = TOP_COUNT,
) {
  const bySlug = new Map(chains.map((chain) => [chain.slug, chain]));
  const day = days[date] || {};
  const total = Object.values(day).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const list = ranked(day).filter(([, value]) => value > 0).slice(0, count);
  const max = list[0]?.[1] || 0;
  const rows: ChainRevenueRow[] = list.map(([slug, value], index) => {
    const chain = bySlug.get(slug);
    return {
      rank: index + 1,
      slug,
      name: chain?.name || slug,
      logo: chainRevenueLogoUrl(slug, chain?.logoKey || slug),
      value,
      formattedValue: formatChainRevenueAmount(value),
      barPercent: chainRevenueBarPercent(value, max),
      share: total > 0 ? value / total : 0,
    };
  });
  return { date, total, chainCount: Object.keys(day).length, rows };
}

export type FetchJson = (url: string, options?: { timeoutMs?: number; retries?: number }) => Promise<any>;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Fetch the chain list and every chain's daily revenue points.
 * Days older than `keepDays` before `now` are dropped to keep the payload small.
 */
export async function fetchChainRevenueDays(
  fetchJson: FetchJson,
  { now = new Date(), keepDays = 10, concurrency = 8 }: { now?: Date; keepDays?: number; concurrency?: number } = {},
) {
  const overview = await fetchJson(CHAIN_REVENUE_OVERVIEW_URL, { timeoutMs: 60_000, retries: 2 });
  const chains = listRevenueChains(overview);
  if (chains.length < 20) {
    throw new Error(`DefiLlama overview returned ${chains.length} chains; expected about 100.`);
  }
  const failed: string[] = [];
  const summaries = await mapLimit(chains, concurrency, async (chain) => {
    try {
      return { slug: chain.slug, summary: await fetchJson(chainRevenueSummaryUrl(chain.slug), { timeoutMs: 30_000, retries: 2 }) };
    } catch {
      failed.push(chain.slug);
      return { slug: chain.slug, summary: null };
    }
  });
  if (failed.length > Math.floor(chains.length * MAX_FAILED_FETCH_RATIO)) {
    throw new Error(`DefiLlama summary fetch failed for ${failed.length} of ${chains.length} chains: ${failed.slice(0, 12).join(", ")}.`);
  }
  const keepFrom = addUtcDays(utcDay(now), -keepDays);
  const days = buildRevenueDays(summaries, keepFrom);
  return { chains, days, failed: failed.sort(), fetchedAt: new Date().toISOString() };
}
