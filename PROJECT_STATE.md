# Vision

## v0.11.21 DefiLlama Hard Reset + Clean v3 Rediscovery (Blocker)

- Added destructive maintenance action **Hard reset DefiLlama provider** that hard-deletes all `logo_sources` rows where `provider = defillama`, repairs/clears affected primaries, clears stale DefiLlama fetch state, removes saved `defillamaSlug` from `logo_provider_ids:*` admin settings, and clears stale DefiLlama discovery summaries.
- Added maintenance actions **Discover DefiLlama v3 sources** and **Hard reset + rediscover DefiLlama v3**.
- DefiLlama rediscovery persists only v3-valid candidates (`chain-mirror`, `chain-icon`, `protocol-index`, `manual-reviewed`) and does not save guessed protocol, placeholder, no-reliable, or error rows.
- Old DefiLlama rows are deleted (not hidden), so Advanced/hidden history no longer retains stale DefiLlama source records after hard reset.
- Post-deploy workflow: run **Hard reset + rediscover DefiLlama v3**, then QA Akash, BNB, Aptos, Glow, Canton, Missing DefiLlama filter, source records, and public candidates.

- Current app version: v0.11.0.
- learnDeFi is a simple, premium, share-ready DeFi market card maker.
- Core positioning: “Make DeFi data share-ready.”
- Supporting copy: “Create clean, source-backed market cards from trusted crypto data.”
- Main value loop: trusted data → clean card → simple learn note → X-ready output.
- Primary audience: crypto and DeFi project teams, chain teams, ecosystem/growth/community teams, content creators and analysts.
- learnDeFi is not an AI product, not a paid SaaS right now and not a crypto data terminal.
- The current UI should not include paid/free plan copy, alerts, scheduled reports, auth, admin panel or AI-heavy features.

## v0.11.20 DefiLlama v3 Deterministic Reliability (Blocker)

- Added deterministic verification script `npm run verify:defillama` (`scripts/verify-defillama-v3.mjs`) covering BNB/bsc alias validity, Akash invalid guessed protocol rejection, Pendle-for-Akash target mismatch rejection, Aptos chain mirror validity, Geodnet resolver-confirmed protocol-index validity, and invalid-vs-valid canonical prerequisites.
- DefiLlama alias family now treats BNB, BNB Chain, BSC, Binance Smart Chain and BinanceCoin as the same target family for v3 validation/canonical resolution paths.
- DefiLlama Use + Fetch now enforces v3 validation metadata normalization, supersedes old invalid DefiLlama rows, and fails with an explicit error if canonical DefiLlama state remains `ERR`/`NO` after save.
- Reset DefiLlama sources v3 and canonical source priority continue to ensure invalid historical rows cannot block newer valid DefiLlama rows.

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




## v0.11.19 DefiLlama v3 Reset + Rediscovery (Blocker)

- Added strict `classifyDefiLlamaSourceV2(logo, source)` classification semantics for persisted DefiLlama rows: `chain-mirror`, `chain-icon`, `protocol-index`, `manual-reviewed`, `invalid`.
- Old guessed protocol rows are not trusted as coverage, backup, review or active source state unless resolver/index validation confirms a real non-placeholder match.
- Source Tools maintenance action is now **Reset DefiLlama sources v3** with explicit invalidation + primary repair summary counters.
- DefiLlama fetch/discovery persistence is v3-strict: only v3-valid candidates are saved; guessed/placeholder/unreliable rows are rejected.
- Missing DefiLlama now means no persisted v3-valid DefiLlama source exists for the logo.
- Post-deploy runbook: run **Reset DefiLlama sources v3** first, then run discovery to repopulate valid DefiLlama review candidates.

## v0.11.18 DefiLlama v3 Strict Source System (Blocker)

