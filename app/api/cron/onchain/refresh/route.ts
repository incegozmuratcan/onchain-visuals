import { NextResponse } from 'next/server';
import { refreshAllDatasets } from '@/lib/onchain/snapshots';
function authorized(req: Request) { const secret = process.env.ONCHAIN_REFRESH_SECRET || process.env.CRON_SECRET; return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`); }
async function run(req: Request) { if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ snapshots: await refreshAllDatasets() }); }
export const GET = run;
export const POST = run;
