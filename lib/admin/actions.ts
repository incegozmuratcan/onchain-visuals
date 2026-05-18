"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminPassword,
  createSession,
  validateAdminPassword,
  requireAdmin,
  clearSession,
  getAdminConfigDiagnostic,
} from "@/lib/admin/auth";
import {
  addLogoSource,
  approveSource,
  autoApproveSource,
  canAutoApproveCoinGecko,
  addLogoAlias,
  dismissDuplicateWarning,
  getAllLogoSources,
  getLogo,
  getLogoSource,
  getLogoSources,
  hasAdminChosenSource,
  listLogosForCoinGeckoBulk,
  rejectLogo,
  rejectSource,
  restoreSource,
  selectSourceNeedsReview,
  getSavedDefiLlamaSlug,
  saveDefiLlamaSlug,
  setAdminSetting,
  updateLogoFallback,
  updateLogoFetchState,
  updateLogoProviderId,
  updateLogoStatus,
  upsertLogo,
  upsertLogoSource,
  type AdminLogo,
  type LogoSource,
} from "@/lib/admin/logoDb";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { logoManifestBySlug } from "@/lib/logos/logoRegistry";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runMetricLogoDiscovery } from "@/lib/admin/metricLogoScanner";
import { searchCoinMarketCapIds } from "@/lib/admin/cmcSearch";
import { searchCoinGeckoIds } from "@/lib/admin/coingeckoSearch";
import { searchDefiLlamaSources } from "@/lib/admin/defillamaResolver";
import { logoSourceManifest } from "@/lib/logos/logoSourceManifest";
import {
  deleteAdminApiSecret,
  providerEnvVar,
  resolveApiSecret,
  saveAdminApiSecret,
  setAdminApiSecretTestResult,
  type ApiProviderId,
} from "@/lib/admin/apiSecrets";

async function ensureLogoFromForm(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const category =
    String(formData.get("category") || "project").trim() || "project";
  if (!name) throw new Error("Logo name is required.");
  return upsertLogo(name, category);
}

type CoinGeckoRefreshMode = "smart" | "retry-errors" | "force-all";

function adminNotice(
  path: string,
  tone: "success" | "error" | "warning",
  message: string,
): never {
  const params = new URLSearchParams({
    notice: tone,
    message: message.slice(0, 180),
  });
  redirect(`${path}?${params.toString()}`);
}

function noticeUrl(
  slug: string,
  tone: "success" | "error" | "warning",
  message: string,
) {
  const params = new URLSearchParams({
    notice: tone,
    message: message.slice(0, 180),
  });
  return `/admin/logos/${encodeURIComponent(slug)}?${params.toString()}`;
}

function redirectLogoNotice(
  slug: string,
  tone: "success" | "error" | "warning",
  message: string,
): never {
  redirect(noticeUrl(slug, tone, message));
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function expectedActionMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("429")) return `${message} Retry later / rate limited.`;
  if (message.includes("404"))
    return `${message} Fix CoinGecko ID or use manual URL.`;
  if (message.includes("401") || message.includes("403"))
    return `${message} Check provider API key.`;
  if (message.toLowerCase().includes("blob_read_write_token"))
    return "Blob token missing; upload is disabled until storage is configured.";
  return message;
}
type ProviderErrorKind = "idNeedsReview" | "rateLimited" | "apiKey" | "error";
type CoinGeckoRefreshCounts = {
  checked: number;
  fetched: number;
  autoApproved: number;
  alreadyApproved: number;
  candidates: number;
  skippedExistingAdminApproved: number;
  skippedAlreadyApproved: number;
  skippedVisualRejected: number;
  skippedPreviousRejected: number;
  missingMappings: number;
  idNeedsReview: number;
  rateLimited: number;
  errors: number;
};

function emptyCoinGeckoCounts(): CoinGeckoRefreshCounts {
  return {
    checked: 0,
    fetched: 0,
    autoApproved: 0,
    alreadyApproved: 0,
    candidates: 0,
    skippedExistingAdminApproved: 0,
    skippedAlreadyApproved: 0,
    skippedVisualRejected: 0,
    skippedPreviousRejected: 0,
    missingMappings: 0,
    idNeedsReview: 0,
    rateLimited: 0,
    errors: 0,
  };
}

function bulkSummary(
  provider: string,
  refreshed: number,
  missingMappings: number,
  errors: string[],
  extra: Record<string, unknown> = {},
) {
  const rateLimitWarnings = errors.filter(
    (error) =>
      error.includes("429") || error.toLowerCase().includes("rate limit"),
  );
  return JSON.stringify({
    provider,
    timestamp: new Date().toISOString(),
    refreshed,
    missingMappings,
    errors: errors.length,
    firstErrors: errors.slice(0, 5),
    rateLimitWarnings: rateLimitWarnings.slice(0, 5),
    ...extra,
  });
}

function classifyProviderError(error: unknown): {
  message: string;
  kind: ProviderErrorKind;
} {
  const message =
    error instanceof Error ? error.message : "Unknown provider error";
  if (message.includes("429"))
    return { message: `${message} — Retry later.`, kind: "rateLimited" };
  if (message.includes("404"))
    return {
      message: `${message} — Fix CoinGecko ID or use manual URL.`,
      kind: "idNeedsReview",
    };
  if (message.includes("401") || message.includes("403"))
    return { message: `${message} — Check API key.`, kind: "apiKey" };
  if (
    message.toLowerCase().includes("fetch failed") ||
    message.toLowerCase().includes("network")
  )
    return { message: `${message} — Provider/network error.`, kind: "error" };
  return { message, kind: "error" };
}

function explainProviderError(provider: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : `Unknown ${provider} error`;
  if (message.includes("429")) return `${message} — Retry later.`;
  if (message.includes("404"))
    return `${message} — Fix ${provider} ID or use manual URL.`;
  if (message.includes("401") || message.includes("403"))
    return `${message} — Check API key.`;
  if (
    message.toLowerCase().includes("fetch failed") ||
    message.toLowerCase().includes("network")
  )
    return `${message} — Provider/network error.`;
  return message;
}

export async function setupAdminAction(formData: FormData) {
  const diagnostic = await getAdminConfigDiagnostic();
  if (!diagnostic.hasDatabaseConfig)
    throw new Error(
      "DATABASE_URL is missing. Configure Postgres before setup.",
    );
  if (!diagnostic.canReadAdminSettings)
    throw new Error(
      "Admin configuration could not be read. Check server logs before setup.",
    );
  if (diagnostic.hasAdminPasswordHash)
    throw new Error("Admin is already configured. Use /admin/login.");

  const token = String(formData.get("setupToken") || "");
  if (process.env.ADMIN_SETUP_TOKEN && token !== process.env.ADMIN_SETUP_TOKEN)
    throw new Error("Invalid setup token.");
  const password = String(formData.get("password") || "");
  if (password.length < 10)
    throw new Error("Use an admin password with at least 10 characters.");
  await createAdminPassword(password);
  createSession();
  redirect("/admin");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!(await validateAdminPassword(password)))
    throw new Error("Invalid admin password.");
  createSession();
  redirect("/admin");
}

export async function logoutAction() {
  clearSession();
  redirect("/admin/login");
}

export async function createLogoAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  revalidatePath("/admin/logos");
  redirect(`/admin/logos/${logo.slug}`);
}

export async function addManualUrlAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  if (!/^https:\/\//.test(imageUrl))
    redirectLogoNotice(
      logo.slug,
      "error",
      "Manual logo URL must be a valid HTTPS URL.",
    );
  await addLogoSource({
    logoId: logo.id,
    provider: "manual",
    imageUrl,
    sourceUrl: imageUrl,
    metadata: { submittedBy: "admin" },
  });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirectLogoNotice(logo.slug, "success", "Manual URL candidate added.");
}

export async function addDefiLlamaAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const slug = String(formData.get("providerSlug") || logo.slug).trim();
  if (!slug)
    redirectLogoNotice(logo.slug, "error", "Add a DefiLlama slug first.");
  const found = await searchDefiLlamaSources(slug, {
    targetName: logo.name,
    targetSlug: logo.slug,
    category: logo.category,
  });
  const candidate = found.candidates.find((row) => row.slug === slug && row.confidence === "high" && row.recommended) ?? found.candidates.find((row) => row.confidence === "high" && row.recommended) ?? null;
  if (!candidate)
    redirectLogoNotice(logo.slug, "warning", found.error || "No reliable DefiLlama source found.");
  await saveDefiLlamaSlug(logo.slug, candidate.slug);
  const created = await upsertLogoSource({
    logoId: logo.id,
    provider: "defillama",
    imageUrl: candidate.imageUrl,
    sourceUrl: candidate.sourceUrl,
    metadata: { slug: candidate.slug, resolver: true, confidence: candidate.confidence, score: candidate.score, reviewStatus: "selected_needs_review", resolverDebug: candidate.debug },
    status: "candidate",
    reviveRejected: true,
  });
  const sources = (await getLogoSources(logo.id)).rows;
  if (!logo.approved_logo_url && logo.visual_status !== "rejected") {
    await selectSourceNeedsReview(created.id, "DefiLlama resolver selected source; admin review required");
  }
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirectLogoNotice(logo.slug, "success", sources.some((source) => source.provider === "coingecko" && source.status === "approved") ? "DefiLlama source added as backup." : "DefiLlama source fetched and selected pending review.");
}