- Old guessed DefiLlama protocol auto-source discovery is disabled for persistence: `https://defillama.com/protocol/{slug}` + `https://icons.llama.fi/{slug}.jpg` is never trusted as a saved source unless resolver/index validation passes.
- DefiLlama validation now classifies persisted rows with `defillamaV3`: `chain-mirror`, `chain-icon`, `protocol-index`, `manual-reviewed`, or `invalid`.
- `icons.llama.fi/{slug}.jpg` protocol-style URLs are not trusted by default and are invalidated when resolver confirmation is missing or image appears placeholder/generic.
- Valid mirrored chain assets remain accepted (for example `/logos/chains/*` mirrored from `https://icons.llama.fi/chains/rsz_{slug}.jpg`).
- Source Tools maintenance **Validate DefiLlama sources** performs repair: invalid rows are hidden/invalidated, and invalid DefiLlama primaries are detached/reassigned/cleared. Run this once after deploy.
- Missing DefiLlama and public logo candidate eligibility now accept only DefiLlama v3-valid rows.

## v0.11.17 DefiLlama Placeholder Invalidation (Akash Fix)

- DefiLlama validation now treats external `icons.llama.fi/{slug}.jpg` protocol images as invalid when resolver confirmation is missing, and marks known placeholder/question-mark/generic icons as `placeholder_image` instead of accepting HTTP 200 alone.
- Valid mirrored chain assets remain allowed (for example `https://icons.llama.fi/chains/rsz_aptos.jpg` and local mirror `/logos/chains/aptos.jpg`).
- Invalid DefiLlama rows are hidden/invalid metadata rows (`invalidForTarget`, `hidden`, `invalidReason`, `invalidatedAt`, `targetSlug`) and must not render as active provider rows or actionable source details.
- Validate DefiLlama sources maintenance now reports checked/valid/invalidated/placeholder/resolver-no-reliable/errors and should be run after deploy to clean stale rows (including Akash placeholder history).


## Provider Coverage Truth + Missing Filters Fix

- Provider coverage is now truth-based: `CG`, `CMC`, `DL` and `Vault` count as covered only when a canonical `logo_sources` row has a real persisted `image_url` or `blob_url`, is not a generated fallback/placeholder, and is not unsafe, visualRejected, invalid or rejected. Provider IDs, saved slugs, default slugs, guessed URLs, helper previews and generated fallbacks are never coverage.
- Coverage states are intentionally compact: `OK` means the real saved source is reviewed/admin-approved/public-eligible, `REVIEW` means the real saved source exists and needs admin review, `NO` means no real saved source exists, and `ERR` means the saved source is rejected, unsafe, invalid or provider-blocked. `REVIEW` is never emitted for ID-only, slug-only or helper-preview-only rows.
- Missing filters now use those real states: Missing CG/CMC/DefiLlama include `NO` and `ERR`, exclude `REVIEW` and `OK`, and Missing logo means there is no reviewed/approved public-eligible source. A `REVIEW` source clears its provider-specific missing filter but does not make the public logo healthy until reviewed.
- DefiLlama coverage is saved-source-only. A default/saved slug or recommended helper preview remains `DL NO` until Use + Fetch persists a DefiLlama source row; successful Use + Fetch dedupes by provider/slug/source identity, saves the real image row, revalidates admin logo routes and moves DL to `REVIEW` or `OK`.
- CoinMarketCap numeric IDs are saved input only, not coverage. CMC ID-only records show as missing with `ID saved · fetch needed`; after a CMC fetch creates a real source row, CMC moves to `REVIEW` or `OK` and clears Missing CMC.
- Logo Manager source cells show only `Primary: <provider>` plus `CG/CMC/DL/Vault OK/NO/REVIEW/ERR`, and provider rows use operator labels such as Primary, Backup, Needs review, Missing, Rejected, Error and ID saved · fetch needed instead of ambiguous combined labels.
- Provider helper badges are DB-truthful: `SOURCE PRESENT` appears only for a non-rejected saved source row with a real image; unsaved high-confidence helper matches are `RECOMMENDED SOURCE`, and unresolved helpers stay `NO RELIABLE SOURCE`.
- Public card candidates remain selected reviewed primary → reviewed Managed Vault → reviewed CoinGecko/CoinMarketCap/DefiLlama → generated fallback. `NO`, `REVIEW`, `ERR`, helper previews, provider IDs/slugs, generated placeholders and non-canonical duplicate candidates are excluded. Advanced source records show canonical/current rows by default and hide historical duplicate rows behind “Show hidden source history.” No schema changes were made; Admin DB Setup is not required.



