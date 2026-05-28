import { NextResponse } from 'next/server';
import { refreshDataset } from '@/lib/onchain/snapshots';
export const dynamic = "force-dynamic";
export const revalidate = 0;

function authorized(req: Request) { const secret = process.env.ONCHAIN_REFRESH_SECRET || process.env.CRON_SECRET; if (!secret) return process.env.NODE_ENV !== 'production'; return req.headers.get('authorization') === `Bearer ${secret}`; }
export async function POST(req: Request, { params }: { params: { datasetSlug: string } }) { if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const url = new URL(req.url); const snapshot = await refreshDataset(params.datasetSlug, url.searchParams.get('period') || undefined); if (!snapshot) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 }); return NextResponse.json(snapshot); }
