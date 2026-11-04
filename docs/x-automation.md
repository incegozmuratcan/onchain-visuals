# X automation

The scheduled post is the combined daily ETF Flowboard (Bitcoin and Ethereum) for [@OnchainVis](https://x.com/OnchainVis). Vercel Cron dispatches `.github/workflows/x-btc-eth-etf-daily.yml` on `main` with `dry_run` set to false. A manual run of that workflow stays a dry run unless its `dry_run` input is set to false.

Daily X sharing is that combined card only. `.github/workflows/x-btc-etf-daily.yml` no longer has a timer. It remains a manual `workflow_dispatch` for an emergency BTC-only post, and that dispatch still defaults to a dry run.

## What a combined run does

1. Builds the Next.js app and starts it inside the job.
2. Refreshes the combined snapshot through `POST /api/admin/onchain/refresh/btc-eth-etf-daily-flowboard?period=daily`. That route calls `refreshDataset`, which loads the Farside BTC and ETH tables together in `buildBtcEthDailySplit`. The card does not read the separate BTC-only or ETH-only flowboard snapshots. The full `POST /api/cron/onchain/refresh` route is still available for a complete refresh; this job does not call it, so a missing Dune or DefiLlama key does not block the card.
3. Opens `/onchain/btc-eth-etf-daily-flowboard?period=daily&capture=1` in Playwright Chromium and screenshots `[data-capture='share-card']` at 1536×1024.
4. Builds a caption from the combined snapshot panels: the shared session date, then the BTC and ETH hero net amounts labeled inflow or outflow. The caption is only those lines. It has no cashtags, issuer lines, cumulative totals, source line, or hashtags, because X rejects a post with more than one cashtag. BTC and ETH must share the same completed date or the job stops.
5. Uploads `btc-eth-etf-daily.png`, `caption.txt`, and `result.json` as the `btc-eth-etf-daily` artifact.

When `X_DRY_RUN` is anything other than `false`, `0`, or `off`, the job stops there. It does not call `POST /api/x/publish-btc-eth-etf-daily` and it does not call X.

A live post runs only when dry-run is explicitly off **and** `ONCHAIN_PUBLISH_SECRET` plus the four OAuth 1.0a secrets below are set. The publish route uses the same rule: an unset `X_DRY_RUN` is a dry run. The access token has to be the **@OnchainVis** user token with Read and write permission. The route signs `POST https://api.x.com/2/media/upload` and `POST https://api.x.com/2/tweets` with OAuth 1.0a, then posts the caption with the PNG attached.

`CAPTURE_PREVIEW` never results in a live post. The combined card has no preview fixture, so the script stops before capture when that variable is set.

## Schedule

GitHub Actions does not schedule this workflow. The timer is Vercel Cron on the production deployment, defined in `vercel.json`. Leaving a GitHub `schedule` in place would race that cron.

Europe/Istanbul is UTC+3 all year (no daylight saving). The window is Tuesday–Saturday, 08:00–14:00 Istanbul, every 30 minutes, including both ends. In UTC that is 05:00–11:00.

| Istanbul | UTC | Vercel cron | What it does |
| --- | --- | --- | --- |
| 08:00–13:30, every 30 min | 05:00–10:30 | `*/30 5-10 * * 2-6` | Dispatch the workflow live |
| 14:00 | 11:00 | `0 11 * * 2-6` | Last live dispatch |
| 14:45 | 11:45 | `45 11 * * 2-6` | Do not dispatch. Log if the window has no live post |

All three entries call `GET /api/cron/x-btc-eth-etf-daily`. Vercel sends `Authorization: Bearer $CRON_SECRET` and the `x-vercel-cron-schedule` header. The route calls GitHub `workflow_dispatch` for `.github/workflows/x-btc-eth-etf-daily.yml` on `main` with input `dry_run` set to the string `false`. A manual run from the Actions tab still defaults that input to true.

If a run of this workflow is already queued or in progress, the route does not dispatch another one. It returns `reason: "already_running"`. The workflow concurrency group `x-btc-eth-etf-daily` (`cancel-in-progress: false`) is the backstop when two requests overlap. The next half-hour tries again. The Farside completeness check is unchanged.

A pass shares only when the newest real Farside session for Bitcoin and the newest real session for Ethereum are the same date, and every issuer cell on both rows is a real number or an explicit 0. A dash, a blank, or a missing cell is incomplete, not zero. Farside often appends the next date as dashes with a total of 0 before that print exists. That shell is not a session, so the previous filled day can still be shared. Once any issuer number is on the new row, that row is the session, and a partial fill does not post. An incomplete pass exits successfully without calling X, writes `reason: "incomplete"` into `result.json`, and leaves the later pass free to share once the row is filled.

If that session date was already shared, or Farside has no newer row than the last success (a holiday or an empty day), the pass exits successfully with `reason: "already_posted"` or `reason: "no_new_session"`. Successful runs record the date in `artifacts/x-btc-eth-etf-daily/posted-state.json`. The workflow uploads that file and the next run restores it from the previous artifact. A live post blocks every later run of that date. A dry-run success blocks later dry-runs only, so turning live posting on the same day can still publish once.

`workflow_dispatch` is always available and defaults to a dry run. The repository variable `X_DRY_RUN` is not read for that event. Cron does not depend on it. Leave the variable as it is. This repo does not set `X_DRY_RUN` in code.

### Plan limits

Vercel allows 100 cron jobs per project on Hobby, Pro, and Enterprise. These three entries are inside that count.

Hobby cannot run this window. A Hobby cron expression may fire at most once per day, and Hobby invokes it sometime inside that hour rather than on the minute. `*/30 5-10 * * 2-6` runs twelve times on a Tuesday–Saturday, so deployment fails with `Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day.` Splitting each half-hour into its own daily expression would pass that check and still miss the minute, because two jobs in the same hour can fire together. Use Pro or Enterprise. Pro invokes the job during the scheduled minute.

Cron jobs run only for the production deployment.

### After the window

At 14:45 Istanbul the same route does not dispatch. It reads the newest `btc-eth-etf-daily` artifact created since 05:00 UTC. It writes an error log when that artifact shows no live post because Farside was incomplete, the run failed, or no run started. `no_new_session` (holiday or empty day) is a warning, not that error. `already_posted` from a live run counts as a live post. This check does not send Slack or email.

### Vercel environment variables

Set these on the Vercel project for Production. Do not commit them. Leave `GITHUB_DISPATCH_TOKEN` off Preview so a preview deployment cannot dispatch a live post.

| Variable | Required | Used for |
| --- | --- | --- |
| `CRON_SECRET` | Yes | Bearer checked by `/api/cron/x-btc-eth-etf-daily`. Vercel Cron attaches it when the variable exists. Use at least 16 random characters. The route does not accept `ONCHAIN_REFRESH_SECRET` in its place. The same string may also be the GitHub Actions `CRON_SECRET`, but it has to be set on Vercel. |
| `GITHUB_DISPATCH_TOKEN` | Yes | Token that can dispatch Actions on this repo. Prefer a fine-grained PAT, or a GitHub App installation token, with Actions read and write on `incegozmuratcan/onchain-visuals`. A classic PAT needs the `repo` scope. The route never reads `X_DRY_RUN`. |

`GITHUB_REPOSITORY` is optional (`owner/repo`). When it is unset, the route uses `VERCEL_GIT_REPO_OWNER` and `VERCEL_GIT_REPO_SLUG`, then `incegozmuratcan/onchain-visuals`. The dispatch ref is always `main`.

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

`npm run test:unit` covers the Farside completeness check, the skip rules, and the Vercel cron dispatch. To verify the path without posting, run **X BTC+ETH ETF daily** with `workflow_dispatch` and leave `dry_run` at true. A green run whose artifact `result.json` has `reason: "incomplete"` means Farside was not ready and a later cron can still share. A green run with `btc-eth-etf-daily.png` means the session was complete. A later run for that same date logs that it was already shared and does not call X. Delete `artifacts/x-btc-eth-etf-daily/posted-state.json` before a local rerun of a date you already recorded.

The BTC-only command `npm run x:btc-etf-daily` still works for a manual card. `CAPTURE_PREVIEW=oct30-outflow` on that command renders the wide-number fixture (`-$643.2M`, `IBIT -$233.7M`) instead of live Farside data and never posts.
