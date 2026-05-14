import "server-only";
import { adminConfigState, getSetting } from "@/lib/admin/auth";
import { hasDatabaseConfig } from "@/lib/server/postgres";

export type ProviderStatus = "connected" | "missing key" | "disabled" | "error" | "public-no-key";

export type BulkRefreshSummary = {
  provider: string;
  timestamp: string;
  refreshed: number;
  missingMappings: number;
  errors: number;
  firstErrors: string[];
  rateLimitWarnings: string[];
};

export type ApiProviderCard = {
  id: string;
  name: string;
  status: ProviderStatus;
  keyConfigured: boolean;
  lastSuccessfulCheck?: string | null;
  lastError?: string | null;
  metrics: string[];
  docsUrl: string;
  notes: string;
  nextAction: string;
  envVars: string[];
};

export function parseBulkRefreshSummary(raw: string | null): BulkRefreshSummary | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BulkRefreshSummary>;
    if (!parsed.provider || !parsed.timestamp) return null;
    return {
      provider: parsed.provider,
      timestamp: parsed.timestamp,
      refreshed: Number(parsed.refreshed ?? 0),
      missingMappings: Number(parsed.missingMappings ?? 0),
      errors: Number(parsed.errors ?? 0),
      firstErrors: Array.isArray(parsed.firstErrors) ? parsed.firstErrors.map(String) : [],
      rateLimitWarnings: Array.isArray((parsed as any).rateLimitWarnings) ? (parsed as any).rateLimitWarnings.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function getBulkRefreshSummaries() {
  if (!hasDatabaseConfig()) {
    return { coingecko: null, coinmarketcap: null };
  }
  const [coingecko, coinmarketcap] = await Promise.all([
    getSetting("last_coingecko_bulk_refresh_summary"),
    getSetting("last_cmc_bulk_refresh_summary"),
  ]);
  return {
    coingecko: parseBulkRefreshSummary(coingecko),
    coinmarketcap: parseBulkRefreshSummary(coinmarketcap),
  };
}

export async function getApiProviderCards(): Promise<ApiProviderCard[]> {
  const config = adminConfigState();
  const summaries = await getBulkRefreshSummaries();
  const chainspectKey = Boolean(process.env.CHAINSPECT_API_KEY || process.env.CHAINSPECT_KEY);
  const coinGeckoKey = Boolean(process.env.COINGECKO_DEMO_API_KEY);
  const coinMarketCapKey = Boolean(process.env.COINMARKETCAP_API_KEY);

  return [
    {
      id: "coingecko",
      name: "CoinGecko",
      status: coinGeckoKey ? "connected" : "public-no-key",
      keyConfigured: coinGeckoKey,
      lastSuccessfulCheck: summaries.coingecko && summaries.coingecko.errors === 0 ? summaries.coingecko.timestamp : null,
      lastError: summaries.coingecko?.firstErrors?.[0] ?? null,
      metrics: ["Admin logo candidates", "Bulk logo refresh"],
      docsUrl: "https://docs.coingecko.com/reference/introduction",
      notes: coinGeckoKey ? "Server-side demo API key configured." : "Manual single fetch can use public API; bulk refresh is disabled without a key.",
      nextAction: coinGeckoKey ? "Use Logo Manager bulk refresh; fix per-logo IDs where 404s appear." : "Set COINGECKO_DEMO_API_KEY to enable safe bulk refresh.",
      envVars: ["COINGECKO_DEMO_API_KEY"],
    },
    {
      id: "coinmarketcap",
      name: "CoinMarketCap",
      status: coinMarketCapKey ? "connected" : "missing key",
      keyConfigured: coinMarketCapKey,
      lastSuccessfulCheck: summaries.coinmarketcap && summaries.coinmarketcap.errors === 0 ? summaries.coinmarketcap.timestamp : null,
      lastError: summaries.coinmarketcap?.firstErrors?.[0] ?? null,
      metrics: ["Admin logo candidates", "Logo QA fallback source"],
      docsUrl: "https://coinmarketcap.com/api/documentation/v1/",
      notes: coinMarketCapKey ? "Server-side key configured; public runtime never receives it." : "Disabled until COINMARKETCAP_API_KEY is configured.",
      nextAction: coinMarketCapKey ? "Use CMC only for candidates; approve only copied/stored URLs." : "Set COINMARKETCAP_API_KEY before running CMC fetches.",
      envVars: ["COINMARKETCAP_API_KEY"],
    },
    {
      id: "defillama",
      name: "DefiLlama",
      status: "public-no-key",
      keyConfigured: false,
      metrics: ["Revenue", "Stablecoin supply", "TVL", "Tokenized asset views", "Logo candidates"],
      docsUrl: "https://defillama.com/docs/api",
      notes: "Public no-key source. Admin records candidate URLs; public cards keep existing adapter behavior.",
      nextAction: "Use detail pages to add DefiLlama candidates; do not auto-approve confusing fallbacks.",
      envVars: [],
    },
    {
      id: "chainspect",
      name: "Chainspect / TPS provider",
      status: chainspectKey ? "connected" : "missing key",
      keyConfigured: chainspectKey,
      metrics: ["TPS", "Block time", "Avg tx fee", "Developers"],
      docsUrl: "https://chainspect.app/",
      notes: chainspectKey ? "TPS provider key is configured." : "Infrastructure metrics should use existing fallback/snapshot behavior when disabled.",
      nextAction: chainspectKey ? "Monitor TPS/block-time cards for parser errors." : "Set CHAINSPECT_API_KEY or CHAINSPECT_KEY if private/API access is needed.",
      envVars: ["CHAINSPECT_API_KEY", "CHAINSPECT_KEY"],
    },
    {
      id: "depinpulse",
      name: "DePIN Pulse",
      status: "public-no-key",
      keyConfigured: false,
      metrics: ["DePIN 24H revenue", "DePIN 30D annualized revenue"],
      docsUrl: "https://www.depinpulse.app/",
      notes: "No admin key required for current adapter.",
      nextAction: "No key action required; monitor source markup/API changes.",
      envVars: [],
    },
    {
      id: "rwa",
      name: "RWA / tokenized asset sources",
      status: config.hasDatabase ? "public-no-key" : "public-no-key",
      keyConfigured: false,
      metrics: ["BUIDL marketcap", "BENJI marketcap"],
      docsUrl: "https://defillama.com/yields/stablecoins",
      notes: "Uses existing public source adapters; no browser-exposed secret required.",
      nextAction: "No admin secret required for current tokenized asset views.",
      envVars: [],
    },
  ];
}

export function blobStatus() {
  const configured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return {
    configured,
    status: configured ? "connected" as ProviderStatus : "missing key" as ProviderStatus,
    message: configured
      ? "Vercel Blob uploads are enabled."
      : "BLOB_READ_WRITE_TOKEN is missing. URL candidates and local vault imports still work; only file uploads are disabled.",
  };
}
