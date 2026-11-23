import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTs } from "./load-ts.mjs";
import { decideStablecoinPeriodShare } from "../scripts/x-stablecoin-supply-period-gate.mjs";
import { assessSameDaySpacing } from "./same-day-spacing-loader.mjs";

const supply = await importTs("../lib/onchain/stablecoinSupply.ts");
const handles = await importTs("../lib/share/chain-x-handles.ts");
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function chain(rawName, points) {
  return {
    rawName,
    slug: supply.stablecoinSlug(rawName),
    name: supply.stablecoinDisplayName(rawName),
    logoKey: supply.stablecoinLogoKey(rawName),
    points,
  };
}

test("weekly and monthly closes use Sunday and month-end snapshots", () => {
  const week = supply.lastCompletedUtcWeek(new Date("2026-11-23T15:00:00Z"));
  assert.deepEqual(week, { start: "2026-11-16", end: "2026-11-22" });
  assert.deepEqual(supply.previousUtcWeek(week.start), { start: "2026-11-09", end: "2026-11-15" });
  const month = supply.lastCompletedUtcMonth(new Date("2026-11-23T15:00:00Z"));
  assert.deepEqual(month, { start: "2026-10-01", end: "2026-10-31" });
  assert.deepEqual(supply.previousUtcMonth(month.start), { start: "2026-09-01", end: "2026-09-30" });
});

test("a top-10 gain wins over a larger outflow", () => {
  const history = {
    chains: [
      chain("Ethereum", { "2026-11-15": 132_000_000_000, "2026-11-22": 129_000_000_000 }),
      chain("Arbitrum", { "2026-11-15": 4_000_000_000, "2026-11-22": 4_333_400_000 }),
      chain("Solana", { "2026-11-15": 14_000_000_000, "2026-11-22": 13_000_000_000 }),
      ...["Tron", "BSC", "Base", "Polygon", "Hyperliquid L1", "Plasma", "Avalanche"].map((name, index) =>
        chain(name, { "2026-11-15": (10 - index) * 1e9, "2026-11-22": (10 - index) * 1e9 - 5e8 }),
      ),
    ],
    totals: { "2026-11-15": 287_095_066_172, "2026-11-22": 282_485_936_231 },
    failed: [],
    chainListCount: 20,
    fetchedAt: "2026-11-23T00:00:00Z",
    url: "https://stablecoins.llama.fi/stablecoincharts/all",
  };
  const ranked = supply.rankStablecoinPeriod(history, "weekly", new Date("2026-11-23T15:00:00Z"));
  assert.equal(ranked.highlight.kind, "gain");
  assert.equal(ranked.highlight.name, "Arbitrum");
  assert.equal(ranked.highlight.formattedChange, "$333.4M");
  assert.equal(supply.formatSignedSupplyPercent(-1_000, 1e9), "0.0%");
  assert.equal(supply.formatSignedSupplyPercent(1_000, 1e9), "0.0%");
  assert.equal(supply.stablecoinDisplayName("BSC"), "BNB Chain");
});

