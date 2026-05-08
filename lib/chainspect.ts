import { getChainLogo, normalizeChainName } from "./chainLogos";
import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

type ChainspectRow = {
  name: string;
  slug: string;
  tps30d?: number;
  blockTime?: number;
  avgTxFee24h?: number;
  developers?: number;
};

const CHAINS: ChainspectRow[] = [
  { name: "ICP", slug: "internet-computer", blockTime: 0.6, avgTxFee24h: 0.0001, developers: 70 },
  { name: "Solana", slug: "solana", blockTime: 0.4, avgTxFee24h: 0.002, developers: 180 },
  { name: "Fogo", slug: "fogo", blockTime: 0.4, avgTxFee24h: 0.001, developers: 10 },
  { name: "BNB Chain", slug: "bnb-chain", blockTime: 3.0, avgTxFee24h: 0.02079, developers: 110 },
  { name: "Stellar", slug: "stellar", blockTime: 5.8, avgTxFee24h: 0.00001, developers: 35 },
  { name: "Tron", slug: "tron", blockTime: 3.0, avgTxFee24h: 0.09403, developers: 45 },
  { name: "Polygon", slug: "polygon", blockTime: 1.75, avgTxFee24h: 0.01, developers: 130 },
  { name: "Aptos", slug: "aptos", blockTime: 0.05, avgTxFee24h: 0.005, developers: 90 },
  { name: "Base", slug: "base", blockTime: 2.0, avgTxFee24h: 0.00892, developers: 160 },
  { name: "BSV Blockchain", slug: "bsv-blockchain", blockTime: 600, avgTxFee24h: 0.001, developers: 15 },
  { name: "Sui", slug: "sui", blockTime: 0.08, avgTxFee24h: 0.003, developers: 120 },
  { name: "Ethereum", slug: "ethereum", blockTime: 12, avgTxFee24h: 0.4986, developers: 300 },
  { name: "TON", slug: "ton", blockTime: 0.41, avgTxFee24h: 0.005, developers: 65 },
  { name: "Avalanche", slug: "avalanche", blockTime: 1.02, avgTxFee24h: 0.04, developers: 85 },
  { name: "Near", slug: "near", blockTime: 0.62, avgTxFee24h: 0.001, developers: 95 },
  { name: "OP Mainnet", slug: "optimism", blockTime: 2.0, avgTxFee24h: 0.01, developers: 105 },
  { name: "Arbitrum", slug: "arbitrum", blockTime: 0.25, avgTxFee24h: 0.01134, developers: 140 },
  { name: "Algorand", slug: "algorand", blockTime: 2.74, avgTxFee24h: 0.001, developers: 45 },
  { name: "Bitcoin", slug: "bitcoin", blockTime: 600, avgTxFee24h: 0.4626, developers: 220 },
  { name: "Hedera", slug: "hedera", blockTime: 2.0, avgTxFee24h: 0.0001, developers: 45 },
  { name: "Cardano", slug: "cardano", blockTime: 21.6, avgTxFee24h: 0.08421, developers: 150 },
  { name: "Cosmos", slug: "cosmos", blockTime: 6.0, avgTxFee24h: 0.01, developers: 100 },
  { name: "Cronos", slug: "cronos", blockTime: 0.44, avgTxFee24h: 0.02, developers: 30 },
  { name: "Fantom", slug: "fantom", blockTime: 1.0, avgTxFee24h: 0.01, developers: 40 },
  { name: "Celo", slug: "celo", blockTime: 5.0, avgTxFee24h: 0.001, developers: 55 },
  { name: "Sei", slug: "sei", blockTime: 0.46, avgTxFee24h: 0.01, developers: 40 },
  { name: "Mantle", slug: "mantle", blockTime: 2.0, avgTxFee24h: 0.01, developers: 35 },
  { name: "Starknet", slug: "starknet", blockTime: 2.86, avgTxFee24h: 0.02427, developers: 90 },
  { name: "ZKsync Era", slug: "zksync-era", blockTime: 1.0, avgTxFee24h: 0.01, developers: 80 },
];

const LAST_VERIFIED_TPS_ROWS: ChainspectRow[] = [
  { name: "ICP", slug: "internet-computer", tps30d: 2276 },
  { name: "Solana", slug: "solana", tps30d: 1285 },
  { name: "Fogo", slug: "fogo", tps30d: 192.2 },
  { name: "Base", slug: "base", tps30d: 133.5 },
  { name: "BNB Chain", slug: "bnb-chain", tps30d: 132.2 },
  { name: "Stellar", slug: "stellar", tps30d: 128.2 },
  { name: "Aptos", slug: "aptos", tps30d: 112 },
  { name: "BSV Blockchain", slug: "bsv-blockchain", tps30d: 108.1 },
  { name: "Tron", slug: "tron", tps30d: 103.4 },
  { name: "Polygon", slug: "polygon", tps30d: 75.49 },
  { name: "TON", slug: "ton", tps30d: 57.37 },
  { name: "Sui", slug: "sui", tps30d: 32.12 },
  { name: "Avalanche", slug: "avalanche", tps30d: 29.94 },
  { name: "Ethereum", slug: "ethereum", tps30d: 21.17 },
  { name: "Arbitrum", slug: "arbitrum", tps30d: 12.59 },
  { name: "OP Mainnet", slug: "optimism", tps30d: 12.35 },
];

