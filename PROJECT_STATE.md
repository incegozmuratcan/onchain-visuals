# Vision

- Current app version: v0.11.0.
- learnDeFi is a simple, premium, share-ready DeFi market card maker.
- Core positioning: “Make DeFi data share-ready.”
- Supporting copy: “Create clean, source-backed market cards from trusted crypto data.”
- Main value loop: trusted data → clean card → simple learn note → X-ready output.
- Primary audience: crypto and DeFi project teams, chain teams, ecosystem/growth/community teams, content creators and analysts.
- learnDeFi is not an AI product, not a paid SaaS right now and not a crypto data terminal.
- The current UI should not include paid/free plan copy, alerts, scheduled reports, auth, admin panel or AI-heavy features.

# Current Stack

- Next.js
- React
- Tailwind CSS
- Postgres for internal admin logo review state
- Vercel Blob upload hooks for admin logo candidates
- DefiLlama
- Chainspect
- DePIN Pulse
- html-to-image for PNG export



## v0.11.7 Admin Dashboard + Logo Source Reliability

- Dashboard is action-first and calmer: compact system status dots, a max-five Action Required card, zero-value logo-health metrics hidden, short Recent Activity lines, compact API dots and Brand Health limited to Brand OK / primary logo / favicon / upload enabled.
- Source Tools summaries now lead with operator outcomes: “Discovery complete”, checked count, sources found, need-review count and errors, followed by compact CG / CMC / DefiLlama / Vault provider totals. Raw counters such as selected, already vaulted, missing source, skipped and candidate lists remain under Details.
- CoinMarketCap helper search expands known name/symbol aliases for BTC, ETH, KAT, ARB, AVAX, POL/MATIC, OP, BNB/BSC, SOL, Base, RNDR, MEGA, XPL, SUI, APT, NEAR and FIL. It dedupes results, scores name + slug + expected symbol together, and keeps symbol-only matches below high confidence.
- Provider helpers support high-confidence Use + Fetch flows. Bulk Fetch all sources can auto-resolve high-confidence CoinGecko, CoinMarketCap and DefiLlama IDs/slugs, fetch logos, add review-gated sources, respect manual/upload primaries and copy safe primaries to Managed Vault when Blob is configured.
- DefiLlama resolver now indexes real protocol, chain and stablecoin data, expands common chain/asset aliases, checks both protocol icon and `icons.llama.fi/chains/...` patterns, verifies icon URLs server-side and expects reliable results or accurate no-source messages for btc/bitcoin, ethereum/eth, polygon/matic, arbitrum/arb, avalanche/avax, solana/sol, bsc/bnb/bnb chain, optimism/op mainnet, base, katana and megaeth.
- Provider IDs now include a compact DefiLlama slug/source field stored in existing `admin_settings` per logo; no schema change is required.
- Fetch/approve/vault persistence is tightened: source rows are upserted durably, selected sources update `logos.approved_source_id` and `logos.approved_logo_url`, review metadata is preserved, rejected duplicate source URLs can be revived safely, and Managed Vault copies remain visible after reload.
- Legacy local-logo migration imports visualRejected/unsafe/BSV-style assets into Managed Vault as `needs_review` candidates with migration metadata (`migratedFrom`, `visualRejected`, `unsafe`, original path/provider and timestamp) without making them public primary automatically.
- Rejected sources expose Restore / Restore and use. Normal restore reactivates accidental rejections; safety or visual-rejected rows remain blocked from normal primary restore and require explicit advanced/manual handling.
- Alias / merge guard UI remains hidden from normal admin logo detail, and duplicate warnings do not affect needs-action counts.
- Logo detail top preview boxes are CoinGecko / CoinMarketCap / DefiLlama. Public source/status/next action remain in the left summary, and fallback is not promoted as a top provider box unless no source exists.
- Needs-action logic is narrowed to real work: no usable source, review-gated primary, provider ID/fetch blockers, visual rejection, migration candidates, rejected-all-source cases and required vault backup issues. Trusted CoinGecko primaries and reviewed CMC/DefiLlama primaries do not count only because optional backup IDs are absent.
- DB workflow safety: no schema changes in this PR. Admin DB Setup is not required.

## v0.11.6 Brand Settings Asset Health Cleanup

