# learnDeFi

Make DeFi data share-ready.

learnDeFi creates clean, source-backed market cards from trusted crypto data. It is built for project teams, chain teams, ecosystem and growth teams, community managers, analysts and creators who want simple DeFi visuals they can share on X.

## Current product

- Create market cards from supported DeFi metrics.
- Add simple learn notes that explain what the metric means.
- Keep source attribution and updated dates visible on every card.
- Export PNG cards for sharing.
- Copy a deterministic caption generated from the current card data.

learnDeFi v0.10.0 is not an AI product, not a paid SaaS and not a crypto data terminal. Public card creation still has no user accounts, payments, paid plans, alerts or scheduled reports. This version expands the internal admin panel into an operations dashboard for API health, logo QA, source tools and brand-settings groundwork while preserving the public card UX.

## Stack

- Next.js 14
- React 18
- Tailwind CSS
- `html-to-image` for PNG export
- Postgres for internal admin logo review state
- Vercel Blob REST upload hooks for admin-uploaded logo candidates
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
- Known active entities must use approved local logos instead of initials or generated fallback badges; every visible active-card entity is logo-critical.
- White, black and anthracite minimal styling should remain the visual baseline.

## Logo system

v0.10.0 keeps the permanent local logo vault and admin source candidate resolution for mapped unresolved entities. The registry alone is not proof that a logo is real or approved. Required active entities need both visual registry config and a source manifest record with provenance and a matching SHA-256 checksum. A source-backed logo can still be visually rejected if it creates confusion or does not represent the entity clearly.

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
    coingecko/