## v0.11.16 DefiLlama Source Truth Validation

- DefiLlama source validity now requires current resolver confirmation for non-admin-reviewed rows. Auto-selected `selected_needs_review`/`needs_review`/`pending` rows are invalidated when resolver returns no reliable candidate.
- Added/updated **Validate DefiLlama sources** maintenance action to scan all DefiLlama rows and mark stale rows hidden/invalid with reasons (`resolver_no_reliable_source`, `target_mismatch`, `placeholder_or_unverified`) and validation timestamps.
- Missing DefiLlama truth now uses valid DefiLlama rows only; invalid/hidden rows do not count as coverage and remain visible only in hidden source history.
- DefiLlama provider row truth now shows Missing / No reliable source when saved rows are invalid or unverified by resolver, preventing false Backup/Needs review states.
- Public candidate resolution excludes invalid DefiLlama rows.
- No schema changes were made; Admin DB Setup is not required.

## v0.11.15 Logo Manager Truth Hard-Fix

- DefiLlama canonical state is now strict-source truth: a saved row only counts when it is persisted, non-rejected, non-hidden/non-superseded, target-matching, and backed by a real non-placeholder image URL/blob URL. Slug-only/default-slug/helper-preview states are explicitly treated as missing.
- DefiLlama placeholder/stale/mismatched rows are blocked from canonical provider state, Source Present badges, primary/backup actions, Missing DefiLlama resolution, and public candidate coverage. Invalid historical rows remain as history only and do not drive provider status.
- DefiLlama provider helper text now avoids false success labels for invalid states; when no reliable source is canonical it shows no-reliable-source language rather than fetched/present messaging.
- CoinGecko/CMC medium-confidence helper actions now allow strong related extensions (for example `Quai` → `Quai Network`) while still blocking unrelated/derivative matches like Pendle for Quai.
- Public candidate eligibility and Logo Manager truth semantics remain canonical-source-only across providers, with invalid DefiLlama rows excluded from candidate ordering and coverage counts.

## v0.11.14 Logo Manager Reliability Finalization

- DefiLlama canonical coverage now treats target-mismatched rows as canonical `ERR` (not coverage), including stale cross-logo rows, and excludes placeholder/question-mark/unknown-logo style URLs from real source coverage.
- CoinGecko/CMC helper action policy now allows strong medium-confidence related matches (for example target-short-name plus `Network/Chain/Protocol`) while blocking unrelated/derivative suggestions (for example Pendle for Quai) from actionable CTA state.
- Missing DefiLlama, Source Present, provider rows and public candidate eligibility remain driven by persisted canonical source rows only; helper previews, saved slugs/IDs, placeholders and stale mismatches do not clear missing state.
- No schema changes were made; Admin DB Setup is not required.

## v0.11.13 Provider Helper Accuracy + DefiLlama Poisoned Source Cleanup

