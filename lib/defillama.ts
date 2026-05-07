import { getChainLogo } from "./chainLogos";
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
  logo?: string | null;
};

export type ChainMetricResult = {
  rows: ChainRevenueRow[];
  source: string;
  updatedAt: string;
  endpoint: string;
  title: string;
  eyebrow: string;
  description: string;
  methodology: string;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickValue(row: any, timeframe: Timeframe): number {
  if (timeframe === "24h") return toNumber(row.total24h ?? row.total1d ?? row.dailyRevenue);
  if (timeframe === "7d") return toNumber(row.total7d ?? row.weeklyRevenue);
  return toNumber(row.total30d ?? row.monthlyRevenue);
}

function normalizeName(row: any): string {
  return String(row.name ?? row.displayName ?? row.module ?? row.chain ?? "Unknown").trim();
}

function isChainRevenueRow(row: any): boolean {
  const category = String(row.category ?? "").toLowerCase();
  const name = String(row.name ?? row.displayName ?? "").toLowerCase();
  if (category === "chains" || category === "chain") return true;
  const knownChains = new Set([
    "ethereum", "solana", "tron", "bitcoin", "bsc", "bnb chain", "base", "arbitrum", "polygon", "optimism", "avalanche", "near", "sui", "aptos", "sei", "ton", "cardano", "cosmos", "fantom", "canton", "abstract", "hyperliquid l1",
  ]);
  return knownChains.has(name);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 900 },
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`DefiLlama request failed: ${response.status}`);
  return response.json();
}

export async function getChainRevenue(limit: number, timeframe: Timeframe): Promise<ChainMetricResult> {
  const endpoint = "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue";
  const json = await fetchJson(endpoint);
  const sourceRows = Array.isArray(json.protocols) ? json.protocols : Array.isArray(json.data) ? json.data : [];

  const rows: ChainRevenueRow[] = sourceRows
    .filter(isChainRevenueRow)
    .map((row: any) => {
      const name = normalizeName(row);
      return {
        rank: 0,
        name,
        value: pickValue(row, timeframe),
        value24h: pickValue(row, "24h"),
        value7d: pickValue(row, "7d"),
        value30d: pickValue(row, "30d"),
        change7d: row.change_7d ?? row.change7d ?? null,
        logo: getChainLogo(name, row.logo ?? row.logoUrl ?? row.logoURI ?? null),
      };
    })
    .filter((row: ChainRevenueRow) => {
      const name = row.name.toLowerCase();
      return row.value > 0 && name !== "total" && name !== "all";
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama Revenue by Chain",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by ${timeframe.toUpperCase()} revenue`,
    eyebrow: "Chain Revenue",
    description: "Chain-level revenue captured by networks. App and protocol revenues are excluded.",
    methodology: "Methodology: Chain revenue only. Protocol and app revenue are excluded. Source attribution is kept on every export.",
  };
}

function getStablecoinChainValue(asset: any, chain: string): number {
  const chainData = asset?.chainCirculating?.[chain];
  if (!chainData) return 0;
  return toNumber(
    chainData.current?.peggedUSD ??
      chainData.circulating?.peggedUSD ??
      chainData.peggedUSD ??
      chainData.current ??
      chainData.circulating
  );
}

export async function getStablecoinSupplyByChain(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://stablecoins.llama.fi/stablecoins?includePrices=true";
  const json = await fetchJson(endpoint);
  const assets = Array.isArray(json.peggedAssets) ? json.peggedAssets : [];
  const buckets = new Map<string, number>();

  for (const asset of assets) {
    const chains = asset?.chainCirculating && typeof asset.chainCirculating === "object" ? Object.keys(asset.chainCirculating) : [];
    for (const chain of chains) {
      const value = getStablecoinChainValue(asset, chain);
      if (value <= 0) continue;
      buckets.set(chain, (buckets.get(chain) ?? 0) + value);
    }
  }

  const rows: ChainRevenueRow[] = Array.from(buckets.entries())
    .map(([name, value]) => ({ rank: 0, name, value, logo: getChainLogo(name) }))
    .filter((row) => {
      const name = row.name.toLowerCase();
      return row.value > 0 && name !== "total" && name !== "all";
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama Stablecoins by Chain",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by stablecoin supply`,
    eyebrow: "Stablecoin Supply",
    description: "Stablecoin supply held across chains. Growth and net-flow metrics are not included in this view yet.",
    methodology: "Methodology: Stablecoin supply by chain. Growth, transfer volume and net-flow metrics are not included in this view yet.",
  };
}
