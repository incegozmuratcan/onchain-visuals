import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const datasets = await readFile(new URL('../lib/datasets.ts', import.meta.url), 'utf8');
const homeClient = await readFile(new URL('../components/HomeClient.tsx', import.meta.url), 'utf8');
const datasetLibrary = await readFile(new URL('../components/DatasetLibrary.tsx', import.meta.url), 'utf8');
const shareCard = await readFile(new URL('../components/ShareCard.tsx', import.meta.url), 'utf8');
const chainApi = await readFile(new URL('../app/api/chain-revenue/route.ts', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');
const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');

test('public dataset library exposes only BTC ETF under Capital Flows', () => {
  assert.match(datasets, /name: "Capital Flows"/);
  assert.match(datasets, /label: "BTC ETF"/);
  const publicCapitalFlows = datasets.match(/id: "capital_flows"[\s\S]*?\n  },\n  \{/)?.[0] || '';
  assert.match(publicCapitalFlows, /BTC ETF Daily Flowboard/);
  assert.match(publicCapitalFlows, /BTC ETF Weekly Flowboard/);
  assert.match(publicCapitalFlows, /BTC ETF Monthly Issuer Report/);
  assert.doesNotMatch(publicCapitalFlows, /ETH ETF|BTC vs ETH|Whale|Liquidation|config/i);
});

test('BTC ETF presets are wired through public try-card prompts and API periods', () => {
  for (const preset of ['BTC ETF Daily Flowboard', 'BTC ETF Weekly Flowboard', 'BTC ETF Monthly Issuer Report']) assert.match(homeClient, new RegExp(preset));
  assert.match(chainApi, /buildChartSnapshot\("btc-etf-flowboard", btcEtfPeriod\)/);
  assert.match(chainApi, /monthly[\s\S]*weekly[\s\S]*daily/);
  assert.match(chainApi, /visualType: "btc_etf_card"/);
  assert.match(chainApi, /Capital Flows/);
  assert.match(datasetLibrary, /query\.chip/);
  assert.match(datasetLibrary, /onSelectPrompt\(query\.prompt\)/);
});

test('BTC ETF completed-row builders skip pending rows and expose daily weekly monthly chart-ready cards', () => {
  assert.match(snapshots, /completedEtfDays/);
  assert.match(snapshots, /entry\.total && entry\.issuers\.length/);
  assert.match(snapshots, /getLatestCompletedBtcEtfRow/);
  assert.match(snapshots, /buildBtcEtfDailyCard/);
  assert.match(snapshots, /buildBtcEtfWeeklyCard/);
  assert.match(snapshots, /buildBtcEtfMonthlyIssuerCard/);
  assert.match(snapshots, /Latest completed row/);
  assert.match(snapshots, /slice\(-5\)/);
  assert.doesNotMatch(snapshots, /No issuer had/);
});

test('public BTC ETF card has clean static export UI and source footer behavior', () => {
  assert.match(shareCard, /BtcEtfShareCard/);
  assert.match(shareCard, /Source: \{cleanSource\}/);
  assert.match(shareCard, /sourceLabel\.replace\(\/\^Source/);
  assert.doesNotMatch(shareCard, /ExportFormatSelector|1600x900|1200x1200|1080x1350|<Tooltip\b|overflow-x-auto/);
  assert.match(chartShell, /cleanSource = sourceLabel\.replace/);
  assert.doesNotMatch(chartShell, /Source: Source:/);
});
