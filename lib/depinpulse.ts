import { formatDateTime } from "./format";
import type { ChainMetricResult, ChainRevenueRow } from "./defillama";

export type DepinPulseLeaderboardRow = {
  rank: number;
  projectName: string;
  projectSlug: string;
  logoKey: string;
  annualized30dRevenueUsd: number;
  revenue24hUsd: number;
  marketCapUsd: number | null;
  mcToArr: number | null;
  volume24hUsd: number | null;
  chain: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

const DEPIN_PULSE_SOURCE_URL = "https://depinpulse.app/";
const LEADERBOARD_ROW_LIMIT = 15;

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mapProjectSlugToLogoKey(slug: string) {
  const known: Record<string, string> = {
    "io-net": "io-net",
    ionet: "io-net",
    render: "render-network",
    "pocket-network": "pocket-network",
  };
  return known[slug] ?? slug;
}

async function fetchDepinPulseText(timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://r.jina.ai/${DEPIN_PULSE_SOURCE_URL}`, {
      headers: { accept: "text/plain,text/html,*/*", "user-agent": "Mozilla/5.0 learnDeFi" },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`DePIN Pulse request failed: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseMoney(value: string) {
  const match = value.replace(/,/g, "").match(/\$?\s*([0-9]+(?:\.[0-9]+)?)([KMB])?/i);
  if (!match) return 0;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return 0;
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
  return raw * multiplier;
}

function parseLeaderboardRows(sourceText: string, fetchedAt: string): DepinPulseLeaderboardRow[] {
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out: DepinPulseLeaderboardRow[] = [];
  for (const line of lines) {
    if (!/^\d+\s+Image:/i.test(line) || !line.includes("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const rank = Number(cells[0].match(/^(\d+)/)?.[1] ?? 0);
    const projectName = cells[0].replace(/^\d+\s+Image:\s*/i, "").replace(/logo\s*/i, "").trim();
    const projectSlug = slugify(projectName);
    const annualized30dRevenueUsd = parseMoney(cells[1]);
    const revenue24hUsd = parseMoney(cells[2]);
    const marketCapUsd = parseMoney(cells[3]) || null;
    const mcToArr = Number(cells[4].replace(/[^0-9.]/g, "")) || null;
    const volume24hUsd = parseMoney(cells[5]) || null;
    const chain = cells[6]?.replace(/\s+/g, " ").trim() ?? "";
    if (!projectName || !chain || annualized30dRevenueUsd <= 0) continue;
    out.push({
      rank: rank || out.length + 1,
      projectName,
      projectSlug,
      logoKey: mapProjectSlugToLogoKey(projectSlug),
      annualized30dRevenueUsd,
      revenue24hUsd,
      marketCapUsd,
      mcToArr,
      volume24hUsd,
      chain,
      sourceUrl: DEPIN_PULSE_SOURCE_URL,
      sourceUpdatedAt: null,
      fetchedAt,
    });
  }
  return out.sort((a, b) => b.annualized30dRevenueUsd - a.annualized30dRevenueUsd).map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getDepinPulseRevenueLeaderboard(): Promise<DepinPulseLeaderboardRow[]> {
  const fetchedAt = formatDateTime();
  const sourceText = await fetchDepinPulseText();
  const rows = parseLeaderboardRows(sourceText, fetchedAt);
  if (!rows.length) throw new Error("Data unavailable: DePIN Pulse leaderboard parse returned zero rows");
  return rows;
}

function toChainRows(rows: DepinPulseLeaderboardRow[], timeframe: "24h" | "30d", rowLimit: number): ChainRevenueRow[] {
  const ranked = [...rows]
    .sort((a, b) => (timeframe === "24h" ? b.revenue24hUsd - a.revenue24hUsd : b.annualized30dRevenueUsd - a.annualized30dRevenueUsd))
    .slice(0, rowLimit)
    .map((row, index) => ({
      rank: index + 1,
      name: row.projectName,
      chain: row.chain,
      value: timeframe === "24h" ? row.revenue24hUsd : row.annualized30dRevenueUsd,
      logo: null,
    }));
  return ranked;
}

export async function getDepinRevenue(limit: number, timeframe: "24h" | "30d"): Promise<ChainMetricResult> {
  const sourceRows = await getDepinPulseRevenueLeaderboard();
  const totalRowsFromSource = sourceRows.length;
  const rowLimit = Math.min(limit, LEADERBOARD_ROW_LIMIT);
  const rows = toChainRows(sourceRows, timeframe, rowLimit);
  const displayedRows = rows.length;
  const is24h = timeframe === "24h";
  const usesTopNPolicy = totalRowsFromSource > displayedRows;
  const metricLabel = is24h ? "24H revenue" : "30D annualized revenue";

  return {
    rows,
    source: "DePIN Pulse",
    updatedAt: `${sourceRows[0]?.sourceUpdatedAt ? `Source updated: ${sourceRows[0].sourceUpdatedAt}` : `Fetched: ${sourceRows[0]?.fetchedAt ?? formatDateTime()}`}`,
    endpoint: DEPIN_PULSE_SOURCE_URL,
    title: usesTopNPolicy ? `Top ${displayedRows} of ${totalRowsFromSource} DePIN projects by ${metricLabel}` : `Top DePIN projects by ${metricLabel}`,
    eyebrow: "DePIN Revenue",
    description: is24h ? "Shows DePIN projects ranked by revenue generated in the last 24 hours." : "Shows DePIN projects ranked by annualized revenue based on the last 30 days.",
    insight: is24h ? "24H revenue shows recent demand for DePIN services, but it can be noisy and should be compared with longer-term revenue." : "30D annualized revenue estimates yearly revenue by annualizing the last 30 days of project revenue.",
    methodology: `Methodology: ${is24h ? "24H" : "30D annualized"} DePIN project revenue from DePIN Pulse leaderboard. totalRowsFromSource=${totalRowsFromSource}, displayedRows=${displayedRows}, rowLimit=${rowLimit}.`,
    valueFormat: "usd",
    valueDirection: "higher",
  };
}

export const __depinPulseTestUtils = { parseLeaderboardRows, parseMoney, mapProjectSlugToLogoKey };
