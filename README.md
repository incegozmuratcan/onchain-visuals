# learnDeFi

Make DeFi data share-ready.

learnDeFi creates clean, source-backed market cards from trusted crypto data. It is built for project teams, chain teams, ecosystem and growth teams, community managers, analysts and creators who want simple DeFi visuals they can share on X.

## Current product

- Create market cards from supported DeFi metrics.
- Add simple learn notes that explain what the metric means.
- Keep source attribution and updated dates visible on every card.
- Export PNG cards for sharing.
- Copy a deterministic caption generated from the current card data.

learnDeFi v0.11.0 is not an AI product, not a paid SaaS and not a crypto data terminal. Public card creation still has no user accounts, payments, paid plans, alerts or scheduled reports. This version expands the internal admin panel into an operations dashboard for API health, logo QA, source tools and brand-settings groundwork while preserving the public card UX. v0.11.0 turns admin into a compact operations console, makes CoinGecko the safe primary auto-approval source, adds metric-driven logo discovery, enables real Blob-backed brand asset uploads, and simplifies the public hero/header while preserving public card generation and fallbacks.




## v0.11.12 Provider Source Canonicalization + DefiLlama Coverage Fix

- Logo QA now resolves one canonical source per logo/provider before computing coverage, provider rows, source badges, missing-source filters and public candidates. Canonical states are `OK` for reviewed/admin-approved/auto-approved public-eligible sources, `PEND` for persisted sources that still need review, `NO` when no DB source row exists and `ERR` when the only persisted rows are rejected, unsafe, invalid or errored.
- DefiLlama duplicate rows are treated as history rather than active state: an approved/reviewed DefiLlama row keeps `DL OK` even when older candidate or selected-needs-review rows exist, while a selected-needs-review row keeps `DL PEND` when no reviewed source exists. Helper previews alone remain `DL NO`.
- DefiLlama Use + Fetch continues to upsert by logo/provider plus stable DefiLlama slug/source/image identity, preserves already reviewed rows, will not silently revive rejected rows and records resolver metadata such as `defillamaSlug`, confidence, reasons, `fetchedAt`, review status, `sourceOrigin = defillama-helper` and canonical-candidate hints. Success notices are shown only after the DB source row is saved and both logo admin routes are revalidated.
- Missing DefiLlama now includes only canonical `DL NO` and `DL ERR`; canonical `DL PEND` and `DL OK` clear the Missing DefiLlama filter. Missing logo still means no reviewed/approved public-eligible source exists, so pending DefiLlama clears Missing DefiLlama but does not make the logo healthy until reviewed.
- Logo Manager source cells and detail provider rows use the canonical coverage display (`Primary: <provider>` plus `CG/CMC/DL/Vault OK/PEND/NO/ERR`). The DefiLlama helper badge shows `SOURCE PRESENT` only for canonical persisted `DL OK` or `DL PEND`, `RECOMMENDED SOURCE` for unsaved high-confidence resolver matches, `OTHER MATCHES ONLY` for weaker matches and `NO RELIABLE SOURCE` when no reliable match exists.
- Public card logo candidates use canonical public-eligible sources only: selected reviewed primary, reviewed Managed Vault, reviewed CoinGecko, reviewed CoinMarketCap, reviewed DefiLlama, then generated fallback. Pending, rejected, unsafe, visualRejected, helper-preview-only and non-canonical duplicate candidates are excluded. Existing duplicate rows are not deleted; Advanced / Source records labels the canonical row and keeps historical rows visible. No schema changes were made; Admin DB Setup is not required.

## v0.11.11 Provider Coverage + Fetch Persistence + Source Tools UX

