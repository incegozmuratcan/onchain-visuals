import { NextResponse } from 'next/server';
import { refreshAllDatasets } from '@/lib/onchain/snapshots';
export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(req: Request) { const secret = process.env.ONCHAIN_REFRESH_SECRET || process.env.CRON_SECRET; if (!secret) return process.env.NODE_ENV !== 'production'; return req.headers.get('authorization') === `Bearer ${secret}`; }
export async function POST(req: Request) { if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ snapshots: await refreshAllDatasets() }); }