- Brand Health now distinguishes active public-site assets from optional/future assets. Primary/hero logo, favicon and upload availability are active checks; header logo, Apple touch icon and watermark are neutral optional statuses unless their public feature is enabled.
- Header logo remains editable but is labeled optional: it is used only if a separate public header is enabled, and otherwise acts only as the public hero fallback when `primaryLogo` is empty. Missing header logo is not an amber action-required warning when primary/hero logo exists.
- Brand asset rows are grouped by use: Main public assets, Optional public assets and Advanced / social assets. No asset fields were removed.
- Public hero fallback remains `primaryLogo` → `headerLogo` → `siteName`; share-card/export behavior and favicon handling were not changed.
- DB workflow safety: no schema changes in this PR. Admin DB Setup is not required.

# Active Metrics

## Chains

- Revenue (24H / 7D / 30D)
- Stablecoin Supply (current)
- TVL (current)

## Protocols

- DePIN
  - 30D annualized revenue
  - 24H revenue
  - No 7D option because DePIN Pulse does not provide 7D revenue

## Infrastructure

- TPS (Real-time TPS, 1H)
- Block Time (1H)
- Avg Tx Fee (24H)
- Developers

## Assets

- BUIDL onchain marketcap
- BENJI onchain marketcap

# Data Source Rules

## DefiLlama

- Primary reliable source for chain revenue, stablecoin supply, TVL and supported tokenized asset views.
- Source attribution must remain visible on every card and PNG export.

## Chainspect

- TPS uses Real-time TPS (1H), not 30D TPS.
- Never label 1H data as 30D.
- Cache duration is 1 hour.
- If live parsing fails, use a verified snapshot.
- Stable UX is preferred over fragile live parsing.
- Never show broken cards.
- Developers belong under Infrastructure.

## DePIN Pulse

- Used for DePIN revenue leaderboards.
- DePIN belongs under Protocols.
- Card settings should show Protocols → DePIN, not Chains → Revenue.
- Timeframe selector only supports 24H and 30D.
- Do not fabricate estimated 7D revenue.
- DePIN cards keep chain/network information at the far-right side of each row.






## v0.11.5 Admin Logo Detail Cleanup + DefiLlama Resolver Fix

- Alias / merge guard duplicate warnings are no longer rendered in the normal admin logo detail page. The dormant `logo_aliases` infrastructure can remain for future use, but logo detail now stays focused on source summary, provider rows, Managed Vault, Manual / Upload and collapsed Advanced debug.
- DefiLlama source discovery now expands common aliases (`btc`/Bitcoin, `eth`/Ethereum, `bsc`/BNB Chain, `op mainnet`/Optimism, `avax`/Avalanche, `matic`/Polygon, `arbitrum one`/Arbitrum) against the server-side chain/protocol/stablecoin indexes and verifies icon URLs before presenting a candidate.
- DefiLlama recommendations are strict: exact normalized name, exact slug or known alias matches can be high confidence, category-compatible matches get a boost, and unrelated substring/first-letter matches stay out of the recommended path. Weak matches, when present, remain collapsed under Other possible matches and cannot be auto-fetched from the helper.
- The DefiLlama helper shows Source present only when this logo already has a non-rejected DefiLlama source row. A newly found reliable resolver candidate is labeled Recommended source found until an admin uses/fetches it; no-source states say No reliable DefiLlama source found without implying a stored source.
- Fetch all sources uses the same fixed DefiLlama resolver. High-confidence DefiLlama matches can be added as review-gated candidates and selected only when safer sources are missing; low-confidence or missing matches create a clear non-fatal notice instead of an Application error.
- DB workflow safety: no schema changes in this PR. Admin DB Setup is not required.

## v0.11.4 Logo Source Engine Automation + Cleanup

