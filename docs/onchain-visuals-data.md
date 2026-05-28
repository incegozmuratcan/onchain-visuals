# Onchain Visuals data product

Allowed top-level categories are **Chains**, **Protocols**, **Capital Flows**, and **Markets**. Datasets are active only when a real source path can return normalized rows and `buildChartSnapshot` can create the shared chart contract. No dataset may be marked active if it returns fake rows, generic empty bars, stub/error phrases or raw placeholder JSON.

## Dataset status policy

- `active`: public source or configured source has a real connector and snapshot builder.
- `source_config_required`: connector exists, but required env vars or an external collector/config are missing.
- `source_error`: connector ran and failed with no cached successful snapshot.
- `stale`: connector failed, but latest successful snapshot is served from storage.
- `disabled`: source is not sufficiently reliable/licensed/configured; no fake data is emitted.

## Datasets

Chains: Chain Revenue League, Chain Stablecoin Supply, Stablecoin Net Transfers by Chain, DEX Volume by Chain.
Protocols: Protocol Revenue League, DEX Protocol Volume, Perp Protocol Volume & OI.
Capital Flows: BTC ETF Flowboard, ETH ETF Flowboard, BTC vs ETH ETF Flow Battle, ETF Issuer Monthly Report, CEX Transparency, Digital Asset Treasuries, Monthly Unlock Watch, Large Holders Board, Whale Transfers.
Markets: Binance Liquidation Pulse.

## Sources

DefiLlama connectors normalize revenue, stablecoin supply, DEX volume, derivatives, and CEX transparency. Farside ETF HTML is parsed into issuer/date/flow rows with blanks preserved as unknown values, not zeros. Dune stablecoin net transfers use the latest-result endpoint only during refresh. Binance spot prices provide BTC/ETH price context and the liquidation dataset is explicitly labeled Binance Futures captured liquidations only.

## Adding a dataset

Add registry metadata, implement a connector or an honest configuration state, add a snapshot builder that returns the shared `ChartSnapshot` contract, add a template mapping, and add tests proving active datasets do not return generic placeholders.
