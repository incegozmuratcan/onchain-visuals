import { NextRequest, NextResponse } from "next/server";
import { getChainIdentity } from "@/lib/chainLogos";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const logoUrl = new URL(getChainIdentity(params.slug).asset, request.url);
  return NextResponse.redirect(logoUrl, 308);
}
