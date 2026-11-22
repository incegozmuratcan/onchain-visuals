# STATUS

Updated 2026-11-22 from `main` `651b0a1`. Read this and `docs/DESIGN.md` before older history.

## Live X posts

- ETF Daily (v5): one BTC+ETH card. Top 3 issuers per asset by absolute flow. Caption is `Here are the Bitcoin and Ethereum ETF flows for {Mon D}.` with the shared Farside session date (`buildBtcEthEtfDailyCaption`). Site: `/onchain/btc-eth-etf-daily-flowboard`.
- ETF Weekly (v21): Sunday. Site: `/onchain/btc-eth-etf-weekly-flowboard`.
- ETF Monthly: days 1–5, previous Europe/Istanbul month. First window is 1 Dec 2026. Reuses the weekly v21 shell (no separate version stamp). Site: `/onchain/btc-eth-etf-monthly-flowboard`.
- Chain Revenue Daily (v17): intended post 16:00 TR. Caption is `How much revenue did blockchains generate yesterday?` Site: `/onchain/chain-revenue-daily`.
- BTC-only ETF (`.github/workflows/x-btc-etf-daily.yml`) is a manual emergency dispatch. It has no timer.

## Schedules

- cron-job.org dispatches `workflow_dispatch` with `{"ref":"main","inputs":{"dry_run":false}}`. Each run is completeness gate, then render, then publish. A period already shared is skipped via that job's `posted-state.json` (a live post blocks later live runs; a dry-run blocks later dry-runs only).
- ETF Weekly: `*/30 8-23 * * 0` (Sun 08:00–23:30 TR), cron-job.org job 8859799. GitHub backup is Sun 08:30 and 11:30 TR.
- ETF Monthly: `*/30 8-23 1-5 * *`, job 8869747. GitHub backup is 08:30 and 11:30 TR on days 1–5.
- Chain Revenue: `*/30 16-23 * * *`, job 8880708. GitHub backup is 16:30 and 19:30 TR.
- ETF Daily's workflow file schedules GitHub cron only: Tue–Sat 08:30, 10:30, 13:30 TR (`30 5`, `30 7`, `30 10` UTC). It does not name a cron-job.org job. The owner also runs a 30-minute dispatch 08:00–23:30 TR Tue–Sat; that job id is not in the repo.
- GitHub backup crons follow repo var `X_DRY_RUN` (unset, or anything other than `false` / `0` / `off`, is a dry run). Owner reports `X_DRY_RUN=false`. This check could not read Actions variables (403). cron-job.org dispatches pass `dry_run: false` themselves.

## Open PRs & pending

- [#183](https://github.com/incegozmuratcan/onchain-visuals/pull/183) Harden X publishing pipeline is still open (post ledger, freshness gates, scoped secrets). GitHub reports MERGEABLE / CLEAN (checked 2026-11-22). Head `83fb601` is still based on `3134226`; main is `651b0a1`. Needs an owner decision.
- Merged: #184 site hardening, #185 bounded refresh + CDN cache, #186 public `source_error` cards, #187 ETF daily caption, #188 Chain Revenue gate.

## Known issues

- Chain Revenue gate (#188): before 20:00 TR a missing previous-day top-10 chain blocks. At and after 20:00 TR a missing small chain (Quai reports sparsely) no longer blocks when tron, ethereum, and solana are present if they were in that top 10. The 95% coverage check still applies.
- Farside returns 403 from Vercel, so the ETH ETF, ETF monthly, BTC-vs-ETH, and issuer monthly site pages fail there. The X jobs fetch Farside from GitHub Actions.
- DefiLlama `/cexs` field change breaks `cex-transparency` (`fetchCexTransparency` reads `json.cexs`).
- DefiLlama derivatives returns 402, so `perp-protocol-volume-oi` (`/overview/derivatives`) fails.
- Weekly and monthly captions still include amounts and the words "net inflow" / "net outflow". The daily caption does not. New captions follow `docs/DESIGN.md`.

## Next up

- Chain Revenue weekly and monthly cards.
- Fix the Farside 403, `/cexs`, and derivatives 402 sources.
- Redesign the @OnchainVis X banner: the tagline is cut on mobile, and the title font should match the cards' bold sans-serif (Inter, weight 900).

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
