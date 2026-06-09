export const formatSignedPercent=(value)=> value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
export const formatCompactUsd=(value)=> value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value);
export const formatSignedUsd=(value)=> value == null ? 'N/A' : `${value >=0?'+':'-'}${formatCompactUsd(Math.abs(value))}`;
export const formatAddress=(a)=>`${a.slice(0,6)}...${a.slice(-4)}`;
export const formatTxHash=(a)=>`${a.slice(0,10)}...${a.slice(-6)}`;
export const formatTimeAgo=()=>`Updated just now`;