test("captions spell units, tag at most 3 handles, and skip Bitcoin", () => {
  const mention = handles.createChainMention();
  const weekly = supply.buildStablecoinSupplyCaption({
    kind: "weekly",
    start: "2026-11-16",
    end: "2026-11-22",
    total: 282_485_936_231,
    previousTotal: 287_095_066_172,
    highlight: { kind: "gain", name: "Arbitrum", change: 333_429_534 },
    newcomers: ["X Layer"],
    ranksUnchanged: false,
  }, mention);
  assert.equal(weekly, [
    "Stablecoin supply by chain (Nov 16 – Nov 22)",
    "",
    "Total supply fell by $4.61 billion (-1.6%) to $282.49 billion.",
    "Arbitrum (@arbitrum) had the biggest gain, adding $333.4 million.",
    "X Layer (@XLayerOfficial) entered the top 10.",
  ].join("\n"));
  assert.doesNotMatch(weekly, /DefiLlama|[0-9]B\b|[0-9]M\b/i);

  const monthly = supply.buildStablecoinSupplyCaption({
    kind: "monthly",
    start: "2026-10-01",
    end: "2026-10-31",
    total: 296_988_795_521,
    previousTotal: 304_123_191_592,
    highlight: { kind: "loss", name: "Ethereum", change: -3_742_502_178 },
    newcomers: [],
    ranksUnchanged: true,
  }, handles.createChainMention());
  assert.match(monthly, /Stablecoin supply by chain \(October 2026\)/);
  assert.match(monthly, /fell by \$7\.13 billion \(-2\.3%\) to \$296\.99 billion/);
  assert.match(monthly, /Ethereum \(@ethereum\) had the biggest loss, dropping \$3\.74 billion/);
  assert.match(monthly, /The top 10 kept the same order as September/);

  const budget = handles.createChainMention(3);
  const tagged = ["Ethereum", "Tron", "Solana", "Bitcoin", "Unknown Chain", "Base"].map((name) => budget(name));
  assert.deepEqual(tagged, [
    "Ethereum (@ethereum)",
    "Tron (@trondao)",
    "Solana (@solana)",
    "Bitcoin",
    "Unknown Chain",
    "Base",
  ]);
  assert.equal(handles.chainXHandle("Hyperliquid L1"), "HyperliquidX");
  assert.equal(handles.chainXHandle("Bitcoin"), null);
});

test("an all-negative top 10 selects the largest outflow", () => {
  const history = {
    chains: ["Ethereum", "Tron", "Solana", "BSC", "Base", "Arbitrum", "Polygon", "Avalanche", "Sui", "Aptos"].map((name, index) =>
      chain(name, { "2026-09-30": (100 - index * 5) * 1e9, "2026-10-31": (100 - index * 5) * 1e9 - (index === 0 ? 3.74e9 : 1e8) }),
    ),
    totals: { "2026-09-30": 304e9, "2026-10-31": 297e9 },
    failed: [],
    chainListCount: 10,
    fetchedAt: "2026-11-02T00:00:00Z",
    url: "https://stablecoins.llama.fi/stablecoincharts/all",
  };
  const ranked = supply.rankStablecoinPeriod(history, "monthly", new Date("2026-11-02T12:00:00Z"));
  assert.equal(ranked.highlight.kind, "loss");
  assert.equal(ranked.highlight.name, "Ethereum");
  assert.equal(ranked.ranksUnchanged, true);
  const decision = decideStablecoinPeriodShare({
    assessment: ranked.assessment,
    expectedStart: "2026-10-01",
    dryRun: false,
    posts: [],
    label: "month",
  });
  assert.equal(decision.proceed, true);
  const again = decideStablecoinPeriodShare({
    assessment: ranked.assessment,
    expectedStart: "2026-10-01",
    dryRun: false,
    posts: [{ date: "2026-10-01", mode: "live", at: "2026-11-02T13:00:00Z" }],
    label: "month",
  });
  assert.equal(again.reason, "already_posted");
});

test("one failed chain chart blocks the ranking even when the rest succeed", () => {
  const history = {
    chains: ["Ethereum", "Tron", "Solana", "BSC", "Base", "Arbitrum", "Polygon", "Avalanche", "Sui", "Aptos"].map((name, index) =>
      chain(name, { "2026-11-15": (20 - index) * 1e9, "2026-11-22": (20 - index) * 1e9 }),
    ),
    totals: { "2026-11-15": 200e9, "2026-11-22": 200e9 },
    failed: ["Hyperliquid L1"],
    chainListCount: 200,
    fetchedAt: "2026-11-23T00:00:00Z",
    url: "https://stablecoins.llama.fi/stablecoincharts/all",
  };
  const assessment = supply.assessStablecoinPeriod(history, "weekly", new Date("2026-11-23T15:00:00Z"));
  assert.equal(assessment.complete, false);
  assert.match(assessment.message, /Hyperliquid L1/);
  assert.throws(() => supply.rankStablecoinPeriod(history, "weekly", new Date("2026-11-23T15:00:00Z")), /Hyperliquid L1/);
});