async function coinGeckoHeaders(requireKey = false) {
  const resolved = await resolveApiSecret("coingecko");
  if (requireKey && !resolved.value)
    throw new Error(
      "CoinGecko API key is missing. Add an admin-managed key or COINGECKO_DEMO_API_KEY before bulk refreshing logos.",
    );
  return {
    accept: "application/json",
    ...(resolved.value ? { "x-cg-demo-api-key": resolved.value } : {}),
  };
}

async function fetchCoinGeckoLogoSource(coinId: string, requireKey = false) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
    { headers: await coinGeckoHeaders(requireKey) },
  );
  if (!response.ok)
    throw new Error(
      `CoinGecko lookup for ${coinId} failed (${response.status}).`,
    );
  const json = await response.json();
  const imageUrl =
    json.image?.large || json.image?.small || json.image?.thumb || "";
  if (!imageUrl)
    throw new Error(`CoinGecko did not return an image URL for ${coinId}.`);
  return {
    imageUrl,
    sourceUrl: `https://www.coingecko.com/en/coins/${coinId}`,
    metadata: {
      coinId,
      symbol: json.symbol,
      name: json.name,
      image: {
        large: json.image?.large ?? null,
        small: json.image?.small ?? null,
        thumb: json.image?.thumb ?? null,
      },
    },
  };
}

export async function addCoinGeckoAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const coinId = String(formData.get("coinGeckoId") || "").trim();
  if (!coinId)
    redirectLogoNotice(logo.slug, "warning", "Add CoinGecko ID first.");
  try {
    const source = await fetchCoinGeckoLogoSource(coinId);
    const sources = (await getAllLogoSources()).rows.filter(
      (row) => row.logo_id === logo.id,
    );
    const auto = canAutoApproveCoinGecko(
      logo,
      sources,
      source.imageUrl,
      source.sourceUrl,
    );
    const created = await upsertLogoSource({
      logoId: logo.id,
      provider: "coingecko",
      ...source,
      metadata: {
        ...source.metadata,
        approvalOrigin: auto.ok ? "auto" : "candidate",
        autoApproveReason: auto.reason,
      },
      status: auto.ok ? "approved" : "candidate",
      reviveRejected: true,
    });
    let vaultMessage = "";
    if (auto.ok) {
      await autoApproveSource(created.id, auto.reason);
      vaultMessage = await autoCopyPrimaryToVault(logo, created, "trusted-primary");
    }
    await updateLogoProviderId(logo.slug, "coingecko", coinId);
    await updateLogoFetchState(logo.slug, "coingecko", null);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(
      logo.slug,
      "success",
      auto.ok
        ? `CoinGecko logo fetched and approved. ${vaultMessage}`
        : "CoinGecko candidate fetched for review.",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = expectedActionMessage(error, "CoinGecko fetch failed.");
    await updateLogoFetchState(logo.slug, "coingecko", message);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(logo.slug, "error", message);
  }
}

function isLogoVisuallyRejected(slug: string, category: string) {
  const registry = logoManifestBySlug.get(`${category}:${slug}`);
  return Boolean(
    registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset,
  );
}

function parseCoinGeckoRefreshMode(formData?: FormData): CoinGeckoRefreshMode {
  const raw = String(formData?.get("mode") || "smart");
  return raw === "retry-errors" || raw === "force-all" ? raw : "smart";
}

function isBsvLikeLogo(slug: string, coinId?: string | null) {
  return [slug, coinId ?? ""].some((value) =>
    ["bsv", "bitcoin-sv", "bsv-blockchain"].includes(
      String(value).trim().toLowerCase(),
    ),
  );
}

function isCoinGeckoSource(source: LogoSource) {
  return source.provider === "coingecko";
}

