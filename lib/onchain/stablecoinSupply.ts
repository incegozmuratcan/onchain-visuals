/**
 * Stablecoin supply by chain, from DefiLlama's daily 00:00 UTC snapshots.
 *
 * Weekly uses the last completed Monday–Sunday week: Sunday's snapshot versus
 * the previous Sunday. Monthly uses the last completed calendar month:
 * month-end versus the previous month-end. The week or month that contains
 * today is not used. This file has no imports so the share script can
 * transpile it on its own.
 */

export const STABLECOIN_CHAINS_URL = "https://stablecoins.llama.fi/stablecoinchains";
export const STABLECOIN_CHART_ALL_URL = "https://stablecoins.llama.fi/stablecoincharts/all";
export const STABLECOIN_TOP_COUNT = 10;

export function stablecoinChartUrl(chain: string) {
  return `https://stablecoins.llama.fi/stablecoincharts/${encodeURIComponent(chain)}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PANEL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const DISPLAY_NAMES: Record<string, string> = {
  bsc: "BNB Chain",
  "hyperliquid-l1": "Hyperliquid L1",
  zksync: "ZKsync",
  "zksync-era": "ZKsync",
};

export type StablecoinRankChange = { kind: "up" | "down" | "new"; places?: number };

export type StablecoinChainSeries = {
  rawName: string;
  slug: string;
  name: string;
  logoKey: string;
  points: Record<string, number>;
};

export type StablecoinHistory = {
  chains: StablecoinChainSeries[];
  totals: Record<string, number>;
  failed: string[];
  chainListCount: number;
  fetchedAt: string;
  url: string;
};

export type FetchJson = (url: string, options?: { timeoutMs?: number; retries?: number }) => Promise<unknown>;

export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(day: string, delta: number) {
  return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS));
}

export function lastCompletedUtcWeek(now: Date = new Date()) {
  const yesterday = addUtcDays(utcDay(now), -1);
  const sundayOffset = new Date(`${yesterday}T00:00:00Z`).getUTCDay();
  const end = addUtcDays(yesterday, -sundayOffset);
  return { start: addUtcDays(end, -6), end };
}

export function lastCompletedUtcMonth(now: Date = new Date()) {
  const [year, month] = utcDay(now).split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 2, 1));
  const endDate = new Date(Date.UTC(year, month - 1, 0));
  return { start: utcDay(startDate), end: utcDay(endDate) };
}

export function previousUtcWeek(start: string) {
  return { start: addUtcDays(start, -7), end: addUtcDays(start, -1) };
}

export function previousUtcMonth(start: string) {
  const [year, month] = start.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 2, 1));
  const endDate = new Date(Date.UTC(year, month - 1, 0));
  return { start: utcDay(startDate), end: utcDay(endDate) };
}

export function sanitizeChainName(raw: string) {
  const cleaned = String(raw || "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[^\p{L}\p{N} .&\-'()/+]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  return cleaned || "Chain";
}

export function stablecoinSlug(raw: string) {
  const key = String(raw || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (key === "bsc" || key === "bnb" || key === "binance" || key === "binance-smart-chain") return "bsc";
  if (key === "hyperliquid" || key === "hyperliquid-l1") return "hyperliquid-l1";
  if (key === "op" || key === "op-mainnet") return "optimism";
  if (key === "matic" || key === "polygon-pos") return "polygon";
  if (key === "avax" || key === "avalanche-c-chain") return "avalanche";
  if (key === "arbitrum-one") return "arbitrum";
  if (key === "zksync-era") return "zksync";
  if (key === "xlayer") return "x-layer";
  return key || "chain";
}

export function stablecoinDisplayName(raw: string) {
  const slug = stablecoinSlug(raw);
  const display = sanitizeChainName(DISPLAY_NAMES[slug] || raw);
  if (slug === "robinhood-chain" || display === "Robinhood Chain") return "Robinhood";
  return display;
}

export function stablecoinLogoKey(raw: string) {
  return stablecoinSlug(raw).replace(/-/g, " ");
}

function peggedUsd(point: unknown) {
  const row = point as { totalCirculatingUSD?: { peggedUSD?: unknown } };
  const value = Number(row?.totalCirculatingUSD?.peggedUSD);
  return Number.isFinite(value) ? value : null;
}

export function indexStablecoinChart(rows: unknown) {
  const points: Record<string, number> = {};
  if (!Array.isArray(rows)) return points;
  for (const point of rows) {
    const date = Number((point as { date?: unknown })?.date);
    if (!Number.isFinite(date)) continue;
    const day = new Date(date * 1000).toISOString().slice(0, 10);
    const value = peggedUsd(point);
    if (value == null || value < 0) continue;
    points[day] = value;
  }
  return points;
}

export function formatSupplyCompact(value: number) {
  const v = Math.abs(Number(value) || 0);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

/** Caption amounts spell out the unit. Billions use 2 decimals, millions use 1. */
export function formatSupplyWords(value: number) {
  const v = Math.abs(Number(value) || 0);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)} billion`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)} million`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)} thousand`;
  return `$${Math.round(v)}`;
}

