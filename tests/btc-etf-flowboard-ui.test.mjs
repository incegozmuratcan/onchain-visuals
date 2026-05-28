import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');
const etfFlowboard = await readFile(new URL('../components/onchain/templates/EtfFlowboard.tsx', import.meta.url), 'utf8');
const shareCard = await readFile(new URL('../components/ShareCard.tsx', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');

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

test('Daily BTC ETF snapshot is latest-completed-day first with compact issuer impact', () => {
  assert.match(snapshots, /dateNetFlowLabel\(summary\.latestCompletedDate\)/);
  assert.doesNotMatch(dailyBlock, /Latest Net Flow|Today/);
  assert.match(dailyBlock, /Latest capital movement across US spot Bitcoin ETFs\./);
  assert.doesNotMatch(dailyBlock, /subtitle[\s\S]*Farside|Daily spot Bitcoin ETF net flows from completed Farside issuer rows/);
  assert.match(dailyBlock, /5D Flow/);
  assert.match(dailyBlock, /20D Flow/);
  assert.match(dailyBlock, /Since Launch/);
  assert.doesNotMatch(dailyBlock, /Cumulative Flow/);
  assert.match(dailyBlock, /series:\{\.\.\.emptySeries\(\), bars:\[\], lines:\[\]/);
  assert.match(dailyBlock, /getTopIssuerContributors\(summary\.issuerLatest, 5\)/);
  assert.match(snapshots, /Number\(r\.flowUsd\) !== 0/);
  assert.match(dailyBlock, /getIssuerBreadth\(summary\.issuerLatest\)/);
  assert.match(dailyBlock, /maxIssuerContributors:contributors\.length/);
  assert.doesNotMatch(dailyBlock, /No issuer had/);
  assert.match(etfFlowboard, /Latest Issuer Flows/);
  assert.doesNotMatch(etfFlowboard, /5-day context|Top issuer contributors/);
});

test('Weekly BTC ETF snapshot elevates weekly net flow and labels five completed days', () => {
  assert.match(weeklyBlock, /const weekDays = getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.match(weeklyBlock, /const issuers = allIssuers\.slice\(0,8\)/);
  assert.match(weeklyBlock, /weeklyPrimaryMetric:'Weekly Net Flow'/);
  assert.match(weeklyBlock, /valueLabel:formatSignedUsd/);
  assert.match(weeklyBlock, /dayMetricLabel\(bestDay\?\.total\.flowUsd, 'Best Inflow', 'Smallest Outflow'\)/);
  assert.match(weeklyBlock, /dayMetricLabel\(worstDay\?\.total\.flowUsd, 'Smallest Inflow', 'Largest Outflow'\)/);
  assert.doesNotMatch(weeklyBlock, /Best Inflow Day|Worst Outflow Day|Top Issuer This Week|Cumulative Flow/);
  assert.match(weeklyBlock, /Since Launch/);
  assert.match(weeklyBlock, /Number\(row\.value\) !== 0/);
  assert.doesNotMatch(weeklyBlock, /\+\$0/);
  assert.match(etfFlowboard, /BtcMetricCard/);
  assert.match(etfFlowboard, /Five completed days/);
  assert.match(etfFlowboard, /Weekly issuer net flow/);
});

test('Monthly BTC ETF card is an issuer report, not a broken-axis chart', () => {
  assert.match(monthlyBlock, /monthlyVisual:'issuer_leaderboard'/);
  assert.match(monthlyBlock, /const issuers = allIssuers\.slice\(0,8\)/);
  assert.match(monthlyBlock, /series:\{\.\.\.emptySeries\(\), bars:\[\], lines:\[\]/);
  assert.match(monthlyBlock, /Month-to-date issuer flows across US spot Bitcoin ETFs\./);
  assert.match(monthlyBlock, /Top Inflow/);
  assert.match(monthlyBlock, /Largest Outflow/);
  assert.match(monthlyBlock, /Since Launch/);
  assert.doesNotMatch(monthlyBlock, /Cumulative Flow|Current month-to-date Bitcoin ETF issuer flows using completed Farside rows/);
  assert.match(monthlyBlock, /Number\(row\.value\) !== 0/);
  assert.match(etfFlowboard, /Issuer Monthly Flows/);
  assert.doesNotMatch(etfFlowboard, /Month-to-date sessions/);
});
