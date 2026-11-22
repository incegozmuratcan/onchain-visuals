import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decideEtfShare, selectDailyEtfSession, readPostState, recordShare } from "../scripts/x-btc-eth-etf-share-gate.mjs";

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

function session(date, complete, missing = []) {
  return {
    date,
    complete,
    missingTickers: missing,
    totalReady: complete || missing.length > 0,
  };
}

const postedThursday = [{ date: "2026-11-19", mode: "live", at: "2026-11-20T05:40:00.000Z" }];

test("a late Friday session stays unposted until both assets are filled, then posts that Friday", () => {
  const late = selectDailyEtfSession({
    btcSessions: [session("2026-11-19", true), session("2026-11-20", false, ["IBIT"])],
    ethSessions: [session("2026-11-19", true), session("2026-11-20", false, ["ETHA", "ETHB", "FETH"])],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-22",
  });
  assert.equal(late.proceed, false);
  assert.equal(late.reason, "incomplete");
  assert.equal(late.noNewSession, false);
  assert.equal(late.date, "2026-11-20");
  assert.match(late.message, /IBIT/);
  assert.match(late.message, /ETHA/);

  const ready = selectDailyEtfSession({
    btcSessions: [session("2026-11-19", true), session("2026-11-20", true)],
    ethSessions: [session("2026-11-19", true), session("2026-11-20", true)],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-23",
  });
  assert.equal(ready.proceed, true);
  assert.equal(ready.date, "2026-11-20");
  assert.deepEqual(ready.skippedDates, []);
});

test("a newer ready session skips an older unready one, and nothing older than the latest post is shared", () => {
  const skipped = selectDailyEtfSession({
    btcSessions: [
      session("2026-11-19", true),
      session("2026-11-20", false, ["IBIT"]),
      session("2026-11-23", true),
    ],
    ethSessions: [
      session("2026-11-19", true),
      session("2026-11-20", false, ["ETHA", "ETHB", "FETH"]),
      session("2026-11-23", true),
    ],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-24",
  });
  assert.equal(skipped.proceed, true);
  assert.equal(skipped.date, "2026-11-23");
  assert.deepEqual(skipped.skippedDates, ["2026-11-20"]);

  const bothReady = selectDailyEtfSession({
    btcSessions: [session("2026-11-20", true), session("2026-11-23", true)],
    ethSessions: [session("2026-11-20", true), session("2026-11-23", true)],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-24",
  });
  assert.equal(bothReady.proceed, true);
  assert.equal(bothReady.date, "2026-11-20");

  const tooOld = selectDailyEtfSession({
    btcSessions: [session("2026-11-20", true), session("2026-11-23", true)],
    ethSessions: [session("2026-11-20", true), session("2026-11-23", true)],
    dryRun: false,
    posts: [{ date: "2026-11-23", mode: "live" }],
    today: "2026-11-24",
  });
  assert.equal(tooOld.proceed, false);
  assert.equal(tooOld.reason, "no_new_session");
  assert.equal(tooOld.date, "2026-11-23");
});

test("an unready session is retried, and a holiday is not the session", () => {
  const waiting = selectDailyEtfSession({
    btcSessions: [session("2026-11-20", false, ["IBIT"])],
    ethSessions: [session("2026-11-20", false, ["ETHA"])],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-22",
  });
  assert.equal(waiting.reason, "incomplete");
  assert.equal(waiting.date, "2026-11-20");

  const again = selectDailyEtfSession({
    btcSessions: [session("2026-11-20", false, ["IBIT"])],
    ethSessions: [session("2026-11-20", false, ["ETHA"])],
    dryRun: false,
    posts: postedThursday,
    today: "2026-11-23",
  });
  assert.equal(again.proceed, false);
  assert.equal(again.reason, "incomplete");

  const afterHoliday = selectDailyEtfSession({
    btcSessions: [session("2026-11-25", true), session("2026-11-26", true), session("2026-11-27", true)],
    ethSessions: [session("2026-11-25", true), session("2026-11-26", true), session("2026-11-27", true)],
    dryRun: false,
    posts: [{ date: "2026-11-25", mode: "live" }],
    today: "2026-11-28",
    isTradingDay: (date) => date !== "2026-11-26",
  });
  assert.equal(afterHoliday.proceed, true);
  assert.equal(afterHoliday.date, "2026-11-27");
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
