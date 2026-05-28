import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { hasDatabaseConfig, query } from '../server/postgres';
import { ONCHAIN_STORAGE_TABLES, OnchainStorageNotInitializedError, toOnchainStorageNotInitializedError } from './storageErrors';
import type { ChartSnapshot, SourceRun, SourceRunStatus } from './types';

const dir = path.join(process.cwd(), '.onchain-cache');
const snapshotsFile = path.join(dir, 'snapshots.json');
const runsFile = path.join(dir, 'source-runs.json');
async function readJson<T>(file: string, fallback: T): Promise<T> { try { return JSON.parse(await readFile(file, 'utf8')) as T; } catch { return fallback; } }
async function writeJson(file: string, data: unknown) { await mkdir(dir, { recursive: true }); await writeFile(file, JSON.stringify(data, null, 2)); }
export function hashPayload(payload: unknown) { return createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }

export async function saveChartSnapshot(snapshot: ChartSnapshot) {
  if (hasDatabaseConfig()) {
    try {
      await query(`insert into onchain_chart_snapshots (dataset_slug, chart_type, period, date, title, subtitle, headline_metrics_json, series_json, insights_json, source_label, source_url, freshness_status, generated_at, metadata_json, warnings_json)
      values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15::jsonb)`, [snapshot.datasetSlug, snapshot.metadata?.chartType || snapshot.datasetSlug, snapshot.period, snapshot.date, snapshot.title, snapshot.subtitle, JSON.stringify(snapshot.headlineMetrics), JSON.stringify(snapshot.series), JSON.stringify(snapshot.insights), snapshot.sourceLabel, snapshot.sourceUrl, snapshot.freshness.status, snapshot.freshness.lastUpdatedAt || new Date().toISOString(), JSON.stringify(snapshot.metadata), JSON.stringify(snapshot.warnings)]);
      return;
    } catch (error) {
      const storageError = toOnchainStorageNotInitializedError(error);
      if (!storageError) throw error;
      return;
    }
  }
  const all = await readJson<Record<string, ChartSnapshot[]>>(snapshotsFile, {});
  all[snapshot.datasetSlug] = [snapshot, ...(all[snapshot.datasetSlug] || [])].slice(0, 20);
  await writeJson(snapshotsFile, all);
}
export async function loadLatestChartSnapshot(datasetSlug: string): Promise<ChartSnapshot | null> {
  if (hasDatabaseConfig()) {
    try {
      const res = await query(`select * from onchain_chart_snapshots where dataset_slug = $1 order by generated_at desc limit 1`, [datasetSlug]);
      const row = res.rows[0];
      if (!row) return null;
      return { datasetId: datasetSlug, datasetSlug, title: row.title, subtitle: row.subtitle, date: row.date, period: row.period, category: row.metadata_json?.category || 'chains', status:'stale', freshness:{status:row.freshness_status || 'stale', lastUpdatedAt:row.generated_at, source:row.source_label, fallbackUsed:true, missingConfig:[], message:null}, headlineMetrics:row.headline_metrics_json || [], series:row.series_json, insights:row.insights_json || [], sourceLabel:row.source_label, sourceUrl:row.source_url, exportFormats:['1600x900','1200x1200','1080x1350'], warnings:row.warnings_json || [], metadata:row.metadata_json || {} } as ChartSnapshot;
    } catch (error) {
      const storageError = toOnchainStorageNotInitializedError(error);
      if (!storageError) throw error;
      return null;
    }
  }
  const all = await readJson<Record<string, ChartSnapshot[]>>(snapshotsFile, {});
  return all[datasetSlug]?.[0] || null;
}
export async function markSnapshotStale(snapshot: ChartSnapshot, message: string): Promise<ChartSnapshot> { return { ...snapshot, status:'stale', freshness:{ ...snapshot.freshness, status:'stale', fallbackUsed:true, message }, warnings:[...snapshot.warnings, message] }; }
export async function saveSourceRun(input: Omit<SourceRun, 'id'>) {
  const run: SourceRun = { ...input, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
  if (hasDatabaseConfig()) {
    try {
      await query(`insert into onchain_source_runs (id, source, dataset_slug, status, started_at, finished_at, error_message, rows_fetched, payload_hash, metadata_json) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`, [run.id, run.source, run.datasetSlug, run.status, run.startedAt, run.finishedAt, run.errorMessage, run.rowsFetched, run.payloadHash, JSON.stringify(run.metadata)]);
      return run;
    } catch (error) {
      const storageError = toOnchainStorageNotInitializedError(error);
      if (!storageError) throw error;
      return run;
    }
  }
  const all = await readJson<SourceRun[]>(runsFile, []);
  all.unshift(run); await writeJson(runsFile, all.slice(0, 500)); return run;
}
export async function sourceRun(datasetSlug: string, source: string, startedAt: string, status: SourceRunStatus, rowsFetched: number, errorMessage: string | null, payload?: unknown, metadata: Record<string, any> = {}) {
  return saveSourceRun({ source, datasetSlug, status, startedAt, finishedAt: new Date().toISOString(), errorMessage, rowsFetched, payloadHash: payload ? hashPayload(payload) : null, metadata });
}
export async function loadSourceRuns() { if (hasDatabaseConfig()) { try { const res = await query(`select * from onchain_source_runs order by started_at desc limit 500`); return res.rows.map((r:any)=>({ id:r.id, source:r.source, datasetSlug:r.dataset_slug, status:r.status, startedAt:r.started_at, finishedAt:r.finished_at, errorMessage:r.error_message, rowsFetched:r.rows_fetched, payloadHash:r.payload_hash, metadata:r.metadata_json || {} })) as SourceRun[]; } catch (error) { const storageError = toOnchainStorageNotInitializedError(error); if (storageError) throw storageError; throw error; } } return readJson<SourceRun[]>(runsFile, []); }
export async function findMissingOnchainStorageTables() { if (!hasDatabaseConfig()) return [...ONCHAIN_STORAGE_TABLES]; const tableList = ONCHAIN_STORAGE_TABLES.map((table) => `'${table}'`).join(','); const res = await query<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'public' and table_name in (${tableList})`); const existing = new Set(res.rows.map((row) => row.table_name)); return ONCHAIN_STORAGE_TABLES.filter((table) => !existing.has(table)); }
export { OnchainStorageNotInitializedError };
