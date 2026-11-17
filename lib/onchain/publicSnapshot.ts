import { datasetRegistry } from "./registry";
import { buildChartSnapshot } from "./snapshots";
import { loadStoredChartSnapshot } from "./storage";
import { touchBounded } from "./boundedCache";
import type { ChartSnapshot } from "./types";

const FALLBACK_TTL_MS = 300_000;
const FALLBACK_LIMIT = 50;
const fallbackCache = new Map<string, { at: number; snapshot: ChartSnapshot }>();

export class PublicDataUnavailableError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super("Stored chart data is unavailable.");
    this.name = "PublicDataUnavailableError";
    this.slug = slug;
  }
}

/** Keep only periods the dataset publishes. Anything else uses its default. Unknown slugs return null. */
export function normalizeChartPeriod(slug: string, period?: string | null) {
  const dataset = datasetRegistry.find((item) => item.slug === slug);
  if (!dataset) return null;
  const requested = String(period || "").trim();
  if (requested && dataset.supportedPeriods.includes(requested)) return requested;
  return dataset.defaultPeriod;
}

/**
 * Public pages and APIs read the latest stored snapshot. They do not refresh
 * upstream sources and they do not write. Off Vercel, a cold cache with
 * nothing stored builds once and keeps that result for five minutes.
 * On Vercel a missing row is an error: a public request must not build.
 */
export async function readPublicChartSnapshot(slug: string, period?: string): Promise<ChartSnapshot | null> {
  const normalized = normalizeChartPeriod(slug, period);
  if (!normalized) return null;
  const stored = await loadStoredChartSnapshot(slug, normalized);
  if (stored) return stored;
  if (process.env.VERCEL) throw new PublicDataUnavailableError(slug);
  const key = `${slug}\n${normalized}`;
  const hit = fallbackCache.get(key);
  if (hit && Date.now() - hit.at < FALLBACK_TTL_MS) {
    touchBounded(fallbackCache, key, hit, FALLBACK_LIMIT);
    return hit.snapshot;
  }
  const built = await buildChartSnapshot(slug, normalized, { persist: false });
  if (built) touchBounded(fallbackCache, key, { at: Date.now(), snapshot: built }, FALLBACK_LIMIT);
  return built;
}

export const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
