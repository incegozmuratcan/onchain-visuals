import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importTs } from "./load-ts.mjs";
import { writeNotFreshSkip } from "../scripts/x-not-fresh.mjs";

const failure = await importTs("../lib/x/publishFailure.ts");

function ledger() {
  const calls = [];
  return {
    calls,
    async release() {
      calls.push("release");
    },
    async markUncertain() {
      calls.push("uncertain");
    },
  };
}

test("a media upload failure releases the claim", async () => {
  const book = ledger();
  const settled = await failure.settleLivePostFailure(
    book,
    new failure.XPublishError("media", "X media upload failed with HTTP 500.", 500),
  );
  assert.deepEqual(book.calls, ["release"]);
  assert.equal(settled.status, 502);
  assert.equal(settled.code, "x_media_upload_failed");
});

test("a 4xx from tweet creation releases the claim", async () => {
  const book = ledger();
  const settled = await failure.settleLivePostFailure(
    book,
    new failure.XPublishError("tweet", "X post creation failed with HTTP 403.", 403),
  );
  assert.deepEqual(book.calls, ["release"]);
  assert.equal(settled.status, 502);
  assert.equal(settled.code, "x_post_failed");
});

test("a 5xx or network error from tweet creation keeps an uncertain claim", async () => {
  const timeout = ledger();
  const timedOut = await failure.settleLivePostFailure(
    timeout,
    new failure.XPublishError("tweet", "The operation was aborted."),
  );
  assert.deepEqual(timeout.calls, ["uncertain"]);
  assert.equal(timedOut.status, 409);
  assert.match(timedOut.message, /check X before retrying/i);

  const server = ledger();
  const fiveHundred = await failure.settleLivePostFailure(
    server,
    new failure.XPublishError("tweet", "X post creation failed with HTTP 503.", 503),
  );
  assert.deepEqual(server.calls, ["uncertain"]);
  assert.equal(fiveHundred.status, 409);

  const unknown = ledger();
  const plain = await failure.settleLivePostFailure(unknown, new Error("socket hang up"));
  assert.deepEqual(unknown.calls, ["uncertain"]);
  assert.equal(plain.status, 409);
});

test("publish routes settle the claim instead of always releasing it", async () => {
  const routes = [
    "../app/api/x/publish-btc-etf-daily/route.ts",
    "../app/api/x/publish-btc-eth-etf-daily/route.ts",
    "../app/api/x/publish-btc-eth-etf-weekly/route.ts",
    "../app/api/x/publish-btc-eth-etf-monthly/route.ts",
    "../app/api/x/publish-chain-revenue-daily/route.ts",
    "../app/api/x/publish-chain-revenue-weekly/route.ts",
    "../app/api/x/publish-chain-revenue-monthly/route.ts",
  ];
  for (const path of routes) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /settleLivePostFailure\(ledger, error\)/, path);
    assert.doesNotMatch(source, /catch \(error\) \{\s*await ledger\.release\(\)/, path);
    assert.match(source, /fetchX\("tweet"/, path);
    assert.match(source, /fetchX\("media"/, path);
  }
  const ledgerSource = await readFile(new URL("../lib/x/postLedger.ts", import.meta.url), "utf8");
  assert.match(ledgerSource, /uncertain = false/);
  assert.match(ledgerSource, /SET uncertain = true/);
});

test("not-fresh skip records the caller's dryRun", async () => {
  const dir = await mkdtemp(join(tmpdir(), "not-fresh-"));
  const live = await writeNotFreshSkip(dir, "not fresh / skipped (status stale, freshness stale).", { dryRun: false });
  assert.equal(live.dryRun, false);
  const text = JSON.parse(await readFile(join(dir, "result.json"), "utf8"));
  assert.equal(text.dryRun, false);
  await assert.rejects(() => writeNotFreshSkip(dir, "not fresh / skipped.", {}));
});
