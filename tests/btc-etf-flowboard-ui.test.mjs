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
  assert.doesNotMatch(etfFlowboard, /5-day context|Top issuer contributors|Latest completed row/);
});

test('Weekly BTC ETF snapshot elevates weekly net flow and renders five upward magnitude bars', () => {
  assert.match(weeklyBlock, /const weekDays = getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.match(weeklyBlock, /const issuers = allIssuers\.slice\(0,\s*5\)/);
  assert.match(weeklyBlock, /weeklyPrimaryMetric:[\s\S]*["\']Weekly Net Flow["\']/);
  assert.match(weeklyBlock, /valueLabel:[\s\S]*formatSignedUsd/);
  assert.match(weeklyBlock, /magnitude:[\s\S]*Math\.abs/);
  assert.match(weeklyBlock, /isLargest:/);
  assert.match(weeklyBlock, /sign:[\s\S]*Number/);
  assert.match(weeklyBlock, /["\']Since Launch["\']/);
  assert.doesNotMatch(weeklyBlock, /Latest completed row|Last five completed sessions|Cumulative Flow/);
  assert.doesNotMatch(weeklyBlock, /Best Inflow Day|Worst Outflow Day|Top Issuer This Week/);
  assert.match(etfFlowboard, /5-session flow strip/);
  assert.match(etfFlowboard, /height = Math\.max/);
  assert.match(etfFlowboard, /Weekly issuer net flow/);
  assert.doesNotMatch(etfFlowboard, /bg-zinc-950/);
});

test('Monthly BTC ETF card is an MTD flow report with compact issuer summary', () => {
  assert.match(monthlyBlock, /BTC ETF Monthly Flow Report/);
  assert.match(monthlyBlock, /Month-to-date capital movement across US spot Bitcoin ETFs\./);
  assert.match(monthlyBlock, /const issuers = allIssuers\.slice\(0,\s*5\)/);
  assert.match(monthlyBlock, /bars:[\s\S]*monthDays\.map/);
  assert.match(monthlyBlock, /lines:[\s\S]*\[\]/);
  assert.match(monthlyBlock, /monthlyVisual:[\s\S]*["\']mtd_daily_flow_chart["\']/);
  assert.match(monthlyBlock, /Largest Inflow Day|Smallest Outflow/);
  assert.match(monthlyBlock, /Largest Outflow Day/);
  assert.match(monthlyBlock, /["\']Since Launch["\']/);
  assert.doesNotMatch(monthlyBlock, /Cumulative Flow|Current month-to-date Bitcoin ETF issuer flows using completed Farside rows|issuer_leaderboard/);
  assert.match(etfFlowboard, /MTD daily flow chart/);
  assert.match(etfFlowboard, /Issuer Summary/);
  assert.doesNotMatch(etfFlowboard, /Issuer Monthly Flows|Latest completed row/);
});
