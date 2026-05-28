import { fetchText } from './http';
import type { SourceResult } from '../types';

export type EtfAsset = 'BTC' | 'ETH';
export type EtfFlowRow = { date: string; asset: EtfAsset; issuer: string; ticker: string; flowUsd: number | null; isTotal: boolean; rawValue: string; };

type ParsedTable = { rows: EtfFlowRow[]; warnings: string[]; score: number; tableIndex: number; totalColumn: number | null };

const URLS = {
  BTC: ['https://farside.co.uk/bitcoin-etf-flow-all-data/', 'https://farside.co.uk/btc/'],
  ETH: ['https://farside.co.uk/ethereum-etf-flow-all-data/'],
} as const;

const issuerMap: Record<string, { ticker: string; issuer: string }> = {
  ibit: { ticker: 'IBIT', issuer: 'BlackRock' },
  blackrock: { ticker: 'IBIT', issuer: 'BlackRock' },
  fbtc: { ticker: 'FBTC', issuer: 'Fidelity' },
  fidelity: { ticker: 'FBTC', issuer: 'Fidelity' },
  bitb: { ticker: 'BITB', issuer: 'Bitwise' },
  bitwise: { ticker: 'BITB', issuer: 'Bitwise' },
  arkb: { ticker: 'ARKB', issuer: 'ARK 21Shares' },
  ark21shares: { ticker: 'ARKB', issuer: 'ARK 21Shares' },
  'ark21share': { ticker: 'ARKB', issuer: 'ARK 21Shares' },
  gbtc: { ticker: 'GBTC', issuer: 'Grayscale GBTC' },
  grayscalegbtc: { ticker: 'GBTC', issuer: 'Grayscale GBTC' },
  btc: { ticker: 'BTC', issuer: 'Grayscale Mini' },
  btcm: { ticker: 'BTC', issuer: 'Grayscale Mini' },
  btcmini: { ticker: 'BTC', issuer: 'Grayscale Mini' },
  grayscalemini: { ticker: 'BTC', issuer: 'Grayscale Mini' },
  grayscalebtcmini: { ticker: 'BTC', issuer: 'Grayscale Mini' },
  hodl: { ticker: 'HODL', issuer: 'VanEck' },
  vaneck: { ticker: 'HODL', issuer: 'VanEck' },
  ezbc: { ticker: 'EZBC', issuer: 'Franklin' },
  franklin: { ticker: 'EZBC', issuer: 'Franklin' },
  btco: { ticker: 'BTCO', issuer: 'Invesco Galaxy' },
  invescogalaxy: { ticker: 'BTCO', issuer: 'Invesco Galaxy' },
  btcw: { ticker: 'BTCW', issuer: 'WisdomTree' },
  wisdomtree: { ticker: 'BTCW', issuer: 'WisdomTree' },
  brrr: { ticker: 'BRRR', issuer: 'Valkyrie' },
  brtc: { ticker: 'BRRR', issuer: 'Valkyrie' },
  valkyrie: { ticker: 'BRRR', issuer: 'Valkyrie' },
  etha: { ticker: 'ETHA', issuer: 'BlackRock' },
  feth: { ticker: 'FETH', issuer: 'Fidelity' },
  ethw: { ticker: 'ETHW', issuer: 'Bitwise' },
  ceth: { ticker: 'CETH', issuer: '21Shares' },
  ethv: { ticker: 'ETHV', issuer: 'VanEck' },
  qeth: { ticker: 'QETH', issuer: 'Invesco Galaxy' },
  ezet: { ticker: 'EZET', issuer: 'Franklin' },
  ethe: { ticker: 'ETHE', issuer: 'Grayscale ETHE' },
  eth: { ticker: 'ETH', issuer: 'Grayscale Mini' },
};

const knownIssuerKeys = Object.keys(issuerMap);