- Provider coverage now uses a DB-backed state machine for CoinGecko, CoinMarketCap, DefiLlama and Managed Vault: `OK` means a reviewed/approved public-eligible source row exists, `PEND` means a non-rejected source row exists but still needs review, `NO` means no source row exists and `ERR` means the saved provider source is rejected, unsafe, invalid or blocked by fetch/provider review. Helper previews, guessed URLs, generated fallbacks and logos from other providers do not count as provider coverage.
- Missing DefiLlama now means the persisted DefiLlama DB row is absent, rejected, unsafe/invalid or fetch-blocked (`NO`/`ERR`), not that the helper failed to preview a logo. A helper preview/input slug/guessed URL/Managed Vault logo never clears Missing DefiLlama by itself: a recommended helper result remains `RECOMMENDED SOURCE` until Use + Fetch persists a `logo_sources` row, after which the row moves to `DL PEND` until reviewed or `DL OK` once public-eligible.
- DefiLlama Use + Fetch saves the selected Provider ID slug, verifies the recommended high-confidence icon via the resolver, then upserts a durable `logo_sources` row with `provider = 'defillama'`, `defillamaSlug`, resolver confidence/reasons, `fetchedAt`, `reviewStatus` and `sourceOrigin = 'defillama-helper'`. The saved slug is shown again in Provider IDs after reload, but slug storage alone is not coverage until the source row exists. The action revalidates both `/admin/logos` and `/admin/logos/[slug]`, and DB/upsert/provider failures show explicit admin notices instead of a success message.
- CoinMarketCap helper search expands name, slug, saved aliases and provider metadata with ticker aliases such as GEODNET/GEOD, Katana/KAT, Ethereum/ETH, Arbitrum/ARB, Avalanche/AVAX, Polygon/POL/MATIC, Optimism/OP, BNB Chain/BNB, Solana/SOL and Render/RNDR. Symbol-only results remain lower confidence unless name/slug/known-alias alignment is present.
- Logo Manager source cells are coverage-first: `Primary: <provider>` plus compact `CG OK · CMC NO · DL PEND · Vault OK` states based only on persisted source rows. The DefiLlama detail badge is DB-based too: non-rejected saved rows show `SOURCE PRESENT`, high-confidence unsaved previews show `RECOMMENDED SOURCE`, weak matches show `OTHER MATCHES ONLY` and no reliable match shows `NO RELIABLE SOURCE`. Missing logo means no usable reviewed/approved public source exists; pending, rejected, unsafe/visualRejected, generated-only and helper-only records remain actionable.
- Source Tools distinguishes Scan metric entities from Complete logo coverage. Activity cards are ordered Metric scan → CoinGecko refresh → CoinMarketCap refresh → DefiLlama discovery, and DefiLlama has a dedicated summary for checked, found, missing/no reliable and errors. Discovery summaries use provider breakdowns instead of vague raw counters.
- DefiLlama source upserts dedupe by logo/provider/image/source URL and saved slug, update stale image/source URLs safely, preserve already reviewed/approved rows and do not revive rejected DefiLlama rows without an explicit restore flow. Public logo candidate order remains selected reviewed primary → reviewed Managed Vault → reviewed CoinGecko → reviewed CoinMarketCap → reviewed DefiLlama → generated fallback, with pending/rejected/unsafe sources excluded. No schema changes were made; Admin DB Setup is not required.

## v0.11.10 Logo Source Priority + Coverage UX

- Admin-selected primary sources now drive logo detail, provider rows, the Logo Manager source column and public `logoCandidates`. Public cards resolve candidates as selected reviewed primary → reviewed Managed Vault backup → remaining reviewed providers in CoinGecko, CoinMarketCap, DefiLlama order → generated fallback. Pending, rejected and unsafe/visualRejected sources stay out of the public chain unless explicitly reviewed and approved.
- Logo Manager is coverage-first: the daily queue highlights Missing logo, Missing CG, Missing CMC and Missing DefiLlama before review/new-work buckets, and the list separates `source:` from coverage (`CG OK · CMC OK · DL OK · Vault OK`). Missing logo now means no usable reviewed/approved public source exists, so generated-only, pending-only, rejected-only, unsafe-only or low-confidence-unreviewed records remain actionable.
- DefiLlama is first-class across provider previews, provider rows, Provider IDs, missing-source filters and Source Tools. Discovery summaries show found/missing/no reliable/error counters instead of an ambiguous “DefiLlama 0”, while Source Tools separates coverage completion from metric scanning.
- Provider helper results only show the primary “Use + Fetch” button for high-confidence recommended matches. Medium/low-confidence CoinGecko, CoinMarketCap and DefiLlama matches remain informational/detail-only and are never auto-fetched from the helper UI.
- Source persistence continues to use existing `logo_sources`, `logos.approved_source_id`, `logos.approved_logo_url` and `admin_settings` fields. No schema changes were made; Admin DB Setup is not required.


