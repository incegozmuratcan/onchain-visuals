import "server-only";
import { headers } from "next/headers";
import { hasDatabaseConfig, query } from "@/lib/server/postgres";

const WINDOW_MS = 15 * 60 * 1000;
const FREE_TRIES = 5;
const MAX_DELAY_MS = 60_000;

type Bucket = { failures: number; windowStarted: number; blockedUntil: number };

const memory = new Map<string, Bucket>();
let tableReady: Promise<void> | null = null;

function delayFor(failures: number) {
  if (failures < FREE_TRIES) return 0;
  return Math.min(MAX_DELAY_MS, 1000 * 2 ** Math.min(6, failures - FREE_TRIES + 1));
}

function emptyBucket(now: number): Bucket {
  return { failures: 0, windowStarted: now, blockedUntil: 0 };
}

function clientIp() {
  const forwarded = headers().get("x-forwarded-for") || headers().get("x-real-ip") || "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

async function ensureTable() {
  if (!hasDatabaseConfig()) return;
  if (!tableReady) {
    tableReady = query(
      `CREATE TABLE IF NOT EXISTS admin_login_attempts (
        bucket text PRIMARY KEY,
        failures integer NOT NULL DEFAULT 0,
        window_started_at timestamptz NOT NULL DEFAULT now(),
        blocked_until timestamptz
      )`,
    )
      .then(() => undefined)
      .catch((error) => {
        tableReady = null;
        throw error;
      });
  }
  await tableReady;
}

function readMemory(bucket: string, now: number) {
  const state = memory.get(bucket);
  if (!state || now - state.windowStarted > WINDOW_MS) return emptyBucket(now);
  return state;
}

async function readDb(bucket: string, now: number): Promise<Bucket | null> {
  if (!hasDatabaseConfig()) return null;
  try {
    await ensureTable();
    const result = await query<{ failures: number; window_started_at: string | Date; blocked_until: string | Date | null }>(
      `SELECT failures, window_started_at, blocked_until FROM admin_login_attempts WHERE bucket = $1`,
      [bucket],
    );
    const row = result.rows[0];
    if (!row) return emptyBucket(now);
    const windowStarted = new Date(row.window_started_at).getTime();
    const blockedUntil = row.blocked_until ? new Date(row.blocked_until).getTime() : 0;
    if (now - windowStarted > WINDOW_MS) return emptyBucket(now);
    return { failures: Number(row.failures) || 0, windowStarted, blockedUntil };
  } catch (error) {
    console.warn("Admin login throttle could not read Postgres; using memory", error instanceof Error ? error.message : error);
    return null;
  }
}

async function writeDb(bucket: string, state: Bucket) {
  if (!hasDatabaseConfig()) return;
  try {
    await ensureTable();
    await query(
      `INSERT INTO admin_login_attempts (bucket, failures, window_started_at, blocked_until)
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz)
       ON CONFLICT (bucket) DO UPDATE SET failures = EXCLUDED.failures, window_started_at = EXCLUDED.window_started_at, blocked_until = EXCLUDED.blocked_until`,
      [
        bucket,
        state.failures,
        new Date(state.windowStarted).toISOString(),
        state.blockedUntil > 0 ? new Date(state.blockedUntil).toISOString() : null,
      ],
    );
  } catch (error) {
    console.warn("Admin login throttle could not write Postgres; memory still applies", error instanceof Error ? error.message : error);
  }
}

function blocked(state: Bucket, now: number) {
  return state.blockedUntil > now;
}

export async function assertLoginAllowed() {
  const now = Date.now();
  const bucket = clientIp();
  const local = readMemory(bucket, now);
  const remote = await readDb(bucket, now);
  if (blocked(local, now) || (remote && blocked(remote, now))) {
    throw new Error("Too many login attempts. Try again in a minute.");
  }
}

export async function recordLoginFailure() {
  const now = Date.now();
  const bucket = clientIp();
  const current = readMemory(bucket, now);
  const next: Bucket = {
    failures: current.failures + 1,
    windowStarted: current.failures === 0 ? now : current.windowStarted,
    blockedUntil: now + delayFor(current.failures + 1),
  };
  memory.set(bucket, next);
  await writeDb(bucket, next);
}

export async function recordLoginSuccess() {
  const ip = clientIp();
  memory.delete(ip);
  if (!hasDatabaseConfig()) return;
  try {
    await ensureTable();
    await query(`DELETE FROM admin_login_attempts WHERE bucket = $1`, [ip]);
  } catch (error) {
    console.warn("Admin login throttle could not clear Postgres", error instanceof Error ? error.message : error);
  }
}
