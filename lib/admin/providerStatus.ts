import "server-only";
import { getSetting } from "@/lib/admin/auth";
import { hasDatabaseConfig } from "@/lib/server/postgres";
import { encryptionAvailable, providerEnvVar, resolveApiSecret } from "@/lib/admin/apiSecrets";

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
  keySource: "admin" | "env" | "public" | "missing" | "disabled";
  maskedHint?: string | null;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastSuccessfulCheck?: string | null;
  lastError?: string | null;
  active: boolean;
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
  const summaries = await getBulkRefreshSummaries();
  const [cg, cmc, llama] = await Promise.all([resolveApiSecret("coingecko"), resolveApiSecret("coinmarketcap"), resolveApiSecret("defillama")]);
  const inactive = [
    { id: "chainspect", name: "Chainspect / TPS", envVars: ["CHAINSPECT_API_KEY", "CHAINSPECT_KEY"], metrics: ["Infrastructure TPS snapshots"], docsUrl: "https://chainspect.app/", notes: "Prepared provider. Current parser has verified snapshot fallback.", nextAction: "Optional: configure only if a stable provider API is used." },
    { id: "depin", name: "DePIN Pulse", envVars: [], metrics: ["DePIN revenue"], docsUrl: "https://depinscan.io/", notes: "Prepared/public source for supported DePIN views.", nextAction: "No key required for current public source." },
    { id: "rwa", name: "RWA/tokenized sources", envVars: [], metrics: ["BUIDL / BENJI marketcap"], docsUrl: "https://defillama.com/", notes: "Prepared source group; current supported views use public data.", nextAction: "No admin key required right now." },
    { id: "blob", name: "Vercel Blob", envVars: ["BLOB_READ_WRITE_TOKEN"], metrics: ["Admin uploads", "Brand uploads"], docsUrl: "https://vercel.com/docs/storage/vercel-blob", notes: "Storage token remains environment-managed.", nextAction: process.env.BLOB_READ_WRITE_TOKEN ? "Uploads enabled." : "Set BLOB_READ_WRITE_TOKEN to enable uploads." },
  ];

  const activeProviders: ApiProviderCard[] = [
    {
      id: "coingecko",
      name: "CoinGecko",
      status: cg.source === "disabled" ? "error" : cg.value ? "connected" : "public-no-key",
      keyConfigured: Boolean(cg.value),
      keySource: cg.source,
      maskedHint: cg.maskedHint,
      lastTestedAt: cg.record?.last_tested_at ?? null,
      lastTestStatus: cg.record?.last_test_status ?? null,
      lastSuccessfulCheck: cg.record?.last_test_status === "ok" ? cg.record.last_tested_at : summaries.coingecko && summaries.coingecko.errors === 0 ? summaries.coingecko.timestamp : null,
      lastError: cg.record?.last_error ?? summaries.coingecko?.firstErrors?.[0] ?? null,
      active: true,
      metrics: ["Admin logo candidates", "Bulk logo refresh"],
      docsUrl: "https://docs.coingecko.com/reference/introduction",
      notes: cg.value ? "Server-side key resolves from admin secret or env." : "Single fetch can use public API; bulk refresh needs a key.",
      nextAction: cg.value ? "Use Logo Manager; fix per-logo IDs where 404s appear." : "Add admin key or env fallback for bulk refresh.",
      envVars: [providerEnvVar("coingecko")],
    },
    {
      id: "coinmarketcap",
      name: "CoinMarketCap",
      status: cmc.source === "disabled" ? "error" : cmc.value ? "connected" : "missing key",
      keyConfigured: Boolean(cmc.value),
      keySource: cmc.source,
      maskedHint: cmc.maskedHint,
      lastTestedAt: cmc.record?.last_tested_at ?? null,
      lastTestStatus: cmc.record?.last_test_status ?? null,
      lastSuccessfulCheck: cmc.record?.last_test_status === "ok" ? cmc.record.last_tested_at : summaries.coinmarketcap && summaries.coinmarketcap.errors === 0 ? summaries.coinmarketcap.timestamp : null,
      lastError: cmc.record?.last_error ?? summaries.coinmarketcap?.firstErrors?.[0] ?? null,
      active: true,
      metrics: ["Admin logo candidates", "Logo QA fallback source"],
      docsUrl: "https://coinmarketcap.com/api/documentation/v1/",
      notes: cmc.value ? "Server-side key configured; public runtime never receives it." : "Disabled until an admin key or COINMARKETCAP_API_KEY exists.",
      nextAction: cmc.value ? "Use CMC only for candidates; approve only copied/stored URLs." : "Add key to enable CMC fetches.",
      envVars: [providerEnvVar("coinmarketcap")],
    },
    {
      id: "defillama",
      name: "DefiLlama",
      status: llama.value ? "connected" : "public-no-key",
      keyConfigured: Boolean(llama.value),
      keySource: llama.source,
      maskedHint: llama.maskedHint,
      lastTestedAt: llama.record?.last_tested_at ?? null,
      lastTestStatus: llama.record?.last_test_status ?? null,
      lastSuccessfulCheck: llama.record?.last_test_status === "ok" ? llama.record.last_tested_at : null,
      lastError: llama.record?.last_error ?? null,
      active: true,
      metrics: ["TVL", "Stablecoins", "Revenue", "Public icons"],
      docsUrl: "https://defillama.com/docs/api",
      notes: "Public/no-key by default; optional admin secret is reserved for future paid endpoints.",
      nextAction: "Test works without a key; add optional key only if needed later.",
      envVars: [providerEnvVar("defillama")],
    },
  ];

  return [
    ...activeProviders,
    ...inactive.map((provider) => ({
      ...provider,
      status: provider.id === "blob" && !process.env.BLOB_READ_WRITE_TOKEN ? "missing key" as ProviderStatus : "disabled" as ProviderStatus,
      keyConfigured: provider.id === "blob" ? Boolean(process.env.BLOB_READ_WRITE_TOKEN) : false,
      keySource: provider.id === "blob" && process.env.BLOB_READ_WRITE_TOKEN ? "env" as const : "disabled" as const,
      maskedHint: null,
      lastTestedAt: null,
      lastTestStatus: null,
      lastSuccessfulCheck: null,
      lastError: null,
      active: false,
    })),
  ];
}

export function adminEncryptionHealth() {
  return encryptionAvailable();
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
