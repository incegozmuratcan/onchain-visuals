import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { importTs } from "./load-ts.mjs";
import { decideWeeklyEtfShare, readPostState, recordShare } from "../scripts/x-btc-eth-etf-weekly-gate.mjs";

const week = await importTs("../lib/onchain/btcEthEtfWeek.ts");
const formatters = await importTs("../lib/formatters.ts");
const captionLib = await importTs("../lib/onchain/btcEthEtfWeeklyCaption.ts");

const SUNDAY_AFTER_NOV_6 = new Date("2026-11-08T16:00:00.000Z");
const FRIDAY_NOV_13 = new Date("2026-11-13T15:00:00.000Z");
const SUNDAY_NOV_15 = new Date("2026-11-15T16:00:00.000Z");
const SUNDAY_AFTER_THANKSGIVING = new Date("2026-11-29T18:00:00.000Z");

function rows(asset, days) {
  return days.flatMap(([date, total, issuers]) => [
    {
      date,
      asset,
      issuer: "Total",
      ticker: "Total",
      flowUsd: total,
      isTotal: true,
      rawValue: total == null ? "-" : String(total),
    },
    ...issuers.map(([issuer, ticker, flowUsd]) => ({
      date,
      asset,
      issuer,
      ticker,
      flowUsd,
      isTotal: false,
      rawValue: flowUsd == null ? "-" : String(flowUsd),
    })),
  ]);
}

function flatWeek(asset, monday, totalEach, ticker) {
  return [0, 1, 2, 3, 4].map((offset) => {
    const date = week.addDays(monday, offset);
    return [date, totalEach, [[ticker === "ETHA" ? "BlackRock" : "BlackRock", ticker, totalEach]]];
  });
}

function nov2Week() {
  const prior = [
    ["2026-10-26", -40_000_000, [["BlackRock", "IBIT", -40_000_000]]],
    ["2026-10-27", -40_000_000, [["BlackRock", "IBIT", -40_000_000]]],
    ["2026-10-28", -40_000_000, [["BlackRock", "IBIT", -40_000_000]]],
    ["2026-10-29", -40_000_000, [["BlackRock", "IBIT", -40_000_000]]],
    ["2026-10-30", -42_400_000, [["BlackRock", "IBIT", -42_400_000]]],
  ];
  const opening = [["2026-10-23", 57_254_400_000, [["BlackRock", "IBIT", 57_254_400_000]]]];
  const current = [
    ["2026-11-02", -399_000_000, [["BlackRock", "IBIT", -399_000_000]]],
    ["2026-11-03", -116_000_000, [["BlackRock", "IBIT", -116_000_000]]],
    ["2026-11-04", 75_000_000, [["BlackRock", "IBIT", 75_000_000]]],
    ["2026-11-05", -430_000_000, [["BlackRock", "IBIT", -430_000_000]]],
    [
      "2026-11-06",
      -412_000_000,
      [
        ["BlackRock", "IBIT", -340_000_000],
        ["Fidelity", "FBTC", 93_000_000],
        ["Grayscale GBTC", "GBTC", -61_000_000],
        ["Bitwise", "BITB", -54_000_000],
        ["ARK 21Shares", "ARKB", -50_000_000],
      ],
    ],
  ];
  return rows("BTC", [...opening, ...prior, ...current]);
}

function simpleEthWeek() {
  return rows("ETH", [
    ...flatWeek("ETH", "2026-10-26", -10_000_000, "ETHA"),
    ["2026-10-23", 12_000_000_000, [["BlackRock", "ETHA", 12_000_000_000]]],
    ["2026-11-02", -140_000_000, [["BlackRock", "ETHA", -140_000_000]]],
    ["2026-11-03", -85_000_000, [["BlackRock", "ETHA", -85_000_000]]],
    ["2026-11-04", 53_000_000, [["BlackRock", "ETHA", 53_000_000]]],
    ["2026-11-05", -100_000_000, [["BlackRock", "ETHA", -100_000_000]]],
    [
      "2026-11-06",
      -93_200_000,
      [
        ["BlackRock", "ETHA", -60_200_000],
        ["BlackRock", "ETHB", -48_000_000],
        ["Fidelity", "FETH", 15_000_000],
      ],
    ],
  ]);
}