- Source Tools are grouped by operational importance: **Daily actions** contains Discover missing sources, Retry failed and Scan metrics; **Maintenance** contains Force discover all, Apply safe CG, Backup approved to vault and Import legacy local logos to Vault.
- Safe CoinGecko primaries now try to create a Managed Vault backup automatically whenever Blob is configured. Vault provenance stores `copiedFromProvider`, `copiedFromSourceId`, `copiedFromUrl`, `copiedAt`, `mimeType`, `fileSize`, `autoVault` and `reason` (`trusted-primary`, `reviewed-primary` or `bulk-backup`). CoinMarketCap and DefiLlama sources are copied to Vault after an admin marks the primary reviewed. Rejected and visual-rejected sources are never copied automatically.
- A one-time legacy local-logo migration action reads the old source manifest/assets internally and imports useful assets to Managed Vault as `needs_review` candidates only when no active provider/manual/vault source already exists. Local Static Manifest remains absent from normal provider rows, public resolution, badges, QA recommendations and active source selection.
- CoinGecko and CoinMarketCap finders now score candidates by exact normalized name/slug/alias confidence, penalize wrapped/bridged/staked/LP/IOU/stablecoin derivative matches, label Recommended vs Other matches, and offer **Use + Fetch** for high-confidence candidates. Bulk Fetch all sources can auto-resolve high-confidence CG/CMC IDs before fetching, but uncertain matches remain manual.
- CoinMarketCap search prioritizes exact name/slug matches over symbol-only results and keeps numeric IDs only for CMC fetches; non-numeric CMC IDs are treated as ID-review cases.
- DefiLlama is resolved through a server-side index of protocols, chains and stablecoin assets instead of blindly accepting a guessed URL. The helper shows Recommended/Other matches when an actual icon URL resolves, or a compact no-source/error notice when unavailable.
- Rejected provider rows now expose Restore and Restore and use actions. Normal restore is blocked for safety/visual-rejected rows; restored CoinGecko can become trusted primary only if it still passes the safe CoinGecko checks, while CMC/DefiLlama restore as review-gated sources.
- Duplicate handling added a safe `logo_aliases` table and dormant backend helpers for future alias support. Duplicate / alias warnings are no longer shown in the normal admin logo detail UI; public logo overlay resolution can still check aliases before falling back.
- The detail-page top preview now shows provider boxes for CoinGecko, CoinMarketCap and DefiLlama. Public source/status/next action remains in the left summary, and safe CoinGecko primary shows Trusted/No action required instead of false Needs Review noise.
- Needs-action counting is narrower: fallback/no source, review-gated primary, provider ID/fetch blockers, visual rejection and rejected restore cases count; safe CoinGecko primaries and reviewed non-CG primaries do not count just because backup IDs are missing.
- Public logo resolution remains explicit: if a Managed Vault source is marked primary, public cards use the Vault URL; if a provider source is marked primary, public cards use that provider URL while Vault remains an admin-visible backup.
- DB workflow safety: this PR adds only a non-destructive `CREATE TABLE IF NOT EXISTS logo_aliases` schema addition. Admin DB Setup / `npm run db:push` is required to enable alias persistence in environments that have not yet applied the table; all other automation uses existing `logos`, `logo_sources` and `admin_settings` columns.

## v0.11.3 Logo Source Engine Cleanup + Vault-First Model

- Active logo operations now use a vault-first source model: CoinGecko, CoinMarketCap and DefiLlama are discovery sources; Managed Vault is the durable Blob storage layer; Manual URL/Upload is the admin override; generated fallback icons are last resort.
- Local Static Manifest was removed from active logo operations. It is no longer shown as a provider row, backup candidate, import action, top badge, recommended action or normal public fallback. Legacy manifest files may remain for audit/build history only and are not part of the active source engine.
- The logo detail page is minimal by default: top public-logo summary, five provider rows (CoinGecko, CoinMarketCap, DefiLlama, Managed Vault, Manual / Upload), compact Discover/Provider IDs/Manual Source helpers, and a collapsed Advanced section. Raw source records moved into Advanced so backup rows are not duplicated in the main UI.
- Review rules are source-aware: trusted CoinGecko primary does not count as needs review; CoinMarketCap and DefiLlama primaries stay pending until approved; Managed Vault needs review unless copied from an already reviewed source; manual/upload admin choices are reviewed by default. Rejecting a selected source attempts to choose the next safe source without selecting rejected, visual-rejected or BSV/BTC-confusing candidates.
- DefiLlama has a compact source resolver on logo detail. Admins can search by name, slug or known alias, see only verified high-confidence recommendations with preview/source URL, and fetch them as reviewable DefiLlama discovery sources; weak matches stay collapsed and unavailable for auto-fetch.
- Bulk Source Tools keep **Discover missing sources**, **Force discover all** and **Backup approved to vault**. Vault backup copies approved primaries when Blob is configured, skips rejected/visual-rejected/already-vaulted sources, keeps provider URLs as provenance, and does not change primary unless an admin chooses the Vault copy.
- Public logo resolution is DB-approved URL first (manual/upload or selected Managed Vault/provider source), then generated fallback. Provider URLs are used publicly only when selected/approved in DB; Local Static Manifest is not a normal public fallback.
- No schema change is required. Managed Vault continues to use existing `logo_sources.provider`, `logo_sources.metadata`, `approved_source_id`, `approved_logo_url` and admin setting summary fields. Admin DB Setup is not required for this PR.

## v0.11.2 Logo Source Discovery + Managed Vault