function sourceMetadata(source: LogoSource) {
  if (typeof source.metadata === "string") {
    try {
      const parsed = JSON.parse(source.metadata);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return source.metadata && typeof source.metadata === "object"
    ? source.metadata
    : {};
}

function sourceIsAdminApproved(source?: LogoSource | null) {
  if (!source) return false;
  const meta = sourceMetadata(source);
  return (
    source.status === "approved" &&
    (source.provider === "manual" ||
      source.provider === "upload" ||
      meta.approvalOrigin === "admin")
  );
}

function hasApprovedCoinGeckoSource(logo: AdminLogo, sources: LogoSource[]) {
  return sources.some(
    (source) =>
      isCoinGeckoSource(source) &&
      source.status === "approved" &&
      logo.approved_source_id === source.id &&
      Boolean(logo.approved_logo_url),
  );
}

function hasCoinGeckoCandidate(sources: LogoSource[]) {
  return sources.some(
    (source) => isCoinGeckoSource(source) && source.status === "candidate",
  );
}

function isStaleFetch(logo: AdminLogo) {
  if (!logo.last_fetch_at) return true;
  const fetchedAt = new Date(logo.last_fetch_at).getTime();
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt > 1000 * 60 * 60 * 24 * 30;
}

function isCoinGeckoIdReviewError(error?: string | null) {
  return Boolean(
    error &&
    (error.includes("404") || error.toLowerCase().includes("fix coingecko id")),
  );
}

function shouldRefreshCoinGeckoLogo(
  mode: CoinGeckoRefreshMode,
  logo: AdminLogo,
  sources: LogoSource[],
) {
  if (
    sourceIsAdminApproved(
      sources.find((source) => logo.approved_source_id === source.id),
    ) ||
    sources.some(sourceIsAdminApproved)
  )
    return { ok: false, reason: "admin-approved source exists" };
  if (mode === "force-all") return { ok: true, reason: "force-all" };
  if (mode === "retry-errors")
    return {
      ok:
        logo.last_fetch_provider === "coingecko" &&
        Boolean(logo.last_fetch_error),
      reason: "retry-errors",
    };
  if (hasApprovedCoinGeckoSource(logo, sources) && !logo.last_fetch_error)
    return { ok: false, reason: "already approved" };
  if (isCoinGeckoIdReviewError(logo.last_fetch_error))
    return { ok: false, reason: "coingecko id needs review" };
  if (!logo.approved_logo_url)
    return { ok: true, reason: "missing approved logo" };
  if (logo.status === "needs_review")
    return { ok: true, reason: "needs review" };
  if (!sources.some(isCoinGeckoSource))
    return { ok: true, reason: "missing CoinGecko source" };
  if (logo.last_fetch_provider === "coingecko" && logo.last_fetch_error)
    return { ok: true, reason: "previous fetch error" };
  if (hasCoinGeckoCandidate(sources))
    return { ok: true, reason: "candidate waiting" };
  if (isStaleFetch(logo) && !hasApprovedCoinGeckoSource(logo, sources))
    return { ok: true, reason: "stale fetch" };
  return { ok: false, reason: "not needed" };
}

async function approveCoinGeckoSourceIfSafe(sourceId: string, reason: string) {
  const approved = await autoApproveSource(sourceId, reason);
  return Boolean(
    approved?.source_id === sourceId && approved.approved_logo_url,
  );
}

export async function bulkRefreshCoinGeckoLogosAction(formData?: FormData) {
  await requireAdmin();
  const mode = parseCoinGeckoRefreshMode(formData);
  const counts = emptyCoinGeckoCounts();
  if (!(await resolveApiSecret("coingecko")).value) {
    const errors = [
      "CoinGecko API key is missing. Add it from API Settings or COINGECKO_DEMO_API_KEY before bulk refreshing logos.",
    ];
    await setAdminSetting(
      "last_coingecko_bulk_refresh_summary",
      bulkSummary("CoinGecko", 0, 0, errors, {
        mode,
        ...counts,
        errors: errors.length,
      }),
    );
    revalidatePath("/admin");
    revalidatePath("/admin/logos");
    redirect("/admin/logos?provider=coingecko&errors=1");
  }
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  const errors: string[] = [];
  const autoApprovedList: string[] = [];
  const alreadyApprovedList: string[] = [];
  const candidateList: string[] = [];
  const skippedReasons: string[] = [];
  const allSources = (await getAllLogoSources()).rows;
  const sourcesByLogo = new Map<string, LogoSource[]>();
  for (const source of allSources)
    sourcesByLogo.set(source.logo_id, [
      ...(sourcesByLogo.get(source.logo_id) ?? []),
      source,
    ]);

  for (const logo of logos) {
    counts.checked += 1;
    const existingSources = sourcesByLogo.get(logo.id) ?? [];
    const coinId =
      (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) ||
      getCoinGeckoLogoId(logo.slug);
    if (!coinId) {
      counts.missingMappings += 1;
      continue;
    }
    if (
      isBsvLikeLogo(logo.slug, coinId) ||
      isLogoVisuallyRejected(logo.slug, logo.category) ||
      logo.visual_status === "rejected"
    ) {
      counts.skippedVisualRejected += 1;
      skippedReasons.push(
        `${logo.slug}: Keep fallback or add distinct manual logo`,
      );
      if (isBsvLikeLogo(logo.slug, coinId))
        await updateLogoFetchState(
          logo.slug,
          "coingecko",
          "Skipped visual_rejected: BSV/CoinGecko logo is BTC-confusing — Keep fallback or add distinct manual logo.",
        );
      continue;
    }
    const refresh = shouldRefreshCoinGeckoLogo(mode, logo, existingSources);
    if (!refresh.ok) {
      if (refresh.reason === "admin-approved source exists")
        counts.skippedExistingAdminApproved += 1;
      else if (refresh.reason === "already approved") {
        counts.skippedAlreadyApproved += 1;
        counts.alreadyApproved += 1;
        alreadyApprovedList.push(`${logo.slug} (${coinId})`);
      } else if (refresh.reason === "coingecko id needs review")
        counts.idNeedsReview += 1;
      skippedReasons.push(`${logo.slug}: ${refresh.reason}`);
      continue;
    }

    try {
      const source = await fetchCoinGeckoLogoSource(coinId, true);
      counts.fetched += 1;
      const auto = canAutoApproveCoinGecko(
        logo,
        existingSources,
        source.imageUrl,
        source.sourceUrl,
      );
      const created = await upsertLogoSource({
        logoId: logo.id,
        provider: "coingecko",
        ...source,
        metadata: {
          ...source.metadata,
          bulkRefresh: true,
          refreshMode: mode,
          refreshReason: refresh.reason,
          visuallyRejected: false,
          approvalOrigin: auto.ok ? "auto" : "candidate",
          autoApproved: auto.ok,
          autoApproveReason: auto.reason,
        },
        status: auto.ok ? "approved" : "candidate",
        reviveRejected: true,
      });
      if (
        created.status === "approved" &&
        logo.approved_source_id === created.id &&
        logo.approved_logo_url
      ) {
        counts.alreadyApproved += 1;
        alreadyApprovedList.push(`${logo.slug} (${coinId})`);
      } else if (auto.ok) {
        const approved = await approveCoinGeckoSourceIfSafe(
          created.id,
          auto.reason,
        );
        if (approved) {
          counts.autoApproved += 1;
          autoApprovedList.push(`${logo.slug} (${coinId})`);
          const vaultMessage = await autoCopyPrimaryToVault(logo, created, "trusted-primary");
          if (vaultMessage.includes("copy created")) autoApprovedList.push(`${logo.slug}: vault backup created`);
        } else {
          counts.errors += 1;
          errors.push(
            `${logo.slug}: auto-approve DB update did not select source ${created.id}`,
          );
        }
      } else if (auto.reason.includes("admin-approved")) {
        counts.skippedExistingAdminApproved += 1;
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (auto.reason.includes("previously rejected")) {
        counts.skippedPreviousRejected += 1;
        counts.candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (
        auto.reason.includes("visual") ||
        auto.reason.includes("BSV")
      ) {
        counts.skippedVisualRejected += 1;
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else {
        counts.candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      }
      await updateLogoFetchState(logo.slug, "coingecko", null);
    } catch (error) {
      const classified = classifyProviderError(error);
      if (classified.kind === "idNeedsReview") counts.idNeedsReview += 1;
      else if (classified.kind === "rateLimited") counts.rateLimited += 1;
      else counts.errors += 1;
      errors.push(`${logo.slug}: ${classified.message}`);
      await updateLogoFetchState(logo.slug, "coingecko", classified.message);
    }
  }

  if (errors.length) {
    console.warn(
      "Bulk CoinGecko logo refresh completed with partial failures",
      { mode, ...counts, firstErrors: errors.slice(0, 5) },
    );
  }

  await setAdminSetting(
    "last_coingecko_bulk_refresh_summary",
    bulkSummary("CoinGecko", counts.fetched, counts.missingMappings, errors, {
      mode,
      ...counts,
      firstErrors: errors.slice(0, 5),
      rateLimitWarnings: errors
        .filter(
          (error) =>
            error.includes("429") || error.toLowerCase().includes("rate limit"),
        )
        .slice(0, 5),
      autoApprovedList: autoApprovedList.slice(0, 25),
      alreadyApprovedList: alreadyApprovedList.slice(0, 25),
      candidateList: candidateList.slice(0, 25),
      firstSkippedReasons: skippedReasons.slice(0, 10),
    }),
  );
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  const params = new URLSearchParams({
    provider: "coingecko",
    mode,
    fetched: String(counts.fetched),
    checked: String(counts.checked),
    missing: String(counts.missingMappings),
    errors: String(counts.errors),
    autoApproved: String(counts.autoApproved),
    candidates: String(counts.candidates),
    idNeedsReview: String(counts.idNeedsReview),
    rateLimited: String(counts.rateLimited),
  });
  for (const message of errors.slice(0, 3)) params.append("error", message);
  redirect(`/admin/logos?${params.toString()}`);
}

export async function applySafeCoinGeckoCandidatesAction() {
  await requireAdmin();
  const counts = { checkedCandidates: 0, autoApproved: 0, skipped: 0 };
  const skippedReasons: string[] = [];
  const allSources = (await getAllLogoSources()).rows;
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  const logosById = new Map(logos.map((logo) => [logo.id, logo]));
  const sourcesByLogo = new Map<string, LogoSource[]>();
  for (const source of allSources)
    sourcesByLogo.set(source.logo_id, [
      ...(sourcesByLogo.get(source.logo_id) ?? []),
      source,
    ]);

  for (const source of allSources.filter(
    (row) => row.provider === "coingecko" && row.status === "candidate",
  )) {
    counts.checkedCandidates += 1;
    const logo = logosById.get(source.logo_id);
    const sources = sourcesByLogo.get(source.logo_id) ?? [];
    if (!logo) {
      counts.skipped += 1;
      skippedReasons.push(`${source.id}: logo missing or rejected`);
      continue;
    }
    const coinId =
      (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) ||
      getCoinGeckoLogoId(logo.slug);
    if (
      isBsvLikeLogo(logo.slug, coinId) ||
      isLogoVisuallyRejected(logo.slug, logo.category) ||
      logo.visual_status === "rejected"
    ) {
      counts.skipped += 1;
      skippedReasons.push(
        `${logo.slug}: Keep fallback or add distinct manual logo`,
      );
      continue;
    }
    const auto = canAutoApproveCoinGecko(
      logo,
      sources,
      source.image_url,
      source.source_url,
    );
    if (!auto.ok) {
      counts.skipped += 1;
      skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      continue;
    }
    const approved = await approveCoinGeckoSourceIfSafe(source.id, auto.reason);
    if (approved) {
      counts.autoApproved += 1;
      await autoCopyPrimaryToVault(logo, source, "trusted-primary");
    } else {
      counts.skipped += 1;
      skippedReasons.push(
        `${logo.slug}: auto-approve DB update did not select source ${source.id}`,
      );
    }
  }

  await setAdminSetting(
    "last_coingecko_candidate_apply_summary",
    JSON.stringify({
      provider: "CoinGecko",
      timestamp: new Date().toISOString(),
      ...counts,
      firstSkippedReasons: skippedReasons.slice(0, 15),
    }),
  );
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  redirect(
    `/admin/logos?candidateApply=1&checkedCandidates=${counts.checkedCandidates}&autoApproved=${counts.autoApproved}&skipped=${counts.skipped}`,
  );
}

function isNumericCoinMarketCapId(value: string) {
  return /^\d+$/.test(value.trim());
}

function latestUsableSource(sources: LogoSource[], provider: string) {
  return (
    sources.find(
      (source) => source.provider === provider && source.status !== "rejected",
    ) ?? null
  );
}

async function chooseBestDiscoveredPrimary(
  logo: AdminLogo,
  sources: LogoSource[],
  summary: string[],
) {
  if (hasAdminChosenSource(sources)) {
    summary.push("Primary: skipped protected admin manual/upload choice");
    return;
  }
  const cg = latestUsableSource(sources, "coingecko");
  if (
    cg &&
    canAutoApproveCoinGecko(logo, sources, cg.image_url, cg.source_url).ok
  ) {
    await autoApproveSource(cg.id, "safe CoinGecko primary source");
    summary.push("Primary: CoinGecko selected and trusted");
    summary.push(await autoCopyPrimaryToVault(logo, cg, "trusted-primary"));
    return;
  }
  const fallback =
    latestUsableSource(sources, "managed-vault") ??
    latestUsableSource(sources, "vault") ??
    latestUsableSource(sources, "coinmarketcap") ??
    latestUsableSource(sources, "defillama");
  if (fallback && logo.visual_status !== "rejected") {
    await selectSourceNeedsReview(
      fallback.id,
      `${fallback.provider} selected by discovery; admin review required`,
    );
    summary.push(`Primary: ${fallback.provider} selected (needs review)`);
  }
}

async function discoverLogoSources(
  logo: AdminLogo,
  options: { force?: boolean; backupVault?: boolean } = {},
) {
  const summary: string[] = [];
  const before = (await getAllLogoSources()).rows.filter(
    (row) => row.logo_id === logo.id,
  );
  const protectedAdmin = hasAdminChosenSource(before);

  let coinId =
    (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) ||
    getCoinGeckoLogoId(logo.slug);
  if (!coinId) {
    const found = await searchCoinGeckoIds(logo.name, { targetName: logo.name, targetSlug: logo.slug });
    const recommended = found.candidates.find((candidate) => candidate.recommended && candidate.confidence === "high");
    if (recommended) {
      coinId = recommended.id;
      await updateLogoProviderId(logo.slug, "coingecko", coinId);
      summary.push(`CoinGecko: auto-resolved ID ${coinId}`);
    }
  }
  if (coinId) {
    try {
      const source = await fetchCoinGeckoLogoSource(coinId);
      const auto = canAutoApproveCoinGecko(
        logo,
        before,
        source.imageUrl,
        source.sourceUrl,
      );
      const created = await upsertLogoSource({
        logoId: logo.id,
        provider: "coingecko",
        ...source,
        metadata: {
          ...source.metadata,
          discovery: true,
          approvalOrigin: auto.ok ? "auto" : "candidate",
          autoApproveReason: auto.reason,
        },
        status: auto.ok ? "approved" : "candidate",
        reviveRejected: true,
      });
      await updateLogoProviderId(logo.slug, "coingecko", coinId);
      await updateLogoFetchState(logo.slug, "coingecko", null);
      if (auto.ok && !protectedAdmin) {
        await autoApproveSource(created.id, auto.reason);
        summary.push(await autoCopyPrimaryToVault(logo, created, "trusted-primary"));
      }
      summary.push(
        auto.ok && !protectedAdmin
          ? "CoinGecko: fetched / selected primary"
          : `CoinGecko: fetched / ${auto.reason}`,
      );
    } catch (error) {
      const message = expectedActionMessage(error, "CoinGecko fetch failed.");
      await updateLogoFetchState(logo.slug, "coingecko", message);
      summary.push(`CoinGecko: failed (${message})`);
    }
  } else {
    summary.push("CoinGecko: missing ID");
  }

  const cmcId =
    typeof logo.coinmarketcap_id === "string"
      ? logo.coinmarketcap_id.trim()
      : "";
  if (cmcId && isNumericCoinMarketCapId(cmcId)) {
    try {
      const source = await fetchCoinMarketCapLogoSource(cmcId);
      await upsertLogoSource({
        logoId: logo.id,
        provider: "coinmarketcap",
        ...source,
        metadata: {
          ...source.metadata,
          discovery: true,
          reviewStatus: "selected_needs_review",
        },
        status: "candidate",
      });
      await updateLogoFetchState(logo.slug, "coinmarketcap", null);
      summary.push("CoinMarketCap: fetched / review-needed backup");
    } catch (error) {
      const message = expectedActionMessage(
        error,
        "CoinMarketCap fetch failed.",
      );
      await updateLogoFetchState(logo.slug, "coinmarketcap", message);
      summary.push(`CoinMarketCap: failed (${message})`);
    }
  } else if (cmcId) {
    await updateLogoFetchState(
      logo.slug,
      "coinmarketcap",
      "CMC ID must be numeric; use Find CMC ID.",
    );
    summary.push("CoinMarketCap: ID review (numeric ID required)");
  } else if ((await resolveApiSecret("coinmarketcap")).value) {
    const found = await searchCoinMarketCapIds(logo.name, { targetName: logo.name, targetSlug: logo.slug });
    const recommended = found.candidates.find((candidate) => candidate.recommended && candidate.confidence === "high" && /^\d+$/.test(candidate.id));
    if (recommended) {
      await updateLogoProviderId(logo.slug, "coinmarketcap", recommended.id);
      try {
        const source = await fetchCoinMarketCapLogoSource(recommended.id);
        await upsertLogoSource({
          logoId: logo.id,
          provider: "coinmarketcap",
          ...source,
          metadata: { ...source.metadata, discovery: true, autoResolved: true, confidence: recommended.confidence, reviewStatus: "selected_needs_review" },
          status: "candidate",
          reviveRejected: true,
        });
        await updateLogoFetchState(logo.slug, "coinmarketcap", null);
        summary.push(`CoinMarketCap: auto-resolved ID ${recommended.id} / fetched`);
      } catch (error) {
        const message = expectedActionMessage(error, "CoinMarketCap fetch failed.");
        await updateLogoFetchState(logo.slug, "coinmarketcap", message);
        summary.push(`CoinMarketCap: auto-resolved but failed (${message})`);
      }
    } else {
      summary.push(
        found.candidates.length
          ? `CoinMarketCap: needs ID (${found.candidates.length} candidates found)`
          : `CoinMarketCap: needs ID${found.error ? ` (${found.error})` : ""}`,
      );
    }
  } else {
    summary.push("CoinMarketCap: API key missing");
  }

  try {
    const savedDefiLlamaSlug = await getSavedDefiLlamaSlug(logo.slug);
    const found = await searchDefiLlamaSources(savedDefiLlamaSlug || logo.name, { targetName: logo.name, targetSlug: logo.slug, category: logo.category, aliases: savedDefiLlamaSlug ? [savedDefiLlamaSlug] : [] });
    const recommended = found.candidates.find((candidate) => candidate.recommended && candidate.confidence === "high");
    if (!recommended) {
      await updateLogoFetchState(
        logo.slug,
        "defillama",
        found.error || "No reliable DefiLlama source found.",
      );
      summary.push(found.error ? `DefiLlama: failed (${found.error})` : "DefiLlama: no source found");
    } else {
      const created = await upsertLogoSource({
        logoId: logo.id,
        provider: "defillama",
        imageUrl: recommended.imageUrl,
        sourceUrl: recommended.sourceUrl,
        metadata: {
          slug: recommended.slug,
          discovery: true,
          resolver: true,
          confidence: recommended.confidence,
          score: recommended.score,
          reviewStatus: "selected_needs_review",
          resolverDebug: recommended.debug,
        },
        status: "candidate",
        reviveRejected: true,
      });
      await saveDefiLlamaSlug(logo.slug, recommended.slug);
      await updateLogoFetchState(logo.slug, "defillama", null);
      summary.push(
        created.status === "rejected"
          ? "DefiLlama: rejected / skipped"
          : `DefiLlama: auto-resolved ${recommended.slug} / fetched`,
      );
    }
  } catch (error) {
    summary.push(
      `DefiLlama: failed (${expectedActionMessage(error, "DefiLlama fetch failed.")})`,
    );
  }

  const after = (await getAllLogoSources()).rows.filter(
    (row) => row.logo_id === logo.id,
  );
  await chooseBestDiscoveredPrimary(logo, after, summary);
  if (options.backupVault) {
    const primary =
      after.find((source) => source.id === logo.approved_source_id) ??
      after.find((source) => source.status === "approved");
    if (primary) summary.push(await copySourceToVault(logo, primary));
  }
  return summary;
}

async function coinMarketCapHeaders() {
  const resolved = await resolveApiSecret("coinmarketcap");
  if (!resolved.value)
    throw new Error(
      "CoinMarketCap API key is missing. Add it from API Settings or COINMARKETCAP_API_KEY before using CoinMarketCap logo fetch.",
    );
  return {
    accept: "application/json",
    "X-CMC_PRO_API_KEY": resolved.value,
  };
}

async function fetchCoinMarketCapLogoSource(cmcId: string) {
  if (!isNumericCoinMarketCapId(cmcId))
    throw new Error("CMC ID must be numeric; use Find CMC ID before fetching.");
  const response = await fetch(
    `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${encodeURIComponent(cmcId)}`,
    {
      headers: await coinMarketCapHeaders(),
    },
  );
  if (!response.ok)
    throw new Error(
      `CoinMarketCap lookup for ${cmcId} failed (${response.status}).`,
    );
  const json = await response.json();
  const record =
    json.data?.[cmcId] ?? (Object.values(json.data ?? {})[0] as any);
  const imageUrl = record?.logo || "";
  if (!imageUrl || !/^https:\/\//.test(imageUrl))
    throw new Error(
      `CoinMarketCap did not return an HTTPS logo URL for ${cmcId}.`,
    );
  return {
    imageUrl,
    sourceUrl: `https://coinmarketcap.com/currencies/${record?.slug || cmcId}/`,
    metadata: {
      cmcId,
      coinMarketCapId: cmcId,
      symbol: record?.symbol ?? null,
      name: record?.name ?? null,
      slug: record?.slug ?? null,
      logo: imageUrl,
    },
  };
}

export async function addCoinMarketCapAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const cmcId = String(
    formData.get("coinMarketCapId") || logo.coinmarketcap_id || "",
  ).trim();
  if (!(await resolveApiSecret("coinmarketcap")).value)
    redirectLogoNotice(
      logo.slug,
      "warning",
      "CoinMarketCap API key missing; fetch is disabled. Add it in API Settings.",
    );
  if (!cmcId)
    redirectLogoNotice(
      logo.slug,
      "warning",
      "Find and save a numeric CoinMarketCap ID first.",
    );
  if (!isNumericCoinMarketCapId(cmcId))
    redirectLogoNotice(
      logo.slug,
      "warning",
      "CMC ID must be numeric; use Find CMC ID instead of a slug.",
    );
  try {
    const source = await fetchCoinMarketCapLogoSource(cmcId);
    const created = await upsertLogoSource({
      logoId: logo.id,
      provider: "coinmarketcap",
      ...source,
      metadata: { ...source.metadata, reviewStatus: "selected_needs_review" },
      status: "candidate",
      reviveRejected: true,
    });
    const sources = (await getLogoSources(logo.id)).rows;
    const hasCoinGeckoPrimary = sources.some((row) => row.provider === "coingecko" && row.status === "approved");
    if (!logo.approved_logo_url && !hasCoinGeckoPrimary) {
      await selectSourceNeedsReview(created.id, "CoinMarketCap selected because stronger source is missing; admin review required");
    }
    await updateLogoProviderId(logo.slug, "coinmarketcap", cmcId);
    await updateLogoFetchState(logo.slug, "coinmarketcap", null);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(
      logo.slug,
      "success",
      "CoinMarketCap candidate fetched for review.",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = expectedActionMessage(error, "CoinMarketCap fetch failed.");
    await updateLogoFetchState(logo.slug, "coinmarketcap", message);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(logo.slug, "error", message);
  }
}

export async function bulkRefreshCoinMarketCapLogosAction() {
  await requireAdmin();
  if (!(await resolveApiSecret("coinmarketcap")).value) {
    const errors = [
      "CoinMarketCap API key is missing. Add it in API Settings or COINMARKETCAP_API_KEY before bulk refreshing logos.",
    ];
    await setAdminSetting(
      "last_cmc_bulk_refresh_summary",
      bulkSummary("CoinMarketCap", 0, 0, errors),
    );
    revalidatePath("/admin");
    revalidatePath("/admin/logos");
    redirect("/admin/logos?provider=coinmarketcap&errors=1");
  }

  const logos = (await listLogosForCoinGeckoBulk()).rows;
  let refreshed = 0;
  let missing = 0;
  const errors: string[] = [];

  for (const logo of logos) {
    const cmcId =
      typeof logo.coinmarketcap_id === "string"
        ? logo.coinmarketcap_id.trim()
        : "";
    if (!cmcId || !isNumericCoinMarketCapId(cmcId)) {
      missing += 1;
      if (cmcId) {
        errors.push(`${logo.slug}: CMC ID must be numeric; use Find CMC ID.`);
        await updateLogoFetchState(
          logo.slug,
          "coinmarketcap",
          "CMC ID must be numeric; use Find CMC ID.",
        );
      }
      continue;
    }
    try {
      const source = await fetchCoinMarketCapLogoSource(cmcId);
      await upsertLogoSource({
        logoId: logo.id,
        provider: "coinmarketcap",
        ...source,
        metadata: { ...source.metadata, bulkRefresh: true },
        status: "candidate",
        reviveRejected: true,
      });
      await updateLogoProviderId(logo.slug, "coinmarketcap", cmcId);
      await updateLogoFetchState(logo.slug, "coinmarketcap", null);
      refreshed += 1;
    } catch (error) {
      const message = explainProviderError("CoinMarketCap", error);
      errors.push(`${logo.slug}: ${message}`);
      await updateLogoFetchState(logo.slug, "coinmarketcap", message);
    }
  }

  await setAdminSetting(
    "last_cmc_bulk_refresh_summary",
    bulkSummary("CoinMarketCap", refreshed, missing, errors),
  );
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  const params = new URLSearchParams({
    provider: "coinmarketcap",
    refreshed: String(refreshed),
    missing: String(missing),
    errors: String(errors.length),
  });
  for (const message of errors.slice(0, 3)) params.append("error", message);
  redirect(`/admin/logos?${params.toString()}`);
}

async function uploadBufferToBlob(
  buffer: Buffer,
  pathname: string,
  mimeType: string,
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token)
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is missing; Managed Logo Vault is disabled until Blob storage is configured.",
    );
  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "7",
      "x-content-type": mimeType,
      "x-add-random-suffix": "0",
    },
    body: new Uint8Array(buffer),
  });
  if (!response.ok)
    throw new Error(`Blob vault upload failed (${response.status}).`);
  const json = await response.json();
  return String(json.url || json.downloadUrl || "");
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "";
}


type OptimizedLogo = {
  buffer: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
  optimized: boolean;
  maxDimension: number;
};

function readPngDimensions(buffer: Buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer) {
  let offset = 2;
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpDimensions(buffer: Buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  return null;
}

function readImageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") return readPngDimensions(buffer);
  if (mimeType === "image/jpeg") return readJpegDimensions(buffer);
  if (mimeType === "image/webp") return readWebpDimensions(buffer);
  return null;
}

async function optimizeLogoBuffer(buffer: Buffer, mimeType: string, maxDimension = 256): Promise<OptimizedLogo> {
  const dimensions = readImageDimensions(buffer, mimeType);
  const needsResize = Boolean(dimensions && Math.max(dimensions.width, dimensions.height) > maxDimension);
  if (needsResize) {
    try {
      const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
      const sharpModule = await importer("sharp");
      const sharp = sharpModule.default ?? sharpModule;
      let pipeline = sharp(buffer, { failOn: "none" }).rotate().resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });
      if (mimeType === "image/png") pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
      else if (mimeType === "image/webp") pipeline = pipeline.webp({ quality: 84 });
      else pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true });
      const output = await pipeline.toBuffer({ resolveWithObject: true });
      return { buffer: output.data, mimeType, width: output.info.width ?? dimensions?.width ?? null, height: output.info.height ?? dimensions?.height ?? null, optimized: true, maxDimension };
    } catch {
      // Keep provider copies durable even when the optional optimizer is unavailable in local/dev builds.
    }
  }
  return { buffer, mimeType, width: dimensions?.width ?? null, height: dimensions?.height ?? null, optimized: true, maxDimension };
}

