# Vision

- Current app version: v0.8.1.
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

# Logo System

- Logo reliability is a core product quality requirement because share-card quality depends on recognizable, balanced logos.
- Known active entities require approved curated local logos.
- Initials, generated, placeholder and external-runtime primary fallbacks are unacceptable for known active entities.
- Logos use a manifest/registry with canonical name, slug, category, local path, aliases, source/provenance metadata, fit, scale, padding and quality status.
- Local immutable assets under `public/logos/chains`, `public/logos/projects` and `public/logos/assets` are preferred for known chains, projects and assets.
- Fallback hierarchy:
  1. approved curated local logo asset for known active entities
  2. non-approved local logo only for non-required entities
  3. verified external logo candidate only for unknown/non-required entities
  4. generated fallback only for unknown entities
  5. initials fallback only for truly unknown entities
- Logos should be optimized for perceived size and visual weight, not mathematically identical scaling.
- Circular logo containers should feel filled and premium; avoid tiny symbols floating inside empty circles.
- `/logo-audit` exists as an internal QA route for logo inspection with required-active, missing, needs-review, project, chain and asset filters.
- `npm run check:logos` verifies registry local paths, required active logo approval and active metric logo requirement mappings.
- Any new active metric must include logo coverage requirements before it can ship. If a new metric introduces new entities, their logos must be sourced, stored locally, added to the logo registry, audited and included in `check:logos`.
- Source/provenance must be recorded for every logo; CryptoLogos, official brand kits, Simple Icons, Trust Wallet assets, spothq and data-provider URLs are source pools, not runtime dependencies.
- ShareCard uses local logos first and must not silently fall back to initials/generated badges for required active entities.
- Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo registry.

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

- Current app version: v0.8.1.
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
