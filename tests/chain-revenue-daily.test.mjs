import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { decideChainRevenueShare } from "../scripts/x-chain-revenue-daily-gate.mjs";

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "chain-revenue-"));
  const file = join(dir, "module.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const cr = await loadTs("../lib/onchain/chainRevenueDaily.ts");
const caption = await loadTs("../lib/onchain/chainRevenueCaption.ts");

const TOP = ["tron", "ethereum", "base", "hyperliquid-l1", "polygon", "bsc", "solana", "robinhood-chain", "arbitrum", "avalanche"];

/** A day with the ten big chains plus `small` tiny chains. */
function day({ small = 90, drop = [] } = {}) {
  const out = {};
  TOP.forEach((slug, index) => {
    if (!drop.includes(slug)) out[slug] = 600_000 / (index + 1);
  });
  for (let i = 0; i < small; i += 1) out[`small-${i}`] = 10 + i;
  return out;
}

function history(target) {
  return {
    "2026-11-12": day({ small: 89 }),
    "2026-11-13": day({ small: 88 }),
    "2026-11-14": day({ small: 92 }),
    "2026-11-15": day({ small: 90 }),
    "2026-11-16": target,
  };
}

/** 19:59 and 20:00 Europe/Istanbul on the run day. */
const beforeCutoff = new Date("2026-11-17T19:59:00+03:00");
const afterCutoff = new Date("2026-11-17T20:00:00+03:00");

/** Prior day has quai in the top 10; the target day does not report it. */
function daysMissingQuai() {
  const days = history(day({ small: 100 }));
  days["2026-11-15"].quai = 9_000_000;
  return days;
}

function shareFor(days, now) {
  const assessment = cr.assessChainRevenueDay(days, "2026-11-16", now);
  return {
    assessment,
    decision: decideChainRevenueShare({
      assessment,
      expectedDate: "2026-11-16",
      dryRun: false,
      posts: [],
    }),
  };
}

test("the share day is the latest completed UTC day", () => {
  assert.equal(cr.latestCompletedUtcDay(new Date("2026-11-17T13:00:00Z")), "2026-11-16");
  assert.equal(cr.latestCompletedUtcDay(new Date("2026-11-17T00:00:01Z")), "2026-11-16");
  assert.equal(cr.latestCompletedUtcDay(new Date("2026-11-16T23:59:59Z")), "2026-11-15");
  assert.equal(cr.addUtcDays("2026-03-01", -1), "2026-02-28");
});

test("the gate needs 95% of the prior three-day median chain count", () => {
  // prior counts 98, 102, 100 -> median 100 -> threshold 95
  const full = cr.assessChainRevenueDay(history(day({ small: 85 })), "2026-11-16");
  assert.equal(full.threshold, 95);
  assert.deepEqual(full.priorCounts, [100, 102, 98]);
  assert.equal(full.chainCount, 95);
  assert.equal(full.complete, true, full.message);

  const short = cr.assessChainRevenueDay(history(day({ small: 84 })), "2026-11-16");
  assert.equal(short.chainCount, 94);
  assert.equal(short.complete, false);
  assert.match(short.message, /94 chains reported; need 95/);
});

test("the gate needs every chain from the previous day's top 10", () => {
  const missing = cr.assessChainRevenueDay(history(day({ small: 100, drop: ["robinhood-chain"] })), "2026-11-16", beforeCutoff);
  assert.ok(missing.chainCount >= missing.threshold);
  assert.equal(missing.complete, false);
  assert.deepEqual(missing.missingPriorTop, ["robinhood-chain"]);
  assert.match(missing.message, /missing 2026-11-15 top-10 chains robinhood-chain/);

  const zero = day({ small: 100 });
  zero.tron = 0; // a point of 0 is not revenue for a top chain
  assert.deepEqual(cr.assessChainRevenueDay(history(zero), "2026-11-16", beforeCutoff).missingPriorTop, ["tron"]);
});

test("before the Istanbul cutoff a missing small previous top-10 chain still skips", () => {
  assert.equal(cr.CHAIN_REVENUE_MISSING_TOP_CUTOFF, "20:00");
  const { assessment, decision } = shareFor(daysMissingQuai(), beforeCutoff);
  assert.deepEqual(assessment.missingPriorTop, ["quai"]);
  assert.equal(assessment.complete, false);
  assert.equal(decision.proceed, false);
  assert.equal(decision.skipped, true);
  assert.equal(decision.reason, "incomplete");
  assert.match(decision.message, /missing 2026-11-15 top-10 chains quai/);
});

test("after the Istanbul cutoff a missing small previous top-10 chain proceeds and logs it", () => {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.map(String).join(" "));
  try {
    const { assessment, decision } = shareFor(daysMissingQuai(), afterCutoff);
    assert.deepEqual(assessment.missingPriorTop, ["quai"]);
    assert.equal(assessment.complete, true);
    assert.equal(decision.proceed, true);
    assert.equal(decision.skipped, false);
    assert.equal(decision.reason, null);
    assert.match(decision.message, /ignoring missing 2026-11-15 top-10 chains quai after 20:00 Europe\/Istanbul/);
    assert.match(lines.join("\n"), /ignoring missing 2026-11-15 top-10 chains quai after 20:00 Europe\/Istanbul/);
  } finally {
    console.log = original;
  }
});

