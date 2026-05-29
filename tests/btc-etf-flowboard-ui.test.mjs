import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');
const etfFlowboard = await readFile(new URL('../components/onchain/templates/EtfFlowboard.tsx', import.meta.url), 'utf8');
const shareCard = await readFile(new URL('../components/ShareCard.tsx', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');

async function importSnapshotBuilders() {
  let source = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');
  source = source
    .replace(/import \{ datasetRegistry \} from ["']\.\/registry["'];/, "const datasetRegistry = [];")
    .replace(/import type \{[\s\S]*?\} from ["']\.\/types["'];/, "")
    .replace(/import \{[\s\S]*?formatCompactUsd[\s\S]*?\} from ["']\.\.\/formatters["'];/, "const formatCompactUsd = (value)=>String(value); const formatSignedPercent = (value)=>`${Number(value) >= 0 ? '+' : ''}${value}%`; const formatSignedUsd = (value)=>`${Number(value) >= 0 ? '+' : '-'}$${Math.abs(Number(value) || 0)}`;")
    .replace(/import \{[\s\S]*?cumulative_sum[\s\S]*?\} from ["']\.\.\/metrics["'];/, "const cumulative_sum = (values)=>values.reduce((out,value,index)=>(out.push((out[index-1] || 0) + value), out), []); const rolling_20d = (values)=>values.slice(-20).reduce((a,b)=>a+b,0); const streak_count = (values)=>values.length; const long_short_imbalance = ()=>null; const marketShares = ()=>[]; const safeChangePct = ()=>null; const supply_pressure_score = ()=>null;")
    .replace(/import \{[\s\S]*?fetchChainRevenue[\s\S]*?\} from ["']\.\/sources\/defillama["'];/, "const fetchChainRevenue = async()=>({ok:false}); const fetchStablecoinSupplyByChain = async()=>({ok:false}); const fetchDexVolumeByChain = async()=>({ok:false}); const fetchProtocolRevenue = async()=>({ok:false}); const fetchDexProtocols = async()=>({ok:false}); const fetchPerpProtocols = async()=>({ok:false}); const fetchCexTransparency = async()=>({ok:false});")
    .replace(/import \{[\s\S]*?fetchBtcEtfFlows[\s\S]*?\} from ["']\.\/sources\/farside["'];/, "const fetchBtcEtfFlows = async()=>({ok:false}); const fetchEthEtfFlows = async()=>({ok:false});")
    .replace(/import \{ fetchStablecoinNetTransfersLatest \} from ["']\.\/sources\/dune["'];/, "const fetchStablecoinNetTransfersLatest = async()=>({ok:false});")
    .replace(/import \{ largeHolderMissingConfig \} from ["']\.\/sources\/etherscan["'];/, "const largeHolderMissingConfig = ()=>[];")
    .replace(/import \{ whaleTransferMissingConfig \} from ["']\.\/sources\/whaleAlert["'];/, "const whaleTransferMissingConfig = ()=>[];")
    .replace(/import \{[\s\S]*?loadLatestChartSnapshot[\s\S]*?\} from ["']\.\/storage["'];/, "const loadLatestChartSnapshot = async()=>null; const markSnapshotStale = (snapshot)=>snapshot; const saveChartSnapshot = async()=>{}; const sourceRun = async()=>{};");
  const js = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022 }}).outputText;
  assert.doesNotMatch(js, /from [\"']\.{1,2}\//, 'snapshot builder fixture must be self-contained before importing');
  const tempDir = await mkdtemp(join(tmpdir(), 'btc-etf-snapshot-builders-'));
  const modulePath = join(tempDir, 'snapshots.mjs');
  await writeFile(modulePath, js, 'utf8');
  return import(pathToFileURL(modulePath).href);
}

const snapshotBuilders = await importSnapshotBuilders();
const btcDataset = { id:'btc-etf-flowboard', slug:'btc-etf-flowboard', name:'BTC ETF Flowboard', description:'BTC ETF flows', category:'capital-flows', status:'active', requiredEnv:[], primarySource:'farside', sourceLabel:'Source: Farside Investors + Binance', chartTemplates:['etf_flowboard'] };
const fixtureMonth = new Date().toISOString().slice(0, 7);
const latestFixtureDate = `${fixtureMonth}-28`;
const latestFixtureLabel = `${new Date(`${latestFixtureDate}T00:00:00Z`).toLocaleDateString('en-US', { timeZone:'UTC', month:'short', day:'numeric' }).toUpperCase()} NET FLOW`;
const btcFlowResult = {
  url: 'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  data: {
    warnings: [],
    rows: [
      [`${fixtureMonth}-24`, 10, [['BlackRock','IBIT',10], ['Fidelity','FBTC',0]]],
      [`${fixtureMonth}-25`, -20, [['BlackRock','IBIT',-20], ['Fidelity','FBTC',0]]],
      [`${fixtureMonth}-26`, 40, [['BlackRock','IBIT',35], ['Fidelity','FBTC',5], ['Bitwise','BITB',0]]],
      [`${fixtureMonth}-27`, 100, [['BlackRock','IBIT',95], ['Fidelity','FBTC',5], ['Grayscale GBTC','GBTC',0]]],
      [`${fixtureMonth}-28`, -50, [['BlackRock','IBIT',-80], ['Fidelity','FBTC',30], ['Bitwise','BITB',0], ['ARK 21Shares','ARKB',0], ['Grayscale GBTC','GBTC',-5], ['VanEck','HODL',5], ['Franklin','EZBC',1], ['WisdomTree','BTCW',-1], ['Valkyrie','BRRR',0]]],
    ].flatMap(([date, total, issuers]) => [
      { date, asset:'BTC', issuer:'Total', ticker:'Total', flowUsd:total, isTotal:true, rawValue:String(total) },
      ...issuers.map(([issuer, ticker, flowUsd]) => ({ date, asset:'BTC', issuer, ticker, flowUsd, isTotal:false, rawValue:String(flowUsd) })),
    ]),
  },
};

function functionBlock(name) {
  const start = snapshots.indexOf(`export function ${name}`);
  assert.notEqual(start, -1, `${name} exists`);
  const candidates = ['\nexport function ', '\nasync function '].map((marker) => snapshots.indexOf(marker, start + 1)).filter((index) => index !== -1);
  const next = candidates.length ? Math.min(...candidates) : -1;
  return snapshots.slice(start, next === -1 ? snapshots.length : next);
}

const dailyBlock = functionBlock('buildBtcEtfDailyCard');
const weeklyBlock = functionBlock('buildBtcEtfWeeklyCard');
const monthlyBlock = functionBlock('buildBtcEtfMonthlyIssuerCard');

test('BTC ETF page uses one fixed export PNG button without a visible format dropdown', () => {
  assert.match(chartShell, /datasetSlug === 'btc-etf-flowboard'/);
  assert.match(chartShell, /singleFormat \? null : <ExportFormatSelector/);
  assert.match(chartShell, /<ExportButton onClick=\{onExport\}/);
  assert.match(chartShell, /defaultExportFormat/);
});

test('BTC ETF visual avoids tooltip artifacts, scroll classes, and horizontal overflow patterns', () => {
  assert.equal(/<Tooltip\b/.test(etfFlowboard), false);
  assert.equal(/overflow-(x-|y-)?auto|overflow-scroll/.test(etfFlowboard), false);
  assert.equal(/<Tooltip\b/.test(shareCard), false);
  assert.equal(/overflow-(x-|y-)?auto|overflow-scroll/.test(shareCard), false);
  assert.match(chartShell, /overflow-x-hidden/);
  assert.match(chartShell, /max-w-full overflow-hidden/);
});

test('Daily BTC ETF snapshot is latest-completed-day first with only Top Driver and Since Launch support', () => {
  assert.match(snapshots, /dateNetFlowLabel\(summary\.latestCompletedDate\)/);
  assert.doesNotMatch(dailyBlock, /Latest Net Flow|Today|Latest completed row/);
  assert.match(dailyBlock, /Latest capital movement across US spot Bitcoin ETFs\./);
  assert.match(dailyBlock, /driverMetric\(driver, share\)/);
  assert.match(dailyBlock, /["\']Since Launch["\']/);
  assert.doesNotMatch(dailyBlock, /5D Flow|20D Flow|Cumulative Flow/);
  assert.match(dailyBlock, /bars:[\s\S]*\[\]/);
  assert.match(dailyBlock, /lines:[\s\S]*\[\]/);
  assert.match(dailyBlock, /getTopIssuerContributors\(summary\.issuerLatest, 5\)/);
  assert.match(dailyBlock, /No issuer posted inflows\./);
  assert.doesNotMatch(dailyBlock, /Issuer inflow detail is pending/);
  assert.match(etfFlowboard, /metrics\.slice\(1, 3\)/);
  assert.match(etfFlowboard, /Latest Issuer Flows/);
  assert.match(etfFlowboard, /btc-logo-treatment/);
  assert.doesNotMatch(etfFlowboard, /5-day context|Top issuer contributors|Latest completed row/);
});

test('Weekly BTC ETF snapshot elevates weekly net flow and renders signed zero-baseline bars', () => {
  assert.match(weeklyBlock, /const weekDays = getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.match(weeklyBlock, /const issuers = allIssuers\.slice\(0,\s*5\)/);
  assert.match(weeklyBlock, /weeklyPrimaryMetric:[\s\S]*["\']WEEKLY NET FLOW["\']/);
  assert.match(weeklyBlock, /valueLabel:[\s\S]*formatSignedUsd/);
  assert.match(weeklyBlock, /magnitude:[\s\S]*Math\.abs/);
  assert.match(weeklyBlock, /isLargest:/);
  assert.match(weeklyBlock, /sign:[\s\S]*Number/);
  assert.match(weeklyBlock, /["\']Since Launch["\']/);
  assert.doesNotMatch(weeklyBlock, /Latest completed row|Last five completed sessions|Cumulative Flow/);
  assert.doesNotMatch(weeklyBlock, /Best Inflow Day|Worst Outflow Day|Top Issuer This Week/);
  assert.match(etfFlowboard, /Last 5 Days/);
  assert.match(etfFlowboard, /data-chart="signed-zero-baseline"/);
  assert.match(etfFlowboard, /Top Issuer Flows/);
  assert.doesNotMatch(etfFlowboard, /bg-zinc-950/);
});

test('Monthly BTC ETF card is an MTD flow report with compact issuer summary', () => {
  assert.match(monthlyBlock, /BTC ETF Monthly Flow Report/);
  assert.match(monthlyBlock, /Month-to-date capital movement across US spot Bitcoin ETFs\./);
  assert.match(monthlyBlock, /const issuers = allIssuers\.slice\(0,\s*5\)/);
  assert.match(monthlyBlock, /bars:[\s\S]*monthDays\.map/);
  assert.match(monthlyBlock, /lines:[\s\S]*\[\]/);
  assert.match(monthlyBlock, /monthlyVisual:[\s\S]*["\']mtd_signed_daily_flow_chart["\']/);
  assert.match(monthlyBlock, /Largest Inflow Day|Smallest Outflow/);
  assert.match(monthlyBlock, /Largest Outflow Day/);
  assert.match(monthlyBlock, /["\']Since Launch["\']/);
  assert.doesNotMatch(monthlyBlock, /Cumulative Flow|Current month-to-date Bitcoin ETF issuer flows using completed Farside rows|issuer_leaderboard/);
  assert.match(etfFlowboard, /This Month/);
  assert.match(etfFlowboard, /Top Issuer Flows/);
  assert.doesNotMatch(etfFlowboard, /Issuer Monthly Flows|Latest completed row/);
});


test('BTC ETF snapshot builders emit semantic card contracts for public daily weekly and monthly views', () => {
  const daily = snapshotBuilders.buildBtcEtfDailyCard(btcDataset, 'daily', btcFlowResult);
  assert.equal(daily.sourceLabel, 'Farside');
  assert.equal(daily.subtitle.includes('Farside'), false);
  assert.deepEqual(daily.headlineMetrics.map((metric) => metric.label), [latestFixtureLabel, 'Top Driver', 'Since Launch']);
  assert.match(daily.headlineMetrics[1].formattedValue, /%/);
  assert.equal(daily.series.lines.length, 0);
  assert.equal(daily.series.bars.length, 0);
  assert.ok(daily.series.tables.length <= 5);
  assert.equal(daily.series.tables.some((row) => Number(row.value) === 0), false);
  assert.equal(JSON.stringify(daily).includes('Cumulative Flow'), false);
  assert.equal(JSON.stringify(daily).includes('5D Flow'), false);
  assert.equal(JSON.stringify(daily).includes('20D Flow'), false);
  assert.equal(JSON.stringify(daily.series.cards).includes('Issuer breadth'), false);

  const weekly = snapshotBuilders.buildBtcEtfWeeklyCard(btcDataset, 'weekly', btcFlowResult);
  assert.equal(weekly.headlineMetrics[0].label, 'WEEKLY NET FLOW');
  assert.equal(weekly.metadata.signedZeroBaseline, true);
  assert.ok(weekly.metadata.largestAbsoluteMoveDate);
  assert.ok(weekly.headlineMetrics.some((metric) => metric.label === 'Since Launch'));
  assert.equal(weekly.series.lines.length, 0);
  assert.equal(weekly.series.bars.length, 5);
  assert.ok(weekly.series.bars.some((bar) => bar.value < 0), 'weekly outflows stay negative for zero-baseline rendering');
  for (const bar of weekly.series.bars) {
    assert.equal(bar.magnitude, Math.abs(bar.value));
    assert.match(bar.valueLabel, /^[+-]/);
    assert.match(bar.sign, /^(positive|negative)$/);
  }
  assert.ok(weekly.series.tables.length <= 5);
  assert.equal(weekly.series.tables.some((row) => Number(row.value) === 0), false);
  assert.equal(JSON.stringify(weekly).includes('Cumulative Flow'), false);
  assert.equal(JSON.stringify(weekly).includes('Last five completed sessions'), false);

  const monthly = snapshotBuilders.buildBtcEtfMonthlyIssuerCard(btcDataset, 'monthly', btcFlowResult);
  assert.equal(monthly.title, 'BTC ETF Monthly Flow Report');
  assert.equal(monthly.headlineMetrics[0].label, 'MONTHLY NET FLOW');
  assert.equal(monthly.metadata.monthlyVisual, 'mtd_signed_daily_flow_chart');
  assert.equal(monthly.metadata.signedZeroBaseline, true);
  assert.ok(monthly.metadata.keyDays.largestInflowDay);
  assert.ok(monthly.metadata.keyDays.largestOutflowDay);
  assert.ok(monthly.metadata.keyDays.latestCompletedDay);
  assert.equal(monthly.series.bars.length, 5);
  assert.ok(monthly.series.bars.some((bar) => bar.value < 0), 'monthly outflows stay negative for zero-baseline rendering');
  assert.ok(monthly.series.bars.every((bar) => bar.valueLabel));
  assert.equal(monthly.series.lines.length, 0);
  assert.ok(monthly.headlineMetrics.some((metric) => metric.label === 'Since Launch'));
  assert.ok(monthly.series.tables.length <= 5);
  assert.equal(monthly.series.tables.some((row) => Number(row.value) === 0), false);
  assert.equal(JSON.stringify(monthly).includes('Cumulative Flow'), false);
  assert.notEqual(monthly.metadata.monthlyVisual, 'issuer_leaderboard');
});
