import { getChainLogo, normalizeChainName } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type ChainspectSnapshotRow = {
  name: string;
  tps: number;
  blockTime: number;
};

const CHAIN_SPECT_SNAPSHOT: ChainspectSnapshotRow[] = [
  { name: "ICP", tps: 3200, blockTime: 0.6 },
  { name: "Solana", tps: 1100, blockTime: 0.4 },
  { name: "Base", tps: 170, blockTime: 2.0 },
  { name: "BNB Chain", tps: 140, blockTime: 3.0 },
  { name: "Stellar", tps: 120, blockTime: 5.0 },
  { name: "Aptos", tps: 95, blockTime: 0.2 },
  { name: "Sui", tps: 75, blockTime: 0.25 },
  { name: "Arbitrum", tps: 55, blockTime: 0.25 },
  { name: "Polygon", tps: 45, blockTime: 2.1 },
  { name: "Ethereum", tps: 15, blockTime: 12.0 },
  { name: "Avalanche", tps: 14, blockTime: 2.0 },
  { name: "Near", tps: 12, blockTime: 1.1 },
  { name: "Optimism", tps: 11, blockTime: 2.0 },
  { name: "Tron", tps: 9, blockTime: 3.0 },
  { name: "Bitcoin", tps: 7, blockTime: 600.0 },
  { name: "Cardano", tps: 6, blockTime: 20.0 },
  { name: "Cosmos", tps: 5, blockTime: 6.0 },
  { name: "Cronos", tps: 4, blockTime: 5.7 },
  { name: "Fantom", tps: 4, blockTime: 1.0 },
  { name: "Celo", tps: 3, blockTime: 5.0 },
  { name: "Algorand", tps: 3, blockTime: 2.8 },
  { name: "Sei", tps: 3, blockTime: 0.4 },
  { name: "Mantle", tps: 2, blockTime: 2.0 },
  { name: "Starknet", tps: 2, blockTime: 30.0 },
  { name: "TON", tps: 2, blockTime: 5.0 },
  { name: "ZKsync Era", tps: 2, blockTime: 1.0 },
  { name: "Rootstock", tps: 1, blockTime: 30.0 },
  { name: "Stacks", tps: 1, blockTime: 300.0 },
  { name: "Hedera", tps: 1, blockTime: 3.0 },
  { name: "Kusama", tps: 1, blockTime: 6.0 },
];

function toNumber(value: string) {
  const cleaned = value.replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function decodeHtml(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseDurationToSeconds(value: string) {
  const cleaned = value.toLowerCase().replace(/,/g, "").trim();
  const match = cleaned.match(/([0-9]*\.?[0-9]+)\s*(ms|s|sec|secs|second|seconds|min|mins|minute|minutes)?/);
  if (!match) return 0;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return 0;
  const unit = match[2] ?? "s";
  if (unit === "ms") return raw / 1000;
  if (unit.startsWith("min")) return raw * 60;
  return raw;
}

function parseRowsFromHtml(html: string): ChainspectSnapshotRow[] {
  const rows: ChainspectSnapshotRow[] = [];
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const rowHtml of rowMatches) {
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => stripTags(match[1]));
    if (cells.length < 6) continue;

    const name = cells[0]?.replace(/^#?\d+\s*/, "").trim();
    if (!name || /real-time|max|transaction|block|finality/i.test(name)) continue;

    const numericCells = cells.slice(1).filter((cell) => /^\d[\d,.]*$/.test(cell));
    const tps = numericCells[0] ? toNumber(numericCells[0]) : 0;
    const blockTimeCell = cells.find((cell) => /\d/.test(cell) && /\b(ms|s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(cell));
    const blockTime = blockTimeCell ? parseDurationToSeconds(blockTimeCell) : 0;

    if (tps > 0 || blockTime > 0) rows.push({ name, tps, blockTime });
  }

  return rows;
}

async function getChainspectRows() {
  const endpoint = "https://chainspect.app/dashboard";
  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 3600 },
      headers: { accept: "text/html" },
    });

    if (!response.ok) return CHAIN_SPECT_SNAPSHOT;
    const html = await response.text();
    const liveRows = parseRowsFromHtml(html);
    return liveRows.length >= 5 ? liveRows : CHAIN_SPECT_SNAPSHOT;
  } catch {
    return CHAIN_SPECT_SNAPSHOT;
  }
}

function toMetricRows(rows: ChainspectSnapshotRow[], limit: number, field: "tps" | "blockTime", sort: "desc" | "asc"): ChainRevenueRow[] {
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
  const rows = toMetricRows(await getChainspectRows(), limit, "tps", "desc");

  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by real-time TPS`,
    eyebrow: "Real-time TPS",
    description: "Shows how many transactions chains are processing per second right now.",
    insight: "TPS measures current transaction throughput. Real-time TPS reflects present network activity, not theoretical capacity.",
    methodology: "Methodology: Real-time TPS from Chainspect dashboard, cached for 1 hour. If the public dashboard is unavailable at request time, learnDeFi uses the latest bundled public snapshot.",
    valueFormat: "number",
    valueSuffix: "TPS",
  };
}

export async function getChainspectBlockTime(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard";
  const rows = toMetricRows(await getChainspectRows(), limit, "blockTime", "asc");

  return {
    rows,
    source: "Chainspect",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} chains by block time`,
    eyebrow: "Block Time",
    description: "Shows the fastest current block times across chains.",
    insight: "Block time is the average time between new blocks. Lower block time can improve responsiveness, but it is not the same as finality.",
    methodology: "Methodology: 1H block time from Chainspect dashboard, cached for 1 hour. If the public dashboard is unavailable at request time, learnDeFi uses the latest bundled public snapshot.",
    valueFormat: "number",
    valueSuffix: "s",
  };
}
