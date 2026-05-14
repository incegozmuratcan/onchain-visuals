"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminPassword, createSession, validateAdminPassword, requireAdmin, clearSession, getAdminConfigDiagnostic } from "@/lib/admin/auth";
import { addLogoSource, approveSource, autoApproveSource, canAutoApproveCoinGecko, getAllLogoSources, listLogosForCoinGeckoBulk, rejectLogo, rejectSource, setAdminSetting, updateLogoFallback, updateLogoFetchState, updateLogoProviderId, updateLogoStatus, upsertLogo, upsertLogoSource } from "@/lib/admin/logoDb";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { logoManifestBySlug } from "@/lib/logos/logoRegistry";
import { runMetricLogoDiscovery } from "@/lib/admin/metricLogoScanner";

async function ensureLogoFromForm(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "project").trim() || "project";
  if (!name) throw new Error("Logo name is required.");
  return upsertLogo(name, category);
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

function explainProviderError(provider: string, error: unknown) {
  const message = error instanceof Error ? error.message : `Unknown ${provider} error`;
  if (message.includes("429")) return `${message} — Retry later / rate limited.`;
  if (message.includes("404")) return `${message} — Fix provider ID or use manual URL.`;
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
  if (!/^https:\/\//.test(imageUrl)) throw new Error("Manual logo URL must be HTTPS.");
  await addLogoSource({ logoId: logo.id, provider: "manual", imageUrl, sourceUrl: imageUrl, metadata: { submittedBy: "admin" } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

export async function addDefiLlamaAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const slug = String(formData.get("providerSlug") || logo.slug).trim();
  const imageUrl = `https://icons.llama.fi/${encodeURIComponent(slug)}.jpg`;
  await addLogoSource({ logoId: logo.id, provider: "defillama", imageUrl, sourceUrl: `https://defillama.com/protocol/${slug}`, metadata: { slug } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

function coinGeckoHeaders(requireKey = false) {
  const apiKey = process.env.COINGECKO_DEMO_API_KEY;
  if (requireKey && !apiKey) throw new Error("COINGECKO_DEMO_API_KEY is missing. Add it as a server secret before bulk refreshing CoinGecko logos.");
  return {
    accept: "application/json",
    ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
  };
}

async function fetchCoinGeckoLogoSource(coinId: string, requireKey = false) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
    { headers: coinGeckoHeaders(requireKey) }
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
  if (!coinId) throw new Error("CoinGecko coin id is required.");
  const source = await fetchCoinGeckoLogoSource(coinId);
  const sources = (await getAllLogoSources()).rows.filter((row) => row.logo_id === logo.id);
  const auto = canAutoApproveCoinGecko(logo, sources, source.imageUrl, source.sourceUrl);
  const created = await upsertLogoSource({ logoId: logo.id, provider: "coingecko", ...source, metadata: { ...source.metadata, approvalOrigin: auto.ok ? "auto" : "candidate", autoApproveReason: auto.reason }, status: auto.ok ? "approved" : "candidate" });
  if (auto.ok) await autoApproveSource(created.id);
  await updateLogoProviderId(logo.slug, "coingecko", coinId);
  await updateLogoFetchState(logo.slug, "coingecko", null);
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

function isLogoVisuallyRejected(slug: string, category: string) {
  const registry = logoManifestBySlug.get(`${category}:${slug}`);
  return Boolean(registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset);
}

export async function bulkRefreshCoinGeckoLogosAction() {
  await requireAdmin();
  if (!process.env.COINGECKO_DEMO_API_KEY) {
    const errors = ["COINGECKO_DEMO_API_KEY is missing. Add it as a server secret before bulk refreshing CoinGecko logos."];
    await setAdminSetting("last_coingecko_bulk_refresh_summary", bulkSummary("CoinGecko", 0, 0, errors));
    revalidatePath("/admin");
    revalidatePath("/admin/logos");
    redirect("/admin/logos?provider=coingecko&errors=1");
  }
  const logos = (await listLogosForCoinGeckoBulk()).rows;
  let refreshed = 0;
  let missing = 0;
  let autoApproved = 0;
  let candidates = 0;
  let skippedAdminApproved = 0;
  let skippedVisualRejected = 0;
  let skippedPreviousRejected = 0;
  const errors: string[] = [];
  const autoApprovedList: string[] = [];
  const candidateList: string[] = [];
  const skippedReasons: string[] = [];
  const allSources = (await getAllLogoSources()).rows;
  const sourcesByLogo = new Map<string, typeof allSources>();
  for (const source of allSources) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);

  for (const logo of logos) {
    const coinId = (typeof logo.coingecko_id === "string" && logo.coingecko_id.trim()) || getCoinGeckoLogoId(logo.slug);
    if (!coinId) {
      missing += 1;
      continue;
    }

    try {
      const source = await fetchCoinGeckoLogoSource(coinId, true);
      const existingSources = sourcesByLogo.get(logo.id) ?? [];
      const auto = canAutoApproveCoinGecko(logo, existingSources, source.imageUrl, source.sourceUrl);
      const created = await upsertLogoSource({
        logoId: logo.id,
        provider: "coingecko",
        ...source,
        metadata: {
          ...source.metadata,
          bulkRefresh: true,
          visuallyRejected: isLogoVisuallyRejected(logo.slug, logo.category),
          approvalOrigin: auto.ok ? "auto" : "candidate",
          autoApproveReason: auto.reason,
        },
        status: auto.ok ? "approved" : "candidate",
      });
      if (auto.ok) {
        await autoApproveSource(created.id);
        autoApproved += 1;
        autoApprovedList.push(`${logo.slug} (${coinId})`);
      } else if (auto.reason.includes("admin-approved")) {
        skippedAdminApproved += 1;
        candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (auto.reason.includes("previously rejected")) {
        skippedPreviousRejected += 1;
        candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else if (auto.reason.includes("visual") || auto.reason.includes("BSV")) {
        skippedVisualRejected += 1;
        candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      } else {
        candidates += 1;
        candidateList.push(`${logo.slug} (${coinId})`);
        skippedReasons.push(`${logo.slug}: ${auto.reason}`);
      }
      await updateLogoFetchState(logo.slug, "coingecko", null);
      refreshed += 1;
    } catch (error) {
      const message = explainProviderError("CoinGecko", error);
      errors.push(`${logo.slug}: ${message}`);
      await updateLogoFetchState(logo.slug, "coingecko", message);
    }
  }

  if (errors.length) {
    console.warn("Bulk CoinGecko logo refresh completed with partial failures", {
      refreshed,
      missingMappings: missing,
      errors: errors.slice(0, 5),
      errorCount: errors.length,
    });
  }

  await setAdminSetting("last_coingecko_bulk_refresh_summary", bulkSummary("CoinGecko", refreshed, missing, errors, {
    fetched: refreshed,
    autoApproved,
    candidates,
    skippedExistingAdminApproved: skippedAdminApproved,
    skippedAdminApproved,
    skippedVisualRejected,
    skippedPreviousRejected,
    autoApprovedList: autoApprovedList.slice(0, 25),
    candidateList: candidateList.slice(0, 25),
    firstSkippedReasons: skippedReasons.slice(0, 10),
  }));
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  const params = new URLSearchParams({
    refreshed: String(refreshed),
    missing: String(missing),
    errors: String(errors.length),
    autoApproved: String(autoApproved),
    candidates: String(candidates),
  });
  for (const message of errors.slice(0, 3)) params.append("error", message);
  redirect(`/admin/logos?${params.toString()}`);
}

function coinMarketCapHeaders() {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) throw new Error("COINMARKETCAP_API_KEY is missing. Add it as a server secret before using CoinMarketCap logo fetch.");
  return {
    accept: "application/json",
    "X-CMC_PRO_API_KEY": apiKey,
  };
}

async function fetchCoinMarketCapLogoSource(cmcId: string) {
  const response = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${encodeURIComponent(cmcId)}`, {
    headers: coinMarketCapHeaders(),
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
  if (!cmcId) throw new Error("CoinMarketCap ID is required.");
  const source = await fetchCoinMarketCapLogoSource(cmcId);
  await addLogoSource({ logoId: logo.id, provider: "coinmarketcap", ...source });
  await updateLogoProviderId(logo.slug, "coinmarketcap", cmcId);
  await updateLogoFetchState(logo.slug, "coinmarketcap", null);
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

export async function bulkRefreshCoinMarketCapLogosAction() {
  await requireAdmin();
  if (!process.env.COINMARKETCAP_API_KEY) {
    const errors = ["COINMARKETCAP_API_KEY is missing. Add it as a server secret before bulk refreshing CoinMarketCap logos."];
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
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a logo file to upload.");
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowedTypes.has(file.type)) throw new Error("Only PNG, JPEG or WebP raster logo uploads are enabled. SVG upload remains disabled until sanitization is implemented.");
  if (file.size > 500_000) throw new Error("Logo upload is too large. Use a raster file under 500 KB.");
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const blobUrl = await uploadToBlob(file, `admin-logos/${logo.slug}/${Date.now()}-${safeName}`);
  await addLogoSource({ logoId: logo.id, provider: "upload", imageUrl: blobUrl, blobUrl, sourceUrl: null, metadata: { fileName: file.name, size: file.size, type: file.type } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

export async function scanMetricLogosAction() {
  await requireAdmin();
  await runMetricLogoDiscovery(30);
  revalidatePath("/admin");
  revalidatePath("/admin/logos");
  redirect("/admin/logos?scan=1");
}

export async function saveProviderIdsAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoProviderId(slug, "coingecko", String(formData.get("coinGeckoId") || "").trim());
  await updateLogoProviderId(slug, "coinmarketcap", String(formData.get("coinMarketCapId") || "").trim());
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
}

export async function saveFallbackAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoFallback(slug, String(formData.get("fallbackText") || "").trim(), String(formData.get("fallbackColor") || "").trim());
  revalidatePath(`/admin/logos/${slug}`);
}

export async function markVisualRejectedAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(slug, "needs_review", "rejected", String(formData.get("reason") || "Visual rejected in admin review"));
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
}

export async function markNeedsReviewAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  await updateLogoStatus(slug, "needs_review", null, "Marked needs review in admin operations.");
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
}

export async function saveBrandSettingsAction(formData: FormData) {
  await requireAdmin();
  const textFields = ["siteName", "shortName", "mainSlogan", "heroSubtitle", "supportingCopy", "cardFooterText", "createdWithText", "metaDescription"];
  const assetFields = ["primaryLogo", "darkLogo", "iconMark", "headerLogo", "favicon", "appleTouchIcon", "xAvatar", "xBanner", "watermarkMark"];
  const settings: Record<string, unknown> = Object.fromEntries(textFields.map((field) => [field, String(formData.get(field) || "").trim()]));
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
    console.error("Brand settings save failed", error);
    const message = error instanceof Error ? error.message : "Unknown save error";
    redirect(`/admin/brand?error=${encodeURIComponent(message.slice(0, 160))}`);
  }
  redirect("/admin/brand?saved=1");
}

export async function approveSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  await approveSource(sourceId);
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
  revalidatePath("/");
  revalidatePath("/api/chain-revenue");
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
}
