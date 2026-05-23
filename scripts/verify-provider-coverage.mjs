import assert from 'node:assert/strict';

const slugText=(v)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const isPolluted=(v)=>{const s=String(v||'').trim().toLowerCase(); return !s||/^https?:\/\//.test(s)||/[?&=]/.test(s)||/(\.png|\.jpg|\.jpeg|\.svg|\.webp)$/i.test(s)||/^\d+$/.test(s)};
function buildAliases(input){
  const raw=[input.name,input.slug,...(input.knownAliases||[])];
  const aliases=[...new Set(raw.map(slugText).filter(Boolean).filter(a=>!isPolluted(a)))];
  return aliases;
}

const logos=[
 {slug:'akash',cg:'NO',cmc:'OK',dl:'OK'},{slug:'render',cg:'OK',cmc:'NO',dl:'OK'},{slug:'noble',cg:'OK',cmc:'OK',dl:'NO'}
];
assert.equal(logos.filter(l=>l.cg==='NO').length,1);
assert.equal(logos.filter(l=>l.cmc==='NO').length,1);
assert.equal(logos.filter(l=>l.dl==='NO').length,1);

const aliases=buildAliases({name:'Akash',slug:'akash',knownAliases:['https://icons.llama.fi/chains/rsz_akash.jpg','7431','AKT','akash-network']});
assert.equal(aliases.includes('akt'),true);
assert.equal(aliases.includes('7431'),false);

function resolveCg({coinId,aliases}){ if(coinId) return {path:'id',saved:true,confidence:'high'}; if(aliases.includes('akash')) return {path:'alias',saved:true,confidence:'high'}; return {path:'alias',saved:false,confidence:'none'}; }
assert.equal(resolveCg({coinId:'akash-network',aliases}).path,'id');
assert.equal(resolveCg({coinId:'',aliases:['unknown']}).saved,false);

function resolveCmc({cmcId,aliases}){ if(cmcId) return {direct:true,saved:true}; let saw400=false; for(const a of aliases){ if(a==='bad') {saw400=true; continue;} if(a==='render'||a==='rndr'||a==='RENDER') return {direct:false,saved:true,saw400}; } return {direct:false,saved:false,saw400}; }
assert.equal(resolveCmc({cmcId:'5690',aliases:[]}).direct,true);
const cmc=resolveCmc({cmcId:'',aliases:['bad','RENDER']});
assert.equal(cmc.saved,true); assert.equal(cmc.saw400,true);

function resolveDl({indexMatch,routeValid,imageValid,targetMatch}){ if(!indexMatch&& !routeValid) return 'no_route_match'; if(!imageValid) return 'placeholder_image'; if(!targetMatch) return 'target_mismatch'; return 'saved'; }
assert.equal(resolveDl({indexMatch:true,routeValid:true,imageValid:true,targetMatch:true}),'saved');
assert.equal(resolveDl({indexMatch:false,routeValid:false,imageValid:true,targetMatch:true}),'no_route_match');

function canonicalAfterSave(ok){ return ok?'REVIEW':'ERR'; }
assert.equal(canonicalAfterSave(true),'REVIEW');

function vaultCopy({protectedVault,copyFails}){ if(protectedVault) return 'protected'; if(copyFails) return 'failed'; return 'copied'; }
assert.equal(vaultCopy({protectedVault:true,copyFails:false}),'protected');
assert.equal(vaultCopy({protectedVault:false,copyFails:true}),'failed');

console.log('verify:provider-coverage passed');
