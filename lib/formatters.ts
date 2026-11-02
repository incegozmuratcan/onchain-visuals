export const formatCompactUsd = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value);
export const formatUsd = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export const formatNumber = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
export const formatCompactNumber = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(value);
export const formatPercent = (value?: number | null) => value == null ? 'N/A' : `${(value*100).toFixed(1)}%`;
export const formatSignedPercent = (value?: number | null) => value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
export const formatSignedUsd = (value?: number | null) => value == null ? 'N/A' : `${value >=0?'+':'-'}${formatCompactUsd(Math.abs(value))}`;

function flowSign(value: number) {
  return value < 0 ? "-" : "+";
}

/** Hero and cumulative ETF flows, always one decimal on compact units (for example -$643.2M, +$57.0B). */
export function formatFlowOneDecimal(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const abs = Math.abs(n);
  const compact = (divisor: number, suffix: string) => `${sign}$${(abs / divisor).toFixed(1)}${suffix}`;
  if (abs >= 1e12) return compact(1e12, "T");
  if (abs >= 1e9) return compact(1e9, "B");
  if (abs >= 1e6) return compact(1e6, "M");
  if (abs >= 1e3) return compact(1e3, "K");
  return `${sign}$${abs.toFixed(1)}`;
}

/** Issuer rows and the Largest chip: nearest whole million, still signed. */
export function formatFlowWholeMillions(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const millions = Math.round(Math.abs(n) / 1_000_000);
  if (millions >= 1000) return `${sign}$${(millions / 1000).toFixed(1)}B`;
  return `${sign}$${millions}M`;
}
export const formatFlow = formatSignedUsd;
export const formatTokenAmount = (v?:number|null)=>formatCompactNumber(v);
export const formatDate = (iso?: string | null) => !iso ? 'N/A' : new Date(iso).toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric', timeZone:'UTC'});
export const formatMonth = (iso?: string | null) => !iso ? 'N/A' : new Date(iso).toLocaleDateString('en-US',{month:'short', year:'numeric', timeZone:'UTC'});
export const formatTimeAgo = (iso?: string | null) => { if(!iso) return 'N/A'; const d=Date.now()-new Date(iso).getTime(); const h=Math.floor(d/3600000); if(h<1) return 'Updated just now'; if(h<24) return `Updated ${h}h ago`; return `Updated ${Math.floor(h/24)}d ago`; };
export const formatRankChange = (value?: number | null) => value == null ? 'Rank N/A' : `Rank ${value >= 0 ? '+' : ''}${value}`;
export const formatSourceLabel = (source: string, updatedAt: string) => `Source: ${source} · ${formatTimeAgo(updatedAt)}`;
export const formatAddress = (address?: string | null) => !address ? 'Unknown wallet' : `${address.slice(0,6)}...${address.slice(-4)}`;
export const formatTxHash = (hash?: string | null) => !hash ? 'N/A' : `${hash.slice(0,10)}...${hash.slice(-6)}`;
export const formatDataStatus = (status: string) => status.replaceAll('_',' ');
export const formatPeriod = (period?: string) => !period ? 'Default' : period.toUpperCase();
