import { notFound } from 'next/navigation';
import { buildChartSnapshot } from '@/lib/onchainData';
import { buildBtcEtfJun8OutflowPreview, buildBtcEtfOct30OutflowPreview } from '@/lib/onchain/btcEtfPreview';
import { buildBtcEthEtfWeeklyHolidayPreview } from '@/lib/onchain/btcEthEtfWeeklyPreview';
import {
  buildBtcEthEtfMonthlyHolidayPreview,
  buildBtcEthEtfMonthlySingleDayPreview,
} from '@/lib/onchain/btcEthEtfMonthlyPreview';
import { buildChainRevenueDailyLongNamesPreview } from '@/lib/onchain/chainRevenueDailyPreview';
import { getPublicBrandSettings } from '@/lib/brandSettings';
import { PublicDataUnavailableError, readPublicChartSnapshot } from '@/lib/onchain/publicSnapshot';
import type { ChartSnapshot } from '@/lib/onchain/types';
import DatasetChartClient from '@/components/onchain/DatasetChartClient';

export const maxDuration = 60;

export default async function DatasetPage({params, searchParams}:{params:{slug:string};searchParams?:{period?:string;preview?:string;capture?:string}}){
  const capture = searchParams?.capture === '1';
  // GitHub Actions renders on a local server, where VERCEL_ENV is unset.
  const preview = process.env.VERCEL_ENV === 'production' ? undefined : searchParams?.preview;
  const previewData = params.slug === 'btc-etf-flowboard' && preview === 'jun8-outflow'
    ? buildBtcEtfJun8OutflowPreview()
    : params.slug === 'btc-etf-flowboard' && preview === 'oct30-outflow'
      ? buildBtcEtfOct30OutflowPreview()
      : params.slug === 'btc-eth-etf-weekly-flowboard' && preview === 'holiday-week'
        ? buildBtcEthEtfWeeklyHolidayPreview()
        : params.slug === 'btc-eth-etf-monthly-flowboard' && preview === 'single-day-week'
          ? buildBtcEthEtfMonthlySingleDayPreview()
          : params.slug === 'btc-eth-etf-monthly-flowboard' && preview === 'holiday-month'
            ? buildBtcEthEtfMonthlyHolidayPreview()
            : params.slug === 'chain-revenue-daily' && preview === 'long-names'
              ? buildChainRevenueDailyLongNamesPreview()
              : null;
  // GitHub Actions does not set VERCEL, so X renders still build live.
  // A public capture=1 request on Vercel only reads the stored snapshot.
  const live = capture && !process.env.VERCEL;
  let data: ChartSnapshot | null = previewData;
  if (!data) {
    try {
      data = live
        ? await buildChartSnapshot(params.slug, searchParams?.period)
        : await readPublicChartSnapshot(params.slug, searchParams?.period);
    } catch (error) {
      if (!(error instanceof PublicDataUnavailableError)) throw error;
      return (
        <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Onchain Visuals</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Data unavailable</h1>
          <p className="mt-3 text-slate-600">
            {error.updating
              ? "Updating. This chart will show up when the refresh finishes."
              : "This chart has no stored snapshot yet. It will show up after the next refresh."}
          </p>
        </main>
      );
    }
  }
  if (!data) notFound();
  const brand = params.slug === 'btc-eth-etf-daily-flowboard' || params.slug === 'btc-eth-etf-weekly-flowboard' || params.slug === 'btc-eth-etf-monthly-flowboard' || params.slug === 'chain-revenue-daily'
    ? await getPublicBrandSettings()
    : undefined;
  const chart = <DatasetChartClient data={data} capture={capture} brand={brand} />;
  if (capture) return chart;
  return <main className="mx-auto max-w-7xl p-8">{chart}</main>;
}
