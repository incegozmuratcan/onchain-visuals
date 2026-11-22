# Card design

Permanent rules for share cards and X captions. The live family is listed below. Sizes are the Playwright capture size. At 1536px wide the `lg:` Tailwind values are what the PNG uses.

## Quality bar

Apple-level polish. Self-review the PNG before showing it to the owner. Cards in one family share the same shell, type, and spacing. Colors stay neutral: white card, gray panels, green for a positive figure, red for a negative figure. No extra brand colors.

Every card uses `ShareCardFrame`:

- Canvas `#f3f4f7`. Card is white, radius 28px, shadow `0 8px 30px rgba(0,0,0,.08)`.
- Font is Inter. The site loads it with `next/font`. Chain Revenue loads Inter 4.001 variable (`components/share/fonts/InterVariable-opsz.woff`) so optical sizing matches the approved v17 card. Titles are `font-black` (900), sans-serif.
- Title: 48px, tracking `-0.055em`, `#020617`. Eyebrow: 17px, bold, uppercase, tracking 4px, `#8a8f99`. Subtitle: 22px, `#7b808a`.
- Brand pill, top right: `shortName` ("Onchain Visuals"), 20px extrabold, `#111`, border `#e3e5ea`.
- Footer: `Created with · Onchain Visuals` (`shareFooterCredit`). Source and Updated sit on the right, 18px, `#9aa0a8`, with the updated time in bold `#111`.
- Panels: `#f5f6f8`, 1.5px border `#cfd4dc`, radius 22px. Chips `#e8eaee`.
- Positive amount `#127a45`, positive bar `#1b8f58`. Negative amount `#b0153f`. Negative issuer bar `#c8203f`. Negative day bar `#b0153f`.

Shared pieces: `components/share/ShareCardFrame.tsx`, `IssuerFlowRow.tsx`, `AssetMedallions.tsx`. Chain Revenue adds `ChainRevenueDailyCard.tsx` and `chainRevenueFont.ts`. Weekly and monthly Chain Revenue reuse that card.

## Captions

Short, plain, idiom-free English. One idea. The sentence must translate cleanly with X's translate button. Name the real data date or period. Do not say "yesterday" (a Monday ETF post is Friday's session). Do not use "inflow", "outflow", or "how much moved" for ETF. Do not name the leading chain in a Chain Revenue caption. No cashtags, hashtags, emoji, or amounts; the card carries the numbers.

Chain Revenue uses the full month name. ETF daily and weekly use the short month name.

- Chain Revenue daily: `How much revenue did blockchains generate on November 21?`
- Chain Revenue weekly: `How much revenue did blockchains generate last week? (November 9 – November 15)`
- Chain Revenue monthly: `How much revenue did blockchains generate over the full month of October 2026?`
- ETF daily: `Here are the Bitcoin and Ethereum ETF flows for Nov 19.`
- ETF weekly: `Here are the Bitcoin and Ethereum ETF flows for the week of Nov 17 – Nov 21.` First and last trading day. Short month names. A one-day week names that day once.
- ETF monthly: `Here are the Bitcoin and Ethereum ETF flows for the month of October 2026.`

## Card families

| Card | Version | Render | Route | Workflow | Gate | Caption | Post time (TR) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ETF Daily | v5 | `components/share/SplitFlowboardCard.tsx` via `components/onchain/templates/SplitFlowboard.tsx`. 1536×1024, pad 42. | `/onchain/btc-eth-etf-daily-flowboard?period=daily&capture=1` | `.github/workflows/x-btc-eth-etf-daily.yml` | `scripts/x-btc-eth-etf-daily.mjs --preflight` (`selectDailyEtfSession` in `scripts/x-btc-eth-etf-share-gate.mjs`). Oldest NYSE session newer than the latest posted date, fully ready on BTC and ETH (every issuer a number or explicit 0). An unready session is retried. A newer ready session skips an older unready one. One session per run. Never a session older than the latest posted one. | `lib/onchain/btcEthEtfCaption.ts` `buildBtcEthEtfDailyCaption` | Every 30 min, 08:00–23:30 TR, Tue–Sat plus Sun–Mon catch-up. GitHub backup 08:30, 10:30, 13:30 TR those days. cron-job.org job 8833197. |
| ETF Weekly | v21 | `components/share/WeeklyFlowboardCard.tsx` via `WeeklyFlowboard.tsx`. 1536×1134, pad 36. `density="weekly"`. | `/onchain/btc-eth-etf-weekly-flowboard?period=weekly&capture=1` | `.github/workflows/x-btc-eth-etf-weekly.yml` | `scripts/x-btc-eth-etf-weekly.mjs --preflight`. Previous Mon–Fri week, Sunday–Tuesday TR, once every NYSE day is filled. Same week skipped via `posted-state.json`. If a daily post is due, the weekly waits for a later run. Not posted once the next week's weekly is due or posted. | `lib/onchain/btcEthEtfWeeklyCaption.ts` `buildBtcEthEtfWeeklyCaption` | Sun–Tue 08:00–23:30 TR, every 30 min. GitHub backup 08:30 and 11:30 TR those days. cron-job.org job 8859799. |
| ETF Monthly | weekly v21 shell | `WeeklyFlowboardCard` with `timeline="month"` via `MonthlyFlowboard.tsx`. 1536×1134, pad 36. | `/onchain/btc-eth-etf-monthly-flowboard?period=monthly&capture=1` | `.github/workflows/x-btc-eth-etf-monthly.yml` | `scripts/x-btc-eth-etf-monthly.mjs --preflight`. Every NYSE day of the previous Istanbul month filled in both tables. | `lib/onchain/btcEthEtfMonthlyCaption.ts` `buildBtcEthEtfMonthlyCaption` | Days 1–5, 08:00–23:30, every 30 min |
| Chain Revenue Daily | v17 | `components/share/ChainRevenueDailyCard.tsx` via `ChainRevenueDaily.tsx`. 1536×1134, pad 36. | `/onchain/chain-revenue-daily?period=24h&capture=1` | `.github/workflows/x-chain-revenue-daily.yml` | `scripts/x-chain-revenue-daily.mjs --preflight` (`assessChainRevenueDay` in `lib/onchain/chainRevenueDaily.ts`). 95% of the prior 3-day median, plus the previous day's top 10. After 20:00 TR a missing small top-10 chain is waived when tron, ethereum, and solana are present. | `lib/onchain/chainRevenueCaption.ts` `buildChainRevenueDailyCaption` | 16:00, retries through 23:30 |
| Chain Revenue Weekly | v17 shell | Same card. Badge `7D`. Panel date `NOV 9–15` plus the year. Subtitle `Revenue captured by the blockchains themselves, Nov 9–15, 2026.` | `/onchain/chain-revenue-weekly?period=weekly&capture=1` | `.github/workflows/x-chain-revenue-weekly.yml` | `scripts/x-chain-revenue-period.mjs weekly --preflight`. Every UTC day of the last completed Monday–Sunday passes `assessChainRevenueDay`. | `buildChainRevenueWeeklyCaption` | Mondays 16:00–23:30 TR, every 30 min. cron-job.org job 8919886. GitHub backup 16:30 and 19:30 TR. |
| Chain Revenue Monthly | v17 shell | Same card. Badge `1M`. Panel date `OCT` plus the year. Subtitle `Revenue captured by the blockchains themselves, October 2026.` | `/onchain/chain-revenue-monthly?period=monthly&capture=1` | `.github/workflows/x-chain-revenue-monthly.yml` | `scripts/x-chain-revenue-period.mjs monthly --preflight`. Every UTC day of the last completed calendar month passes `assessChainRevenueDay`. | `buildChainRevenueMonthlyCaption` | Days 1–5, 16:00–23:30 TR, every 30 min. cron-job.org job 8919887. GitHub backup 16:30 and 19:30 TR. |

