# Onchain environment variables

Required for configured sources:

- `DUNE_API_KEY`: Dune API key for latest-result reads.
- `DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID`: Dune query id whose latest result matches the stablecoin net transfer schema.
- `ONCHAIN_REFRESH_SECRET` or `CRON_SECRET`: bearer secret for admin/cron refresh routes in production.
- `ENABLE_BINANCE_LIQUIDATION_PULSE`: enables the external Binance Futures liquidation collector state; page/API routes never start websockets.
- `ETHERSCAN_API_KEY`: required before large holder snapshots can be ingested.
- `WHALE_ALERT_API_KEY`: required before Whale Alert transfer snapshots can be ingested.
- `DIGITAL_ASSET_TREASURIES_SOURCE_URL`: provider URL for treasury data when licensed/configured.
- `TOKEN_UNLOCKS_SOURCE_URL`: provider URL for token unlock data when licensed/configured.
- `DATABASE_URL`: optional Neon/Postgres persistence. Without it, local development uses `.onchain-cache` JSON files.

## Onchain storage initialization

When `DATABASE_URL` points at Neon/Postgres, initialize the onchain snapshot/source-run tables before relying on persisted source health:

```bash
npm run onchain:init-db
# or initialize the full schema:
npm run db:push
```

`storage_not_initialized` in `/api/onchain/source-health` means `DATABASE_URL` is configured but at least one required onchain table, such as `onchain_source_runs` or `onchain_chart_snapshots`, is missing. The response includes `storageReady: false`, `missingTables`, and a message with the init commands.

Vercel deploy note: onchain API routes are dynamic and use `revalidate = 0`, so builds must not prerender DB/source-health state. A missing optional onchain storage table should not block `npm run build`; initialize the tables after or before deploy with the commands above.

Missing source env vars produce `source_config_required` snapshots with the exact missing keys visible in the UI and source-health responses.

## Dataset state behavior

Missing credentials or unavailable licensed sources keep affected datasets in `source_config_required` or `disabled` states. The chart UI renders a state card with missing env keys and never emits fake placeholder data. The Onchain Data Lab groups these datasets away from active visuals until a real source/configured collector is available.
