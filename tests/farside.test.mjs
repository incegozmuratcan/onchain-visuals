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
