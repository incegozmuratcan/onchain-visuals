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
import { readPublicChartSnapshot } from '@/lib/onchain/publicSnapshot';
import DatasetChartClient from '@/components/onchain/DatasetChartClient';

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
  // capture=1 still builds live, which is what the X workflows screenshot.
  const data = previewData || (capture
    ? await buildChartSnapshot(params.slug, searchParams?.period)
    : await readPublicChartSnapshot(params.slug, searchParams?.period));
  if (!data) notFound();
  const brand = params.slug === 'btc-eth-etf-daily-flowboard' || params.slug === 'btc-eth-etf-weekly-flowboard' || params.slug === 'btc-eth-etf-monthly-flowboard' || params.slug === 'chain-revenue-daily'
    ? await getPublicBrandSettings()
    : undefined;
  const chart = <DatasetChartClient data={data} capture={capture} brand={brand} />;
  if (capture) return chart;
  return <main className="mx-auto max-w-7xl p-8">{chart}</main>;
}
