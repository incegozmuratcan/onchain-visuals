import { formatDateTime } from "./format";
import type { Timeframe } from "./parser";

export type ChainRevenueRow = {
  rank: number;
  name: string;
  value: number;
  value24h?: number;
  value7d?: number;
  value30d?: number;
  change7d?: number | null;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickValue(row: any, timeframe: Timeframe): number {
  if (timeframe === "24h") return toNumber(row.total24h ?? row.total1d ?? row.dailyRevenue ?? row.revenue24h ?? row.fees24h);
  if (timeframe === "7d") return toNumber(row.total7d ?? row.weeklyRevenue ?? row.revenue7d ?? row.fees7d);
  return toNumber(row.total30d ?? row.monthlyRevenue ?? row.revenue30d ?? row.fees30d);
}

export async function getChainRevenue(limit: number, timeframe: Timeframe) {
  const url = "https://api.llama.fi/overview/fees/chains?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue";
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`DefiLlama request failed: ${response.status}`);

  const json = await response.json();
  const sourceRows = Array.isArray(json.protocols) ? json.protocols : Array.isArray(json.chains) ? json.chains : [];

  const rows: ChainRevenueRow[] = sourceRows
    .map((row: any) => ({
      name: String(row.name ?? row.displayName ?? row.chain ?? "Unknown"),
      value: pickValue(row, timeframe),
      value24h: pickValue(row, "24h"),
      value7d: pickValue(row, "7d"),
      value30d: pickValue(row, "30d"),
      change7d: row.change_7d ?? row.change7d ?? null,
    }))
    .filter((row: ChainRevenueRow) => row.value > 0 && row.name.toLowerCase() !== "total")
    .sort((a: ChainRevenueRow, b: ChainRevenueRow) => b.value - a.value)
    .slice(0, limit)
    .map((row: ChainRevenueRow, index: number) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint: url,
  };
}