- Logo sourcing now has a non-destructive discovery workflow. The detail page exposes **Fetch all sources** for one logo, and Logo Manager Source Tools expose **Discover missing sources**, **Force discover all** and **Backup approved to vault** for the database.
- Source priority is deterministic: protected admin manual/upload choices are preserved first; otherwise safe CoinGecko is trusted/approved; CoinMarketCap, DefiLlama and Managed Vault can be selected as primary with `reviewStatus=selected_needs_review`; Managed Vault is preferred before reviewed provider fallbacks and Local Static Manifest is removed from active operations.
- CoinMarketCap IDs are treated as numeric IDs only. Slugs such as `bitcoin` are flagged as ID review, fetch buttons are disabled for non-numeric values, and the CoinMarketCap finder searches server-side with the admin/environ API key and presents candidate name, symbol, numeric ID, slug and logo.
- Managed Logo Vault copies selected provider images into Vercel Blob under `logo-vault/{slug}/{provider}-{timestamp}.{ext}` when `BLOB_READ_WRITE_TOKEN` is configured. PNG, JPEG and WebP are allowed; SVG is not copied until sanitization exists. Vault records are stored as `logo_sources.provider = managed-vault` with copy provenance metadata.
- Review flow is one click: **Mark reviewed**, **Use as primary**, **Reject**, **Fetch all sources**, **Copy to Vault** and **Find ID** are the primary actions. Non-CoinGecko automatic selections stay review-needed until an admin marks them reviewed.
- Safety rules: discovery does not delete sources, does not overwrite protected manual/upload selections, does not auto-approve rejected or visual-rejected candidates, does not send non-numeric CMC IDs to CMC logo fetch, does not expose provider keys to the browser, and never writes to the repo filesystem at runtime.
- Workflow: no DB schema change is required for Managed Vault because it uses existing `logo_sources.provider` and `metadata` fields. Admin DB Setup is not required for this PR unless an environment needs the prior schema updates.

# v0.11.1 Admin Productization + Stability

- Current app version remains v0.11.0; this PR is an admin productization/stability release without a package version bump.
- Admin uses one shared authenticated global nav across `/admin`, `/admin/logos`, `/admin/logos/[slug]`, `/admin/api` and `/admin/brand`: Dashboard, Logo Manager, API, Brand and Log out.
- Logo Manager is a single-screen operations view: search is primary and live, empty search shows the action-needed working set, non-empty search scans all logos regardless of active filter, rows are compact, and results load 10 at a time.
- Logo QA summary is action-first only: needs action, missing approved logo, missing CoinGecko ID, provider/ID review, fallback used, visual rejected and newly discovered. Healthy/zero-value metrics stay out of the primary viewport.
- Logo detail rendering is hardened against string/object/null metadata, invalid JSON, null approved sources, invalid image URLs and malformed source rows. Bad data renders placeholders and compact admin warnings instead of client-side Application errors. The detail page now uses a deterministic Logo Source Engine panel with CoinGecko priority, human-review states for CMC/DefiLlama/Managed Vault/manual choices, provider rows, backup sources and collapsed advanced debug.
- Expected admin action errors use compact notices instead of generic Application errors for provider fetches, manual URL validation, Blob-disabled uploads, manual URL candidates, approvals/rejections, metric scans, brand saves and API key actions. Secrets are not included in notices.
- Local Static Manifest sources are no longer visible on detail pages and are not importable through active admin operations. Rejected/confusing sources stay rejected/candidates, and discovery does not overwrite admin-approved manual/upload/CoinGecko choices.
- API Settings now manages encrypted admin API secrets for CoinGecko, CoinMarketCap and optional DefiLlama keys. Resolution order is encrypted admin DB secret → environment variable → public/no-key fallback where supported → disabled. `ADMIN_ENCRYPTION_KEY` is required for saving admin secrets; decrypted values are never sent to the browser, logged, revealed or copied. `NEXT_REDIRECT` is guarded in save/test/delete flows and scrubbed from stored/displayed provider status.
- `db/schema.sql` adds the safe non-destructive `admin_api_secrets` table. Admin DB Setup (`npm run db:push`) is required after merge; seed scripts were not changed, so Seed Protection Test is not required for this PR.
- Brand Settings defaults to public-site assets and public-active text only. Social/unused assets plus short name/supporting copy are advanced. Brand health warns only for public assets and upload state. Copy uses “onchain” and the default slogan remains “Clean onchain visuals. Simple explanations. Share-ready cards.”
- Public hero uses the uploaded wordmark as the hero mark without duplicate site-name text, calmer slogan typography and manual optical alignment controls for offset, max width, spacing, slogan size/weight/line-height and optional subtitle display. Public card generation logic is otherwise unchanged.
- CoinGecko ID discovery is available in logo detail: server-side search returns candidate name/symbol/id/thumb results, lets admins save the chosen ID, and keeps unsafe guesses manual.