async function copySourceToVault(logo: AdminLogo, source: LogoSource, options: { autoVault?: boolean; reason?: string } = {}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return "Managed Vault: Blob token missing";
  if (source.status === "rejected")
    return "Managed Vault: skipped rejected source";
  const existing = (await getLogoSources(logo.id)).rows;
  if (
    existing.some(
      (row) =>
        ["managed-vault", "vault"].includes(row.provider) &&
        row.status !== "rejected" &&
        (sourceMetadata(row).copiedFromSourceId === source.id ||
          sourceMetadata(row).copiedFromUrl ===
            (source.blob_url || source.image_url)),
    )
  )
    return "Managed Vault: already available";
  const meta = sourceMetadata(source);
  if (meta.visuallyRejected || meta.visualRejected || meta.unsafe || meta.visualStatus === "visual_rejected")
    return "Managed Vault: skipped visual rejected source";
  const imageUrl = source.blob_url || source.image_url;
  if (!/^https:\/\//.test(imageUrl))
    return "Managed Vault: source is not an HTTPS provider image";
  const response = await fetch(imageUrl, {
    headers: { accept: "image/png,image/jpeg,image/webp" },
  });
  if (!response.ok) throw new Error(`image copy failed (${response.status})`);
  const mimeType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(mimeType))
    throw new Error(
      `content type unsupported: ${mimeType || "unknown"}. SVG vault copies are disabled until sanitization exists.`,
    );
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("image copy failed: empty file");
  if (buffer.length > 1_000_000)
    throw new Error("image copy failed: logo file is larger than 1 MB");
  const optimized = await optimizeLogoBuffer(buffer, mimeType, 256);
  const copiedAt = new Date().toISOString();
  const ext = extensionFromMime(optimized.mimeType);
  const pathname = `logo-vault/${logo.slug}/${source.provider}-${Date.now()}.${ext}`;
  const blobUrl = await uploadBufferToBlob(optimized.buffer, pathname, optimized.mimeType);
  const reviewedCopy =
    source.status === "approved" &&
    (source.provider === "coingecko" ||
      source.provider === "manual" ||
      source.provider === "upload" ||
      meta.reviewStatus === "reviewed");
  await upsertLogoSource({
    logoId: logo.id,
    provider: "managed-vault",
    imageUrl: blobUrl,
    blobUrl,
    sourceUrl: source.source_url || imageUrl,
    status: reviewedCopy ? "approved" : "candidate",
    metadata: {
      copiedFromProvider: source.provider,
      copiedFromSourceId: source.id,
      copiedFromUrl: imageUrl,
      copiedAt,
      fileSize: optimized.buffer.length,
      mimeType: optimized.mimeType,
      width: optimized.width,
      height: optimized.height,
      optimized: optimized.optimized,
      maxDimension: optimized.maxDimension,
      reviewStatus: reviewedCopy ? "reviewed" : "candidate",
      autoVault: Boolean(options.autoVault),
      reason: options.reason || (options.autoVault ? "trusted-primary" : "bulk-backup"),
    },
  });
  return "Managed Vault: copy created";
}

