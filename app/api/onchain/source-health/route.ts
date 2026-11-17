import { NextResponse } from 'next/server';
import { hasSession } from '@/lib/admin/auth';
import { getSourceHealth, redactPublicSourceHealth } from '@/lib/onchain/sourceHealth';
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const admin = hasSession();
  const health = await getSourceHealth({ detailed: admin });
  return NextResponse.json(admin ? health : redactPublicSourceHealth(health));
}
