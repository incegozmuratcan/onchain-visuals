import { NextRequest, NextResponse } from 'next/server';
import { datasetRegistry } from '@/lib/onchain';
import { getChainRevenue } from '@/lib/defillama';
import { formatCompactUsd, formatSignedPercent } from '@/lib/formatters';
import { marketShares, safeChangePct } from '@/lib/metrics';

export async function GET(request: NextRequest, { params }: { params: { datasetSlug: string } }) {
  const dataset = datasetRegistry.find((item) => item.slug === params.datasetSlug);
  if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

  if (dataset.slug !== 'chain-revenue-league') {
    return NextResponse.json({
      datasetId: dataset.id,
      title: dataset.name,
      category: dataset.category,
      freshness: { status: 'missing', source: dataset.primarySource, fallbackUsed: false },
      insights: ['Dataset scaffolded and ready for connector activation.','No fake data is served before source integration is complete.'],
    });
  }

  const data = await getChainRevenue(10, (request.nextUrl.searchParams.get('period') as '24h'|'7d'|'30d') || '24h');
  const shares = marketShares(data.rows.map((row) => ({ value: row.value })));
  const top = data.rows[0];

  return NextResponse.json({
    datasetId: dataset.id,
    title: dataset.name,
    subtitle: 'Top chains by recent revenue capture',
    date: new Date().toISOString().slice(0,10),
    category: dataset.category,
    freshness: { status: 'fresh', lastUpdatedAt: new Date().toISOString(), source: 'DefiLlama', fallbackUsed: false },
    headlineMetrics: [
      { label: 'Leader', value: top?.value ?? null, formattedValue: formatCompactUsd(top?.value), change: safeChangePct(top?.value7d, top?.value30d), changeLabel: formatSignedPercent(safeChangePct(top?.value7d, top?.value30d)) }
    ],
    series: {
      bars: data.rows.map((row, index) => ({ name: row.name, value: row.value, marketShare: shares[index], rank: row.rank })),
      lines: [],
      cards: [],
    },
    insights: [
      top ? `${top.name} generated the most chain revenue in the selected period.` : 'No leader available.',
      data.rows[1] ? `${data.rows[1].name} is the nearest challenger by revenue.` : 'Need more rows for momentum insight.',
    ],
    sourceLabel: 'Source: DefiLlama',
    sourceUrl: data.endpoint,
    exportFormats: ['1600x900','1200x1200','1080x1350'],
  });
}
