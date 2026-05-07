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

type ChainBucket = {
  name: string;
  value24h: number;
  value7d: number;
  value30d: number;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickValue(row: ChainBucket, timeframe: Timeframe): number {
  if (timeframe === "24h") return row.value24h;
  if (timeframe === "7d") return row.value7d;
  return row.value30d;
}

function normalizeChainName(name: string) {
  return name
    .replace(/^chain#?/i, "")
    .replace(/^fees#?/i, "")
    .replace(/^revenue#?/i, "")
    .trim();
}

function addToBucket(
  buckets: Map<string, ChainBucket>,
  chain: string,
  value: number,
  indexFromEnd: number
) {
  const cleanName = normalizeChainName(chain || "Unknown");
  if (!cleanName || cleanName.toLowerCase() === "total") return;

  const existing =
    buckets.get(cleanName) ??
    {
      name: cleanName,
      value24h: 0,
      value7d: 0,
      value30d: 0,
    };

  if (indexFromEnd < 1) existing.value24h += value;
  if (indexFromEnd < 7) existing.value7d += value;
  if (indexFromEnd < 30) existing.value30d += value;

  buckets.set(cleanName, existing);
}

function readBreakdownItem(item: any): Record<string, number> {
  // DefiLlama breakdown formats can vary:
  // [timestamp, { Ethereum: 123, Solana: 456 }]
  // { date: ..., Ethereum: 123, Solana: 456 }
  // { timestamp: ..., data: { Ethereum: 123 } }
  if (Array.isArray(item)) {
    const maybeData = item[1];
    if (maybeData && typeof maybeData === "object") return maybeData;
    return {};
  }

  if (item?.data && typeof item.data === "object") return item.data;
  if (item?.breakdown && typeof item.breakdown === "object") return item.breakdown;

  if (item && typeof item === "object") {
    const ignored = new Set(["date", "timestamp", "time"]);
    return Object.fromEntries(
      Object.entries(item)
        .filter(([key]) => !ignored.has(key))
        .map(([key, value]) => [key, toNumber(value)])
    );
  }

  return {};
}

export async function getChainRevenue(limit: number, timeframe: Timeframe) {
  const url =
    "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=false&dataType=dailyRevenue";

  const response = await fetch(url, {
    next: { revalidate: 900 },
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DefiLlama request failed: ${response.status}`);
  }

  const json = await response.json();

  const breakdown = Array.isArray(json.totalDataChartBreakdown)
    ? json.totalDataChartBreakdown
    : [];

  const buckets = new Map<string, ChainBucket>();

  breakdown
    .slice(-30)
    .reverse()
    .forEach((item: any, indexFromEnd: number) => {
      const dailyBreakdown = readBreakdownItem(item);

      Object.entries(dailyBreakdown).forEach(([chain, value]) => {
        addToBucket(buckets, chain, toNumber(value), indexFromEnd);
      });
    });

  const rows: ChainRevenueRow[] = Array.from(buckets.values())
    .map((row) => ({
      rank: 0,
      name: row.name,
      value: pickValue(row, timeframe),
      value24h: row.value24h,
      value7d: row.value7d,
      value30d: row.value30d,
      change7d: null,
    }))
    .filter((row) => row.value > 0 && row.name.toLowerCase() !== "total")
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint: url,
  };
}