```

Key files:

- `lib/logos/logoRegistry.ts` is the visual/rendering registry: canonical name, slug, category, aliases, local path, fit, scale, padding, background, required-active status and quality.
- `lib/logos/logoSourceManifest.ts` is the source/provenance manifest: local/raw paths, source provider, source URL or note, download timestamp, original content type, SHA-256, dimensions, approval status, rights note and notes.
- `lib/logos/metricLogoRequirements.ts` maps every active metric to the known entities that must have approved local source-backed logos before shipping.

Runtime rule:

- Required known active entities prefer approved local logos that are present in both the registry and source manifest with matching checksums and no visual rejection.
- Clean fallbacks may render in production to avoid broken cards, but fallback usage is still missing/unapproved and does not satisfy `npm run check:logos`.
- BSV Blockchain currently renders a clean BSV fallback because the available source-backed BSV icon is too similar to BTC for card usage.
- Unknown/non-required entities may use verified external candidates or a clean generated/initials fallback, but that fallback is internally treated as missing/unknown and is never an approved real logo.
- External URLs are source candidates for ingestion, not runtime dependencies for required active entities. CoinGecko image URLs are never rendered directly; mapped unresolved entities are downloaded into the local logo vault first.

Source priority for adding or replacing logos:

1. Official brand kit, official website, official docs or official GitHub
2. DefiLlama icon server as the fast bulk mirror candidate
3. CoinGecko markets metadata for mapped unresolved chain/project/entity slugs
4. CryptoLogos
5. Simple Icons
6. Trust Wallet assets
7. spothq cryptocurrency-icons
8. Other reputable data-provider logo URL
9. Existing local asset only if already source-backed and visually correct
10. Fallback only for unknown/non-required entities

Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.


## Admin Logo Manager

v0.10.0 adds a server-only admin foundation for reviewing logo candidates without changing the public card UI beyond approved logo resolution. The public API overlays DB-approved logo URLs onto card rows when `DATABASE_URL` is configured; if Postgres is unavailable, public cards keep using the existing local logo fallback chain and do not crash.

Admin routes:

- `/admin/setup` creates the first admin password and shows missing-config guidance when `DATABASE_URL` or session settings are absent.
- `/admin/login` starts an HTTP-only admin session.
- `/admin/logos` lists managed logo entities with approved/fallback previews, creates new review records and exposes a manual “Bulk refresh CoinGecko logos” action.
- `/admin/logos/[slug]` manages CoinGecko, DefiLlama, manual URL and Vercel Blob upload candidates, plus source previews and approve/reject actions.

Database setup:

```bash
npm run db:push
npm run admin:seed-logos
```


Public logo resolution remains: approved DB logo URL when available, then the source-backed local logo registry/source manifest, then the clean fallback path. Public cards do not depend on Postgres being available and never use CoinGecko remote image URLs directly at runtime.

`npm run admin:seed-logos` imports `lib/logos/logoRegistry.ts`, `lib/logos/logoSourceManifest.ts` and `lib/logos/metricLogoRequirements.ts`. Existing local vault records with `approvalStatus: "approved"` that are not visually rejected and do not prefer a fallback are inserted as approved `logos` rows, approved `logo_sources` rows and `approved_source_id` links. Visually rejected or fallback-preferred records remain `needs_review`, so fallbacks are never marked approved. After deployment, run the Admin DB Setup workflow again so the database receives these richer seed records.

Environment variables:

- `DATABASE_URL` enables Postgres-backed admin review and public approved-logo overlays.
- `ADMIN_SESSION_SECRET` signs admin sessions.
- `ADMIN_SETUP_TOKEN` optionally protects first setup and can also provide a setup-time signing secret.
- `COINGECKO_DEMO_API_KEY` enables the server-side bulk CoinGecko refresh action. CoinGecko IDs are maintained in `lib/admin/coingeckoLogoIds.ts`; slugs with `null`/missing mappings appear as missing CoinGecko IDs in admin.
- `COINMARKETCAP_API_KEY` enables server-only CoinMarketCap logo source actions. When absent, the API Settings and Logo Manager source tools show CoinMarketCap as disabled/missing key.
- `BLOB_READ_WRITE_TOKEN` enables Vercel Blob uploads; without it, admin upload forms show a missing-config state while URL candidates and local vault imports still work and only file uploads are disabled.


## Admin operations dashboard

The internal admin surface now uses `/admin` as the main operations dashboard instead of redirecting straight to logos. It summarizes provider health, Blob upload readiness, latest bulk refresh results, logo health counts and action-required items. `/admin/logos` remains the Logo Manager, but it now includes a QA inbox with issue badges for missing approved logos, review-needed candidates, missing CoinGecko/CoinMarketCap IDs, provider fetch failures, fallback usage, visual rejections, approved-but-not-used states, rejected sources and upload-disabled state. The page supports search by name, slug, IDs, provider and category, plus filter tabs and sorting by name, status, category, source provider, last updated or issues-first.

Bulk CoinGecko and CoinMarketCap refresh results are stored in `admin_settings` as `last_coingecko_bulk_refresh_summary` and `last_cmc_bulk_refresh_summary` with timestamp, refreshed count, missing mapping count, error count and first errors. Partial failures are displayed as warnings/notices in admin instead of making public cards fail.

`/admin/api` centralizes provider status for CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized asset sources. `/admin/brand` stores internal brand text/asset URL candidates in `admin_settings` as groundwork for a future rebrand, but the public product name, public cards and public metadata are not changed by these settings yet.

## Logo ingestion and QA

Sync required active logos into the local vault with:

```bash
npm run logos:sync
```

`logos:sync` reads the required active entity list, builds prioritized source candidates, resolves mapped CoinGecko coin IDs through the markets API when available, downloads raw files into `public/logos/raw/<provider>`, copies final accepted files into `public/logos/chains`, `public/logos/projects` or `public/logos/assets`, computes SHA-256 and dimensions, and updates `lib/logos/logoSourceManifest.ts`. If downloads are unavailable or CoinGecko returns no market image, it does not fake approvals; it writes unresolved candidates for review.

Run the deterministic logo gate with:

```bash
npm run check:logos
```

`check:logos` has no live API dependency. It fails when any required active entity is missing a registry entry, source manifest entry, local file, approved source status, approved registry quality, source provider, source URL/note, matching checksum, or when it uses generated/fallback/placeholder metadata, text-badge-like SVG markup, visual-rejected source-backed assets, external runtime paths, or an active metric lacks logo requirements. It warns for optional unknown/fallback cases.

The internal `/logo-audit` route is the visual decision tool. It shows canonical name, slug, category, aliases, required-active status, current rendered visual, source candidates, fallback state, visual override reasons, final logo previews at 24px/32px/48px, ShareCard row preview, light/dark surfaces, local path, source provider, source URL/note, download time, short SHA, approval status, quality, fit/scale/padding, warnings, filters and source candidate links.

## v0.10.0 summary

- Turns `/admin` into an operations dashboard with API provider status cards, logo health totals, action-required inbox items and quick actions.
- Adds `/admin/api` for server-side API/key health across CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized asset sources.
- Adds `/admin/brand` as an internal brand settings foundation for future learnDeFi → Onchain Visuals work without changing the public UI.
- Upgrades `/admin/logos` with a Logo QA Inbox, issue classification, search, filter tabs, sorting and a compact add-logo/source-tools layout.
- Persists latest CoinGecko and CoinMarketCap bulk refresh summaries in `admin_settings` and displays partial successes as admin warnings instead of public-runtime failures.
- Adds CoinMarketCap provider foundation through server-only `COINMARKETCAP_API_KEY`, optional logo record ID metadata and disabled UI states when the key is absent.
- Keeps public card behavior stable: approved DB logo URL first when available, then existing local logo vault/manifest paths, then clean fallback; public cards do not call logo provider APIs during render.

## v0.9.0 summary

- Adds Postgres schema for `logos`, `logo_sources` and `admin_settings`.
- Adds `npm run db:push` and `npm run admin:seed-logos` for admin database setup.
- Adds server-only admin auth helpers and `/admin/setup`, `/admin/login`, `/admin/logos` and `/admin/logos/[slug]`.
- Adds admin candidate actions for CoinGecko, DefiLlama, manual URLs, Vercel Blob uploads, approve and reject flows.
- Overlays DB-approved logos onto public card rows when `DATABASE_URL` is available and safely falls back when it is not.

## v0.8.5 summary

- Adds CoinGecko as a mapped logo source provider for unresolved entities such as Hyperliquid, MegaETH, Provenance, ENI and BSV Blockchain.
- Resolves CoinGecko markets metadata image URLs as source candidates, then downloads them into the local logo vault instead of rendering external URLs at runtime.
- Keeps BSV Blockchain visually rejected for card usage when source images remain BTC-like, so the clean fallback stays unapproved until manually accepted.

## v0.8.4 summary

- Adds visual-rejection handling for source-backed logos and keeps BSV Blockchain on a clean fallback until a distinct BSV asset is available.
- Adds direct/source-note candidates for MegaETH, Hyperliquid, Provenance and ENI while keeping unresolved fallbacks unapproved.
- Improves `/logo-audit` and `check:logos` reporting for fallback usage, source candidates and visual override reasons.

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
