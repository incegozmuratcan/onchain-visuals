import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../lib/onchain/sources/farside.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace("import { fetchText } from './http';", "const fetchText = async()=>'';"), { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022 }}).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('Farside BTC parser fixture handles issuer columns, total/net flow, negatives, blanks, and normalization', () => {
  const html = `<html><body><table><tr><td>marketing</td></tr></table><table><tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>BITB</th><th>ARKB</th><th>GBTC</th><th>BTC</th><th>HODL</th><th>EZBC</th><th>BTCO</th><th>BTCW</th><th>BRRR</th><th>Net Flow</th></tr><tr><td>01 Jan 2026</td><td>$1,010.5</td><td>20</td><td>-</td><td>Pending</td><td>(2.5)</td><td></td><td>0.1</td><td>1</td><td>2</td><td>3</td><td>4</td><td>$1,038.1</td></tr><tr><td>02 Jan 2026</td><td>-</td><td></td><td>5</td><td>1</td><td>(10)</td><td>2</td><td></td><td></td><td></td><td></td><td></td><td>(2.0)</td></tr></table></body></html>`;
  const { rows, warnings } = mod.parseFarsideEtfTable(html, 'BTC');
  assert.equal(rows.find((r)=>r.ticker==='IBIT').issuer, 'BlackRock');
  assert.equal(rows.find((r)=>r.ticker==='IBIT').flowUsd, 1_010_500_000);
  assert.equal(rows.find((r)=>r.ticker==='GBTC').issuer, 'Grayscale GBTC');
  assert.equal(rows.find((r)=>r.ticker==='GBTC').flowUsd, -2_500_000);
  assert.equal(rows.find((r)=>r.ticker==='BTC').issuer, 'Grayscale Mini');
  assert.equal(rows.find((r)=>r.ticker==='ARKB').flowUsd, null);
  assert.equal(rows.find((r)=>r.date==='2026-01-02' && r.ticker==='Total').flowUsd, -2_000_000);
  assert.ok(rows.some((r)=>r.isTotal && Math.abs(r.flowUsd - 1_038_100_000) < 1));
  assert.ok(!warnings.some((w)=>w.includes('No BTC ETF flow values parsed')));
});

test('Farside ETH parser accepts the current all-data header without a Date label', () => {
  const html = `<table><tr><th></th><th>ETHA</th><th>ETHB</th><th>FETH</th><th>TETH</th><th>MSSE</th><th>ETHE</th><th>ETH</th><th>Total</th></tr><tr><td>Fee</td><td>0.25%</td><td>0.25%</td><td>0.25%</td><td>0.21%</td><td>0.14%</td><td>2.50%</td><td>0.15%</td><td></td></tr><tr><td>30 Oct 2026</td><td>(76.6)</td><td>(19.5)</td><td>(3.3)</td><td>0.0</td><td>(0.7)</td><td>(21.5)</td><td>(34.1)</td><td>(155.7)</td></tr><tr><td>02 Nov 2026</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>0.0</td></tr></table>`;
  const { rows } = mod.parseFarsideEtfTable(html, 'ETH');
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.ticker==='ETHA').issuer, 'BlackRock');
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.ticker==='ETHA').flowUsd, -76_600_000);
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.ticker==='ETHB').issuer, 'BlackRock');
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.ticker==='TETH').issuer, '21Shares');
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.ticker==='MSSE').issuer, 'Morgan Stanley');
  assert.equal(rows.find((r)=>r.date==='2026-10-30' && r.isTotal).flowUsd, -155_700_000);
  assert.equal(rows.find((r)=>r.date==='2026-11-02' && r.ticker==='ETHA').flowUsd, null);
});

function btcSessionTable(rows) {
  const header = '<tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>Total</th></tr>';
  const body = rows
    .map(([date, ibit, fbtc, total]) => `<tr><td>${date}</td><td>${ibit}</td><td>${fbtc}</td><td>${total}</td></tr>`)
    .join('');
  return `<table>${header}${body}</table>`;
}

test('latest Farside session stays incomplete when an issuer cell is a dash, blank, or missing', () => {
  const dashed = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['01 Nov 2026', '1.0', '2.0', '3.0'],
    ['02 Nov 2026', '4.0', '-', '4.0'],
  ]), 'BTC').rows);
  assert.equal(dashed.date, '2026-11-02');
  assert.equal(dashed.complete, false);
  assert.deepEqual(dashed.missingTickers, ['FBTC']);

  const blank = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['01 Nov 2026', '1.0', '2.0', '3.0'],
    ['02 Nov 2026', '4.0', '', '4.0'],
  ]), 'BTC').rows);
  assert.equal(blank.complete, false);
  assert.deepEqual(blank.missingTickers, ['FBTC']);

  const missingCell = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(
    `<table><tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>Total</th></tr><tr><td>01 Nov 2026</td><td>1.0</td><td>2.0</td><td>3.0</td></tr><tr><td>02 Nov 2026</td><td>4.0</td></tr></table>`,
    'BTC',
  ).rows);
  assert.equal(missingCell.date, '2026-11-02');
  assert.equal(missingCell.complete, false);
  assert.equal(missingCell.totalReady, false);
  assert.deepEqual(missingCell.missingTickers, ['FBTC']);
});

test('a trailing all-dash row is not the session, and a started row does not fall back', () => {
  const placeholder = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['02 Nov 2026', '1.5', '0.0', '1.5'],
    ['03 Nov 2026', '-', '-', '0.0'],
  ]), 'BTC').rows);
  assert.equal(placeholder.date, '2026-11-02');
  assert.equal(placeholder.complete, true);
  assert.deepEqual(placeholder.missingTickers, []);

  const started = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['02 Nov 2026', '1.5', '0.0', '1.5'],
    ['03 Nov 2026', '4.0', '-', '4.0'],
  ]), 'BTC').rows);
  assert.equal(started.date, '2026-11-03');
  assert.equal(started.complete, false);
  assert.deepEqual(started.missingTickers, ['FBTC']);
});

test('explicit zero fills an issuer cell, and a dash total does not', () => {
  const zeros = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['01 Nov 2026', '-', '1.0', '1.0'],
    ['02 Nov 2026', '0.0', '0', '0.0'],
  ]), 'BTC').rows);
  assert.equal(zeros.complete, true);
  assert.equal(zeros.totalReady, true);
  assert.deepEqual(zeros.missingTickers, []);

  const dashTotal = mod.assessLatestEtfSession(mod.parseFarsideEtfTable(btcSessionTable([
    ['02 Nov 2026', '1.0', '0.0', '-'],
  ]), 'BTC').rows);
  assert.equal(dashTotal.complete, false);
  assert.equal(dashTotal.totalReady, false);
  assert.deepEqual(dashTotal.missingTickers, []);
});

test('Farside parser falls back across tables and rejects invalid HTML without fake rows', () => {
  const invalid = mod.parseFarsideEtfTable('<main><h1>No data today</h1></main>', 'BTC');
  assert.equal(invalid.rows.length, 0);
  assert.match(invalid.warnings.join(' '), /ETF table not found/);
});

test('Farside fetch returns source_error state for invalid source output', async () => {
  const result = await mod.fetchBtcEtfFlows();
  assert.equal(result.ok, false);
  assert.equal(result.status, 'source_error');
  assert.match(result.message, /No BTC ETF flow values parsed|ETF table|Farside/);
});
