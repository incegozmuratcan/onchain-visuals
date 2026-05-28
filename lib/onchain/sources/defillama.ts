import { fetchJson } from './http';
import type { SourceResult } from '../types';

const API = 'https://api.llama.fi';
const STABLE = 'https://stablecoins.llama.fi';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
const arr = (v: any) => Array.isArray(v) ? v : [];

type Row = Record<string, any>;

const CHAIN_ALIASES: Record<string, string> = {
  eth: 'Ethereum', ethereum: 'Ethereum', tron: 'Tron', solana: 'Solana', base: 'Base', bsc: 'BNB Chain', 'binance smart chain': 'BNB Chain', bnb: 'BNB Chain',
  arbitrum: 'Arbitrum', 'arbitrum one': 'Arbitrum', polygon: 'Polygon', matic: 'Polygon', avalanche: 'Avalanche', avax: 'Avalanche', optimism: 'Optimism', op: 'Optimism',
  bitcoin: 'Bitcoin', btc: 'Bitcoin', linea: 'Linea', sui: 'Sui', aptos: 'Aptos', ton: 'TON', near: 'Near', cardano: 'Cardano', zksync: 'zkSync Era', 'zk sync era': 'zkSync Era',
  starknet: 'Starknet', scroll: 'Scroll', mantle: 'Mantle', blast: 'Blast', celo: 'Celo', gnosis: 'Gnosis', fantom: 'Fantom', sonic: 'Sonic', plasma: 'Plasma', sei: 'Sei',
};
const PROTOCOL_ONLY = new Set(['tether', 'circle', 'circle usdc', 'pump.fun', 'pumpfun', 'grayscale', 'grayscale btc', 'polymarket international', 'hyperliquid perps', 'canton']);
const OFFCHAIN = new Set(['off chain', 'off-chain', 'offchain', 'cex', 'centralized exchange']);

export function normalizeChainName(value: unknown): string | null {
  const raw = String(value || '').replace(/_/g, ' ').trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, ' ');
  if (OFFCHAIN.has(key)) return null;
  if (PROTOCOL_ONLY.has(key)) return null;
  return CHAIN_ALIASES[key] || raw.replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeOverview(protocols: any[], kind: 'revenue'|'dex'|'perp') {
  return arr(protocols).map((p: any) => ({
    name: p.name || p.displayName || p.protocol || p.module || 'Unknown',
    chain: p.chain || p.chains?.[0] || p.category || 'Multi-chain',
    category: p.category || kind,
    value24h: num(p.total24h ?? p.dailyVolume ?? p.dailyRevenue ?? p.revenue24h ?? p.totalDataChart?.at?.(-1)?.[1]),
    value7d: num(p.total7d ?? p.weeklyVolume ?? p.weeklyRevenue ?? p.revenue7d),
    value30d: num(p.total30d ?? p.monthlyVolume ?? p.monthlyRevenue ?? p.revenue30d),
    openInterest: num(p.openInterest ?? p.totalOpenInterest ?? p.oi),
  })).filter((r) => r.value24h || r.value7d || r.value30d || r.openInterest);
}

function addWindow(row: Row, days: number, amount: number) {
  if (days <= 1) row.value24h += amount;
  if (days <= 7) row.value7d += amount;
  if (days <= 30) row.value30d += amount;
}

function flattenBreakdownValue(value: any, into: Map<string, Row>, daysFromLatest: number) {
  if (!value || typeof value !== 'object') return;
  for (const [key, raw] of Object.entries(value)) {
    const chain = normalizeChainName(key);
    if (typeof raw === 'number' || typeof raw === 'string') {
      if (!chain) continue;
      const amount = num(raw);
      if (!amount) continue;
      const row = into.get(chain) || { name: chain, chain, value24h: 0, value7d: 0, value30d: 0, category: 'chain_fees' };
      addWindow(row, daysFromLatest, amount);
      into.set(chain, row);
      continue;
    }
    if (raw && typeof raw === 'object') {
      if (chain && ('total' in raw || 'fees' in raw || 'revenue' in raw)) {
        const amount = num((raw as any).total ?? (raw as any).fees ?? (raw as any).revenue);
        const row = into.get(chain) || { name: chain, chain, value24h: 0, value7d: 0, value30d: 0, category: 'chain_fees' };
        addWindow(row, daysFromLatest, amount);
        into.set(chain, row);
      } else {
        flattenBreakdownValue(raw, into, daysFromLatest);
      }
    }
  }
}

export function normalizeChainFeesFromBreakdown(json: any): Row[] {
  const rows = new Map<string, Row>();
  const points = arr(json.totalDataChartBreakdown || json.totalDataChart || json.feesDataChartBreakdown);
  const latestTs = Math.max(...points.map((p:any)=>num(p?.[0] ?? p?.date)).filter(Boolean));
  for (const point of points) {
    const ts = num(point?.[0] ?? point?.date);
    const daysFromLatest = latestTs && ts ? Math.floor((latestTs - ts) / 86400) + 1 : 1;
    if (daysFromLatest > 30) continue;
    const payload = point?.[1] ?? point?.breakdown ?? point?.data;
    flattenBreakdownValue(payload, rows, daysFromLatest);
  }
  return [...rows.values()].filter((r) => r.value24h || r.value7d || r.value30d);
}