test("week ranges use an en dash and keep a cross-month start month", () => {
  assert.equal(week.formatWeekRange("2026-11-02", "2026-11-06", "caption"), "Nov 2–6, 2026");
  assert.equal(week.formatWeekRange("2026-11-02", "2026-11-06", "card"), "NOV 2–6");
  assert.equal(week.formatWeekRange("2026-10-27", "2026-10-31", "caption"), "Oct 27–31, 2026");
  assert.equal(week.formatWeekRange("2026-09-29", "2026-10-03", "caption"), "Sep 29–Oct 3, 2026");
  assert.equal(week.formatWeekRange("2026-09-29", "2026-10-03", "card"), "SEP 29–OCT 3");
});

test("NYSE holidays remove Thanksgiving and Good Friday from the trading week", () => {
  assert.equal(week.isNyseHoliday("2026-11-26"), true);
  assert.equal(week.isNyseHoliday("2026-11-27"), false);
  assert.equal(week.isNyseHoliday("2026-11-13"), false);
  assert.equal(week.isNyseHoliday("2026-04-03"), true);
  assert.equal(week.isNyseHoliday("2026-07-03"), true);
  assert.equal(week.isNyseHoliday("2026-12-25"), true);
  assert.deepEqual(week.expectedTradingDays("2026-11-23"), [
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-27",
  ]);
  assert.equal(week.expectedTradingDays("2026-11-09").length, 5);
});

test("cumulative keeps historical totals even when an old issuer cell is blank", () => {
  const btc = rows("BTC", [
    ["2024-01-11", 55_000_000_000, [["BlackRock", "IBIT", 55_000_000_000], ["Later Fund", "MSBT", null]]],
    ...[0, 1, 2, 3, 4].map((offset) => [
      week.addDays("2026-11-02", offset),
      -10_000_000,
      [["BlackRock", "IBIT", -10_000_000]],
    ]),
  ]);
  const eth = rows("ETH", [
    ["2024-07-23", 12_000_000_000, [["BlackRock", "ETHA", 12_000_000_000]]],
    ...[0, 1, 2, 3, 4].map((offset) => [
      week.addDays("2026-11-02", offset),
      -5_000_000,
      [["BlackRock", "ETHA", -5_000_000]],
    ]),
  ]);
  const model = week.buildWeeklyPanels(btc, eth, SUNDAY_AFTER_NOV_6);
  assert.equal(model.decision.complete, true);
  assert.equal(model.decision.weekStart, "2026-11-02");
  assert.equal(model.panels[0].cumulative, 54_950_000_000);
  assert.equal(formatters.formatFlowCardAmount(model.panels[0].cumulative), "+$54.95B");
  assert.equal(model.panels[1].cumulative, 11_975_000_000);
});

test("weekly heroes use card amounts and day or issuer rows use whole millions", () => {
  const model = week.buildWeeklyPanels(nov2Week(), simpleEthWeek(), SUNDAY_AFTER_NOV_6);
  assert.equal(model.decision.complete, true);
  assert.deepEqual(model.decision.tradingDays, [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
  ]);
  const btc = model.panels[0];
  const eth = model.panels[1];
  assert.equal(formatters.formatFlowCardAmount(btc.netFlow), "-$1.28B");
  assert.equal(formatters.formatFlowCardAmount(btc.priorWeek), "-$202.4M");
  assert.equal(formatters.formatFlowCardAmount(btc.cumulative), "+$55.77B");
  assert.deepEqual(
    btc.days.map((day) => [day.label, formatters.formatFlowWholeMillions(day.value)]),
    [
      ["Mon", "-$399M"],
      ["Tue", "-$116M"],
      ["Wed", "+$75M"],
      ["Thu", "-$430M"],
      ["Fri", "-$412M"],
    ],
  );
  assert.equal(formatters.formatFlowCardAmount(eth.netFlow), "-$365.2M");
  assert.equal(formatters.formatFlowWholeMillions(eth.days[4].value), "-$93M");
  assert.equal(formatters.formatFlowWholeMillions(-1_210_000_000), "-$1.21B");
  assert.equal(btc.periodLabel, "NOV 2–6");
  assert.equal(btc.captionRange, "Nov 2–6, 2026");
  assert.equal(btc.metricLabel, "NET OUTFLOW");
});

