import { NextResponse } from 'next/server';
import { getSourceHealth } from '@/lib/onchain/sourceHealth';
export async function GET() { return NextResponse.json(await getSourceHealth({ detailed: false })); }