## v0.11.9 Final Logo Reliability + QA Priority

- DefiLlama resolution now starts with deterministic trusted native-chain mappings for Ethereum/ETH, Bitcoin/BTC, Polygon/MATIC/POL, Arbitrum/ARB, Avalanche/AVAX, Solana/SOL, BNB/BSC, Optimism/OP, Base, zkSync, Katana/KAT and MegaETH/MEGA before falling back to DefiLlama protocol/chain/stablecoin indexes. Generic `asset` rows are no longer forced into stablecoin-only matching, so native tokens can use verified chain icons.
- DefiLlama icon verification tries `https://icons.llama.fi/chains/rsz_{slug}.jpg`, `https://icons.llama.fi/chains/{slug}.jpg` and `https://icons.llama.fi/{slug}.jpg` across saved slugs and aliases. The admin helper records query, target, aliases, URL patterns, HEAD/partial-GET status, content type, reject reason and selected-candidate reason under resolver details while keeping the main UI to Source Present / Recommended / No reliable source / Other possible matches.
- Provider IDs continue to persist CoinGecko ID, numeric CoinMarketCap ID and DefiLlama slug/source without schema changes. High-confidence provider matches may save the provider ID/slug, fetch the source and create review-gated candidates; weak or derivative-looking matches remain manual review only.
- Legacy local-logo migration remains internal-only but now imports unsafe/visual-rejected BSV-like local assets into Managed Vault as visible `needs_review` candidates with `migratedFrom`, original local path/provider, `unsafe`, `visualRejected`, `reviewStatus` and `migratedAt` metadata. These candidates are never auto-approved or public primaries.
- Source persistence remains DB-first: successful fetch/use/review/vault operations keep `logo_sources`, source status/review metadata, `logos.approved_source_id`, `logos.approved_logo_url` and public candidate ordering stable after page reload. The public card fallback chain remains manual/upload primary, approved CoinGecko, reviewed CoinMarketCap, reviewed DefiLlama, reviewed optimized Managed Vault and generated fallback, excluding pending/rejected/unsafe/visual-rejected rows.
- Logo Manager QA now separates urgent “Needs attention” from “Review later” newly discovered/pending-review work and sorts rows by no usable source, missing CoinGecko ID, provider ID/error, visual/unsafe, pending review, newly discovered and healthy approved. Dashboard and Source Tools summaries are shorter, hide zero-value optional metrics and keep raw counters/details collapsed.
- No database schema changes were made; Admin DB Setup is not required.

## v0.11.8 Logo Source Reliability + Public Fallback Chain

