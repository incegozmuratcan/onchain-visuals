import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { importTs } from "./load-ts.mjs";

const cron = await importTs("../lib/x/btcEthEtfCron.ts");
const route = await readFile(new URL("../app/api/cron/x-btc-eth-etf-daily/route.ts", import.meta.url), "utf8");
const cronSource = await readFile(new URL("../lib/x/btcEthEtfCron.ts", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const workflow = await readFile(new URL("../.github/workflows/x-btc-eth-etf-daily.yml", import.meta.url), "utf8");

const env = {
  CRON_SECRET: "cron-secret-value",
  GITHUB_DISPATCH_TOKEN: "gh-token",
};

function fieldMatches(field, value, min, max) {
  if (field === "*") return true;
  return field.split(",").some((part) => {
    const [range, stepRaw] = part.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    let start = min;
    let end = max;
    if (range !== "*") {
      if (range.includes("-")) {
        const [from, to] = range.split("-").map(Number);
        start = from;
        end = to;
      } else {
        start = Number(range);
        end = start;
      }
    }
    if (value < start || value > end) return false;
    return (value - start) % step === 0;
  });
}

function expressionMatches(expression, date) {
  const [minute, hour, day, month, dow] = expression.split(/\s+/);
  return (
    fieldMatches(minute, date.getUTCMinutes(), 0, 59) &&
    fieldMatches(hour, date.getUTCHours(), 0, 23) &&
    fieldMatches(day, date.getUTCDate(), 1, 31) &&
    fieldMatches(month, date.getUTCMonth() + 1, 1, 12) &&
    fieldMatches(dow, date.getUTCDay(), 0, 6)
  );
}

function slotsOn(expressions, day) {
  const hits = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 1) {
      const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
      if (expressions.some((expression) => expressionMatches(expression, date))) {
        hits.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      }
    }
  }
  return hits;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildZip(files, method = 0) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const raw = Buffer.from(file.data);
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30 + name.length + data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    data.copy(local, 30 + name.length);
    locals.push(local);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralBlob = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBlob.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBlob, eocd]);
}

test("vercel cron covers 05:00–11:00 UTC every 30 minutes on Tuesday–Saturday", () => {
  assert.deepEqual(
    vercel.crons.map((entry) => entry.path),
    [cron.ETF_DAILY_CRON_PATH, cron.ETF_DAILY_CRON_PATH, cron.ETF_DAILY_CRON_PATH],
  );
  assert.deepEqual(
    vercel.crons.map((entry) => entry.schedule),
    [...cron.ETF_DAILY_POST_CRONS, cron.ETF_DAILY_CHECK_CRON],
  );
  const tuesday = new Date(Date.UTC(2026, 10, 3));
  assert.equal(tuesday.getUTCDay(), 2);
  assert.deepEqual(slotsOn(cron.ETF_DAILY_POST_CRONS, tuesday), [
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
  ]);
  assert.deepEqual(slotsOn([cron.ETF_DAILY_CHECK_CRON], tuesday), ["11:45"]);
  const sunday = new Date(Date.UTC(2026, 10, 1));
  assert.equal(sunday.getUTCDay(), 0);
  assert.deepEqual(slotsOn([...cron.ETF_DAILY_POST_CRONS, cron.ETF_DAILY_CHECK_CRON], sunday), []);
  assert.equal(Date.UTC(2026, 10, 3, 5, 0) + 3 * 60 * 60 * 1000, Date.UTC(2026, 10, 3, 8, 0));
  assert.equal(Date.UTC(2026, 10, 3, 11, 0) + 3 * 60 * 60 * 1000, Date.UTC(2026, 10, 3, 14, 0));
});

test("github workflow schedule is gone and manual dispatch still defaults to dry run", () => {
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.doesNotMatch(workflow, /^\s*- cron:/m);
  assert.match(workflow, /default: true/);
  assert.match(workflow, /inputs\.dry_run/);
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /x-vercel-cron-schedule/);
  assert.match(route, /cache-control": "no-store"/);
  assert.doesNotMatch(route, /X_DRY_RUN/);
  assert.doesNotMatch(cronSource, /X_DRY_RUN/);
});

test("cron secret is required and a wrong secret does not throw", () => {
  assert.equal(cron.cronAuthorized(null, undefined), false);
  assert.equal(cron.cronAuthorized("Bearer cron-secret-value", "cron-secret-value"), true);
  assert.equal(cron.cronAuthorized("Bearer other-secret-value", "cron-secret-value"), false);
  assert.equal(cron.cronAuthorized("Bearer short", "cron-secret-value"), false);
});

