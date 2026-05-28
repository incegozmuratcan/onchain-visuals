# Refresh, cache, and snapshots

Refresh generates chart snapshots. API/page reads call `buildChartSnapshot`; source failures serve the latest successful snapshot as `stale` when one exists, otherwise `source_error`. Failed empty results do not overwrite good snapshots.

## Storage

Postgres/Neon tables:

- `onchain_source_runs`: source, dataset slug, status, start/end timestamps, error message, rows fetched, payload hash, metadata.
- `onchain_chart_snapshots`: dataset slug, chart type, period, date, title/subtitle, metrics, series, insights, source, freshness, metadata, warnings.

Initialize or update onchain storage with either command:

```bash
npm run onchain:init-db
# or run the complete app schema:
npm run db:push
```

Both commands use idempotent `CREATE TABLE IF NOT EXISTS` statements and do not drop existing onchain data. `DATABASE_URL` is required when either command is explicitly run. If `DATABASE_URL` is absent, local development falls back to `.onchain-cache/snapshots.json` and `.onchain-cache/source-runs.json`.

If the source-health response returns `status: "storage_not_initialized"`, the app reached Postgres but one or more onchain tables are missing. Run `npm run onchain:init-db` or `npm run db:push`, then re-check `/api/onchain/source-health`.

## Routes

- `POST /api/admin/onchain/refresh/:datasetSlug`
- `POST /api/admin/onchain/refresh-all`
- `GET /api/admin/onchain/source-health`
- `GET /api/onchain/source-health`
- `GET|POST /api/cron/onchain/refresh`

Production refresh routes require `Authorization: Bearer $ONCHAIN_REFRESH_SECRET` or `$CRON_SECRET`.

Onchain API routes that read live source health, refresh state, or DB snapshots are marked dynamic with `revalidate = 0`. Vercel builds must not prerender or fetch live onchain DB state; missing onchain storage tables should surface as `storage_not_initialized` at runtime instead of failing deployment.

## Scripts

- `scripts/onchain-init-db.mjs`
- `scripts/onchain-refresh.mjs`
- `scripts/onchain-refresh-dataset.mjs`
- `scripts/verify-onchain-sources.mjs`
- `scripts/collect-binance-liquidations.mjs`

Debug stale/source-error states by checking source health, latest source runs, missing env vars, and whether a cached successful snapshot exists.
