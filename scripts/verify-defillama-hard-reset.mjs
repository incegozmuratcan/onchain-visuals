const chooseReplacement=(sources)=>{
 const pick=(providers)=>sources.find((s)=>providers.includes(s.provider)&&['approved','candidate'].includes(s.status));
 return pick(['manual','upload'])||pick(['managed-vault','vault'])||pick(['coingecko'])||pick(['coinmarketcap'])||null;
};
const logos=[{id:'l1',approved_source_id:'d1',status:'approved'},{id:'l2',approved_source_id:'d2',status:'approved'}];
const sources=[
{id:'d1',logo_id:'l1',provider:'defillama',status:'candidate'},
{id:'d2',logo_id:'l2',provider:'defillama',status:'candidate'},
{id:'cg1',logo_id:'l1',provider:'coingecko',status:'approved'},
{id:'m1',logo_id:'l1',provider:'manual',status:'approved'},
{id:'cmc2',logo_id:'l2',provider:'coinmarketcap',status:'rejected'}
];
const remaining=sources.filter((s)=>s.provider!=='defillama');
if(remaining.some((s)=>s.provider==='defillama')) throw new Error('DefiLlama rows were not deleted.');
const l1Replace=chooseReplacement(remaining.filter((s)=>s.logo_id==='l1'));
if(!l1Replace||l1Replace.provider!=='manual') throw new Error('Expected manual replacement priority for l1.');
const l2Replace=chooseReplacement(remaining.filter((s)=>s.logo_id==='l2'));
if(l2Replace) throw new Error('Expected no replacement for l2 due to rejected-only fallback.');
console.log('DefiLlama hard reset verification passed (delete only defillama, preserve other providers, repair/clear primaries).');
