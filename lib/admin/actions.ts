"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminPassword, createSession, validateAdminPassword, requireAdmin, clearSession, getAdminConfigDiagnostic } from "@/lib/admin/auth";
import { addLogoSource, approveSource, autoApproveSource, canAutoApproveCoinGecko, getAllLogoSources, hasAdminChosenSource, listLogosForCoinGeckoBulk, rejectLogo, rejectSource, setAdminSetting, updateLogoFallback, updateLogoFetchState, updateLogoProviderId, updateLogoStatus, upsertLogo, upsertLogoSource, type AdminLogo, type LogoSource } from "@/lib/admin/logoDb";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { logoManifestBySlug } from "@/lib/logos/logoRegistry";
import { logoSourceManifest } from "@/lib/logos/logoSourceManifest";
import { runMetricLogoDiscovery } from "@/lib/admin/metricLogoScanner";
import { deleteAdminApiSecret, providerEnvVar, resolveApiSecret, saveAdminApiSecret, setAdminApiSecretTestResult, type ApiProviderId } from "@/lib/admin/apiSecrets";

async function ensureLogoFromForm(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "project").trim() || "project";
  if (!name) throw new Error("Logo name is required.");
  return upsertLogo(name, category);
}

type CoinGeckoRefreshMode = "smart" | "retry-errors" | "force-all";

function adminNotice(path: string, tone: "success" | "error" | "warning", message: string): never {
  const params = new URLSearchParams({ notice: tone, message: message.slice(0, 180) });
  redirect(`${path}?${params.toString()}`);
}

function noticeUrl(slug: string, tone: "success" | "error" | "warning", message: string) {
  const params = new URLSearchParams({ notice: tone, message: message.slice(0, 180) });
  return `/admin/logos/${encodeURIComponent(slug)}?${params.toString()}`;
}

function redirectLogoNotice(slug: string, tone: "success" | "error" | "warning", message: string): never {
  redirect(noticeUrl(slug, tone, message));
}

function isNextRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

function expectedActionMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("429")) return `${message} Retry later / rate limited.`;
  if (message.includes("404")) return `${message} Fix CoinGecko ID or use manual URL.`;
  if (message.includes("401") || message.includes("403")) return `${message} Check provider API key.`;
  if (message.toLowerCase().includes("blob_read_write_token")) return "Blob token missing; upload is disabled until storage is configured.";
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
  return { checked: 0, fetched: 0, autoApproved: 0, alreadyApproved: 0, candidates: 0, skippedExistingAdminApproved: 0, skippedAlreadyApproved: 0, skippedVisualRejected: 0, skippedPreviousRejected: 0, missingMappings: 0, idNeedsReview: 0, rateLimited: 0, errors: 0 };
}

function bulkSummary(provider: string, refreshed: number, missingMappings: number, errors: string[], extra: Record<string, unknown> = {}) {
  const rateLimitWarnings = errors.filter((error) => error.includes("429") || error.toLowerCase().includes("rate limit"));
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

function classifyProviderError(error: unknown): { message: string; kind: ProviderErrorKind } {
  const message = error instanceof Error ? error.message : "Unknown provider error";
  if (message.includes("429")) return { message: `${message} — Retry later.`, kind: "rateLimited" };
  if (message.includes("404")) return { message: `${message} — Fix CoinGecko ID or use manual URL.`, kind: "idNeedsReview" };
  if (message.includes("401") || message.includes("403")) return { message: `${message} — Check API key.`, kind: "apiKey" };
  if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("network")) return { message: `${message} — Provider/network error.`, kind: "error" };
  return { message, kind: "error" };
}

function explainProviderError(provider: string, error: unknown) {
  const message = error instanceof Error ? error.message : `Unknown ${provider} error`;
  if (message.includes("429")) return `${message} — Retry later.`;
  if (message.includes("404")) return `${message} — Fix ${provider} ID or use manual URL.`;
  if (message.includes("401") || message.includes("403")) return `${message} — Check API key.`;
  if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("network")) return `${message} — Provider/network error.`;
  return message;
}

