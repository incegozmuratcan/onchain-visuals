import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importTs } from './load-ts.mjs';

const storageErrors = await importTs('../lib/onchain/storageErrors.ts');

test('missing onchain table errors are converted to storage-not-initialized errors', () => {
  const error = { code: '42P01', message: 'relation "onchain_source_runs" does not exist' };
  const converted = storageErrors.toOnchainStorageNotInitializedError(error);
  assert.ok(converted);
  assert.equal(converted.name, 'OnchainStorageNotInitializedError');
  assert.deepEqual(converted.missingTables, ['onchain_source_runs']);
});

test('source health handles storage-not-initialized errors without rethrowing', async () => {
  const sourceHealth = await readFile(new URL('../lib/onchain/sourceHealth.ts', import.meta.url), 'utf8');
  assert.match(sourceHealth, /catch \(error\)/);
  assert.match(sourceHealth, /error instanceof OnchainStorageNotInitializedError/);
  assert.match(sourceHealth, /status:storageReady \? 'ok' : 'storage_not_initialized'/);
  assert.match(sourceHealth, /storageReady:false|storageReady = false/);
  assert.match(sourceHealth, /ONCHAIN_STORAGE_NOT_INITIALIZED_MESSAGE/);
});

test('schema includes idempotent onchain storage tables and referenced columns', async () => {
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const table of ['onchain_source_runs', 'onchain_chart_snapshots']) {
    assert.match(schema, new RegExp(`create table if not exists ${table}`, 'i'));
  }
  for (const column of ['dataset_slug', 'started_at', 'finished_at', 'metadata_json', 'headline_metrics_json', 'series_json', 'warnings_json']) {
    assert.match(schema, new RegExp(`\\b${column}\\b`, 'i'));
  }
});

test('onchain live-state API routes are force dynamic with zero revalidation', async () => {
  for (const file of [
    '../app/api/onchain/source-health/route.ts',
    '../app/api/admin/onchain/source-health/route.ts',
    '../app/api/admin/onchain/refresh/[datasetSlug]/route.ts',
    '../app/api/admin/onchain/refresh-all/route.ts',
    '../app/api/cron/onchain/refresh/route.ts',
    '../app/api/charts/[datasetSlug]/route.ts',
  ]) {
    const route = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.match(route, /export const dynamic = ["']force-dynamic["']/, file);
    assert.match(route, /export const revalidate = 0/, file);
  }
});
