import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { notFreshMessage } from "../scripts/x-not-fresh.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const routes = [
  "../app/api/x/publish-btc-etf-daily/route.ts",
  "../app/api/x/publish-btc-eth-etf-daily/route.ts",
  "../app/api/x/publish-btc-eth-etf-weekly/route.ts",
  "../app/api/x/publish-btc-eth-etf-monthly/route.ts",
  "../app/api/x/publish-chain-revenue-daily/route.ts",
  "../app/api/x/publish-chain-revenue-weekly/route.ts",
  "../app/api/x/publish-chain-revenue-monthly/route.ts",
  "../lib/x/publishStablecoinSupply.ts",
];

const workflows = [
  "../.github/workflows/x-btc-etf-daily.yml",
  "../.github/workflows/x-btc-eth-etf-daily.yml",
  "../.github/workflows/x-btc-eth-etf-weekly.yml",
  "../.github/workflows/x-btc-eth-etf-monthly.yml",
  "../.github/workflows/x-chain-revenue-daily.yml",
  "../.github/workflows/x-chain-revenue-weekly.yml",
  "../.github/workflows/x-chain-revenue-monthly.yml",
  "../.github/workflows/x-chain-stablecoin-supply-weekly.yml",
  "../.github/workflows/x-chain-stablecoin-supply-monthly.yml",
];

test("publish routes stay off Vercel, reject fixtures, and require a fresh exact day", async () => {
  for (const path of routes) {
    const source = await read(path);
    assert.match(source, /process\.env\.VERCEL/, path);
    assert.match(source, /status: 404/, path);
    assert.match(source, /previewState/, path);
    assert.match(source, /freshness\?\.status !== "fresh"/, path);
    assert.match(source, /openLiveXPost/, path);
    assert.doesNotMatch(source, /body\?\.force/, path);
  }
  const btc = await read(routes[0]);
  assert.match(btc, /Preview fixtures cannot be published/);
  assert.match(btc, /latestDate !== date/);
  assert.doesNotMatch(btc, /buildBtcEtfJun8OutflowPreview/);
});

test("a snapshot that is not active and fresh is skipped without failing the run", () => {
  assert.equal(notFreshMessage({ status: "active", freshness: { status: "fresh" } }), null);
  const stale = notFreshMessage({ status: "stale", freshness: { status: "stale" } });
  assert.match(stale, /not fresh \/ skipped/);
  assert.match(stale, /status stale/);
  assert.match(notFreshMessage({ status: "active", freshness: { status: "source_error" } }), /not fresh \/ skipped/);
  assert.match(notFreshMessage(null), /not fresh \/ skipped/);
});

test("X workflows keep secrets on the capture step and do not inline dry-run inputs", async () => {
  for (const path of workflows) {
    const source = await read(path);
    assert.match(source, /INPUT_DRY_RUN: \$\{\{ inputs\.dry_run \}\}/, path);
    assert.match(source, /VAR_X_DRY_RUN: \$\{\{ vars\.X_DRY_RUN \}\}/, path);
    assert.match(source, /X_DRY_RUN=true/, path);
    assert.match(source, /X_CONSUMER_KEY: \$\{\{ secrets\.X_CONSUMER_KEY \}\}/, path);
    assert.match(source, /DATABASE_URL: \$\{\{ secrets\.DATABASE_URL \}\}/, path);
    assert.doesNotMatch(source, /X_CLIENT_ID: \$\{\{ secrets\.X_CLIENT_ID \}\}/, path);
    assert.doesNotMatch(source, /X_CLIENT_SECRET: \$\{\{ secrets\.X_CLIENT_SECRET \}\}/, path);
    assert.doesNotMatch(source, /X_USER_REFRESH_TOKEN: \$\{\{ secrets\.X_USER_REFRESH_TOKEN \}\}/, path);
    assert.doesNotMatch(source, /RAW="\$\{\{ inputs\.dry_run \}\}"/, path);
    assert.doesNotMatch(source, /RAW="\$\{\{ vars\.X_DRY_RUN \}\}"/, path);
    const captureAt = source.indexOf("Refresh, capture, and prepare the post");
    const secretAt = source.indexOf("X_CONSUMER_KEY: ${{ secrets.X_CONSUMER_KEY }}");
    assert.ok(captureAt !== -1 && secretAt > captureAt, path);
  }
  const schema = await read("../db/schema.sql");
  assert.match(schema, /create table if not exists x_published_posts/i);
  assert.match(schema, /primary key \(dataset_slug, data_date\)/i);
  for (const path of workflows.filter((file) => !file.endsWith("x-btc-etf-daily.yml"))) {
    const source = await read(path);
    assert.match(source, /^ {2}actions: read$/m, path);
    assert.doesNotMatch(source, /^ {2}actions: write$/m, path);
  }
});
