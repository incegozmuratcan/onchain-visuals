export const safeChangePct = (current, previous) => current == null || previous == null || previous === 0 ? null : (current - previous) / Math.abs(previous);
export const rolling_7d = (v)=>v.slice(-7).reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
export const cumulative_sum = (values)=>{let a=0;return values.map(v=>{if(Number.isFinite(v))a+=v;return a;});};
export const market_share = (v,t)=>!t?null:v/t;
export const rank_change=(c,p)=>p-c;
export const streak_count=(v)=>{let s=0;const d=(v.at(-1)>=0)?1:-1;for(let i=v.length-1;i>=0;i--){if((v[i]>=0?1:-1)===d)s++;else break;}return s;};
export const supply_pressure_score=(u,a)=>a?u/a:null;
export const long_short_imbalance=(l,s)=>((l-s)/(l+s));