- DefiLlama coverage now requires target-aware source matching. Persisted DefiLlama rows only count when metadata slug, DefiLlama slug, source URL slug, or image URL slug matches the current logo slug/name; mismatched historical rows (for example Pendle on Akash) are excluded from canonical coverage and missing-filter resolution.
- Canonical DefiLlama state now behaves like truthful provider missing/error states: stale mismatched rows no longer produce Source Present/Backup/Needs review, and Missing DefiLlama includes logos that only have invalid or mismatched DefiLlama rows.
- Provider invalid-state logic now treats `metadata.invalidForTarget` as invalid coverage/input, preventing poisoned historical rows from participating in provider coverage or public candidate ordering.
- CMC recommendation scoring now requires name/slug relationship evidence in addition to symbol support; symbol-only or unrelated matches can no longer become high-confidence Recommended.
- Helper action policy now allows strong medium-confidence matches with clear name/slug overlap to be actionable (`Use + Fetch`) while keeping unrelated low-confidence rows as details-only.
- CMC provider row and action state now explicitly keeps “Find CMC ID” usable when API search is available, and the helper copy emphasizes “Find and save numeric CMC ID”.
- No schema changes were made; Admin DB Setup is not required.

## v0.11.12 Provider Source Canonicalization + DefiLlama Coverage Fix

- Logo QA now resolves one canonical source per logo/provider before computing coverage, provider rows, source badges, missing-source filters and public candidates. Canonical states are `OK` for reviewed/admin-approved/auto-approved public-eligible sources, `REVIEW` for persisted sources that still need review, `NO` when no DB source row exists and `ERR` when the only persisted rows are rejected, unsafe, invalid or errored.
- DefiLlama duplicate rows are treated as history rather than active state: an approved/reviewed DefiLlama row keeps `DL OK` even when older candidate or selected-needs-review rows exist, while a selected-needs-review row keeps `DL REVIEW` when no reviewed source exists. Helper previews alone remain `DL NO`.
- DefiLlama Use + Fetch continues to upsert by logo/provider plus stable DefiLlama slug/source/image identity, preserves already reviewed rows, will not silently revive rejected rows and records resolver metadata such as `defillamaSlug`, confidence, reasons, `fetchedAt`, review status, `sourceOrigin = defillama-helper` and canonical-candidate hints. Success notices are shown only after the DB source row is saved and both logo admin routes are revalidated.
- Missing DefiLlama now includes only canonical `DL NO` and `DL ERR`; canonical `DL REVIEW` and `DL OK` clear the Missing DefiLlama filter. Missing logo still means no reviewed/approved public-eligible source exists, so pending DefiLlama clears Missing DefiLlama but does not make the logo healthy until reviewed.
- Logo Manager source cells and detail provider rows use the canonical coverage display (`Primary: <provider>` plus `CG/CMC/DL/Vault OK/REVIEW/NO/ERR`). The DefiLlama helper badge shows `SOURCE PRESENT` only for canonical persisted `DL OK` or `DL REVIEW`, `RECOMMENDED SOURCE` for unsaved high-confidence resolver matches, `OTHER MATCHES ONLY` for weaker matches and `NO RELIABLE SOURCE` when no reliable match exists.
- Public card logo candidates use canonical public-eligible sources only: selected reviewed primary, reviewed Managed Vault, reviewed CoinGecko, reviewed CoinMarketCap, reviewed DefiLlama, then generated fallback. Pending, rejected, unsafe, visualRejected, helper-preview-only and non-canonical duplicate candidates are excluded. Existing duplicate rows are not deleted; Advanced / Source records labels the canonical row and keeps historical rows visible. No schema changes were made; Admin DB Setup is not required.

## v0.11.11 Provider Coverage + Fetch Persistence + Source Tools UX

