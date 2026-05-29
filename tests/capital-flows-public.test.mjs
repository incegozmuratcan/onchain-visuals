import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const datasets = await readFile(new URL('../lib/datasets.ts', import.meta.url), 'utf8');
const homeClient = await readFile(new URL('../components/HomeClient.tsx', import.meta.url), 'utf8');
const datasetLibrary = await readFile(new URL('../components/DatasetLibrary.tsx', import.meta.url), 'utf8');
const shareCard = await readFile(new URL('../components/ShareCard.tsx', import.meta.url), 'utf8');
const promptPanel = await readFile(new URL('../components/PromptPanel.tsx', import.meta.url), 'utf8');
const chainApi = await readFile(new URL('../app/api/chain-revenue/route.ts', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');
const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');

function blockFor(id) {
  const marker = `id: "${id}"`;
  const start = datasets.indexOf(marker);
  assert.notEqual(start, -1, `${id} exists`);
  const next = datasets.indexOf('\n  {\n    id:', start + marker.length);
  return datasets.slice(start, next === -1 ? datasets.length : next);
}


test('home defaults to BTC ETF Daily with context-aware BTC ETF settings', () => {
  assert.match(homeClient, /const DEFAULT_CARD_INPUT = "BTC ETF Daily Flowboard"/);
  assert.match(homeClient, /useState\(DEFAULT_CARD_INPUT\)/);
  assert.match(homeClient, /runQuery\(DEFAULT_CARD_INPUT\)/);
  assert.match(homeClient, /useState<string\[\]>\(\["Capital Flows", "BTC ETF", "Daily"\]\)/);
  assert.match(homeClient, /useState\("BTC ETF Daily Flowboard"\)/);
  assert.doesNotMatch(homeClient, /const DEFAULT_CARD_INPUT = "Top 10 chains by stablecoin supply"/);
  assert.match(chainApi, /get\("prompt"\) \|\| "BTC ETF Daily Flowboard"/);
  assert.match(promptPanel, /isBtcEtf/);
  assert.match(promptPanel, />BTC ETF<\/span>/);
  assert.match(promptPanel, /period === "Monthly" \? "Flow Report" : "Flow"/);
  assert.doesNotMatch(promptPanel.match(/detected\.isBtcEtf \? \([\s\S]*?\) : \(/)?.[0] || '', /Top \{limit\}|Select result count|Revenue|Chains/);
  assert.match(promptPanel, /placeholder="BTC ETF Daily Flowboard"/);
});

test('Capital Flows appears first and public dataset library exposes only BTC ETF there', () => {
  assert.ok(datasets.indexOf('id: "capital_flows"') < datasets.indexOf('id: "chains"'));
  assert.ok(datasets.indexOf('id: "chains"') < datasets.indexOf('id: "protocols"'));
  assert.ok(datasets.indexOf('id: "protocols"') < datasets.indexOf('id: "assets"'));
  assert.ok(datasets.indexOf('id: "assets"') < datasets.indexOf('id: "infrastructure"'));
  const publicCapitalFlows = blockFor('capital_flows');
  assert.match(publicCapitalFlows, /name: "Capital Flows"/);
  assert.match(publicCapitalFlows, /label: "BTC ETF"/);
  assert.match(publicCapitalFlows, /BTC ETF Daily Flowboard/);
  assert.match(publicCapitalFlows, /BTC ETF Weekly Flowboard/);
  assert.match(publicCapitalFlows, /BTC ETF Monthly Flow Report/);
  assert.match(publicCapitalFlows, /source: "Farside"/);
  assert.doesNotMatch(publicCapitalFlows, /ETH ETF|BTC vs ETH|Whale|Liquidation|config/i);
});

test('BTC ETF presets appear only under Capital Flows in public menus and API search still accepts all periods', () => {
  const nonCapital = datasets.replace(blockFor('capital_flows'), '');
  assert.doesNotMatch(nonCapital, /BTC ETF Daily Flowboard|BTC ETF Weekly Flowboard|BTC ETF Monthly Flow Report/);
  assert.match(homeClient, /"BTC ETF Daily Flowboard"/);
  assert.doesNotMatch(homeClient, /"BTC ETF Weekly Flowboard"[\s\S]*tryCards|"BTC ETF Monthly Flow Report"[\s\S]*tryCards/);
  assert.match(chainApi, /monthly\|issuer\\s\+report/);
  assert.match(chainApi, /weekly\|week/);
  assert.match(chainApi, /buildChartSnapshot\("btc-etf-flowboard", btcEtfPeriod\)/);
  assert.match(chainApi, /visualType: "btc_etf_card"/);
  assert.match(chainApi, /Capital Flows/);
  assert.match(datasetLibrary, /query\.chip/);
  assert.match(datasetLibrary, /onSelectPrompt\(query\.prompt\)/);
  assert.match(datasetLibrary, /flex-nowrap/);
  assert.match(datasetLibrary, /text-\[10px\]/);
  assert.match(datasetLibrary, /px-2 py-0\.5/);
});

test('BTC ETF completed-row builders power daily weekly monthly cards without awkward missing-issuer strings', () => {
  assert.match(snapshots, /completedEtfDays/);
  assert.match(snapshots, /entry\.total && entry\.issuers\.length/);
  assert.match(snapshots, /getLatestCompletedBtcEtfRow/);
  assert.match(snapshots, /getLatestCompletedBtcEtfDays/);
  assert.match(snapshots, /getIssuerBreadth/);
  assert.match(snapshots, /getTopIssuerContributors/);
  assert.match(snapshots, /formatIssuerFlow/);
  assert.match(snapshots, /buildBtcEtfDailyCard/);
  assert.match(snapshots, /buildBtcEtfWeeklyCard/);
  assert.match(snapshots, /buildBtcEtfMonthlyIssuerCard/);
  assert.match(snapshots, /latestCompletedDate/);
  assert.match(snapshots, /getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.doesNotMatch(snapshots, /No issuer had/);
  assert.match(snapshots, /d.slug === ["\']btc-etf-flowboard["\'][\s\S]*["\']Farside["\']/);
});

test('public BTC ETF card has clean static export UI and source footer behavior', () => {
  assert.match(shareCard, /BtcEtfShareCard/);
  assert.match(shareCard, /Source: \{cleanSource\}/);
  assert.match(shareCard, /data.datasetSlug === "btc-etf-flowboard"[\s\S]*"Farside"/);
  assert.doesNotMatch(shareCard, /ExportFormatSelector|1600x900|1080x1350|<Tooltip\b|overflow-x-auto/);
  assert.match(chartShell, /cleanSource = sourceLabel\.replace/);
  assert.match(chartShell, /singleFormat \? null : <ExportFormatSelector/);
  assert.doesNotMatch(chartShell, /Source: Source:/);
});