- Public card rows now receive an ordered `logoCandidates` chain from the server instead of only one approved logo URL. The browser tries admin-selected manual/upload primaries first, then trusted CoinGecko, reviewed CoinMarketCap, reviewed DefiLlama, reviewed optimized Managed Vault and finally the generated fallback; pending, rejected, unsafe and visualRejected sources are excluded from public fallback candidates.
- Managed Vault provider copies validate PNG/JPEG/WebP content types, keep SVG disabled, record durable provenance metadata (`copiedFromProvider`, `copiedFromSourceId`, `copiedFromUrl`, `copiedAt`, `mimeType`, `fileSize`, width/height, `optimized`, `maxDimension` and reason) and remain the optimized backup used only after approved provider sources are unavailable or explicitly selected. Optional Sharp-based resize is used when available; local/dev builds keep safe validated copies if the optimizer package is unavailable.
- DefiLlama resolution now explicitly tests `icons.llama.fi/chains/rsz_{slug}.jpg`, `icons.llama.fi/chains/{slug}.jpg` and protocol-level icon paths, while combining chain/protocol/stablecoin indexes, saved DefiLlama Provider ID slugs, aliases and URL verification. Required aliases include BTC/Bitcoin, ETH/Ethereum, ARB/Arbitrum, AVAX/Avalanche, MATIC/POL/Polygon, SOL/Solana, BSC/BNB/BNB Chain, OP/OP Mainnet/Optimism, zkSync variants, Base, Katana/KAT and MegaETH/MEGA.
- CoinMarketCap helper search uses name, slug and symbol aliases together and only auto-fetches high-confidence non-derivative matches. Katana/KAT, Ethereum/ETH, Arbitrum/ARB and the documented chain aliases are scored above symbol-only or IOU/wrapped/bridged lookalikes.
- Provider IDs remain compact and save CoinGecko ID, CoinMarketCap numeric ID and DefiLlama slug/source in existing fields/settings. High-confidence provider auto-resolve saves the ID/slug, fetches the source, applies source priority and creates a Managed Vault backup when Blob is configured.
- Source persistence is DB-first: source upserts revive accidental user rejections when requested, selected sources update `logos.approved_source_id` and `logos.approved_logo_url`, reviewed metadata is preserved and public overlays read the same approved source chain after reload. Expected provider, storage and safety failures show compact admin notices instead of generic Application errors.
- Legacy local-logo migration remains internal-only and imports BSV/unsafe/visualRejected assets to Managed Vault as `needs_review` candidates with migration metadata (`migratedFrom`, original local path/provider, unsafe and visualRejected flags) without auto-selecting them as public primaries. Rejected sources can be restored; safety/visual rejections remain blocked from normal restore-and-use.
- Dashboard and Source Tools keep the current layout but emphasize action-first summaries, hide zero-value optional metrics, keep provider breakdowns compact and leave raw counters under Details. No schema changes were made, so Admin DB Setup is not required.

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

## v0.11.1 Admin Productization + Stability

- Admin pages share the same authenticated global navigation: Dashboard, Logo Manager, API, Brand and Log out.
- Logo Manager is now a single-screen, search-first operations view. Empty search shows the default action-needed working set at 10 rows; live search scans all logos across name, slug, category, provider IDs, provider/source fields, safe notes and issue types, ignoring the active filter while typing. Use Show more to load 10 additional rows at a time.
- Admin actions translate expected validation/provider/storage errors into compact notices. Missing CoinGecko IDs, CoinGecko 404/429/401/403 responses, missing CMC keys, invalid manual URLs, disabled Blob uploads and vault operations should not surface generic Application errors. Unexpected failures are still logged server-side with safe admin notices.
- Logo detail pages now present a deterministic Logo Source Engine: CoinGecko is the trusted first priority, CoinMarketCap and DefiLlama are backup candidates that remain human-review gated, manual/upload choices are protected, Managed Vault is the durable storage target, and Local Static Manifest is no longer visible in active admin source operations. Current State is compact with a status strip and contained long errors/URLs.
- API Settings is an admin-managed provider module for CoinGecko, CoinMarketCap and DefiLlama. Secrets resolve server-side only in this order: encrypted admin DB secret, environment variable, public/no-key fallback where supported, disabled. Decrypted keys are never sent to the browser, logged, revealed or copied. Next.js `NEXT_REDIRECT` control-flow errors are guarded and scrubbed so they are never persisted or displayed as provider errors.
- Admin-managed API keys require `ADMIN_ENCRYPTION_KEY`. Values are encrypted into `admin_api_secrets`; if the key is missing, save/delete is disabled with a setup warning while env and public providers continue to work. After this schema change, run Admin DB Setup (`npm run db:push`) before using admin-managed API keys.
- Brand Settings health now separates active public assets from optional assets: primary/hero logo, favicon and upload availability are active checks, while header logo, Apple touch icon and watermark stay neutral unless their public feature is enabled. Social/unused assets live in Advanced / Social.
- Brand text defaults to public-active fields: site name, main slogan, hero subtitle, meta description, card footer text and created-with text. Short name and supporting copy are advanced. Brand copy should use “onchain”; the default slogan is “Clean onchain visuals. Simple explanations. Share-ready cards.”
- Public hero layout and typography can be tuned from Brand Settings with logo offset, logo width, bottom gap, slogan size/weight/line-height, subtitle size/opacity and subtitle visibility controls. The public hero centers the uploaded wordmark without duplicating the site name and uses calmer slogan typography.
- CoinGecko ID discovery is available on logo detail pages through a server-side search helper. Operators can search by logo name/slug, review candidate name/symbol/id/thumb, save the chosen ID, and then fetch/apply the source.
- Workflow: Admin DB Setup is required after this merge because `db/schema.sql` adds `admin_api_secrets`. Seed Protection Test is not required unless seed scripts are changed.



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