function keyFor(value: string) { return decode(value).replace(/\*+/g, '').replace(/ETF|Trust|Bitcoin|Ethereum|Fund/gi, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); }
export function normalizeEtfIssuer(value: string) { return normalizeIssuer(value).issuer; }
function normalizeIssuer(value: string) {
  const clean = decode(value).replace(/\*+$/g, '').trim();
  const direct = issuerMap[keyFor(clean)] || issuerMap[clean.toLowerCase()];
  if (direct) return direct;
  const upper = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fromTicker = issuerMap[upper.toLowerCase()];
  if (fromTicker) return fromTicker;
  return { ticker: upper || clean || 'UNKNOWN', issuer: clean || 'Unknown issuer' };
}
function decode(s: string) { return s.replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&#8212;|&ndash;|&mdash;|—|–/g,'-').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }
function parseDate(input: string): string | null {
  const cleaned = decode(input).replace(/\*/g,'').replace(/^[A-Za-z]+,\s*/, '').trim();
  const parsed = new Date(`${cleaned} UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
  const m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) { const y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]); return new Date(Date.UTC(y, Number(m[2])-1, Number(m[1]))).toISOString().slice(0,10); }
  return null;
}
export function parseFlowValue(raw: string): number | null {
  let t = decode(raw).replace(/[$,]/g,'').trim();
  if (!t || /^(-|–|—|n\/?a|null|pending|awaiting|tbc|\.)$/i.test(t)) return null;
  const paren = /^\((.*)\)$/.exec(t);
  if (paren) t = paren[1];
  const value = Number(t.replace(/[^\d.-]/g,''));
  if (!Number.isFinite(value)) return null;
  return (paren ? -value : value) * 1_000_000;
}
function cellsFromRow(rowHtml: string) { return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => decode(m[1])); }
function splitTables(html: string) { const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]); return tables.length ? tables : [html]; }
function isTotalHeader(value: string) { return /^(total|net\s*flow|net|total\s*net\s*flow|flow)$/i.test(decode(value).replace(/\*/g,'').trim()); }
function issuerScore(headers: string[], asset: EtfAsset) {
  const expected = asset === 'BTC' ? ['ibit','fbtc','bitb','arkb','gbtc','btc','hodl','ezbc','btco','btcw','brrr','brtc'] : ['etha','feth','ethw','ceth','ethv','qeth','ezet','ethe','eth'];
  return headers.reduce((score, h) => score + (expected.includes(keyFor(h)) || expected.includes(h.toLowerCase()) || knownIssuerKeys.includes(keyFor(h)) ? 1 : 0), 0);
}
function parseSingleTable(table: string, asset: EtfAsset, tableIndex: number): ParsedTable {
  const warnings: string[] = [];
  const tr = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  if (!tr.length) return { rows: [], warnings: ['No table rows found in Farside HTML.'], score: 0, tableIndex, totalColumn: null };
  const headerIndex = tr.findIndex((rowHtml) => {
    const cells = cellsFromRow(rowHtml);
    return cells.length > 2 && /date/i.test(cells[0]) && (cells.some(isTotalHeader) || issuerScore(cells.slice(1), asset) >= 2);
  });
  if (headerIndex < 0) return { rows: [], warnings: ['No Date + issuer ETF table header found.'], score: 0, tableIndex, totalColumn: null };
  const headerCells = cellsFromRow(tr[headerIndex]);
  const dataHeaders = headerCells.slice(1);
  const totalIdx = dataHeaders.findIndex(isTotalHeader);
  const rows: EtfFlowRow[] = [];
  let parsedValues = 0;
  let skippedRows = 0;
  for (const rowHtml of tr.slice(headerIndex + 1)) {
    const cells = cellsFromRow(rowHtml);
    if (cells.length < 2) continue;
    const date = parseDate(cells[0]);
    if (!date) { if (cells[0] && !/total|date/i.test(cells[0])) skippedRows++; continue; }
    for (let i = 1; i < Math.min(cells.length, headerCells.length); i++) {
      const header = dataHeaders[i - 1] || `col_${i}`;
      const isTotal = i - 1 === totalIdx || isTotalHeader(header);
      const value = parseFlowValue(cells[i]);
      if (value != null) parsedValues++;
      else if (cells[i] && !/^(-|n\/?a|pending|awaiting|tbc|\.)$/i.test(cells[i])) warnings.push(`Unknown ETF value for ${header} on ${date}`);
      const normalized = isTotal ? { ticker: 'Total', issuer: 'Total' } : normalizeIssuer(header);
      rows.push({ date, asset, issuer: normalized.issuer, ticker: normalized.ticker, flowUsd: value, isTotal, rawValue: cells[i] });
    }
  }
  if (skippedRows) warnings.push(`Skipped ${skippedRows} non-date Farside rows.`);
  const totalRows = rows.filter((r) => r.isTotal).length;
  const uniqueDates = new Set(rows.map((r) => r.date)).size;
  const score = parsedValues + totalRows * 5 + uniqueDates * 2 + issuerScore(dataHeaders, asset) * 10;
  return { rows, warnings, score, tableIndex, totalColumn: totalIdx >= 0 ? totalIdx + 1 : null };
}
export function parseFarsideEtfTable(html: string, asset: EtfAsset): { rows: EtfFlowRow[]; warnings: string[] } {
  const parsed = splitTables(html).map((table, index) => parseSingleTable(table, asset, index)).sort((a, b) => b.score - a.score)[0];
  if (!parsed || !parsed.rows.length) return { rows: [], warnings: ['ETF table not found in Farside HTML.'] };
  const validValues = parsed.rows.filter((r) => r.flowUsd != null).length;
  const totalValues = parsed.rows.filter((r) => r.isTotal && r.flowUsd != null).length;
  const warnings = [...parsed.warnings];
  if (!totalValues) warnings.push('No Total/Net Flow column with parsed values was found.');
  if (!validValues) warnings.push(`No ${asset} ETF flow values parsed.`);
  if (parsed.tableIndex > 0) warnings.push(`Selected Farside table ${parsed.tableIndex + 1} after scanning all tables.`);
  return { rows: parsed.rows, warnings };
}
function extractBtcAllDataLink(html: string) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const match = hrefs.find((h) => /bitcoin-etf-flow-all-data|btc.*all-data/i.test(h));
  if (!match) return null;
  return new URL(match, 'https://farside.co.uk/').toString();
}
export async function fetchEtfFlows(asset: EtfAsset): Promise<SourceResult<{ rows: EtfFlowRow[]; warnings: string[] }>> {
  const candidates = [...URLS[asset]];
  let lastError: string | null = null;
  for (const url of candidates) {
    try {
      const html = await fetchText(url, { timeoutMs: 10000, retries: 2, headers: { 'user-agent': 'Mozilla/5.0 (compatible; OnchainVisuals/1.0; +https://onchain-visuals.local)' } });
      const preferred = asset === 'BTC' ? extractBtcAllDataLink(html) : null;
      if (preferred && !candidates.includes(preferred as any)) candidates.unshift(preferred as any);
      const parsed = parseFarsideEtfTable(html, asset);
      if (!parsed.rows.some((r)=>r.flowUsd !== null)) throw new Error(`No ${asset} ETF flow values parsed`);
      if (!parsed.rows.some((r)=>r.isTotal && r.flowUsd !== null)) throw new Error(`${asset} ETF Total/Net Flow column not parsed`);
      return { ok:true, data:parsed, source:'Farside Investors', url, rowsFetched: parsed.rows.length, warnings: parsed.warnings };
    } catch(error:any){ lastError = error?.message || `${asset} Farside fetch failed`; }
  }
  return { ok:false, source:'Farside Investors', url:candidates[0], status:'source_error', message:lastError || `Unexpected Farside layout for ${asset} ETF flows` };
}
export const fetchBtcEtfFlows = () => fetchEtfFlows('BTC');
export const fetchEthEtfFlows = () => fetchEtfFlows('ETH');
