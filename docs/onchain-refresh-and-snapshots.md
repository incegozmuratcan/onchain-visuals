# Refresh, cache, and snapshots

Refresh generates chart snapshots. API/page reads call `buildChartSnapshot`; source failures serve the latest successful snapshot as `stale` when one exists, otherwise `source_error`. Failed empty results do not overwrite good snapshots.

## Storage

Postgres/Neon tables:

- `onchain_source_runs`: source, dataset slug, status, start/end timestamps, error message, rows fetched, payload hash, metadata.
- `onchain_chart_snapshots`: dataset slug, chart type, period, date, title/subtitle, metrics, series, insights, source, freshness, metadata, warnings.

If `DATABASE_URL` is absent, local development falls back to `.onchain-cache/snapshots.json` and `.onchain-cache/source-runs.json`.

## Routes

- `POST /api/admin/onchain/refresh/:datasetSlug`
- `POST /api/admin/onchain/refresh-all`
- `GET /api/admin/onchain/source-health`
- `GET|POST /api/cron/onchain/refresh`

Production refresh routes require `Authorization: Bearer $ONCHAIN_REFRESH_SECRET` or `$CRON_SECRET`.

## Scripts

- `scripts/onchain-refresh.mjs`
- `scripts/onchain-refresh-dataset.mjs`
- `scripts/verify-onchain-sources.mjs`
- `scripts/collect-binance-liquidations.mjs`

Debug stale/source-error states by checking source health, latest source runs, missing env vars, and whether a cached successful snapshot exists.
