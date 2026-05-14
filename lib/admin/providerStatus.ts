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
  mode?: string;
  checked?: number;
  alreadyApproved?: number;
  skippedAlreadyApproved?: number;
  idNeedsReview?: number;
  rateLimited?: number;
  firstErrors: string[];
  rateLimitWarnings: string[];
  autoApproved?: number;
  candidates?: number;
  skippedAdminApproved?: number;
  skippedExistingAdminApproved?: number;
  skippedVisualRejected?: number;
  skippedPreviousRejected?: number;
  fetched?: number;
  autoApprovedList?: string[];
  candidateList?: string[];
  firstSkippedReasons?: string[];
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
      mode: typeof (parsed as any).mode === "string" ? (parsed as any).mode : undefined,
      checked: Number((parsed as any).checked ?? 0),
      alreadyApproved: Number((parsed as any).alreadyApproved ?? 0),
      skippedAlreadyApproved: Number((parsed as any).skippedAlreadyApproved ?? 0),
      idNeedsReview: Number((parsed as any).idNeedsReview ?? 0),
      rateLimited: Number((parsed as any).rateLimited ?? 0),
      firstErrors: Array.isArray(parsed.firstErrors) ? parsed.firstErrors.map(String) : [],
      rateLimitWarnings: Array.isArray((parsed as any).rateLimitWarnings) ? (parsed as any).rateLimitWarnings.map(String) : [],
      autoApproved: Number((parsed as any).autoApproved ?? 0),
      candidates: Number((parsed as any).candidates ?? 0),
      skippedAdminApproved: Number((parsed as any).skippedAdminApproved ?? (parsed as any).skippedExistingAdminApproved ?? 0),
      skippedExistingAdminApproved: Number((parsed as any).skippedExistingAdminApproved ?? (parsed as any).skippedAdminApproved ?? 0),
      skippedVisualRejected: Number((parsed as any).skippedVisualRejected ?? 0),
      skippedPreviousRejected: Number((parsed as any).skippedPreviousRejected ?? 0),
      fetched: Number((parsed as any).fetched ?? parsed.refreshed ?? 0),
      autoApprovedList: Array.isArray((parsed as any).autoApprovedList) ? (parsed as any).autoApprovedList.map(String) : [],
      candidateList: Array.isArray((parsed as any).candidateList) ? (parsed as any).candidateList.map(String) : [],
      firstSkippedReasons: Array.isArray((parsed as any).firstSkippedReasons) ? (parsed as any).firstSkippedReasons.map(String) : [],
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
    {
      id: "vercel-blob",
      name: "Vercel Blob",
      status: config.hasBlob ? "connected" : "missing key",
      keyConfigured: config.hasBlob,
      metrics: ["Logo uploads", "Brand asset uploads"],
      docsUrl: "https://vercel.com/docs/storage/vercel-blob",
      notes: config.hasBlob ? "Blob uploads are enabled for raster admin assets." : "Upload buttons are disabled; manual URL fields and local logo vault imports still work.",
      nextAction: config.hasBlob ? "Use upload controls for safe PNG/JPEG/WebP assets." : "Set BLOB_READ_WRITE_TOKEN to enable uploads.",
      envVars: ["BLOB_READ_WRITE_TOKEN"],
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
