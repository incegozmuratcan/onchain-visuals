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

/** One compact decimal on every unit, including billions (for example -$643.2M, +$57.0B). */
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

/**
 * Hero, prior-day, and cumulative amounts on the combined ETF card.
 * Millions keep one decimal. Absolute values of at least $1B use two decimals (for example +$54.89B, -$1.28B).
 */
export function formatFlowCardAmount(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(1)}`;
}

/** Issuer rows: nearest whole million, or two-decimal billions when the absolute value is at least $1B. */
export function formatFlowWholeMillions(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  return `${sign}$${Math.round(abs / 1_000_000)}M`;
}
export const formatFlow = formatSignedUsd;

const SHARE_UPDATED_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Share-card footer clock: "Nov 13, 2026, 02:02 PM UTC". */
export function formatShareUpdated(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = SHARE_UPDATED_MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const hour24 = date.getUTCHours();
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour = String(hour24 % 12 || 12).padStart(2, "0");
  return `${month} ${day}, ${year}, ${hour}:${minutes} ${ampm} UTC`;
}
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
