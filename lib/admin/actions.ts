"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminPassword, createSession, validateAdminPassword, requireAdmin, clearSession } from "@/lib/admin/auth";
import { addLogoSource, approveSource, getLogo, rejectLogo, rejectSource, upsertLogo } from "@/lib/admin/logoDb";

async function ensureLogoFromForm(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "project").trim() || "project";
  if (!name) throw new Error("Logo name is required.");
  return upsertLogo(name, category);
}

export async function setupAdminAction(formData: FormData) {
  const token = String(formData.get("setupToken") || "");
  if (process.env.ADMIN_SETUP_TOKEN && token !== process.env.ADMIN_SETUP_TOKEN) throw new Error("Invalid setup token.");
  const password = String(formData.get("password") || "");
  if (password.length < 10) throw new Error("Use an admin password with at least 10 characters.");
  await createAdminPassword(password);
  createSession();
  redirect("/admin/logos");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!(await validateAdminPassword(password))) throw new Error("Invalid admin password.");
  createSession();
  redirect("/admin/logos");
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

export async function addCoinGeckoAction(formData: FormData) {
  const logo = await ensureLogoFromForm(formData);
  const coinId = String(formData.get("coinGeckoId") || "").trim();
  let imageUrl = "";
  let sourceUrl = "";
  let metadata: Record<string, unknown> = { coinId };
  if (coinId) {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`CoinGecko lookup failed (${response.status}).`);
    const json = await response.json();
    imageUrl = json.image?.large || json.image?.small || json.image?.thumb || "";
    sourceUrl = json.links?.homepage?.find(Boolean) || `https://www.coingecko.com/en/coins/${coinId}`;
    metadata = { coinId, symbol: json.symbol, name: json.name };
  }
  if (!imageUrl) throw new Error("CoinGecko did not return an image URL.");
  await addLogoSource({ logoId: logo.id, provider: "coingecko", imageUrl, sourceUrl, metadata });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
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
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const blobUrl = await uploadToBlob(file, `admin-logos/${logo.slug}/${Date.now()}-${safeName}`);
  await addLogoSource({ logoId: logo.id, provider: "upload", imageUrl: blobUrl, blobUrl, sourceUrl: null, metadata: { fileName: file.name, size: file.size, type: file.type } });
  revalidatePath(`/admin/logos/${logo.slug}`);
  redirect(`/admin/logos/${logo.slug}`);
}

export async function approveSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  await approveSource(sourceId);
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
}

export async function rejectSourceAction(formData: FormData) {
  await requireAdmin();
  const sourceId = String(formData.get("sourceId") || "");
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "");
  await rejectSource(sourceId, reason);
  revalidatePath(`/admin/logos/${slug}`);
}

export async function rejectLogoAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") || "");
  const reason = String(formData.get("reason") || "");
  await rejectLogo(slug, reason);
  revalidatePath(`/admin/logos/${slug}`);
  revalidatePath("/admin/logos");
}
