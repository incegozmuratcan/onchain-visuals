import { NextRequest, NextResponse } from 'next/server';
import { buildBtcEtfJun8OutflowPreview, buildBtcEtfOct30OutflowPreview } from '@/lib/onchain/btcEtfPreview';
import { PublicDataUnavailableError, publicCacheHeaders, readPublicChartSnapshot } from '@/lib/onchain/publicSnapshot';

// Stays dynamic so the X capture server sees the snapshot it just refreshed.
// The CDN still caches public responses via Cache-Control. Next's data cache
// is not used here: the workflow calls this URL before and after refresh.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function previewAllowed() {
  return process.env.VERCEL_ENV !== "production";
}

export async function GET(request: NextRequest, { params }: { params: { datasetSlug: string } }) {
  const period = request.nextUrl.searchParams.get('period') || undefined;
  const preview = previewAllowed() ? request.nextUrl.searchParams.get('preview') : null;
  let snapshot;
  try {
    snapshot = params.datasetSlug === 'btc-etf-flowboard' && preview === 'jun8-outflow'
      ? buildBtcEtfJun8OutflowPreview()
      : params.datasetSlug === 'btc-etf-flowboard' && preview === 'oct30-outflow'
        ? buildBtcEtfOct30OutflowPreview()
        : await readPublicChartSnapshot(params.datasetSlug, period);
  } catch (error) {
    if (error instanceof PublicDataUnavailableError) {
      return NextResponse.json(
        { error: error.updating ? 'Stored chart data is unavailable. Updating.' : 'Stored chart data is unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    throw error;
  }
  if (!snapshot) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  return NextResponse.json(snapshot, { headers: publicCacheHeaders() });
}