export async function fetchChainRevenue(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/fees?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false&dataType=dailyFees`;
  try {
    const json: any = await fetchJson(url);
    const rows = normalizeChainFeesFromBreakdown(json);
    if (!rows.length) throw new Error('DefiLlama chain fee breakdown was unavailable; refusing to reuse protocol revenue as chain data');
    return { ok: true, data: rows, source: 'DefiLlama chain fees', url, rowsFetched: rows.length };
  } catch (error: any) { return { ok: false, source: 'DefiLlama chain fees', url, status: 'source_error', message: error?.message || 'DefiLlama chain fees fetch failed' }; }
}

export async function fetchProtocolRevenue(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`;
  try { const json: any = await fetchJson(url); const rows = normalizeOverview(json.protocols, 'revenue'); if (!rows.length) throw new Error('No protocol revenue rows'); return { ok:true, data:rows, source:'DefiLlama protocol revenue', url, rowsFetched: rows.length }; }
  catch (error:any) { return { ok:false, source:'DefiLlama protocol revenue', url, status:'source_error', message:error?.message || 'DefiLlama protocol revenue fetch failed' }; }
}

export async function fetchStablecoinSupplyByChain(): Promise<SourceResult<Row[]>> {
  const url = `${STABLE}/stablecoins?includePrices=true`;
  try {
    const json: any = await fetchJson(url);
    const byChain = new Map<string, { name:string; chain: string; supply: number; value: number; value24h:number; value7d:number; value30d:number; usdc: number; usdt: number }>();
    for (const asset of arr(json.peggedAssets)) {
      const symbol = String(asset.symbol || asset.name || '').toUpperCase();
      for (const [chainRaw, value] of Object.entries(asset.chainCirculating || {})) {
        const chain = normalizeChainName(chainRaw);
        const current = num((value as any)?.current?.peggedUSD ?? (value as any)?.current ?? value);
        if (!chain || !current) continue;
        const row = byChain.get(chain) || { name: chain, chain, supply: 0, value:0, value24h:0, value7d:0, value30d:0, usdc: 0, usdt: 0 };
        row.supply += current; row.value += current; row.value24h += current; row.value7d += current; row.value30d += current;
        if (symbol.includes('USDC')) row.usdc += current;
        if (symbol.includes('USDT')) row.usdt += current;
        byChain.set(chain, row);
      }
    }
    const rows = [...byChain.values()].filter((r) => r.supply > 0);
    if (!rows.length) throw new Error('DefiLlama stablecoin response did not include chain supplies');
    return { ok: true, data: rows, source: 'DefiLlama', url, rowsFetched: rows.length };
  } catch (error: any) { return { ok: false, source: 'DefiLlama', url, status: 'source_error', message: error?.message || 'DefiLlama stablecoin fetch failed' }; }
}

export async function fetchDexProtocols(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`;
  try { const json: any = await fetchJson(url); const rows = normalizeOverview(json.protocols, 'dex'); if (!rows.length) throw new Error('No DEX protocol rows'); return { ok:true, data:rows, source:'DefiLlama', url, rowsFetched: rows.length }; }
  catch (error:any) { return { ok:false, source:'DefiLlama', url, status:'source_error', message:error?.message || 'DefiLlama DEX fetch failed' }; }
}

export async function fetchDexVolumeByChain(): Promise<SourceResult<Row[]>> {
  const result = await fetchDexProtocols();
  if (!result.ok) return result;
  const chains = new Map<string, any>();
  for (const row of result.data) {
    const key = normalizeChainName(row.chain);
    if (!key) continue;
    const current = chains.get(key) || { name: key, chain: key, value24h: 0, value7d: 0, value30d: 0 };
    current.value24h += row.value24h; current.value7d += row.value7d; current.value30d += row.value30d;
    chains.set(key, current);
  }
  const rows = [...chains.values()].filter((r) => r.value24h || r.value7d || r.value30d);
  return { ok:true, data:rows, source:'DefiLlama', url:result.url, rowsFetched: rows.length };
}

export async function fetchPerpProtocols(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`;
  try { const json: any = await fetchJson(url); const rows = normalizeOverview(json.protocols, 'perp'); if (!rows.length) throw new Error('No derivatives rows'); return { ok:true, data:rows, source:'DefiLlama derivatives', url, rowsFetched: rows.length }; }
  catch (error:any) { return { ok:false, source:'DefiLlama derivatives', url, status:'source_error', message:error?.message || 'DefiLlama derivatives fetch failed' }; }
}

export async function fetchCexTransparency(): Promise<SourceResult<Row[]>> {
  const url = `${API}/cexs`;
  try {
    const json: any = await fetchJson(url);
    const sourceRows = arr(json.cexs || json.dexs || json.protocols || json);
    const rows = sourceRows.map((x:any)=>({
      name:x.name || x.exchange || x.slug || 'Exchange', exchange:x.name || x.exchange || x.slug || 'Exchange',
      assets:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets ?? x.cleanTvl), cleanAssets:num(x.cleanTvl ?? x.cleanAssets),
      inflows:num(x.change_1d ?? x.inflows), value24h:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets ?? x.cleanTvl),
      value7d:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets ?? x.cleanTvl), value30d:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets ?? x.cleanTvl)
    })).filter((r:any)=>r.assets || r.value24h);
    if(!rows.length) throw new Error('No CEX transparency rows');
    return {ok:true,data:rows,source:'DefiLlama CEX transparency',url,rowsFetched:rows.length};
  }
  catch(error:any){ return {ok:false,source:'DefiLlama CEX transparency',url,status:'source_error',message:error?.message || 'DefiLlama CEX fetch failed'}; }
}
