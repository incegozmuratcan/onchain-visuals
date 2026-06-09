import { notFound } from 'next/navigation';
import { buildChartSnapshot } from '@/lib/onchainData';
import { buildBtcEtfJun8OutflowPreview } from '@/lib/onchain/btcEtfPreview';
import DatasetChartClient from '@/components/onchain/DatasetChartClient';

export default async function DatasetPage({params, searchParams}:{params:{slug:string};searchParams?:{period?:string;preview?:string}}){
  const previewData = params.slug === 'btc-etf-flowboard' && searchParams?.preview === 'jun8-outflow'
    ? buildBtcEtfJun8OutflowPreview()
    : null;
  const data = previewData || await buildChartSnapshot(params.slug, searchParams?.period);
  if (!data) notFound();
  return <main className="mx-auto max-w-7xl p-8"><DatasetChartClient data={data} /></main>;
}
