# X automation

The first automated post is the daily BTC ETF Flowboard for [@OnchainVis](https://x.com/OnchainVis). The GitHub Actions workflow `.github/workflows/x-btc-etf-daily.yml` is a dry run unless a run explicitly turns that off.

## What a run does

1. Builds the Next.js app and starts it inside the job.
2. Refreshes the BTC ETF daily snapshot through `POST /api/admin/onchain/refresh/btc-etf-flowboard?period=daily`. That route calls `refreshDataset`, the same snapshot path the page uses. The full `POST /api/cron/onchain/refresh` route is still available for a complete refresh; this job does not call it, so a missing Dune or DefiLlama key does not block the card.
3. Opens `/onchain/btc-etf-flowboard?period=daily&capture=1` in Playwright Chromium and screenshots the share card at 1536×1024.
4. Builds a caption from the snapshot: session date, net flow, largest issuer move, other same-direction issuers, and cumulative net flow.
5. Uploads `btc-etf-daily.png`, `caption.txt`, and `result.json` as the `btc-etf-daily` artifact.

When `X_DRY_RUN` is anything other than `false`, `0`, or `off`, the job stops there. It does not call `POST /api/x/publish-btc-etf-daily` and it does not call X.

A live post runs only when dry-run is explicitly off **and** `ONCHAIN_PUBLISH_SECRET` plus `X_USER_ACCESS_TOKEN` are set. The publish route uses the same rule: an unset `X_DRY_RUN` is a dry run. The token has to be a user-context token for **@OnchainVis**.

## Schedule

`30 5 * * 2-6` is 05:30 UTC, which is 08:30 in Istanbul (UTC+3, no daylight saving). That is Tuesday through Saturday morning, after the previous US cash session. Farside often publishes after the close, so this is a first pass rather than a guarantee that the print is final. `workflow_dispatch` is always available and defaults to a dry run.

The schedule stays a dry run unless the repository variable `X_DRY_RUN` is set to `false`. A manual run follows its `dry_run` input, which defaults to true even if that variable is false.

## GitHub Actions secrets

| Secret | Required for a dry run | Used for |
| --- | --- | --- |
| `ONCHAIN_PUBLISH_SECRET` | No | Bearer token for `POST /api/x/publish-btc-etf-daily`. Required for a live post. |
| `X_USER_ACCESS_TOKEN` | No | User-context token for @OnchainVis. Required for a live post. |
| `X_CLIENT_ID` | No | Reserved for a later refresh-token exchange. Not read yet. |
| `X_CLIENT_SECRET` | No | Reserved for a later refresh-token exchange. Not read yet. |
| `X_USER_REFRESH_TOKEN` | No | Reserved for a later refresh-token exchange. Not read yet. |
| `DATABASE_URL` | No | When set, refresh persists the snapshot in Postgres. When unset, the job uses `.onchain-cache` on the runner. |
| `ONCHAIN_REFRESH_SECRET` or `CRON_SECRET` | No | Bearer for the refresh route. When both are unset, the job mints a one-run secret for the server it starts. |

Do not put a token for a personal or other project account in `X_USER_ACCESS_TOKEN`.

## Local dry run

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run x:btc-etf-daily
```

Artifacts land in `artifacts/x-btc-etf-daily/`. `X_DRY_RUN` defaults to a dry run when it is unset. `CAPTURE_PREVIEW=oct30-outflow` renders the wide-number fixture (`-$643.2M`, `IBIT -$233.7M`) instead of live Farside data and never posts.
