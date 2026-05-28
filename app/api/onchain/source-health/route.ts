import { NextResponse } from 'next/server';
import { getSourceHealth } from '@/lib/onchain/sourceHealth';
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() { return NextResponse.json(await getSourceHealth({ detailed: false })); }
