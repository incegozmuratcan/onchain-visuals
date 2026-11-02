export const formatSignedPercent=(value)=> value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
export const formatCompactUsd=(value)=> value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value);
export const formatSignedUsd=(value)=> value == null ? 'N/A' : `${value >=0?'+':'-'}${formatCompactUsd(Math.abs(value))}`;
function flowSign(value) { return value < 0 ? "-" : "+"; }
export function formatFlowOneDecimal(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const abs = Math.abs(n);
  const compact = (divisor, suffix) => `${sign}$${(abs / divisor).toFixed(1)}${suffix}`;
  if (abs >= 1e12) return compact(1e12, "T");
  if (abs >= 1e9) return compact(1e9, "B");
  if (abs >= 1e6) return compact(1e6, "M");
  if (abs >= 1e3) return compact(1e3, "K");
  return `${sign}$${abs.toFixed(1)}`;
}
export function formatFlowWholeMillions(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const n = Number(value);
  const sign = flowSign(n);
  const millions = Math.round(Math.abs(n) / 1_000_000);
  if (millions >= 1000) return `${sign}$${(millions / 1000).toFixed(1)}B`;
  return `${sign}$${millions}M`;
}
export const formatAddress=(a)=>`${a.slice(0,6)}...${a.slice(-4)}`;
export const formatTxHash=(a)=>`${a.slice(0,10)}...${a.slice(-6)}`;
export const formatTimeAgo=()=>`Updated just now`;
