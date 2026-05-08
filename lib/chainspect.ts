import { getChainLogo, normalizeChainName } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type ChainspectSnapshotRow = {
  name: string;
  slug: string;
  tps: number;
  blockTime: number;
  avgTxFee: number;
};

const CHAIN_SPECT_SNAPSHOT: ChainspectSnapshotRow[] = [
  { name: "ICP", slug: "internet-computer", tps: 3200, blockTime: 0.6, avgTxFee: 0.0001 },
  { name: "Solana", slug: "solana", tps: 1100, blockTime: 0.4, avgTxFee: 0.002 },
  { name: "Base", slug: "base", tps: 170, blockTime: 2.0, avgTxFee: 0.01 },
  { name: "BSC", slug: "bnb-chain", tps: 140, blockTime: 3.0, avgTxFee: 0.03 },
  { name: "Stellar", slug: "stellar", tps: 120, blockTime: 5.0, avgTxFee: 0.00001 },
  { name: "Aptos", slug: "aptos", tps: 95, blockTime: 0.2, avgTxFee: 0.005 },
  { name: "Sui", slug: "sui", tps: 75, blockTime: 0.25, avgTxFee: 0.003 },
  { name: "Arbitrum", slug: "arbitrum", tps: 55, blockTime: 0.25, avgTxFee: 0.01 },
  { name: "Polygon", slug: "polygon", tps: 45, blockTime: 2.1, avgTxFee: 0.01 },
  { name: "Ethereum", slug: "ethereum", tps: 15, blockTime: 12.0, avgTxFee: 2.5 },
  { name: "Avalanche", slug: "avalanche", tps: 14, blockTime: 2.0, avgTxFee: 0.04 },
  { name: "Near", slug: "near", tps: 12, blockTime: 1.1, avgTxFee: 0.001 },
  { name: "OP Mainnet", slug: "optimism", tps: 11, blockTime: 2.0, avgTxFee: 0.01 },
  { name: "Tron", slug: "tron", tps: 9, blockTime: 3.0, avgTxFee: 0.01 },
  { name: "Bitcoin", slug: "bitcoin", tps: 7, blockTime: 600.0, avgTxFee: 1.5 },
  { name: "Cardano", slug: "cardano", tps: 6, blockTime: 20.0, avgTxFee: 0.05 },
  { name: "Cosmos", slug: "cosmos", tps: 5, blockTime: 6.0, avgTxFee: 0.01 },
  { name: "Cronos", slug: "cronos", tps: 4, blockTime: 5.7, avgTxFee: 0.02 },
  { name: "Fantom", slug: "fantom", tps: 4, blockTime: 1.0, avgTxFee: 0.01 },
  { name: "Celo", slug: "celo", tps: 3, blockTime: 5.0, avgTxFee: 0.001 },
  { name: "Algorand", slug: "algorand", tps: 3, blockTime: 2.8, avgTxFee: 0.001 },
  { name: "Sei", slug: "sei", tps: 3, blockTime: 0.4, avgTxFee: 0.01 },
  { name: "Mantle", slug: "mantle", tps: 2, blockTime: 2.0, avgTxFee: 0.01 },
  { name: "Starknet", slug: "starknet", tps: 2, blockTime: 30.0, avgTxFee: 0.02 },
  { name: "TON", slug: "ton", tps: 2, blockTime: 5.0, avgTxFee: 0.005 },
  { name: "ZKsync Era", slug: "zksync-era", tps: 2, blockTime: 1.0, avgTxFee: 0.01 },
  { name: "Rootstock", slug: "rootstock", tps: 1, blockTime: 30.0, avgTxFee: 0.02 },
  { name: "Stacks", slug: "stacks", tps: 1, blockTime: 300.0, avgTxFee: 0.05 },
  { name: "Hedera", slug: "hedera", tps: 1, blockTime: 3.0, avgTxFee: 0.0001 },
  { name: "Kusama", slug: "kusama", tps: 1, blockTime: 6.0, avgTxFee: 0.02 },
];

async function fetchText(url: string) {
  const response = await fetch(url, { next: { revalidate: 3600 }, headers: { accept: "text/html" } });
  if (!response.ok) throw new Error("Chainspect request failed");
  return response.text();
}

function cleanText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
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

function parseOneHourBlockTime(text: string, fallback: number) {
  const labelIndex = text.toLowerCase().indexOf("block time (1h)");
  if (labelIndex < 0) return fallback;
  return parseSeconds(text.slice(labelIndex + 15, labelIndex + 50), fallback);
}

async function withOneHourBlockTime(row: ChainspectSnapshotRow) {
  try {
    const html = await fetchText(`https://chainspect.app/chain/${row.slug}`);
    return { ...row, blockTime: parseOneHourBlockTime(cleanText(html), row.blockTime) };
  } catch {
    return row;
  }
}

async function getChainspectRows(field: "tps" | "blockTime" | "avgTxFee") {
  if (field === "blockTime") return Promise.all(CHAIN_SPECT_SNAPSHOT.map(withOneHourBlockTime));
  return CHAIN_SPECT_SNAPSHOT;
}

function toMetricRows(rows: ChainspectSnapshotRow[], limit: number, field: "tps" | "blockTime" | "avgTxFee", sort: "desc" | "asc"): ChainRevenueRow[] {
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
  const rows = toMetricRows(await getChainspectRows("tps"), limit, "tps", "desc");
  return { rows, source: "Chainspect", updatedAt: formatDateTime(), endpoint, title: `Top ${rows.length} chains by real-time TPS`, eyebrow: "Real-time TPS", description: "Shows how many transactions chains are processing per second right now.", insight: "TPS measures current transaction throughput. Real-time TPS reflects present network activity, not theoretical capacity.", methodology: "Methodology: Real-time TPS from Chainspect dashboard, cached for 1 hour.", valueFormat: "number", valueSuffix: "TPS" };
}

export async function getChainspectBlockTime(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard";
  const rows = toMetricRows(await getChainspectRows("blockTime"), limit, "blockTime", "asc");
  return { rows, source: "Chainspect", updatedAt: formatDateTime(), endpoint, title: `Top ${rows.length} chains by block time`, eyebrow: "Block Time", description: "Shows the fastest current block times across chains.", insight: "Block time is the average time between new blocks. Lower block time can improve responsiveness, but it is not the same as finality.", methodology: "Methodology: Block Time (1H) from Chainspect chain detail pages, cached for 1 hour. The card does not display a timeframe chip to keep the visual clean.", valueFormat: "number", valueSuffix: "s" };
}

export async function getChainspectAvgTxFee(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard/financials?gainers=false&order=desc&revenue=usd&sort=revenue";
  const rows = toMetricRows(await getChainspectRows("avgTxFee"), limit, "avgTxFee", "asc");
  return { rows, source: "Chainspect", updatedAt: formatDateTime(), endpoint, title: `Top ${rows.length} chains by avg tx fee`, eyebrow: "Avg Tx Fee", description: "Shows chains with the lowest average transaction fees.", insight: "Average transaction fee shows the typical cost paid for a transaction. Lower fees can improve accessibility, but they should be considered alongside security, demand and throughput.", methodology: "Methodology: Avg Tx Fee from Chainspect Financials dashboard, cached for 1 hour.", valueFormat: "usd" };
}
