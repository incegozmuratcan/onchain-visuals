import "server-only";
import type { AdminLogo, LogoSource } from "@/lib/admin/logoDb";
import { validateDefiLlamaSourceForLogo } from "@/lib/admin/defillamaValidator";

export type ProviderCoverageState = "OK" | "REVIEW" | "NO" | "ERR";
export type CanonicalProviderKey =
  | "coingecko"
  | "coinmarketcap"
  | "defillama"
  | "managed-vault"
  | "vault"
  | "manual"
  | "upload";

export type CanonicalProviderState = {
  provider: CanonicalProviderKey | string;
  state: ProviderCoverageState;
  source: LogoSource | null;
  sources: LogoSource[];
  reason: "reviewed" | "pending" | "candidate" | "error" | "missing";
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function sourceHasRealLogoUrl(source: LogoSource) {
  const metadata = sourceMetadataObject(source.metadata);
  const imageUrl = stringValue(source.image_url);
  const blobUrl = stringValue(source.blob_url);
  const url = blobUrl || imageUrl;
  if (!url) return false;
  if (!/^(https?:\/\/|\/)/i.test(url)) return false;

  const combined = [
    url,
    imageUrl,
    stringValue(source.source_url),
    stringValue(metadata.sourceOrigin),
    stringValue(metadata.origin),
    stringValue(metadata.reason),
    stringValue(metadata.kind),
    stringValue(metadata.type),
  ]
    .join(" ")
    .toLowerCase();

  if (metadata.generatedFallback === true || metadata.placeholder === true || metadata.fallback === true) return false;
  if (metadata.isGeneratedFallback === true || metadata.generated === true || metadata.placeholderIcon === true) return false;
  if (combined.includes("/api/chain-logo/")) return false;
  if (combined.includes("generated fallback") || combined.includes("generated-fallback")) return false;
  if (combined.includes("placeholder") || combined.includes("empty icon") || combined.includes("generic icon")) return false;
  if (combined.includes("question-mark") || combined.includes("question_mark") || combined.includes("unknown-logo")) return false;
  if (combined.includes("fallback logo") || combined.includes("fallback-logo")) return false;
  return true;
}

export function sourceMetadataObject(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function providerMatches(sourceProvider: string, provider: string) {
  if (provider === "managed-vault" || provider === "vault") {
    return sourceProvider === "managed-vault" || sourceProvider === "vault";
  }
  if (provider === "manual" || provider === "upload") {
    return sourceProvider === "manual" || sourceProvider === "upload";
  }
  return sourceProvider === provider;
}



function isValidDefiLlamaSourceForLogo(source: LogoSource, logo?: Partial<Pick<AdminLogo, "slug" | "name">>) {
  return validateDefiLlamaSourceForLogo({
    logoName: logo?.name,
    logoSlug: logo?.slug,
    source,
    knownAliases: [],
  }).valid;
}

export function sourceHasInvalidState(source: LogoSource) {
  const metadata = sourceMetadataObject(source.metadata);
  const reviewStatus = String(metadata.reviewStatus || "").toLowerCase();
  const rejection = String(source.rejection_reason || "").toLowerCase();
  return Boolean(
    source.status === "rejected" ||
      metadata.fetchError ||
      metadata.lastError ||
      metadata.error ||
      metadata.invalid ||
      metadata.blocked ||
      metadata.unsafe ||
      metadata.visualRejected ||
      metadata.visuallyRejected ||
      metadata.invalidForTarget === true ||
      metadata.hidden === true ||
      metadata.superseded === true ||
      Boolean(metadata.invalidReason) ||
      reviewStatus === "rejected" ||
      reviewStatus === "unsafe" ||
      reviewStatus === "error" ||
      rejection.includes("failed") ||
      rejection.includes("invalid") ||
      rejection.includes("unsafe"),
  );
}

export function sourceIsReviewedOrAdminApproved(source: LogoSource, logo?: Partial<Pick<AdminLogo, "approved_source_id">>) {
  if (source.status !== "approved") return false;
  const metadata = sourceMetadataObject(source.metadata);
  if (sourceHasInvalidState(source)) return false;
  if (metadata.reviewStatus === "reviewed") return true;
  if (metadata.approvalOrigin === "admin" || metadata.autoApproved === true) return true;
  if (source.provider === "coingecko" && metadata.approvalOrigin === "auto") return true;
  if ((source.provider === "manual" || source.provider === "upload") && logo?.approved_source_id === source.id) return true;
  return false;
}

function sourceIsPending(source: LogoSource) {
  if (source.status === "rejected" || sourceHasInvalidState(source)) return false;
  const metadata = sourceMetadataObject(source.metadata);
  return (
    source.status === "approved" ||
    source.status === "candidate" ||
    metadata.reviewStatus === "selected_needs_review" ||
    metadata.reviewStatus === "needs_review" ||
    metadata.reviewStatus === "pending"
  );
}

function sourceRank(source: LogoSource, logo?: Partial<Pick<AdminLogo, "approved_source_id">>) {
  const metadata = sourceMetadataObject(source.metadata);
  const superseded = Boolean(metadata.supersededBy || metadata.canonical === false);
  if (sourceIsReviewedOrAdminApproved(source, logo)) return superseded ? 15 : 10;
  if (source.status === "approved" && sourceIsPending(source)) return superseded ? 25 : 20;
  if (source.status === "candidate" && sourceIsPending(source)) return superseded ? 35 : 30;
  return superseded ? 45 : 40;
}

export function resolveCanonicalProviderState(
  sources: LogoSource[],
  provider: CanonicalProviderKey | string,
  logo?: Partial<Pick<AdminLogo, "approved_source_id" | "slug" | "name">>,
): CanonicalProviderState {
  const providerSources = sources.filter((source) => providerMatches(source.provider, provider));
  const eligibleProviderSources = providerSources.filter((source) => provider !== "defillama" || isValidDefiLlamaSourceForLogo(source, logo));
  if (!providerSources.length) {
    return { provider, state: "NO", source: null, sources: [], reason: "missing" };
  }

  const realSourceRows = eligibleProviderSources.filter((source) => sourceHasRealLogoUrl(source) && !sourceHasInvalidState(source));
  if (!realSourceRows.length) {
    const errorSource = eligibleProviderSources.find(sourceHasInvalidState) ?? providerSources.find(sourceHasInvalidState) ?? null;
    return errorSource
      ? { provider, state: "ERR", source: errorSource, sources: eligibleProviderSources, reason: "error" }
      : { provider, state: "NO", source: null, sources: eligibleProviderSources, reason: "missing" };
  }

  const sorted = [...realSourceRows].sort((a, b) => {
    const rankDiff = sourceRank(a, logo) - sourceRank(b, logo);
    if (rankDiff !== 0) return rankDiff;
    const selectedDiff = Number(b.id === logo?.approved_source_id) - Number(a.id === logo?.approved_source_id);
    if (selectedDiff !== 0) return selectedDiff;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
  const source = sorted[0] ?? null;
  if (!source) return { provider, state: "NO", source: null, sources: eligibleProviderSources, reason: "missing" };
  if (sourceIsReviewedOrAdminApproved(source, logo)) {
    return { provider, state: "OK", source, sources: eligibleProviderSources, reason: "reviewed" };
  }
  if (sourceIsPending(source)) {
    return {
      provider,
      state: "REVIEW",
      source,
      sources: eligibleProviderSources,
      reason: source.status === "candidate" ? "candidate" : "pending",
    };
  }
  return { provider, state: "ERR", source, sources: eligibleProviderSources, reason: "error" };
}

export function resolveCanonicalProviderStates(
  sources: LogoSource[],
  logo?: Partial<Pick<AdminLogo, "approved_source_id" | "slug" | "name">>,
) {
  return {
    coingecko: resolveCanonicalProviderState(sources, "coingecko", logo),
    coinmarketcap: resolveCanonicalProviderState(sources, "coinmarketcap", logo),
    defillama: resolveCanonicalProviderState(sources, "defillama", logo),
    vault: resolveCanonicalProviderState(sources, "managed-vault", logo),
    manual: resolveCanonicalProviderState(sources, "manual", logo),
  };
}