test("top issuers sort by absolute weekly flow and use the weekly display names", () => {
  const model = week.buildWeeklyPanels(nov2Week(), simpleEthWeek(), SUNDAY_AFTER_NOV_6);
  assert.deepEqual(
    model.panels[0].issuers.map((row) => [row.ticker, row.name, row.value]),
    [
      ["IBIT", "BlackRock", -1_210_000_000],
      ["FBTC", "Fidelity", 93_000_000],
      ["GBTC", "Grayscale", -61_000_000],
    ],
  );
  assert.equal(model.panels[0].issuers.some((row) => row.ticker === "BITB"), false);
  assert.deepEqual(
    model.panels[1].issuers.map((row) => [row.ticker, row.name]),
    [
      ["ETHA", "BlackRock"],
      ["ETHB", "BlackRock Staked"],
      ["FETH", "Fidelity"],
    ],
  );
  assert.ok(Math.abs(week.issuerBarPercent(93_000_000, 1_210_000_000) - 27.7) < 0.15);
  assert.ok(Math.abs(week.issuerBarPercent(61_000_000, 1_210_000_000) - 22.5) < 0.15);
  assert.ok(Math.abs(week.issuerBarPercent(48_000_000, 346_000_000) - 37.2) < 0.15);
  assert.equal(week.dayBarPercent(-430_000_000, 430_000_000), 50);
  assert.ok(Math.abs(week.dayBarPercent(-399_000_000, 430_000_000) - 46.395) < 0.01);
});

