import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');
const etfFlowboard = await readFile(new URL('../components/onchain/templates/EtfFlowboard.tsx', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');

test('BTC ETF page uses one fixed export PNG button without a visible format dropdown', () => {
  assert.match(chartShell, /datasetSlug === 'btc-etf-flowboard'/);
  assert.match(chartShell, /singleFormat \? null : <ExportFormatSelector/);
  assert.match(chartShell, /<ExportButton onClick=\{onExport\}/);
  assert.match(chartShell, /defaultExportFormat/);
});

test('BTC ETF visual avoids tooltip artifacts and horizontal overflow patterns', () => {
  assert.equal(/<Tooltip\b/.test(etfFlowboard), false);
  assert.match(etfFlowboard, /grid grid-cols-12/);
  assert.match(chartShell, /overflow-x-hidden/);
  assert.match(chartShell, /max-w-full overflow-hidden/);
});

test('BTC ETF snapshot exposes required headline metrics, issuer rows, series, freshness, and insights', () => {
  assert.match(snapshots, /Latest Net Flow/);
  assert.match(snapshots, /5D Flow/);
  assert.match(snapshots, /20D Flow/);
  assert.match(snapshots, /Cumulative Flow/);
  assert.match(snapshots, /issuerBars/);
  assert.match(snapshots, /Largest inflow issuer/);
  assert.match(snapshots, /Largest outflow issuer/);
  assert.match(snapshots, /Farside Investors/);
});
