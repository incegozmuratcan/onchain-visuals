import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { importTs } from "./load-ts.mjs";
import { decideMonthlyEtfShare, readPostState, recordShare } from "../scripts/x-btc-eth-etf-monthly-gate.mjs";

const week = await importTs("../lib/onchain/btcEthEtfWeek.ts");
const formatters = await importTs("../lib/formatters.ts");

async function bundle(pairs) {
  const dir = await mkdtemp(join(tmpdir(), "etf-month-bundle-"));
  for (const [name, sourcePath, rewrite] of pairs) {
    const source = await readFile(new URL(sourcePath, import.meta.url), "utf8");
    let js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    if (rewrite) js = rewrite(js);
    await writeFile(join(dir, name), js);
  }
  return dir;
}

const monthDir = await bundle([
  ["week.mjs", "../lib/onchain/btcEthEtfWeek.ts", null],
  [
    "month.mjs",
    "../lib/onchain/btcEthEtfMonth.ts",
    (js) => js.replace(/from\s+['"]\.\/btcEthEtfWeek['"]/g, "from './week.mjs'"),
  ],
]);
const month = await import(pathToFileURL(join(monthDir, "month.mjs")).href);
const captionDir = await bundle([
  ["weekly.mjs", "../lib/onchain/btcEthEtfWeeklyCaption.ts", null],
  [
    "caption.mjs",
    "../lib/onchain/btcEthEtfMonthlyCaption.ts",
    (js) => js.replace(/from\s+['"]\.\/btcEthEtfWeeklyCaption['"]/g, "from './weekly.mjs'"),
  ],
]);
const captionLib = await import(pathToFileURL(join(captionDir, "caption.mjs")).href);

const NOV_15 = new Date("2026-11-15T13:00:00.000Z");
const JUNE_2 = new Date("2026-06-02T08:00:00.000Z");
const DEC_2 = new Date("2026-12-02T08:00:00.000Z");
const MAR_2 = new Date("2026-03-02T08:00:00.000Z");

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

function flatDays(dates, total, ticker, name) {
  return dates.map((date, index) => [date, index === 0 ? total : 0, [[name, ticker, index === 0 ? total : 0]]]);
}

function octoberDates() {
  return month.monthTradingDays(2026, 9);
}

const BTC_WEEKS = [
  ["2026-10-01", "2026-10-02", 292_600_000],
  ["2026-10-05", "2026-10-09", -678_900_000],
  ["2026-10-12", "2026-10-16", -228_400_000],
  ["2026-10-19", "2026-10-23", 301_200_000],
  ["2026-10-26", "2026-10-30", -202_400_000],
];

const ETH_WEEKS = [
  ["2026-10-01", "2026-10-02", -92_800_000],
  ["2026-10-05", "2026-10-09", -542_200_000],
  ["2026-10-12", "2026-10-16", -320_100_000],
  ["2026-10-19", "2026-10-23", -220_700_000],
  ["2026-10-26", "2026-10-30", -431_400_000],
];

function octoberAsset(asset, weeks, issuers, history, prior) {
  const dates = octoberDates();
  const september = month.monthTradingDays(2026, 8);
  const zeros = issuers.map(([name, ticker]) => [name, ticker, 0]);
  const october = dates.map((date) => {
    const bucket = weeks.find(([start, end]) => date >= start && date <= end);
    const firstOfWeek = bucket ? dates.find((day) => day >= bucket[0] && day <= bucket[1]) : null;
    const total = firstOfWeek === date ? bucket[2] : 0;
    return [date, total, date === dates[0] ? issuers : zeros];
  });
  return rows(asset, [
    history,
    ...flatDays(september, prior, issuers[0][1], issuers[0][0]),
    ...october,
  ]);
}

function octoberModel() {
  const btc = octoberAsset(
    "BTC",
    BTC_WEEKS,
    [
      ["BlackRock", "IBIT", 932_100_000],
      ["Fidelity", "FBTC", -754_500_000],
      ["ARK 21Shares", "ARKB", -444_000_000],
      ["Grayscale", "GBTC", -249_500_000],
    ],
    ["2024-01-11", 54_916_300_000, [["BlackRock", "IBIT", 54_916_300_000]]],
    2_647_700_000,
  );
  const eth = octoberAsset(
    "ETH",
    ETH_WEEKS,
    [
      ["BlackRock", "ETHA", -1_420_500_000],
      ["Grayscale", "ETHE", -119_100_000],
      ["BlackRock", "ETHB", -52_300_000],
      ["Fidelity", "FETH", -15_300_000],
    ],
    ["2024-07-23", 13_092_200_000, [["BlackRock", "ETHA", 13_092_200_000]]],
    831_300_000,
  );
  return month.buildMonthlyPanels(btc, eth, NOV_15);
}

test("previous month follows the Istanbul calendar, including the morning of the 1st", () => {
  assert.deepEqual(month.previousCalendarMonth(NOV_15), { year: 2026, monthIndex: 9 });
  assert.deepEqual(month.previousCalendarMonth(new Date("2026-11-01T02:00:00.000Z")), {
    year: 2026,
    monthIndex: 9,
  });
  assert.deepEqual(month.previousCalendarMonth(new Date("2026-10-31T21:30:00.000Z")), {
    year: 2026,
    monthIndex: 9,
  });
  assert.deepEqual(month.previousCalendarMonth(new Date("2026-01-03T06:00:00.000Z")), {
    year: 2025,
    monthIndex: 11,
  });
});

test("October 2026 groups into five trading-day spans that sum to the month", () => {
  assert.equal(octoberDates().length, 22);
  assert.equal(octoberDates().includes("2026-10-12"), true);
  const model = octoberModel();
  assert.equal(model.decision.complete, true);
  assert.equal(model.decision.monthStart, "2026-10-01");
  const btc = model.panels[0];
  const eth = model.panels[1];
  assert.deepEqual(
    btc.weeks.map((bucket) => bucket.label),
    ["Oct 1–2", "Oct 5–9", "Oct 12–16", "Oct 19–23", "Oct 26–30"],
  );
  assert.deepEqual(
    eth.weeks.map((bucket) => bucket.label),
    btc.weeks.map((bucket) => bucket.label),
  );
  assert.deepEqual(
    btc.weeks.map((bucket) => bucket.value),
    [292_600_000, -678_900_000, -228_400_000, 301_200_000, -202_400_000],
  );
  assert.deepEqual(
    eth.weeks.map((bucket) => bucket.value),
    [-92_800_000, -542_200_000, -320_100_000, -220_700_000, -431_400_000],
  );
  assert.equal(
    btc.weeks.reduce((sum, bucket) => sum + bucket.value, 0),
    btc.netFlow,
  );
  assert.equal(
    eth.weeks.reduce((sum, bucket) => sum + bucket.value, 0),
    eth.netFlow,
  );
  assert.equal(btc.netFlow, -515_900_000);
  assert.equal(eth.netFlow, -1_607_200_000);
});

test("headline and chip amounts use card formatting and week or issuer rows use whole millions", () => {
  const model = octoberModel();
  const btc = model.panels[0];
  const eth = model.panels[1];
  assert.equal(formatters.formatFlowCardAmount(btc.netFlow), "-$515.9M");
  assert.equal(formatters.formatFlowCardAmount(eth.netFlow), "-$1.61B");
  assert.equal(formatters.formatFlowCardAmount(btc.priorMonth), "+$2.65B");
  assert.equal(formatters.formatFlowCardAmount(eth.priorMonth), "+$831.3M");
  assert.equal(formatters.formatFlowCardAmount(btc.cumulative), "+$57.05B");
  assert.equal(formatters.formatFlowCardAmount(eth.cumulative), "+$12.32B");
  assert.deepEqual(
    btc.weeks.map((bucket) => formatters.formatFlowWholeMillions(bucket.value)),
    ["+$293M", "-$679M", "-$228M", "+$301M", "-$202M"],
  );
  assert.deepEqual(
    eth.weeks.map((bucket) => formatters.formatFlowWholeMillions(bucket.value)),
    ["-$93M", "-$542M", "-$320M", "-$221M", "-$431M"],
  );
  assert.equal(btc.periodLabel, "OCTOBER 2026");
  assert.equal(btc.captionRange, "October 2026");
  assert.equal(btc.priorMonthLabel, "PRIOR MONTH · SEP");
  assert.equal(btc.metricLabel, "NET OUTFLOW");
  assert.equal(eth.metricLabel, "NET OUTFLOW");
  assert.deepEqual(
    btc.issuers.map((row) => [row.ticker, row.name, formatters.formatFlowWholeMillions(row.value)]),
    [
      ["IBIT", "BlackRock", "+$932M"],
      ["FBTC", "Fidelity", "-$755M"],
      ["ARKB", "ARK 21Shares", "-$444M"],
    ],
  );
  assert.deepEqual(
    eth.issuers.map((row) => [row.ticker, row.name, formatters.formatFlowWholeMillions(row.value)]),
    [
      ["ETHA", "BlackRock", "-$1.42B"],
      ["ETHE", "Grayscale", "-$119M"],
      ["ETHB", "BlackRock Staked", "-$52M"],
    ],
  );
  assert.equal(week.weeklyIssuerName("MSBT", "MSBT"), "Morgan Stanley");
  assert.equal(week.weeklyIssuerName("MSSE", "MSSE"), "Morgan Stanley");
});

test("May 2026 keeps a single-day opening week and drops Memorial Day", () => {
  assert.equal(week.isNyseHoliday("2026-05-25"), true);
  assert.equal(week.isNyseHoliday("2026-05-01"), false);
  const dates = month.monthTradingDays(2026, 4);
  assert.equal(dates.includes("2026-05-01"), true);
  assert.equal(dates.includes("2026-05-25"), false);
  assert.equal(dates.includes("2026-05-26"), true);
  const btc = rows(
    "BTC",
    dates.map((date) => [date, -1_000_000, [["BlackRock", "IBIT", -1_000_000]]]),
  );
  const eth = rows(
    "ETH",
    dates.map((date) => [date, -500_000, [["BlackRock", "ETHA", -500_000]]]),
  );
  const model = month.buildMonthlyPanels(btc, eth, JUNE_2);
  assert.equal(model.decision.complete, true);
  assert.equal(model.decision.tradingDays.length, dates.length);
  assert.deepEqual(
    model.panels[0].weeks.map((bucket) => bucket.label),
    ["May 1", "May 4–8", "May 11–15", "May 18–22", "May 26–29"],
  );
  assert.equal(model.panels[0].weeks[0].dates.length, 1);
  assert.equal(model.panels[0].weeks[4].dates.includes("2026-05-25"), false);
  assert.equal(model.panels[0].netFlow, model.panels[0].weeks.reduce((sum, bucket) => sum + bucket.value, 0));
  assert.equal(model.panels[0].periodLabel, "MAY 2026");
  assert.equal(model.panels[0].priorMonthLabel, "PRIOR MONTH · APR");
});

test("November 2026 drops Thanksgiving and labels the short week by its trading-day span", () => {
  assert.equal(week.isNyseHoliday("2026-11-26"), true);
  const dates = month.monthTradingDays(2026, 10);
  assert.equal(dates.includes("2026-11-26"), false);
  assert.equal(dates.includes("2026-11-27"), true);
  const btc = rows(
    "BTC",
    dates.map((date) => [date, -2_000_000, [["BlackRock", "IBIT", -2_000_000]]]),
  );
  const eth = rows(
    "ETH",
    dates.map((date) => [date, -1_000_000, [["BlackRock", "ETHA", -1_000_000], ["Morgan Stanley", "MSSE", 0]]]),
  );
  const model = month.buildMonthlyPanels(btc, eth, DEC_2);
  assert.equal(model.decision.complete, true);
  assert.equal(model.panels[0].weeks.length, 5);
  assert.equal(model.panels[0].weeks[3].label, "Nov 23–27");
  assert.deepEqual(model.panels[0].weeks[3].dates, [
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-27",
  ]);
  assert.equal(model.panels[0].weeks[4].label, "Nov 30");
  assert.deepEqual(model.panels[0].weeks[4].dates, ["2026-11-30"]);
  const named = week.topIssuers(
    rows("ETH", [["2026-11-02", -90_000_000, [["Morgan Stanley", "MSSE", -80_000_000], ["BlackRock", "ETHA", -10_000_000]]]]),
    ["2026-11-02"],
  );
  assert.equal(named[0].ticker, "MSSE");
  assert.equal(named[0].name, "Morgan Stanley");
  assert.equal(named.find((row) => row.ticker === "MSBT"), undefined);
  const bitcoin = week.topIssuers(
    rows("BTC", [["2026-05-01", 5_000_000, [["Morgan Stanley", "MSBT", 5_000_000]]]]),
    ["2026-05-01"],
  );
  assert.equal(bitcoin[0].name, "Morgan Stanley");
});

test("February 2026 drops Presidents Day and stays a four-week month", () => {
  assert.equal(week.isNyseHoliday("2026-02-16"), true);
  const dates = month.monthTradingDays(2026, 1);
  assert.equal(dates.includes("2026-02-16"), false);
  const btc = rows(
    "BTC",
    dates.map((date) => [date, 1_000_000, [["BlackRock", "IBIT", 1_000_000]]]),
  );
  const eth = rows(
    "ETH",
    dates.map((date) => [date, 1_000_000, [["BlackRock", "ETHA", 1_000_000]]]),
  );
  const model = month.buildMonthlyPanels(btc, eth, MAR_2);
  assert.equal(model.decision.complete, true);
  assert.deepEqual(
    model.panels[0].weeks.map((bucket) => bucket.label),
    ["Feb 2–6", "Feb 9–13", "Feb 17–20", "Feb 23–27"],
  );
  assert.equal(model.panels[0].metricLabel, "NET INFLOW");
});

test("completeness gate blocks a month with a blank issuer cell and does not fall back", () => {
  const ready = octoberModel();
  assert.equal(ready.decision.complete, true);
  const brokenEth = octoberAsset(
    "ETH",
    ETH_WEEKS,
    [
      ["BlackRock", "ETHA", -1_420_500_000],
      ["Grayscale", "ETHE", -119_100_000],
    ],
    ["2024-07-23", 13_092_200_000, [["BlackRock", "ETHA", 13_092_200_000]]],
    831_300_000,
  ).map((row) =>
    row.date === "2026-10-16" && row.ticker === "ETHA" ? { ...row, flowUsd: null, rawValue: "-" } : row,
  );
  const btc = octoberAsset(
    "BTC",
    BTC_WEEKS,
    [["BlackRock", "IBIT", 932_100_000]],
    ["2024-01-11", 54_916_300_000, [["BlackRock", "IBIT", 54_916_300_000]]],
    2_647_700_000,
  );
  const blocked = month.selectPostingMonth(btc, brokenEth, NOV_15);
  assert.equal(blocked.complete, false);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.monthStart, "2026-10-01");
  assert.match(blocked.message, /2026-10-16/);
  assert.doesNotMatch(blocked.message, /September/);
  const decision = decideMonthlyEtfShare({ month: blocked, dryRun: true, posts: [] });
  assert.equal(decision.proceed, false);
  assert.equal(decision.reason, "incomplete");
  assert.equal(decision.noNewSession, false);
});

test("same-month skip blocks a repeated dry-run and still allows the live post", async () => {
  const ready = {
    complete: true,
    monthStart: "2026-10-01",
    tradingDays: octoberDates(),
    message: "Sharing ETF month October 2026.",
  };
  assert.equal(decideMonthlyEtfShare({ month: ready, dryRun: true, posts: [] }).proceed, true);
  const posts = [{ date: "2026-10-01", mode: "dry-run", at: "2026-11-02T08:00:00.000Z" }];
  const again = decideMonthlyEtfShare({ month: ready, dryRun: true, posts });
  assert.equal(again.proceed, false);
  assert.equal(again.reason, "already_posted");
  const live = decideMonthlyEtfShare({ month: ready, dryRun: false, posts });
  assert.equal(live.proceed, true);
  const posted = decideMonthlyEtfShare({
    month: ready,
    dryRun: false,
    posts: [{ date: "2026-10-01", mode: "live", at: "2026-11-02T09:00:00.000Z" }],
  });
  assert.equal(posted.reason, "already_posted");
  const older = decideMonthlyEtfShare({
    month: { ...ready, monthStart: "2026-09-01" },
    dryRun: false,
    posts: [{ date: "2026-10-01", mode: "live" }],
  });
  assert.equal(older.reason, "no_new_session");

  const dir = await mkdtemp(join(tmpdir(), "etf-monthly-state-"));
  const file = join(dir, "posted-state.json");
  await recordShare(file, { date: "2026-10-01", mode: "dry-run", at: "2026-11-02T08:00:00.000Z" });
  const stored = await readPostState(file);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].date, "2026-10-01");
});

test("caption v3 matches the weekly shape with the month name", () => {
  const caption = captionLib.buildBtcEthEtfMonthlyCaption({
    title: "ETF Monthly Flowboard",
    metadata: { captionRange: "October 2026" },
    series: {
      cards: [
        { asset: "BTC", netFlow: -515_900_000, formattedNet: "-$515.9M" },
        { asset: "ETH", netFlow: -1_607_200_000, formattedNet: "-$1.61B" },
      ],
    },
  });
  assert.equal(
    caption,
    ["ETF Monthly Flowboard — October 2026", "", "US spot Bitcoin ETFs: -$515.9M net outflow", "US spot Ethereum ETFs: -$1.61B net outflow"].join(
      "\n",
    ),
  );
  assert.doesNotMatch(caption, /\$[A-Za-z]|#|https?:/);
  assert.throws(
    () => captionLib.buildBtcEthEtfMonthlyCaption({ metadata: {}, series: { cards: [] } }),
    /month label/,
  );
});

test("week bars stay on the weekly center scale and issuers stay on the square-root scale", () => {
  const max = 678_900_000;
  assert.equal(week.dayBarPercent(-678_900_000, max), 50);
  assert.ok(Math.abs(week.dayBarPercent(292_600_000, max) - 21.55) < 0.05);
  assert.ok(Math.abs(week.issuerBarPercent(754_500_000, 932_100_000) - 90) < 0.15);
  assert.ok(Math.abs(week.issuerBarPercent(52_300_000, 1_420_500_000) - 19.2) < 0.15);
});

test("the monthly snapshot card is registered beside the weekly card", async () => {
  const snapshots = await readFile(new URL("../lib/onchain/snapshots.ts", import.meta.url), "utf8");
  const registry = await readFile(new URL("../lib/onchain/registry.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/onchain/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(snapshots, /export function buildBtcEthEtfMonthlyCard/);
  assert.match(snapshots, /layout: "btc-eth-monthly-split"/);
  assert.match(snapshots, /view: "monthly"/);
  assert.match(snapshots, /case "btc-eth-etf-monthly-flowboard"/);
  assert.match(registry, /slug:'btc-eth-etf-monthly-flowboard'/);
  assert.match(registry, /chartTemplates:\['monthly_flowboard'\]/);
  assert.match(page, /preview === 'single-day-week'/);
  assert.match(page, /preview === 'holiday-month'/);
  const card = await readFile(new URL("../components/onchain/templates/MonthlyFlowboard.tsx", import.meta.url), "utf8");
  assert.match(card, /WeeklyFlowboardCard/);
  assert.match(card, /timeline="month"/);
  assert.match(card, /1536/);
  assert.match(card, /1134/);
});

test("monthly workflow is a days 1–5 dry-run and leaves the weekly schedule alone", async () => {
  const workflow = await readFile(new URL("../.github/workflows/x-btc-eth-etf-monthly.yml", import.meta.url), "utf8");
  const weeklyWorkflow = await readFile(new URL("../.github/workflows/x-btc-eth-etf-weekly.yml", import.meta.url), "utf8");
  const daily = await readFile(new URL("../.github/workflows/x-btc-eth-etf-daily.yml", import.meta.url), "utf8");
  const script = await readFile(new URL("../scripts/x-btc-eth-etf-monthly.mjs", import.meta.url), "utf8");
  const card = await readFile(new URL("../components/share/WeeklyFlowboardCard.tsx", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /dry_run:[\s\S]*default:\s*true/);
  assert.match(workflow, /cron: "30 5 1-5 \* \*"/);
  assert.match(workflow, /cron: "30 8 1-5 \* \*"/);
  assert.match(workflow, /vars\.X_DRY_RUN/);
  assert.match(workflow, /group: x-btc-eth-etf-monthly/);
  assert.match(workflow, /scripts\/x-btc-eth-etf-monthly\.mjs/);
  assert.match(workflow, /name: btc-eth-etf-monthly/);
  assert.match(script, /datasetSlug = "btc-eth-eth-etf-monthly-flowboard"|datasetSlug = "btc-eth-etf-monthly-flowboard"/);
  assert.match(script, /selectPostingMonth/);
  assert.match(script, /1536/);
  assert.match(script, /1134/);
  assert.match(script, /single-day-week/);
  assert.match(script, /holiday-month/);
  assert.match(script, /\/api\/x\/publish-btc-eth-etf-monthly/);
  assert.match(card, /grid-cols-\[54px_minmax\(0,1fr\)_118px\]/);
  assert.match(card, /grid-cols-\[112px_minmax\(0,1fr\)_118px\]/);
  assert.match(card, /IssuerFlowRow/);
  assert.match(weeklyWorkflow, /cron: "30 5 \* \* 0"/);
  assert.match(weeklyWorkflow, /cron: "30 8 \* \* 0"/);
  assert.doesNotMatch(weeklyWorkflow, /1-5/);
  assert.doesNotMatch(daily, /btc-eth-etf-monthly/);
});