Issuer rows on the ETF cards are the top 3 by absolute flow. Their underlines use the v21 square-root scale (`issuerBarPercent` in `lib/onchain/btcEthEtfWeek.ts`). Day bars are linear from a center zero line (`dayBarPercent`), half a track at the max. Chain Revenue bars are square-root, and rank 1 fills the track (`chainRevenueBarPercent`). Weekly and monthly bars stay green, the same `#1b8f58` as the daily card. The bar column is the daily grid (`34px 44px 330px` name column). Long names shrink inside that column. They do not move the bar.

Rank-change badges are on the weekly and monthly Chain Revenue cards only. The chip sits immediately after the chain name, inside the 330px name column, so the bar's x matches the daily card. Compare each chain with the previous period's top 10. Up is a green ▲ (`#127a45`) plus the place count. Down is a red ▼ (`#b0153f`) plus the place count. The count, and the word `NEW`, are `#1f2937`. `NEW` means the chain was not in the previous top 10. An unchanged rank draws nothing. The chip is a content-sized pill (`rounded-full`, `#d5d9e0`, about 30px tall, about 10px of horizontal padding, 20–22px bold), with a 10px gap after the name. It does not grow to fill the name column. It is vertically centered on the row. `Robinhood Chain` is drawn as `Robinhood` on these two cards so the badge fits. The daily card keeps `Robinhood Chain` and draws no badges.

## Recipe: weekly or monthly variant of a daily card

1. Copy the daily card. Keep `ShareCardFrame`, the footer, the type sizes, and the neutral colors. Change the period, not the chrome.
2. Aggregate the way ETF weekly and monthly do. A trading day is a weekday that is not an NYSE holiday. Week boxes are Monday–Friday buckets clipped to the period (`groupTradingWeeks`). A holiday is omitted. A one-day week is its own box (`formatTradingSpan` renders "May 1", not an empty range). Issuer underlines stay on the square-root scale. Day bars stay linear from the center.
3. Add a completeness gate and a same-period skip. The period posts only when every required day is numeric in full. A dash is incomplete, not zero. Record the period in that job's own `posted-state.json`. A live post blocks a later live post of the same period. A dry-run does not block the live post.
4. Add `.github/workflows/x-<card>.yml`. Steps: restore `posted-state.json`, choose dry-run, `--preflight`, then render and publish only when the gate sets `proceed=true`. cron-job.org is the primary trigger and sends `dry_run: false`. Keep a GitHub cron as backup that reads `vars.X_DRY_RUN`. `workflow_dispatch` defaults to a dry run.
5. Add a caption builder next to the existing ones. Follow the caption rules above. Use the real period ("Nov 17 – Nov 21", "October 2026", "November 21"). Do not say "yesterday".
6. Add the site page under `/onchain/<slug>` with the same card the X job screenshots. A capture URL (`capture=1`) is what Playwright shoots.
7. Dry-run the workflow. Check logos (reviewed marks in `public/logos/` for chains that have them; otherwise the DefiLlama icon or a neutral initial). Send the PNG and caption to the owner.
8. After approval, clone a cron-job.org job from the closest live job and point it at the new workflow. Do not turn the job on until the owner says it is live.
