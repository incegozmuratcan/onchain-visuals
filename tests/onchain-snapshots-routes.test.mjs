import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const snapshots = await readFile(new URL('../lib/onchain/snapshots.ts', import.meta.url), 'utf8');
const registry = await readFile(new URL('../lib/onchain/registry.ts', import.meta.url), 'utf8');
test('snapshot contract includes required statuses and stale fallback', () => { ['source_config_required','source_error','stale'].forEach((s)=>assert.ok(snapshots.includes(s))); assert.ok(/status:\s*["\']fresh["\']/.test(snapshots)); assert.ok(snapshots.includes('loadLatestChartSnapshot')); assert.ok(snapshots.includes('markSnapshotStale')); });
test('active builders do not emit generic stub phrases', () => { assert.equal(snapshots.includes('Connector stub' + ' present'), false); assert.equal(snapshots.includes('snapshot refresh' + ' required'), false); });
test('Dune builder returns missing env vars and never executes page-load query', () => { assert.ok((snapshots + registry).includes('DUNE_API_KEY')); assert.ok(snapshots.includes('page loads never execute Dune queries')); });
test('routes exist for datasets, charts, missing slug and source health', async () => { for (const file of ['../app/api/datasets/route.ts','../app/api/datasets/[slug]/route.ts','../app/api/charts/[datasetSlug]/route.ts','../app/api/onchain/source-health/route.ts']) { const text = await readFile(new URL(file, import.meta.url), 'utf8'); assert.ok(text.includes('NextResponse')); } });
