# learnDeFi

Make DeFi data share-ready.

learnDeFi creates clean, source-backed market cards from trusted crypto data. It is built for project teams, chain teams, ecosystem and growth teams, community managers, analysts and creators who want simple DeFi visuals they can share on X.

## Current product

- Create market cards from supported DeFi metrics.
- Add simple learn notes that explain what the metric means.
- Keep source attribution and updated dates visible on every card.
- Export PNG cards for sharing.
- Copy a deterministic caption generated from the current card data.

learnDeFi v0.8 is not an AI product, not a paid SaaS and not a crypto data terminal. This version has no AI features, auth, database, payments, paid plans, alerts or scheduled reports. The focus is card quality, source clarity and logo reliability.

## Stack

- Next.js 14
- React 18
- Tailwind CSS
- `html-to-image` for PNG export
- DefiLlama, Chainspect and DePIN Pulse data adapters

## Supported metrics

### Chains

- Revenue: 24H, 7D and 30D
- Stablecoin Supply: current
- DeFi TVL: current

### Protocols

- DePIN revenue: 24H and 30D annualized only
- DePIN remains under Protocols, not Chains

### Infrastructure

- Real-time TPS: 1H / real-time from Chainspect
- Block Time: 1H
- Avg Tx Fee: 24H
- Developers

### Assets

- BUIDL onchain marketcap
- BENJI onchain marketcap

## Data sources

- DefiLlama for chain revenue, stablecoin supply, TVL and supported tokenized asset views.
- Chainspect for TPS, block time, average transaction fee and developers.
- DePIN Pulse for DePIN revenue leaderboards.

## Product rules

- Source attribution must remain visible on every card and export.
- Metric labels must match the actual source timeframe.
- Never label 1H data as 30D.
- Never fabricate unsupported 7D DePIN metrics.
- Developers belongs under Infrastructure.
- Known active entities should use curated local logos instead of initials fallback.
- White, black and anthracite minimal styling should remain the visual baseline.

## Logo QA

v0.8 adds a curated logo manifest and an internal `/logo-audit` route for visual QA. The audit route shows each registered logo at multiple sizes, in a card-row context and with source and quality metadata.

Run the lightweight logo check with:

```bash
npm run check:logos
```

## v0.8 summary

- Repositioned learnDeFi around “Make DeFi data share-ready.”
- Removed AI-like and monetization-heavy user-facing copy.
- Added a first-run default card for “Top 10 chains by stablecoin supply.”
- Added “Try these cards” shortcuts.
- Added deterministic caption copy support.
- Added a curated local logo registry, structured logo folders and logo QA tooling.
- Updated docs and version metadata to v0.8.
