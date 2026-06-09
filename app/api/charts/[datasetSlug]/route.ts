import { NextRequest, NextResponse } from 'next/server';
import { buildChartSnapshot } from '@/lib/onchainData';
import { buildBtcEtfJun8OutflowPreview } from '@/lib/onchain/btcEtfPreview';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: { datasetSlug: string } }) {
  const period = request.nextUrl.searchParams.get('period') || undefined;
  const preview = request.nextUrl.searchParams.get('preview');
  const snapshot = params.datasetSlug === 'btc-etf-flowboard' && preview === 'jun8-outflow'
    ? buildBtcEtfJun8OutflowPreview()
    : await buildChartSnapshot(params.datasetSlug, period);
  if (!snapshot) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  return NextResponse.json(snapshot);
}
