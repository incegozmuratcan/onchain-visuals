import { getChainLogo } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type RwaSnapshotRow = {
  name: string;
  value: number;
};

const RWA_NETWORK_SNAPSHOT: RwaSnapshotRow[] = [
  { name: "Ethereum", value: 15_427_119_710 },
  { name: "BNB Chain", value: 2_665_832_568 },
  { name: "Liquid Network", value: 1_867_044_174 },
  { name: "Solana", value: 1_724_694_226 },
  { name: "Stellar", value: 1_380_720_180 },
  { name: "Arbitrum", value: 825_103_308 },
  { name: "Avalanche", value: 589_376_597 },
  { name: "XRP Ledger", value: 474_602_664 },
  { name: "Polygon", value: 462_175_354 },
  { name: "Plume", value: 299_071_761 },
  { name: "ZKsync Era", value: 208_393_979 },
  { name: "Base", value: 174_742_396 },
  { name: "Mantle", value: 160_317_929 },
  { name: "Hedera", value: 121_197_892 },
  { name: "Algorand", value: 98_206_050 },
  { name: "Aptos", value: 93_628_704 },
  { name: "SEI", value: 73_034_630 },
];

function parseDollarValue(value: string) {
  const clean = value.replace(/[$,\s▲▼△—]/g, "").trim();
  if (!clean) return 0;
  const multiplier = /b$/i.test(clean) ? 1_000_000_000 : /m$/i.test(clean) ? 1_000_000 : /k$/i.test(clean) ? 1_000 : 1;
  const numeric = Number(clean.replace(/[bmk]$/i, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : 0;
}

function parseRowsFromPublicText(text: string): RwaSnapshotRow[] {
  const lines = text.split(/\r?\n/);
  const rows: RwaSnapshotRow[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*\d+\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*(\$[\d,.]+[BMK]?)\s*\|/i);
    if (!match) continue;

    const name = match[1].trim();
    const value = parseDollarValue(match[2]);
    if (name && value > 0) rows.push({ name, value });
  }

  return rows;
}

function toMetricRows(rows: RwaSnapshotRow[], limit: number): ChainRevenueRow[] {
  return rows
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      name: row.name,
      value: row.value,
      logo: getChainLogo(row.name),
    }));
}

export async function getRwaValueByNetwork(limit: number): Promise<ChainMetricResult> {
  const endpoint = "https://app.rwa.xyz/networks";
  let parsedRows: RwaSnapshotRow[] = [];

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 3600 },
      headers: { accept: "text/html" },
    });

    if (response.ok) {
      const text = await response.text();
      parsedRows = parseRowsFromPublicText(text);
    }
  } catch {
    parsedRows = [];
  }

  const rows = toMetricRows(parsedRows.length >= 3 ? parsedRows : RWA_NETWORK_SNAPSHOT, limit);

  return {
    rows,
    source: "RWA.xyz Networks",
    updatedAt: formatDateTime(),
    endpoint,
    title: `Top ${rows.length} networks by RWA value`,
    eyebrow: "RWA Value",
    description: "Distributed tokenized real-world asset value by network, excluding stablecoins.",
    methodology: "Methodology: Distributed RWA value by network from RWA.xyz Networks. If the public table is unavailable at request time, learnDeFi uses the latest bundled public snapshot.",
  };
}