test("after the Istanbul cutoff a missing core chain still skips", () => {
  for (const slug of ["tron", "ethereum", "solana"]) {
    const { assessment, decision } = shareFor(history(day({ small: 100, drop: [slug] })), afterCutoff);
    assert.deepEqual(assessment.missingPriorTop, [slug]);
    assert.equal(assessment.complete, false);
    assert.equal(decision.proceed, false);
    assert.equal(decision.reason, "incomplete");
    assert.match(decision.message, new RegExp(`missing 2026-11-15 top-10 chains ${slug}`));
  }
});

test("a morning-after partial day is incomplete and the card falls back to the newest complete day", () => {
  const partial = {};
  for (let i = 0; i < 41; i += 1) partial[`small-${i}`] = 5;
  const days = history(partial);
  assert.equal(cr.assessChainRevenueDay(days, "2026-11-16").complete, false);
  assert.equal(cr.latestCompleteChainRevenueDay(days, "2026-11-16")?.date, "2026-11-15");
  assert.equal(cr.assessChainRevenueDay({}, "2026-11-16").complete, false);
});

test("only whole-UTC-day points from totalDataChart are read", () => {
  const midnight = Date.UTC(2026, 10, 15) / 1000;
  const points = cr.summaryDailyPoints({
    total24h: 999_999_999,
    totalDataChart: [
      [midnight, 1234],
      [midnight + 3600, 77], // not a calendar-day bucket
      [midnight + 86400, 50],
    ],
  });
  assert.deepEqual(points, { "2026-11-15": 1234, "2026-11-16": 50 });
  const days = cr.buildRevenueDays(
    [
      { slug: "tron", summary: { totalDataChart: [[midnight, 590_000]] } },
      { slug: "base", summary: { totalDataChart: [[midnight - 86400 * 20, 9]] } },
    ],
    "2026-11-10",
  );
  assert.deepEqual(days, { "2026-11-15": { tron: 590_000 } });
});

test("the overview keeps chains only and derives the DefiLlama icon name", () => {
  const chains = cr.listRevenueChains({
    protocols: [
      { protocolType: "chain", category: "Chain", slug: "op-mainnet", name: "OP Mainnet", logo: "https://icons.llamao.fi/icons/chains/rsz_op mainnet.jpg" },
      { protocolType: "chain", category: "Chain", slug: "bsc", name: "BSC", logo: "https://icons.llamao.fi/chains/rsz_binance.jpg" },
      { protocolType: "protocol", category: "Dexs", slug: "uniswap", name: "Uniswap" },
      { protocolType: "chain", category: "Rollup", slug: "fake", name: "Fake" },
    ],
  });
  assert.deepEqual(chains.map((c) => c.slug), ["op-mainnet", "bsc"]);
  assert.equal(chains[0].logoKey, "op mainnet");
  assert.equal(chains[1].name, "BNB Chain");
  assert.equal(cr.defillamaChainLogoUrl("op mainnet"), "https://icons.llamao.fi/icons/chains/rsz_op%20mainnet?w=96");
  assert.equal(cr.chainRevenueLogoUrl("tron", "tron"), "/logos/chain-revenue/tron.png");
  assert.equal(cr.chainRevenueLogoUrl("zksync-era", "zksync era"), "https://icons.llamao.fi/icons/chains/rsz_zksync%20era?w=96");
  for (const slug of TOP) assert.ok(cr.CURATED_CHAIN_LOGOS[slug], slug);
});

