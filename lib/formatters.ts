export const formatCompactUsd = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);
export const formatUsd = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export const formatNumber = (value?: number | null) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
export const formatPercent = (value?: number | null) => value == null ? 'N/A' : `${(value*100).toFixed(1)}%`;
export const formatSignedPercent = (value?: number | null) => value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
export const formatRankChange = (value?: number | null) => value == null ? 'Rank N/A' : `Rank ${value >= 0 ? '+' : ''}${value}`;
export const formatSourceLabel = (source: string, updatedAt: string) => `Source: ${source} · Updated ${updatedAt}`;
