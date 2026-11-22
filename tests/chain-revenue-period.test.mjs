import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { decideChainRevenuePeriodShare } from "../scripts/x-chain-revenue-period-gate.mjs";

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "chain-revenue-period-"));
  const file = join(dir, "module.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const cr = await loadTs("../lib/onchain/chainRevenueDaily.ts");
const caption = await loadTs("../lib/onchain/chainRevenueCaption.ts");

const TOP = ["tron", "ethereum", "base", "hyperliquid-l1", "polygon", "bsc", "solana", "robinhood-chain", "arbitrum", "avalanche"];

function day(scale = 1, { drop = [], extra = {} } = {}) {
  const out = {};
  TOP.forEach((slug, index) => {
    if (!drop.includes(slug)) out[slug] = (600_000 / (index + 1)) * scale;
  });
  for (let i = 0; i < 90; i += 1) out[`small-${i}`] = 10 + i;
  Object.assign(out, extra);
  return out;
}

function fill(start, end, make) {
  const days = {};
  for (const date of cr.utcDaysInclusive(start, end)) days[date] = make(date);
  return days;
}

test("the last completed UTC week is the Monday–Sunday before today", () => {
  assert.deepEqual(cr.lastCompletedUtcWeek(new Date("2026-11-22T20:34:00Z")), {
    start: "2026-11-09",
    end: "2026-11-15",
  });
  assert.deepEqual(cr.lastCompletedUtcWeek(new Date("2026-11-23T13:00:00Z")), {
    start: "2026-11-16",
    end: "2026-11-22",
  });
  assert.deepEqual(cr.previousUtcWeek("2026-11-09"), { start: "2026-11-02", end: "2026-11-08" });
});

test("the last completed UTC month is the previous calendar month", () => {
  assert.deepEqual(cr.lastCompletedUtcMonth(new Date("2026-11-22T20:34:00Z")), {
    start: "2026-10-01",
    end: "2026-10-31",
  });
  assert.deepEqual(cr.lastCompletedUtcMonth(new Date("2026-12-01T13:00:00Z")), {
    start: "2026-11-01",
    end: "2026-11-30",
  });
  assert.deepEqual(cr.lastCompletedUtcMonth(new Date("2028-03-01T00:30:00Z")), {
    start: "2028-02-01",
    end: "2028-02-29",
  });
  assert.deepEqual(cr.previousUtcMonth("2026-10-01"), { start: "2026-09-01", end: "2026-09-30" });
});

test("a period is complete only when every day passes the daily gate", () => {
  const days = fill("2026-11-06", "2026-11-15", () => day());
  const ready = cr.assessChainRevenuePeriod(days, "2026-11-09", "2026-11-15", new Date("2026-11-22T13:00:00Z"));
  assert.equal(ready.complete, true, ready.message);
  assert.equal(ready.dates.length, 7);

  const broken = fill("2026-11-06", "2026-11-15", (date) =>
    date === "2026-11-12" ? day(1, { drop: ["tron"] }) : day(),
  );
  const blocked = cr.assessChainRevenuePeriod(broken, "2026-11-09", "2026-11-15", new Date("2026-11-16T10:00:00Z"));
  assert.equal(blocked.complete, false);
  assert.deepEqual(blocked.incompleteDates, ["2026-11-12"]);
});

test("period totals sum dailyRevenue and rank changes use the previous top 10", () => {
  const prior = fill("2026-11-02", "2026-11-08", () => day());
  const current = fill("2026-11-09", "2026-11-15", () =>
    day(1, { extra: { solana: 9_000_000, "new-chain": 2_000_000 }, drop: ["avalanche"] }),
  );
  const days = { ...prior, ...current };
  const priorTop = cr.topChainSlugs(cr.sumChainRevenue(days, "2026-11-02", "2026-11-08"));
  assert.equal(priorTop[0], "tron");
  assert.equal(priorTop[6], "solana");
  assert.equal(priorTop.includes("avalanche"), true);

  const one = cr.sumChainRevenue(days, "2026-11-09", "2026-11-09").tron;
  const week = cr.sumChainRevenue(days, "2026-11-09", "2026-11-15").tron;
  assert.equal(week, one * 7);

  const chains = TOP.concat("new-chain").map((slug) => ({
    slug,
    name: slug === "robinhood-chain" ? "Robinhood Chain" : slug,
    logoKey: slug,
  }));
  const ranked = cr.rankChainRevenuePeriod(days, "2026-11-09", "2026-11-15", chains, priorTop);
  assert.equal(ranked.rows.length, 10);
  assert.equal(ranked.rows[0].slug, "solana");
  assert.equal(ranked.rows[0].barPercent, 100);
  assert.deepEqual(ranked.rows[0].rankChange, { kind: "up", places: 6 });
  const robinhood = ranked.rows.find((row) => row.slug === "robinhood-chain");
  assert.equal(robinhood.name, "Robinhood");
  assert.deepEqual(robinhood.rankChange, { kind: "down", places: 1 });
  const entrant = ranked.rows.find((row) => row.slug === "new-chain");
  assert.equal(entrant.rankChange.kind, "new");
  assert.equal(ranked.rows.some((row) => row.slug === "avalanche"), false);
  assert.equal(cr.chainDisplayName("robinhood-chain", "Robinhood Chain"), "Robinhood Chain");
});

test("rank change badges are up, down, new, or nothing", () => {
  const prior = ["tron", "ethereum", "solana", "base"];
  assert.deepEqual(cr.chainRevenueRankChange("solana", 1, prior), { kind: "up", places: 2 });
  assert.deepEqual(cr.chainRevenueRankChange("tron", 3, prior), { kind: "down", places: 2 });
  assert.equal(cr.chainRevenueRankChange("ethereum", 2, prior), null);
  assert.deepEqual(cr.chainRevenueRankChange("base", 4, prior), null);
  assert.deepEqual(cr.chainRevenueRankChange("polygon", 5, prior), { kind: "new" });
});

test("weekly and monthly captions and card labels use the real period", () => {
  const week = caption.chainRevenueWeekCopy("2026-11-09", "2026-11-15");
  assert.equal(week.caption, "How much revenue did blockchains generate last week? (November 9 – November 15)");
  assert.equal(week.subtitle, "Revenue captured by the blockchains themselves, Nov 9–15, 2026.");
  assert.equal(week.panelDay, "NOV 9–15");
  assert.equal(week.panelYear, "2026");
  assert.equal(caption.buildChainRevenueWeeklyCaption("2026-11-09", "2026-11-15"), week.caption);

  const month = caption.chainRevenueMonthCopy("2026-10-01");
  assert.equal(month.caption, "How much revenue did blockchains generate over the full month of October 2026?");
  assert.equal(month.subtitle, "Revenue captured by the blockchains themselves, October 2026.");
  assert.equal(month.panelDay, "OCT");
  assert.equal(month.panelYear, "2026");

  const crossing = caption.chainRevenueWeekCopy("2026-12-28", "2027-01-03");
  assert.equal(
    crossing.caption,
    "How much revenue did blockchains generate last week? (December 28, 2026 – January 3, 2027)",
  );
  assert.equal(crossing.panelDay, "DEC 28–JAN 3");
  assert.doesNotMatch(`${week.caption} ${month.caption}`, /[#$]|yesterday|inflow|outflow/);
});

test("period share gate skips an incomplete or already shared period", () => {
  const complete = { start: "2026-11-09", end: "2026-11-15", complete: true, dates: [], message: "ok" };
  const base = { assessment: complete, expectedStart: "2026-11-09", label: "week" };
  assert.equal(decideChainRevenuePeriodShare({ ...base, dryRun: false, posts: [] }).proceed, true);

  const partial = decideChainRevenuePeriodShare({
    ...base,
    assessment: { ...complete, complete: false, message: "missing a day" },
    dryRun: false,
    posts: [],
  });
  assert.equal(partial.reason, "incomplete");

  const live = [{ date: "2026-11-09", mode: "live" }];
  assert.equal(decideChainRevenuePeriodShare({ ...base, dryRun: false, posts: live }).reason, "already_posted");
  const dry = [{ date: "2026-11-09", mode: "dry-run" }];
  assert.equal(decideChainRevenuePeriodShare({ ...base, dryRun: true, posts: dry }).reason, "already_posted");
  assert.equal(decideChainRevenuePeriodShare({ ...base, dryRun: false, posts: dry }).proceed, true);
});

test("weekly and monthly workflows, pages, and scripts are wired", async () => {
  const [weekly, monthly, script, registry, snapshots, page, pkg] = await Promise.all([
    read("../.github/workflows/x-chain-revenue-weekly.yml"),
    read("../.github/workflows/x-chain-revenue-monthly.yml"),
    read("../scripts/x-chain-revenue-period.mjs"),
    read("../lib/onchain/registry.ts"),
    read("../lib/onchain/snapshots.ts"),
    read("../app/onchain/[slug]/page.tsx"),
    read("../package.json"),
  ]);
  for (const workflow of [weekly, monthly]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /default: true/);
    assert.match(workflow, /inputs\.dry_run/);
    assert.match(workflow, /vars\.X_DRY_RUN/);
    assert.match(workflow, /posted-state\.json/);
    assert.match(workflow, /not enabled/);
  }
  assert.match(weekly, /cron: "30 13 \* \* 1"/);
  assert.match(weekly, /cron: "30 16 \* \* 1"/);
  assert.match(weekly, /\*\/30 16-23 \* \* 1/);
  assert.match(monthly, /cron: "30 13 1-5 \* \*"/);
  assert.match(monthly, /cron: "30 16 1-5 \* \*"/);
  assert.match(monthly, /\*\/30 16-23 1-5 \* \*/);
  assert.match(script, /X_DRY_RUN \?\? "true"/);
  assert.match(script, /assessChainRevenuePeriod/);
  assert.match(script, /decideChainRevenuePeriodShare/);
  assert.match(script, /recordShare/);
  assert.match(registry, /slug:'chain-revenue-weekly'/);
  assert.match(registry, /slug:'chain-revenue-monthly'/);
  assert.match(snapshots, /case "chain-revenue-weekly"/);
  assert.match(snapshots, /case "chain-revenue-monthly"/);
  assert.match(snapshots, /titleBadge = kind === "weekly" \? "7D" : "1M"/);
  assert.match(page, /chain-revenue-weekly/);
  assert.match(page, /chain-revenue-monthly/);
  assert.match(pkg, /"x:chain-revenue-weekly": "node scripts\/x-chain-revenue-period\.mjs weekly"/);
  assert.match(pkg, /"x:chain-revenue-monthly": "node scripts\/x-chain-revenue-period\.mjs monthly"/);
});