v0.11.0 keeps the permanent local logo vault and admin source candidate resolution for mapped unresolved entities. The registry alone is not proof that a logo is real or approved. Required active entities need both visual registry config and a source manifest record with provenance and a matching SHA-256 checksum. A source-backed logo can still be visually rejected if it creates confusion or does not represent the entity clearly.

Legacy local vault layout (audit/build history only; not active source-engine fallback):

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

v0.10.2 hardens a server-only admin foundation for reviewing logo candidates without changing the public card UI beyond approved logo resolution. The public API overlays DB-approved logo URLs onto card rows when `DATABASE_URL` is configured; if Postgres is unavailable, public cards keep using the existing local logo fallback chain and do not crash.

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

`npm run admin:seed-logos` imports `lib/logos/logoRegistry.ts`, `lib/logos/logoSourceManifest.ts` and `lib/logos/metricLogoRequirements.ts`. Existing admin-approved rows are preserved. The active source engine no longer exposes Local Static Manifest import actions; use Managed Vault for durable logo backup. After deployment, run Admin DB Setup only when prior schema/setup changes are missing.

Environment variables:

- `DATABASE_URL` enables Postgres-backed admin review and public approved-logo overlays.
- `ADMIN_SESSION_SECRET` signs admin sessions.
- `ADMIN_SETUP_TOKEN` optionally protects first setup and can also provide a setup-time signing secret.
- `COINGECKO_DEMO_API_KEY` enables the server-side bulk CoinGecko refresh action. CoinGecko IDs are maintained in `lib/admin/coingeckoLogoIds.ts`; slugs with `null`/missing mappings appear as missing CoinGecko IDs in admin.
- `COINMARKETCAP_API_KEY` enables server-only CoinMarketCap logo source actions. When absent, the API Settings and Logo Manager source tools show CoinMarketCap as disabled/missing key.
- `BLOB_READ_WRITE_TOKEN` enables Vercel Blob uploads; without it, admin upload forms show a missing-config state while URL candidates and manual URL candidates still work and only file uploads are disabled.


## Admin operations dashboard

The internal admin surface now uses `/admin` as the main operations dashboard instead of redirecting straight to logos. It summarizes provider health, Blob upload readiness, latest bulk refresh results, logo health counts and action-required items. `/admin/logos` remains the Logo Manager, but it now includes a QA inbox with issue badges for missing approved logos, review-needed candidates, missing CoinGecko/CoinMarketCap IDs, provider fetch failures, fallback usage, visual rejections, approved-but-not-used states, rejected sources and upload-disabled state. The page supports search by name, slug, IDs, provider and category, plus filter tabs and sorting by name, status, category, source provider, last updated or issues-first.

Bulk CoinGecko and CoinMarketCap refresh results are stored in `admin_settings` as `last_coingecko_bulk_refresh_summary` and `last_cmc_bulk_refresh_summary` with timestamp, refreshed count, missing mapping count, error count and first errors. Partial failures are displayed as warnings/notices in admin instead of making public cards fail.

