import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

async function importSource(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
  const js = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.ES2022, target:ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const farside = await importSource('../lib/onchain/sources/farside.ts', { "import { fetchText } from './http';": "const fetchText = async()=>'';" });
const defillama = await importSource('../lib/onchain/sources/defillama.ts', { "import { fetchJson } from './http';": "const fetchJson = async()=>({});" });
const registry = await readFile(new URL('../lib/onchain/registry.ts', import.meta.url), 'utf8');
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');
const chartShell = await readFile(new URL('../components/onchain/ChartShell.tsx', import.meta.url), 'utf8');
const client = await readFile(new URL('../components/onchain/DatasetChartClient.tsx', import.meta.url), 'utf8');
const defillamaSource = await readFile(new URL('../lib/onchain/sources/defillama.ts', import.meta.url), 'utf8');
const templates = await Promise.all(['../components/onchain/templates/LeaderboardBarChart.tsx','../components/onchain/templates/EtfFlowboard.tsx','../components/onchain/templates/BtcEthEtfComparison.tsx','../components/onchain/templates/SpecialBoards.tsx'].map((f)=>readFile(new URL(f, import.meta.url),'utf8'))).then((x)=>x.join('\n'));

test('Farside parser handles BTC and ETH fixtures with tolerant headers', () => {
  const btcHtml = `<table><tr><td>noise</td></tr><tr><th>Date</th><th>IBIT</th><th>GBTC</th><th>Total</th></tr><tr><td>01 Jan 2026</td><td>10.5</td><td>(2.5)</td><td>8.0</td></tr></table>`;
  const ethHtml = `<table><tr><th>Date</th><th>ETHA</th><th>FETH</th><th>Net Flow</th></tr><tr><td>02/01/2026</td><td>3</td><td>-</td><td>3</td></tr></table>`;
  const btc = farside.parseFarsideEtfTable(btcHtml, 'BTC').rows;
  const eth = farside.parseFarsideEtfTable(ethHtml, 'ETH').rows;
  assert.equal(btc.find((r)=>r.issuer==='BlackRock').flowUsd, 10_500_000);
  assert.equal(btc.find((r)=>r.issuer==='Grayscale GBTC').flowUsd, -2_500_000);
  assert.equal(eth.find((r)=>r.issuer==='BlackRock').flowUsd, 3_000_000);
  assert.ok(eth.some((r)=>r.isTotal && r.flowUsd === 3_000_000));
});

test('chain fee normalization excludes protocol-only entities and Off Chain', () => {
  const rows = defillama.normalizeChainFeesFromBreakdown({ totalDataChartBreakdown:[[1000,{ Ethereum:100, Tron:80, 'Circle USDC':999, 'Off Chain':200, 'pump.fun':123 }],[86500,{ Solana:50, Base:40, Grayscale:7 }]] });
  const names = rows.map((r)=>r.name);
  assert.deepEqual(names.sort(), ['Base','Ethereum','Solana','Tron'].sort());
  for (const bad of ['Tether','Circle USDC','pump.fun','Grayscale','Polymarket International','Off Chain']) assert.equal(names.includes(bad), false);
});

test('DEX chain normalization filters Off Chain', () => {
  assert.equal(defillama.normalizeChainName('Off Chain'), null);
  assert.equal(defillama.normalizeChainName('bsc'), 'BNB Chain');
});

test('chain and protocol builders use different DefiLlama methods', () => {
  assert.match(defillamaSource, /fetchChainRevenue[\s\S]*dataType=dailyFees[\s\S]*fetchProtocolRevenue[\s\S]*dataType=dailyRevenue/);
  assert.match(snapshots, /chain fees/);
});

test('static export preview has exact dimensions and responsive frame', () => {
  for (const fmt of ['1600x900','1200x1200','1080x1350','1440x1080']) assert.match(chartShell, new RegExp(fmt));
  assert.match(chartShell, /data-export-width/);
  assert.match(chartShell, /data-testid="responsive-preview-frame"/);
  assert.match(chartShell, /data-static-share="true"/);
  assert.match(chartShell, /datasetSlug === 'btc-etf-flowboard'/);
  assert.match(chartShell, /singleFormat \? null : <ExportFormatSelector/);
});

test('non-active snapshots render state cards before chart templates', () => {
  assert.match(client, /source_error[\s\S]*SourceErrorState/);
  assert.match(client, /source_config_required[\s\S]*SourceConfigRequiredState/);
  assert.match(client, /disabled[\s\S]*DisabledState/);
  assert.match(client, /Empty chart panels are suppressed/);
});

test('static chart templates disable tooltips and active hover bars', async () => {
  assert.equal(/<Tooltip\b/.test(templates), false);
  assert.match(templates, /activeBar=\{false as any\}/);
  assert.match(templates, /isAnimationActive=\{false\}/);
  assert.equal(/<Tooltip\b/.test(await readFile(new URL('../components/onchain/templates/EtfFlowboard.tsx', import.meta.url), 'utf8')), false);
});

test('registry keeps config/disabled datasets out of active promotion', () => {
  for (const slug of ['stablecoin-net-transfers-by-chain','monthly-unlock-watch','large-holders-board','whale-transfers','binance-liquidation-pulse','digital-asset-treasuries']) {
    const block = registry.match(new RegExp(`slug:'${slug}'[\\s\\S]*?supportedPeriods:\[[^\]]+\]`))?.[0] || '';
    assert.doesNotMatch(block, /status:'active'/, slug);
  }
});

test('stablecoin values and no generic empty chart policy are encoded', () => {
  assert.match(snapshots + templates, /formatCompactUsd|notation:'compact'/);
  assert.match(chartShell + client, /No fake data is emitted|No fake data is shown/);
});
