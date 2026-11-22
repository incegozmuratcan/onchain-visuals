# X automation

The scheduled post is the combined daily ETF Flowboard (Bitcoin and Ethereum) for [@OnchainVis](https://x.com/OnchainVis). The GitHub Actions workflow `.github/workflows/x-btc-eth-etf-daily.yml` is a dry run unless a run explicitly turns that off.

Daily X sharing is that combined card only. `.github/workflows/x-btc-etf-daily.yml` no longer has a timer. It remains a manual `workflow_dispatch` for an emergency BTC-only post, and that dispatch still defaults to a dry run.

## What a combined run does

1. Builds the Next.js app and starts it inside the job.
2. Refreshes the combined snapshot through `POST /api/admin/onchain/refresh/btc-eth-etf-daily-flowboard?period=daily`. That route calls `refreshDataset`, which loads the Farside BTC and ETH tables together in `buildBtcEthDailySplit`. The card does not read the separate BTC-only or ETH-only flowboard snapshots. The full `POST /api/cron/onchain/refresh` route is still available for a complete refresh; this job does not call it, so a missing Dune or DefiLlama key does not block the card.
3. Opens `/onchain/btc-eth-etf-daily-flowboard?period=daily&capture=1` in Playwright Chromium and screenshots `[data-capture='share-card']` at 1536×1024.
4. Builds a one-sentence caption from the Farside session date drawn on the card: `Here are the Bitcoin and Ethereum ETF flows for Nov 14.`. The date is explicit because a Monday post carries Friday's session, so "yesterday" would be wrong. The sentence is plain English so X's translate button reads cleanly in other languages. It has no amounts, cashtags, issuer lines, source line, or hashtags; the card carries the numbers. BTC and ETH must share the same completed date or the job stops.
5. Uploads `btc-eth-etf-daily.png`, `caption.txt`, and `result.json` as the `btc-eth-etf-daily` artifact.

When `X_DRY_RUN` is anything other than `false`, `0`, or `off`, the job stops there. It does not call `POST /api/x/publish-btc-eth-etf-daily` and it does not call X.

A live post runs only when dry-run is explicitly off **and** `ONCHAIN_PUBLISH_SECRET` plus the four OAuth 1.0a secrets below are set. The publish route uses the same rule: an unset `X_DRY_RUN` is a dry run. The access token has to be the **@OnchainVis** user token with Read and write permission. The route signs `POST https://api.x.com/2/media/upload` and `POST https://api.x.com/2/tweets` with OAuth 1.0a, then posts the caption with the PNG attached.

`CAPTURE_PREVIEW` never results in a live post. The combined card has no preview fixture, so the script stops before capture when that variable is set.

## Schedule

cron-job.org job 8833197 is the primary trigger: every 30 minutes from 08:00 through 23:30 Europe/Istanbul (UTC+3, no daylight saving), Tuesday through Saturday, plus Sunday and Monday so a late Friday session can still post. The required cron is `*/30 8-23 * * *` in the Europe/Istanbul timezone. The GitHub crons are only a backup:

| Istanbul | UTC cron | Pass |
| --- | --- | --- |
| 08:30 | `30 5 * * 0-6` | Backup |
| 10:30 | `30 7 * * 0-6` | Backup |
| 13:30 | `30 10 * * 0-6` | Backup |

A pass posts at most one session: the oldest NYSE session newer than the latest date in `posted-state.json` that is fully filled on both Bitcoin and Ethereum. Every issuer cell is a real number or an explicit 0. A dash, a blank, or a missing cell is incomplete, not zero. Farside often appends the next date as dashes with a total of 0 before that print exists. That shell is not a session. An unready session exits successfully without calling X, writes `reason: "incomplete"` into `result.json`, and the next pass retries it. If a newer session is fully ready while an older one is still unready, the older one is skipped for good and the newer one is posted. A session older than the latest posted date is never posted.

If that session date was already shared, or Farside has no newer session than the last success, the pass exits successfully with `reason: "already_posted"` or `reason: "no_new_session"`. Successful runs record the date in `artifacts/x-btc-eth-etf-daily/posted-state.json`. The workflow uploads that file and the next run restores it from the previous artifact. A live post blocks every later run of that date. A dry-run success blocks later dry-runs only, so turning live posting on the same day can still publish once. The card is pinned to the chosen session (`ETF_DAILY_SESSION`) so a catch-up post shows that date, not a later session that is already filled.

`workflow_dispatch` is always available and defaults to a dry run.

The schedule stays a dry run unless the repository variable `X_DRY_RUN` is set to `false`. A manual run follows its `dry_run` input, which defaults to true even if that variable is false.

## GitHub Actions secrets

A dry run needs none of the X secrets. A live post needs `ONCHAIN_PUBLISH_SECRET` and four values from the X Developer Portal. Do not commit those values.

### Paste the OAuth 1.0 keys

1. Open the [X Developer Portal](https://developer.x.com/en/portal/dashboard) and select the app that posts as [@OnchainVis](https://x.com/OnchainVis).
2. Under **User authentication settings**, set **App permissions** to **Read and write**. If you change this, regenerate the Access Token and Secret afterward. A token created while the app was Read stays read-only.
3. Open **Keys and tokens** and find **OAuth 1.0 Keys**.
4. In the GitHub repo, open **Settings → Secrets and variables → Actions → New repository secret**. Create one secret per row. Paste the portal value only: no quotes and no extra spaces. The Access Token row in the portal must show **@OnchainVis**.

| GitHub secret | Copy this portal field |
| --- | --- |
| `X_CONSUMER_KEY` | Consumer Key. Some screens label this **API Key**. It is the same value. |
| `X_CONSUMER_SECRET` | Consumer Secret. Some screens label this **API Key Secret**. |
| `X_ACCESS_TOKEN` | Access Token for @OnchainVis. This is the OAuth 1.0 token, not an OAuth 2.0 bearer. |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret shown next to that Access Token. |

`X_USER_ACCESS_TOKEN` is obsolete for live posts. The portal OAuth 2.0 token generator for this app does not offer `media.write`. `POST /2/media/upload` then returns `Forbidden` for that bearer. The job does not read `X_USER_ACCESS_TOKEN`. Do not paste an OAuth 2.0 bearer into `X_ACCESS_TOKEN`.

`X_CLIENT_ID`, `X_CLIENT_SECRET`, and `X_USER_REFRESH_TOKEN` are not read. Live posts do not refresh an OAuth 2.0 token.

### Other secrets

| Secret | Required for a dry run | Used for |
| --- | --- | --- |
| `ONCHAIN_PUBLISH_SECRET` | No | Any long random string. The job sends it as the bearer for `POST /api/x/publish-btc-eth-etf-daily`. Required for a live post. It is not an X token. |
| `DATABASE_URL` | No | When set, refresh persists the snapshot in Postgres. When unset, the job uses `.onchain-cache` on the runner. |
| `ONCHAIN_REFRESH_SECRET` or `CRON_SECRET` | No | Bearer for the refresh route. When both are unset, the job mints a one-run secret for the server it starts. |

Do not put keys for a personal or other project account in the four OAuth 1.0 secrets. A successful live run writes `posted: true` and the post URL into `artifacts/x-btc-eth-etf-daily/result.json`.

## Local dry run

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run x:btc-eth-etf-daily
```

Artifacts land in `artifacts/x-btc-eth-etf-daily/`. `X_DRY_RUN` defaults to a dry run when it is unset. Leave `CAPTURE_PREVIEW` unset. The combined script does not render a fixture, and it refuses a live post when that variable is set.

`npm run test:unit` covers the Farside completeness check and the skip rules. To verify the scheduled path without posting, run **X BTC+ETH ETF daily** with `workflow_dispatch` and leave `dry_run` at true. A green run whose artifact `result.json` has `reason: "incomplete"` means Farside was not ready and a later cron can still share. A green run with `btc-eth-etf-daily.png` means the session was complete. A later run for that same date logs that it was already shared and does not call X. Delete `artifacts/x-btc-eth-etf-daily/posted-state.json` before a local rerun of a date you already recorded.

The BTC-only command `npm run x:btc-etf-daily` still works for a manual card. `CAPTURE_PREVIEW=oct30-outflow` on that command renders the wide-number fixture (`-$643.2M`, `IBIT -$233.7M`) instead of live Farside data and never posts.

## Chain Revenue daily

`.github/workflows/x-chain-revenue-daily.yml` posts the Chain Revenue card (top 10 chains by revenue for the latest completed UTC day). It follows the ETF jobs: dry run by default, the same secrets, its own `posted-state.json` in the `chain-revenue-daily` artifact, and `POST /api/x/publish-chain-revenue-daily` for the live post.

### Data

- Chains: `https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`, keeping `protocolType: "chain"` with `category: "Chain"` (about 115).
- Values: each chain's `https://api.llama.fi/summary/fees/{slug}?dataType=dailyRevenue` `totalDataChart` point for the exact UTC calendar day. `total24h` is never read, because it is a rolling window that mixes two days.
- Card: top 10 by revenue, total of every chain with a point that day, the chain count, and the #1 chain's share. Bars use a square-root scale so small chains stay visible.
- Logos, in order: Logo Manager approved logo, the copy cached in this job's `posted-state.json`, the fixed marks in `public/logos/chain-revenue/`, the DefiLlama icon `https://icons.llamao.fi/icons/chains/rsz_<name>?w=96`, then a circle with the chain's initial. A missing or invalid logo falls through and never skips the card. `result.json` records the source for each chain.

### Completeness gate

DefiLlama fills a finished UTC day late, chain by chain. At 00:25 UTC the next day only about 45 of about 100 chains have a point. The share day is always the latest completed UTC day. A pass shares only when that day is complete:

1. The number of chains with a point for the day is at least 95% of the median count of the previous three days (normal days have about 96–109).
2. Every chain in the previous day's top 10 has revenue on the day.

An incomplete pass exits successfully with `reason: "incomplete"` and the coverage numbers in `result.json`. A later pass shares once the day is filled. An older day is never posted late. A day already shared skips with `reason: "already_posted"`. The site page shows the newest complete day, never a partial one.

### Caption

`How much revenue did blockchains generate on November 21?` The date is the UTC day on the card, with the full month name. Plain English with no hashtags or cashtags, so X's translation reads cleanly.

### Schedule

cron-job.org is the primary trigger, every 30 minutes from 16:00 to 23:30 Europe/Istanbul (`*/30 16-23 * * *`), sending `POST /repos/incegozmuratcan/onchain-visuals/actions/workflows/x-chain-revenue-daily.yml/dispatches` with `{"ref":"main","inputs":{"dry_run":false}}`. The first pass at 16:00 is the intended post time; later passes only post if 16:00 found the day incomplete. GitHub crons at 16:30 and 19:30 Istanbul are a backup and follow `vars.X_DRY_RUN`.

### Local dry run

```bash
npm run build
npm run x:chain-revenue-daily                      # gate, then render if the day is complete
node scripts/x-chain-revenue-daily.mjs --preflight # gate only
node scripts/x-chain-revenue-daily.mjs --preview=long-names
node scripts/x-chain-revenue-daily.mjs --as-of=2026-11-16T13:00:00Z
```

`--preview=long-names` renders a fixture with the longest chain names and a missing icon. `--as-of` runs the gate as of that time to re-render the newest complete day; it is dry-run only and records nothing. The server still builds the card from the newest complete day, so use it only while that day is the newest complete one. Artifacts land in `artifacts/x-chain-revenue-daily/`.
