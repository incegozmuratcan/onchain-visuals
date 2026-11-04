import { NextRequest, NextResponse } from "next/server";
import { runBtcEthEtfCron } from "@/lib/x/btcEthEtfCron";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * Vercel Cron entry for the combined BTC+ETH ETF daily X post.
 * CRON_SECRET is checked here. GITHUB_DISPATCH_TOKEN dispatches
 * x-btc-eth-etf-daily.yml on main with dry_run=false.
 * The 14:45 Europe/Istanbul cron only logs whether a live post exists.
 */
async function handle(request: NextRequest) {
  const result = await runBtcEthEtfCron({
    authorization: request.headers.get("authorization"),
    schedule: request.headers.get("x-vercel-cron-schedule"),
    env: process.env,
    fetch: globalThis.fetch,
  });
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" },
  });
}

export const GET = handle;
export const POST = handle;