test("a holiday week keeps only the trading days that exist", () => {
  const btc = rows("BTC", [
    ["2026-11-16", -10_000_000, [["BlackRock", "IBIT", -10_000_000]]],
    ["2026-11-17", -10_000_000, [["BlackRock", "IBIT", -10_000_000]]],
    ["2026-11-18", -10_000_000, [["BlackRock", "IBIT", -10_000_000]]],
    ["2026-11-19", -10_000_000, [["BlackRock", "IBIT", -10_000_000]]],
    ["2026-11-20", -10_000_000, [["BlackRock", "IBIT", -10_000_000]]],
    ["2026-11-23", -210_000_000, [["BlackRock", "IBIT", -210_000_000]]],
    ["2026-11-24", -90_000_000, [["BlackRock", "IBIT", -90_000_000]]],
    ["2026-11-25", 40_000_000, [["BlackRock", "IBIT", 40_000_000]]],
    ["2026-11-27", -120_000_000, [["BlackRock", "IBIT", -120_000_000]]],
  ]);
  const eth = rows("ETH", [
    ["2026-11-16", -5_000_000, [["BlackRock", "ETHA", -5_000_000]]],
    ["2026-11-17", -5_000_000, [["BlackRock", "ETHA", -5_000_000]]],
    ["2026-11-18", -5_000_000, [["BlackRock", "ETHA", -5_000_000]]],
    ["2026-11-19", -5_000_000, [["BlackRock", "ETHA", -5_000_000]]],
    ["2026-11-20", -5_000_000, [["BlackRock", "ETHA", -5_000_000]]],
    ["2026-11-23", -60_000_000, [["BlackRock", "ETHA", -60_000_000]]],
    ["2026-11-24", -20_000_000, [["BlackRock", "ETHA", -20_000_000]]],
    ["2026-11-25", 18_000_000, [["BlackRock", "ETHA", 18_000_000]]],
    ["2026-11-27", -35_000_000, [["BlackRock", "ETHA", -35_000_000]]],
  ]);
  const posting = week.selectPostingWeek(btc, eth, SUNDAY_AFTER_THANKSGIVING);
  assert.equal(posting.complete, true);
  assert.equal(posting.tradingDays.length, 4);
  assert.deepEqual(posting.tradingDays, ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-27"]);
  const model = week.buildWeeklyPanels(btc, eth, SUNDAY_AFTER_THANKSGIVING);
  assert.deepEqual(
    model.panels[0].days.map((day) => day.label),
    ["Mon", "Tue", "Wed", "Fri"],
  );
  assert.equal(model.panels[0].days.some((day) => day.label === "Thu"), false);
  assert.equal(model.panels[0].periodLabel, "NOV 23–27");
});

test("completeness gate blocks an ended week that is missing a trading day and does not fall back", () => {
  const completePrior = (asset, ticker) =>
    rows(asset, [
      ...[0, 1, 2, 3, 4].map((offset) => [
        week.addDays("2026-11-02", offset),
        -1_000_000,
        [[ticker, ticker, -1_000_000]],
      ]),
      ...[0, 1, 2, 3].map((offset) => [
        week.addDays("2026-11-09", offset),
        -2_000_000,
        [[ticker, ticker, -2_000_000]],
      ]),
      ["2026-11-13", 0, [[ticker, ticker, null]]],
    ]);
  const blocked = week.selectPostingWeek(
    completePrior("BTC", "IBIT"),
    completePrior("ETH", "ETHA"),
    SUNDAY_NOV_15,
  );
  assert.equal(blocked.complete, false);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.weekStart, "2026-11-09");
  assert.match(blocked.message, /2026-11-13/);
  const decision = decideWeeklyEtfShare({ week: blocked, dryRun: false, posts: [] });
  assert.equal(decision.proceed, false);
  assert.equal(decision.reason, "incomplete");
  assert.equal(decision.noNewSession, false);

  const partialEth = rows("ETH", [
    ...[0, 1, 2, 3, 4].map((offset) => [
      week.addDays("2026-11-09", offset),
      -2_000_000,
      [
        ["BlackRock", "ETHA", offset === 4 ? null : -2_000_000],
        ["Fidelity", "FETH", offset === 4 ? -2_000_000 : 0],
      ],
    ]),
  ]);
  const partial = week.selectPostingWeek(completePrior("BTC", "IBIT").filter((row) => row.date >= "2026-11-09" || row.date < "2026-11-09"), partialEth, SUNDAY_NOV_15);
  assert.equal(partial.complete, false);
});

test("an in-progress week falls back to the previous completed week", () => {
  const btc = rows("BTC", [
    ...[0, 1, 2, 3, 4].map((offset) => [
      week.addDays("2026-11-02", offset),
      -1_000_000,
      [["BlackRock", "IBIT", -1_000_000]],
    ]),
    ...[0, 1, 2, 3].map((offset) => [
      week.addDays("2026-11-09", offset),
      -2_000_000,
      [["BlackRock", "IBIT", -2_000_000]],
    ]),
    ["2026-11-13", 0, [["BlackRock", "IBIT", null]]],
  ]);
  const eth = rows("ETH", [
    ...[0, 1, 2, 3, 4].map((offset) => [
      week.addDays("2026-11-02", offset),
      -1_000_000,
      [["BlackRock", "ETHA", -1_000_000]],
    ]),
    ...[0, 1, 2, 3].map((offset) => [
      week.addDays("2026-11-09", offset),
      -2_000_000,
      [["BlackRock", "ETHA", -2_000_000]],
    ]),
    ["2026-11-13", 0, [["BlackRock", "ETHA", null]]],
  ]);
  const posting = week.selectPostingWeek(btc, eth, FRIDAY_NOV_13);
  assert.equal(posting.complete, true);
  assert.equal(posting.weekStart, "2026-11-02");
  assert.equal(posting.tradingDays.length, 5);
});

