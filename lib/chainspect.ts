import { getChainLogo, normalizeChainName } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type TpsSnapshotRow = {
  name: string;
  tps: number;
};

const CHAIN_SPECT_TPS_SNAPSHOT: TpsSnapshotRow[] = [
  { name: "ICP", tps: 3200 },
  { name: "Solana", tps: 1100 },
  { name: "Base", tps: 170 },
  { name: "BNB Chain", tps: 140 },
  { name: "Stellar", tps: 120 },
  { name: "Aptos", tps: 95 },
  { name: "Sui", tps: 75 },
  { name: "Arbitrum", tps: 55 },
  { name: "Polygon", tps: 45 },
  { name: "Ethereum", tps: 15 },
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

function parseRowsFromHtml(html: string): TpsSnapshotRow[] {
  const rows: TpsSnapshotRow[] = [];
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const rowHtml of rowMatches) {
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => stripTags(match[1]));
    if (cells.length < 2) continue;

    const name = cells[0]?.replace(/^#?\d+\s*/, "").trim();
    const tpsCandidate = cells.find((cell, index) => index > 0 && /^\d[\d,.]*$/.test(cell));
    const tps = tpsCandidate ? toNumber(tpsCandidate) : 0;
    if (name && tps > 0 && !/real-time|max|transaction|block|finality/i.test(name)) rows.push({ name, tps });
  }

  return rows;
}

function rowsFromSnapshot(snapshot: TpsSnapshotRow[], limit: number): ChainRevenueRow[] {
  return snapshot
    .filter((row) => row.tps > 0)
    .map((row) => {
      const name = normalizeChainName(row.name);
      return { rank: 0, name, value: row.tps, logo: getChainLogo(name) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.min(limit, 30))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getChainspectRealTimeTps(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://chainspect.app/dashboard";
  let liveRows: TpsSnapshotRow[] = [];

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 3600 },
      headers: { accept: "text/html" },
    });

    if (response.ok) {
      const html = await response.text();
      liveRows = parseRowsFromHtml(html);
    }
  } catch {
    liveRows = [];
  }

  const sourceRows = liveRows.length >= 5 ? liveRows : CHAIN_SPECT_TPS_SNAPSHOT;
  const rows = rowsFromSnapshot(sourceRows, limit);

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
