# learnDeFi

Make DeFi data share-ready.

learnDeFi creates clean, source-backed market cards from trusted crypto data. It is built for project teams, chain teams, ecosystem and growth teams, community managers, analysts and creators who want simple DeFi visuals they can share on X.

## Current product

- Create market cards from supported DeFi metrics.
- Add simple learn notes that explain what the metric means.
- Keep source attribution and updated dates visible on every card.
- Export PNG cards for sharing.
- Copy a deterministic caption generated from the current card data.

learnDeFi v0.8.1 is not an AI product, not a paid SaaS and not a crypto data terminal. This version has no AI features, auth, database, payments, paid plans, alerts or scheduled reports. The focus is card quality, source clarity and logo reliability.

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
- Known active entities must use approved local logos instead of initials or generated fallback badges.
- White, black and anthracite minimal styling should remain the visual baseline.

## Logo system

v0.8.2 keeps the logo lifecycle strict for share-card reliability:

- Logo assets live under `public/logos/chains`, `public/logos/projects` and `public/logos/assets`.
- The source-backed registry lives in `lib/logos/logoRegistry.ts` and records canonical name, slug, category, aliases, local path, source/provenance, rights note, quality, fit, scale, padding, background and notes.
- Runtime card rendering resolves known active entities to approved local registry paths first and does not hotlink external provider logos as the primary source.
- Generated or initials fallbacks are reserved only for truly unknown future entities and must not pass active logo checks.
- Future active metrics must add coverage in `lib/logos/metricLogoRequirements.ts` before shipping.

Source priority for adding or replacing logos:

1. Official brand kit, official website, official docs or official GitHub
2. CryptoLogos
3. Simple Icons
4. Trust Wallet assets
5. spothq cryptocurrency-icons
6. Data provider logo URL only as a last-resort candidate for local review/storage
7. Existing local file only if it is a real logo, not a generated badge
8. No fake placeholder

Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo registry.

## Logo QA

Run the static logo gate with:

```bash
npm run check:logos
```

`check:logos` reports total registry entries, approved local logos, missing files, external/data-provider entries, needs-review entries, rejected entries, alias collisions, fallback/generated entries, required active entity issues and active metrics without logo requirements. It fails when a required active entity lacks an approved local logo, provenance, a local file, non-placeholder SVG markup, or when an active metric has no logo requirement mapping.

The internal `/logo-audit` route shows every registry entry with metadata, warnings, 24px/32px/48px circle previews, a ShareCard-style row preview and light/dark background checks. It includes filters for all, required active, chains, projects, assets, missing, needs review, rejected and source type.


## v0.8.2 summary

- Replaces visible fake text-circle and generic badge logo assets for required active chain, project and asset coverage.
- Tightens `lib/logos/logoRegistry.ts` around the approved/needs-review/missing/rejected quality model and source priority.
- Expands `npm run check:logos` to block active metrics without requirements, alias collisions, missing provenance, external runtime logo paths and required placeholder text markup.
- Keeps `/logo-audit` as the internal QA surface for local previews, status badges, source metadata and visual fit checks.

## v0.8.1 summary

- Preserves the v0.8 brand/copy/card UX direction.
- Replaces active-output placeholder/initials treatment with a true local logo registry.
- Adds metric-level logo requirements so new active metrics cannot ship without logo planning.
- Strengthens `npm run check:logos` as a required PR gate.
- Expands `/logo-audit` as internal visual QA for card-quality logo previews.
