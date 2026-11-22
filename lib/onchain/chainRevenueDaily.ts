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
 * After CHAIN_REVENUE_MISSING_TOP_CUTOFF Europe/Istanbul on the run day, a
 * missing previous top-10 chain no longer blocks when tron, ethereum, and
 * solana are present if they were in that top 10. The ignored chains are logged.
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
/**
 * Europe/Istanbul clock time on the run day. Before this, a missing previous-day
 * top-10 chain still blocks. At and after it, only a missing core chain does.
 */
export const CHAIN_REVENUE_MISSING_TOP_CUTOFF = "20:00";
const CHAIN_REVENUE_CUTOFF_TIME_ZONE = "Europe/Istanbul";
/** Large chains that still block after the cutoff when they were in the previous top 10. */
const CORE_PRIOR_TOP_CHAINS = ["tron", "ethereum", "solana"];
/** More failed summary fetches than this fraction makes the whole fetch a source error. */
export const MAX_FAILED_FETCH_RATIO = 0.05;
/** Days of history the weekly card needs: the week, the prior week, and the gate's 3-day lookback. */
export const CHAIN_REVENUE_WEEK_KEEP_DAYS = 28;
/** Days of history the monthly card needs: the month, the prior month, and the gate's lookback. */
export const CHAIN_REVENUE_MONTH_KEEP_DAYS = 120;

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

export type ChainRevenueRankChange = {
  kind: "up" | "down" | "new";
  /** Places gained or lost versus the previous period's top 10. Omitted for NEW. */
  places?: number;
};

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
  /** Weekly and monthly cards only. Null when the rank did not change. */
  rankChange?: ChainRevenueRankChange | null;
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

/**
 * Names drawn from DefiLlama. Control characters are removed, then anything
 * outside letters, digits, spaces, and .-&'()/+ is dropped. Unicode letters
 * stay. The result is capped so a hostile label cannot blow out the card.
 */
