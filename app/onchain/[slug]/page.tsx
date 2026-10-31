import { notFound } from 'next/navigation';
import { buildChartSnapshot } from '@/lib/onchainData';
import { buildBtcEtfJun8OutflowPreview, buildBtcEtfOct30OutflowPreview } from '@/lib/onchain/btcEtfPreview';
import DatasetChartClient from '@/components/onchain/DatasetChartClient';

export default async function DatasetPage({params, searchParams}:{params:{slug:string};searchParams?:{period?:string;preview?:string;capture?:string}}){
  const previewData = params.slug === 'btc-etf-flowboard' && searchParams?.preview === 'jun8-outflow'
    ? buildBtcEtfJun8OutflowPreview()
    : params.slug === 'btc-etf-flowboard' && searchParams?.preview === 'oct30-outflow'
      ? buildBtcEtfOct30OutflowPreview()
      : null;
  const data = previewData || await buildChartSnapshot(params.slug, searchParams?.period);
  if (!data) notFound();
  const capture = searchParams?.capture === '1';
  const chart = <DatasetChartClient data={data} capture={capture} />;
  if (capture) return chart;
  return <main className="mx-auto max-w-7xl p-8">{chart}</main>;
}