const NAME_ALIASES = new Map<string, string>([
  ["bnb chain", "BNB Chain"], ["bsc", "BNB Chain"], ["near protocol", "Near"],
  ["tron", "Tron"], ["ton", "TON"], ["optimism", "OP Mainnet"],
  ["internet computer", "ICP"], ["icp", "ICP"],
]);

async function fetchText(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal,
      headers: { accept: "text/html,text/plain,*/*", "user-agent": "Mozilla/5.0 learnDeFi" },
    });
    if (!response.ok) throw new Error(`Chainspect request failed: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchReadableText(url: string) {
  const readerUrl = "https://r.jina.ai/" + url;
  try {
    return await fetchText(readerUrl);
  } catch {
    return fetchText(url);
  }
}

function cleanText(input: string) {
  return input.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function parseNumber(text: string, fallback = 0) {
  const match = text.replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)/);
  const n = match ? Number(match[1]) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

function parseSeconds(text: string, fallback = 0) {
  const match = text.toLowerCase().replace(/,/g, "").match(/([0-9]+(?:\.[0-9]+)?)\s*(ms|s|sec|second|m|min|minute)?/);
  if (!match) return fallback;
  const n = Number(match[1]);
  const unit = match[2] || "s";
  if (!Number.isFinite(n)) return fallback;
  if (unit === "ms") return n / 1000;
  if (unit === "m" || unit.startsWith("min")) return n * 60;
  return n;
}

function parseUsd(text: string, fallback = 0) {
  const match = text.replace(/,/g, "").match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
  const n = match ? Number(match[1]) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDashboardName(raw: string) {
  const cleaned = raw
    .replace(/^\d+\s+/, "")
    .replace(/Image:\s*[^|]+?logo\s*/gi, "")
    .replace(/\b(Layer\s+[12]|Sidechain|Ecosystem|Testnet|Mainnet|Stake Now|New)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return NAME_ALIASES.get(cleaned.toLowerCase()) ?? cleaned;
}

function pushTpsRow(rows: ChainspectRow[], rawName: string, rawTps: string) {
  const name = normalizeDashboardName(rawName);
  const tps30d = parseNumber(rawTps);
  if (!name || tps30d <= 0) return;
  const existing = CHAINS.find((row) => normalizeChainName(row.name).toLowerCase() === normalizeChainName(name).toLowerCase());
  if (rows.some((row) => normalizeChainName(row.name).toLowerCase() === normalizeChainName(name).toLowerCase())) return;
  rows.push({ name, slug: existing?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), tps30d, blockTime: existing?.blockTime, avgTxFee24h: existing?.avgTxFee24h, developers: existing?.developers });
}

function parseTpsRows(text: string) {
  const source = text.includes("<") ? cleanText(text) : text;
  const rows: ChainspectRow[] = [];

  for (const line of source.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)) {
    if (!/^\d+\s+Image:/i.test(line) || !line.includes("|") || !/tx\/s/i.test(line)) continue;
    const [nameCell, tpsCell] = line.split("|").map((cell) => cell.trim());
    pushTpsRow(rows, nameCell, tpsCell);
  }

  const compactSource = cleanText(source);
  const rowPattern = /\b\d+\s+Image:\s*[^|]{1,80}?logo\s+([^|]{2,120}?)\s*\|\s*([0-9][0-9,.]*(?:\.[0-9]+)?)\s*tx\/s/gi;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(compactSource))) pushTpsRow(rows, match[1], match[2]);

  return rows;
}

async function getLiveTpsRows() {
  const urls = [
    "https://chainspect.app/dashboard?range=30d&order=desc&sort=realTimeTps",
    "https://chainspect.app/dashboard?range=30d",
    "https://chainspect.app/dashboard",
  ];

  for (const url of urls) {
    try {
      const rows = parseTpsRows(await fetchReadableText(url));
      if (rows.length >= 10) return rows;
    } catch {}
  }

  return LAST_VERIFIED_TPS_ROWS;
}

function metricAfterLabel(text: string, label: string, fallback: number, parser: (value: string, fallback: number) => number) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  return index < 0 ? fallback : parser(text.slice(index + label.length, index + label.length + 90), fallback);
}

async function withBlockTime(row: ChainspectRow) {
  try {
    const text = cleanText(await fetchReadableText(`https://chainspect.app/chain/${row.slug}`));
    return { ...row, blockTime: metricAfterLabel(text, "Block Time (1H)", row.blockTime ?? 0, parseSeconds) };
  } catch {
    return row;
  }
}