# v0.11.0 Admin Operations + Brand System

- The current app version is v0.11.0.
- Admin UI is now a compact operations console across `/admin`, `/admin/logos`, `/admin/logos/[slug]`, `/admin/api` and `/admin/brand`: dense tables, compact badges, sticky toolbars, action-first Logo QA filters and collapsed advanced/debug/danger sections replace scroll-heavy presentation cards.
- Logo detail pages use a three-column operations layout for current state, sources and actions; approved/fallback/public-row/light-dark previews are consolidated into one compact preview strip; public overlay debug and destructive actions are collapsed by default.
- CoinGecko is the primary logo source for known CoinGecko IDs. Safe fetches auto-approve through the DB-approved overlay unless the logo is visually rejected, fallback-preferred, BSV/confusing, previously rejected, or already has an admin-approved manual/upload/stronger source. Admin-approved manual/upload choices remain protected.
- Bulk CoinGecko refresh summaries now track fetched, auto-approved, candidate, skipped-admin-approved, skipped-visual-rejected, missing mapping and error counts. Auto-approved sources carry metadata for “approved · auto” UI states.
- Metric Output Scanner / Logo Discovery Engine scans active metric outputs (Top 30 default), upserts missing entities, checks coverage, imports safe CoinGecko logos, records QA issue types (`newly_discovered_entity`, `missing_from_logo_db`, `discovered_missing_logo`, `metric_scan_error`, `auto_logo_imported`) and stores the latest summary in `admin_settings`. It runs only from admin/manual operations, not public render.
- Brand Settings supports real brand asset management for primaryLogo, darkLogo, iconMark, headerLogo, favicon, appleTouchIcon, xAvatar, xBanner and watermarkMark. Manual URLs work without Blob; Blob upload is enabled only with `BLOB_READ_WRITE_TOKEN`, PNG/JPEG/WebP only, SVG disabled, 500 KB normal limit and 2 MB X banner limit, with metadata saved in `brand_settings`.
- Public brand integration covers siteName, shortName, mainSlogan, heroSubtitle, cardFooterText, createdWithText, metaDescription, header/primary logo, favicon/apple-touch-icon and share-card watermark/footer defaults. DB/API/Blob outages fall back safely.
- Public homepage hero/header is simplified around the uploaded brand wordmark plus “Clean onchain visuals. Simple explanations. Share-ready cards.” while preserving the existing card generator and data workflows.
- Admin dashboard surfaces metric discovery summary, brand asset health, upload/Blob state, API status, logo health and action-required items for missing brand assets, missing Blob token, metric scan errors, newly discovered entities and missing approved logos.
- Workflow rules: Admin DB Setup only after schema/seed changes or explicit DB migration/import; Seed Protection Test after seed changes; metric logo discovery is a manual admin operation.

# v0.10.1 Admin Stability + Public Brand Integration

- The current app version is v0.11.0.
- Admin pages now use safe DB query wrappers and section-level error panels so expected schema/query/config problems guide the operator instead of showing a generic Application error. Suggested actions include running Admin DB Setup, checking Vercel runtime logs, checking DATABASE_URL and checking recent migrations.
- Admin DB Setup remains safe and idempotent: run `npm run db:push` and `npm run admin:seed-logos`; the seed preserves existing approved DB logos and does not overwrite admin-approved choices with local manifest, DefiLlama or fallback seed data.
- Public logo resolution remains approved DB logo URL first, then local source manifest/registry logo, then clean fallback. Overlay failures warn server-side and fall back without breaking public APIs. Alias matching covers common chain/project slug variants including Polygon, BNB Chain, OP Mainnet, XRP Ledger, Filecoin, Render Network, Ethereum, Solana, Arbitrum, Avalanche, Base, Sui and Aptos.
- Brand Settings now apply to the public homepage hero/header copy, metadata title/description, optional favicon/apple-touch-icon URLs and ShareCard footer/watermark text. If the database is unavailable, the public site falls back to the learnDeFi defaults and does not crash.
- Brand Settings save now redirects with clear success/error feedback, records a last-saved timestamp and explains that public integration is active while Blob-backed file uploads remain placeholders. Manual asset URL fields save and preview even without Blob.
- Blob-disabled messaging is consistent: `BLOB_READ_WRITE_TOKEN` missing means URL candidates and manual URL candidates still work; vault uploads require Blob and file uploads are disabled.
- API Settings provider statuses use connected, missing key, public-no-key, disabled or error without exposing secrets. CoinMarketCap remains foundation-level: missing `COINMARKETCAP_API_KEY` disables CMC bulk refresh/fetch UI and CMC candidates cannot be approved for public hotlinking unless copied/stored safely.
- Required environment names: `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_SETUP_TOKEN`, `COINGECKO_DEMO_API_KEY`, optional `COINMARKETCAP_API_KEY`, and optional `BLOB_READ_WRITE_TOKEN` for uploads.

