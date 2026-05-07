import { formatDateTime } from "./format";
import type { Timeframe } from "./parser";
import { getChainLogo } from "./chainLogos";

export type ChainRevenueRow = {
  rank: number;
  name: string;
  value: number;
  value24h?: number;
  value7d?: number;
  value30d?: number;
  change7d?: number | null;
  logo?: string | null;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickValue(row: any, timeframe: Timeframe): number {
  if (timeframe === "24h") {
    return toNumber(row.total24h ?? row.total1d ?? row.dailyRevenue);
  }

  if (timeframe === "7d") {
    return toNumber(row.total7d ?? row.weeklyRevenue);
  }

  return toNumber(row.total30d ?? row.monthlyRevenue);
}

function normalizeName(row: any): string {
  return String(row.name ?? row.displayName ?? row.module ?? "Unknown").trim();
}

function isChainRevenueRow(row: any): boolean {
  const category = String(row.category ?? "").toLowerCase();
  const name = String(row.name ?? row.displayName ?? "").toLowerCase();

  if (category === "chains" || category === "chain") return true;

  const knownChains = new Set([
    "ethereum",
    "solana",
    "tron",
    "bitcoin",
    "bsc",
    "bnb chain",
    "base",
    "arbitrum",
    "polygon",
    "optimism",
    "avalanche",
    "near",
    "sui",
    "aptos",
    "sei",
    "ton",
    "cardano",
    "cosmos",
    "fantom",
    "canton",
    "abstract",
    "hyperliquid l1",
  ]);

  return knownChains.has(name);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 900 },
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DefiLlama request failed: ${response.status}`);
  }

  return response.json();
}

export async function getChainRevenue(limit: number, timeframe: Timeframe) {
  const endpoint =
    "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue";

  const json = await fetchJson(endpoint);

  const sourceRows = Array.isArray(json.protocols)
    ? json.protocols
    : Array.isArray(json.data)
      ? json.data
      : [];

  const rows: ChainRevenueRow[] = sourceRows
    .filter(isChainRevenueRow)
    .map((row: any) => {
      const name = normalizeName(row);
      const logo = getChainLogo(name, row.logo ?? row.logoUrl ?? row.logoURI ?? null);

      return {
        rank: 0,
        name,
        value: pickValue(row, timeframe),
        value24h: pickValue(row, "24h"),
        value7d: pickValue(row, "7d"),
        value30d: pickValue(row, "30d"),
        change7d: row.change_7d ?? row.change7d ?? null,
        logo,
      };
    })
    .filter((row: ChainRevenueRow) => {
      const name = row.name.toLowerCase();
      return row.value > 0 && name !== "total" && name !== "all";
    })
    .sort((a: ChainRevenueRow, b: ChainRevenueRow) => b.value - a.value)
    .slice(0, limit)
    .map((row: ChainRevenueRow, index: number) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    rows,
    source: "DefiLlama Revenue by Chain",
    updatedAt: formatDateTime(),
    endpoint,
  };
}
