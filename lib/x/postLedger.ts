import crypto from "crypto";
import { hasDatabaseConfig, query } from "@/lib/server/postgres";

/**
 * Durable duplicate guard for live X posts. One row per (dataset, data date).
 * Dry-runs must not call this. A missing DATABASE_URL falls back to the
 * in-memory map and posted-state.json without failing the post.
 */
const CLAIM_TTL = "15 minutes";

export type LivePostGuard = {
  outcome: "proceed" | "fallback" | "duplicate" | "in_progress" | "uncertain";
  postId: string | null;
  postUrl: string | null;
  record: (tweetId: string, postUrl: string) => Promise<void>;
  release: () => Promise<void>;
  /** Keep the claim and exclude it from the stale-claim reclaim. */
  markUncertain: () => Promise<void>;
};

let tableReady: Promise<void> | null = null;

function warn(message: string) {
  console.warn(`[x-post-ledger] ${message}`);
}

function noopGuard(outcome: LivePostGuard["outcome"], postId: string | null = null, postUrl: string | null = null): LivePostGuard {
  return {
    outcome,
    postId,
    postUrl,
    record: async () => {},
    release: async () => {},
    markUncertain: async () => {},
  };
}

async function ensureTable() {
  if (!tableReady) {
    tableReady = query(
      `CREATE TABLE IF NOT EXISTS x_published_posts (
        dataset_slug text NOT NULL,
        data_date date NOT NULL,
        tweet_id text,
        post_url text,
        claim_token text,
        claimed_at timestamptz,
        posted_at timestamptz,
        uncertain boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (dataset_slug, data_date)
      )`,
    ).then(() =>
      query(`ALTER TABLE x_published_posts ADD COLUMN IF NOT EXISTS uncertain boolean NOT NULL DEFAULT false`),
    )
      .then(() => undefined)
      .catch((error) => {
        tableReady = null;
        throw error;
      });
  }
  return tableReady;
}

export async function openLiveXPost(datasetSlug: string, dataDate: string): Promise<LivePostGuard> {
  if (!hasDatabaseConfig()) {
    warn(`DATABASE_URL is missing; falling back to in-memory and posted-state.json dedupe for ${datasetSlug} ${dataDate}.`);
    return noopGuard("fallback");
  }

  const token = crypto.randomBytes(16).toString("hex");
  try {
    await ensureTable();
    await query(
      `INSERT INTO x_published_posts (dataset_slug, data_date)
       VALUES ($1, $2::date)
       ON CONFLICT (dataset_slug, data_date) DO NOTHING`,
      [datasetSlug, dataDate],
    );
    const claimed = await query<{ tweet_id: string | null }>(
      `UPDATE x_published_posts
       SET claim_token = $3, claimed_at = now()
       WHERE dataset_slug = $1
         AND data_date = $2::date
         AND tweet_id IS NULL
         AND uncertain = false
         AND (claim_token IS NULL OR claimed_at IS NULL OR claimed_at < now() - interval '${CLAIM_TTL}')
       RETURNING tweet_id`,
      [datasetSlug, dataDate, token],
    );
    if (claimed.rows.length > 0) {
      return {
        outcome: "proceed",
        postId: null,
        postUrl: null,
        async record(tweetId: string, postUrl: string) {
          try {
            await query(
              `UPDATE x_published_posts
               SET tweet_id = $3, post_url = $4, posted_at = now(), claim_token = NULL
               WHERE dataset_slug = $1 AND data_date = $2::date AND claim_token = $5 AND tweet_id IS NULL`,
              [datasetSlug, dataDate, tweetId, postUrl, token],
            );
          } catch (error) {
            warn(
              `X post ${tweetId} succeeded but the ledger row for ${datasetSlug} ${dataDate} was not updated. ${error instanceof Error ? error.message : "unknown error"}`,
            );
          }
        },
        async release() {
          await query(
            `UPDATE x_published_posts
             SET claim_token = NULL, claimed_at = NULL
             WHERE dataset_slug = $1 AND data_date = $2::date AND claim_token = $3 AND tweet_id IS NULL AND uncertain = false`,
            [datasetSlug, dataDate, token],
          ).catch((error) => {
            warn(`Could not release claim for ${datasetSlug} ${dataDate}: ${error instanceof Error ? error.message : "unknown error"}`);
          });
        },
        async markUncertain() {
          await query(
            `UPDATE x_published_posts
             SET uncertain = true
             WHERE dataset_slug = $1 AND data_date = $2::date AND claim_token = $3 AND tweet_id IS NULL`,
            [datasetSlug, dataDate, token],
          ).catch((error) => {
            warn(`Could not mark ${datasetSlug} ${dataDate} uncertain: ${error instanceof Error ? error.message : "unknown error"}`);
          });
        },
      };
    }

    const existing = await query<{ tweet_id: string | null; post_url: string | null; uncertain: boolean }>(
      `SELECT tweet_id, post_url, uncertain FROM x_published_posts WHERE dataset_slug = $1 AND data_date = $2::date`,
      [datasetSlug, dataDate],
    );
    const row = existing.rows[0];
    if (row?.tweet_id) {
      return noopGuard("duplicate", row.tweet_id, row.post_url || `https://x.com/OnchainVis/status/${row.tweet_id}`);
    }
    if (row?.uncertain) return noopGuard("uncertain");
    return noopGuard("in_progress");
  } catch (error) {
    warn(
      `Postgres dedupe unavailable for ${datasetSlug} ${dataDate}; falling back to in-memory and posted-state.json. ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return noopGuard("fallback");
  }
}
