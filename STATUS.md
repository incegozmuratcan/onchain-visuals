# STATUS

Updated 2026-11-24. Read this and `docs/DESIGN.md` before older history.

## Live X posts

- ETF Daily (v5): one BTC+ETH card. Caption `Here are the Bitcoin and Ethereum ETF flows for {Mon D}.` Site: `/onchain/btc-eth-etf-daily-flowboard`.
- ETF Weekly (v21): Sunday–Tuesday, previous Mon–Fri week. Caption `Here are the Bitcoin and Ethereum ETF flows for the week of {Mon D} – {Mon D}.` Site: `/onchain/btc-eth-etf-weekly-flowboard`.
- ETF Monthly: days 1–5, previous Europe/Istanbul month. Caption `Here are the Bitcoin and Ethereum ETF flows for the month of {Month YYYY}.` Site: `/onchain/btc-eth-etf-monthly-flowboard`.
- Chain Revenue Daily (v17): site only, not posted on X since 2026-11-23. Caption `How much revenue did blockchains generate on {Month D}?` Site: `/onchain/chain-revenue-daily`.
- Chain Revenue Weekly and Monthly: on X. Same v17 shell, badges `7D` and `1M`, rank-change chips. Sites: `/onchain/chain-revenue-weekly`, `/onchain/chain-revenue-monthly`.
- BTC-only ETF (`.github/workflows/x-btc-etf-daily.yml`) is a manual emergency dispatch. It has no timer.

## Mint / Burn alerts

Kod hazır, canlı değil (onay bekliyor). Workflow `.github/workflows/x-mint-burn.yml` (`X Mint and burn alerts`), `workflow_dispatch` only, dry run by default. cron-job.org is not created. Intended schedule `*/5 * * * *`. No URL in the post. Secrets: `ETHERSCAN_API_KEY`, `TRONGRID_API_KEY`, `HELIUS_API_KEY`. X OAuth secrets are the existing @OnchainVis ones, used only when a live run is requested.

| Chain | Token | Mint and burn |
| --- | --- | --- |
| Ethereum | USDC | >= $100M |
| Ethereum | USDT | >= $250M |
| Tron | USDT | >= $250M |
| Solana | USDC | >= $250M |
| Polygon | native USDC | >= $10M |

- No Polygon USDT. Only treasury issuance. Bridge mints and burns are excluded (CCTP V2 TokenMinter `0xfd78EE91…D002` and TokenMessengerV2 `0x28b5a0e9…cf5d`, CCTP V1 TokenMinter per chain including Polygon `0x10f7835F…2D2EC`, GatewayMinter `0x2222222d…C205`). Solana and Tron wait 30 quiet minutes, then one grouped card. Ethereum and Polygon post per transaction. There is no site page yet.

## Schedules

- cron-job.org dispatches `workflow_dispatch` with `{"ref":"main","inputs":{"dry_run":false}}`. A period already shared is skipped via that job's `posted-state.json`.
- ETF Daily: job 8833197, `*/30 8-23 * * *`, is updated on cron-job.org (every 30 min, 08:00–23:30 TR, including the Sun–Mon catch-up). GitHub backup is 08:30, 10:30, and 13:30 TR those days.
- ETF Weekly: job 8859799, `*/30 8-23 * * 0-2`, is updated on cron-job.org (every 30 min, 08:00–23:30 TR, Sunday–Tuesday). GitHub backup is 08:30 and 11:30 TR those days.
- ETF Monthly: `*/30 8-23 1-5 * *`, job 8869747. GitHub backup 08:30 and 11:30 TR on days 1–5.
- Chain Revenue Daily: job 8880708 is disabled on cron-job.org and has no GitHub backup cron.
- Chain Revenue Weekly: `*/30 16-23 * * 1`, job 8919886. Mondays 16:00–23:30 TR. GitHub backup 16:30 and 19:30 TR. The weekly no longer waits for the daily.
- Chain Revenue Monthly: `*/30 16-23 1-5 * *`, job 8919887. Days 1–5, 16:00–23:30 TR. GitHub backup 16:30, 19:30, and 20:30 TR. On a Monday the server gate holds it until 4 hours after the weekly post. No cron-job.org schedule change.
- Stablecoin supply weekly and monthly are live on cron-job.org. Weekly: job 8928991, `*/30 16-23 * * 2`, Tuesdays 16:00–23:30 TR, workflow `x-chain-stablecoin-supply-weekly.yml`. Monthly: job 8928992, `*/30 16-23 2-5 * *`, days 2–5, workflow `x-chain-stablecoin-supply-monthly.yml`. On a Tuesday the monthly gate waits 4 hours after the weekly post.
- GitHub backup crons follow repo var `X_DRY_RUN` (unset, or anything other than `false` / `0` / `off`, is a dry run). Owner reports `X_DRY_RUN=false`.

