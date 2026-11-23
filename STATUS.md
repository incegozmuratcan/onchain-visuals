# STATUS

Updated 2026-11-23. Read this and `docs/DESIGN.md` before older history.

## Live X posts

- ETF Daily (v5): one BTC+ETH card. Caption `Here are the Bitcoin and Ethereum ETF flows for {Mon D}.` Site: `/onchain/btc-eth-etf-daily-flowboard`.
- ETF Weekly (v21): Sunday–Tuesday, previous Mon–Fri week. Caption `Here are the Bitcoin and Ethereum ETF flows for the week of {Mon D} – {Mon D}.` Site: `/onchain/btc-eth-etf-weekly-flowboard`.
- ETF Monthly: days 1–5, previous Europe/Istanbul month. Caption `Here are the Bitcoin and Ethereum ETF flows for the month of {Month YYYY}.` Site: `/onchain/btc-eth-etf-monthly-flowboard`.
- Chain Revenue Daily (v17): site only, not posted on X since 2026-11-23. Caption `How much revenue did blockchains generate on {Month D}?` Site: `/onchain/chain-revenue-daily`.
- Chain Revenue Weekly and Monthly: on X. Same v17 shell, badges `7D` and `1M`, rank-change chips. Sites: `/onchain/chain-revenue-weekly`, `/onchain/chain-revenue-monthly`.
- BTC-only ETF (`.github/workflows/x-btc-etf-daily.yml`) is a manual emergency dispatch. It has no timer.

## Schedules

- cron-job.org dispatches `workflow_dispatch` with `{"ref":"main","inputs":{"dry_run":false}}`. A period already shared is skipped via that job's `posted-state.json`.
- ETF Daily: job 8833197, `*/30 8-23 * * *`, is updated on cron-job.org (every 30 min, 08:00–23:30 TR, including the Sun–Mon catch-up). GitHub backup is 08:30, 10:30, and 13:30 TR those days.
- ETF Weekly: job 8859799, `*/30 8-23 * * 0-2`, is updated on cron-job.org (every 30 min, 08:00–23:30 TR, Sunday–Tuesday). GitHub backup is 08:30 and 11:30 TR those days.
- ETF Monthly: `*/30 8-23 1-5 * *`, job 8869747. GitHub backup 08:30 and 11:30 TR on days 1–5.
- Chain Revenue Daily: job 8880708 is disabled on cron-job.org and has no GitHub backup cron.
- Chain Revenue Weekly: `*/30 16-23 * * 1`, job 8919886. Mondays 16:00–23:30 TR. GitHub backup 16:30 and 19:30 TR. The weekly no longer waits for the daily.
- Chain Revenue Monthly: `*/30 16-23 1-5 * *`, job 8919887. Days 1–5, 16:00–23:30 TR. GitHub backup 16:30 and 19:30 TR.
- GitHub backup crons follow repo var `X_DRY_RUN` (unset, or anything other than `false` / `0` / `off`, is a dry run). Owner reports `X_DRY_RUN=false`.

## Son yapılanlar

- 2026-11-23: Chain Revenue daily stopped on X (site only). Weekly posts as soon as the Mon–Sun week passes the gate.
- 2026-11-23: Chain Revenue gate uses each day's own 20:00 TR cutoff and only waits for top-10 chains that had revenue on all 3 prior days (quai spike fix).
- 2026-11-22: Chain Revenue cards take logos from Logo Manager, then the posted-state cache, the fixed set, DefiLlama, and an initial badge. A logo no longer skips the card.
- 2026-11-22: Owner merged #183 (X publishing pipeline: post ledger, freshness gates, scoped secrets).
- 2026-11-22: Merged #184 site hardening, #185 bounded refresh + CDN cache, #186 public `source_error` cards, #187 ETF daily caption, #188 Chain Revenue gate.
- 2026-11-22: Chain Revenue weekly and monthly cards (7D / 1M), rank-change badges, period gates, and the caption updates for Chain Revenue daily plus ETF weekly and monthly.
- 2026-11-22: ETF daily retries the oldest unposted ready NYSE session, including a Sun–Mon catch-up. ETF weekly posts Sun–Tue and waits when a daily post is due.

## Sıradakiler

- Fix the Farside 403, DefiLlama `/cexs`, and derivatives 402 sources.
- Redesign the @OnchainVis X banner: the tagline is cut on mobile, and the title font should match the cards' bold sans-serif (Inter, weight 900).

## Known issues

- Chain Revenue gate: a missing previous-day top-10 chain blocks only when that chain had revenue on all 3 prior days. The 20:00 Europe/Istanbul waiver is that day's own run day (the UTC date plus one day), so older days in a weekly or monthly check are waived any time. Before 20:00 TR on the next day, the daily still blocks for a stable missing chain. A missing tron, ethereum, or solana still blocks. The 95% coverage check still applies.
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
- Use APIs/connectors first, browser as little as possible.
- cron-job.org and other services are managed via API/connectors; minimize browser use.
- Don't choose the model or its settings; by default the owner's Cursor settings are used. If a complex multi-file task needs High effort, ask the owner before launching, and launch with High only after approval.
- Captions are in English. The English must be correct and natural first, then X's translate button must give a good Turkish translation. Show the owner the Turkish meaning of any proposed English text.
- cron-job.org API: api.cron-job.org, key in env CRONJOB_API_KEY (never print it).
