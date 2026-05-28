import { fetchJson } from './http';
import type { SourceResult } from '../types';

const API = 'https://api.llama.fi';
const STABLE = 'https://stablecoins.llama.fi';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
const arr = (v: any) => Array.isArray(v) ? v : [];

type Row = Record<string, any>;
function normalizeOverview(protocols: any[], kind: 'revenue'|'dex'|'perp') {
  return arr(protocols).map((p: any) => ({
    name: p.name || p.displayName || p.protocol || p.module || 'Unknown',
    chain: p.chain || p.chains?.[0] || p.category || 'Multi-chain',
    category: p.category || kind,
    value24h: num(p.total24h ?? p.dailyVolume ?? p.dailyRevenue ?? p.revenue24h),
    value7d: num(p.total7d ?? p.weeklyVolume ?? p.weeklyRevenue ?? p.revenue7d),
    value30d: num(p.total30d ?? p.monthlyVolume ?? p.monthlyRevenue ?? p.revenue30d),
    openInterest: num(p.openInterest ?? p.totalOpenInterest ?? p.oi),
  })).filter((r) => r.value24h || r.value7d || r.value30d || r.openInterest);
}

export async function fetchChainRevenue(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`;
  try {
    const json: any = await fetchJson(url);
    const rows = normalizeOverview(json.protocols, 'revenue').map((r) => ({ ...r, chain: r.name }));
    if (!rows.length) throw new Error('DefiLlama revenue response did not include protocol rows');
    return { ok: true, data: rows, source: 'DefiLlama', url, rowsFetched: rows.length };
  } catch (error: any) { return { ok: false, source: 'DefiLlama', url, status: 'source_error', message: error?.message || 'DefiLlama revenue fetch failed' }; }
}

export async function fetchProtocolRevenue(): Promise<SourceResult<Row[]>> { return fetchChainRevenue(); }

export async function fetchStablecoinSupplyByChain(): Promise<SourceResult<Row[]>> {
  const url = `${STABLE}/stablecoins?includePrices=true`;
  try {
    const json: any = await fetchJson(url);
    const byChain = new Map<string, { chain: string; supply: number; usdc: number; usdt: number }>();
    for (const asset of arr(json.peggedAssets)) {
      const symbol = String(asset.symbol || asset.name || '').toUpperCase();
      for (const [chain, value] of Object.entries(asset.chainCirculating || {})) {
        const current = num((value as any)?.current?.peggedUSD ?? (value as any)?.current ?? value);
        if (!current) continue;
        const row = byChain.get(chain) || { chain, supply: 0, usdc: 0, usdt: 0 };
        row.supply += current;
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
    const key = row.chain || 'Multi-chain';
    const current = chains.get(key) || { name: key, chain: key, value24h: 0, value7d: 0, value30d: 0 };
    current.value24h += row.value24h; current.value7d += row.value7d; current.value30d += row.value30d;
    chains.set(key, current);
  }
  const rows = [...chains.values()].filter((r) => r.value24h || r.value7d || r.value30d);
  return { ok:true, data:rows, source:'DefiLlama', url:result.url, rowsFetched: rows.length };
}

export async function fetchPerpProtocols(): Promise<SourceResult<Row[]>> {
  const url = `${API}/overview/derivatives?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`;
  try { const json: any = await fetchJson(url); const rows = normalizeOverview(json.protocols, 'perp'); if (!rows.length) throw new Error('No derivatives rows'); return { ok:true, data:rows, source:'DefiLlama', url, rowsFetched: rows.length }; }
  catch (error:any) { return { ok:false, source:'DefiLlama', url, status:'source_error', message:error?.message || 'DefiLlama derivatives fetch failed' }; }
}

export async function fetchCexTransparency(): Promise<SourceResult<Row[]>> {
  const url = `${API}/cexs`;
  try { const json: any = await fetchJson(url); const rows = arr(json.cexs || json).map((x:any)=>({ name:x.name || x.exchange || 'Exchange', exchange:x.name || x.exchange || 'Exchange', assets:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets), cleanAssets:num(x.cleanTvl ?? x.cleanAssets), inflows:num(x.change_1d ?? x.inflows), value24h:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets), value7d:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets), value30d:num(x.tvl ?? x.totalAssets ?? x.assets ?? x.cleanAssets)})).filter((r:any)=>r.assets); if(!rows.length) throw new Error('No CEX rows'); return {ok:true,data:rows,source:'DefiLlama',url,rowsFetched:rows.length}; }
  catch(error:any){ return {ok:false,source:'DefiLlama',url,status:'source_error',message:error?.message || 'DefiLlama CEX fetch failed'}; }
}