async function autoCopyPrimaryToVault(logo: AdminLogo, source: LogoSource, reason: "trusted-primary" | "reviewed-primary" | "bulk-backup" = "trusted-primary") {
  if (source.status === "rejected") return "Managed Vault: skipped rejected source";
  const meta = sourceMetadata(source);
  if (meta.visuallyRejected || meta.visualRejected || meta.unsafe || meta.visualStatus === "visual_rejected")
    return "Managed Vault: skipped visual rejected source";
  return copySourceToVault(logo, source, { autoVault: true, reason });
}

export async function copySourceToVaultAction(formData: FormData) {
  await requireAdmin();
  const logo = await ensureLogoFromForm(formData);
  const sourceId = String(formData.get("sourceId") || "").trim();
  try {
    if (!sourceId)
      redirectLogoNotice(
        logo.slug,
        "warning",
        "Choose a source to copy to Managed Vault.",
      );
    const source = await getLogoSource(sourceId);
    if (!source || source.logo_id !== logo.id)
      redirectLogoNotice(
        logo.slug,
        "error",
        "Source was not found for this logo.",
      );
    const message = await copySourceToVault(logo, source);
    revalidatePath(`/admin/logos/${logo.slug}`);
    revalidatePath("/admin/logos");
    redirectLogoNotice(
      logo.slug,
      message.includes("created") ? "success" : "warning",
      message,
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLogoNotice(
      logo.slug,
      "error",
      expectedActionMessage(error, "Vault copy failed."),
    );
  }
}

export async function fetchAllLogoSourcesAction(formData: FormData) {
  await requireAdmin();
  const logo = await ensureLogoFromForm(formData);
  try {
    const summary = await discoverLogoSources(logo);
    revalidatePath(`/admin/logos/${logo.slug}`);
    revalidatePath("/admin/logos");
    redirectLogoNotice(logo.slug, "success", summary.join(" · "));
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLogoNotice(
      logo.slug,
      "error",
      expectedActionMessage(error, "Fetch all sources failed."),
    );
  }
}


export async function useCoinGeckoIdAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "").trim();
  const coinId = String(formData.get("coinGeckoId") || "").trim();
  if (!slug || !coinId) redirectLogoNotice(slug, "warning", "Choose a CoinGecko candidate first.");
  const logo = await getLogo(slug);
  if (!logo) redirectLogoNotice(slug, "error", "Logo was not found.");
  await updateLogoProviderId(slug, "coingecko", coinId);
  const form = new FormData();
  form.set("name", logo.name);
  form.set("category", logo.category);
  form.set("coinGeckoId", coinId);
  return addCoinGeckoAction(form);
}