test("amounts, share, and the square-root bar scale match the v17 card", () => {
  assert.equal(cr.formatChainRevenueAmount(1_052_345), "$1.05M");
  assert.equal(cr.formatChainRevenueAmount(999_960), "$1.00M");
  assert.equal(cr.formatChainRevenueAmount(593_210), "$593.2K");
  assert.equal(cr.formatChainRevenueAmount(1_400), "$1.4K");
  assert.equal(cr.formatChainRevenueAmount(950.4), "$950");
  assert.equal(cr.formatChainRevenueAmount(2_340_000_000), "$2.34B");
  assert.equal(cr.formatChainRevenueShare(0.5634), "56.3%");
  assert.equal(cr.chainRevenueBarPercent(100, 100), 100);
  assert.equal(cr.chainRevenueBarPercent(25, 100), 50);
  assert.equal(cr.chainRevenueBarPercent(0, 100), 0);
});

test("ranking returns the top 10 with names, logos, shares, and the full-day total", () => {
  const days = history(day({ small: 90 }));
  const chains = TOP.map((slug) => ({ slug, name: cr.chainDisplayName(slug, slug), logoKey: slug }));
  const ranked = cr.rankChainRevenueDay(days, "2026-11-16", chains);
  assert.equal(ranked.rows.length, 10);
  assert.equal(ranked.chainCount, 100);
  assert.deepEqual(ranked.rows.map((r) => r.slug), TOP);
  assert.equal(ranked.rows[0].barPercent, 100);
  assert.equal(ranked.rows[5].name, "BNB Chain");
  const sum = Object.values(days["2026-11-16"]).reduce((a, b) => a + b, 0);
  assert.equal(ranked.total, sum);
  assert.ok(Math.abs(ranked.rows[0].share - 600_000 / sum) < 1e-12);
});

