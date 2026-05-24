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
const SOURCE_SAMPLE_MAX_CHARS = 2000;
const DEPIN_PULSE_CACHE_POLICY = "revalidate:300";

type ParseContext = {
  sourceUrl: string;
  fetchedAt: string;
};

type ParseDiagnostics = {
  sourceUrl: string;
  sourceLength: number;
  sample: string;
  contains: Record<string, boolean>;
  pipeLines: number;
  rankLines: number;
  parsedRows: number;
};

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function slugToDisplayName(slug: string) {
  const tokenMap: Record<string, string> = {
    io: "IO",
    ioo: "IOO",
    net: "NET",
    geodnet: "GEODNET",
  };
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => tokenMap[part.toLowerCase()] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();
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
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`DePIN Pulse request failed: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseMoney(value: string): number | null {
  const raw = value.trim();
  if (!raw || raw === "-" || /^n\/?a$/i.test(raw)) return null;
  const normalized = raw.replace(/[,$\s]/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1;
  return amount * multiplier;
}

function parseRatio(value: string): number | null {
  const raw = value.trim();
  if (!raw || raw === "-" || /^n\/?a$/i.test(raw)) return null;
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const out = Number(match[0]);
  return Number.isFinite(out) ? out : null;
}

function extractProjectSlugFromUrl(value: string) {
  const match = value.match(/https?:\/\/depinpulse\.app\/projects\/([a-z0-9-]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function cleanProjectName(value: string) {
  let cleaned = value;
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  cleaned = cleaned.replace(/\bimage\s*\d*\s*:\s*/gi, " ");
  cleaned = cleaned.replace(/\blogo\b/gi, " ");
  cleaned = cleaned.replace(/[\[\]]/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

function splitMarkdownRow(line: string) {
  const cells: string[] = [];
  let cell = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "[" && parenDepth === 0) bracketDepth += 1;
    if (ch === "]" && bracketDepth > 0 && parenDepth === 0) bracketDepth -= 1;
    if (ch === "(" && bracketDepth > 0) parenDepth += 1;
    if (ch === ")" && parenDepth > 0) parenDepth -= 1;
    if (ch === "|" && bracketDepth === 0 && parenDepth === 0) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells.filter((c, idx) => !(idx === 0 && !c) && !(idx === cells.length - 1 && !c));
}

function createDiagnostics(sourceText: string, sourceUrl: string, parsedRows: number): ParseDiagnostics {
  const lines = sourceText.split(/\r?\n/);
  return {
    sourceUrl,
    sourceLength: sourceText.length,
    sample: sourceText.slice(0, SOURCE_SAMPLE_MAX_CHARS),
    contains: {
      "DePIN Revenue Leaderboard": sourceText.includes("DePIN Revenue Leaderboard"),
      "30d": sourceText.includes("30d"),
      "Annualized": sourceText.includes("Annualized"),
      "Project": sourceText.includes("Project"),
      "Market Cap": sourceText.includes("Market Cap"),
      "Helium": sourceText.includes("Helium"),
      "IO.NET": sourceText.includes("IO.NET"),
      "Glow": sourceText.includes("Glow"),
    },
    pipeLines: lines.filter((line) => line.includes("|")).length,
    rankLines: lines.filter((line) => /^\s*\d+\b/.test(line)).length,
    parsedRows,
  };
}

function formatDiagnostics(diag: ParseDiagnostics) {
  return [
    `sourceUrl=${diag.sourceUrl}`,
    `sourceLength=${diag.sourceLength}`,
    ...Object.entries(diag.contains).map(([key, value]) => `contains${key.replace(/[^a-zA-Z0-9]/g, "") }=${value}`),
    `pipeLines=${diag.pipeLines}`,
    `rankLines=${diag.rankLines}`,
    `parsedRows=${diag.parsedRows}`,
    `sample=${JSON.stringify(diag.sample)}`,
  ].join("\n");
}

function detectHeaderIndexes(headerCells: string[]) {
  const normalized = headerCells.map((h) => h.toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim());
  const findIdx = (patterns: RegExp[]) => normalized.findIndex((h) => patterns.some((pattern) => pattern.test(h)));
  return {
    project: findIdx([/^project$/]),
    annualized30d: findIdx([/^30d annualized revenue$/, /30d arr/, /annualized revenue/]),
    revenue24h: findIdx([/^24h revenue$/]),
    marketCap: findIdx([/^market cap$/, /\bmcap\b/]),
    mcToArr: findIdx([/^mc\s*\/\s*30d arr$/, /mc\s*\/\s*(30d\s*)?arr/]),
    volume24h: findIdx([/^24h vol$/, /^24h volume$/, /\bvolume\b/]),
    chain: findIdx([/^chain$/, /\bnetwork\b/]),
  };
}

function parseLeaderboardRows(sourceText: string, context: ParseContext): DepinPulseLeaderboardRow[] {
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out: DepinPulseLeaderboardRow[] = [];
  let headerIndexes: ReturnType<typeof detectHeaderIndexes> | null = null;

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = splitMarkdownRow(line);
    if (!cells.length) continue;
    const isSeparator = cells.every((cell) => /^:?-{2,}:?$/.test(cell));
    if (isSeparator) continue;

    const looksHeader = cells.some((c) => /(project|annualized|market|chain|network|revenue|arr|vol)/i.test(c));
    if (looksHeader && (!headerIndexes || /project/i.test(cells.join(" ")))) {
      const detected = detectHeaderIndexes(cells);
      if (detected.project >= 0 && detected.annualized30d >= 0) {
        headerIndexes = detected;
        continue;
      }
    }

    if (!headerIndexes) continue;
    const idx = headerIndexes;
    const projectCell = cells[idx.project] ?? "";
    const projectSlugFromUrl = extractProjectSlugFromUrl(projectCell);
    const projectName = cleanProjectName(projectCell) || (projectSlugFromUrl ? slugToDisplayName(projectSlugFromUrl) : "");
    const annualized = parseMoney(cells[idx.annualized30d] ?? "");
    if (!projectName || !annualized || annualized <= 0) continue;

    const projectSlug = projectSlugFromUrl ?? slugify(projectName);
    const row: DepinPulseLeaderboardRow = {
      rank: out.length + 1,
      projectName,
      projectSlug,
      logoKey: mapProjectSlugToLogoKey(projectSlug),
      annualized30dRevenueUsd: annualized,
      revenue24hUsd: parseMoney(cells[idx.revenue24h] ?? "") ?? 0,
      marketCapUsd: parseMoney(cells[idx.marketCap] ?? ""),
      mcToArr: parseRatio(cells[idx.mcToArr] ?? ""),
      volume24hUsd: parseMoney(cells[idx.volume24h] ?? ""),
      chain: (cells[idx.chain] ?? "").replace(/\s+/g, " ").trim() || "Unknown",
      sourceUrl: context.sourceUrl,
      sourceUpdatedAt: null,
      fetchedAt: context.fetchedAt,
    };
    out.push(row);
  }

  return out.sort((a, b) => b.annualized30dRevenueUsd - a.annualized30dRevenueUsd).map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getDepinPulseRevenueLeaderboard(): Promise<DepinPulseLeaderboardRow[]> {
  const fetchedAt = formatDateTime();
  const sourceText = await fetchDepinPulseText();
  const rows = parseLeaderboardRows(sourceText, { fetchedAt, sourceUrl: DEPIN_PULSE_SOURCE_URL });
  if (!rows.length) {
    const diagnostics = createDiagnostics(sourceText, DEPIN_PULSE_SOURCE_URL, rows.length);
    throw new Error(`Data unavailable: DePIN Pulse leaderboard parse returned zero rows.\n${formatDiagnostics(diagnostics)}`);
  }
  return rows;
}

export function getDepinPulseParseDiagnostics(sourceText: string, sourceUrl = DEPIN_PULSE_SOURCE_URL, parsedRows = 0) {
  return createDiagnostics(sourceText, sourceUrl, parsedRows);
}

export function formatDepinPulseParseDiagnostics(diag: ParseDiagnostics) {
  return formatDiagnostics(diag);
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
  const requestedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 10;
  const rowLimit = Math.min(requestedLimit, totalRowsFromSource);
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
    title: usesTopNPolicy ? `Top ${displayedRows} of ${totalRowsFromSource} DePIN projects by ${metricLabel}` : `Top ${displayedRows} DePIN projects by ${metricLabel}`,
    eyebrow: "DePIN Revenue",
    description: is24h ? "Shows DePIN projects ranked by revenue generated in the last 24 hours." : "Shows DePIN projects ranked by annualized revenue based on the last 30 days.",
    insight: is24h ? "24H revenue shows recent demand for DePIN services, but it can be noisy and should be compared with longer-term revenue." : "30D annualized revenue estimates yearly revenue by annualizing the last 30 days of project revenue.",
    methodology: `Methodology: ${is24h ? "24H" : "30D annualized"} DePIN project revenue from DePIN Pulse leaderboard. totalRowsFromSource=${totalRowsFromSource}, displayedRows=${displayedRows}, rowLimit=${rowLimit}, requestedLimit=${requestedLimit}, cachePolicy=${DEPIN_PULSE_CACHE_POLICY}.`,
    debug: {
      sourceUrl: DEPIN_PULSE_SOURCE_URL,
      fetchedAt: sourceRows[0]?.fetchedAt ?? formatDateTime(),
      sourceUpdatedAt: sourceRows[0]?.sourceUpdatedAt ?? null,
      totalRowsFromSource,
      displayedRows,
      rowLimit,
      requestedLimit,
      cachePolicy: DEPIN_PULSE_CACHE_POLICY,
      topParsedRows: sourceRows.slice(0, 3).map((row) => ({
        rank: row.rank,
        projectName: row.projectName,
        chain: row.chain,
        annualized30dRevenueUsd: row.annualized30dRevenueUsd,
        revenue24hUsd: row.revenue24hUsd,
      })),
    },
    valueFormat: "usd",
    valueDirection: "higher",
  };
}

export const __depinPulseTestUtils = { parseLeaderboardRows, parseMoney, mapProjectSlugToLogoKey, cleanProjectName, detectHeaderIndexes };