export function formatSignedSupplyPercent(change: number, base: number) {
  if (!(base > 0)) return "—";
  const pct = (change / base) * 100;
  const text = Math.abs(pct).toFixed(1);
  if (text === "0.0") return "0.0%";
  return pct > 0 ? `+${text}%` : `-${text}%`;
}

export function stablecoinRankChange(slug: string, rank: number, priorTop: string[]): StablecoinRankChange | null {
  const priorIndex = priorTop.indexOf(slug);
  if (priorIndex < 0) return { kind: "new" };
  const priorRank = priorIndex + 1;
  if (priorRank === rank) return null;
  if (rank < priorRank) return { kind: "up", places: priorRank - rank };
  return { kind: "down", places: rank - priorRank };
}

function rankedAt(chains: StablecoinChainSeries[], day: string) {
  return chains
    .map((chain) => ({ chain, value: chain.points[day] || 0 }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.chain.name.localeCompare(b.chain.name));
}

export type StablecoinPeriodKind = "weekly" | "monthly";

export function periodRange(kind: StablecoinPeriodKind, now: Date) {
  return kind === "weekly" ? lastCompletedUtcWeek(now) : lastCompletedUtcMonth(now);
}

export function priorPeriodRange(kind: StablecoinPeriodKind, start: string) {
  return kind === "weekly" ? previousUtcWeek(start) : previousUtcMonth(start);
}

function parts(day: string) {
  if (!DATE_RE.test(day)) throw new Error(`Stablecoin period requires YYYY-MM-DD, got ${day || "none"}.`);
  const [year, month, date] = day.split("-").map(Number);
  return { year, month: month - 1, date };
}

export function stablecoinWeekCopy(start: string, end: string) {
  const first = parts(start);
  const last = parts(end);
  const sameMonth = first.year === last.year && first.month === last.month;
  const sameYear = first.year === last.year;
  const subtitleRange = sameMonth
    ? `${SHORT_MONTHS[first.month]} ${first.date}–${last.date}, ${first.year}`
    : sameYear
      ? `${SHORT_MONTHS[first.month]} ${first.date}–${SHORT_MONTHS[last.month]} ${last.date}, ${first.year}`
      : `${SHORT_MONTHS[first.month]} ${first.date}, ${first.year}–${SHORT_MONTHS[last.month]} ${last.date}, ${last.year}`;
  const panelDay = sameMonth
    ? `${PANEL_MONTHS[first.month]} ${first.date}–${last.date}`
    : `${PANEL_MONTHS[first.month]} ${first.date}–${PANEL_MONTHS[last.month]} ${last.date}`;
  const captionRange = sameYear
    ? `${SHORT_MONTHS[first.month]} ${first.date} – ${SHORT_MONTHS[last.month]} ${last.date}`
    : `${SHORT_MONTHS[first.month]} ${first.date}, ${first.year} – ${SHORT_MONTHS[last.month]} ${last.date}, ${last.year}`;
  return {
    subtitle: `Stablecoin supply by chain, ${subtitleRange}.`,
    panelDay,
    panelYear: sameYear ? String(first.year) : `${first.year}–${last.year}`,
    captionHeading: `Stablecoin supply by chain (${captionRange})`,
  };
}

export function stablecoinMonthCopy(start: string) {
  const parsed = parts(start);
  const full = `${FULL_MONTHS[parsed.month]} ${parsed.year}`;
  return {
    subtitle: `Stablecoin supply by chain, ${full}.`,
    panelDay: PANEL_MONTHS[parsed.month],
    panelYear: String(parsed.year),
    captionHeading: `Stablecoin supply by chain (${full})`,
    monthName: FULL_MONTHS[parsed.month],
  };
}

export function assessStablecoinPeriod(history: StablecoinHistory, kind: StablecoinPeriodKind, now: Date = new Date()) {
  const range = periodRange(kind, now);
  const prior = priorPeriodRange(kind, range.start);
  const close = range.end;
  const previousClose = prior.end;
  const problems: string[] = [];
  // A failed chart has no close value, so it can still be inside the top 10.
  // Any failure blocks the card. A 5% allowance would publish the wrong ranking.
  if (history.failed.length) {
    const shown = history.failed.slice(0, 5).join(", ");
    const more = history.failed.length > 5 ? `, and ${history.failed.length - 5} more` : "";
    problems.push(`${history.failed.length} chain chart${history.failed.length === 1 ? "" : "s"} failed (${shown}${more})`);
  }
  if (history.totals[close] == null) problems.push(`no total snapshot on ${close}`);
  if (history.totals[previousClose] == null) problems.push(`no total snapshot on ${previousClose}`);
  const ranked = rankedAt(history.chains, close);
  if (ranked.length < STABLECOIN_TOP_COUNT) {
    problems.push(`${ranked.length} chains have supply on ${close}`);
  }
  const complete = problems.length === 0;
  return {
    start: range.start,
    end: range.end,
    close,
    previousClose,
    complete,
    problems,
    chainCount: ranked.length,
    message: complete
      ? `Stablecoin supply ${range.start} through ${range.end} is complete.`
      : `Stablecoin supply ${range.start} through ${range.end} is not complete: ${problems.join("; ")}.`,
  };
}

export function rankStablecoinPeriod(history: StablecoinHistory, kind: StablecoinPeriodKind, now: Date = new Date()) {
  const assessment = assessStablecoinPeriod(history, kind, now);
  if (!assessment.complete) throw new Error(assessment.message);
  const priorRanked = rankedAt(history.chains, assessment.previousClose);
  const priorTop = priorRanked.slice(0, STABLECOIN_TOP_COUNT).map((row) => row.chain.slug);
  const current = rankedAt(history.chains, assessment.close).slice(0, STABLECOIN_TOP_COUNT);
  const total = history.totals[assessment.close];
  const previousTotal = history.totals[assessment.previousClose];
  const rows = current.map((row, index) => {
    const previous = row.chain.points[assessment.previousClose] || 0;
    const change = row.value - previous;
    const formattedPercent = formatSignedSupplyPercent(change, previous);
    return {
      rank: index + 1,
      slug: row.chain.slug,
      name: row.chain.name,
      rawName: row.chain.rawName,
      logoKey: row.chain.logoKey,
      logo: `https://icons.llamao.fi/icons/chains/rsz_${encodeURIComponent(row.chain.logoKey)}?w=96`,
      value: row.value,
      previous,
      change,
      formattedValue: formatSupplyCompact(row.value),
      formattedPercent,
      percentValue: formattedPercent === "0.0%" || !(previous > 0) ? 0 : change / previous,
      rankChange: stablecoinRankChange(row.chain.slug, index + 1, priorTop),
    };
  });
  const gainers = rows.filter((row) => row.change > 0);
  const highlight = gainers.length
    ? gainers.reduce((best, row) => (row.change > best.change ? row : best))
    : rows.reduce((worst, row) => (row.change < worst.change ? row : worst));
  const newcomers = rows.filter((row) => row.rankChange?.kind === "new").map((row) => row.name);
  const ranksUnchanged = rows.every((row) => row.rankChange == null);
  return {
    assessment,
    total,
    previousTotal,
    totalChange: total - previousTotal,
    chainCount: assessment.chainCount,
    rows,
    highlight: {
      kind: highlight.change > 0 ? "gain" as const : "loss" as const,
      slug: highlight.slug,
      name: highlight.name,
      logo: highlight.logo,
      change: highlight.change,
      formattedChange: formatSupplyCompact(highlight.change),
    },
    newcomers,
    ranksUnchanged,
    priorTop,
  };
}

type Mention = (name: string) => string;

export function buildStablecoinSupplyCaption(
  input: {
    kind: StablecoinPeriodKind;
    start: string;
    end: string;
    total: number;
    previousTotal: number;
    highlight: { kind: "gain" | "loss"; name: string; change: number };
    newcomers: string[];
    ranksUnchanged: boolean;
  },
  mention: Mention = (name) => name,
) {
  const copy = input.kind === "weekly" ? stablecoinWeekCopy(input.start, input.end) : stablecoinMonthCopy(input.start);
  const change = input.total - input.previousTotal;
  const percent = formatSignedSupplyPercent(change, input.previousTotal);
  const verb = change > 0 ? "rose" : change < 0 ? "fell" : "was unchanged";
  const totalLine = change === 0
    ? `Total supply was unchanged at ${formatSupplyWords(input.total)}.`
    : `Total supply ${verb} by ${formatSupplyWords(change)} (${percent}) to ${formatSupplyWords(input.total)}.`;
  const mover = mention(input.highlight.name);
  const moverLine = input.highlight.kind === "gain"
    ? `${mover} had the biggest gain, adding ${formatSupplyWords(input.highlight.change)}.`
    : `${mover} had the biggest loss, dropping ${formatSupplyWords(input.highlight.change)}.`;
  const lines = [copy.captionHeading, "", totalLine, moverLine];
  if (input.newcomers.length) {
    for (const name of input.newcomers) lines.push(`${mention(name)} entered the top 10.`);
  } else if (input.ranksUnchanged) {
    if (input.kind === "weekly") lines.push("The top 10 kept the same order as last week.");
    else lines.push(`The top 10 kept the same order as ${stablecoinMonthCopy(priorPeriodRange("monthly", input.start).start).monthName}.`);
  }
  return lines.join("\n");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchStablecoinHistory(
  fetchJson: FetchJson,
  { concurrency = 8 }: { concurrency?: number } = {},
): Promise<StablecoinHistory> {
  const [chainList, totalsJson] = await Promise.all([
    fetchJson(STABLECOIN_CHAINS_URL, { timeoutMs: 30_000, retries: 2 }),
    fetchJson(STABLECOIN_CHART_ALL_URL, { timeoutMs: 60_000, retries: 2 }),
  ]);
  const names = (Array.isArray(chainList) ? chainList : [])
    .map((row) => String((row as { name?: unknown })?.name || "").trim())
    .filter(Boolean);
  if (names.length < 20) throw new Error(`DefiLlama listed ${names.length} stablecoin chains.`);
  const failed: string[] = [];
  const fetched = await mapLimit(names, concurrency, async (rawName) => {
    try {
      const json = await fetchJson(stablecoinChartUrl(rawName), { timeoutMs: 30_000, retries: 2 });
      const slug = stablecoinSlug(rawName);
      return {
        rawName,
        slug,
        name: stablecoinDisplayName(rawName),
        logoKey: stablecoinLogoKey(rawName),
        points: indexStablecoinChart(json),
      } satisfies StablecoinChainSeries;
    } catch {
      failed.push(rawName);
      return null;
    }
  });
  const bySlug = new Map<string, StablecoinChainSeries>();
  for (const chain of fetched) {
    if (!chain) continue;
    const existing = bySlug.get(chain.slug);
    if (!existing) bySlug.set(chain.slug, chain);
  }
  return {
    chains: [...bySlug.values()],
    totals: indexStablecoinChart(totalsJson),
    failed,
    chainListCount: names.length,
    fetchedAt: new Date().toISOString(),
    url: STABLECOIN_CHART_ALL_URL,
  };
}
