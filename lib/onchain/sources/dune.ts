import { fetchJson } from './http';
import type { SourceResult } from '../types';
export type StablecoinNetTransferRow = { chain: string; inflow: number; outflow: number; net_flow: number; net_transfer_7d: number | null; net_transfer_30d: number | null; stablecoin_symbol: string | null; };
const num = (v: any) => typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
function missing() { return ['DUNE_API_KEY','DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID'].filter((k)=>!process.env[k]); }
export function normalizeDuneStablecoinRows(rows: any[]): StablecoinNetTransferRow[] {
  return (Array.isArray(rows) ? rows : []).map((r:any)=>({ chain:String(r.chain ?? r.blockchain ?? r.network ?? '').trim(), inflow:num(r.inflow ?? r.inflows ?? r.gross_inflow), outflow:num(r.outflow ?? r.outflows ?? r.gross_outflow), net_flow:num(r.net_flow ?? r.net_transfer ?? r.net_transfers), net_transfer_7d:r.net_transfer_7d == null ? null : num(r.net_transfer_7d), net_transfer_30d:r.net_transfer_30d == null ? null : num(r.net_transfer_30d), stablecoin_symbol:r.stablecoin_symbol ?? r.symbol ?? null })).filter((r)=>r.chain);
}
export async function fetchStablecoinNetTransfersLatest(): Promise<SourceResult<StablecoinNetTransferRow[]>> {
  const miss = missing();
  if (miss.length) return { ok:false, source:'Dune', url:null, status:'source_config_required', message:'Dune latest-result credentials are missing.', missingConfig: miss };
  const queryId = process.env.DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID!;
  const url = `https://api.dune.com/api/v1/query/${queryId}/results`;
  try { const json:any = await fetchJson(url, { headers: { 'X-Dune-API-Key': process.env.DUNE_API_KEY! }, timeoutMs: 15000 }); const rows = normalizeDuneStablecoinRows(json.result?.rows || json.rows || []); if(!rows.length) throw new Error('Dune latest-result response contained no normalized stablecoin rows'); return { ok:true, data:rows, source:'Dune latest result', url, rowsFetched:rows.length }; }
  catch(error:any){ return { ok:false, source:'Dune', url, status:'source_error', message:error?.message || 'Dune latest-result fetch failed' }; }
}
