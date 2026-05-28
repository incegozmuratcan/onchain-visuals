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

Missing source env vars produce `source_config_required` snapshots with the exact missing keys visible in the UI and source-health responses.
