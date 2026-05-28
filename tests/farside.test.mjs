import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../lib/onchain/sources/farside.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace("import { fetchText } from './http';", "const fetchText = async()=>'';"), { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022 }}).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('Farside parser fixture handles dates, negatives, blanks, issuer normalization', () => { const html = `<table><tr><th>Date</th><th>IBIT</th><th>GBTC</th><th>Total</th></tr><tr><td>01 Jan 2026</td><td>10.5</td><td>(2.5)</td><td>8.0</td></tr><tr><td>02 Jan 2026</td><td>-</td><td></td><td>(1.0)</td></tr></table>`; const { rows } = mod.parseFarsideEtfTable(html, 'BTC'); assert.equal(rows.find((r)=>r.issuer==='BlackRock').flowUsd, 10_500_000); assert.equal(rows.find((r)=>r.issuer==='Grayscale GBTC').flowUsd, -2_500_000); assert.equal(rows.find((r)=>r.isTotal).date, '2026-01-01'); assert.equal(rows.find((r)=>r.date==='2026-01-02' && r.ticker==='IBIT').flowUsd, null); });
