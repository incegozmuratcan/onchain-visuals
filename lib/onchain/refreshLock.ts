import { hasDatabaseConfig, query } from "@/lib/server/postgres";
import { REFRESH_LOCK_SQL } from "./publicRefreshPlan";

let tableReady: Promise<void> | null = null;

async function ensureRefreshLockTable() {
  if (!tableReady) {
    tableReady = query(
      `CREATE TABLE IF NOT EXISTS refresh_locks (
        dataset_slug text NOT NULL,
        period text NOT NULL,
        last_started_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (dataset_slug, period)
      )`,
    )
      .then(() => undefined)
      .catch((error) => {
        tableReady = null;
        throw error;
      });
  }
  return tableReady;
}

/** True only when this caller won the 15-minute slot. A database miss does not build. */
export async function tryClaimPublicRefresh(datasetSlug: string, period: string) {
  if (!hasDatabaseConfig()) return false;
  try {
    await ensureRefreshLockTable();
    const result = await query<{ dataset_slug: string }>(REFRESH_LOCK_SQL, [datasetSlug, period]);
    return result.rows.length > 0;
  } catch (error) {
    console.warn(
      `[public-refresh] lock unavailable for ${datasetSlug} ${period}`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