test("monthly waits 4 hours after the weekly post on the shared weekday", () => {
  const tuesdayMorning = new Date("2026-11-24T13:00:00Z");
  const waiting = assessSameDaySpacing({
    now: tuesdayMorning,
    role: "monthly",
    siblingPosts: [],
    weeklyPostWeekday: 2,
  });
  assert.equal(waiting.reason, "sibling_first");
  const postedAt = "2026-11-24T13:10:00.000Z";
  const tooSoon = assessSameDaySpacing({
    now: new Date("2026-11-24T16:30:00Z"),
    role: "monthly",
    siblingPosts: [{ mode: "live", at: postedAt }],
    weeklyPostWeekday: 2,
  });
  assert.equal(tooSoon.reason, "sibling_spacing");
  const ready = assessSameDaySpacing({
    now: new Date("2026-11-24T17:10:00Z"),
    role: "monthly",
    siblingPosts: [{ mode: "live", at: postedAt }],
    weeklyPostWeekday: 2,
  });
  assert.equal(ready.proceed, true);
  const mondayRevenue = assessSameDaySpacing({
    now: new Date("2026-11-02T13:00:00Z"),
    role: "monthly",
    siblingPosts: [],
    weeklyPostWeekday: 1,
  });
  assert.equal(mondayRevenue.reason, "sibling_first");
  const weeklyAfterMonthly = assessSameDaySpacing({
    now: new Date("2026-11-02T14:00:00Z"),
    role: "weekly",
    siblingPosts: [{ mode: "live", at: "2026-11-02T13:00:00Z" }],
    weeklyPostWeekday: 1,
  });
  assert.equal(weeklyAfterMonthly.reason, "sibling_spacing");
});

test("cards, logos, and schedules are wired without a new logo path", async () => {
  const [card, revenueCard, logos, snapshots, registry, page, pkg, client] = await Promise.all([
    read("../components/share/StablecoinSupplyCard.tsx"),
    read("../components/share/ChainRevenueDailyCard.tsx"),
    read("../lib/onchain/chainRevenueLogos.ts"),
    read("../lib/onchain/snapshots.ts"),
    read("../lib/onchain/registry.ts"),
    read("../app/onchain/[slug]/page.tsx"),
    read("../package.json"),
    read("../components/onchain/DatasetChartClient.tsx"),
  ]);
  assert.match(card, /h-\[101px\] w-\[643px\]/);
  assert.match(card, /leading-\[1\.2\]/);
  assert.match(revenueCard, /leading-\[1\.2\]/);
  assert.doesNotMatch(revenueCard, /text-\[38px\][\s\S]{0,80}leading-none/);
  assert.match(logos, /approvedLogoCandidateOverlay/);
  assert.match(logos, /chain-stablecoin-supply-weekly/);
  assert.match(snapshots, /applyChainRevenueCardLogos/);
  assert.match(registry, /chain-stablecoin-supply-weekly/);
  assert.match(registry, /chain-stablecoin-supply-monthly/);
  assert.match(page, /chain-stablecoin-supply-weekly/);
  assert.match(client, /StablecoinSupply/);
  assert.match(pkg, /x:chain-stablecoin-supply-weekly/);
  const weekly = await read("../.github/workflows/x-chain-stablecoin-supply-weekly.yml");
  const monthly = await read("../.github/workflows/x-chain-stablecoin-supply-monthly.yml");
  assert.match(weekly, /\*\/30 16-23 \* \* 2/);
  assert.match(monthly, /\*\/30 16-23 2-5 \* \*/);
  assert.match(weekly, /posted-state\.json/);
  assert.match(monthly, /not enabled/);
});
