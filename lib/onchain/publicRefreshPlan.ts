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

const MAX_FRESHNESS_TTL_MS = 6 * HOUR_MS;

/** Per-dataset cadence from refreshPolicy, never longer than 6 hours. */
export function freshnessTtlMs(refreshPolicy?: string | null) {
  const text = String(refreshPolicy || "").toLowerCase();
  const hours = text.match(/(\d+)\s*h\b/);
  let parsed = HOUR_MS;
  if (hours) parsed = Number(hours[1]) * HOUR_MS;
  else if (/\bmonthly\b/.test(text)) parsed = 30 * DAY_MS;
  else if (/\bweekly\b/.test(text)) parsed = 7 * DAY_MS;
  else if (/\bdaily\b/.test(text)) parsed = DAY_MS;
  else if (/\bhourly\b/.test(text)) parsed = HOUR_MS;
  return Math.min(parsed, MAX_FRESHNESS_TTL_MS);
}

export function snapshotIsStale(storedAt: string | null | undefined, now: number, ttlMs: number) {
  if (!storedAt) return true;
  const at = Date.parse(storedAt);
  if (!Number.isFinite(at)) return true;
  return now - at >= ttlMs;
}

/** An active row follows the cadence. Anything else is due for another try. */
export function publicReadIsStale(
  stored: { status?: string; freshness?: { lastUpdatedAt?: string | null } } | null | undefined,
  now: number,
  ttlMs: number,
) {
  if (!stored || stored.status !== "active") return true;
  return snapshotIsStale(stored.freshness?.lastUpdatedAt, now, ttlMs);
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
