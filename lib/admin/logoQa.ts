import "server-only";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { sourceIsPublicCandidate, type AdminLogo, type LogoSource } from "@/lib/admin/logoDb";
import { logoManifestBySlug } from "@/lib/logos/logoRegistry";

export type LogoIssue =
  | "missing_approved_logo"
  | "needs_review"
  | "missing_coingecko_id"
  | "coingecko_id_needs_review"
  | "coingecko_rate_limited"
  | "coingecko_candidate_waiting"
  | "coingecko_auto_approved"
  | "already_approved"
  | "skipped_visual_rejected"
  | "coingecko_fetch_failed"
  | "fallback_used"
  | "visual_rejected"
  | "unsafe_migrated_candidate"
  | "approved_but_not_used"
  | "db_overlay_not_applied"
  | "rejected_source"
  | "upload_disabled"
  | "missing_cmc_id"
  | "missing_defillama_source"
  | "cmc_fetch_failed"
  | "defillama_no_reliable_source"
  | "newly_discovered_entity"
  | "metric_scan_error"
  | "auto_logo_imported"
  | "auto_approve_skipped"
  | "metric_scan_missing_coingecko_id"
  | "metric_scan_candidate_added";

export type LogoQaRow = {
  logo: AdminLogo;
  sources: LogoSource[];
  issues: LogoIssue[];
  coinGeckoId: string | null;
  coinMarketCapId: string | null;
  primarySourceLabel: string;
  coverageSummary: string;
  providerSummary: string;
  recommendedAction: string;
};

export type LogoQaCounts = Record<
  | "all"
  | "approved"
  | "needs_review"
  | "missing_approved_logo"
  | "missing_coingecko_id"
  | "coingecko_id_needs_review"
  | "coingecko_rate_limited"
  | "coingecko_candidate_waiting"
  | "coingecko_auto_approved"
  | "already_approved"
  | "skipped_visual_rejected"
  | "coingecko_fetch_failed"
  | "missing_cmc_id"
  | "missing_defillama_source"
  | "cmc_fetch_failed"
  | "defillama_no_reliable_source"
  | "fallback_used"
  | "visual_rejected"
  | "unsafe_migrated_candidate"
  | "rejected_source"
  | "db_overlay_not_applied",
  number
>;

function metadataObject(
  metadata: LogoSource["metadata"],
): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return metadata && typeof metadata === "object" ? metadata : {};
}

export function getSourceMetadata(source: LogoSource) {
  return metadataObject(source.metadata);
}

function sourceNeedsReview(source: LogoSource | undefined | null) {
  if (!source || source.status === "rejected") return false;
  const metadata = metadataObject(source.metadata);
  if (source.provider === "coingecko") return false;
  if (source.provider === "manual" || source.provider === "upload")
    return false;
  return metadata.reviewStatus !== "reviewed";
}

function sourceHasFetchError(source: LogoSource, provider: string) {
  if (source.provider !== provider) return false;
  const metadata = metadataObject(source.metadata);
  return Boolean(
    metadata.fetchError ||
    metadata.lastError ||
    metadata.error ||
    source.rejection_reason?.toLowerCase().includes("failed"),
  );
}

function visualRejected(logo: AdminLogo, sources: LogoSource[]) {
  const registry = logoManifestBySlug.get(`${logo.category}:${logo.slug}`);
  if (registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset)
    return true;
  return sources.some((source) =>
    Boolean(metadataObject(source.metadata).visuallyRejected || metadataObject(source.metadata).visualRejected),
  );
}

export function getCoinMarketCapId(
  logo: AdminLogo,
  sources: LogoSource[] = [],
) {
  const direct =
    typeof logo.coinmarketcap_id === "string"
      ? logo.coinmarketcap_id.trim()
      : "";
  if (direct) return direct;
  for (const source of sources) {
    const metadata = metadataObject(source.metadata);
    const candidate = metadata.cmcId ?? metadata.coinMarketCapId ?? metadata.id;
    if (source.provider === "coinmarketcap" && candidate)
      return String(candidate);
  }
  return null;
}

function providerCoverageStatus(sources: LogoSource[], provider: string) {
  const providerSources = sources.filter((source) => source.provider === provider);
  if (providerSources.some((source) => source.status === "approved")) return "OK";
  if (providerSources.some((source) => source.status === "candidate")) return "review";
  if (providerSources.some((source) => source.status === "rejected")) return "rejected";
  return "missing";
}