# v0.10.0 Admin Operations Dashboard

- The current app version is v0.11.0.
- `/admin` is now the internal operations dashboard with provider status cards, logo health summary cards, action-required inbox items, Blob setup status, latest bulk refresh summaries and quick links to Logo Manager, API Settings and Brand Settings.
- `/admin/logos` now includes a Logo QA Inbox and classifies each record with issues: `missing_approved_logo`, `needs_review`, `missing_coingecko_id`, `coingecko_fetch_failed`, `fallback_used`, `visual_rejected`, `approved_but_not_used`, `rejected_source`, `upload_disabled`, `missing_cmc_id` and `cmc_fetch_failed`.
- Logo Manager defaults to name A→Z, has stronger search across name, slug, IDs, provider and category, filter tabs for important issue groups and sorting by name, status, category, source provider, last updated or issues-first.
- Bulk source tools live in the Logo Manager Source tools panel instead of the header. Latest CoinGecko and CoinMarketCap bulk refresh summaries are stored in `admin_settings` keys `last_coingecko_bulk_refresh_summary` and `last_cmc_bulk_refresh_summary`.
- CoinMarketCap is added as a server-only logo provider foundation through `COINMARKETCAP_API_KEY`. If the key is absent, admin shows CMC as missing/disabled and public runtime still works. CMC IDs may be stored on `logos.coinmarketcap_id` or source metadata.
- `/admin/api` shows provider status for CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized asset sources. Key presence is yes/no only; secret values are never exposed to the browser.
- `/admin/brand` stores brand text and asset URL candidates in `admin_settings`; as of v0.10.1, explicitly saved values feed public copy, metadata, optional favicon URLs and card footer text while defaults remain learnDeFi when DB settings are absent.
- Blob upload disabled behavior is explicit across dashboard, Logo Manager and API Settings: URL candidates and manual URL candidates still work; vault uploads require Blob and file uploads are disabled when `BLOB_READ_WRITE_TOKEN` is missing.
- Required admin/setup env names: `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_SETUP_TOKEN`, `COINGECKO_DEMO_API_KEY`, `COINMARKETCAP_API_KEY` and `BLOB_READ_WRITE_TOKEN`.
- Public card logo fallback behavior remains stable: approved DB logo URL first when Postgres is available, then existing local logo vault/manifest/registry logo, then a clean fallback. Public cards must not call CoinGecko, CoinMarketCap, DefiLlama or admin APIs during render.

# v0.9.0 Admin Logo Manager Foundation

- The public card creator remains unchanged except that approved logo URLs from Postgres may overlay row logos when `DATABASE_URL` is configured.
- Public pages and API routes must keep working without `DATABASE_URL` or `BLOB_READ_WRITE_TOKEN`; missing database/blob config disables admin persistence/uploads rather than breaking public cards.
- Internal admin routes are `/admin/setup`, `/admin/login`, `/admin/logos` and `/admin/logos/[slug]`.
- Admin auth is server-only, uses an HTTP-only signed cookie and stores the admin password hash in `admin_settings`.
- Postgres schema lives in `db/schema.sql` with `logos`, `logo_sources` and `admin_settings`.
- Admin setup scripts are `npm run db:push` and `npm run admin:seed-logos`; `admin:seed-logos` now imports the local logo registry, source manifest and metric requirements into Postgres.
- Source-manifest records with `approvalStatus: "approved"` become approved DB logos only when they are not visually rejected and do not prefer a fallback; rejected/fallback-preferred records stay `needs_review`.
- Run the Admin DB Setup workflow again after deployment or after adding the `DATABASE_URL` secret so richer seed records and approved logo metadata populates the database.
- Logo candidate sources supported in admin are CoinGecko, DefiLlama, manual HTTPS URL and Vercel Blob upload; `/admin/logos` also has a manual bulk CoinGecko refresh button.
- CoinGecko slug mappings live in `lib/admin/coingeckoLogoIds.ts`; missing/null mappings should be shown as missing CoinGecko IDs in admin rather than guessed.
- `BLOB_READ_WRITE_TOKEN` is required only for manual Vercel Blob uploads. URL candidates and bulk CoinGecko candidates remain useful without Blob configured.
- Admin review can approve or reject source candidates and mark logo entities rejected.
- This is an internal foundation only; do not add public auth, payments, paid tiers, scheduled reports or unrelated admin features.

