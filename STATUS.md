# STATUS

Updated 2026-11-22. Read this and `docs/DESIGN.md` before older history.

## Live X posts

- ETF Daily (v5): one BTC+ETH card. Caption `Here are the Bitcoin and Ethereum ETF flows for {Mon D}.` Site: `/onchain/btc-eth-etf-daily-flowboard`.
- ETF Weekly (v21): Sunday. Caption `Here are the Bitcoin and Ethereum ETF flows for the week of {Mon D} – {Mon D}.` Site: `/onchain/btc-eth-etf-weekly-flowboard`.
- ETF Monthly: days 1–5, previous Europe/Istanbul month. Caption `Here are the Bitcoin and Ethereum ETF flows for the month of {Month YYYY}.` Site: `/onchain/btc-eth-etf-monthly-flowboard`.
- Chain Revenue Daily (v17): 16:00 TR. Caption `How much revenue did blockchains generate on {Month D}?` Site: `/onchain/chain-revenue-daily`.
- Chain Revenue Weekly and Monthly: same v17 shell, badges `7D` and `1M`, rank-change chips. Workflows are in the repo. cron-job.org jobs are not created. Sites: `/onchain/chain-revenue-weekly`, `/onchain/chain-revenue-monthly`.
- BTC-only ETF (`.github/workflows/x-btc-etf-daily.yml`) is a manual emergency dispatch. It has no timer.

## Schedules

- cron-job.org dispatches `workflow_dispatch` with `{"ref":"main","inputs":{"dry_run":false}}`. A period already shared is skipped via that job's `posted-state.json`.
- ETF Weekly: `*/30 8-23 * * 0`, job 8859799. GitHub backup Sun 08:30 and 11:30 TR.
- ETF Monthly: `*/30 8-23 1-5 * *`, job 8869747. GitHub backup 08:30 and 11:30 TR on days 1–5.
- Chain Revenue Daily: `*/30 16-23 * * *`, job 8880708. GitHub backup 16:30 and 19:30 TR.
- Chain Revenue Weekly: GitHub backup Mondays 16:30 and 19:30 TR. Intended window is Mondays 16:00–23:30 TR. Not enabled.
- Chain Revenue Monthly: GitHub backup days 1–5 at 16:30 and 19:30 TR. Intended window is days 1–5, 16:00–23:30 TR. Not enabled.
- ETF Daily's workflow schedules GitHub cron only: Tue–Sat 08:30, 10:30, 13:30 TR. The owner also runs a 30-minute dispatch 08:00–23:30 TR Tue–Sat; that job id is not in the repo.
- GitHub backup crons follow repo var `X_DRY_RUN` (unset, or anything other than `false` / `0` / `off`, is a dry run). Owner reports `X_DRY_RUN=false`.

## Son yapılanlar

- 2026-11-22: Owner merged #183 (X publishing pipeline: post ledger, freshness gates, scoped secrets).
- 2026-11-22: Merged #184 site hardening, #185 bounded refresh + CDN cache, #186 public `source_error` cards, #187 ETF daily caption, #188 Chain Revenue gate.
- 2026-11-22: Chain Revenue weekly and monthly cards (7D / 1M), rank-change badges, period gates, and the caption updates for Chain Revenue daily plus ETF weekly and monthly.

## Sıradakiler

- Turn on Chain Revenue weekly and monthly cron-job.org jobs only after the owner approves the PNGs.
- Fix the Farside 403, DefiLlama `/cexs`, and derivatives 402 sources.
- Redesign the @OnchainVis X banner: the tagline is cut on mobile, and the title font should match the cards' bold sans-serif (Inter, weight 900).

## Known issues

- Chain Revenue gate (#188): before 20:00 TR a missing previous-day top-10 chain blocks. At and after 20:00 TR a missing small chain no longer blocks when tron, ethereum, and solana are present if they were in that top 10. The 95% coverage check still applies.
- Farside returns 403 from Vercel, so the ETH ETF, ETF monthly, BTC-vs-ETH, and issuer monthly site pages fail there. The X jobs fetch Farside from GitHub Actions.
- Farside blocks Node `fetch` from some hosts with a Cloudflare 403. `curl` from those hosts worked.
- DefiLlama `/cexs` field change breaks `cex-transparency` (`fetchCexTransparency` reads `json.cexs`).
- DefiLlama derivatives returns 402, so `perp-protocol-volume-oi` fails.

## Owner-only to-dos

- Fine-grained cron-job.org GitHub token.
- Vercel and Neon spend limits.
- 2FA on @OnchainVis, GitHub, and cron-job.org.
- Strong admin password.
- Protect `main` and add an `x-live` environment. `main` is unprotected today.
- Delete stale branch `cursor/vercel-cron-etf-daily-5486` (still on the remote).

## How to work

- Discuss before writing code, opening a PR, or merging. The owner approves anything that goes live.
- Check chain logos before a card ships.
- Anything posted on X also goes on the site. The X account is the site's portfolio.
- Stay lean: read `STATUS.md` and `docs/DESIGN.md` instead of long history. Update `STATUS.md` at the end of each task.
