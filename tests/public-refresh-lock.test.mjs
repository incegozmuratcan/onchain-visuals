import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTs } from "./load-ts.mjs";

const plan = await importTs("../lib/onchain/publicRefreshPlan.ts");
const HOUR = 60 * 60 * 1000;

test("freshness TTL follows the dataset cadence and never exceeds six hours", () => {
  assert.equal(plan.freshnessTtlMs("6h snapshot"), 6 * HOUR);
  assert.equal(plan.freshnessTtlMs("12h snapshot"), 6 * HOUR);
  assert.equal(plan.freshnessTtlMs("daily refresh"), 6 * HOUR);
  assert.equal(plan.freshnessTtlMs("weekly refresh"), 6 * HOUR);
  assert.equal(plan.freshnessTtlMs("monthly refresh"), 6 * HOUR);
  assert.equal(plan.freshnessTtlMs("hourly snapshot"), HOUR);
  assert.equal(plan.freshnessTtlMs("external collector snapshot"), HOUR);
  assert.equal(plan.freshnessTtlMs(""), HOUR);
});

test("a snapshot is stale when it is missing or older than the TTL", () => {
  const now = Date.parse("2026-11-17T12:00:00.000Z");
  assert.equal(plan.snapshotIsStale(null, now, HOUR), true);
  assert.equal(plan.snapshotIsStale("not-a-date", now, HOUR), true);
  assert.equal(plan.snapshotIsStale("2026-11-17T11:30:00.000Z", now, HOUR), false);
  assert.equal(plan.snapshotIsStale("2026-11-17T10:00:00.000Z", now, HOUR), true);
});

test("only a real error for the requested period is stored", () => {
  const requested = "monthly";
  assert.equal(
    plan.shouldRememberPublicSnapshot(
      { status: "stale", period: "daily", freshness: { fallbackUsed: true } },
      requested,
    ),
    false,
  );
  assert.equal(
    plan.shouldRememberPublicSnapshot(
      { status: "source_error", period: "monthly", freshness: { fallbackUsed: false } },
      requested,
    ),
    true,
  );
});

test("a non-active public snapshot is always due for another locked try", () => {
  const now = Date.parse("2026-11-17T12:00:00.000Z");
  const recent = "2026-11-17T11:59:00.000Z";
  assert.equal(plan.publicReadIsStale(null, now, HOUR), true);
  assert.equal(plan.publicReadIsStale({ status: "active", freshness: { lastUpdatedAt: recent } }, now, HOUR), false);
  assert.equal(plan.publicReadIsStale({ status: "source_error", freshness: { lastUpdatedAt: recent } }, now, HOUR), true);
  assert.equal(plan.publicReadIsStale({ status: "stale", freshness: { lastUpdatedAt: recent } }, now, HOUR), true);
});

test("disabled and unconfigured datasets never build", () => {
  assert.equal(plan.publicDatasetMayBuild("active"), true);
  assert.equal(plan.publicDatasetMayBuild("disabled"), false);
  assert.equal(plan.publicDatasetMayBuild("source_config_required"), false);
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: false, hasStored: false, stale: true, lockAcquired: true }),
    { action: "unavailable", updating: false },
  );
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: false, hasStored: true, stale: true, lockAcquired: true }),
    { action: "serve", refresh: false },
  );
});

test("the lock allows one refresh and the loser does not build", () => {
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: true, hasStored: true, stale: false, lockAcquired: false }),
    { action: "serve", refresh: false },
  );
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: true, hasStored: true, stale: true, lockAcquired: true }),
    { action: "serve", refresh: true },
  );
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: true, hasStored: true, stale: true, lockAcquired: false }),
    { action: "serve", refresh: false },
  );
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: true, hasStored: false, stale: true, lockAcquired: true }),
    { action: "build" },
  );
  assert.deepEqual(
    plan.planPublicRead({ mayBuild: true, hasStored: false, stale: true, lockAcquired: false }),
    { action: "unavailable", updating: true },
  );
});

test("the refresh lock upsert only replaces a claim older than 15 minutes", async () => {
  assert.match(plan.REFRESH_LOCK_SQL, /ON CONFLICT \(dataset_slug, period\) DO UPDATE/);
  assert.match(plan.REFRESH_LOCK_SQL, /WHERE refresh_locks\.last_started_at < now\(\) - interval '15 minutes'/);
  assert.match(plan.REFRESH_LOCK_SQL, /RETURNING dataset_slug/);
  const source = await readFile(new URL("../lib/onchain/refreshLock.ts", import.meta.url), "utf8");
  assert.match(source, /CREATE TABLE IF NOT EXISTS refresh_locks/);
  assert.match(source, /REFRESH_LOCK_SQL/);
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  assert.match(schema, /create table if not exists refresh_locks/i);
  assert.match(schema, /primary key \(dataset_slug, period\)/);
  const reader = await readFile(new URL("../lib/onchain/publicSnapshot.ts", import.meta.url), "utf8");
  assert.match(reader, /import \{ waitUntil \} from "@vercel\/functions"/);
  assert.doesNotMatch(reader, /import\("@vercel\/functions"\)/);
  assert.match(reader, /shouldRememberPublicSnapshot\(built, normalized\)/);
  assert.match(reader, /rememberPublicSnapshot/);
  assert.match(reader, /publicReadIsStale/);
  assert.match(reader, /function publicSnapshotHeaders/);
  assert.match(reader, /no-store/);
  assert.match(reader, /loadStoredPublicSnapshot/);
  const storage = await readFile(new URL("../lib/onchain/storage.ts", import.meta.url), "utf8");
  assert.match(storage, /freshness_status not in \('source_error', 'disabled', 'source_config_required'\)/);
  const page = await readFile(new URL("../app/onchain/[slug]/page.tsx", import.meta.url), "utf8");
  const charts = await readFile(new URL("../app/api/charts/[datasetSlug]/route.ts", import.meta.url), "utf8");
  assert.match(page, /export const maxDuration = 60/);
  assert.match(charts, /export const maxDuration = 60/);
});