# v0.8.5 CoinGecko Logo Source Provider

- Logo strategy is now a source-backed local logo vault: source candidate → raw download → final local asset → source manifest → checksum → visual registry → audit → render.
- Codex must not draw, invent, approximate or hand-code logos for required active entities.
- Required active entities must not use fake/generated badges, initials, text circles, placeholders, or runtime external logo URLs as approved logos.
- Every entity visible in active card output remains logo-critical.
- DefiLlama is the fast bulk mirror candidate source, with mapped CoinGecko markets metadata, official brand kits/sites/docs/GitHub, CryptoLogos, Simple Icons, Trust Wallet assets, spothq and other reputable provider URLs used as overrides when better or necessary.
- External logo URLs are source candidates only; required active ShareCard rendering depends on approved local files with source manifest provenance and matching SHA-256 checksums. CoinGecko image URLs are never rendered directly and must be downloaded into the local logo vault.
- Unknown/non-required entities may use a clean fallback at runtime, but that fallback is treated as missing/unknown and is never an approved real logo.
- A source-backed logo can still be visually rejected if it creates confusion or does not represent the entity clearly; approved source provenance alone is not enough for card acceptance.
- BSV Blockchain currently uses a clean BSV fallback because the available Bitcoin SV icon is too similar to BTC; the fallback is production-safe but remains missing/unapproved for logo gate purposes.
- New active metrics require coverage in `lib/logos/metricLogoRequirements.ts`, source-backed local logos, source manifest records and a passing `npm run check:logos` before shipping.
- `npm run logos:sync` ingests/downloads required active logos into `public/logos/raw/<provider>` and final files into `public/logos/chains`, `public/logos/projects` and `public/logos/assets`; for mapped unresolved entities it resolves CoinGecko coin IDs through the markets API and records unresolved candidates when no image is returned instead of faking approvals.
- `npm run check:logos` must pass before PR/deploy; it fails missing registry entries, missing source manifest entries, missing local files, checksum mismatch, non-approved source status, non-approved registry quality, fallback/generated providers, visually rejected source-backed assets, external runtime paths, text-badge-like SVG markup and active metrics without logo requirements.
- `/logo-audit` is the required visual QA route for provenance, checksum, warning filters, 24px/32px/48px previews, ShareCard row previews and source candidate review.

# Logo System

- Logo reliability is a core product quality requirement because share-card quality depends on recognizable, balanced logos.
- The source manifest lives in `lib/logos/logoSourceManifest.ts` and records canonical name, slug, category, local/raw paths, provider, source URL/note, download time, original content type, SHA-256, dimensions, approval status, rights note and notes.
- The visual rendering registry lives in `lib/logos/logoRegistry.ts`; it keeps canonical name, slug, category, aliases, local path, fit, scale, padding, background, required-active status and visual quality. It is not source proof by itself.
- Legacy local vault layout (audit/build history only; not active source-engine fallback): final assets in `public/logos/chains`, `public/logos/projects` and `public/logos/assets`; raw downloads in `public/logos/raw/defillama`, `public/logos/raw/official`, `public/logos/raw/cryptologos`, `public/logos/raw/simple-icons`, `public/logos/raw/trustwallet`, `public/logos/raw/spothq` and `public/logos/raw/coingecko`.
- Fallback hierarchy:
  1. required known active entities: approved local registry logo plus approved source manifest record with matching checksum only
  2. unknown/non-required entities: approved local logo if available
  3. unknown/non-required entities: verified external candidate if allowed
  4. unknown/non-required entities: clean generated fallback
  5. unknown/non-required entities: initials fallback
- Required active entities may render clean production fallbacks to avoid broken card UI, but fallbacks do not count as approved source-backed logos and check gates must continue to flag them.
- Logos should be optimized for perceived size and visual weight, not mathematically identical scaling.
- Circular logo containers should feel filled and premium; avoid tiny symbols floating inside empty circles.
- Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.

# UI Rules

