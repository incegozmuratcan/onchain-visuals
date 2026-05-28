import { fetchJson } from './http';
import type { SourceResult } from '../types';
export type BinancePrice = { symbol: string; price: number };
export async function fetchBinancePrice(asset: 'BTC'|'ETH'|'SOL'): Promise<SourceResult<BinancePrice>> {
  const symbol = `${asset}USDT`; const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
  try { const json:any = await fetchJson(url, { timeoutMs: 8000 }); const price = Number(json.price); if(!Number.isFinite(price)) throw new Error('Invalid Binance price'); return { ok:true, data:{ symbol, price }, source:'Binance spot ticker', url, rowsFetched:1 }; }
  catch(error:any){ return { ok:false, source:'Binance', url, status:'source_error', message:error?.message || 'Binance price fetch failed' }; }
}
export function liquidationConfigMissing() { return ['ENABLE_BINANCE_LIQUIDATION_PULSE'].filter((k)=>!process.env[k]); }
