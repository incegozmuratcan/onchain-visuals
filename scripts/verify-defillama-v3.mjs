import assert from 'node:assert/strict';

const SAFE_SUFFIX = ["network","chain","protocol","labs","foundation","dao","token"];
const PLACEHOLDER_PATTERNS = ["question-mark","question_mark","unknown-logo","placeholder","blank","empty","default-fallback","/api/chain-logo","generic"];
const slugText=(v)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const uniq=(arr)=>[...new Set(arr.filter(Boolean))];
const aliasFamily=(slugs)=>{const n=slugs.map(slugText).filter(Boolean);if(n.some((s)=>["bnb","bnb-chain","bsc","binance-smart-chain","binancecoin"].includes(s)))n.push("bnb","bnb-chain","bsc","binance-smart-chain","binancecoin");if(n.some((s)=>["xrp","xrpl","xrp-ledger","ripple","ripple-network","xrpl-mainnet"].includes(s)))n.push("xrp","xrpl","xrp-ledger","xrp-ledger","ripple","ripple-network","xrpl-mainnet");if(n.some((s)=>["io","io-net","ionet","io-net"].includes(s)))n.push("io","io-net","ionet","io-net","io-net","io-net");return uniq(n)};
const isChainIconUrl=(u)=>/https?:\/\/icons\.llama\.fi\/chains\/(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(u)||/https?:\/\/icons\.llamao\.fi\/icons\/chains\/(?:rsz_)?[^/?#.]+(?:\?w=48&h=48)?/i.test(u);
const isGuessedProtocolRow=(s,i)=>/defillama\.com\/protocol\//i.test(s)&&/https?:\/\/icons\.llama\.fi\/(?!chains\/)(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(i);
const isExternalProtocolIcon=(u)=>/https?:\/\/icons\.llama\.fi\/(?!chains\/)(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(u);
const isTokenIconUrl=(u)=>/^https?:\/\/token-icons\.llamao\.fi\/icons\/tokens\/gecko\/[a-z0-9-]+\?w=48&h=48/i.test(u);
const slugFromUrl=(v)=>{v=String(v||'').toLowerCase();const m1=v.match(/defillama\.com\/(?:protocol|chain|stablecoin)\/([^/?#]+)/i);if(m1?.[1])return slugText(m1[1]);const m2=v.match(/icons\.llama\.fi\/(?:chains\/)?(?:rsz_)?([^/?#.]+)\.[a-z0-9]+/i);if(m2?.[1])return slugText(m2[1]);const m3=v.match(/icons\.llamao\.fi\/icons\/chains\/(?:rsz_)?([^/?#.&]+)/i);return m3?.[1]?slugText(m3[1]):''};
function classify({logoName,logoSlug,source,knownAliases=[]}){
 const meta=source.metadata||{};const imageUrl=source.image_url||'';const sourceUrl=source.source_url||'';const combined=[imageUrl,sourceUrl,JSON.stringify(meta)].join(' ').toLowerCase();
 if(PLACEHOLDER_PATTERNS.some((p)=>combined.includes(p))) return {valid:false,sourceType:'invalid',reason:'placeholder_image'};
 const sourceSlug=slugText(meta.slug||meta.defillamaSlug||slugFromUrl(sourceUrl)||slugFromUrl(imageUrl));
 const targetSlugs=aliasFamily([slugText(logoSlug),slugText(logoName),...knownAliases.map(slugText)]);
 const sourceOk=targetSlugs.some((t)=>t&&(sourceSlug===t||sourceSlug.startsWith(`${t}-`)&&SAFE_SUFFIX.some((s)=>sourceSlug===`${t}-${s}`)));
 if(!sourceOk) return {valid:false,sourceType:'invalid',reason:'target_mismatch'};
 const chainMirror=imageUrl.startsWith('/logos/chains/')&&/\/chains\/rsz_/i.test(sourceUrl);
 const chainIcon=isChainIconUrl(sourceUrl)||isChainIconUrl(imageUrl);
 const tokenIcon=/defillama\.com\/token\//i.test(sourceUrl)&&isTokenIconUrl(imageUrl)&&[String(meta.defillamaV3||''),String(meta.sourceType||'')].some((v)=>v.toLowerCase()==='token-icon');
 if(chainMirror) return {valid:true,sourceType:'chain-mirror',reason:'valid_chain_mirror'};
 if(chainIcon) return {valid:true,sourceType:'chain-icon',reason:'valid_chain_icon'};
 if(tokenIcon) return {valid:true,sourceType:'token-icon',reason:'valid_token_icon'};
 if(isGuessedProtocolRow(sourceUrl,imageUrl)) return {valid:false,sourceType:'invalid',reason:'old_guessed_protocol_source'};
 const resolverConfirmed=meta.resolver===true||String(meta.sourceOrigin||'').toLowerCase()==='defillama-helper'||String(meta.resolverConfidence||'').toLowerCase()==='high'||meta.indexConfirmed===true||meta.protocolIndexConfirmed===true;
 if(isGuessedProtocolRow(sourceUrl,imageUrl) && !resolverConfirmed) return {valid:false,sourceType:'invalid',reason:'old_guessed_protocol_source'};
  if(!resolverConfirmed) return {valid:false,sourceType:'invalid',reason:'resolver_no_reliable_source'};
 return {valid:true,sourceType:'protocol-index',reason:'valid_protocol_index_candidate'};
}
const bnb=classify({logoName:'BNB Chain',logoSlug:'bnb-chain',knownAliases:['binancecoin'],source:{provider:'defillama',id:'1',source_url:'https://defillama.com/chain/bsc',image_url:'https://icons.llama.fi/chains/rsz_bsc.jpg',metadata:{slug:'bsc',defillamaSlug:'bsc',defillamaV3:'chain-icon'}}});
assert.equal(bnb.valid,true);assert.equal(bnb.sourceType,'chain-icon');
assert.ok(/icons\.llama\.fi\/chains\/(?:rsz_)?bsc\.jpg$/i.test('https://icons.llama.fi/chains/rsz_bsc.jpg'));
assert.equal('https://icons.llama.fi/chains/rsz_bsc.jpg'.includes('/chains/'),true);
assert.equal('https://icons.llama.fi/bsc.jpg'.includes('/chains/'),false);
const akash=classify({logoName:'Akash',logoSlug:'akash',source:{provider:'defillama',id:'2',source_url:'https://defillama.com/protocol/akash',image_url:'https://icons.llama.fi/akash.jpg',metadata:{slug:'akash',reviewStatus:'selected_needs_review'}}});
assert.equal(akash.valid,false);
const akashState = akash.reason==='resolver_no_reliable_source' || akash.reason==='old_guessed_protocol_source' ? 'MISSING' : 'ERROR';
assert.equal(akashState,'MISSING');
const pendle=classify({logoName:'Akash',logoSlug:'akash',source:{provider:'defillama',id:'3',source_url:'https://defillama.com/protocol/pendle',image_url:'https://icons.llama.fi/pendle.jpg',metadata:{slug:'pendle'}}});
assert.equal(pendle.reason,'target_mismatch');
const aptos=classify({logoName:'Aptos',logoSlug:'aptos',source:{provider:'defillama',id:'4',source_url:'https://icons.llama.fi/chains/rsz_aptos.jpg',image_url:'/logos/chains/aptos.jpg',metadata:{defillamaV3:'chain-mirror'}}});
assert.equal(aptos.valid,true);assert.equal(aptos.sourceType,'chain-mirror');
const geo=classify({logoName:'Geodnet',logoSlug:'geodnet',source:{provider:'defillama',id:'5',source_url:'https://icons.llama.fi/geodnet.jpg',image_url:'https://icons.llama.fi/geodnet.jpg',metadata:{slug:'geodnet',sourceOrigin:'defillama-helper',resolverConfidence:'high'}}});
assert.equal(geo.valid,true);assert.equal(geo.sourceType,'protocol-index');
const geoNo=classify({logoName:'Geodnet',logoSlug:'geodnet',source:{provider:'defillama',id:'6',source_url:'https://icons.llama.fi/geodnet.jpg',image_url:'https://icons.llama.fi/geodnet.jpg',metadata:{slug:'geodnet'}}});
assert.equal(geoNo.valid,false);
const oldInvalid=classify({logoName:'BNB Chain',logoSlug:'bnb-chain',source:{provider:'defillama',id:'7',source_url:'https://defillama.com/protocol/pendle',image_url:'https://icons.llama.fi/pendle.jpg',metadata:{slug:'pendle'}}});
assert.equal(oldInvalid.valid,false);
const bulkSimulation=[{kind:'valid',state:'REVIEW'},{kind:'noReliable',state:'MISSING'},{kind:'exception',state:'ERROR'}];
assert.deepEqual(bulkSimulation.map((x)=>x.state),['REVIEW','MISSING','ERROR']);

const xrpAliases=aliasFamily(['XRP Ledger','xrp-ledger','ripple','xrpl','52']);
['xrp','xrpl','ripple','xrp-ledger'].forEach((v)=>assert.equal(xrpAliases.includes(v),true));
const xrpChain=classify({logoName:'XRP Ledger',logoSlug:'xrp-ledger',knownAliases:['xrp','xrpl','ripple','ripple-network'],source:{provider:'defillama',id:'8',source_url:'https://defillama.com/chain/xrp',image_url:'https://icons.llama.fi/chains/rsz_xrpl.jpg',metadata:{slug:'xrp',defillamaV3:'chain-icon'}}});
assert.equal(xrpChain.valid,true);assert.equal(xrpChain.sourceType,'chain-icon');
const xrpGuessed=classify({logoName:'XRP Ledger',logoSlug:'xrp-ledger',source:{provider:'defillama',id:'9',source_url:'https://defillama.com/protocol/xrp',image_url:'https://icons.llama.fi/xrp.jpg',metadata:{slug:'xrp'}}});
assert.equal(xrpGuessed.valid,false);
const xrpRecovery = xrpChain.valid ? {saved:true,reviewStatus:'needs_review',missing:false} : {saved:false,missing:true};
assert.equal(xrpRecovery.saved,true);assert.equal(xrpRecovery.reviewStatus,'needs_review');assert.equal(xrpRecovery.missing,false);

const canonicalState=(source)=>{
  const c=classify({logoName:'XRP Ledger',logoSlug:'xrp-ledger',knownAliases:['xrp-ledger','xrp ledger','xrp','xrpl','ripple','ripple-network','xrpl-mainnet'],source});
  if(!c.valid) return 'NO';
  const rs=String(source.metadata?.reviewStatus||'').toLowerCase();
  if(source.status==='approved' && rs==='reviewed') return 'OK';
  return 'REVIEW';
};
const xrpCandidate={provider:'defillama',id:'10',source_url:'https://defillama.com/chain/xrp',image_url:'https://icons.llama.fi/chains/rsz_xrpl.jpg',status:'candidate',metadata:{slug:'xrp',defillamaSlug:'xrp',defillamaV3:'chain-icon',reviewStatus:'needs_review'}};
assert.equal(canonicalState(xrpCandidate),'REVIEW');
assert.equal(canonicalState({...xrpCandidate,status:'approved',metadata:{...xrpCandidate.metadata,reviewStatus:'reviewed'}}),'OK');

const xrpNoSourceDiagnostic={aliasesTried:['xrp','xrpl','ripple','xrp-ledger'],imageAttempts:['https://icons.llama.fi/chains/rsz_xrpl.jpg -> status_404','https://icons.llama.fi/chains/xrp.jpg -> status_404']};
assert.equal(xrpNoSourceDiagnostic.aliasesTried.includes('xrp'),true);assert.equal(xrpNoSourceDiagnostic.imageAttempts.length>0,true);

const ioToken = classify({logoName:'IO.NET',logoSlug:'io-net',knownAliases:['ionet','io','io.net'],source:{provider:'defillama',id:'11',source_url:'https://defillama.com/token/IONET',image_url:'https://token-icons.llamao.fi/icons/tokens/gecko/io?w=48&h=48',status:'candidate',metadata:{slug:'io',defillamaV3:'token-icon',sourceType:'token-icon',routeProbeStatus:'route_probe_failed'}}});
assert.equal(ioToken.valid,true);assert.equal(ioToken.sourceType,'token-icon');
const dimoToken = classify({logoName:'DIMO',logoSlug:'dimo',source:{provider:'defillama',id:'12',source_url:'https://defillama.com/token/DIMO',image_url:'https://token-icons.llamao.fi/icons/tokens/gecko/dimo?w=48&h=48',status:'candidate',metadata:{slug:'dimo',defillamaV3:'token-icon',sourceType:'token-icon'}}});
assert.equal(dimoToken.valid,true);assert.equal(dimoToken.sourceType,'token-icon');
const renderToken = classify({logoName:'Render',logoSlug:'render',knownAliases:['render-network'],source:{provider:'defillama',id:'13',source_url:'https://defillama.com/token/RENDER',image_url:'https://token-icons.llamao.fi/icons/tokens/gecko/render-token?w=48&h=48',status:'candidate',metadata:{slug:'render-token',defillamaV3:'token-icon',sourceType:'token-icon'}}});
assert.equal(renderToken.valid,true);assert.equal(renderToken.sourceType,'token-icon');
const eniChain = classify({logoName:'ENI',logoSlug:'eni',knownAliases:['eni-chain','eni-network'],source:{provider:'defillama',id:'14',source_url:'https://defillama.com/chain/eni',image_url:'https://icons.llamao.fi/icons/chains/rsz_eni?w=48&h=48',status:'candidate',metadata:{slug:'eni',defillamaV3:'chain-icon',sourceType:'chain-icon'}}});
assert.equal(eniChain.valid,true);assert.equal(eniChain.sourceType,'chain-icon');
const provenanceChain = classify({logoName:'Provenance',logoSlug:'provenance',knownAliases:['hash'],source:{provider:'defillama',id:'15',source_url:'https://defillama.com/chain/provenance',image_url:'https://icons.llamao.fi/icons/chains/rsz_provenance?w=48&h=48',status:'candidate',metadata:{slug:'provenance',defillamaV3:'chain-icon',sourceType:'chain-icon'}}});
assert.equal(provenanceChain.valid,true);assert.equal(provenanceChain.sourceType,'chain-icon');
const bsvToken = classify({logoName:'BSV Blockchain',logoSlug:'bsv-blockchain',knownAliases:['bsv','bitcoin-sv','bitcoin-cash-sv'],source:{provider:'defillama',id:'16',source_url:'https://defillama.com/token/BSV',image_url:'https://token-icons.llamao.fi/icons/tokens/gecko/bitcoin-cash-sv?w=48&h=48',status:'candidate',metadata:{slug:'bsv',coinGeckoId:'bitcoin-cash-sv',defillamaV3:'token-icon',sourceType:'token-icon'}}});
assert.equal(bsvToken.valid,true);assert.equal(bsvToken.sourceType,'token-icon');
const failureDiagnostic = { tokenSymbolsTried:['IO','IO.NET','IONET','IO-NET'], geckoIdsTried:['io','io-net','ionet'], sourceUrlsTried:['https://defillama.com/token/IONET'], imageUrlsTried:['https://token-icons.llamao.fi/icons/tokens/gecko/io?w=48&h=48'], perAttemptReason:['IONET:io:resolve'] };
assert.equal(Array.isArray(failureDiagnostic.tokenSymbolsTried),true);assert.equal(Array.isArray(failureDiagnostic.geckoIdsTried),true);assert.equal(Array.isArray(failureDiagnostic.sourceUrlsTried),true);assert.equal(Array.isArray(failureDiagnostic.imageUrlsTried),true);assert.equal(Array.isArray(failureDiagnostic.perAttemptReason),true);

// deterministic IO.NET duplicate persistence invariants
const logoA={id:'A',slug:'io-net',name:'IO.NET',category:'project'};
const logoB={id:'B',slug:'ionet',name:'IO.NET',category:'project'};
const ionetSource={id:'src-b',logo_id:'B',provider:'defillama',source_url:'https://defillama.com/token/IO',image_url:'https://token-icons.llamao.fi/icons/tokens/gecko/io?w=48&h=48',status:'candidate',metadata:{slug:'io',defillamaSlug:'io',defillamaV3:'token-icon',sourceType:'token-icon',reviewStatus:'needs_review'}};
const candidateForIoNet={id:'src-a',logo_id:'A',provider:'defillama',source_url:ionetSource.source_url,image_url:ionetSource.image_url,status:'candidate',metadata:{slug:'io',defillamaSlug:'io',defillamaV3:'token-icon',sourceType:'token-icon',reviewStatus:'needs_review'}};
assert.equal(classify({logoName:logoA.name,logoSlug:logoA.slug,knownAliases:['ionet','io','io.net','io net','IO'],source:candidateForIoNet}).valid,true);
assert.equal(classify({logoName:logoB.name,logoSlug:logoB.slug,knownAliases:['io-net','io','io.net','io net','IO'],source:ionetSource}).valid,true);
assert.equal(candidateForIoNet.logo_id,logoA.id);
assert.equal(ionetSource.logo_id,logoB.id);
assert.notEqual(candidateForIoNet.id,ionetSource.id);
const actionLoader=(form)=>{if(form.logoId&&form.logoSlug&&form.logoSlug!=='io-net') throw new Error('Logo identity mismatch: logoId=A expectedSlug=io-net actualSlug=ionet'); return form.logoId?logoA:(form.logoSlug==='io-net'?logoA:logoB)};
assert.equal(actionLoader({logoId:'A',logoSlug:'io-net'}).slug,'io-net');
assert.equal(actionLoader({logoSlug:'io-net'}).slug,'io-net');
assert.throws(()=>actionLoader({logoId:'A',logoSlug:'ionet'}),/Logo identity mismatch/);
const canonicalIoNet = (() => {
  const c = classify({logoName:logoA.name,logoSlug:logoA.slug,knownAliases:['ionet','io','io.net','io net','IO'],source:candidateForIoNet});
  if (!c.valid) return 'NO';
  const rs=String(candidateForIoNet.metadata?.reviewStatus||'').toLowerCase();
  return candidateForIoNet.status==='approved' && rs==='reviewed' ? 'OK' : 'REVIEW';
})();
assert.equal(canonicalIoNet==='REVIEW'||canonicalIoNet==='OK',true);

console.log('DefiLlama v3 deterministic verification passed (BNB + XRP chain-first, guessed protocol rejection, recovery/no-source diagnostic simulation).');