- Minimal Apple-like aesthetic.
- White / anthracite / black palette.
- Share-card optimized layouts.
- Product should feel like a fast card creator, not a chatbot.
- Do not redesign the overall product or card layout without explicit direction.
- Main homepage hierarchy:
  - Brand primary logo/header logo as the main wordmark, or text siteName only when no logo is available
  - Clean onchain visuals. Simple explanations. Share-ready cards.
  - Optional low-emphasis heroSubtitle only when intentionally configured and non-redundant.
- Default first-run card: “Top 10 chains by stablecoin supply”.
- Use “Create card”, “Create a market card”, “Card settings” and “Try these cards” in user-facing card-creator copy.

# Important Product Decisions

- Correctness > fake precision.
- Live metric naming must match actual source timeframe.
- Never label 1H data as 30D.
- Never fabricate unsupported metrics.
- No visible paid/free/pro/scheduled report monetization copy in the current UI.
- No AI features or AI branding in this version.
- Prefer stable UX over fragile live parsing.

# Known Problems / Follow-up

- Chainspect parsing can be unstable because it relies on public dashboard markup.
- Public dashboards sometimes return unexpected formats.
- Monitor official brand guideline changes for curated local logo assets and update provenance/rights notes as needed.

# Out of Current Scope

- AI or chatbot features.
- Public user auth or payments.
- Paid/free plans.
- Scheduled reports, saved reports and alerts.
- Public admin entry points beyond the internal admin dashboard, Logo Manager, API Settings and Brand Settings routes.
- Competing with data terminals such as DefiLlama, Token Terminal or Artemis.

# Versioning

- Current app version: v0.10.2.
- Every future release must update both:
  - the version badge source in `lib/version.ts`
  - this `PROJECT_STATE.md` file
  - `package.json` when the release version changes

# Workflow

## User

- Product direction.
- Decisions.
- Vision.

## ChatGPT

- Architecture.
- Strategy.
- Technical planning.

## Codex

- Implementation.
- Refactors.
- Parsing.
- UI execution.

# Maintenance

- Keep this file concise, structured and continuously updated after major decisions or implementations.

# v0.10.2 Admin Operations Hardening

- The current app version is v0.11.0.
- Admin DB Setup is not run after every admin UI update. Run it only when `db/schema.sql` changed, `scripts/admin-seed-logos.mjs` changed, the DB was reset, or a migration/import is explicitly needed.
- `admin:seed-logos` preserves admin-approved logo rows with `status = 'approved'` and `approved_logo_url`: approved URL/source, status, provider IDs, visual status, fallback text/color and manual notes are not replaced by local manifest, DefiLlama or fallback seed data. Seed output reports raw/deduped records, preserved approvals, legacy imports, candidates and skipped overwrites.
- `npm run admin:test-seed-protection` verifies the seed preservation contract against Polygon, then restores the original row state. A manual GitHub workflow named Admin DB Seed Protection Test runs the same command with `DATABASE_URL`.
- Logo QA Inbox now functions as the operational memory for broken logos: issue badges, provider summaries, recommended actions, last fetch provider/error/time, overlay issues, search across provider IDs/source URLs/issues and sort by last fetch time are available on `/admin/logos`.
- Logo detail pages are the primary fixing tool with current DB state, approved/fallback/public-card previews, 24px/32px/48px light/dark previews, source metadata, provider ID forms, retry/provider candidate actions, manual URL, fallback controls, visual rejection, needs-review marking and public overlay debug slugs.
- Bulk CoinGecko and CoinMarketCap refreshes tolerate partial failures, store summaries in `admin_settings`, revalidate admin pages and translate 429/404/401/403/network failures into operator guidance.
- Provider ID rule: DB provider ID > mapping file provider ID > missing mapping. DB IDs override code mappings and can be changed from the logo detail page.
- Public DB logo overlay remains DB-approved URL first, generated fallback second; Local Static Manifest is not a normal public fallback. DB failures warn safely and alias matching covers Polygon, BNB Chain, OP Mainnet, XRP Ledger, Render Network, Filecoin, Hyperliquid L1, MegaETH, ENI and BSV Blockchain variants.
- Brand Settings continue to drive public site name/copy/metadata/share-card footer when saved, with defaults for empty fields and explicit save feedback including Blob upload-disabled status.
- API Settings now lists provider state, key configured yes/no, last success/error, metrics, next action, exact env vars and docs links for CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized sources.
- Blob status is explicit: missing `BLOB_READ_WRITE_TOKEN` disables uploads only; URL candidates, manual URL save and brand text save continue. SVG upload remains disabled; raster uploads are type/size checked when Blob is configured.