test("the caption is the exact plain question", () => {
  assert.equal(caption.CHAIN_REVENUE_DAILY_CAPTION, "How much revenue did blockchains generate yesterday?");
  const text = caption.buildChainRevenueDailyCaption({ metadata: { latestCompletedDate: "2026-11-16" } });
  assert.equal(text, "How much revenue did blockchains generate yesterday?");
  assert.doesNotMatch(text, /[#$]/);
  assert.throws(() => caption.buildChainRevenueDailyCaption({ metadata: {} }));
});

test("share gate: incomplete, already posted, dry-run vs live", () => {
  const complete = { date: "2026-11-16", complete: true, chainCount: 99, threshold: 96, message: "ok" };
  const base = { assessment: complete, expectedDate: "2026-11-16" };
  assert.equal(decideChainRevenueShare({ ...base, dryRun: false, posts: [] }).proceed, true);

  const wrongDay = decideChainRevenueShare({ ...base, assessment: { ...complete, date: "2026-11-15" }, dryRun: false, posts: [] });
  assert.equal(wrongDay.reason, "incomplete");

  const partial = decideChainRevenueShare({ ...base, assessment: { ...complete, complete: false }, dryRun: false, posts: [] });
  assert.equal(partial.proceed, false);
  assert.equal(partial.reason, "incomplete");

  const live = [{ date: "2026-11-16", mode: "live" }];
  assert.equal(decideChainRevenueShare({ ...base, dryRun: false, posts: live }).reason, "already_posted");
  assert.equal(decideChainRevenueShare({ ...base, dryRun: true, posts: live }).reason, "already_posted");

  const dry = [{ date: "2026-11-16", mode: "dry-run" }];
  assert.equal(decideChainRevenueShare({ ...base, dryRun: true, posts: dry }).reason, "already_posted");
  assert.equal(decideChainRevenueShare({ ...base, dryRun: false, posts: dry }).proceed, true);

  const newer = [{ date: "2026-11-17", mode: "live" }];
  assert.equal(decideChainRevenueShare({ ...base, dryRun: false, posts: newer }).reason, "no_new_session");
});

test("dataset, card, route, script, and workflow are wired like the ETF jobs", async () => {
  const [registry, card, frame, route, script, workflow, pkg, snapshots, docs] = await Promise.all([
    read("../lib/onchain/registry.ts"),
    read("../components/share/ChainRevenueDailyCard.tsx"),
    read("../components/share/ShareCardFrame.tsx"),
    read("../app/api/x/publish-chain-revenue-daily/route.ts"),
    read("../scripts/x-chain-revenue-daily.mjs"),
    read("../.github/workflows/x-chain-revenue-daily.yml"),
    read("../package.json"),
    read("../lib/onchain/snapshots.ts"),
    read("../docs/x-automation.md"),
  ]);
  assert.match(registry, /slug:\s*['"]chain-revenue-daily['"]/);
  assert.match(snapshots, /case "chain-revenue-daily"/);
  assert.doesNotMatch(snapshots.slice(snapshots.indexOf("function buildChainRevenueDailyCard")), /^.*total24h.*$/m);
  assert.match(card, /ShareCardFrame/);
  assert.match(card, /titleBadge="24H"/);
  assert.match(card, /data-chain-logo-fallback/);
  assert.match(card, /data-name-fit/);
  assert.match(frame, /titleBadge\?: string/);
  assert.match(route, /chain-revenue-daily/);
  assert.match(route, /buildChainRevenueDailyCaption/);
  assert.match(route, /coverage\?\.complete/);
  assert.match(route, /oauth1AuthorizationHeader/);
  assert.match(route, /Preview fixtures cannot be published/);
  assert.match(script, /X_DRY_RUN \?\? "true"/);
  assert.match(script, /process\.argv\.includes\("--preflight"\)/);
  assert.match(script, /decideChainRevenueShare/);
  assert.match(script, /recordShare/);
  assert.match(script, /1536/);
  assert.match(script, /1134/);
  assert.match(script, /\/api\/x\/publish-chain-revenue-daily/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /default: true/);
  assert.match(workflow, /inputs\.dry_run/);
  assert.match(workflow, /vars\.X_DRY_RUN/);
  assert.match(workflow, /\*\/30 16-23 \* \* \*/);
  assert.match(workflow, /x-chain-revenue-daily\.yml\/dispatches/);
  assert.match(workflow, /concurrency:\n  group: x-chain-revenue-daily/);
  assert.match(workflow, /name: chain-revenue-daily/);
  assert.ok(workflow.indexOf("id: gate") < workflow.indexOf("npm run build"));
  assert.match(workflow, /X_CONSUMER_KEY: \$\{\{ secrets\.X_CONSUMER_KEY \}\}/);
  assert.match(pkg, /"x:chain-revenue-daily": "node scripts\/x-chain-revenue-daily\.mjs"/);
  assert.match(docs, /How much revenue did blockchains generate yesterday\?/);
});

test("chain names and logos used on the card are constrained", () => {
  assert.equal(cr.sanitizeChainName("Robinhood Chain"), "Robinhood Chain");
  assert.equal(cr.sanitizeChainName("Hyperliquid L1"), "Hyperliquid L1");
  assert.equal(cr.sanitizeChainName("Gravity by Galxe"), "Gravity by Galxe");
  assert.equal(cr.sanitizeChainName("Tron\u0000\n<script>"), "Tronscript");
  assert.equal(cr.sanitizeChainName("A".repeat(80)).length, 32);
  assert.equal(cr.sanitizeChainName("   "), "Chain");
  assert.equal(cr.chainDisplayName("bsc", "BSC"), "BNB Chain");
  assert.equal(
    cr.allowedChainLogoUrl("https://icons.llamao.fi/icons/chains/rsz_tron?w=96"),
    "https://icons.llamao.fi/icons/chains/rsz_tron?w=96",
  );
  assert.equal(cr.allowedChainLogoUrl("/logos/chain-revenue/tron.png"), "/logos/chain-revenue/tron.png");
  assert.equal(cr.allowedChainLogoUrl("https://evil.example/tron.png"), null);
  assert.equal(cr.allowedChainLogoUrl("http://icons.llamao.fi/icons/chains/rsz_tron"), null);
  assert.equal(cr.allowedChainLogoUrl("//icons.llamao.fi/icons/chains/rsz_tron"), null);
});