`/admin/api` centralizes provider status for CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized asset sources. `/admin/brand` stores brand text/asset URL candidates in `admin_settings`; saved values now feed public copy, metadata and card footer while defaults remain learnDeFi if DB is unavailable.

## Logo ingestion and QA

Legacy audit/build command for static logo assets:

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


## v0.11.0 admin operations + brand system release

- Admin routes `/admin`, `/admin/logos`, `/admin/logos/[slug]`, `/admin/api` and `/admin/brand` are now designed as compact operations screens: sticky toolbars, small badges, dense tables, collapsed debug/danger sections and inline actions replace presentation-style cards.
- Logo detail pages use a three-column operations layout with current DB state, source table, action panel, one compact preview strip, collapsed public overlay debug and collapsed danger controls.
- CoinGecko is the primary logo source when an entity has a known CoinGecko ID. Successful CoinGecko fetches auto-approve only when the entity is not visually rejected, not fallback-preferred, not BSV/confusing, the exact source was not previously rejected, and no admin-approved manual/upload/stronger source exists. Manual/upload admin choices always win.
- CoinGecko bulk refresh summaries now include fetched, auto-approved, candidate, skipped-admin-approved, skipped-visual-rejected, missing mapping and error counts. Approved auto sources are marked with metadata so operators can distinguish “approved · auto” from manual review.
- Metric Output Scanner / Logo Discovery Engine is available from admin as “Scan active metrics for missing logos.” It scans active revenue, TVL, stablecoin, TPS, block-time, tx-fee, developers, DePIN and tokenized-asset metric outputs up to Top 30, upserts missing DB entities, imports safe CoinGecko logos, records QA issues (`newly_discovered_entity`, `missing_from_logo_db`, `discovered_missing_logo`, `metric_scan_error`, `auto_logo_imported`) and stores the latest summary in `admin_settings`. It never runs during public page render.
- Brand Settings is now an operational asset manager for `primaryLogo`, `darkLogo`, `iconMark`, `headerLogo`, `favicon`, `appleTouchIcon`, `xAvatar`, `xBanner` and `watermarkMark`. Manual URLs still work without Blob; Blob uploads use `BLOB_READ_WRITE_TOKEN` when configured, allow PNG/JPEG/WebP only, keep SVG upload disabled, enforce 500 KB normal asset limits and a 2 MB X banner limit, and store provider/size/mime/upload metadata in `brand_settings`.
- Public brand integration uses configured `siteName`, `shortName`, `mainSlogan`, `heroSubtitle`, `cardFooterText`, `createdWithText`, `metaDescription`, primary/header logo fallback, favicon/apple-touch-icon URLs and share-card footer fields with safe defaults when DB is unavailable. Header logo remains optional and is only the hero fallback when `primaryLogo` is empty.
- The public homepage hero/header is simplified around “Clean DeFi visuals. Simple explanations. Share-ready cards.” with fewer repeated lines and no pill stack.
- Admin dashboard now surfaces metric scan results, active-vs-optional brand asset health, Blob/upload state, API status, logo health and action-required items for active missing brand assets, missing Blob token, metric scan errors, newly discovered entities and missing approved logos.
- API Settings includes CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse, RWA/tokenized sources and Vercel Blob states without exposing secrets.
- Workflow rules: run **Admin DB Setup** only after schema/seed changes, DB reset or explicit migration/import need; run **Admin DB Seed Protection Test** after seed changes; run metric logo discovery from the admin button when reviewing active metric coverage.

## v0.10.2 admin operations hardening release