export async function useCoinMarketCapIdAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const cmcId = String(formData.get("coinMarketCapId") || "").trim();
  if (!isNumericCoinMarketCapId(cmcId))
    redirectLogoNotice(
      slug,
      "warning",
      "CMC ID must be numeric; choose a candidate from the finder.",
    );
  const logo = await getLogo(slug);
  if (!logo) redirectLogoNotice(slug, "error", "Logo was not found.");
  await updateLogoProviderId(slug, "coinmarketcap", cmcId);
  const form = new FormData();
  form.set("name", logo.name);
  form.set("category", logo.category);
  form.set("coinMarketCapId", cmcId);
  return addCoinMarketCapAction(form);
}

async function uploadToBlob(file: File, pathname: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token)
    throw new Error("BLOB_READ_WRITE_TOKEN is missing; uploads are disabled.");
  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": "7",
      "x-content-type": file.type || "application/octet-stream",
      "x-add-random-suffix": "1",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!response.ok) throw new Error(`Blob upload failed (${response.status}).`);
  const json = await response.json();
  return String(json.url || json.downloadUrl || "");
}

export async function uploadLogoAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      redirectLogoNotice(
        logo.slug,
        "warning",
        "Blob token missing; upload is disabled until storage is configured.",
      );
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      redirectLogoNotice(logo.slug, "error", "Choose a logo file to upload.");
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type))
      redirectLogoNotice(
        logo.slug,
        "error",
        "Only PNG, JPEG or WebP raster uploads are enabled.",
      );
    if (file.size > 500_000)
      redirectLogoNotice(
        logo.slug,
        "error",
        "Logo upload is too large. Use a raster file under 500 KB.",
      );
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const blobUrl = await uploadToBlob(
      file,
      `admin-logos/${logo.slug}/${Date.now()}-${safeName}`,
    );
    await addLogoSource({
      logoId: logo.id,
      provider: "upload",
      imageUrl: blobUrl,
      blobUrl,
      sourceUrl: null,
      metadata: { fileName: file.name, size: file.size, type: file.type },
    });
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(logo.slug, "success", "Upload candidate added.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = expectedActionMessage(error, "Upload failed.");
    redirectLogoNotice(logo.slug, "error", message);
  }
}

export async function scanMetricLogosAction() {
  await requireAdmin();
  try {
    await runMetricLogoDiscovery(30);
    revalidatePath("/admin");
    revalidatePath("/admin/logos");
    redirect(
      "/admin/logos?scan=1&notice=success&message=Metric%20scan%20complete",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = expectedActionMessage(error, "Metric scan failed.");
    redirect(
      `/admin/logos?notice=error&message=${encodeURIComponent(message.slice(0, 180))}`,
    );
  }
}

export async function saveProviderIdsAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const defiLlamaSlug = String(formData.get("defiLlamaSlug") || "").trim();
  await updateLogoProviderId(
    slug,
    "coingecko",
    String(formData.get("coinGeckoId") || "").trim(),
  );
  await updateLogoProviderId(
    slug,
    "coinmarketcap",
    String(formData.get("coinMarketCapId") || "").trim(),
  );
  await saveDefiLlamaSlug(slug, defiLlamaSlug);
  let notice: "success" | "warning" = "success";
  let message = "Provider IDs saved.";
  if (defiLlamaSlug) {
    const logo = await getLogo(slug);
    if (logo) {
      const resolved = await searchDefiLlamaSources(defiLlamaSlug, {
        targetName: logo.name,
        targetSlug: logo.slug,
        category: logo.category,
        aliases: [defiLlamaSlug],
      });
      const valid = resolved.candidates.some(
        (candidate) => candidate.recommended && candidate.confidence === "high",
      );
      if (!valid) {
        await updateLogoFetchState(
          slug,
          "defillama",
          resolved.error || "Saved DefiLlama slug did not resolve to a reliable source.",
        );
        notice = "warning";
        message = "Provider IDs saved, but the DefiLlama slug did not resolve reliably.";
      }
    }
  }
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, notice, message);
}

