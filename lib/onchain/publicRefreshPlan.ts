/** One public rebuild per dataset and period. */
export const PUBLIC_REFRESH_LOCK_MS = 15 * 60 * 1000;

export const REFRESH_LOCK_SQL = `INSERT INTO refresh_locks (dataset_slug, period, last_started_at)
VALUES ($1, $2, now())
ON CONFLICT (dataset_slug, period) DO UPDATE
  SET last_started_at = now()
WHERE refresh_locks.last_started_at < now() - interval '15 minutes'
RETURNING dataset_slug`;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Per-dataset cadence from refreshPolicy. Unspecified policies refresh hourly. */
export function freshnessTtlMs(refreshPolicy?: string | null) {
  const text = String(refreshPolicy || "").toLowerCase();
  const hours = text.match(/(\d+)\s*h\b/);
  if (hours) return Number(hours[1]) * HOUR_MS;
  if (/\bmonthly\b/.test(text)) return 30 * DAY_MS;
  if (/\bweekly\b/.test(text)) return 7 * DAY_MS;
  if (/\bdaily\b/.test(text)) return DAY_MS;
  if (/\bhourly\b/.test(text)) return HOUR_MS;
  return HOUR_MS;
}

export function snapshotIsStale(storedAt: string | null | undefined, now: number, ttlMs: number) {
  if (!storedAt) return true;
  const at = Date.parse(storedAt);
  if (!Number.isFinite(at)) return true;
  return now - at >= ttlMs;
}

export function publicDatasetMayBuild(status: string | undefined) {
  return status !== "disabled" && status !== "source_config_required";
}

export type PublicReadPlan =
  | { action: "serve"; refresh: boolean }
  | { action: "build" }
  | { action: "unavailable"; updating: boolean };

/**
 * Vercel public read. A fresh stored row is served. A missing or stale row
 * refreshes only when this request won the 15-minute lock: in the background
 * if a row exists, synchronously if it does not. Disabled datasets never build.
 */
export function planPublicRead(input: {
  mayBuild: boolean;
  hasStored: boolean;
  stale: boolean;
  lockAcquired: boolean;
}): PublicReadPlan {
  if (!input.mayBuild) {
    return input.hasStored ? { action: "serve", refresh: false } : { action: "unavailable", updating: false };
  }
  if (input.hasStored && !input.stale) return { action: "serve", refresh: false };
  if (!input.lockAcquired) {
    return input.hasStored ? { action: "serve", refresh: false } : { action: "unavailable", updating: true };
  }
  if (input.hasStored) return { action: "serve", refresh: true };
  return { action: "build" };
}