- Provider coverage now uses a DB-backed state machine for CoinGecko, CoinMarketCap, DefiLlama and Managed Vault: `OK` means a reviewed/approved public-eligible source row exists, `REVIEW` means a non-rejected source row exists but still needs review, `NO` means no source row exists and `ERR` means the saved provider source is rejected, unsafe, invalid or blocked by fetch/provider review. Helper previews, guessed URLs, generated fallbacks and logos from other providers do not count as provider coverage.
- Missing DefiLlama now means the persisted DefiLlama DB row is absent, rejected, unsafe/invalid or fetch-blocked (`NO`/`ERR`), not that the helper failed to preview a logo. A helper preview/input slug/guessed URL/Managed Vault logo never clears Missing DefiLlama by itself: a recommended helper result remains `RECOMMENDED SOURCE` until Use + Fetch persists a `logo_sources` row, after which the row moves to `DL REVIEW` until reviewed or `DL OK` once public-eligible.
- DefiLlama Use + Fetch saves the selected Provider ID slug, verifies the recommended high-confidence icon via the resolver, then upserts a durable `logo_sources` row with `provider = 'defillama'`, `defillamaSlug`, resolver confidence/reasons, `fetchedAt`, `reviewStatus` and `sourceOrigin = 'defillama-helper'`. The saved slug is shown again in Provider IDs after reload, but slug storage alone is not coverage until the source row exists. The action revalidates both `/admin/logos` and `/admin/logos/[slug]`, and DB/upsert/provider failures show explicit admin notices instead of a success message.
- CoinMarketCap helper search expands name, slug, saved aliases and provider metadata with ticker aliases such as GEODNET/GEOD, Katana/KAT, Ethereum/ETH, Arbitrum/ARB, Avalanche/AVAX, Polygon/POL/MATIC, Optimism/OP, BNB Chain/BNB, Solana/SOL and Render/RNDR. Symbol-only results remain lower confidence unless name/slug/known-alias alignment is present.
- Logo Manager source cells are coverage-first: `Primary: <provider>` plus compact `CG OK · CMC NO · DL REVIEW · Vault OK` states based only on persisted source rows. The DefiLlama detail badge is DB-based too: non-rejected saved rows show `SOURCE PRESENT`, high-confidence unsaved previews show `RECOMMENDED SOURCE`, weak matches show `OTHER MATCHES ONLY` and no reliable match shows `NO RELIABLE SOURCE`. Missing logo means no usable reviewed/approved public source exists; pending, rejected, unsafe/visualRejected, generated-only and helper-only records remain actionable.
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


## v0.11.16 DefiLlama Truth Validator + Quai Helper Actionability

- Added a single shared DefiLlama validator (`validateDefiLlamaSourceForLogo`) and wired canonical DefiLlama provider truth to it so placeholders/mismatches no longer count as valid coverage.
- Added Source Tools maintenance action **Validate DefiLlama sources** to invalidate/hide bad persisted DefiLlama rows without deleting history.
- Missing DefiLlama, Source Present, provider state, and public source eligibility now rely on the same canonical DefiLlama validation path.
- CoinGecko/CMC helper actionability keeps strong related matches actionable (e.g. Quai -> Quai Network) while unrelated matches (e.g. Pendle for Quai) remain non-actionable.
- Helper results remain scoped per logo/provider/query; invalid candidate submissions must not claim success.
- Invalid/historical source rows are hidden by default and remain accessible in history views.
- Manual QA blockers: /admin/logos/akash, /admin/logos/quai, /admin/logos/aptos, /admin/logos?filter=missing_defillama_source, and public candidate chain verification.


## DefiLlama invalid-source canonical detachment (v0.11.18 blocker)

- Hidden/invalid/superseded sources (including any `invalidReason`) are never canonical/primary/public candidates across providers.
- Validate DefiLlama sources now repairs `logos.approved_source_id` and `approved_logo_url`: detach invalid primaries, then reassign by priority (manual/upload → managed vault → CoinGecko → CoinMarketCap → valid DefiLlama), else clear primary and set `needs_review`.
- Invalid DefiLlama rows are excluded from missing-state clearing, provider Source Present states, and public candidate chain.
- Source records keep invalid entries only in hidden history and visually override them as hidden/invalid historical rows (not canonical).
- Manual QA blocker set includes Akash, Glow, Canton, Aptos, Missing DefiLlama filter, and public candidate exclusion checks.
