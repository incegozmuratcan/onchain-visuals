# Dune Schema: Stablecoin Net Transfers by Chain

Required columns:
- `chain` text
- `net_transfer_7d` numeric
- `net_transfer_30d` numeric
- `inflow` numeric
- `outflow` numeric
- `stablecoin_symbol` text (optional)

This query is read via Dune latest-result APIs, never executed on request path.
