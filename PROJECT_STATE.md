# Vision
- learnDeFi is a share-ready crypto/DeFi market visualization platform.
- Focus: clean Apple-like design + easy-to-share leaderboard cards.
- Goal: educational + social-share oriented product.
- Product rule: stay elegant, minimal, highly visual, easy to understand, share-first and Apple-quality.

# Current Stack
- Next.js
- React
- DefiLlama
- Chainspect
- DePIN Pulse

# Versioning
- Current app version: v0.7.
- Every future release must update both:
  - the version badge source in `lib/version.ts`
  - this `PROJECT_STATE.md` file

# Active Metrics

## Chains
- Revenue (24H / 7D / 30D)
- Stablecoin Supply
- TVL

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
- Primary reliable source.
- Preferred whenever possible.

## Chainspect
- TPS uses Real-time TPS (1H), not 30D TPS.
- Never label 1H data as 30D.
- Cache duration is 1 hour.
- If live parsing fails, use a verified snapshot.
- Stable UX is preferred over fragile live parsing.
- Never show broken cards.

## DePIN Pulse
- Used for DePIN revenue leaderboards.
- DePIN belongs under Protocols.
- Detected Query should show Protocols → DePIN, not Chains → Revenue.
- Timeframe selector only supports 24H and 30D.
- Do not fabricate estimated 7D revenue.
- DePIN cards keep chain/network information at the far-right side of each row.

# Logo System
- Logos use a configurable registry with per-logo `fit`, `scale` and `padding` controls.
- Logos should be optimized for perceived size and visual weight, not mathematically identical scaling.
- Circular logo containers should feel filled and premium; avoid tiny symbols floating inside generic circles.
- Local immutable assets in `public/logos` are the preferred source for known chains and projects.
- Fallback hierarchy:
  1. local hosted logo
  2. verified external logo
  3. generated local fallback
  4. initials fallback
- ZKsync Era normalization must cover `zksync-era`, `zkSync Era`, `ZKsync` and `zkSync`.

# Cache Rules
- Default cache duration: 1 hour for fragile public dashboard parsing.
- If live parsing fails, use verified fallback snapshots.
- Never show broken cards.

# UI Rules
- Minimal Apple-like aesthetic.
- White / anthracite / black palette.
- Share-card optimized layouts.
- Do not redesign the overall product or card layout.
- Developers belong under Infrastructure.
- DePIN belongs under Protocols.
- Remove unnecessary complexity whenever possible.

# Important Product Decisions
- Correctness > fake precision.
- Live metric naming must match actual source timeframe.
- Never label 1H data as 30D.
- Prefer stable UX over fragile live parsing.

# Known Problems
- Chainspect parsing can be unstable because it relies on public dashboard markup.
- Public dashboards sometimes return unexpected formats.
- Logo coverage should continue moving toward fully local immutable assets over time.

# Future Plans
- Admin panel.
- Cleaner parser architecture.
- More reliable data pipelines.
- Potential future migration away from fragile HTML parsing.

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
- Keep this file concise, structured, and continuously updated after major decisions or implementations.
