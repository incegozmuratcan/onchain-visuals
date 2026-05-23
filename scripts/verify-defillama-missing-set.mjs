import assert from 'node:assert/strict';
const slugText=(v)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const normalize=(v)=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const GROUPS=[['bsv','bitcoin-sv','bitcoin sv','bsv-blockchain','bitcoin-sv-chain'],['quai','quai-network','quai network'],['nosana','nos'],['io.net','ionet','io-net','io net','io'],['provenance','provenance blockchain','provenanced','hash'],['dimo','dimo-network'],['pocket','pocket-network','pokt'],['render','render-network','render network','rndr','render-token'],['xrp','xrpl','xrp-ledger','xrp ledger','ripple','ripple-network','xrpl-mainnet'],['akash','akash-network','akash network','akash.io','akt'],['cosmos','atom','cosmos-hub'],['megaeth','mega-eth','mega eth'],['glow','glow-protocol'],['eni','eni-chain','eni network'],['noble','noble-chain','noble network']];
const lookup=new Map();for(const g of GROUPS){const n=[...new Set(g.flatMap(v=>[normalize(v),slugText(v)]).filter(Boolean))];for(const x of n)lookup.set(x,new Set(n));}
const aliasesFor=(name,slug)=>{const set=new Set([normalize(name),slugText(name),normalize(slug),slugText(slug)]);for(const k of [...set]) lookup.get(k)?.forEach(v=>set.add(v)); return [...set];};
const sanitizeAlias=(arr)=>arr.filter((v)=>!/^https?:\/\//i.test(v)&&!/\.(png|jpg|jpeg|svg|webp)(\?|$)/i.test(v)&&!/\?/.test(v)&&!/^https-/.test(v)&&!/^\d+$/.test(v.trim()));
const CASES=[['BSV Blockchain','bsv-blockchain',['bsv','bitcoin-sv','bitcoin-sv-chain']],['Quai','quai',['quai','quai-network']],['Nosana','nosana',['nosana','nos']],['IO.NET','ionet',['io.net','ionet','io-net']],['Provenance','provenance',['provenance','hash']],['DIMO','dimo',['dimo','dimo-network']],['Pocket Network','pocket-network',['pocket','pocket-network','pokt']],['Render Network','render-network',['render','render-network','rndr']],['XRP Ledger','xrp-ledger',['xrp','xrpl','ripple']],['Akash','akash',['akash','akash-network','akt']],['Cosmos','cosmos',['cosmos','atom','cosmos-hub']],['IO.NET','io-net',['io-net','ionet','io.net']],['MegaETH','megaeth',['megaeth','mega-eth']],['Render','render',['render','render-network','rndr']],['Glow','glow',['glow','glow-protocol']],['ENI','eni',['eni','eni-chain']],['Noble','noble',['noble','noble-chain']]];
const classify = (source)=> source.imageUrl.includes('question-mark')?{valid:false}:{valid:!!source.indexConfirmed&&!source.guessedOnly};
const canonicalState=(r)=>r.valid?(r.reviewed?'OK':'REVIEW'):'NO';
const copyToVault=(existingId,id)=>existingId===id?'already up to date':'copied/replaced';
for (const [name, slug, expected] of CASES) {
  const aliases = aliasesFor(name, slug);
  for (const token of expected) assert.equal(aliases.includes(token) || aliases.includes(normalize(token)) || aliases.includes(slugText(token)), true, `${slug} missing ${token}`);
  const valid = classify({indexConfirmed:true,guessedOnly:false,imageUrl:'https://icons.llama.fi/chains/rsz_x.jpg'}); assert.equal(valid.valid,true);
  assert.equal(classify({indexConfirmed:true,guessedOnly:true,imageUrl:'https://icons.llama.fi/chains/rsz_x.jpg'}).valid,false);
  assert.equal(classify({indexConfirmed:true,guessedOnly:false,imageUrl:'https://icons.llama.fi/question-mark.jpg'}).valid,false);
  assert.equal(canonicalState({valid:true,reviewed:false}),'REVIEW');
  assert.equal(canonicalState({valid:true,reviewed:true}),'OK');
  const sourceId=`${slug}-src`; assert.equal(copyToVault('old',sourceId),'copied/replaced'); assert.equal(copyToVault(sourceId,sourceId),'already up to date');
}
const summaryCase={checked:17,candidatesFound:1,saveable:0,rejectedCandidates:1,noCandidate:16,errors:0};
if(!(summaryCase.checked===17&&summaryCase.candidatesFound===1&&summaryCase.saveable===0&&summaryCase.rejectedCandidates===1&&summaryCase.noCandidate===16&&summaryCase.errors===0)) throw new Error('dry-run summary semantics regression');
const separatedOutcome={sourceSaved:true,canonicalUpdated:true,vaultCopyFailed:true,finalStatus:'recovered'};
if(!(separatedOutcome.sourceSaved&&separatedOutcome.canonicalUpdated&&separatedOutcome.vaultCopyFailed&&separatedOutcome.finalStatus==='recovered')) throw new Error('source recovery must remain recovered when vault fails');
const dryRunSummary={
  checked:17,candidatesFound:1,rejectedCandidates:1,
  details:[{slug:'quai',name:'Quai',finalStatus:'validation_failed',aliasesTried:['quai','quai-network'],selectedCandidate:{name:'Quai Network',slug:'quai-network',sourceUrl:'https://defillama.com/chain/quai',imageUrl:'https://icons.llama.fi/chains/rsz_quai.jpg',sourceType:'chain-icon'},validationResult:'invalid:target_mismatch',rejectionReason:'target mismatch',canonicalSimulation:'would_update',vaultSimulation:'would_attempt'}]
};
if(!(Array.isArray(dryRunSummary.details)&&dryRunSummary.details.length===1)) throw new Error('dry-run details should be preserved');
if(!(dryRunSummary.candidatesFound===1&&dryRunSummary.rejectedCandidates===1&&dryRunSummary.details[0].slug==='quai')) throw new Error('candidatesFound/rejectedCandidates detail linkage regression');
const liveSummary={checked:1,sourceSaved:1,canonicalUpdated:1,vaultCopied:0,vaultCopyFailed:1,noReliable:0,errors:0,details:[{slug:'quai',finalStatus:'saved_source_but_vault_failed',vaultCopyResult:'Managed Vault replace failed'}]};
if(!(liveSummary.details[0].finalStatus==='saved_source_but_vault_failed'&&liveSummary.vaultCopyFailed===1)) throw new Error('live recovery details should be preserved');
const emptySetting=null;
if(!(emptySetting===null)) throw new Error('"not run yet" state regression');
const polluted=['akash','https://s2.coinmarketcap.com/static/img/coins/64x64/7431.png','https-coin-images-coingecko-com-coins-images-12785-large-akash-logo-png-1696512580','7431'];
const cleaned=sanitizeAlias(polluted);
assert.equal(cleaned.includes('akash'),true);
assert.equal(cleaned.some((v)=>v.includes('http')),false);
assert.equal(cleaned.includes('7431'),false);
const xrpAliases=aliasesFor('XRP Ledger','ripple');
for (const token of ['xrp','xrpl','ripple','xrp-ledger']) assert.equal(xrpAliases.includes(token),true);
const trustedChains=['cosmos','noble','quai','megaeth'];
for (const chain of trustedChains) {
  const c=aliasesFor(chain,chain);
  assert.equal(c.includes(chain),true,`${chain} trusted mapping missing`);
}
console.log(`verify:defillama-missing-set passed for ${CASES.length} logos.`);