function vaultCoverageStatus(sources: LogoSource[]) {
  const vaultSources = sources.filter((source) => ["managed-vault", "vault"].includes(source.provider));
  if (vaultSources.some((source) => source.status === "approved")) return "OK";
  if (vaultSources.some((source) => source.status === "candidate")) return "review";
  if (vaultSources.some((source) => source.status === "rejected")) return "rejected";
  return "missing";
}

function sourceDisplayProvider(provider: string | null | undefined) {
  if (!provider) return "fallback";
  if (provider === "upload") return "manual/upload";
  if (provider === "vault") return "managed-vault";
  return provider;
}

function hasUsableReviewedPublicSource(logo: AdminLogo, sources: LogoSource[]) {
  return sources.some((source) => sourceIsPublicCandidate(source, logo));
}

export function classifyLogoQa(
  logo: AdminLogo,
  sources: LogoSource[],
  uploadEnabled: boolean,
): LogoQaRow {
  const issues: LogoIssue[] = [];
  const coinGeckoId =
    (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) ||
    getCoinGeckoLogoId(logo.slug);
  const coinMarketCapId = getCoinMarketCapId(logo, sources);
  const approvedSources = sources.filter(
    (source) => source.status === "approved",
  );
  const rejectedSources = sources.filter(
    (source) => source.status === "rejected",
  );
  const primarySource =
    sources.find((source) => source.id === logo.approved_source_id) ?? null;
  const hasCandidate = sources.some(
    (source) =>
      source.status === "candidate" && source.id === logo.approved_source_id,
  );
  const fallbackUsed =
    !logo.approved_logo_url && Boolean(logo.fallback_logo_url);

  if (
    (logo.status === "needs_review" && sourceNeedsReview(primarySource)) ||
    hasCandidate
  )
    issues.push("needs_review");
  if (logo.notes?.includes("newly_discovered_entity"))
    issues.push("newly_discovered_entity");
  if (logo.last_fetch_error?.includes("metric_scan_error"))
    issues.push("metric_scan_error");
  if (
    sources.some(
      (source) =>
        metadataObject(source.metadata).issueType === "auto_logo_imported",
    )
  )
    issues.push("auto_logo_imported");
  if (
    sources.some(
      (source) =>
        metadataObject(source.metadata).issueType ===
          "discovered_missing_logo" &&
        metadataObject(source.metadata).approvalOrigin === "candidate",
    )
  )
    issues.push("metric_scan_candidate_added");
  if (
    sources.some(
      (source) =>
        String(metadataObject(source.metadata).autoApproveReason || "")
          .length &&
        metadataObject(source.metadata).approvalOrigin === "candidate",
    )
  )
    issues.push("auto_approve_skipped");
  if (logo.notes?.includes("metric_scan_missing_coingecko_id"))
    issues.push("metric_scan_missing_coingecko_id");
  if (!hasUsableReviewedPublicSource(logo, sources)) issues.push("missing_approved_logo");
  if (!coinGeckoId) issues.push("missing_coingecko_id");
  const coinGeckoError = String(
    logo.last_fetch_provider === "coingecko" ? logo.last_fetch_error || "" : "",
  ).toLowerCase();
  if (
    coinGeckoError.includes("404") ||
    coinGeckoError.includes("fix coingecko id")
  )
    issues.push("coingecko_id_needs_review");
  if (
    coinGeckoError.includes("429") ||
    coinGeckoError.includes("rate limit") ||
    coinGeckoError.includes("retry later")
  )
    issues.push("coingecko_rate_limited");
  if (
    sources.some(
      (source) =>
        source.provider === "coingecko" && source.status === "candidate",
    )
  )
    issues.push("coingecko_candidate_waiting");
  if (
    sources.some(
      (source) =>
        source.provider === "coingecko" &&
        source.status === "approved" &&
        metadataObject(source.metadata).autoApproved,
    )
  )
    issues.push("coingecko_auto_approved");
  if (logo.status === "approved" && Boolean(logo.approved_logo_url))
    issues.push("already_approved");
  if (!coinMarketCapId) issues.push("missing_cmc_id");
  const defiLlamaSources = sources.filter((source) => source.provider === "defillama");
  if (!defiLlamaSources.some((source) => source.status !== "rejected"))
    issues.push("missing_defillama_source");
  if (
    defiLlamaSources.some((source) => {
      const meta = metadataObject(source.metadata);
      return Boolean(meta.noReliableSource || meta.noReliableDefiLlamaSource);
    }) ||
    (logo.last_fetch_provider === "defillama" &&
      String(logo.last_fetch_error || "").toLowerCase().includes("no reliable"))
  )
    issues.push("defillama_no_reliable_source");
  if (
    sources.some((source) => sourceHasFetchError(source, "coingecko")) ||
    (logo.last_fetch_provider === "coingecko" &&
      Boolean(logo.last_fetch_error) &&
      !issues.includes("coingecko_id_needs_review") &&
      !issues.includes("coingecko_rate_limited"))
  )
    issues.push("coingecko_fetch_failed");
  if (sources.some((source) => sourceHasFetchError(source, "coinmarketcap")))
    issues.push("cmc_fetch_failed");
  if (fallbackUsed) issues.push("fallback_used");
  if (sources.some((source) => {
    const meta = metadataObject(source.metadata);
    return source.status !== "rejected" && meta.migratedFrom === "local-static-manifest" && (meta.unsafe === true || meta.reviewStatus === "needs_review");
  }))
    issues.push("unsafe_migrated_candidate");
  if (visualRejected(logo, sources)) {
    issues.push("visual_rejected");
    issues.push("skipped_visual_rejected");
  }
  if (approvedSources.length > 0 && !logo.approved_logo_url)
    issues.push("approved_but_not_used");
  if (
    logo.status === "approved" &&
    logo.approved_logo_url &&
    logo.visual_status === "overlay_mismatch"
  )
    issues.push("db_overlay_not_applied");
  if (rejectedSources.length > 0 || logo.status === "rejected")
    issues.push("rejected_source");
  if (!uploadEnabled) issues.push("upload_disabled");

  const uniqueIssues = Array.from(new Set(issues));
  const selectedSource = sources.find((source) => source.id === logo.approved_source_id) ?? null;
  const primarySourceLabel = selectedSource && selectedSource.status !== "rejected"
    ? sourceDisplayProvider(selectedSource.provider)
    : hasUsableReviewedPublicSource(logo, sources)
      ? sourceDisplayProvider(sources.find((source) => sourceIsPublicCandidate(source, logo))?.provider)
      : "fallback";
  const coverageSummary = [
    `CG ${providerCoverageStatus(sources, "coingecko")}`,
    `CMC ${providerCoverageStatus(sources, "coinmarketcap")}`,
    `DLL ${providerCoverageStatus(sources, "defillama")}`,
    `Vault ${vaultCoverageStatus(sources)}`,
  ].join(" · ");

  const providerSummary =
    Array.from(
      new Set(
        sources
          .filter((source) => source.provider !== "local-vault")
          .map((source) => source.provider),
      ),
    )
      .sort()
      .join(", ") || "No candidates";

  return {
    logo,
    sources,
    issues: uniqueIssues,
    coinGeckoId: coinGeckoId || null,
    coinMarketCapId,
    primarySourceLabel,
    coverageSummary,
    providerSummary,
    recommendedAction: recommendedAction(logo, uniqueIssues, sources),
  };
}