test("posting cron dispatches workflow_dispatch on main with dry_run false", async () => {
  const calls = [];
  const result = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: "*/30 5-10 * * 2-6",
    env,
    now: new Date("2026-11-03T05:00:00Z"),
    log: silentLog(),
    fetch: async (url, init) => {
      calls.push({ url: String(url), method: init?.method, body: init?.body ? JSON.parse(init.body) : null, authorization: init?.headers?.Authorization });
      if (String(url).includes("/runs?")) return jsonResponse(200, { workflow_runs: [] });
      if (String(url).includes("/dispatches")) return new Response(null, { status: 204 });
      throw new Error(`unexpected ${url}`);
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.dispatched, true);
  assert.equal(result.body.dryRun, false);
  assert.equal(result.body.ref, "main");
  const dispatch = calls.find((call) => call.url.includes("/dispatches"));
  assert.equal(dispatch.method, "POST");
  assert.equal(dispatch.authorization, "Bearer gh-token");
  assert.deepEqual(dispatch.body, { ref: "main", inputs: { dry_run: "false" } });
  assert.match(dispatch.url, /\/repos\/incegozmuratcan\/onchain-visuals\/actions\/workflows\/x-btc-eth-etf-daily\.yml\/dispatches$/);
});

test("an in-progress run skips another dispatch", async () => {
  const calls = [];
  const result = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: "0 11 * * 2-6",
    env,
    now: new Date("2026-11-03T11:00:00Z"),
    log: silentLog(),
    fetch: async (url, init) => {
      calls.push(String(url));
      assert.equal(init?.method, "GET");
      return jsonResponse(200, {
        workflow_runs: [
          { id: 41, status: "in_progress", html_url: "https://github.com/example/run/41", created_at: "2026-11-03T09:00:00Z" },
          { id: 42, status: "queued", html_url: "https://github.com/example/run/42", created_at: "2026-11-03T10:30:00Z" },
        ],
      });
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.dispatched, false);
  assert.equal(result.body.reason, "already_running");
  assert.equal(result.body.run.id, 42);
  assert.equal(calls.some((url) => url.includes("/dispatches")), false);

  const stale = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: null,
    env,
    now: new Date("2026-11-03T11:00:00Z"),
    log: silentLog(),
    fetch: async (url) => {
      if (String(url).includes("/runs?")) {
        return jsonResponse(200, {
          workflow_runs: [{ id: 8, status: "in_progress", created_at: "2026-11-03T09:00:00Z" }],
        });
      }
      if (String(url).includes("/dispatches")) return new Response(null, { status: 204 });
      throw new Error(`unexpected ${url}`);
    },
  });
  assert.equal(stale.body.dispatched, true);
});

test("missing token and a rejected GitHub token do not dispatch", async () => {
  const missing = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: null,
    env: { CRON_SECRET: env.CRON_SECRET },
    log: silentLog(),
    fetch: async () => {
      throw new Error("should not fetch");
    },
  });
  assert.equal(missing.status, 500);
  assert.equal(missing.body.error, "missing_github_dispatch_token");

  const unauthorized = await cron.runBtcEthEtfCron({
    authorization: "Bearer wrong",
    schedule: null,
    env,
    log: silentLog(),
    fetch: async () => {
      throw new Error("should not fetch");
    },
  });
  assert.equal(unauthorized.status, 401);

  let dispatched = false;
  const github = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: null,
    env,
    log: silentLog(),
    fetch: async (url) => {
      if (String(url).includes("/dispatches")) dispatched = true;
      return jsonResponse(401, { message: "Bad credentials" });
    },
  });
  assert.equal(github.status, 502);
  assert.equal(github.body.error, "github_unauthorized");
  assert.equal(dispatched, false);
});

