import { fetchJson } from './http';
import type { SourceResult } from '../types';
import { CHAIN_REVENUE_OVERVIEW_URL, fetchChainRevenueDays } from '../chainRevenueDaily';

export type ChainRevenueDailyData = Awaited<ReturnType<typeof fetchChainRevenueDays>>;

/**
 * DefiLlama chain revenue per exact UTC calendar day (dailyRevenue,
 * protocolType chain). Reads each chain's summary totalDataChart; never the
 * rolling total24h.
 */
export async function fetchChainRevenueDaily(
  now: Date = new Date(),
  keepDays = 10,
): Promise<SourceResult<ChainRevenueDailyData>> {
  const url = CHAIN_REVENUE_OVERVIEW_URL;
  try {
    const data = await fetchChainRevenueDays((target, request) => fetchJson(target, request), { now, keepDays });
    const warnings = data.failed.length ? [`DefiLlama summary fetch failed for ${data.failed.join(', ')}.`] : [];
    return { ok: true, data, source: 'DefiLlama chain revenue', url, rowsFetched: data.chains.length, warnings };
  } catch (error: any) {
    return { ok: false, source: 'DefiLlama chain revenue', url, status: 'source_error', message: error?.message || 'DefiLlama chain revenue fetch failed' };
  }
}
