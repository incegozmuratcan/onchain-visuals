import { buildChartSnapshot } from "./snapshots";
import { loadStoredChartSnapshot } from "./storage";
import type { ChartSnapshot } from "./types";

const FALLBACK_TTL_MS = 300_000;
const fallbackCache = new Map<string, { at: number; snapshot: ChartSnapshot }>();

/**
 * Public pages and APIs read the latest stored snapshot. They do not refresh
 * upstream sources and they do not write. A cold cache with nothing stored
 * builds once and keeps that result for five minutes.
 */
export async function readPublicChartSnapshot(slug: string, period?: string): Promise<ChartSnapshot | null> {
  const stored = await loadStoredChartSnapshot(slug, period);
  if (stored) return stored;
  const key = `${slug}\n${period || ""}`;
  const hit = fallbackCache.get(key);
  if (hit && Date.now() - hit.at < FALLBACK_TTL_MS) return hit.snapshot;
  const built = await buildChartSnapshot(slug, period, { persist: false });
  if (built) fallbackCache.set(key, { at: Date.now(), snapshot: built });
  return built;
}

export const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
