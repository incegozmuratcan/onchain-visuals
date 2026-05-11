# Vision

- Current app version: v0.8.3.
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
- DefiLlama
- Chainspect
- DePIN Pulse
- html-to-image for PNG export

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


# v0.8.3 Source-backed Logo Vault

- Logo strategy is now a source-backed local logo vault: source candidate → raw download → final local asset → source manifest → checksum → visual registry → audit → render.
- Codex must not draw, invent, approximate or hand-code logos for required active entities.
- Required active entities must not use fake/generated badges, initials, text circles, placeholders, or runtime external logo URLs.
- DefiLlama is the fast bulk mirror candidate source, with official brand kits/sites/docs/GitHub, CryptoLogos, Simple Icons, Trust Wallet assets, spothq and other reputable provider URLs used as overrides when better or necessary.
- External logo URLs are source candidates only; required active ShareCard rendering depends on approved local files with source manifest provenance and matching SHA-256 checksums.
- Unknown/non-required entities may use a clean fallback at runtime, but that fallback is treated as missing/unknown and is never an approved real logo.
- New active metrics require coverage in `lib/logos/metricLogoRequirements.ts`, source-backed local logos, source manifest records and a passing `npm run check:logos` before shipping.
- `npm run logos:sync` ingests/downloads required active logos into `public/logos/raw/<provider>` and final files into `public/logos/chains`, `public/logos/projects` and `public/logos/assets`; when network is unavailable it records unresolved candidates rather than faking approvals.
- `npm run check:logos` must pass before PR/deploy; it fails missing registry entries, missing source manifest entries, missing local files, checksum mismatch, non-approved source status, non-approved registry quality, fallback/generated providers, external runtime paths, text-badge-like SVG markup and active metrics without logo requirements.
- `/logo-audit` is the required visual QA route for provenance, checksum, warning filters, 24px/32px/48px previews, ShareCard row previews and source candidate review.

# Logo System

- Logo reliability is a core product quality requirement because share-card quality depends on recognizable, balanced logos.
- The source manifest lives in `lib/logos/logoSourceManifest.ts` and records canonical name, slug, category, local/raw paths, provider, source URL/note, download time, original content type, SHA-256, dimensions, approval status, rights note and notes.
- The visual rendering registry lives in `lib/logos/logoRegistry.ts`; it keeps canonical name, slug, category, aliases, local path, fit, scale, padding, background, required-active status and visual quality. It is not source proof by itself.
- Local vault layout: final assets in `public/logos/chains`, `public/logos/projects` and `public/logos/assets`; raw downloads in `public/logos/raw/defillama`, `public/logos/raw/official`, `public/logos/raw/cryptologos`, `public/logos/raw/simple-icons`, `public/logos/raw/trustwallet` and `public/logos/raw/spothq`.
- Fallback hierarchy:
  1. required known active entities: approved local registry logo plus approved source manifest record with matching checksum only
  2. unknown/non-required entities: approved local logo if available
  3. unknown/non-required entities: verified external candidate if allowed
  4. unknown/non-required entities: clean generated fallback
  5. unknown/non-required entities: initials fallback
- Required active entities do not silently fall back; build/check gates must catch missing source-backed logos before deploy.
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
  - learnDeFi
  - Make DeFi data share-ready.
  - Create clean, source-backed market cards from trusted crypto data.
  - Clean DeFi visuals. Simple explanations. Share-ready cards.
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
- Auth, database or payments.
- Paid/free plans.
- Scheduled reports, saved reports and alerts.
- Admin panel.
- Competing with data terminals such as DefiLlama, Token Terminal or Artemis.

# Versioning

- Current app version: v0.8.3.
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