export async function discoverLogoSourcesBulkAction(formData: FormData) {
  await requireAdmin();
  const mode = String(formData.get("mode") || "smart");
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  const allSources = (await getAllLogoSources()).rows;
  const sourcesByLogo = new Map<string, LogoSource[]>();
  for (const source of allSources)
    sourcesByLogo.set(source.logo_id, [
      ...(sourcesByLogo.get(source.logo_id) ?? []),
      source,
    ]);
  const counts = {
    checked: 0,
    coingeckoFetched: 0,
    cmcFetched: 0,
    defillamaFetched: 0,
    vaultCopiesCreated: 0,
    primarySelected: 0,
    needsReview: 0,
    missingIds: 0,
    errors: 0,
    skippedProtectedAdminSources: 0,
    skippedRejected: 0,
    skippedAlreadyVaulted: 0,
    skippedMissingSource: 0,
    cgMissing: 0,
    cmcMissing: 0,
    defillamaNoReliable: 0,
    defillamaErrors: 0,
    vaultMissing: 0,
    vaultAlready: 0,
  };
  const details: string[] = [];
  for (const logo of logos) {
    const sources = sourcesByLogo.get(logo.id) ?? [];
    const problem =
      !logo.approved_logo_url ||
      !logo.coingecko_id ||
      !logo.coinmarketcap_id ||
      sources.length === 0 ||
      Boolean(logo.last_fetch_error) ||
      logo.status === "needs_review";
    if (mode === "smart" && !problem) continue;
    counts.checked += 1;
    if (hasAdminChosenSource(sources)) counts.skippedProtectedAdminSources += 1;
    if (logo.visual_status === "rejected") {
      counts.skippedRejected += 1;
      details.push(`${logo.slug}: visual rejected skipped`);
      continue;
    }
    try {
      const summary = mode === "vault" ? [] : await discoverLogoSources(logo);
      if (mode === "vault") {
        const primary =
          sources.find((source) => source.id === logo.approved_source_id) ??
          sources.find((source) => source.status === "approved");
        if (!primary) {
          counts.skippedMissingSource += 1;
          summary.push("Managed Vault: no approved primary to copy");
        } else if (
          sources.some(
            (source) =>
              ["managed-vault", "vault"].includes(source.provider) &&
              source.status !== "rejected",
          )
        ) {
          counts.skippedAlreadyVaulted += 1;
          summary.push("Managed Vault: already available");
        } else {
          summary.push(await copySourceToVault(logo, primary));
        }
      }
      const text = summary.join(" | ");
      if (text.includes("CoinGecko: fetched")) counts.coingeckoFetched += 1;
      if (text.includes("CoinGecko: missing ID")) counts.cgMissing += 1;
      if (text.includes("CoinMarketCap: fetched")) counts.cmcFetched += 1;
      if (text.includes("CoinMarketCap: needs ID") || text.includes("CoinMarketCap: ID review") || text.includes("CoinMarketCap: API key missing"))
        counts.cmcMissing += 1;
      if (text.includes("DefiLlama: auto-resolved") || text.includes("DefiLlama: fetched"))
        counts.defillamaFetched += 1;
      if (text.includes("DefiLlama: no source found")) counts.defillamaNoReliable += 1;
      if (text.includes("DefiLlama: failed")) counts.defillamaErrors += 1;
      if (text.includes("Managed Vault: copy created")) counts.vaultCopiesCreated += 1;
      if (text.includes("Managed Vault: no approved primary")) counts.vaultMissing += 1;
      if (text.includes("Managed Vault: already available")) counts.vaultAlready += 1;
      if (text.includes("Primary:")) counts.primarySelected += 1;
      if (text.includes("needs review")) counts.needsReview += 1;
      if (text.includes("missing ID") || text.includes("needs ID"))
        counts.missingIds += 1;
      details.push(`${logo.slug}: ${text}`);
    } catch (error) {
      counts.errors += 1;
      details.push(
        `${logo.slug}: ${expectedActionMessage(error, "Discovery failed.")}`,
      );
    }
  }
  await setAdminSetting(
    "last_logo_source_discovery_summary",
    JSON.stringify({
      provider: "Logo Source Discovery",
      timestamp: new Date().toISOString(),
      mode,
      ...counts,
      firstErrors: details
        .filter(
          (d) =>
            d.toLowerCase().includes("failed") ||
            d.toLowerCase().includes("error"),
        )
        .slice(0, 10),
      firstSkippedReasons: details
        .filter((d) => d.toLowerCase().includes("skipped"))
        .slice(0, 10),
      candidateList: details.slice(0, 25),
    }),
  );
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  redirect(
    `/admin/logos?notice=success&message=${encodeURIComponent(mode === "vault" ? `Vault backup complete: ${counts.checked} checked, ${counts.vaultCopiesCreated} copied, ${counts.skippedAlreadyVaulted} already vaulted, ${counts.skippedMissingSource} missing source, ${counts.errors} errors` : `Discovery ${mode} complete: ${counts.checked} checked, ${counts.primarySelected} primary selected, ${counts.needsReview} need review, ${counts.errors} errors`)}`,
  );
}

export async function saveFallbackAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoFallback(
    slug,
    String(formData.get("fallbackText") || "").trim(),
    String(formData.get("fallbackColor") || "").trim(),
  );
  revalidatePath(`/admin/logos/${slug}`);
  redirectLogoNotice(slug, "success", "Fallback saved.");
}

export async function markVisualRejectedAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(
    slug,
    "needs_review",
    "rejected",
    String(formData.get("reason") || "Visual rejected in admin review"),
  );
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Logo marked visually rejected.");
}

export async function markNeedsReviewAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(
    slug,
    "needs_review",
    null,
    "Marked needs review in admin operations.",
  );
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Logo marked needs review.");
}

export async function saveBrandSettingsAction(formData: FormData) {
  await requireAdmin();
  const textFields = [
    "siteName",
    "shortName",
    "mainSlogan",
    "heroSubtitle",
    "supportingCopy",
    "cardFooterText",
    "createdWithText",
    "metaDescription",
    "heroLogoOffsetX",
    "heroLogoMaxWidth",
    "heroLogoSpacing",
    "heroSloganFontSize",
    "heroSloganFontWeight",
    "heroSloganLineHeight",
    "heroSubtitleSize",
    "heroSubtitleOpacity",
    "heroSubtitleVisible",
  ];
  const assetFields = [
    "primaryLogo",
    "darkLogo",
    "iconMark",
    "headerLogo",
    "favicon",
    "appleTouchIcon",
    "xAvatar",
    "xBanner",
    "watermarkMark",
  ];
  const settings: Record<string, unknown> = Object.fromEntries(
    textFields.map((field) => [
      field,
      String(formData.get(field) || "")
        .trim()
        .replace(/on-chain/gi, "onchain"),
    ]),
  );
  const assetMetadata: Record<string, Record<string, unknown>> = {};
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  try {
    for (const field of assetFields) {
      const reset = formData.get(`${field}Reset`) === "1";
      const manualUrl = reset ? "" : String(formData.get(field) || "").trim();
      const file = formData.get(`${field}File`);
      settings[field] = manualUrl;
      if (manualUrl)
        assetMetadata[field] = {
          provider: "manual-url",
          kind: field,
          url: manualUrl,
        };
      if (file instanceof File && file.size > 0) {
        if (!process.env.BLOB_READ_WRITE_TOKEN)
          throw new Error(
            `BLOB_READ_WRITE_TOKEN is missing; ${field} upload is disabled.`,
          );
        if (!allowedTypes.has(file.type))
          throw new Error(
            `${field}: only PNG, JPEG and WebP uploads are enabled. SVG upload remains disabled until sanitization exists.`,
          );
        const maxSize = field === "xBanner" ? 2_000_000 : 500_000;
        if (file.size > maxSize)
          throw new Error(
            `${field}: file is too large. Limit is ${field === "xBanner" ? "2 MB" : "500 KB"}.`,
          );
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const url = await uploadToBlob(
          file,
          `brand-assets/${field}/${Date.now()}-${safeName}`,
        );
        settings[field] = url;
        assetMetadata[field] = {
          provider: "upload",
          kind: field,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          url,
        };
      }
      if (reset) assetMetadata[field] = { provider: "disabled", kind: field };
    }
    await setAdminSetting(
      "brand_settings",
      JSON.stringify({
        ...settings,
        assetMetadata,
        savedAt: new Date().toISOString(),
      }),
    );
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath("/admin/brand");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Brand settings save failed", error);
    const message =
      error instanceof Error ? error.message : "Unknown save error";
    redirect(`/admin/brand?error=${encodeURIComponent(message.slice(0, 160))}`);
  }
  redirect("/admin/brand?saved=1");
}

export async function approveSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  try {
    const sourceBefore = await getLogoSource(sourceId);
    const metaBefore = sourceBefore ? sourceMetadata(sourceBefore) : {};
    if (sourceBefore && (metaBefore.unsafe || metaBefore.visualRejected || metaBefore.visuallyRejected) && !["manual", "upload"].includes(sourceBefore.provider))
      redirectLogoNotice(slug, "warning", "Unsafe or visual-rejected vault candidates require an explicit manual override before primary use.");
    await approveSource(sourceId);
    const logo = await getLogo(slug);
    const source = await getLogoSource(sourceId);
    if (logo && source && ["coinmarketcap", "defillama"].includes(source.provider)) {
      await autoCopyPrimaryToVault(logo, source, "reviewed-primary");
    }
    revalidatePath(`/admin/logos/${slug}`);
    revalidatePath("/admin/logos");
    revalidatePath("/");
    revalidatePath("/api/chain-revenue");
    redirectLogoNotice(slug, "success", "Source approved.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLogoNotice(
      slug,
      "error",
      expectedActionMessage(error, "Source approval failed."),
    );
  }
}

export async function rejectSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "");
  await rejectSource(sourceId, reason);
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  const logo = logos.find((row) => row.slug === slug);
  if (logo) {
    const sources = (await getLogoSources(logo.id)).rows;
    await chooseBestDiscoveredPrimary(logo, sources, []);
  }
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  revalidatePath("/");
  revalidatePath("/api/chain-revenue");
  redirectLogoNotice(slug, "success", "Source rejected.");
}

export async function rejectLogoAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "");
  await rejectLogo(slug, reason);
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  revalidatePath("/");
  revalidatePath("/api/chain-revenue");
  redirectLogoNotice(slug, "success", "Logo entity rejected.");
}

function parseApiProvider(
  value: FormDataEntryValue | null,
): ApiProviderId | null {
  const provider = String(value || "").trim();
  return provider === "coingecko" ||
    provider === "coinmarketcap" ||
    provider === "defillama"
    ? provider
    : null;
}

export async function saveApiKeyAction(formData: FormData) {
  await requireAdmin();
  const provider = parseApiProvider(formData.get("provider"));
  if (!provider) adminNotice("/admin/api", "error", "Unknown API provider.");
  try {
    await saveAdminApiSecret(provider, String(formData.get("apiKey") || ""));
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "success", "API key saved securely.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    adminNotice(
      "/admin/api",
      "warning",
      expectedActionMessage(error, "API key could not be saved."),
    );
  }
}

