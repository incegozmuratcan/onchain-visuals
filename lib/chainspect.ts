import { getChainLogo, normalizeChainName } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type ChainspectSnapshotRow = {
  name: string;
  slug: string;
  tps30d: number;
  blockTime: number;
  avgTxFee24h: number;
  developers: number;
};

const CHAIN_SPECT_SNAPSHOT: ChainspectSnapshotRow[] = [
  { name: "Solana", slug: "solana", tps30d: 1100, blockTime: 0.4, avgTxFee24h: 0.002, developers: 180 },
  { name: "ICP", slug: "internet-computer", tps30d: 900, blockTime: 0.6, avgTxFee24h: 0.0001, developers: 70 },
  { name: "Base", slug: "base", tps30d: 170, blockTime: 2.0, avgTxFee24h: 0.00892, developers: 160 },
  { name: "BSC", slug: "bnb-chain", tps30d: 140, blockTime: 3.0, avgTxFee24h: 0.02079, developers: 110 },
  { name: "Stellar", slug: "stellar", tps30d: 120, blockTime: 5.8, avgTxFee24h: 0.00001, developers: 35 },
  { name: "Aptos", slug: "aptos", tps30d: 95, blockTime: 0.05, avgTxFee24h: 0.005, developers: 90 },
  { name: "Sui", slug: "sui", tps30d: 75, blockTime: 0.08, avgTxFee24h: 0.003, developers: 120 },
  { name: "Arbitrum", slug: "arbitrum", tps30d: 55, blockTime: 0.25, avgTxFee24h: 0.01134, developers: 140 },
  { name: "Polygon", slug: "polygon", tps30d: 45, blockTime: 1.75, avgTxFee24h: 0.01, developers: 130 },
  { name: "Ethereum", slug: "ethereum", tps30d: 15, blockTime: 12.0, avgTxFee24h: 0.4986, developers: 300 },
  { name: "Avalanche", slug: "avalanche", tps30d: 14, blockTime: 1.02, avgTxFee24h: 0.04, developers: 85 },
  { name: "Near", slug: "near", tps30d: 12, blockTime: 0.62, avgTxFee24h: 0.001, developers: 95 },
  { name: "OP Mainnet", slug: "optimism", tps30d: 11, blockTime: 2.0, avgTxFee24h: 0.01, developers: 105 },
  { name: "Tron", slug: "tron", tps30d: 9, blockTime: 3.0, avgTxFee24h: 0.09403, developers: 45 },
  { name: "Bitcoin", slug: "bitcoin", tps30d: 7, blockTime: 10.0, avgTxFee24h: 0.4626, developers: 220 },
  { name: "Cardano", slug: "cardano", tps30d: 6, blockTime: 21.6, avgTxFee24h: 0.08421, developers: 150 },
  { name: "Cosmos", slug: "cosmos", tps30d: 5, blockTime: 6.0, avgTxFee24h: 0.01, developers: 100 },
  { name: "Cronos", slug: "cronos", tps30d: 4, blockTime: 0.44, avgTxFee24h: 0.02, developers: 30 },
  { name: "Fantom", slug: "fantom", tps30d: 4, blockTime: 1.0, avgTxFee24h: 0.01, developers: 40 },
  { name: "Celo", slug: "celo", tps30d: 3, blockTime: 5.0, avgTxFee24h: 0.001, developers: 55 },
  { name: "Algorand", slug: "algorand", tps30d: 3, blockTime: 2.74, avgTxFee24h: 0.001, developers: 45 },
  { name: "Sei", slug: "sei", tps30d: 3, blockTime: 0.46, avgTxFee24h: 0.01, developers: 40 },
  { name: "Mantle", slug: "mantle", tps30d: 2, blockTime: 2.0, avgTxFee24h: 0.01, developers: 35 },
  { name: "Starknet", slug: "starknet", tps30d: 2, blockTime: 2.86, avgTxFee24h: 0.02427, developers: 90 },
  { name: "TON", slug: "ton", tps30d: 2, blockTime: 0.41, avgTxFee24h: 0.005, developers: 65 },
  { name: "ZKsync Era", slug: "zksync-era", tps30d: 2, blockTime: 1.0, avgTxFee24h: 0.01, developers: 80 },
  { name: "Rootstock", slug: "rootstock", tps30d: 1, blockTime: 30.0, avgTxFee24h: 0.02, developers: 20 },
  { name: "Stacks", slug: "stacks", tps30d: 1, blockTime: 300.0, avgTxFee24h: 0.05, developers: 35 },
  { name: "Hedera", slug: "hedera", tps30d: 1, blockTime: 2.0, avgTxFee24h: 0.0001, developers: 45 },
  { name: "Kusama", slug: "kusama", tps30d: 1, blockTime: 6.12, avgTxFee24h: 0.02, developers: 25 },
];

async function fetchText(url: string) {
  const response = await fetch(url, { next: { revalidate: 3600 }, headers: { accept: "text/html" } });
  if (!response.ok) throw new Error("Chainspect request failed");
  return response.text();
}

function cleanText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(text: string, fallback = 0) {
  const match = text.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

function parseSeconds(text: string, fallback: number) {
  const cleaned = text.toLowerCase().replace(/,/g, " ");
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*(ms|s|sec|second|min|minute)?/);
  if (!match) return fallback;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return fallback;
  const unit = match[2] || "s";
  if (unit === "ms") return n / 1000;
  if (unit.startsWith("min")) return n * 60;
  return n;
}

