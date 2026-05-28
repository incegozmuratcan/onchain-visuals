import { datasetRegistry } from './registry';
import { findMissingOnchainStorageTables, loadSourceRuns, OnchainStorageNotInitializedError } from './storage';
import { ONCHAIN_STORAGE_NOT_INITIALIZED_MESSAGE } from './storageErrors';

const sourceEnv: Record<string, string[]> = { dune:['DUNE_API_KEY','DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID'], binance:['ENABLE_BINANCE_LIQUIDATION_PULSE'], etherscan:['ETHERSCAN_API_KEY'], whalealert:['WHALE_ALERT_API_KEY'], treasury_config:['DIGITAL_ASSET_TREASURIES_SOURCE_URL'], unlock_config:['TOKEN_UNLOCKS_SOURCE_URL'], defillama:[], farside:[] };

async function resolveMissingTables(error: OnchainStorageNotInitializedError) {
  try {
    const missingTables = await findMissingOnchainStorageTables();
    return missingTables.length ? missingTables : error.missingTables;
  } catch {
    return error.missingTables;
  }
}

export async function getSourceHealth({ detailed = false } = {}) {
  let runs = [] as Awaited<ReturnType<typeof loadSourceRuns>>;
  let storageReady = true;
  let missingTables: string[] = [];
  let message: string | null = null;

  try {
    runs = await loadSourceRuns();
  } catch (error) {
    if (!(error instanceof OnchainStorageNotInitializedError)) throw error;
    storageReady = false;
    missingTables = await resolveMissingTables(error);
    message = ONCHAIN_STORAGE_NOT_INITIALIZED_MESSAGE;
  }

  const sources = [...new Set(datasetRegistry.flatMap((d)=>d.sources))].sort();
  const sourceHealth = sources.map((source)=>{ const datasets = datasetRegistry.filter((d)=>d.sources.includes(source) || d.primarySource === source); const env = sourceEnv[source] || []; const missingEnv = env.filter((key)=>!process.env[key]); const sourceRuns = runs.filter((r)=>r.source.toLowerCase().includes(source.replace('_config','').toLowerCase()) || datasets.some((d)=>d.slug === r.datasetSlug)); const lastSuccess = sourceRuns.find((r)=>r.status === 'success') || null; const lastFail = sourceRuns.find((r)=>r.status === 'source_error') || null; const staleDatasets = datasets.filter((d)=>['stale','source_error'].includes(d.status)).map((d)=>d.slug); const manual = datasets.filter((d)=>d.status === 'disabled' || d.status === 'source_config_required').map((d)=>d.slug); return { source, configured:storageReady && missingEnv.length === 0, storageReady, missingEnv, datasets:datasets.map((d)=>d.slug), datasetStatuses:Object.fromEntries(datasets.map((d)=>[d.slug,d.status])), lastSuccessfulFetch:lastSuccess?.finishedAt || null, lastFailedFetch:lastFail?.finishedAt || null, lastError:lastFail?.errorMessage || null, staleDatasets, manual_review_required:manual, warnings:[...(!storageReady ? [ONCHAIN_STORAGE_NOT_INITIALIZED_MESSAGE] : []), ...missingEnv.map((key)=>`${key} is not configured`), ...datasets.filter((d)=>d.notes).map((d)=>`${d.slug}: ${d.notes}`)], ...(detailed ? { recentRuns:sourceRuns.slice(0,10) } : {}) }; });

  return { generatedAt:new Date().toISOString(), status:storageReady ? 'ok' : 'storage_not_initialized', configured:storageReady, storageReady, missingTables, message, sources:sourceHealth };
}
