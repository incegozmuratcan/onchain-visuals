import "server-only";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import type { AdminLogo, LogoSource } from "@/lib/admin/logoDb";
import { logoManifestBySlug } from "@/lib/logos/logoRegistry";

export type LogoIssue =
  | "missing_approved_logo"
  | "needs_review"
  | "missing_coingecko_id"
  | "coingecko_fetch_failed"
  | "fallback_used"
  | "visual_rejected"
  | "approved_but_not_used"
  | "db_overlay_not_applied"
  | "rejected_source"
  | "upload_disabled"
  | "missing_cmc_id"
  | "cmc_fetch_failed";

export type LogoQaRow = {
  logo: AdminLogo;
  sources: LogoSource[];
  issues: LogoIssue[];
  coinGeckoId: string | null;
  coinMarketCapId: string | null;
  providerSummary: string;
  recommendedAction: string;
};

export type LogoQaCounts = Record<
  "all" | "approved" | "needs_review" | "missing_approved_logo" | "missing_coingecko_id" | "coingecko_fetch_failed" | "missing_cmc_id" | "cmc_fetch_failed" | "fallback_used" | "visual_rejected" | "rejected_source" | "db_overlay_not_applied",
  number
>;

function metadataObject(metadata: LogoSource["metadata"]): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return metadata && typeof metadata === "object" ? metadata : {};
}

export function getSourceMetadata(source: LogoSource) {
  return metadataObject(source.metadata);
}

function sourceHasFetchError(source: LogoSource, provider: string) {
  if (source.provider !== provider) return false;
  const metadata = metadataObject(source.metadata);
  return Boolean(metadata.fetchError || metadata.lastError || metadata.error || source.rejection_reason?.toLowerCase().includes("failed"));
}

function visualRejected(logo: AdminLogo, sources: LogoSource[]) {
  const registry = logoManifestBySlug.get(`${logo.category}:${logo.slug}`);
  if (registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset) return true;
  return sources.some((source) => Boolean(metadataObject(source.metadata).visuallyRejected));
}

export function getCoinMarketCapId(logo: AdminLogo, sources: LogoSource[] = []) {
  const direct = typeof logo.coinmarketcap_id === "string" ? logo.coinmarketcap_id.trim() : "";
  if (direct) return direct;
  for (const source of sources) {
    const metadata = metadataObject(source.metadata);
    const candidate = metadata.cmcId ?? metadata.coinMarketCapId ?? metadata.id;
    if (source.provider === "coinmarketcap" && candidate) return String(candidate);
  }
  return null;
}

export function classifyLogoQa(logo: AdminLogo, sources: LogoSource[], uploadEnabled: boolean): LogoQaRow {
  const issues: LogoIssue[] = [];
  const coinGeckoId = (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
  const coinMarketCapId = getCoinMarketCapId(logo, sources);
  const approvedSources = sources.filter((source) => source.status === "approved");
  const rejectedSources = sources.filter((source) => source.status === "rejected");
  const hasCandidate = sources.some((source) => source.status === "candidate");
  const fallbackUsed = !logo.approved_logo_url && Boolean(logo.fallback_logo_url);

  if (logo.status === "needs_review" || hasCandidate) issues.push("needs_review");
  if (!logo.approved_logo_url) issues.push("missing_approved_logo");
  if (!coinGeckoId) issues.push("missing_coingecko_id");
  if (!coinMarketCapId) issues.push("missing_cmc_id");
  if (sources.some((source) => sourceHasFetchError(source, "coingecko"))) issues.push("coingecko_fetch_failed");
  if (sources.some((source) => sourceHasFetchError(source, "coinmarketcap"))) issues.push("cmc_fetch_failed");
  if (fallbackUsed) issues.push("fallback_used");
  if (visualRejected(logo, sources)) issues.push("visual_rejected");
  if (approvedSources.length > 0 && !logo.approved_logo_url) issues.push("approved_but_not_used");
  if (logo.status === "approved" && logo.approved_logo_url && logo.visual_status === "overlay_mismatch") issues.push("db_overlay_not_applied");
  if (rejectedSources.length > 0 || logo.status === "rejected") issues.push("rejected_source");
  if (!uploadEnabled) issues.push("upload_disabled");

  const uniqueIssues = Array.from(new Set(issues));
  const providerSummary = Array.from(new Set(sources.map((source) => source.provider))).sort().join(", ") || "No candidates";

  return {
    logo,
    sources,
    issues: uniqueIssues,
    coinGeckoId: coinGeckoId || null,
    coinMarketCapId,
    providerSummary,
    recommendedAction: recommendedAction(logo, uniqueIssues, sources),
  };
}

export function recommendedAction(logo: AdminLogo, issues: LogoIssue[], sources: LogoSource[]) {
  if (issues.includes("db_overlay_not_applied")) return "Check public overlay aliases for this row";
  if (issues.includes("coingecko_fetch_failed")) {
    const errorText = sources.find((source) => source.provider === "coingecko")?.rejection_reason?.toLowerCase() ?? "";
    if (errorText.includes("429")) return "Retry later";
    if (errorText.includes("404")) return "Fix CoinGecko ID or use manual URL";
    return "Review CoinGecko error and retry";
  }
  if (issues.includes("cmc_fetch_failed")) return "Check CMC ID/key and retry";
  if (issues.includes("missing_coingecko_id")) return "Add CoinGecko ID";
  if (issues.includes("missing_cmc_id")) return "Add CoinMarketCap ID";
  if (issues.includes("visual_rejected")) return "Use fallback or upload distinct logo";
  if (issues.includes("missing_approved_logo") && sources.some((source) => source.status === "candidate")) return "Review and approve source";
  if (issues.includes("missing_approved_logo")) return "Try CoinGecko, DefiLlama, CoinMarketCap or manual URL";
  if (issues.includes("upload_disabled")) return "No action required unless file uploads are needed";
  if (issues.includes("rejected_source")) return "Replace rejected source with a safer candidate";
  if (logo.status === "approved") return "No action required";
  return "Review logo record";
}

export function summarizeLogoQa(rows: LogoQaRow[]): LogoQaCounts {
  return {
    all: rows.length,
    approved: rows.filter((row) => row.logo.status === "approved" && !row.issues.includes("missing_approved_logo")).length,
    needs_review: rows.filter((row) => row.issues.includes("needs_review")).length,
    missing_approved_logo: rows.filter((row) => row.issues.includes("missing_approved_logo")).length,
    missing_coingecko_id: rows.filter((row) => row.issues.includes("missing_coingecko_id")).length,
    coingecko_fetch_failed: rows.filter((row) => row.issues.includes("coingecko_fetch_failed")).length,
    missing_cmc_id: rows.filter((row) => row.issues.includes("missing_cmc_id")).length,
    cmc_fetch_failed: rows.filter((row) => row.issues.includes("cmc_fetch_failed")).length,
    fallback_used: rows.filter((row) => row.issues.includes("fallback_used")).length,
    visual_rejected: rows.filter((row) => row.issues.includes("visual_rejected")).length,
    rejected_source: rows.filter((row) => row.issues.includes("rejected_source")).length,
    db_overlay_not_applied: rows.filter((row) => row.issues.includes("db_overlay_not_applied")).length,
  };
}
