import { NextRequest, NextResponse } from "next/server";
import { getChainRevenue, getChainTvl, getStablecoinSupplyByChain } from "@/lib/defillama";
import { parsePrompt } from "@/lib/parser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawPrompt = request.nextUrl.searchParams.get("prompt") || "Top 10 chains by 30D revenue";
  const prompt = rawPrompt.slice(0, 240);
  const parsed = parsePrompt(prompt);

  try {
    const data =
      parsed.metric === "chain_stablecoin_supply"
        ? await getStablecoinSupplyByChain(parsed.limit)
        : parsed.metric === "chain_tvl"
          ? await getChainTvl(parsed.limit)
          : await getChainRevenue(parsed.limit, parsed.timeframe);

    return NextResponse.json({ ok: true, query: parsed, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error", query: parsed },
      { status: 500 }
    );
  }
}
