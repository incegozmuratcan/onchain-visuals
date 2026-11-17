import { datasetRegistry } from "./registry";
import { buildChartSnapshot } from "./snapshots";
import { loadStoredChartSnapshot } from "./storage";
import { touchBounded } from "./boundedCache";
import { tryClaimPublicRefresh } from "./refreshLock";
import { freshnessTtlMs, planPublicRead, publicDatasetMayBuild, snapshotIsStale } from "./publicRefreshPlan";
import type { ChartSnapshot } from "./types";

const FALLBACK_TTL_MS = 300_000;
const FALLBACK_LIMIT = 50;
const fallbackCache = new Map<string, { at: number; snapshot: ChartSnapshot }>();

export class PublicDataUnavailableError extends Error {
  readonly slug: string;
  readonly updating: boolean;

  constructor(slug: string, updating = false) {
    super(updating ? "Stored chart data is unavailable. Updating." : "Stored chart data is unavailable.");
    this.name = "PublicDataUnavailableError";
    this.slug = slug;
    this.updating = updating;
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

function schedulePublicRebuild(slug: string, period: string) {
  const task = buildChartSnapshot(slug, period).catch((error) => {
    console.warn(
      `[public-refresh] ${slug} ${period} failed`,
      error instanceof Error ? error.message : error,
    );
  });
  void import("@vercel/functions")
    .then(({ waitUntil }) => waitUntil(task))
    .catch(() => undefined);
}

async function readStoredOrFallback(slug: string, period: string): Promise<ChartSnapshot | null> {
  const stored = await loadStoredChartSnapshot(slug, period);
  if (stored) return stored;
  const key = `${slug}\n${period}`;
  const hit = fallbackCache.get(key);
  if (hit && Date.now() - hit.at < FALLBACK_TTL_MS) {
    touchBounded(fallbackCache, key, hit, FALLBACK_LIMIT);
    return hit.snapshot;
  }
  const built = await buildChartSnapshot(slug, period, { persist: false });
  if (built) touchBounded(fallbackCache, key, { at: Date.now(), snapshot: built }, FALLBACK_LIMIT);
  return built;
}

/**
 * Public pages and APIs read the latest stored snapshot.
 * Off Vercel, a missing row builds once without writing and stays in a 50-entry cache.
 * On Vercel, a missing or stale row starts at most one rebuild per 15 minutes.
 */
export async function readPublicChartSnapshot(slug: string, period?: string): Promise<ChartSnapshot | null> {
  const normalized = normalizeChartPeriod(slug, period);
  if (!normalized) return null;
  if (!process.env.VERCEL) return readStoredOrFallback(slug, normalized);

  const dataset = datasetRegistry.find((item) => item.slug === slug);
  const stored = await loadStoredChartSnapshot(slug, normalized);
  const mayBuild = publicDatasetMayBuild(dataset?.status);
  const stale = !stored || snapshotIsStale(stored.freshness.lastUpdatedAt, Date.now(), freshnessTtlMs(dataset?.refreshPolicy));
  const lockAcquired = mayBuild && stale ? await tryClaimPublicRefresh(slug, normalized) : false;
  const plan = planPublicRead({ mayBuild, hasStored: Boolean(stored), stale, lockAcquired });
  if (plan.action === "unavailable") throw new PublicDataUnavailableError(slug, plan.updating);
  if (plan.action === "build") {
    const built = await buildChartSnapshot(slug, normalized);
    if (!built) throw new PublicDataUnavailableError(slug, false);
    return built;
  }
  if (plan.refresh) schedulePublicRebuild(slug, normalized);
  return stored;
}

export const PUBLIC_CDN_CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=600";
export const PUBLIC_CACHE_CONTROL = `public, ${PUBLIC_CDN_CACHE_CONTROL}`;

/** Next rewrites Cache-Control on force-dynamic routes. The CDN headers are what Vercel keeps. */
export function publicCacheHeaders() {
  return {
    "Cache-Control": PUBLIC_CACHE_CONTROL,
    "CDN-Cache-Control": PUBLIC_CDN_CACHE_CONTROL,
    "Vercel-CDN-Cache-Control": PUBLIC_CDN_CACHE_CONTROL,
  };
}