test("same-week skip blocks a repeated dry-run and still allows the live post", async () => {
  const ready = {
    complete: true,
    weekStart: "2026-11-02",
    tradingDays: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"],
    message: "Sharing ETF week 2026-11-02–2026-11-06.",
  };
  assert.equal(decideWeeklyEtfShare({ week: ready, dryRun: true, posts: [] }).proceed, true);
  const posts = [{ date: "2026-11-02", mode: "dry-run", at: "2026-11-08T08:00:00.000Z" }];
  const again = decideWeeklyEtfShare({ week: ready, dryRun: true, posts });
  assert.equal(again.proceed, false);
  assert.equal(again.reason, "already_posted");
  const live = decideWeeklyEtfShare({ week: ready, dryRun: false, posts });
  assert.equal(live.proceed, true);
  const posted = decideWeeklyEtfShare({
    week: ready,
    dryRun: false,
    posts: [{ date: "2026-11-02", mode: "live", at: "2026-11-08T08:00:00.000Z" }],
  });
  assert.equal(posted.reason, "already_posted");
  const older = decideWeeklyEtfShare({
    week: { ...ready, weekStart: "2026-10-26" },
    dryRun: false,
    posts: [{ date: "2026-11-02", mode: "live" }],
  });
  assert.equal(older.reason, "no_new_session");

  const dir = await mkdtemp(join(tmpdir(), "etf-weekly-state-"));
  const file = join(dir, "posted-state.json");
  await recordShare(file, { date: "2026-11-02", mode: "dry-run", at: "2026-11-08T08:00:00.000Z" });
  await recordShare(file, {
    date: "2026-11-02",
    mode: "live",
    at: "2026-11-08T09:00:00.000Z",
    postId: "9",
    postUrl: "https://x.com/OnchainVis/status/9",
  });
  const stored = await readPostState(file);
  assert.equal(stored.length, 2);
  assert.equal(stored.find((post) => post.mode === "live").postId, "9");
});

