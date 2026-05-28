import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');
const etfFlowboard = await readFile(new URL('../components/onchain/templates/EtfFlowboard.tsx', import.meta.url), 'utf8');
const shareCard = await readFile(new URL('../components/ShareCard.tsx', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');

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

test('Daily BTC ETF snapshot is today-first with exactly five completed days and compact issuer impact', () => {
  assert.match(snapshots, /Latest Net Flow/);
  assert.match(snapshots, /5D Flow/);
  assert.match(snapshots, /20D Flow/);
  assert.match(snapshots, /Cumulative Flow/);
  assert.match(snapshots, /const contextDays = getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.match(snapshots, /isLatest:index === contextDays\.length - 1/);
  assert.match(snapshots, /opacity:index === contextDays\.length - 1 \? 1 : 0\.28/);
  assert.match(snapshots, /getTopIssuerContributors\(summary\.issuerLatest, 5\)/);
  assert.match(snapshots, /getIssuerBreadth\(summary\.issuerLatest\)/);
  assert.match(snapshots, /maxIssuerContributors:contributors\.length/);
  assert.match(etfFlowboard, /Latest Net Flow/);
  assert.match(etfFlowboard, /5-day context/);
  assert.match(etfFlowboard, /Top issuer contributors/);
});

test('Weekly BTC ETF snapshot uses five completed days and an issuer leaderboard capped at eight', () => {
  assert.match(snapshots, /const weekDays = getLatestCompletedBtcEtfDays\(flowResult\.data\.rows, 5\)/);
  assert.match(snapshots, /const issuers = allIssuers\.slice\(0,8\)/);
  assert.match(snapshots, /completedDayCount:weekDays\.length/);
  assert.doesNotMatch(snapshots, /\$\{bestDay\.date\} ·/);
  assert.match(etfFlowboard, /Five completed trading days/);
  assert.match(etfFlowboard, /Weekly issuer net flow/);
});

test('Monthly BTC ETF card is an issuer report, not a broken-axis chart', () => {
  assert.match(snapshots, /monthlyVisual:'issuer_leaderboard'/);
  assert.match(snapshots, /const issuers = allIssuers\.slice\(0,8\)/);
  assert.match(snapshots, /series:\{\.\.\.emptySeries\(\), bars:\[\], lines:\[\]/);
  assert.match(etfFlowboard, /Issuer monthly net-flow leaderboard/);
  assert.doesNotMatch(etfFlowboard, /Month-to-date sessions/);
});
