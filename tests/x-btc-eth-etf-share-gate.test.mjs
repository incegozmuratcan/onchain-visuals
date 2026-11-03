import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decideEtfShare, readPostState, recordShare } from "../scripts/x-btc-eth-etf-share-gate.mjs";

function fill(date, overrides = {}) {
  return {
    date,
    complete: true,
    missingTickers: [],
    totalReady: true,
    ...overrides,
  };
}

test("a filled BTC and ETH session on the same date can be shared", () => {
  const decision = decideEtfShare({
    btc: fill("2026-11-03"),
    eth: fill("2026-11-03"),
    dryRun: true,
    posts: [],
  });
  assert.equal(decision.proceed, true);
  assert.equal(decision.skipped, false);
  assert.equal(decision.date, "2026-11-03");
});

test("dashes and a different ETH session skip without treating the day as posted", () => {
  const dashed = decideEtfShare({
    btc: fill("2026-11-03", { complete: false, missingTickers: ["FBTC"] }),
    eth: fill("2026-11-03"),
    dryRun: false,
    posts: [{ date: "2026-11-02", mode: "live" }],
  });
  assert.equal(dashed.proceed, false);
  assert.equal(dashed.reason, "incomplete");
  assert.equal(dashed.noNewSession, false);
  assert.match(dashed.message, /FBTC/);

  const split = decideEtfShare({
    btc: fill("2026-11-03"),
    eth: fill("2026-11-02"),
    dryRun: true,
    posts: [],
  });
  assert.equal(split.reason, "incomplete");
  assert.match(split.message, /different sessions/);
});

test("a recorded live post and a holiday with no newer row skip later runs", () => {
  const posts = [{ date: "2026-11-02", mode: "live", at: "2026-11-03T05:40:00.000Z" }];
  for (const dryRun of [true, false]) {
    const again = decideEtfShare({
      btc: fill("2026-11-02"),
      eth: fill("2026-11-02"),
      dryRun,
      posts,
    });
    assert.equal(again.proceed, false);
    assert.equal(again.reason, "already_posted");
    assert.equal(again.noNewSession, true);
  }
  const older = decideEtfShare({
    btc: fill("2026-11-01"),
    eth: fill("2026-11-01"),
    dryRun: false,
    posts,
  });
  assert.equal(older.reason, "no_new_session");
  assert.equal(older.proceed, false);
});

test("a recorded dry-run blocks another dry-run and still allows the live post", () => {
  const posts = [{ date: "2026-11-03", mode: "dry-run" }];
  const dryRun = decideEtfShare({
    btc: fill("2026-11-03"),
    eth: fill("2026-11-03"),
    dryRun: true,
    posts,
  });
  assert.equal(dryRun.reason, "already_posted");
  const live = decideEtfShare({
    btc: fill("2026-11-03"),
    eth: fill("2026-11-03"),
    dryRun: false,
    posts,
  });
  assert.equal(live.proceed, true);
  assert.equal(live.date, "2026-11-03");
});

test("share state round-trips the ETF date and mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "etf-share-state-"));
  const file = join(dir, "posted-state.json");
  assert.deepEqual(await readPostState(file), []);
  await recordShare(file, {
    date: "2026-11-03",
    mode: "dry-run",
    at: "2026-11-03T05:40:00.000Z",
  });
  await recordShare(file, {
    date: "2026-11-03",
    mode: "dry-run",
    at: "2026-11-03T07:40:00.000Z",
  });
  await recordShare(file, {
    date: "2026-11-03",
    mode: "live",
    at: "2026-11-03T07:41:00.000Z",
    postId: "1",
    postUrl: "https://x.com/OnchainVis/status/1",
  });
  const posts = await readPostState(file);
  assert.equal(posts.length, 2);
  assert.equal(posts.find((post) => post.mode === "dry-run").at, "2026-11-03T07:40:00.000Z");
  assert.equal(posts.find((post) => post.mode === "live").postUrl, "https://x.com/OnchainVis/status/1");
});
