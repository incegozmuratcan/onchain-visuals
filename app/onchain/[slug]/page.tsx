import { notFound } from 'next/navigation';
import { buildChartSnapshot } from '@/lib/onchainData';
import DatasetChartClient from '@/components/onchain/DatasetChartClient';

export default async function DatasetPage({params, searchParams}:{params:{slug:string};searchParams?:{period?:string}}){
  const data = await buildChartSnapshot(params.slug, searchParams?.period ?? '7d');
  if (!data) notFound();
  return <main className="mx-auto max-w-7xl p-8"><DatasetChartClient data={data} /></main>;
}
