import { NextRequest, NextResponse } from "next/server";
import { getChainRevenue } from "@/lib/defillama";
import { parsePrompt } from "@/lib/parser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get("prompt") || "Top 10 chains by 30D revenue";
  const parsed = parsePrompt(prompt);

  try {
    const data = await getChainRevenue(parsed.limit, parsed.timeframe);
    return NextResponse.json({ ok: true, query: parsed, ...data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error", query: parsed },
      { status: 500 }
    );
  }
}