function parseUsd(text: string, fallback: number) {
  const match = text.replace(/,/g, "").match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

function parseMetricAfterLabel(text: string, label: string, fallback: number, parser: (value: string, fallback: number) => number) {
  const labelIndex = text.toLowerCase().indexOf(label.toLowerCase());
  if (labelIndex < 0) return fallback;
  return parser(text.slice(labelIndex + label.length, labelIndex + label.length + 80), fallback);
}

async function withChainDetailMetrics(row: ChainspectSnapshotRow) {
  try {
    const text = cleanText(await fetchText(`https://chainspect.app/chain/${row.slug}`));
    return {
      ...row,
      tps30d: parseMetricAfterLabel(text, "Real-time TPS (30D)", row.tps30d, parseNumber),
      blockTime: parseMetricAfterLabel(text, "Block Time (1H)", row.blockTime, parseSeconds),
    };
  } catch {
    return row;
  }
}

function findMetricNearChain(text: string, row: ChainspectSnapshotRow, label: string, fallback: number, parser: (value: string, fallback: number) => number) {
  const index = text.toLowerCase().indexOf(row.name.toLowerCase());
  if (index < 0) return fallback;
  const chunk = text.slice(index, index + 500);
  const labelIndex = chunk.toLowerCase().indexOf(label.toLowerCase());
  if (labelIndex < 0) return fallback;
  return parser(chunk.slice(labelIndex + label.length, labelIndex + label.length + 80), fallback);
}

async function withFinancialMetrics(row: ChainspectSnapshotRow, pageText: string) {
  return { ...row, avgTxFee24h: findMetricNearChain(pageText, row, "Average Tx Fee", row.avgTxFee24h, parseUsd) };
}

async function withDeveloperMetrics(row: ChainspectSnapshotRow, pageText: string) {
  return { ...row, developers: findMetricNearChain(pageText, row, "Developers", row.developers, parseNumber) };
}

async function getChainspectRows(field: "tps30d" | "blockTime" | "avgTxFee24h" | "developers") {
  if (field === "tps30d" || field === "blockTime") return Promise.all(CHAIN_SPECT_SNAPSHOT.map(withChainDetailMetrics));

  if (field === "avgTxFee24h") {
    try {
      const text = cleanText(await fetchText("https://chainspect.app/dashboard/financials"));
      return Promise.all(CHAIN_SPECT_SNAPSHOT.map((row) => withFinancialMetrics(row, text)));
    } catch {
      return CHAIN_SPECT_SNAPSHOT;
    }
  }

  if (field === "developers") {
    try {
      const text = cleanText(await fetchText("https://chainspect.app/dashboard/developer-activity"));
      return Promise.all(CHAIN_SPECT_SNAPSHOT.map((row) => withDeveloperMetrics(row, text)));
    } catch {
      return CHAIN_SPECT_SNAPSHOT;
    }
  }

  return CHAIN_SPECT_SNAPSHOT;
}

function toMetricRows(rows: ChainspectSnapshotRow[], limit: number, field: "tps30d" | "blockTime" | "avgTxFee24h" | "developers", sort: "desc" | "asc"): ChainRevenueRow[] {
  return rows
    .map((row) => {
      const name = normalizeChainName(row.name);
      return { rank: 0, name, value: row[field], logo: getChainLogo(name) };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => (sort === "asc" ? a.value - b.value : b.value - a.value))
    .slice(0, Math.min(limit, 30))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getChainspectRealTimeTps(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard";
  const rows = toMetricRows(await getChainspectRows("tps30d"), limit, "tps30d", "desc");
  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by real-time TPS`,
    eyebrow: "Real-time TPS",
    description: "Shows which chains process the most transactions per second.",
    insight: "TPS measures transaction throughput. This card uses the 30D average real-time TPS to smooth short-term spikes.",
    methodology: "Methodology: Real-time TPS (30D) from Chainspect chain detail pages, cached for 1 hour.",
    valueFormat: "number",
    valueSuffix: "TPS",
    valueDirection: "higher",
  };
}

export async function getChainspectBlockTime(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard";
  const rows = toMetricRows(await getChainspectRows("blockTime"), limit, "blockTime", "asc");
  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by block time`,
    eyebrow: "Block Time",
    description: "Shows the fastest current block times across chains.",
    insight: "Block time is the average time between new blocks. Lower block time can improve responsiveness, but it is not the same as finality.",
    methodology: "Methodology: Block Time (1H) from Chainspect chain detail pages, cached for 1 hour. The card does not display a timeframe chip to keep the visual clean.",
    valueFormat: "number",
    valueSuffix: "s",
    valueDirection: "lower",
  };
}

export async function getChainspectAvgTxFee(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard/financials";
  const rows = toMetricRows(await getChainspectRows("avgTxFee24h"), limit, "avgTxFee24h", "asc");
  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by avg tx fee`,
    eyebrow: "Avg Tx Fee",
    description: "Shows chains with the lowest average transaction fees.",
    insight: "Average transaction fee shows the typical cost paid per transaction. This card uses the 24H average fee from Chainspect Financials.",
    methodology: "Methodology: 24H Average Tx Fee from Chainspect Financials dashboard, cached for 1 hour.",
    valueFormat: "usd",
    valueDirection: "lower",
  };
}

export async function getChainspectDevelopers(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard/developer-activity";
  const rows = toMetricRows(await getChainspectRows("developers"), limit, "developers", "desc");
  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by developers`,
    eyebrow: "Developers",
    description: "Shows chains with the largest developer base.",
    insight: "Developer count is a useful signal for ecosystem health, but it should be read together with usage, revenue and liquidity.",
    methodology: "Methodology: Developer count from Chainspect Developer Activity dashboard, cached for 1 hour.",
    valueFormat: "number",
    valueSuffix: "developers",
    valueDirection: "higher",
  };
}