export async function setupAdminAction(formData: FormData) {
  const diagnostic = await getAdminConfigDiagnostic();
  if (!diagnostic.hasDatabaseConfig) throw new Error("DATABASE_URL is missing. Configure Postgres before setup.");
  if (!diagnostic.canReadAdminSettings) throw new Error("Admin configuration could not be read. Check server logs before setup.");
  if (diagnostic.hasAdminPasswordHash) throw new Error("Admin is already configured. Use /admin/login.");

  const token = String(formData.get("setupToken") || "");
  if (process.env.ADMIN_SETUP_TOKEN && token !== process.env.ADMIN_SETUP_TOKEN) throw new Error("Invalid setup token.");
  const password = String(formData.get("password") || "");
  if (password.length < 10) throw new Error("Use an admin password with at least 10 characters.");
  await createAdminPassword(password);
  createSession();
  redirect("/admin");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!(await validateAdminPassword(password))) throw new Error("Invalid admin password.");
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
  if (!/^https:\/\//.test(imageUrl)) redirectLogoNotice(logo.slug, "error", "Manual logo URL must be a valid HTTPS URL.");
  await addLogoSource({ logoId: logo.id, provider: "manual", imageUrl, sourceUrl: imageUrl, metadata: { submittedBy: "admin" } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirectLogoNotice(logo.slug, "success", "Manual URL candidate added.");
}

export async function addDefiLlamaAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const slug = String(formData.get("providerSlug") || logo.slug).trim();
  if (!slug) redirectLogoNotice(logo.slug, "error", "Add a DefiLlama slug first.");
  const imageUrl = `https://icons.llama.fi/${encodeURIComponent(slug)}.jpg`;
  await addLogoSource({ logoId: logo.id, provider: "defillama", imageUrl, sourceUrl: `https://defillama.com/protocol/${slug}`, metadata: { slug } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirectLogoNotice(logo.slug, "success", "DefiLlama candidate added.");
}

async function coinGeckoHeaders(requireKey = false) {
  const resolved = await resolveApiSecret("coingecko");
  if (requireKey && !resolved.value) throw new Error("CoinGecko API key is missing. Add an admin-managed key or COINGECKO_DEMO_API_KEY before bulk refreshing logos.");
  return {
    accept: "application/json",
    ...(resolved.value ? { "x-cg-demo-api-key": resolved.value } : {}),
  };
}

async function fetchCoinGeckoLogoSource(coinId: string, requireKey = false) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
    { headers: await coinGeckoHeaders(requireKey) }
  );
  if (!response.ok) throw new Error(`CoinGecko lookup for ${coinId} failed (${response.status}).`);
  const json = await response.json();
  const imageUrl = json.image?.large || json.image?.small || json.image?.thumb || "";
  if (!imageUrl) throw new Error(`CoinGecko did not return an image URL for ${coinId}.`);
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
  if (!coinId) redirectLogoNotice(logo.slug, "warning", "Add CoinGecko ID first.");
  try {
    const source = await fetchCoinGeckoLogoSource(coinId);
    const sources = (await getAllLogoSources()).rows.filter((row) => row.logo_id === logo.id);
    const auto = canAutoApproveCoinGecko(logo, sources, source.imageUrl, source.sourceUrl);
    const created = await upsertLogoSource({ logoId: logo.id, provider: "coingecko", ...source, metadata: { ...source.metadata, approvalOrigin: auto.ok ? "auto" : "candidate", autoApproveReason: auto.reason }, status: auto.ok ? "approved" : "candidate" });
    if (auto.ok) await autoApproveSource(created.id);
    await updateLogoProviderId(logo.slug, "coingecko", coinId);
    await updateLogoFetchState(logo.slug, "coingecko", null);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(logo.slug, "success", auto.ok ? "CoinGecko logo fetched and approved." : "CoinGecko candidate fetched for review.");
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
  return Boolean(registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset);
}

function parseCoinGeckoRefreshMode(formData?: FormData): CoinGeckoRefreshMode {
  const raw = String(formData?.get("mode") || "smart");
  return raw === "retry-errors" || raw === "force-all" ? raw : "smart";
}

function isBsvLikeLogo(slug: string, coinId?: string | null) {
  return [slug, coinId ?? ""].some((value) => ["bsv", "bitcoin-sv", "bsv-blockchain"].includes(String(value).trim().toLowerCase()));
}

function isCoinGeckoSource(source: LogoSource) {
  return source.provider === "coingecko";
}

function sourceMetadata(source: LogoSource) {
  if (typeof source.metadata === "string") {
    try {
      const parsed = JSON.parse(source.metadata);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return source.metadata && typeof source.metadata === "object" ? source.metadata : {};
}

function sourceIsAdminApproved(source?: LogoSource | null) {
  if (!source) return false;
  const meta = sourceMetadata(source);
  return source.status === "approved" && (source.provider === "manual" || source.provider === "upload" || meta.approvalOrigin === "admin");
}

function hasApprovedCoinGeckoSource(logo: AdminLogo, sources: LogoSource[]) {
  return sources.some((source) => isCoinGeckoSource(source) && source.status === "approved" && logo.approved_source_id === source.id && Boolean(logo.approved_logo_url));
}

function hasCoinGeckoCandidate(sources: LogoSource[]) {
  return sources.some((source) => isCoinGeckoSource(source) && source.status === "candidate");
}

function isStaleFetch(logo: AdminLogo) {
  if (!logo.last_fetch_at) return true;
  const fetchedAt = new Date(logo.last_fetch_at).getTime();
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt > 1000 * 60 * 60 * 24 * 30;
}

function isCoinGeckoIdReviewError(error?: string | null) {
  return Boolean(error && (error.includes("404") || error.toLowerCase().includes("fix coingecko id")));
}

function shouldRefreshCoinGeckoLogo(mode: CoinGeckoRefreshMode, logo: AdminLogo, sources: LogoSource[]) {
  if (sourceIsAdminApproved(sources.find((source) => logo.approved_source_id === source.id)) || sources.some(sourceIsAdminApproved)) return { ok: false, reason: "admin-approved source exists" };
  if (mode === "force-all") return { ok: true, reason: "force-all" };
  if (mode === "retry-errors") return { ok: logo.last_fetch_provider === "coingecko" && Boolean(logo.last_fetch_error), reason: "retry-errors" };
  if (hasApprovedCoinGeckoSource(logo, sources) && !logo.last_fetch_error) return { ok: false, reason: "already approved" };
  if (isCoinGeckoIdReviewError(logo.last_fetch_error)) return { ok: false, reason: "coingecko id needs review" };
  if (!logo.approved_logo_url) return { ok: true, reason: "missing approved logo" };
  if (logo.status === "needs_review") return { ok: true, reason: "needs review" };
  if (!sources.some(isCoinGeckoSource)) return { ok: true, reason: "missing CoinGecko source" };
  if (logo.last_fetch_provider === "coingecko" && logo.last_fetch_error) return { ok: true, reason: "previous fetch error" };
  if (hasCoinGeckoCandidate(sources)) return { ok: true, reason: "candidate waiting" };
  if (isStaleFetch(logo) && !hasApprovedCoinGeckoSource(logo, sources)) return { ok: true, reason: "stale fetch" };
  return { ok: false, reason: "not needed" };
}

async function approveCoinGeckoSourceIfSafe(sourceId: string, reason: string) {
  const approved = await autoApproveSource(sourceId, reason);
  return Boolean(approved?.source_id === sourceId && approved.approved_logo_url);
}

export async function bulkRefreshCoinGeckoLogosAction(formData?: FormData) {
  await requireAdmin();
  const mode = parseCoinGeckoRefreshMode(formData);
  const counts = emptyCoinGeckoCounts();
  if (!(await resolveApiSecret("coingecko")).value) {
    const errors = ["CoinGecko API key is missing. Add it from API Settings or COINGECKO_DEMO_API_KEY before bulk refreshing logos."];
    await setAdminSetting("last_coingecko_bulk_refresh_summary", bulkSummary("CoinGecko", 0, 0, errors, { mode, ...counts, errors: errors.length }));
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
  for (const source of allSources) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);

  for (const logo of logos) {
    counts.checked += 1;
    const existingSources = sourcesByLogo.get(logo.id) ?? [];
    const coinId = (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
    if (!coinId) {
      counts.missingMappings += 1;
      continue;
    }
    if (isBsvLikeLogo(logo.slug, coinId) || isLogoVisuallyRejected(logo.slug, logo.category) || logo.visual_status === "rejected") {
      counts.skippedVisualRejected += 1;
      skippedReasons.push(`${logo.slug}: Keep fallback or add distinct manual logo`);
      if (isBsvLikeLogo(logo.slug, coinId)) await updateLogoFetchState(logo.slug, "coingecko", "Skipped visual_rejected: BSV/CoinGecko logo is BTC-confusing — Keep fallback or add distinct manual logo.");
      continue;
    }
    const refresh = shouldRefreshCoinGeckoLogo(mode, logo, existingSources);
    if (!refresh.ok) {
      if (refresh.reason === "admin-approved source exists") counts.skippedExistingAdminApproved += 1;
      else if (refresh.reason === "already approved") { counts.skippedAlreadyApproved += 1; counts.alreadyApproved += 1; alreadyApprovedList.push(`${logo.slug} (${coinId})`); }
      else if (refresh.reason === "coingecko id needs review") counts.idNeedsReview += 1;
      skippedReasons.push(`${logo.slug}: ${refresh.reason}`);
      continue;
    }

    try {
      const source = await fetchCoinGeckoLogoSource(coinId, true);
      counts.fetched += 1;
      const auto = canAutoApproveCoinGecko(logo, existingSources, source.imageUrl, source.sourceUrl);
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
      });
      if (created.status === "approved" && logo.approved_source_id === created.id && logo.approved_logo_url) {
        counts.alreadyApproved += 1;
        alreadyApprovedList.push(`${logo.slug} (${coinId})`);
      } else if (auto.ok) {
        const approved = await approveCoinGeckoSourceIfSafe(created.id, auto.reason);
        if (approved) {
          counts.autoApproved += 1;
          autoApprovedList.push(`${logo.slug} (${coinId})`);
        } else {
          counts.errors += 1;
          errors.push(`${logo.slug}: auto-approve DB update did not select source ${created.id}`);
        }
      } else if (auto.reason.includes("admin-approved")) {
        counts.skippedExistingAdminApproved += 1;
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (auto.reason.includes("previously rejected")) {
        counts.skippedPreviousRejected += 1;
        counts.candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (auto.reason.includes("visual") || auto.reason.includes("BSV")) {
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
    console.warn("Bulk CoinGecko logo refresh completed with partial failures", { mode, ...counts, firstErrors: errors.slice(0, 5) });
  }

  await setAdminSetting("last_coingecko_bulk_refresh_summary", bulkSummary("CoinGecko", counts.fetched, counts.missingMappings, errors, {
    mode,
    ...counts,
    firstErrors: errors.slice(0, 5),
    rateLimitWarnings: errors.filter((error) => error.includes("429") || error.toLowerCase().includes("rate limit")).slice(0, 5),
    autoApprovedList: autoApprovedList.slice(0, 25),
    alreadyApprovedList: alreadyApprovedList.slice(0, 25),
    candidateList: candidateList.slice(0, 25),
    firstSkippedReasons: skippedReasons.slice(0, 10),
  }));
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
  for (const source of allSources) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);

  for (const source of allSources.filter((row) => row.provider === "coingecko" && row.status === "candidate")) {
    counts.checkedCandidates += 1;
    const logo = logosById.get(source.logo_id);
    const sources = sourcesByLogo.get(source.logo_id) ?? [];
    if (!logo) { counts.skipped += 1; skippedReasons.push(`${source.id}: logo missing or rejected`); continue; }
    const coinId = (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
    if (isBsvLikeLogo(logo.slug, coinId) || isLogoVisuallyRejected(logo.slug, logo.category) || logo.visual_status === "rejected") { counts.skipped += 1; skippedReasons.push(`${logo.slug}: Keep fallback or add distinct manual logo`); continue; }
    const auto = canAutoApproveCoinGecko(logo, sources, source.image_url, source.source_url);
    if (!auto.ok) { counts.skipped += 1; skippedReasons.push(`${logo.slug}: ${auto.reason}`); continue; }
    const approved = await approveCoinGeckoSourceIfSafe(source.id, auto.reason);
    if (approved) counts.autoApproved += 1;
    else { counts.skipped += 1; skippedReasons.push(`${logo.slug}: auto-approve DB update did not select source ${source.id}`); }
  }

  await setAdminSetting("last_coingecko_candidate_apply_summary", JSON.stringify({ provider: "CoinGecko", timestamp: new Date().toISOString(), ...counts, firstSkippedReasons: skippedReasons.slice(0, 15) }));
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  redirect(`/admin/logos?candidateApply=1&checkedCandidates=${counts.checkedCandidates}&autoApproved=${counts.autoApproved}&skipped=${counts.skipped}`);
}

async function coinMarketCapHeaders() {
  const resolved = await resolveApiSecret("coinmarketcap");
  if (!resolved.value) throw new Error("CoinMarketCap API key is missing. Add it from API Settings or COINMARKETCAP_API_KEY before using CoinMarketCap logo fetch.");
  return {
    accept: "application/json",
    "X-CMC_PRO_API_KEY": resolved.value,
  };
}

async function fetchCoinMarketCapLogoSource(cmcId: string) {
  const response = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${encodeURIComponent(cmcId)}`, {
    headers: await coinMarketCapHeaders(),
  });
  if (!response.ok) throw new Error(`CoinMarketCap lookup for ${cmcId} failed (${response.status}).`);
  const json = await response.json();
  const record = json.data?.[cmcId] ?? Object.values(json.data ?? {})[0] as any;
  const imageUrl = record?.logo || "";
  if (!imageUrl || !/^https:\/\//.test(imageUrl)) throw new Error(`CoinMarketCap did not return an HTTPS logo URL for ${cmcId}.`);
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
  const cmcId = String(formData.get("coinMarketCapId") || logo.coinmarketcap_id || "").trim();
  if (!(await resolveApiSecret("coinmarketcap")).value) redirectLogoNotice(logo.slug, "warning", "CoinMarketCap API key missing; fetch is disabled. Add it in API Settings.");
  if (!cmcId) redirectLogoNotice(logo.slug, "warning", "Add CoinMarketCap ID first.");
  try {
    const source = await fetchCoinMarketCapLogoSource(cmcId);
    await addLogoSource({ logoId: logo.id, provider: "coinmarketcap", ...source });
    await updateLogoProviderId(logo.slug, "coinmarketcap", cmcId);
    await updateLogoFetchState(logo.slug, "coinmarketcap", null);
    revalidatePath(`/admin/logos/${logo.slug}`);
    redirectLogoNotice(logo.slug, "success", "CoinMarketCap candidate fetched for review.");
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
    const errors = ["CoinMarketCap API key is missing. Add it in API Settings or COINMARKETCAP_API_KEY before bulk refreshing logos."];
    await setAdminSetting("last_cmc_bulk_refresh_summary", bulkSummary("CoinMarketCap", 0, 0, errors));
    revalidatePath("/admin");
    revalidatePath("/admin/logos");
    redirect("/admin/logos?provider=coinmarketcap&errors=1");
  }

  const logos = (await listLogosForCoinGeckoBulk()).rows;
  let refreshed = 0;
  let missing = 0;
  const errors: string[] = [];

  for (const logo of logos) {
    const cmcId = typeof logo.coinmarketcap_id === "string" ? logo.coinmarketcap_id.trim() : "";
    if (!cmcId) {
      missing += 1;
      continue;
    }
    try {
      const source = await fetchCoinMarketCapLogoSource(cmcId);
      await upsertLogoSource({ logoId: logo.id, provider: "coinmarketcap", ...source, metadata: { ...source.metadata, bulkRefresh: true }, status: "candidate" });
      await updateLogoProviderId(logo.slug, "coinmarketcap", cmcId);
      await updateLogoFetchState(logo.slug, "coinmarketcap", null);
      refreshed += 1;
    } catch (error) {
      const message = explainProviderError("CoinMarketCap", error);
      errors.push(`${logo.slug}: ${message}`);
      await updateLogoFetchState(logo.slug, "coinmarketcap", message);
    }
  }

  await setAdminSetting("last_cmc_bulk_refresh_summary", bulkSummary("CoinMarketCap", refreshed, missing, errors));
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  const params = new URLSearchParams({ provider: "coinmarketcap", refreshed: String(refreshed), missing: String(missing), errors: String(errors.length) });
  for (const message of errors.slice(0, 3)) params.append("error", message);
  redirect(`/admin/logos?${params.toString()}`);
}

async function uploadToBlob(file: File, pathname: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is missing; uploads are disabled.");
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) redirectLogoNotice(logo.slug, "warning", "Blob token missing; upload is disabled until storage is configured.");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) redirectLogoNotice(logo.slug, "error", "Choose a logo file to upload.");
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) redirectLogoNotice(logo.slug, "error", "Only PNG, JPEG or WebP raster uploads are enabled.");
    if (file.size > 500_000) redirectLogoNotice(logo.slug, "error", "Logo upload is too large. Use a raster file under 500 KB.");
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const blobUrl = await uploadToBlob(file, `admin-logos/${logo.slug}/${Date.now()}-${safeName}`);
    await addLogoSource({ logoId: logo.id, provider: "upload", imageUrl: blobUrl, blobUrl, sourceUrl: null, metadata: { fileName: file.name, size: file.size, type: file.type } });
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
    redirect("/admin/logos?scan=1&notice=success&message=Metric%20scan%20complete");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const message = expectedActionMessage(error, "Metric scan failed.");
    redirect(`/admin/logos?notice=error&message=${encodeURIComponent(message.slice(0, 180))}`);
  }
}

export async function saveProviderIdsAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoProviderId(slug, "coingecko", String(formData.get("coinGeckoId") || "").trim());
  await updateLogoProviderId(slug, "coinmarketcap", String(formData.get("coinMarketCapId") || "").trim());
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Provider IDs saved.");
}

export async function saveFallbackAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoFallback(slug, String(formData.get("fallbackText") || "").trim(), String(formData.get("fallbackColor") || "").trim());
  revalidatePath(`/admin/logos/${slug}`);
  redirectLogoNotice(slug, "success", "Fallback saved.");
}

export async function markVisualRejectedAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(slug, "needs_review", "rejected", String(formData.get("reason") || "Visual rejected in admin review"));
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Logo marked visually rejected.");
}

export async function markNeedsReviewAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(slug, "needs_review", null, "Marked needs review in admin operations.");
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", "Logo marked needs review.");
}

export async function saveBrandSettingsAction(formData: FormData) {
  await requireAdmin();
  const textFields = ["siteName", "shortName", "mainSlogan", "heroSubtitle", "supportingCopy", "cardFooterText", "createdWithText", "metaDescription", "heroLogoOffsetX", "heroLogoMaxWidth", "heroLogoSpacing", "heroSloganFontSize", "heroSloganFontWeight", "heroSloganLineHeight", "heroSubtitleSize", "heroSubtitleOpacity", "heroSubtitleVisible"];
  const assetFields = ["primaryLogo", "darkLogo", "iconMark", "headerLogo", "favicon", "appleTouchIcon", "xAvatar", "xBanner", "watermarkMark"];
  const settings: Record<string, unknown> = Object.fromEntries(textFields.map((field) => [field, String(formData.get(field) || "").trim().replace(/on-chain/gi, "onchain")]));
  const assetMetadata: Record<string, Record<string, unknown>> = {};
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  try {
    for (const field of assetFields) {
      const reset = formData.get(`${field}Reset`) === "1";
      const manualUrl = reset ? "" : String(formData.get(field) || "").trim();
      const file = formData.get(`${field}File`);
      settings[field] = manualUrl;
      if (manualUrl) assetMetadata[field] = { provider: "manual-url", kind: field, url: manualUrl };
      if (file instanceof File && file.size > 0) {
        if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error(`BLOB_READ_WRITE_TOKEN is missing; ${field} upload is disabled.`);
        if (!allowedTypes.has(file.type)) throw new Error(`${field}: only PNG, JPEG and WebP uploads are enabled. SVG upload remains disabled until sanitization exists.`);
        const maxSize = field === "xBanner" ? 2_000_000 : 500_000;
        if (file.size > maxSize) throw new Error(`${field}: file is too large. Limit is ${field === "xBanner" ? "2 MB" : "500 KB"}.`);
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const url = await uploadToBlob(file, `brand-assets/${field}/${Date.now()}-${safeName}`);
        settings[field] = url;
        assetMetadata[field] = { provider: "upload", kind: field, fileSize: file.size, mimeType: file.type, uploadedAt: new Date().toISOString(), url };
      }
      if (reset) assetMetadata[field] = { provider: "disabled", kind: field };
    }
    await setAdminSetting("brand_settings", JSON.stringify({ ...settings, assetMetadata, savedAt: new Date().toISOString() }));
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath("/admin/brand");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Brand settings save failed", error);
    const message = error instanceof Error ? error.message : "Unknown save error";
    redirect(`/admin/brand?error=${encodeURIComponent(message.slice(0, 160))}`);
  }
  redirect("/admin/brand?saved=1");
}

export async function importLocalVaultSourceAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const logo = await upsertLogo(String(formData.get("name") || slug), String(formData.get("category") || "project"));
  const entry = logoSourceManifest.find((item) => item.slug === slug && item.category === logo.category) || logoSourceManifest.find((item) => item.slug === slug);
  if (!entry) redirectLogoNotice(slug, "error", "No local vault source found for this logo.");
  const sources = (await getAllLogoSources()).rows.filter((row) => row.logo_id === logo.id);
  const localWasRejected = sources.some((source) => source.status === "rejected" && (source.image_url === entry.localPath || sourceMetadata(source).localPath === entry.localPath));
  const localVaultSafe = entry.approvalStatus === "approved" && !entry.visualRejected && !entry.fallbackPreferredUntilManualAsset && !localWasRejected && !hasAdminChosenSource(sources);
  await upsertLogoSource({
    logoId: logo.id,
    provider: entry.sourceProvider,
    imageUrl: entry.localPath,
    sourceUrl: entry.sourceUrl || entry.localPath,
    metadata: { approvalOrigin: "local-vault", reviewStatus: localVaultSafe ? "selected_needs_review" : "candidate", sourceProvider: entry.sourceProvider, sha256: entry.sha256, localPath: entry.localPath, sourceUrl: entry.sourceUrl ?? null, approvalStatus: entry.approvalStatus },
    status: entry.approvalStatus === "rejected" || localWasRejected ? "rejected" : "candidate",
  });
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  redirectLogoNotice(slug, "success", localVaultSafe ? "Local vault source imported; mark reviewed if it looks correct." : "Local vault source imported as candidate.");
}

export async function approveSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  try {
    await approveSource(sourceId);
    revalidatePath(`/admin/logos/${slug}`);
    revalidatePath("/admin/logos");
    revalidatePath("/");
    revalidatePath("/api/chain-revenue");
    redirectLogoNotice(slug, "success", "Source approved.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLogoNotice(slug, "error", expectedActionMessage(error, "Source approval failed."));
  }
}

export async function rejectSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "");
  await rejectSource(sourceId, reason);
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


function parseApiProvider(value: FormDataEntryValue | null): ApiProviderId | null {
  const provider = String(value || "").trim();
  return provider === "coingecko" || provider === "coinmarketcap" || provider === "defillama" ? provider : null;
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
    adminNotice("/admin/api", "warning", expectedActionMessage(error, "API key could not be saved."));
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
    adminNotice("/admin/api", "error", expectedActionMessage(error, "API key could not be deleted."));
  }
}

export async function testApiKeyAction(formData: FormData) {
  await requireAdmin();
  const provider = parseApiProvider(formData.get("provider"));
  if (!provider) adminNotice("/admin/api", "error", "Unknown API provider.");
  try {
    const resolved = await resolveApiSecret(provider);
    if (provider !== "defillama" && !resolved.value) throw new Error(`${providerEnvVar(provider)} is missing.`);
    let response: Response;
    if (provider === "coingecko") {
      response = await fetch("https://api.coingecko.com/api/v3/ping", { headers: await coinGeckoHeaders(false), cache: "no-store" });
    } else if (provider === "coinmarketcap") {
      response = await fetch("https://pro-api.coinmarketcap.com/v1/key/info", { headers: await coinMarketCapHeaders(), cache: "no-store" });
    } else {
      response = await fetch("https://api.llama.fi/protocols", { headers: { accept: "application/json", ...(resolved.value ? { authorization: `Bearer ${resolved.value}` } : {}) }, cache: "no-store" });
    }
    if (!response.ok) throw new Error(`${provider} test failed (${response.status}).`);
    if (resolved.source === "admin") await setAdminApiSecretTestResult(provider, true, null);
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "success", "API key test succeeded.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const providerForUpdate = parseApiProvider(formData.get("provider"));
    const message = expectedActionMessage(error, "API key test failed.");
    if (providerForUpdate && !message.startsWith("NEXT_REDIRECT")) await setAdminApiSecretTestResult(providerForUpdate, false, message.slice(0, 180));
    revalidatePath("/admin/api");
    adminNotice("/admin/api", "error", message);
  }
}
