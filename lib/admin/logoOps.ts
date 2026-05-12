import "server-only";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
import { execSql, isDatabaseConfigured } from "./db";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]);
const SAFE_UPLOAD_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
const MAX_FILE_SIZE = 500 * 1024;
const MAX_REMOTE_SIZE = 1024 * 1024;

export async function approveLogoAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  await mutateLogo(slug, "update logos set status = 'approved', visual_status = 'accepted', approved_at = now(), updated_at = now() where slug = $1", [slug]);
  redirect(`/admin/logos/${slug}`);
}

export async function rejectLogoAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "Rejected during admin review.");
  await mutateLogo(slug, "update logos set status = 'rejected', rejected_reason = $2, updated_at = now() where slug = $1", [slug, reason]);
  redirect(`/admin/logos/${slug}`);
}

export async function markVisualRejectedAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "Visual rejected during admin review.");
  await mutateLogo(slug, "update logos set visual_status = 'visual_rejected', status = 'needs_review', rejected_reason = $2, updated_at = now() where slug = $1", [slug, reason]);
  redirect(`/admin/logos/${slug}`);
}

export async function markNeedsReviewAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  await mutateLogo(slug, "update logos set status = 'needs_review', visual_status = 'needs_review', updated_at = now() where slug = $1", [slug]);
  redirect(`/admin/logos/${slug}`);
}

export async function updateLogoMetadataAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const coingeckoId = nullable(String(formData.get("coingeckoId") || ""));
  const defillamaSlug = nullable(String(formData.get("defillamaSlug") || ""));
  const aliases = String(formData.get("aliases") || "").split(",").map((alias) => alias.trim()).filter(Boolean);
  const notes = nullable(String(formData.get("notes") || ""));
  await mutateLogo(slug, "update logos set coingecko_id = $2, defillama_slug = $3, aliases = $4::jsonb, notes = $5, updated_at = now() where slug = $1", [slug, coingeckoId, defillamaSlug, aliases, notes]);
  redirect(`/admin/logos/${slug}`);
}

export async function updateFallbackAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const text = nullable(String(formData.get("fallbackText") || ""));
  const color = nullable(String(formData.get("fallbackColor") || ""));
  await mutateLogo(slug, "update logos set fallback_text = $2, fallback_color = $3, visual_status = 'fallback', updated_at = now() where slug = $1", [slug, text, color]);
  redirect(`/admin/logos/${slug}`);
}

export async function refreshCoinGeckoAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const coingeckoId = String(formData.get("coingeckoId") || "");
  if (!process.env.COINGECKO_DEMO_API_KEY || !coingeckoId) redirect(`/admin/logos/${slug}?message=coingecko-missing`);
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, {
    headers: { accept: "application/json", "x-cg-demo-api-key": process.env.COINGECKO_DEMO_API_KEY },
    cache: "no-store",
  });
  if (!response.ok) redirect(`/admin/logos/${slug}?message=coingecko-not-found`);
  const json = await response.json();
  const imageUrl = json?.image?.large || json?.image?.small || json?.image?.thumb;
  if (!imageUrl) redirect(`/admin/logos/${slug}?message=coingecko-no-image`);
  await saveRemoteCandidate(slug, "coingecko", imageUrl, `CoinGecko coin image for ${coingeckoId}.`);
  redirect(`/admin/logos/${slug}?message=coingecko-candidate`);
}

export async function refreshDefiLlamaAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const defillamaSlug = String(formData.get("defillamaSlug") || slug);
  const candidates = [`https://icons.llama.fi/chains/rsz_${defillamaSlug}.jpg`, `https://icons.llama.fi/${defillamaSlug}.jpg`];
  for (const url of candidates) {
    try {
      await saveRemoteCandidate(slug, "defillama", url, `DefiLlama candidate for ${defillamaSlug}.`);
      redirect(`/admin/logos/${slug}?message=defillama-candidate`);
    } catch {}
  }
  redirect(`/admin/logos/${slug}?message=defillama-failed`);
}

export async function addManualSourceUrlAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const url = String(formData.get("sourceUrl") || "").trim();
  if (!url) redirect(`/admin/logos/${slug}`);
  try {
    await saveRemoteCandidate(slug, "manual-url", url, "Manual source URL added by admin.");
  } catch {
    if (isDatabaseConfigured()) {
      await execSql("update logos set source_provider = 'manual-url', source_url = $2, source_note = 'Manual URL was not a directly downloadable safe image; kept as a source note only.', updated_at = now() where slug = $1", [slug, url]);
    }
  }
  redirect(`/admin/logos/${slug}?message=manual-url`);
}

export async function uploadLogoAction(formData: FormData) {
  "use server";
  requireAdmin();
  const slug = String(formData.get("slug") || "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`/admin/logos/${slug}`);
  if (file.size > MAX_FILE_SIZE || !SAFE_UPLOAD_TYPES.has(file.type)) redirect(`/admin/logos/${slug}?message=upload-rejected`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveBufferCandidate(slug, "manual-upload", file.name, file.type, buffer, "Manual upload by admin. SVG upload is disabled until sanitization is implemented.");
  redirect(`/admin/logos/${slug}?message=upload-candidate`);
}

async function saveRemoteCandidate(slug: string, provider: string, url: string, note: string) {
  if (!isDatabaseConfigured()) return;
  const response = await fetch(url, { headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,*/*" }, cache: "no-store" });
  const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() || "";
  const length = Number(response.headers.get("content-length") || 0);
  if (!response.ok || !ALLOWED_IMAGE_TYPES.has(contentType) || length > MAX_REMOTE_SIZE) throw new Error("Remote source is not an allowed image candidate.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_REMOTE_SIZE) throw new Error("Remote image is too large.");
  await saveBufferCandidate(slug, provider, url, contentType, buffer, note);
}

async function saveBufferCandidate(slug: string, provider: string, sourceUrl: string, mimeType: string, buffer: Buffer, note: string) {
  if (!isDatabaseConfigured()) return;
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const rawUrl = await putBlobLike(`logos/raw/${slug}-${sha256.slice(0, 12)}${extensionFor(mimeType)}`, buffer, mimeType);
  const optimizedUrl = mimeType === "image/svg+xml" ? null : rawUrl;
  await execSql(`update logos set source_provider = $2, source_url = $3, source_note = $4, raw_url = $5, optimized_url = $6, blob_raw_url = $5, blob_optimized_url = $6, sha256 = $7, file_size = $8, mime_type = $9, status = 'needs_review', visual_status = 'needs_review', last_synced_at = now(), updated_at = now() where slug = $1`, [slug, provider, sourceUrl, note, rawUrl, optimizedUrl, sha256, buffer.byteLength, mimeType]);
  await execSql(`insert into logo_sources (logo_id, provider, source_url, source_note, status, raw_url, optimized_url, sha256, file_size, mime_type) select id, $2, $3, $4, 'downloaded', $5, $6, $7, $8, $9 from logos where slug = $1`, [slug, provider, sourceUrl, note, rawUrl, optimizedUrl, sha256, buffer.byteLength, mimeType]);
}

async function putBlobLike(path: string, buffer: Buffer, mimeType: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const response = await fetch(`https://blob.vercel-storage.com/${path}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`, "content-type": mimeType, "x-api-version": "6" },
    body: buffer as unknown as BodyInit,
  });
  if (!response.ok) return null;
  const json = await response.json().catch(() => null);
  return json?.url || null;
}

async function mutateLogo(slug: string, sql: string, params: unknown[]) {
  if (!slug || !isDatabaseConfigured()) return;
  await execSql(sql, params);
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".jpg";
}