export function sanitizeChainName(raw: string) {
  const cleaned = String(raw || "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[^\p{L}\p{N} .&\-'()/+]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  return cleaned || "Chain";
}

export function chainDisplayName(slug: string, name: string) {
  return sanitizeChainName(DISPLAY_NAMES[slug] || String(name || slug));
}

/**
 * Weekly and monthly cards shorten Robinhood Chain so the rank badge fits in
 * the same 330px name column as the daily card. The daily card keeps the full name.
 */
export function chainPeriodDisplayName(slug: string, name: string) {
  const display = chainDisplayName(slug, name);
  if (slug === "robinhood-chain" || display === "Robinhood Chain") return "Robinhood";
  return display;
}

/** Largest logo bytes we will cache or draw. Larger responses fall through. */
export const CHAIN_LOGO_MAX_BYTES = 512 * 1024;

/**
 * Hosts Logo Manager actually stores for an approved chain logo, plus DefiLlama.
 * Exact hosts only. Vercel Blob public URLs are a single store label under
 * public.blob.vercel-storage.com.
 */
const CHAIN_LOGO_HOSTS = new Set([
  "icons.llamao.fi",
  "token-icons.llamao.fi",
  "assets.coingecko.com",
  "coin-images.coingecko.com",
  "s2.coinmarketcap.com",
  "s3.coinmarketcap.com",
]);

function chainLogoHostAllowed(hostname: string) {
  const host = String(hostname || "").toLowerCase();
  if (CHAIN_LOGO_HOSTS.has(host)) return true;
  const suffix = ".public.blob.vercel-storage.com";
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

export type ChainLogoImageType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

export function normalizeImageContentType(value: unknown): ChainLogoImageType | null {
  const base = String(value || "").split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  if (base === "image/png" || base === "image/jpeg" || base === "image/webp" || base === "image/svg+xml") return base;
  return null;
}

/** Magic bytes, or an SVG document with no script. Anything else is not a logo. */
export function sniffChainLogo(bytes: Uint8Array): ChainLogoImageType | null {
  if (!bytes || bytes.byteLength < 8 || bytes.byteLength > CHAIN_LOGO_MAX_BYTES) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  let text = "";
  try {
    text = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  const trimmed = text.trimStart();
  if (!/^<\?xml[\s>]|^<svg[\s>]/i.test(trimmed) || !/<svg[\s>]/i.test(text)) return null;
  if (/<script|javascript:|on[a-z]+\s*=/i.test(text)) return null;
  return "image/svg+xml";
}

function dataUrlBytes(payload: string, base64: boolean) {
  try {
    if (base64) {
      const binary = atob(payload.replace(/\s/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(payload));
  } catch {
    return null;
  }
}

function allowedChainLogoDataUrl(raw: string) {
  if (raw.length > CHAIN_LOGO_MAX_BYTES * 2) return null;
  const match = raw.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml))(;base64)?,([\s\S]*)$/i);
  if (!match) return null;
  const declared = normalizeImageContentType(match[1]);
  const bytes = dataUrlBytes(match[3], Boolean(match[2]));
  if (!declared || !bytes || bytes.byteLength <= 0 || bytes.byteLength > CHAIN_LOGO_MAX_BYTES) return null;
  if (sniffChainLogo(bytes) !== declared) return null;
  return raw;
}

/**
 * https logo hosts, this repo's /logos files, or a validated image data URL.
 * http, protocol-relative, and unknown hosts are rejected.
 */
export function allowedChainLogoUrl(src: unknown) {
  const raw = String(src || "").trim();
  if (!raw || raw.includes("\\") || raw.includes("\0")) return null;
  if (raw.startsWith("data:")) return allowedChainLogoDataUrl(raw);
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !chainLogoHostAllowed(url.hostname)) return null;
    return raw;
  } catch {
    return null;
  }
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
 * approved v17 card (public/logos/chain-revenue). Kept as the fixed fallback
 * after Logo Manager and the posted-state cache.
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

export type ChainLogoSourceName = "approved" | "cache" | "fixed" | "defillama" | "initial";

/** A copy of the last approved logo, stored in the workflow's posted-state.json. */
export type ChainLogoCacheEntry = {
  slug: string;
  name: string;
  approvedUrl: string;
  contentType: string;
  dataUrl: string;
  byteLength: number;
  updatedAt: string;
};

/** A logo that already passed the https/local, content-type, and size checks. */
export type CheckedChainLogo = {
  contentType: string;
  byteLength: number;
  renderUrl: string;
};

export type ChainLogoPlanChain = {
  slug: string;
  name: string;
  logoKey: string;
  /** False for a cached chain that is not on this card. Its cache is still updated. */
  onCard?: boolean;
};

export function chainInitialLetter(name: string) {
  const match = sanitizeChainName(name).match(/\p{L}|\p{N}/u);
  return (match ? match[0] : "C").toUpperCase();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Circular initial, the same 96px box the other logos use. Never a question mark. */
export function chainInitialBadgeDataUrl(name: string) {
  const letter = escapeXml(chainInitialLetter(name));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<circle cx="48" cy="48" r="46" fill="#dfe2e7" stroke="#e3e6eb" stroke-width="3"/>` +
    `<text x="48" y="50" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Inter,Arial,sans-serif" font-size="42" font-weight="900" fill="#5b616b">${letter}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function chainLogoCacheEntryUsable(entry: ChainLogoCacheEntry | null | undefined) {
  if (!entry || !entry.approvedUrl || !entry.dataUrl) return false;
  if (!Number.isFinite(entry.byteLength) || entry.byteLength <= 0 || entry.byteLength > CHAIN_LOGO_MAX_BYTES) return false;
  return Boolean(allowedChainLogoUrl(entry.dataUrl));
}

function checkedLogoUsable(checked: CheckedChainLogo | null | undefined) {
  if (!checked) return false;
  if (!Number.isFinite(checked.byteLength) || checked.byteLength <= 0 || checked.byteLength > CHAIN_LOGO_MAX_BYTES) return false;
  return Boolean(allowedChainLogoUrl(checked.renderUrl));
}

/**
 * Logo order for one card: approved, cached copy, fixed file, DefiLlama, initial.
 * Every on-card chain gets a url. An invalid image falls to the next source.
 * Cache entries are replaced when the approved URL or byte length changes, and
 * removed only when the database is up and that chain is no longer approved.
 */
export function planChainRevenueLogos(input: {
  chains: ChainLogoPlanChain[];
  dbAvailable: boolean;
  approvedUrlBySlug: Record<string, string | null | undefined>;
  cache: Record<string, ChainLogoCacheEntry | undefined>;
  images: Record<string, CheckedChainLogo | null | undefined>;
  now?: string;
}) {
  const now = input.now || new Date().toISOString();
  const seen = new Set(input.chains.map((chain) => chain.slug));
  const nextCache: Record<string, ChainLogoCacheEntry> = {};
  for (const [slug, entry] of Object.entries(input.cache || {})) {
    if (!seen.has(slug) && chainLogoCacheEntryUsable(entry)) nextCache[slug] = entry as ChainLogoCacheEntry;
  }
  const choices: { slug: string; name: string; source: ChainLogoSourceName; url: string }[] = [];
  const warnings: string[] = [];

  for (const chain of input.chains) {
    const approvedUrl = input.dbAvailable ? String(input.approvedUrlBySlug?.[chain.slug] || "") : "";
    const cached = input.cache?.[chain.slug];
    const approved = approvedUrl ? input.images?.[approvedUrl] : null;
    let choice: { source: ChainLogoSourceName; url: string } | null = null;

    if (input.dbAvailable && approvedUrl && checkedLogoUsable(approved) && String(approved?.renderUrl || "").startsWith("data:")) {
      const checked = approved as CheckedChainLogo;
      const sameCopy =
        chainLogoCacheEntryUsable(cached) &&
        cached!.approvedUrl === approvedUrl &&
        cached!.byteLength === checked.byteLength;
      if (sameCopy) {
        nextCache[chain.slug] = { ...cached!, name: chain.name };
        choice = { source: "approved", url: cached!.dataUrl };
      } else {
        nextCache[chain.slug] = {
          slug: chain.slug,
          name: chain.name,
          approvedUrl,
          contentType: checked.contentType,
          dataUrl: checked.renderUrl,
          byteLength: checked.byteLength,
          updatedAt: now,
        };
        choice = { source: "approved", url: checked.renderUrl };
      }
    } else if (!(input.dbAvailable && !approvedUrl) && chainLogoCacheEntryUsable(cached)) {
      nextCache[chain.slug] = cached as ChainLogoCacheEntry;
      choice = { source: "cache", url: cached!.dataUrl };
    }

    if (!choice) {
      const fixed = CURATED_CHAIN_LOGOS[chain.slug];
      if (fixed && checkedLogoUsable(input.images?.[fixed])) choice = { source: "fixed", url: fixed };
    }
    if (!choice) {
      const llama = defillamaChainLogoUrl(chain.logoKey || chain.slug);
      if (checkedLogoUsable(input.images?.[llama])) {
        choice = { source: "defillama", url: llama };
        if (chain.onCard !== false) warnings.push(`Chain revenue logo for ${chain.slug} fell back to DefiLlama.`);
      }
    }
    if (!choice) {
      choice = { source: "initial", url: chainInitialBadgeDataUrl(chain.name) };
      if (chain.onCard !== false) warnings.push(`Chain revenue logo for ${chain.slug} fell back to an initial badge.`);
    }
    if (chain.onCard !== false) choices.push({ slug: chain.slug, name: chain.name, source: choice.source, url: choice.url });
  }

  return { choices, cache: nextCache, warnings };
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

function minutesInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return read("hour") * 60 + read("minute");
}

function atOrAfterMissingTopCutoff(now: Date) {
  const [hour, minute] = CHAIN_REVENUE_MISSING_TOP_CUTOFF.split(":").map(Number);
  return minutesInTimeZone(now, CHAIN_REVENUE_CUTOFF_TIME_ZONE) >= hour * 60 + minute;
}

function ranked(day: Record<string, number> | undefined) {
  return Object.entries(day || {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function assessChainRevenueDay(days: RevenueDays, date: string, now: Date = new Date()): ChainRevenueAssessment {
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
  const badDate = !DATE_RE.test(date);
  const priorMissing = priorCounts.some((count) => count === 0);
  const coverageShort = chainCount < threshold || chainCount === 0;
  const missingCore = missingPriorTop.some((slug) => CORE_PRIOR_TOP_CHAINS.includes(slug));
  const waiveMissingTop =
    missingPriorTop.length > 0 &&
    !missingCore &&
    !badDate &&
    !priorMissing &&
    !coverageShort &&
    atOrAfterMissingTopCutoff(now);
  const problems: string[] = [];
  if (badDate) problems.push(`${date} is not a YYYY-MM-DD day`);
  if (priorMissing) {
    problems.push(`prior days ${priorDates.join(", ")} have counts ${priorCounts.join(", ")}`);
  }
  if (coverageShort) {
    problems.push(`${chainCount} chains reported; need ${threshold} (${Math.round(COVERAGE_RATIO * 100)}% of median ${priorMedian})`);
  }
  if (missingPriorTop.length && !waiveMissingTop) {
    problems.push(`missing ${priorDates[0]} top-10 chains ${missingPriorTop.join(", ")}`);
  }
  const ignoredMissingTop = waiveMissingTop ? missingPriorTop : [];
  if (ignoredMissingTop.length) {
    console.log(
      `Chain revenue ${date}: ignoring missing ${priorDates[0]} top-10 chains ${ignoredMissingTop.join(", ")} after ${CHAIN_REVENUE_MISSING_TOP_CUTOFF} ${CHAIN_REVENUE_CUTOFF_TIME_ZONE}.`,
    );
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
      ? ignoredMissingTop.length
        ? `Chain revenue ${date} is complete: ${chainCount} chains (need ${threshold}), ignoring missing ${priorDates[0]} top-10 chains ${ignoredMissingTop.join(", ")} after ${CHAIN_REVENUE_MISSING_TOP_CUTOFF} ${CHAIN_REVENUE_CUTOFF_TIME_ZONE}.`
        : `Chain revenue ${date} is complete: ${chainCount} chains (need ${threshold}), all ${priorTop.length} prior top-10 chains present.`
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

export function utcDaysInclusive(start: string, end: string) {
  if (!DATE_RE.test(start) || !DATE_RE.test(end) || start > end) return [];
  const dates: string[] = [];
  for (let day = start; day <= end; day = addUtcDays(day, 1)) dates.push(day);
  return dates;
}

/** Last completed Monday–Sunday UTC week. The week that contains today is not used. */
export function lastCompletedUtcWeek(now: Date = new Date()) {
  const yesterday = latestCompletedUtcDay(now);
  const sundayOffset = new Date(`${yesterday}T00:00:00Z`).getUTCDay();
  const end = addUtcDays(yesterday, -sundayOffset);
  return { start: addUtcDays(end, -6), end };
}

/** Last completed calendar month in UTC. The month that contains today is not used. */
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

/** Sum of each chain's dailyRevenue points from start through end, inclusive. */
export function sumChainRevenue(days: RevenueDays, start: string, end: string) {
  const totals: Record<string, number> = {};
  for (const date of utcDaysInclusive(start, end)) {
    for (const [slug, value] of Object.entries(days[date] || {})) {
      if (!Number.isFinite(value)) continue;
      totals[slug] = (totals[slug] || 0) + value;
    }
  }
  return totals;
}

export function topChainSlugs(totals: Record<string, number>, count = TOP_COUNT) {
  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([slug]) => slug);
}

/**
 * Rank versus the previous period's top 10.
 * Up and down carry the place count. A chain outside that top 10 is NEW.
 * The same rank returns null so the card draws no badge.
 */
export function chainRevenueRankChange(slug: string, rank: number, priorTop: string[]): ChainRevenueRankChange | null {
  const priorIndex = priorTop.indexOf(slug);
  if (priorIndex < 0) return { kind: "new" };
  const priorRank = priorIndex + 1;
  if (priorRank === rank) return null;
  if (rank < priorRank) return { kind: "up", places: priorRank - rank };
  return { kind: "down", places: rank - priorRank };
}

export type ChainRevenuePeriodAssessment = {
  start: string;
  end: string;
  complete: boolean;
  dates: string[];
  incompleteDates: string[];
  problems: string[];
  message: string;
};

/** The period is complete only when every UTC day passes the daily gate. */
export function assessChainRevenuePeriod(
  days: RevenueDays,
  start: string,
  end: string,
  now: Date = new Date(),
): ChainRevenuePeriodAssessment {
  const dates = utcDaysInclusive(start, end);
  const expected = dates.length;
  const assessments = dates.map((date) => assessChainRevenueDay(days, date, now));
  const incomplete = assessments.filter((item) => !item.complete);
  const problems = incomplete.slice(0, 3).map((item) => `${item.date}: ${item.problems.join("; ") || item.message}`);
  if (!expected) problems.unshift(`${start} through ${end} is not a day range`);
  const complete = expected > 0 && incomplete.length === 0;
  return {
    start,
    end,
    complete,
    dates,
    incompleteDates: incomplete.map((item) => item.date),
    problems,
    message: complete
      ? `Chain revenue ${start} through ${end} is complete: ${expected} days passed the daily gate.`
      : `Chain revenue ${start} through ${end} is not complete (${incomplete.length} of ${expected} days): ${problems.join(" | ")}.`,
  };
}

export function rankChainRevenuePeriod(
  days: RevenueDays,
  start: string,
  end: string,
  chains: RevenueChain[],
  priorTop: string[] = [],
  count = TOP_COUNT,
) {
  const named = chains.map((chain) => ({
    ...chain,
    name: chainPeriodDisplayName(chain.slug, chain.name),
  }));
  const ranked = rankChainRevenueDay({ period: sumChainRevenue(days, start, end) }, "period", named, count);
  return {
    ...ranked,
    date: end,
    start,
    end,
    priorTop,
    rows: ranked.rows.map((row) => ({
      ...row,
      rankChange: chainRevenueRankChange(row.slug, row.rank, priorTop),
    })),
  };
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
      name: sanitizeChainName(chain?.name || slug),
      logo: allowedChainLogoUrl(chainRevenueLogoUrl(slug, chain?.logoKey || slug)) || "",
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