test("end-of-window check logs when Farside stayed incomplete and does not dispatch", async () => {
  const logs = silentLog();
  const zip = buildZip([
    {
      name: "artifacts/x-btc-eth-etf-daily/result.json",
      data: JSON.stringify({
        dryRun: false,
        posted: false,
        reason: "incomplete",
        date: "2026-11-02",
        message: "Farside latest session is not ready to share.",
      }),
    },
    {
      name: "posted-state.json",
      data: JSON.stringify({ posts: [] }),
    },
  ], 8);
  const calls = [];
  const result = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: cron.ETF_DAILY_CHECK_CRON,
    env,
    now: new Date("2026-11-03T11:45:10Z"),
    log: logs,
    fetch: async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      if (String(url).includes("/runs?")) {
        return jsonResponse(200, {
          workflow_runs: [{ id: 7, status: "completed", conclusion: "success", created_at: "2026-11-03T11:00:02Z" }],
        });
      }
      if (String(url).includes("/actions/artifacts?")) {
        return jsonResponse(200, {
          artifacts: [
            { id: 99, name: "btc-eth-etf-daily", expired: false, created_at: "2026-11-02T11:20:00Z" },
            { id: 100, name: "btc-eth-etf-daily", expired: false, created_at: "2026-11-03T11:12:00Z" },
          ],
        });
      }
      if (String(url).endsWith("/artifacts/100/zip")) return new Response(zip, { status: 200 });
      throw new Error(`unexpected ${url}`);
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.dispatched, false);
  assert.equal(result.body.mode, "end_of_window_check");
  assert.equal(result.body.livePost, false);
  assert.equal(result.body.needsAttention, true);
  assert.equal(result.body.reason, "incomplete");
  assert.equal(result.body.date, "2026-11-02");
  assert.match(logs.errors[0], /No live X post by 14:45 Europe\/Istanbul/);
  assert.match(logs.errors[0], /incomplete|Farside/);
  assert.equal(calls.some((call) => call.url.includes("/dispatches")), false);
  assert.equal(calls.some((call) => call.url.endsWith("/artifacts/99/zip")), false);
});

test("end-of-window check treats a live post and a holiday as settled", async () => {
  const posted = await runCheck({
    result: { dryRun: false, posted: true, reason: null, date: "2026-11-02" },
    state: { posts: [{ date: "2026-11-02", mode: "live", postUrl: "https://x.com/OnchainVis/status/1" }] },
  });
  assert.equal(posted.body.livePost, true);
  assert.equal(posted.body.needsAttention, false);
  assert.equal(posted.logs.errors.length, 0);
  assert.equal(posted.body.postUrl, "https://x.com/OnchainVis/status/1");

  const holiday = await runCheck({
    result: { dryRun: false, posted: false, reason: "no_new_session", date: "2026-11-02", message: "No new Farside session after 2026-11-01." },
    state: { posts: [{ date: "2026-11-01", mode: "live" }] },
  });
  assert.equal(holiday.body.livePost, false);
  assert.equal(holiday.body.needsAttention, false);
  assert.equal(holiday.body.reason, "no_new_session");
  assert.equal(holiday.logs.errors.length, 0);
  assert.equal(holiday.logs.warnings.length, 1);

  const dryRunOnly = await runCheck({
    result: { dryRun: true, posted: false, reason: "already_posted", date: "2026-11-02", message: "ETF date was already shared." },
    state: { posts: [{ date: "2026-11-02", mode: "dry-run" }] },
  });
  assert.equal(dryRunOnly.body.livePost, false);
  assert.equal(dryRunOnly.body.needsAttention, true);
  assert.match(dryRunOnly.logs.errors[0], /No live X post/);
});

test("zip reader accepts stored and deflated state files", () => {
  const stored = buildZip([{ name: "result.json", data: JSON.stringify({ posted: true, dryRun: false, date: "2026-11-02" }) }], 0);
  const deflated = buildZip([{ name: "nested/posted-state.json", data: JSON.stringify({ posts: [{ date: "2026-11-02", mode: "live" }] }) }], 8);
  const resultEntries = cron.readZipEntries(stored);
  const stateEntries = cron.readZipEntries(deflated);
  assert.equal(JSON.parse(resultEntries.get("result.json").toString()).posted, true);
  assert.equal(JSON.parse(stateEntries.get("nested/posted-state.json").toString()).posts[0].mode, "live");
});

async function runCheck({ result, state }) {
  const logs = silentLog();
  const zip = buildZip([
    { name: "result.json", data: JSON.stringify(result) },
    { name: "posted-state.json", data: JSON.stringify(state) },
  ]);
  const response = await cron.runBtcEthEtfCron({
    authorization: "Bearer cron-secret-value",
    schedule: "45 11 * * 2-6",
    env,
    now: new Date("2026-11-03T11:45:00Z"),
    log: logs,
    fetch: async (url) => {
      if (String(url).includes("/runs?")) {
        return jsonResponse(200, {
          workflow_runs: [{ id: 1, status: "completed", conclusion: "success", created_at: "2026-11-03T08:00:00Z" }],
        });
      }
      if (String(url).includes("/actions/artifacts?")) {
        return jsonResponse(200, {
          artifacts: [{ id: 5, name: "btc-eth-etf-daily", expired: false, created_at: "2026-11-03T08:10:00Z" }],
        });
      }
      if (String(url).endsWith("/artifacts/5/zip")) return new Response(zip, { status: 200 });
      throw new Error(`unexpected ${url}`);
    },
  });
  return { ...response, logs };
}

function silentLog() {
  return {
    info() {},
    warn(message) { this.warnings.push(message); },
    error(message) { this.errors.push(message); },
    warnings: [],
    errors: [],
  };
}
