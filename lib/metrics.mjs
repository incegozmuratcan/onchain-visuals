// ESM mirror for Next resolution and legacy tests; keep exports aligned with lib/metrics.ts.
export const safeChange = (current, previous) => current == null || previous == null ? null : current - previous;
export const safeChangePct = (current, previous) => current == null || previous == null || previous === 0 ? null : (current - previous) / Math.abs(previous);
export const rolling = (values, window) => { const valid = values.slice(-window).filter((v) => typeof v === 'number' && Number.isFinite(v)); return valid.length ? valid.reduce((a,b)=>a+b,0) : null; };
export const rolling_5d = (v)=>rolling(v,5); export const rolling_7d=(v)=>rolling(v,7); export const rolling_20d=(v)=>rolling(v,20); export const rolling_30d=(v)=>rolling(v,30);
export const cumulative_sum = (values)=>{let a=0;return values.map(v=>{if(typeof v==='number'&&Number.isFinite(v))a+=v;return a;});};
export const market_share=(value,total)=>value==null||total==null||total===0?null:value/total;
export const market_share_change=(c,p)=>safeChange(c,p);
export const rank_change=(currentRank,previousRank)=>currentRank==null||previousRank==null?null:previousRank-currentRank;
export const dominance=market_share;
export const largest_inflow=(rows,get)=>[...rows].sort((a,b)=>get(b)-get(a))[0]??null;
export const largest_outflow=(rows,get)=>[...rows].sort((a,b)=>get(a)-get(b))[0]??null;
export const top_gainer=largest_inflow; export const top_loser=largest_outflow;
export const streak_count=(values)=>{let s=0;const dir=(values.at(-1)??0)>=0?1:-1;for(let i=values.length-1;i>=0;i--){const v=values[i];if(typeof v!=='number')break;if((v>=0?1:-1)===dir)s++;else break;}return s;};
export const supply_pressure_score=(unlock,avgVol)=>unlock==null||avgVol==null||avgVol===0?null:unlock/avgVol;
export const long_short_imbalance=(longValue,shortValue)=>{const t=(longValue??0)+(shortValue??0);return t===0?null:((longValue??0)-(shortValue??0))/t;};
export const marketShares=(rows)=>{const total=rows.reduce((acc,row)=>acc+(Number.isFinite(row.value)?row.value:0),0);return total?rows.map((row)=>row.value/total):rows.map(()=>0);};
