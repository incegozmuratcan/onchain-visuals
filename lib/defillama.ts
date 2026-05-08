import { getChainLogo, normalizeChainName } from "./chainLogos";
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
  insight: string;
};

type AssetSnapshot = Record<string, number>;

const DEFILLAMA_RWA_ASSET_SNAPSHOTS: Record<string, AssetSnapshot> = {
  buidl: {
    Ethereum: 2_444_000_000,
    Polygon: 98_500_000,
    Avalanche: 72_600_000,
    Aptos: 50_700_000,
    Arbitrum: 44_200_000,
    Optimism: 31_600_000,
  },
  benji: {
    Stellar: 581_910_000,
    BSC: 113_860_000,
    Base: 58_920_000,
    Arbitrum: 49_290_000,
    Ethereum: 47_560_000,
    Avalanche: 36_820_000,
    Polygon: 31_770_000,
    Solana: 5_170_000,
  },
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

function chainRow(name: string, value: number, index = 0): ChainRevenueRow {
  const canonicalName = normalizeChainName(name);
  return {
    rank: index + 1,
    name: canonicalName,
    value,
    logo: getChainLogo(canonicalName),
  };
}

export async function getChainRevenue(limit: number, timeframe: Timeframe): Promise<ChainMetricResult> {
  const endpoint = "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue";
  const json = await fetchJson(endpoint);
  const sourceRows = Array.isArray(json.protocols) ? json.protocols : Array.isArray(json.data) ? json.data : [];

  const rows: ChainRevenueRow[] = sourceRows
    .filter(isChainRevenueRow)
    .map((row: any): ChainRevenueRow => {
      const name = normalizeChainName(normalizeName(row));
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
    .sort((a: ChainRevenueRow, b: ChainRevenueRow) => b.value - a.value)
    .slice(0, limit)
    .map((row: ChainRevenueRow, index: number): ChainRevenueRow => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by ${timeframe.toUpperCase()} revenue`,
    eyebrow: "Chain Revenue",
    description: "Shows revenue captured by chains themselves, excluding app and protocol revenue.",
    insight: "Chain revenue measures value captured at the network level. It is different from protocol revenue and helps separate chain economics from app activity.",
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

function normalizeStablecoinChainName(name: string) {
  return normalizeChainName(name);
}

export async function getStablecoinSupplyByChain(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://stablecoins.llama.fi/stablecoins?includePrices=true";
  const json = await fetchJson(endpoint);
  const assets = Array.isArray(json.peggedAssets) ? json.peggedAssets : [];
  const buckets = new Map<string, number>();

  for (const asset of assets) {
    const chains = asset?.chainCirculating && typeof asset.chainCirculating === "object" ? Object.keys(asset.chainCirculating) : [];
    for (const rawChain of chains) {
      const value = getStablecoinChainValue(asset, rawChain);
      if (value <= 0) continue;
      const chain = normalizeStablecoinChainName(rawChain);
      buckets.set(chain, (buckets.get(chain) ?? 0) + value);
    }
  }

  const rows: ChainRevenueRow[] = Array.from(buckets.entries())
    .map(([name, value]): ChainRevenueRow => chainRow(name, value))
    .filter((row) => {
      const name = row.name.toLowerCase();
      return row.value > 0 && name !== "total" && name !== "all";
    })
    .sort((a: ChainRevenueRow, b: ChainRevenueRow) => b.value - a.value)
    .slice(0, limit)
    .map((row: ChainRevenueRow, index: number): ChainRevenueRow => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by stablecoin supply`,
    eyebrow: "Stablecoin Supply",
    description: "Shows where stablecoin liquidity is concentrated across chains.",
    insight: "Stablecoin supply shows where dollar-linked liquidity lives onchain. Higher supply often points to deeper settlement liquidity and more available capital.",
    methodology: "Methodology: Stablecoin supply by chain. Growth, transfer volume and net-flow metrics are not included in this view yet.",
  };
}

export async function getChainTvl(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://api.llama.fi/v2/chains";
  const json = await fetchJson(endpoint);
  const rows: ChainRevenueRow[] = (Array.isArray(json) ? json : [])
    .map((row: any): ChainRevenueRow => {
      const name = normalizeChainName(normalizeName(row));
      return {
        rank: 0,
        name,
        value: toNumber(row.tvl),
        change7d: row.change_7d ?? null,
        logo: getChainLogo(name, row.logo ?? null),
      };
    })
    .filter((row: ChainRevenueRow) => row.value > 0 && row.name.toLowerCase() !== "all")
    .sort((a: ChainRevenueRow, b: ChainRevenueRow) => b.value - a.value)
    .slice(0, limit)
    .map((row: ChainRevenueRow, index: number): ChainRevenueRow => ({ ...row, rank: index + 1 }));

  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by DeFi TVL`,
    eyebrow: "DeFi TVL",
    description: "Shows how much value is deposited in DeFi protocols across chains.",
    insight: "TVL measures value deposited in DeFi protocols. It is useful for liquidity context, but it does not measure revenue or real user activity by itself.",
    methodology: "Methodology: Current DeFi TVL by chain. Stablecoin supply, revenue and bridge flows are not included in this view.",
  };
}

function parseDefiLlamaAssetTooltip(text: string): AssetSnapshot {
  const rows: AssetSnapshot = {};
  const pattern = /([A-Za-z0-9 .-]+):\s*\$([0-9,.]+)([KMBT]?)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const name = normalizeChainName(match[1].trim());
    const raw = Number(match[2].replace(/,/g, ""));
    const suffix = match[3]?.toUpperCase();
    const multiplier = suffix === "T" ? 1e12 : suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
    const value = raw * multiplier;
    if (Number.isFinite(value) && value > 0) rows[name] = value;
  }

  return rows;
}

async function getDefiLlamaRwaAssetSnapshot(assetSymbol: string): Promise<AssetSnapshot | null> {
  const endpoint = `https://defillama.com/rwa/asset/${assetSymbol.toUpperCase()}`;
  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 900 },
      headers: { accept: "text/html" },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const parsed = parseDefiLlamaAssetTooltip(html);
    return Object.keys(parsed).length ? parsed : null;
  } catch {
    return null;
  }
}

function rowsFromSnapshot(snapshot: AssetSnapshot, limit: number) {
  return Object.entries(snapshot)
    .map(([name, value]) => chainRow(name, value))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function getStableAssetValueByNetwork(assetSymbol: string, displayName: string, limit: number): Promise<ChainMetricResult> {
  const assetKey = assetSymbol.toLowerCase();
  const rwaEndpoint = `https://defillama.com/rwa/asset/${assetSymbol.toUpperCase()}`;
  const pageSnapshot = await getDefiLlamaRwaAssetSnapshot(assetSymbol);
  const snapshot = pageSnapshot ?? DEFILLAMA_RWA_ASSET_SNAPSHOTS[assetKey];

  if (!snapshot) throw new Error(`${displayName} network distribution was not found.`);

  const rows = rowsFromSnapshot(snapshot, limit);
  return {
    rows,
    source: "DefiLlama",
    updatedAt: formatDateTime(),
    endpoint: rwaEndpoint,
    title: `Top ${rows.length} networks by ${displayName} value`,
    eyebrow: displayName === "BUIDL" ? "Build" : displayName,
    description: `A network-level view of where ${displayName}'s tokenized fund value lives onchain.`,
    insight: `${displayName} is a tokenized fund. This chart shows how its onchain value is distributed across supported networks.`,
    methodology: `Methodology: ${displayName} network distribution from DefiLlama RWA asset pages. If the public page is unavailable at request time, learnDeFi uses the latest bundled public snapshot.`,
  };
}

export async function getBuidlValueByNetwork(limit: number): Promise<ChainMetricResult> {
  return getStableAssetValueByNetwork("buidl", "BUIDL", limit);
}

export async function getBenjiValueByNetwork(limit: number): Promise<ChainMetricResult> {
  return getStableAssetValueByNetwork("benji", "BENJI", limit);
}