## Son yapılanlar

- 2026-11-24: Mint/burn TronGrid ve Helius istekleri de aralıklı atılıyor, 429'da tekrar deneniyor.
- 2026-11-24: Mint/burn Etherscan istekleri ~400 ms aralıkla atılıyor, 3/sn limit hatasında 2 kez tekrar deneniyor.
- 2026-11-24: Mint/Burn alert cards, captions, and the dry-run workflow. Not live; cron-job.org is not created.
- 2026-11-24: Stablecoin supply weekly and monthly cards (7D / 1M), captions, handles, and the 4-hour same-day gate for Chain Revenue and stablecoin.
- 2026-11-23: Chain Revenue daily stopped on X (site only). Weekly posts as soon as the Mon–Sun week passes the gate.
- 2026-11-23: Chain Revenue gate uses each day's own 20:00 TR cutoff and only waits for top-10 chains that had revenue on all 3 prior days (quai spike fix).
- 2026-11-22: Chain Revenue cards take logos from Logo Manager, then the posted-state cache, the fixed set, DefiLlama, and an initial badge. A logo no longer skips the card.
- 2026-11-22: ETF daily retries the oldest unposted ready NYSE session, including a Sun–Mon catch-up. ETF weekly posts Sun–Tue and waits when a daily post is due.

## Sıradakiler

- X bio and banner for @OnchainVis. The banner tagline is cut on mobile, and the title font should match the cards' bold sans-serif (Inter, weight 900).
- Fix the Farside 403, DefiLlama `/cexs`, and derivatives 402 sources.
- Possible pie-chart card.
- VS kıyaslama kartları.
- Öne Çıkan Hareketler akışı.

## Known issues

- Chain Revenue gate: a missing previous-day top-10 chain blocks only when that chain had revenue on all 3 prior days. The 20:00 Europe/Istanbul waiver is that day's own run day (the UTC date plus one day), so older days in a weekly or monthly check are waived any time. Before 20:00 TR on the next day, the daily still blocks for a stable missing chain. A missing tron, ethereum, or solana still blocks. The 95% coverage check still applies.
- Farside returns 403 from Vercel, so the ETH ETF, ETF monthly, BTC-vs-ETH, and issuer monthly site pages fail there. The X jobs fetch Farside from GitHub Actions. Node `fetch` is also blocked on some hosts; `curl` from those hosts worked.
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
- Don't choose the model or its settings; by default the owner's Cursor settings are used. If a complex multi-file task needs High effort, ask the owner before launching, and launch with High only after approval. Cloud agents are started without model or model_params.
- Aynı adım 2 kez hata verirse dur ve neyin takıldığını söyle.
- Bot devrinde ~300 kelimelik devir notu yazılır.
- Captions are in English. The English must be correct and natural first, then X's translate button must give a good Turkish translation. Show the owner the Turkish meaning of any proposed English text.
- cron-job.org API: api.cron-job.org, key in env CRONJOB_API_KEY (never print it).