- Admin DB Setup is **not** an after-every-UI-update workflow. Run it only when `db/schema.sql` changed, `scripts/admin-seed-logos.mjs` changed, the admin DB was reset, or a migration/import is explicitly needed.
- `npm run admin:seed-logos` now guarantees that rows with `status = 'approved'` and an `approved_logo_url` preserve the admin-selected URL/source, status, provider IDs, visual state, fallback settings and manual notes. The seed may add missing candidates/metadata but must not downgrade or replace admin-approved CoinGecko/manual/upload choices with local manifest or DefiLlama data.
- `npm run admin:test-seed-protection` runs a safe DB-level Polygon preservation check, restores the original row state, and is also available as the manual **Admin DB Seed Protection Test** workflow.
- Logo QA Inbox is the day-to-day operating view for missing approved logos, missing CoinGecko/CoinMarketCap IDs, provider errors, fallback usage, visual rejections, rejected sources and overlay issues. Search covers names, slugs, categories, provider IDs, providers, source URLs and issue types; sorting includes issues first, status, category, provider, last updated and last fetch time.
- Logo detail pages are the main fixing tool: they show current DB state, approved/fallback/public-card previews, source metadata, provider ID forms, manual URL/DefiLlama/CoinGecko/CoinMarketCap candidate actions, fallback controls, visual-rejection controls and public overlay debug slugs.
- Bulk CoinGecko/CoinMarketCap refreshes store partial-success summaries in `admin_settings`, revalidate admin pages and translate 429/404/401/403/network failures into operator guidance instead of crashing pages.
- Provider ID rule: DB provider ID > mapping file provider ID > missing mapping. DB values override code mappings so mapping fixes do not require code changes.
- Public DB logo overlay order remains DB-approved logo URL first, then generated fallback; Local Static Manifest is not a normal public fallback. DB failures log safe server warnings and do not break public cards; alias matching covers Polygon, BNB Chain, OP Mainnet, XRP Ledger, Render Network, Filecoin, Hyperliquid L1, MegaETH, ENI and BSV Blockchain variants.
- Brand Settings remain connected to public site text/metadata/share-card footer with learnDeFi defaults for empty fields. Save feedback confirms “Brand settings saved,” “Public site is using these values,” and Blob-disabled asset upload status.
- API Settings shows CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized source state, key presence yes/no, last success/error, metrics, exact missing env vars and docs links without exposing secrets.
- Blob/upload behavior is explicit: without `BLOB_READ_WRITE_TOKEN`, uploads are disabled but URL candidates, manual URL save and brand text save still work. SVG upload remains disabled until sanitization exists; raster upload is constrained by type and size.

## v0.10.1 admin stability release

- Admin pages fail gracefully with section-specific error panels for DB/query/config issues instead of generic Application errors.
- Admin DB Setup is documented as safe/idempotent: run `npm run db:push` followed by `npm run admin:seed-logos`. The logo seed preserves existing admin-approved `approved_logo_url` choices; active durable backup is Managed Vault.
- Public logo resolution order is DB-approved URL, then generated fallback; overlay failures log server-side warnings and do not crash public APIs.
- Brand Settings now apply to public homepage/header copy, metadata, optional favicon/apple-touch-icon URLs and ShareCard footer text. Saving shows success/error feedback and records a last-saved timestamp.
- Manual brand asset URL fields remain saveable and previewable without Blob. If `BLOB_READ_WRITE_TOKEN` is missing, URL candidates and manual URL candidates still work; vault uploads require Blob and file uploads are disabled.
- API Settings shows provider states for CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA sources using connected, missing key, public-no-key, disabled or error. CMC remains foundation-level and disabled when `COINMARKETCAP_API_KEY` is absent.

Required env names: `DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_SETUP_TOKEN`, `COINGECKO_DEMO_API_KEY`; optional env names: `COINMARKETCAP_API_KEY` for CMC foundation tools and `BLOB_READ_WRITE_TOKEN` for uploads.

## v0.10.0 summary

- Turns `/admin` into an operations dashboard with API provider status cards, logo health totals, action-required inbox items and quick actions.
- Adds `/admin/api` for server-side API/key health across CoinGecko, CoinMarketCap, DefiLlama, Chainspect/TPS, DePIN Pulse and RWA/tokenized asset sources.
- Adds `/admin/brand` as the brand settings foundation; v0.10.1 now connects explicitly saved values to public copy/metadata/card footer while preserving learnDeFi defaults when absent.
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
