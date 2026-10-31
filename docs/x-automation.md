# X automation

The first automated post is the daily BTC ETF Flowboard for [@OnchainVis](https://x.com/OnchainVis). The GitHub Actions workflow `.github/workflows/x-btc-etf-daily.yml` is a dry run unless a run explicitly turns that off.

## What a run does

1. Builds the Next.js app and starts it inside the job.
2. Refreshes the BTC ETF daily snapshot through `POST /api/admin/onchain/refresh/btc-etf-flowboard?period=daily`. That route calls `refreshDataset`, the same snapshot path the page uses. The full `POST /api/cron/onchain/refresh` route is still available for a complete refresh; this job does not call it, so a missing Dune or DefiLlama key does not block the card.
3. Opens `/onchain/btc-etf-flowboard?period=daily&capture=1` in Playwright Chromium and screenshots the share card at 1536×1024.
4. Builds a caption from the snapshot: session date, net flow, largest issuer move, other same-direction issuers, and cumulative net flow.
5. Uploads `btc-etf-daily.png`, `caption.txt`, and `result.json` as the `btc-etf-daily` artifact.

When `X_DRY_RUN` is anything other than `false`, `0`, or `off`, the job stops there. It does not call `POST /api/x/publish-btc-etf-daily` and it does not call X.

A live post runs only when dry-run is explicitly off **and** `ONCHAIN_PUBLISH_SECRET` plus the four OAuth 1.0a secrets below are set. The publish route uses the same rule: an unset `X_DRY_RUN` is a dry run. The access token has to be the **@OnchainVis** user token with Read and write permission. The route signs `POST https://api.x.com/2/media/upload` and `POST https://api.x.com/2/tweets` with OAuth 1.0a, then posts the caption with the PNG attached.

## Schedule

`30 5 * * 2-6` is 05:30 UTC, which is 08:30 in Istanbul (UTC+3, no daylight saving). That is Tuesday through Saturday morning, after the previous US cash session. Farside often publishes after the close, so this is a first pass rather than a guarantee that the print is final. `workflow_dispatch` is always available and defaults to a dry run.

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
| `ONCHAIN_PUBLISH_SECRET` | No | Any long random string. The job sends it as the bearer for `POST /api/x/publish-btc-etf-daily`. Required for a live post. It is not an X token. |
| `DATABASE_URL` | No | When set, refresh persists the snapshot in Postgres. When unset, the job uses `.onchain-cache` on the runner. |
| `ONCHAIN_REFRESH_SECRET` or `CRON_SECRET` | No | Bearer for the refresh route. When both are unset, the job mints a one-run secret for the server it starts. |

Do not put keys for a personal or other project account in the four OAuth 1.0 secrets. A successful live run writes `posted: true` and the post URL into `artifacts/x-btc-etf-daily/result.json`.

## Local dry run

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run x:btc-etf-daily
```

Artifacts land in `artifacts/x-btc-etf-daily/`. `X_DRY_RUN` defaults to a dry run when it is unset. `CAPTURE_PREVIEW=oct30-outflow` renders the wide-number fixture (`-$643.2M`, `IBIT -$233.7M`) instead of live Farside data and never posts.
