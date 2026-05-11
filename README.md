# learnDeFi

Make DeFi data share-ready.

learnDeFi creates clean, source-backed market cards from trusted crypto data. It is built for project teams, chain teams, ecosystem and growth teams, community managers, analysts and creators who want simple DeFi visuals they can share on X.

## Current product

- Create market cards from supported DeFi metrics.
- Add simple learn notes that explain what the metric means.
- Keep source attribution and updated dates visible on every card.
- Export PNG cards for sharing.
- Copy a deterministic caption generated from the current card data.

learnDeFi v0.8.3 is not an AI product, not a paid SaaS and not a crypto data terminal. This version has no AI features, auth, database, payments, paid plans, alerts or scheduled reports. The focus is card quality, source clarity and logo reliability.

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

v0.8.3 introduces a permanent local logo vault plus source-backed ingestion pipeline for share-card reliability. The registry alone is not proof that a logo is real or approved. Required active entities need both visual registry config and a source manifest record with provenance and a matching SHA-256 checksum.

Local vault layout:

```text
public/logos/
  chains/      # final rendered chain logos
  projects/    # final rendered project logos
  assets/      # final rendered asset logos
  raw/
    defillama/
    official/
    cryptologos/
    simple-icons/
    trustwallet/
    spothq/
```

Key files:

- `lib/logos/logoRegistry.ts` is the visual/rendering registry: canonical name, slug, category, aliases, local path, fit, scale, padding, background, required-active status and quality.
- `lib/logos/logoSourceManifest.ts` is the source/provenance manifest: local/raw paths, source provider, source URL or note, download timestamp, original content type, SHA-256, dimensions, approval status, rights note and notes.
- `lib/logos/metricLogoRequirements.ts` maps every active metric to the known entities that must have approved local source-backed logos before shipping.

Runtime rule:

- Required known active entities render only approved local logos that are present in both the registry and source manifest with matching checksums.
- Unknown/non-required entities may use verified external candidates or a clean generated/initials fallback, but that fallback is internally treated as missing/unknown and is never an approved real logo.
- External URLs are source candidates for ingestion, not runtime dependencies for required active entities.

Source priority for adding or replacing logos:

1. Official brand kit, official website, official docs or official GitHub
2. DefiLlama icon server as the fast bulk mirror candidate
3. CryptoLogos
4. Simple Icons
5. Trust Wallet assets
6. spothq cryptocurrency-icons
7. Other reputable data-provider logo URL
8. Existing local asset only if already source-backed and visually correct
9. Fallback only for unknown/non-required entities

Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.

## Logo ingestion and QA

Sync required active logos into the local vault with:

```bash
npm run logos:sync
```

`logos:sync` reads the required active entity list, builds prioritized source candidates, downloads raw files into `public/logos/raw/<provider>`, copies final accepted files into `public/logos/chains`, `public/logos/projects` or `public/logos/assets`, computes SHA-256 and dimensions, and updates `lib/logos/logoSourceManifest.ts`. If downloads are unavailable, it does not fake approvals; it writes unresolved candidates for review.

Run the deterministic logo gate with:

```bash
npm run check:logos
```

`check:logos` has no live API dependency. It fails when any required active entity is missing a registry entry, source manifest entry, local file, approved source status, approved registry quality, source provider, source URL/note, matching checksum, or when it uses generated/fallback/placeholder metadata, text-badge-like SVG markup, external runtime paths, or an active metric lacks logo requirements. It warns for optional unknown/fallback cases.

The internal `/logo-audit` route is the visual decision tool. It shows canonical name, slug, category, aliases, required-active status, final logo previews at 24px/32px/48px, ShareCard row preview, light/dark surfaces, local path, source provider, source URL/note, download time, short SHA, approval status, quality, fit/scale/padding, warnings, filters and source candidate links.

## v0.8.3 summary

- Adds source-backed logo manifest infrastructure separate from the visual registry.
- Adds `npm run logos:sync` for local logo vault ingestion and unresolved candidate reporting.
- Upgrades `npm run check:logos` to verify source manifest approval, provenance and checksums.
- Updates ShareCard logo resolution so required active entities do not silently use external/generated/initials fallback when source-backed approval is missing.
- Expands `/logo-audit` into a provenance, checksum and visual QA page.

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