export async function deleteApiKeyAction(formData: FormData) {
  await requireAdmin();
  const provider = parseApiProvider(formData.get("provider"));
  if (!provider) adminNotice("/admin/api", "error", "Unknown API provider.");
  try {
    await deleteAdminApiSecret(provider);
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "success", "API key deleted.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    adminNotice(
      "/admin/api",
      "error",
      expectedActionMessage(error, "API key could not be deleted."),
    );
  }
}

export async function testApiKeyAction(formData: FormData) {
  await requireAdmin();
  const provider = parseApiProvider(formData.get("provider"));
  if (!provider) adminNotice("/admin/api", "error", "Unknown API provider.");
  try {
    const resolved = await resolveApiSecret(provider);
    if (provider !== "defillama" && !resolved.value)
      throw new Error(`${providerEnvVar(provider)} is missing.`);
    let response: Response;
    if (provider === "coingecko") {
      response = await fetch("https://api.coingecko.com/api/v3/ping", {
        headers: await coinGeckoHeaders(false),
        cache: "no-store",
      });
    } else if (provider === "coinmarketcap") {
      response = await fetch("https://pro-api.coinmarketcap.com/v1/key/info", {
        headers: await coinMarketCapHeaders(),
        cache: "no-store",
      });
    } else {
      response = await fetch("https://api.llama.fi/protocols", {
        headers: {
          accept: "application/json",
          ...(resolved.value
            ? { authorization: `Bearer ${resolved.value}` }
            : {}),
        },
        cache: "no-store",
      });
    }
    if (!response.ok)
      throw new Error(`${provider} test failed (${response.status}).`);
    if (resolved.source === "admin")
      await setAdminApiSecretTestResult(provider, true, null);
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "success", "API key test succeeded.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const providerForUpdate = parseApiProvider(formData.get("provider"));
    const message = expectedActionMessage(error, "API key test failed.");
    if (providerForUpdate && !message.startsWith("NEXT_REDIRECT"))
      await setAdminApiSecretTestResult(
        providerForUpdate,
        false,
        message.slice(0, 180),
      );
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "error", message);
  }
}

export async function restoreSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  const useAsPrimary = String(formData.get("useAsPrimary") || "") === "1";
  try {
    const source = await getLogoSource(sourceId);
    if (!source) redirectLogoNotice(slug, "error", "Source was not found.");
    const meta = sourceMetadata(source);
    const safetyBlocked = meta.visualStatus === "visual_rejected" || meta.visuallyRejected || String(source.rejection_reason || "").toLowerCase().includes("safety");
    if (safetyBlocked) redirectLogoNotice(slug, "warning", "Restore blocked: safety/visual rejected sources require an advanced override.");
    const restored = await restoreSource(sourceId, false);
    const logo = await getLogo(slug);
    if (restored && logo && useAsPrimary) {
      if (restored.provider === "coingecko") {
        const sources = (await getLogoSources(logo.id)).rows;
        const auto = canAutoApproveCoinGecko(logo, sources, restored.image_url, restored.source_url);
        if (auto.ok) {
          await autoApproveSource(restored.id, auto.reason);
          await autoCopyPrimaryToVault(logo, restored, "trusted-primary");
        } else {
          await selectSourceNeedsReview(restored.id, `Restored ${restored.provider}; admin review required`);
        }
      } else {
        await selectSourceNeedsReview(restored.id, `Restored ${restored.provider}; admin review required`);
      }
    }
    revalidatePath(`/admin/logos/${slug}`);
    revalidatePath("/admin/logos");
    redirectLogoNotice(slug, "success", useAsPrimary ? "Source restored and selected." : "Source restored as backup candidate.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLogoNotice(slug, "error", expectedActionMessage(error, "Source restore failed."));
  }
}

export async function markLogoAliasAction(formData: FormData) {
  await requireAdmin();
  const canonicalSlug = String(formData.get("canonicalSlug") || "");
  const alias = String(formData.get("alias") || "");
  const duplicateLogoId = String(formData.get("duplicateLogoId") || "");
  const canonical = await getLogo(canonicalSlug);
  if (!canonical) redirectLogoNotice(canonicalSlug, "error", "Canonical logo was not found.");
  await addLogoAlias(canonical.id, alias, "admin", { duplicateLogoId, markedAt: new Date().toISOString() });
  revalidatePath(`/admin/logos/${canonical.slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(canonical.slug, "success", `${alias} now resolves as an alias.`);
}

export async function dismissDuplicateWarningAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const logoId = String(formData.get("logoId") || "");
  const duplicateLogoId = String(formData.get("duplicateLogoId") || "");
  await dismissDuplicateWarning(logoId, duplicateLogoId);
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Duplicate warning dismissed.");
}

export async function importLegacyLocalLogosToVaultAction() {
  await requireAdmin();
  const counts = { checked: 0, migrated: 0, unsafeImported: 0, skippedAlreadyVaulted: 0, skippedExistingSource: 0, skippedUnsupported: 0, errors: 0 };
  const details: string[] = [];
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    await setAdminSetting("last_legacy_logo_migration_summary", JSON.stringify({ timestamp: new Date().toISOString(), ...counts, errors: 1, firstErrors: ["Blob token missing"] }));
    adminNotice("/admin/logos", "warning", "Blob token missing; legacy logo migration is disabled until storage is configured.");
  }
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  const allSources = (await getAllLogoSources()).rows;
  const sourcesByLogo = new Map<string, LogoSource[]>();
  for (const source of allSources) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);
  for (const manifest of logoSourceManifest) {
    counts.checked += 1;
    const logo = logos.find((row) => row.slug === manifest.slug && row.category === manifest.category) ?? logos.find((row) => row.slug === manifest.slug);
    if (!logo) continue;
    const sources = sourcesByLogo.get(logo.id) ?? [];
    const legacyVisualRejected = Boolean((manifest as any).visualRejected || (manifest as any).fallbackPreferredUntilManualAsset);
    const legacyUnsafe = legacyVisualRejected || manifest.approvalStatus !== "approved" || ["bsv", "bitcoin-sv", "bsv-blockchain"].includes(manifest.slug);
    const alreadyMigrated = sources.some((source) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = typeof source.metadata === "string" ? JSON.parse(source.metadata || "{}") : (source.metadata as Record<string, unknown>) || {};
      } catch {
        meta = {};
      }
      return ["managed-vault", "vault"].includes(source.provider) && source.status !== "rejected" && meta.migratedFrom === "local-static-manifest" && meta.originalLocalPath === manifest.localPath;
    });
    if (alreadyMigrated || sources.some((source) => ["managed-vault", "vault"].includes(source.provider) && source.status !== "rejected" && !legacyUnsafe)) {
      counts.skippedAlreadyVaulted += 1;
      continue;
    }
    if (!legacyUnsafe && sources.some((source) => ["manual", "upload", "coingecko", "coinmarketcap", "defillama"].includes(source.provider) && source.status !== "rejected")) {
      counts.skippedExistingSource += 1;
      continue;
    }
    try {
      const localPath = String(manifest.localPath || "");
      if (!localPath.startsWith("/")) throw new Error("invalid local path");
      const filePath = path.join(process.cwd(), "public", localPath);
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "";
      if (!mimeType) {
        counts.skippedUnsupported += 1;
        details.push(`${manifest.slug}: skipped unsupported type ${ext}`);
        continue;
      }
      const blobUrl = await uploadBufferToBlob(buffer, `logo-vault/${logo.slug}/legacy-local-${Date.now()}${ext}`, mimeType);
      await upsertLogoSource({
        logoId: logo.id,
        provider: "managed-vault",
        imageUrl: blobUrl,
        blobUrl,
        sourceUrl: manifest.sourceUrl || localPath,
        status: "candidate",
        metadata: {
          migratedFrom: "local-static-manifest",
          originalLocalPath: localPath,
          originalProvider: manifest.sourceProvider,
          migratedAt: new Date().toISOString(),
          reviewStatus: "needs_review",
          visualRejected: legacyVisualRejected,
          unsafe: legacyUnsafe,
          mimeType,
          fileSize: buffer.length,
          autoVault: false,
          reason: "legacy-migration",
        },
      });
      counts.migrated += 1;
      if (legacyUnsafe) counts.unsafeImported += 1;
      details.push(`${logo.slug}: migrated${legacyUnsafe ? " unsafe/needs review" : ""}`);
    } catch (error) {
      counts.errors += 1;
      details.push(`${manifest.slug}: ${expectedActionMessage(error, "Legacy migration failed.")}`);
    }
  }
  await setAdminSetting("last_legacy_logo_migration_summary", JSON.stringify({ timestamp: new Date().toISOString(), ...counts, candidateList: details.slice(0, 50), firstErrors: details.filter((d) => d.toLowerCase().includes("failed") || d.toLowerCase().includes("error")).slice(0, 10) }));
  revalidatePath("/admin/logos");
  adminNotice("/admin/logos", counts.errors ? "warning" : "success", `Legacy migration complete: ${counts.checked} checked, ${counts.migrated} migrated, ${counts.unsafeImported} unsafe imported, ${counts.skippedAlreadyVaulted} already vaulted, ${counts.skippedExistingSource} existing source, ${counts.skippedUnsupported} unsupported, ${counts.errors} errors`);
}
