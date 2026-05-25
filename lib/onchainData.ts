import { datasetRegistry } from './onchain';
import { formatCompactUsd, formatSignedPercent } from './formatters';
import { marketShares, safeChangePct } from './metrics';
import { getChainRevenue, getStablecoinSupplyByChain } from './defillama';

const j = async (url:string)=>{ const r=await fetch(url,{next:{revalidate:900}}); if(!r.ok) throw new Error(String(r.status)); return r.json(); };
const base = (d:any, slug:string, period:string)=>({datasetId:d.id,datasetSlug:slug,title:d.name,subtitle:d.description,date:new Date().toISOString().slice(0,10),period,category:d.category,status:d.status,sourceLabel:d.sourceLabel,sourceUrl:null,exportFormats:['1600x900','1200x1200','1080x1350'],warnings:[],metadata:{},series:{bars:[],lines:[],areas:[],cards:[],tables:[],calendar:[]},headlineMetrics:[],insights:[]});

export async function buildChartSnapshot(slug:string, period='7d'){
  const d = datasetRegistry.find(x=>x.slug===slug); if(!d) return null;
  if(d.status==='source_config_required') return {...base(d,slug,period), freshness:{status:'source_config_required',lastUpdatedAt:null,source:d.primarySource,fallbackUsed:false,missingConfig:d.requiredEnv.filter((k)=>!process.env[k]),message:'Required source configuration is missing.'}};
  try {
    if(slug==='chain-revenue-league'){
      const data = await getChainRevenue(10, (period as any)); const shares = marketShares(data.rows.map(r=>({value:r.value}))); const top=data.rows[0];
      return {...base(d,slug,period), freshness:{status:'fresh',lastUpdatedAt:new Date().toISOString(),source:'DefiLlama',fallbackUsed:false,missingConfig:[],message:null}, headlineMetrics:[{label:'Leader',value:top?.value??null,formattedValue:formatCompactUsd(top?.value),change:safeChangePct(top?.value7d,top?.value30d),changeLabel:formatSignedPercent(safeChangePct(top?.value7d,top?.value30d)),trend:'neutral'}], series:{bars:data.rows.map((r,i)=>({name:r.name,value:r.value,rank:r.rank,marketShare:shares[i]}),),lines:[],areas:[],cards:[],tables:[],calendar:[]},insights:[`${top?.name ?? 'N/A'} led selected-period chain revenue.`, `${data.rows[1]?.name ?? 'N/A'} ranked second by revenue.`], sourceUrl:data.endpoint,status:'active'};
    }
    if(slug==='chain-stablecoin-supply'){
      const data = await getStablecoinSupplyByChain(10); const top=data.rows[0];
      return {...base(d,slug,period), freshness:{status:'fresh',lastUpdatedAt:new Date().toISOString(),source:'DefiLlama',fallbackUsed:false,missingConfig:[],message:null},headlineMetrics:[{label:'Largest chain supply',value:top?.value,formattedValue:formatCompactUsd(top?.value),change:null,changeLabel:null,trend:'neutral'}],series:{bars:data.rows.map(r=>({name:r.name,value:r.value,rank:r.rank})),lines:[],areas:[],cards:[],tables:[],calendar:[]},insights:[`${top?.name ?? 'N/A'} is currently the largest stablecoin chain by supply.`,`Top-chain concentration remains elevated versus long-tail chains.`],sourceUrl:data.endpoint,status:'active'};
    }
    // generic live data for several defillama-backed datasets
    const live = ['dex-volume-by-chain','protocol-revenue-league','dex-protocol-volume','perp-protocol-volume-oi','cex-transparency','digital-asset-treasuries','monthly-unlock-watch'];
    if(live.includes(slug)) return {...base(d,slug,period),freshness:{status:'stale',lastUpdatedAt:null,source:d.primarySource,fallbackUsed:false,missingConfig:[],message:'Connector stub present; snapshot refresh required.'},status:'stale',warnings:['Snapshot refresh runner has not persisted a recent snapshot yet.']};
    return {...base(d,slug,period),freshness:{status:'missing',lastUpdatedAt:null,source:d.primarySource,fallbackUsed:false,missingConfig:[],message:'No snapshot found.'},status:'stale'};
  } catch (e:any){
    return {...base(d,slug,period), freshness:{status:'source_error',lastUpdatedAt:null,source:d.primarySource,fallbackUsed:false,missingConfig:[],message:e?.message ?? 'Source fetch failed'}, status:'source_error', warnings:['Falling back to safe empty snapshot.']};
  }
}
