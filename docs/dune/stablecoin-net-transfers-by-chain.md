# Dune: Stablecoin Net Transfers by Chain

This dataset uses Dune **latest-result** reads only. It never executes a Dune query during page load. Schedule the query in Dune or run it manually, then run the Onchain Visuals refresh job to cache the latest result as a chart snapshot.

## Required env

- `DUNE_API_KEY`
- `DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID`

## Expected query columns

At minimum:

- `chain` (or `blockchain`/`network`)
- `inflow` (or `inflows`/`gross_inflow`)
- `outflow` (or `outflows`/`gross_outflow`)
- `net_flow` (or `net_transfer`/`net_transfers`)

Optional:

- `net_transfer_7d`
- `net_transfer_30d`
- `stablecoin_symbol` or `symbol`

If env is missing the dataset returns `source_config_required`; if Dune fetch fails and no prior snapshot exists it returns `source_error`; if a prior successful snapshot exists the stale snapshot is served.
