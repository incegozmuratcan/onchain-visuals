import { NextRequest, NextResponse } from 'next/server';
import { buildChartSnapshot } from '@/lib/onchainData';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: { datasetSlug: string } }) {
  const period = request.nextUrl.searchParams.get('period') || '7d';
  const snapshot = await buildChartSnapshot(params.datasetSlug, period);
  if (!snapshot) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  return NextResponse.json(snapshot);
}
