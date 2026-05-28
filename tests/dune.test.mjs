import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../lib/onchain/sources/dune.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace("import { fetchJson } from './http';", "const fetchJson = async()=>({result:{rows:[]}});"), { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022 }}).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('Dune stablecoin latest-result normalizes expected schema', () => { const rows = mod.normalizeDuneStablecoinRows([{blockchain:'Ethereum', inflows:'100', outflows:'40', net_transfer:'60', net_transfer_7d:'70', symbol:'USDC'}]); assert.deepEqual(rows[0], { chain:'Ethereum', inflow:100, outflow:40, net_flow:60, net_transfer_7d:70, net_transfer_30d:null, stablecoin_symbol:'USDC' }); });
