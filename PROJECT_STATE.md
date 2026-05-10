# Vision
- learnDeFi is a share-ready crypto/DeFi market visualization platform.
- Focus: clean Apple-like design + easy-to-share leaderboard cards.
- Goal: educational + social-share oriented product.

# Current Stack
- Next.js
- React
- DefiLlama
- Chainspect
- DePIN Pulse

# Active Metrics

## Chains
- Revenue (24H / 7D / 30D)
- Stablecoin Supply
- TVL

## Infrastructure
- TPS (1H)
- Block Time (1H)
- Avg Tx Fee (24H)
- Developers

## Assets
- BUIDL onchain marketcap
- BENJI onchain marketcap

## Protocols
- DePIN
  - 30D annualized revenue
  - 24H revenue

# Data Source Rules

## DefiLlama
- Primary reliable source.
- Preferred whenever possible.

## Chainspect
- More fragile parsing system.
- Use 1-hour cache.
- Use verified fallback snapshots when live parsing fails.
- TPS must use Real-time TPS (1H), not 30D TPS.

## DePIN Pulse
- Used for DePIN revenue leaderboards.
- No 7D metric exists.
- Do not fabricate estimated 7D revenue.

# UI Rules
- Minimal Apple-like aesthetic.
- White / anthracite / black palette.
- Share-card optimized layouts.
- Chains shown on far-right for DePIN cards.
- Developers belong under Infrastructure.
- DePIN belongs under Protocols.
- Remove unnecessary complexity whenever possible.

# Logo System
- Local logo hosting is a major priority.
- Avoid relying entirely on external logo URLs.
- ZKsync Era logo previously caused issues.
- Long-term goal:
  - local cached logos
  - immutable caching
  - stable fallback system

# Cache Rules
- Default cache duration: 1 hour.
- If live parsing fails, use a verified fallback snapshot.
- Never show broken cards.

# Important Product Decisions
- Correctness > fake precision.
- Live metric naming must match actual source timeframe.
- Never label 1H data as 30D.
- Prefer stable UX over fragile live parsing.

# Known Problems
- Chainspect parsing instability.
- Some external logos still unreliable.
- Public dashboards sometimes return unexpected formats.

# Future Plans
- Admin panel.
- Better logo infrastructure.
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