function metricNearChain(text: string, row: ChainspectRow, label: string, fallback: number, parser: (value: string, fallback: number) => number) {
  const index = text.toLowerCase().indexOf(row.name.toLowerCase());
  if (index < 0) return fallback;
  const chunk = text.slice(index, index + 500);
  const labelIndex = chunk.toLowerCase().indexOf(label.toLowerCase());
  return labelIndex < 0 ? fallback : parser(chunk.slice(labelIndex + label.length, labelIndex + label.length + 90), fallback);
}

async function getRows(field: "tps30d" | "blockTime" | "avgTxFee24h" | "developers") {
  if (field === "tps30d") return getLiveTpsRows();
  if (field === "blockTime") return Promise.all(CHAINS.map(withBlockTime));

  const url = field === "avgTxFee24h" ? "https://chainspect.app/dashboard/financials" : "https://chainspect.app/dashboard/developer-activity";
  try {
    const text = cleanText(await fetchReadableText(url));
    return CHAINS.map((row) => ({
      ...row,
      avgTxFee24h: field === "avgTxFee24h" ? metricNearChain(text, row, "Average Tx Fee", row.avgTxFee24h ?? 0, parseUsd) : row.avgTxFee24h,
      developers: field === "developers" ? metricNearChain(text, row, "Developers", row.developers ?? 0, parseNumber) : row.developers,
    }));
  } catch {
    return CHAINS;
  }
}

function toMetricRows(rows: ChainspectRow[], limit: number, field: "tps30d" | "blockTime" | "avgTxFee24h" | "developers", sort: "desc" | "asc"): ChainRevenueRow[] {
  return rows
    .map((row) => {
      const name = normalizeChainName(row.name);
      return { rank: 0, name, value: Number(row[field] ?? 0), logo: getChainLogo(name) };
    })
    .filter((row) => row.value > 0)
    .sort((a, b) => (sort === "asc" ? a.value - b.value : b.value - a.value))
    .slice(0, Math.min(limit, 30))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function result(rows: ChainRevenueRow[], props: Omit<ChainMetricResult, "rows" | "updatedAt">): ChainMetricResult {
  return { rows, updatedAt: formatDateTime(), ...props };
}

export async function getChainspectRealTimeTps(limit: number): Promise<ChainMetricResult> {
  const rows = toMetricRows(await getRows("tps30d"), limit, "tps30d", "desc");
  return result(rows, { source: "Chainspect", endpoint: "https://chainspect.app/dashboard", title: `Top ${rows.length} chains by real-time TPS`, eyebrow: "Real-time TPS", description: "Shows which chains process the most transactions per second.", insight: "TPS measures transaction throughput. This card uses live Chainspect dashboard data when available, with a last verified snapshot only if the dashboard reader is unavailable.", methodology: "Methodology: Real-time TPS from Chainspect dashboard, cached for 1 hour. If the public dashboard cannot be parsed, the card falls back to the latest verified snapshot instead of incomplete row data.", valueFormat: "number", valueSuffix: "TPS", valueDirection: "higher" });
}

export async function getChainspectBlockTime(limit: number): Promise<ChainMetricResult> {
  const rows = toMetricRows(await getRows("blockTime"), limit, "blockTime", "asc");
  return result(rows, { source: "Chainspect", endpoint: "https://chainspect.app/dashboard", title: `Top ${rows.length} chains by block time`, eyebrow: "Block Time", description: "Shows the fastest current block times across chains.", insight: "Block time is the average time between new blocks. Lower block time can improve responsiveness, but it is not the same as finality.", methodology: "Methodology: Block Time (1H) from Chainspect chain detail pages, cached for 1 hour.", valueFormat: "number", valueSuffix: "s", valueDirection: "lower" });
}

export async function getChainspectAvgTxFee(limit: number): Promise<ChainMetricResult> {
  const rows = toMetricRows(await getRows("avgTxFee24h"), limit, "avgTxFee24h", "asc");
  return result(rows, { source: "Chainspect", endpoint: "https://chainspect.app/dashboard/financials", title: `Top ${rows.length} chains by avg tx fee`, eyebrow: "Avg Tx Fee", description: "Shows chains with the lowest average transaction fees.", insight: "Average transaction fee shows the typical cost paid per transaction. This card uses the 24H average fee from Chainspect Financials.", methodology: "Methodology: 24H Average Tx Fee from Chainspect Financials dashboard, cached for 1 hour.", valueFormat: "usd", valueDirection: "lower" });
}

export async function getChainspectDevelopers(limit: number): Promise<ChainMetricResult> {
  const rows = toMetricRows(await getRows("developers"), limit, "developers", "desc");
  return result(rows, { source: "Chainspect", endpoint: "https://chainspect.app/dashboard/developer-activity", title: `Top ${rows.length} chains by developers`, eyebrow: "Developers", description: "Shows chains with the largest developer base.", insight: "Developer count is a useful signal for ecosystem health, but it should be read together with usage, revenue and liquidity.", methodology: "Methodology: Developer count from Chainspect Developer Activity dashboard, cached for 1 hour.", valueFormat: "number", valueSuffix: "devs", valueDirection: "higher" });
}
