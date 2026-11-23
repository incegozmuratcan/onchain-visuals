import { NextRequest } from "next/server";
import { publishStablecoinSupplyCard } from "@/lib/x/publishStablecoinSupply";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function POST(request: NextRequest) {
  return publishStablecoinSupplyCard(request, "weekly");
}