test("caption v3 picks inflow or outflow and has no cashtag, hashtag, or link", () => {
  const caption = captionLib.buildBtcEthEtfWeeklyCaption({
    title: "ETF Weekly Flowboard",
    metadata: { captionRange: "Nov 2–6, 2026" },
    series: {
      cards: [
        { asset: "BTC", netFlow: -1_280_000_000, formattedNet: "-$1.28B" },
        { asset: "ETH", netFlow: -365_200_000, formattedNet: "-$365.2M" },
      ],
    },
  });
  assert.equal(
    caption,
    [
      "ETF Weekly Flowboard — Nov 2–6, 2026",
      "",
      "US spot Bitcoin ETFs: -$1.28B net outflow",
      "US spot Ethereum ETFs: -$365.2M net outflow",
    ].join("\n"),
  );
  const inflow = captionLib.buildBtcEthEtfWeeklyCaption({
    metadata: { captionRange: "Sep 29–Oct 3, 2026" },
    series: {
      cards: [
        { asset: "BTC", netFlow: 2_500_000_000, formattedNet: "+$2.50B" },
        { asset: "ETH", netFlow: 80_400_000, formattedNet: "+$80.4M" },
      ],
    },
  });
  assert.match(inflow, /ETF Weekly Flowboard — Sep 29–Oct 3, 2026/);
  assert.match(inflow, /US spot Bitcoin ETFs: \+\$2\.50B net inflow/);
  assert.match(inflow, /US spot Ethereum ETFs: \+\$80\.4M net inflow/);
  assert.doesNotMatch(inflow, /\$[A-Za-z]|#|https?:/);
  assert.doesNotMatch(caption, /\$[A-Za-z]|#|https?:/);
});

test("the weekly card builder formats with the shared flow helpers", async () => {
  const weekSource = await readFile(new URL("../lib/onchain/btcEthEtfWeek.ts", import.meta.url), "utf8");
  let weekJs = ts.transpileModule(weekSource, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  weekJs = weekJs.replace(/export\s*\{[^}]*\};?/g, "").replace(/^export\s+/gm, "");
  let source = await readFile(new URL("../lib/onchain/snapshots.ts", import.meta.url), "utf8");
  source = source
    .replace(/import \{ datasetRegistry \} from ["']\.\/registry["'];/, "const datasetRegistry = [];")
    .replace(/import type \{[\s\S]*?\} from ["']\.\/types["'];/, "")
    .replace(
      /import \{[\s\S]*?formatCompactUsd[\s\S]*?\} from ["']\.\.\/formatters["'];/,
      () => "const formatCompactUsd = (value)=>String(value); const formatSignedPercent = (value)=>String(value); const formatSignedUsd = (value)=>String(value); const formatFlowCardAmount = (value)=>{ if (value == null || !Number.isFinite(Number(value))) return 'N/A'; const n = Number(value); const sign = n < 0 ? '-' : '+'; const abs = Math.abs(n); if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`; if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`; return `${sign}$${abs.toFixed(1)}`; }; const formatFlowWholeMillions = (value)=>{ if (value == null || !Number.isFinite(Number(value))) return 'N/A'; const n = Number(value); const sign = n < 0 ? '-' : '+'; const abs = Math.abs(n); if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`; return `${sign}$${Math.round(abs / 1e6)}M`; };",
    )
    .replace(
      /import \{[\s\S]*?cumulative_sum[\s\S]*?\} from ["']\.\.\/metrics["'];/,
      "const cumulative_sum = (values)=>values; const rolling_20d = ()=>0; const streak_count = ()=>0; const long_short_imbalance = ()=>null; const marketShares = ()=>[]; const safeChangePct = ()=>null; const supply_pressure_score = ()=>null;",
    )
    .replace(
      /import \{[\s\S]*?fetchChainRevenue[\s\S]*?\} from ["']\.\/sources\/defillama["'];/,
      "const fetchChainRevenue = async()=>({ok:false}); const fetchStablecoinSupplyByChain = async()=>({ok:false}); const fetchDexVolumeByChain = async()=>({ok:false}); const fetchProtocolRevenue = async()=>({ok:false}); const fetchDexProtocols = async()=>({ok:false}); const fetchPerpProtocols = async()=>({ok:false}); const fetchCexTransparency = async()=>({ok:false});",
    )
    .replace(
      /import \{[\s\S]*?fetchBtcEtfFlows[\s\S]*?\} from ["']\.\/sources\/farside["'];/,
      "const fetchBtcEtfFlows = async()=>({ok:false}); const fetchEthEtfFlows = async()=>({ok:false});",
    )
    .replace(
      /import \{ fetchStablecoinNetTransfersLatest \} from ["']\.\/sources\/dune["'];/,
      "const fetchStablecoinNetTransfersLatest = async()=>({ok:false});",
    )
    .replace(/import \{ largeHolderMissingConfig \} from ["']\.\/sources\/etherscan["'];/, "const largeHolderMissingConfig = ()=>[];")
    .replace(/import \{ whaleTransferMissingConfig \} from ["']\.\/sources\/whaleAlert["'];/, "const whaleTransferMissingConfig = ()=>[];")
    .replace(/import \{ buildWeeklyPanels \} from ["']\.\/btcEthEtfWeek["'];/, () => weekJs)
    .replace(
      /import \{[\s\S]*?loadLatestChartSnapshot[\s\S]*?\} from ["']\.\/storage["'];/,
      "const loadLatestChartSnapshot = async()=>null; const markSnapshotStale = (snapshot)=>snapshot; const saveChartSnapshot = async()=>{}; const sourceRun = async()=>{};",
    );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  assert.doesNotMatch(js, /from ["']\.{1,2}\//);
  const dir = await mkdtemp(join(tmpdir(), "weekly-card-"));
  const file = join(dir, "snapshots.mjs");
  await writeFile(file, js);
  const builders = await import(pathToFileURL(file).href);
  const dataset = {
    id: "btc-eth-etf-weekly-flowboard",
    slug: "btc-eth-etf-weekly-flowboard",
    name: "ETF Weekly Flowboard",
    description: "Weekly capital movement across US spot Bitcoin and Ethereum ETFs.",
    category: "capital-flows",
    status: "active",
    requiredEnv: [],
    primarySource: "farside",
    sourceLabel: "Farside",
    chartTemplates: ["weekly_flowboard"],
  };
  const card = builders.buildBtcEthEtfWeeklyCard(
    dataset,
    "weekly",
    { url: "https://farside.co.uk/btc/", data: { warnings: [], rows: nov2Week() } },
    { url: "https://farside.co.uk/eth/", data: { warnings: [], rows: simpleEthWeek() } },
    SUNDAY_AFTER_NOV_6,
  );
  assert.equal(card.title, "ETF Weekly Flowboard");
  assert.equal(card.subtitle, "Weekly capital movement across US spot Bitcoin and Ethereum ETFs.");
  assert.equal(card.metadata.layout, "btc-eth-weekly-split");
  assert.equal(card.metadata.chartType, "weekly_flowboard");
  assert.equal(card.metadata.captionRange, "Nov 2–6, 2026");
  assert.equal(card.metadata.tradingDayCount, 5);
  assert.equal(card.series.cards[0].formattedNet, "-$1.28B");
  assert.equal(card.series.cards[0].priorWeek.formattedValue, "-$202.4M");
  assert.equal(card.series.cards[0].formattedCumulative, "+$55.77B");
  assert.equal(card.series.cards[0].days[0].formattedValue, "-$399M");
  assert.equal(card.series.cards[0].issuers[0].formattedValue, "-$1.21B");
  assert.equal(card.series.cards[0].issuers[2].name, "Grayscale");
  assert.equal(card.series.cards[1].formattedNet, "-$365.2M");
  assert.equal(card.series.cards[1].issuers[1].name, "BlackRock Staked");
  const text = captionLib.buildBtcEthEtfWeeklyCaption(card);
  assert.equal(
    text,
    [
      "ETF Weekly Flowboard — Nov 2–6, 2026",
      "",
      "US spot Bitcoin ETFs: -$1.28B net outflow",
      "US spot Ethereum ETFs: -$365.2M net outflow",
    ].join("\n"),
  );
});

test("weekly workflow stays a dry-run and uses its own Sunday schedule", async () => {
  const workflow = await readFile(new URL("../.github/workflows/x-btc-eth-etf-weekly.yml", import.meta.url), "utf8");
  const script = await readFile(new URL("../scripts/x-btc-eth-etf-weekly.mjs", import.meta.url), "utf8");
  const daily = await readFile(new URL("../.github/workflows/x-btc-eth-etf-daily.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /dry_run:[\s\S]*default:\s*true/);
  assert.match(workflow, /cron: "30 5 \* \* 0"/);
  assert.match(workflow, /cron: "30 8 \* \* 0"/);
  assert.match(workflow, /scripts\/x-btc-eth-etf-weekly\.mjs/);
  assert.match(workflow, /name: btc-eth-etf-weekly/);
  assert.match(script, /datasetSlug = "btc-eth-etf-weekly-flowboard"/);
  assert.match(script, /1536/);
  assert.match(script, /1134/);
  assert.match(script, /selectPostingWeek/);
  assert.match(script, /\/api\/x\/publish-btc-eth-etf-weekly/);
  assert.match(script, /holiday-week/);
  assert.doesNotMatch(daily, /btc-eth-etf-weekly/);
  const card = await readFile(new URL("../components/share/WeeklyFlowboardCard.tsx", import.meta.url), "utf8");
  const dailyCard = await readFile(new URL("../components/share/SplitFlowboardCard.tsx", import.meta.url), "utf8");
  assert.match(card, /ShareCardFrame/);
  assert.match(card, /data-chip="prior-week"/);
  assert.match(card, /bg-\[#e8eaee\]/);
  assert.match(card, /border-\[#cfd4dc\]/);
  assert.match(card, /bg-\[#f5f6f8\]/);
  assert.doesNotMatch(dailyCard, /data-trading-days|prior-week|WeeklyFlowboard/);
});
