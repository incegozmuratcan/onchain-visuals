import assert from 'node:assert/strict';
const parseMoney = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || /^n\/?a$/i.test(raw)) return null;
  const match = raw.replace(/[,$\s]/g, '').match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  const mult = (match[2] || '').toUpperCase();
  return n * (mult === 'B' ? 1e9 : mult === 'M' ? 1e6 : mult === 'K' ? 1e3 : 1);
};
const clean = (v) => String(v || '').replace(/^\d+\s*/, '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[\s*image\s*:[^\]]*\]/gi, ' ').replace(/\bimage\s*:/gi, ' ').replace(/\blogo\b/gi, ' ').replace(/\s+/g, ' ').trim();
const parseRows = (text) => text.split(/\r?\n/).map((s)=>s.trim()).filter(Boolean).map((line)=>{ const c=line.includes('|')?line.split('|').map((x)=>x.trim()).filter(Boolean):line.split(/\s{2,}/).map((x)=>x.trim()).filter(Boolean); return c; }).filter((c)=>c.length>=2).map((c)=>({projectName:clean(c[0]),annualized30dRevenueUsd:parseMoney(c[1]),chain:c[6]||'Unknown'})).filter((r)=>r.projectName&&r.annualized30dRevenueUsd).sort((a,b)=>b.annualized30dRevenueUsd-a.annualized30dRevenueUsd);
const fx=`1 Image: Helium logo | $16,082,829 | x | x | x | x | Solana\n2 Image: IO.NET logo | $12.08M | x | x | x | x | Solana\n3 Image: Glow logo | $10.00M | x | x | x | x | Ethereum\n4 Image: Akash logo | $9.50M | x | x | x | x | Cosmos\n5 Image: Render Network logo | $8.75M | x | x | x | x | Solana`;
const rows=parseRows(fx);
assert.equal(rows.length,5);
assert.deepEqual(rows.map(r=>r.projectName),['Helium','IO.NET','Glow','Akash','Render Network']);
console.log('DePIN parser fixture tests passed');
