import { fetchText } from './http';
import type { SourceResult } from '../types';

export type EtfAsset = 'BTC' | 'ETH';
export type EtfFlowRow = { date: string; asset: EtfAsset; issuer: string; ticker: string; flowUsd: number | null; isTotal: boolean; rawValue: string; };
const URLS = { BTC: 'https://farside.co.uk/btc/', ETH: 'https://farside.co.uk/eth/' } as const;
const issuerMap: Record<string, string> = { ibit:'BlackRock', fbTC:'Fidelity', fbtc:'Fidelity', bitb:'Bitwise', arkb:'ARK 21Shares', btco:'Invesco Galaxy', ezbc:'Franklin', brtc:'Valkyrie', hodl:'VanEck', btcw:'WisdomTree', gbtc:'Grayscale GBTC', btc:'Grayscale BTC', mini:'Grayscale Mini', ethA:'BlackRock', etha:'BlackRock', feth:'Fidelity', ethw:'Bitwise', ceth:'21Shares', ethv:'VanEck', qeth:'Invesco Galaxy', ezet:'Franklin', ethe:'Grayscale ETHE', eth:'Grayscale Mini' };
export function normalizeEtfIssuer(value: string) { const key = value.trim().replace(/\s+/g, '').toLowerCase(); return issuerMap[key] || value.trim().replace(/\*+$/, '') || 'Unknown issuer'; }
function decode(s: string) { return s.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;|—|–/g,'-').replace(/<[^>]+>/g,'').trim(); }
function parseDate(input: string): string | null {
  const cleaned = input.replace(/\*/g,'').trim();
  const parsed = new Date(`${cleaned} UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
  const m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) { const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]); return new Date(Date.UTC(y, Number(m[2])-1, Number(m[1]))).toISOString().slice(0,10); }
  return null;
}
export function parseFlowValue(raw: string): number | null {
  const t = decode(raw).replace(/[$,]/g,'').trim();
  if (!t || /^(-|–|—|n\/?a|null)$/i.test(t)) return null;
  const paren = /^\((.*)\)$/.exec(t);
  const value = Number((paren ? paren[1] : t).replace(/[^\d.-]/g,''));
  if (!Number.isFinite(value)) return null;
  return (paren ? -value : value) * 1_000_000;
}
export function parseFarsideEtfTable(html: string, asset: EtfAsset): { rows: EtfFlowRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0] || html;
  const tr = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  if (!tr.length) return { rows: [], warnings: ['No table rows found in Farside HTML.'] };
  const headerCells = [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => decode(m[1]));
  const issuers = headerCells.slice(1).map((h) => h || 'Total');
  const rows: EtfFlowRow[] = [];
  for (const rowHtml of tr.slice(1)) {
    const cells = [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => decode(m[1]));
    if (cells.length < 2) continue;
    const date = parseDate(cells[0]);
    if (!date) { if (cells[0] && !/total/i.test(cells[0])) warnings.push(`Skipped row with unparsed date: ${cells[0]}`); continue; }
    for (let i = 1; i < cells.length; i++) {
      const ticker = issuers[i-1] || `col_${i}`;
      const isTotal = /total/i.test(ticker);
      const flowUsd = parseFlowValue(cells[i]);
      if (flowUsd == null && cells[i] && !/^(-|n\/?a)$/i.test(cells[i])) warnings.push(`Blank/unknown ETF value for ${ticker} on ${date}`);
      rows.push({ date, asset, issuer: isTotal ? 'Total' : normalizeEtfIssuer(ticker), ticker, flowUsd, isTotal, rawValue: cells[i] });
    }
  }
  return { rows, warnings };
}
export async function fetchEtfFlows(asset: EtfAsset): Promise<SourceResult<{ rows: EtfFlowRow[]; warnings: string[] }>> {
  const url = URLS[asset];
  try { const html = await fetchText(url); const parsed = parseFarsideEtfTable(html, asset); if (!parsed.rows.some((r)=>r.flowUsd !== null)) throw new Error(`No ${asset} ETF flow values parsed`); return { ok:true, data:parsed, source:'Farside Investors', url, rowsFetched: parsed.rows.length, warnings: parsed.warnings }; }
  catch(error:any){ return { ok:false, source:'Farside Investors', url, status:'source_error', message:error?.message || `${asset} Farside fetch failed` }; }
}
export const fetchBtcEtfFlows = () => fetchEtfFlows('BTC');
export const fetchEthEtfFlows = () => fetchEtfFlows('ETH');