export function recommendedAction(
  logo: AdminLogo,
  issues: LogoIssue[],
  sources: LogoSource[],
) {
  if (issues.includes("newly_discovered_entity"))
    return "Add mapping or approve discovered logo";
  if (issues.includes("metric_scan_error"))
    return "Review metric scanner error";
  if (issues.includes("db_overlay_not_applied"))
    return "Check public overlay aliases for this row";
  if (issues.includes("unsafe_migrated_candidate"))
    return "Review unsafe migrated vault candidate manually";
  if (issues.includes("skipped_visual_rejected"))
    return "Keep fallback or add distinct manual logo";
  if (issues.includes("coingecko_id_needs_review"))
    return "Fix CoinGecko ID or use manual URL";
  if (issues.includes("coingecko_rate_limited")) return "Retry later";
  if (issues.includes("coingecko_candidate_waiting"))
    return "Apply safe CoinGecko candidates or review manually";
  if (issues.includes("coingecko_fetch_failed")) {
    const errorText = [
      logo.last_fetch_error,
      sources.find((source) => source.provider === "coingecko")
        ?.rejection_reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (errorText.includes("429")) return "Retry later";
    if (errorText.includes("404")) return "Fix CoinGecko ID or use manual URL";
    return "Review CoinGecko error and retry";
  }
  if (issues.includes("cmc_fetch_failed")) return "Check CMC ID/key and retry";
  if (issues.includes("metric_scan_missing_coingecko_id"))
    return "Add CoinGecko ID discovered by metric scan";
  if (issues.includes("auto_approve_skipped"))
    return "Review skipped auto-approval reason";
  if (issues.includes("metric_scan_candidate_added"))
    return "Review metric scan candidate";
  if (issues.includes("missing_coingecko_id")) return "Add CoinGecko ID";
  if (issues.includes("missing_cmc_id")) return "Add CoinMarketCap ID";
  if (issues.includes("missing_defillama_source"))
    return "Resolve and review DefiLlama source";
  if (issues.includes("visual_rejected"))
    return "Use fallback or upload distinct logo";
  if (
    issues.includes("missing_approved_logo") &&
    sources.some((source) => source.status === "candidate")
  )
    return "Review and approve source";
  if (issues.includes("missing_approved_logo"))
    return "Try CoinGecko, DefiLlama, CoinMarketCap or manual URL";
  if (issues.includes("upload_disabled"))
    return "No action required unless file uploads are needed";
  if (issues.includes("rejected_source"))
    return "Replace rejected source with a safer candidate";
  if (logo.status === "approved") return "No action required";
  return "Review logo record";
}

export function summarizeLogoQa(rows: LogoQaRow[]): LogoQaCounts {
  return {
    all: rows.length,
    approved: rows.filter(
      (row) =>
        row.logo.status === "approved" &&
        !row.issues.includes("missing_approved_logo"),
    ).length,
    needs_review: rows.filter((row) => row.issues.includes("needs_review"))
      .length,
    missing_approved_logo: rows.filter((row) =>
      row.issues.includes("missing_approved_logo"),
    ).length,
    missing_coingecko_id: rows.filter((row) =>
      row.issues.includes("missing_coingecko_id"),
    ).length,
    coingecko_id_needs_review: rows.filter((row) =>
      row.issues.includes("coingecko_id_needs_review"),
    ).length,
    coingecko_rate_limited: rows.filter((row) =>
      row.issues.includes("coingecko_rate_limited"),
    ).length,
    coingecko_candidate_waiting: rows.filter((row) =>
      row.issues.includes("coingecko_candidate_waiting"),
    ).length,
    coingecko_auto_approved: rows.filter((row) =>
      row.issues.includes("coingecko_auto_approved"),
    ).length,
    already_approved: rows.filter((row) =>
      row.issues.includes("already_approved"),
    ).length,
    skipped_visual_rejected: rows.filter((row) =>
      row.issues.includes("skipped_visual_rejected"),
    ).length,
    coingecko_fetch_failed: rows.filter((row) =>
      row.issues.includes("coingecko_fetch_failed"),
    ).length,
    missing_cmc_id: rows.filter((row) => row.issues.includes("missing_cmc_id"))
      .length,
    missing_defillama_source: rows.filter((row) =>
      row.issues.includes("missing_defillama_source"),
    ).length,
    defillama_no_reliable_source: rows.filter((row) =>
      row.issues.includes("defillama_no_reliable_source"),
    ).length,
    cmc_fetch_failed: rows.filter((row) =>
      row.issues.includes("cmc_fetch_failed"),
    ).length,
    fallback_used: rows.filter((row) => row.issues.includes("fallback_used"))
      .length,
    visual_rejected: rows.filter((row) =>
      row.issues.includes("visual_rejected"),
    ).length,
    unsafe_migrated_candidate: rows.filter((row) =>
      row.issues.includes("unsafe_migrated_candidate"),
    ).length,
    rejected_source: rows.filter((row) =>
      row.issues.includes("rejected_source"),
    ).length,
    db_overlay_not_applied: rows.filter((row) =>
      row.issues.includes("db_overlay_not_applied"),
    ).length,
  };
}
