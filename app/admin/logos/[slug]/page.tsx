import Link from "next/link";
import { AdminShell, AdminStatusPill } from "@/components/admin/AdminPrimitives";
import { notFound } from "next/navigation";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { addCoinGeckoAction, addCoinMarketCapAction, addDefiLlamaAction, addManualUrlAction, approveSourceAction, markNeedsReviewAction, markVisualRejectedAction, rejectLogoAction, rejectSourceAction, saveFallbackAction, saveProviderIdsAction, uploadLogoAction } from "@/lib/admin/actions";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { approvedLogoCandidateSlugs, getLogo, getLogoSources } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { classifyLogoQa, getCoinMarketCapId } from "@/lib/admin/logoQa";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const text = safeString(status) || "unknown";
  const tone = text.startsWith("approved") ? "green" : text === "rejected" ? "red" : "amber";
  return <AdminStatusPill tone={tone}>{text.replace("_", " ")}</AdminStatusPill>;
}
function safeString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return "[unrenderable]"; }
}
function safeUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) return text;
  return null;
}
function Img({ src, size = 32 }: { src?: string | null; size?: number }) { const safeSrc = safeUrl(src); return <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">{safeSrc ? <img src={safeSrc} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] font-black text-slate-300">—</span>}</div>; }
function KV({ k, v }: { k: string; v?: unknown }) { const text = safeString(v); return <div className="grid grid-cols-[132px_1fr] gap-2 border-b border-slate-100 py-1.5 text-xs"><dt className="font-black uppercase tracking-[0.08em] text-slate-400">{k}</dt><dd className="min-w-0 truncate font-bold text-slate-800" title={text || ""}>{text || "—"}</dd></div>; }
function metadataObject(metadata: unknown): Record<string, unknown> { if (typeof metadata === "string") { try { const parsed = JSON.parse(metadata); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return { parseWarning: "Metadata was not valid JSON", raw: metadata }; } } return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {}; }
function metadataText(metadata: unknown) { try { return JSON.stringify(metadataObject(metadata), null, 2); } catch { return JSON.stringify({ parseWarning: "Metadata could not be rendered" }, null, 2); } }
function sourceStatusLabel(source: { provider?: unknown; status?: unknown; metadata: unknown }) {
  const meta = metadataObject(source.metadata);
  const status = safeString(source.status) || "unknown";
  const provider = safeString(source.provider) || "unknown";
  if (status !== "approved") return status;
  if (meta.autoApproved || meta.approvalOrigin === "auto") return "approved · auto";
  if (meta.approvalOrigin === "local-vault" || meta.approvalOrigin === "local vault" || meta.seededFrom === "local-vault") return "approved · local vault";
  if (provider === "manual" || provider === "upload" || meta.approvalOrigin === "admin") return "approved · admin";
  return "approved";
}

