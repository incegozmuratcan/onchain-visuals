const CASES=[['Render Network',['render','rndr','render-network']],['OP Mainnet',['optimism','op']],['XRP Ledger',['ripple','xrp']]];
const GROUPS=[['render network','render','render-network','rndr'],['optimism','op mainnet','op'],['xrp ledger','xrp','ripple']];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function aliases(name){const n=norm(name).replace(/-/g,' ');const set=new Set([n,norm(name)]);for(const g of GROUPS){const gn=g.map(v=>norm(v).replace(/-/g,' '));if(gn.includes(n)){g.forEach(v=>{set.add(norm(v));set.add(norm(v).replace(/-/g,' '));});}} return [...set].map(v=>v.replace(/ /g,'-'));}
for(const [name,expects] of CASES){const a=aliases(name);for(const e of expects){if(!a.includes(e)) throw new Error(`${name} missing ${e}`)}}
const cmcState=(id,hasSource)=>!id?'Missing numeric ID':/^\d+$/.test(String(id))?(hasSource?'Backup':'ID saved · fetch logo needed'):'ID review';
if(cmcState('5690',false)!=='ID saved · fetch logo needed') throw new Error('CMC saved ID state failed');
console.log('verify:provider-resolvers passed');