export default async function LogoDetailPage({ params }: { params: { slug: string } }) {
  await requireAdmin();
  const logoResult = await safeAdminDbQuery("Logo record", () => getLogo(params.slug), null);
  const logo = logoResult.data;
  if (!logo && !logoResult.error) notFound();
  const sourceResult = logo ? await safeAdminDbQuery("Logo sources", async () => (await getLogoSources(logo.id)).rows, []) : { data: [], error: null };
  const sources = sourceResult.data;
  const dbErrors = [logoResult.error, sourceResult.error].filter(Boolean);
  const config = adminConfigState();
  if (!logo) return <AdminShell active="logos" title="Logo detail" max="max-w-6xl"><Link href="/admin/logos" className="text-sm font-black text-slate-500">← Back to logos</Link><AdminDbErrorPanel errors={dbErrors} /></AdminShell>;

  const coinGeckoId = logo.coingecko_id || getCoinGeckoLogoId(logo.slug);
  const coinMarketCapId = getCoinMarketCapId(logo, sources);
  const preview = safeUrl(logo.approved_logo_url) || safeUrl(logo.fallback_logo_url);
  const approvedSource = sources.find((source) => source.id === logo.approved_source_id) ?? null;
  const overlaySlugs = approvedLogoCandidateSlugs(logo.name);
  const qa = classifyLogoQa(logo, sources, config.hasBlob);
  const bestCandidate = sources.find((source) => source.status === "candidate");
  const hidden = <><input type="hidden" name="name" value={safeString(logo.name) || ""} /><input type="hidden" name="category" value={safeString(logo.category) || ""} /></>;

  return <AdminShell active="logos" title={safeString(logo.name) || "Logo detail"} subtitle={`${safeString(logo.slug) || "unknown"} · ${safeString(logo.category) || "uncategorized"}`} max="max-w-[1500px]" sticky headerExtra={<div className="mt-1 flex flex-wrap items-center gap-1.5"><Link href="/admin/logos" className="text-xs font-black text-slate-500">← logos</Link><Img src={preview} size={28} /><StatusBadge status={safeString(logo.status) || "unknown"} /><span className="text-xs font-bold text-slate-400">CG {safeString(coinGeckoId) || "missing"}</span><span className="text-xs font-bold text-slate-400">CMC {safeString(coinMarketCapId) || "missing"}</span><span className="text-xs font-bold text-slate-400">approved {safeString(approvedSource?.provider) || "none"}</span></div>} >
    <AdminDbErrorPanel errors={dbErrors} />
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-2 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-amber-800">Next: {qa.recommendedAction}</span>{qa.issues.slice(0, 7).map((issue) => <AdminStatusPill key={issue} tone={issue === "visual_rejected" ? "red" : "amber"}>{issue.replaceAll("_", " ")}</AdminStatusPill>)}</div><div className="flex flex-wrap gap-2"><form action={addCoinGeckoAction}>{hidden}<input type="hidden" name="coinGeckoId" value={safeString(coinGeckoId) || ""} /><button disabled={!coinGeckoId} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40">Fetch CoinGecko</button></form><form action={addCoinMarketCapAction}>{hidden}<input type="hidden" name="coinMarketCapId" value={safeString(coinMarketCapId) || ""} /><button disabled={!coinMarketCapId || !process.env.COINMARKETCAP_API_KEY} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black disabled:opacity-40">Fetch CMC</button></form>{bestCandidate ? <form action={approveSourceAction}><input type="hidden" name="sourceId" value={bestCandidate.id} /><input type="hidden" name="slug" value={logo.slug} /><button className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">Approve best</button></form> : null}</div></div></section>

    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><div className="flex flex-wrap items-center gap-4 text-xs font-black text-slate-500"><span>Approved</span>{[24,32,48].map((s) => <Img key={`a${s}`} src={logo.approved_logo_url} size={s} />)}<span>Fallback</span>{[24,32,48].map((s) => <Img key={`f${s}`} src={logo.fallback_logo_url} size={s} />)}<div className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2"><Img src={preview} size={28} /><span>{safeString(logo.name) || "Logo"}</span><span className="text-slate-300">public row preview</span></div><div className="flex gap-2"><div className="rounded-xl bg-white p-2"><Img src={preview} /></div><div className="rounded-xl bg-slate-950 p-2"><Img src={preview} /></div></div></div></section>

    <section className="mt-3 grid gap-3 xl:grid-cols-[0.9fr_1.35fr_0.9fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="mb-2 font-black text-slate-950">Current state</h2><dl><KV k="approved_logo_url" v={logo.approved_logo_url} /><KV k="approved_source_id" v={logo.approved_source_id} /><KV k="status" v={logo.status} /><KV k="visual_status" v={logo.visual_status} /><KV k="coingecko_id" v={logo.coingecko_id} /><KV k="coinmarketcap_id" v={logo.coinmarketcap_id} /><KV k="last_fetch_provider" v={logo.last_fetch_provider} /><KV k="last_fetch_error" v={logo.last_fetch_error} /><KV k="last_fetch_at" v={logo.last_fetch_at} /><KV k="fallback_text" v={logo.fallback_text} /><KV k="fallback_color" v={logo.fallback_color} /></dl><details className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><summary className="cursor-pointer font-black text-slate-950">Public overlay debug</summary><dl className="mt-2"><KV k="approved provider" v={approvedSource?.provider} /><KV k="approval origin" v={String(metadataObject(approvedSource?.metadata).approvalOrigin || metadataObject(approvedSource?.metadata).approvalStatus || "admin/manual")} /><KV k="candidate slugs" v={overlaySlugs.join(", ")} /><KV k="public DB URL" v={logo.approved_logo_url} /><KV k="would match row" v={overlaySlugs.includes(logo.slug) ? "yes" : "alias-only"} /></dl></details></section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft"><div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Sources</div>{sources.map((source) => { const src = safeUrl(source.blob_url) || safeUrl(source.image_url); const meta = metadataObject(source.metadata); const sourceHref = safeUrl(source.source_url) || safeUrl(source.image_url); const imageHref = safeUrl(source.image_url); return <div key={source.id} className="grid gap-2 border-b border-slate-100 p-3 text-xs md:grid-cols-[42px_90px_1fr_150px] md:items-center"><Img src={src} size={36} /><div><div className="font-black text-slate-950">{safeString(source.provider) || "unknown"}</div><StatusBadge status={sourceStatusLabel(source)} /></div><div className="min-w-0 font-bold text-slate-500">{sourceHref ? <a href={sourceHref} className="block truncate underline">Source: {sourceHref}</a> : <div className="block truncate text-slate-400">Source: —</div>}{imageHref ? <a href={imageHref} className="block truncate underline">Image: {imageHref}</a> : <div className="block truncate text-slate-400">Image: —</div>}{source.rejection_reason ? <div className="text-red-600">{safeString(source.rejection_reason)}</div> : null}<details className="mt-1"><summary className="cursor-pointer text-slate-400">metadata</summary><pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px]">{metadataText(source.metadata)}</pre></details></div><div className="grid gap-1">{source.status === "approved" ? <span className="rounded-lg bg-emerald-50 px-2 py-1 text-center font-black text-emerald-700">Active · reject/replace below</span> : <form action={approveSourceAction}><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="slug" value={logo.slug} /><button className="w-full rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white">Approve</button></form>}<form action={rejectSourceAction} className="grid gap-1"><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="slug" value={logo.slug} /><input name="reason" className="rounded-lg border border-slate-200 px-2 py-1" placeholder="Reject reason" /><button className="rounded-lg border border-slate-200 px-2 py-1 font-black">Reject</button></form></div></div>; })}{!sources.length ? <div className="p-6 text-center text-sm font-bold text-slate-500">No sources yet.</div> : null}</section>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Actions</h2><form action={saveProviderIdsAction} className="grid gap-2"><input type="hidden" name="slug" value={logo.slug} /><input name="coinGeckoId" defaultValue={safeString(coinGeckoId) || ""} className="rounded-xl border px-3 py-2 text-sm" placeholder="CoinGecko ID" /><input name="coinMarketCapId" defaultValue={safeString(coinMarketCapId) || ""} className="rounded-xl border px-3 py-2 text-sm" placeholder="CoinMarketCap ID" /><button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Save provider IDs</button></form><form action={addDefiLlamaAction} className="grid gap-2">{hidden}<input name="providerSlug" className="rounded-xl border px-3 py-2 text-sm" placeholder="DefiLlama slug" /><button className="rounded-xl border px-3 py-2 text-sm font-black">Add DefiLlama URL</button></form><form action={addManualUrlAction} className="grid gap-2">{hidden}<input name="imageUrl" className="rounded-xl border px-3 py-2 text-sm" placeholder="Manual https:// URL" /><button className="rounded-xl border px-3 py-2 text-sm font-black">Add manual URL</button></form><form action={saveFallbackAction} className="grid gap-2"><input type="hidden" name="slug" value={logo.slug} /><input name="fallbackText" defaultValue={safeString(logo.fallback_text) || ""} className="rounded-xl border px-3 py-2 text-sm" placeholder="Fallback text" /><input name="fallbackColor" defaultValue={safeString(logo.fallback_color) || ""} className="rounded-xl border px-3 py-2 text-sm" placeholder="#0f172a" /><button className="rounded-xl border px-3 py-2 text-sm font-black">Save fallback</button></form><form action={uploadLogoAction} className="grid gap-2">{hidden}<input name="file" type="file" accept="image/png,image/jpeg,image/webp" disabled={!config.hasBlob} className="text-xs disabled:opacity-40" /><button disabled={!config.hasBlob} className="rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40">Upload candidate</button></form><form action={markNeedsReviewAction}><input type="hidden" name="slug" value={logo.slug} /><button className="w-full rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">Mark needs review</button></form><details className="rounded-xl border border-red-200 bg-red-50 p-3"><summary className="cursor-pointer text-sm font-black text-red-900">Danger zone</summary><form action={markVisualRejectedAction} className="mt-2 grid gap-2"><input type="hidden" name="slug" value={logo.slug} /><input name="reason" className="rounded-lg border border-red-200 px-2 py-1 text-sm" placeholder="Visual rejection reason" /><button className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">Mark visual rejected</button></form><form action={rejectLogoAction} className="mt-2 grid gap-2"><input type="hidden" name="slug" value={logo.slug} /><input name="reason" className="rounded-lg border border-red-200 px-2 py-1 text-sm" placeholder="Reject entity reason" /><button className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">Reject logo entity</button></form></details></section>
    </section>
  </AdminShell>;
}
