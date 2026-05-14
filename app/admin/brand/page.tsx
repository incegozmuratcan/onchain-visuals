import Link from "next/link";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { saveBrandSettingsAction } from "@/lib/admin/actions";
import { blobStatus } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const ASSETS = [
  ["primaryLogo", "Primary logo", "Hero / generic brand"], ["darkLogo", "Dark logo", "Dark background preview"], ["iconMark", "Icon mark", "Compact icon"], ["headerLogo", "Header logo", "Public header"], ["favicon", "Favicon", "Browser icon"], ["appleTouchIcon", "Apple touch icon", "iOS home screen"], ["xAvatar", "X avatar", "Social profile"], ["xBanner", "X banner", "Social banner · 2 MB max"], ["watermarkMark", "Watermark", "Share card watermark"],
] as const;
const PUBLIC_FIELDS = new Set(["siteName", "shortName", "mainSlogan", "heroSubtitle", "cardFooterText", "createdWithText", "metaDescription", "headerLogo", "primaryLogo", "favicon", "watermarkMark"]);

function firstParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function Field({ name, label, value, textarea = false }: { name: string; label: string; value: string; textarea?: boolean }) {
  const className = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold";
  return <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label} {PUBLIC_FIELDS.has(name) ? <span className="text-emerald-600">· public</span> : <span className="text-slate-400">· preview</span>}{textarea ? <textarea name={name} defaultValue={value} className={className} rows={2} /> : <input name={name} defaultValue={value} className={className} />}</label>;
}
function AssetField({ name, label, usedWhere, value, uploadEnabled, meta }: { name: string; label: string; usedWhere: string; value: string; uploadEnabled: boolean; meta?: Record<string, unknown> }) {
  const status = meta?.provider === "upload" ? "uploaded" : value ? "URL" : uploadEnabled ? "empty" : "disabled";
  return <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600">
    <div className="flex items-center justify-between gap-2"><div className="font-black text-slate-950">{label}</div><span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase">{status}</span></div>
    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">{value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] text-slate-300">empty</span>}</div><div className="min-w-0"><div className="truncate">{value || "No active URL"}</div><div className="text-slate-400">Used: {usedWhere}</div></div></div>
    <input name={name} defaultValue={value} placeholder="https://... or /asset.png" className="rounded-lg border border-slate-200 px-2 py-1.5" />
    <input name={`${name}File`} type="file" accept="image/png,image/jpeg,image/webp" disabled={!uploadEnabled} className="text-[11px] disabled:opacity-40" />
    <label className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" name={`${name}Reset`} value="1" /> reset/remove</label>
  </div>;
}

export default async function AdminBrandPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();
  const config = adminConfigState();
  const blob = blobStatus();
  const settingsResult = config.hasDatabase ? await safeAdminDbQuery("Brand settings", () => getSetting("brand_settings"), null) : { data: null, error: null };
  const settings = parseBrandSettings(settingsResult.data);
  const saved = firstParam(searchParams?.saved) === "1";
  const saveError = firstParam(searchParams?.error);
  const dbErrors = [settingsResult.error].filter(Boolean);
  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 md:px-6">
    <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">learnDeFi admin</p><h1 className="text-2xl font-black tracking-[-0.05em] text-slate-950">Brand Settings</h1></div><div className="flex gap-2"><Link href="/admin" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Dashboard</Link><Link href="/admin/api" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">API</Link></div></header>
    {!config.hasBlob ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{blob.message} Manual URLs and text saves still work.</p> : null}
    <AdminDbErrorPanel errors={dbErrors} />
    {saved ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Brand settings saved; public-connected fields are active.</div> : null}
    {saveError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">Brand settings could not be saved: {saveError}</div> : null}
    <form action={saveBrandSettingsAction} className="mt-4 grid gap-4 lg:grid-cols-[1fr_390px]">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="font-black text-slate-950">Brand text</h2><span className="text-xs font-bold text-slate-400">Last saved: {settings.savedAt ? new Date(settings.savedAt).toLocaleString() : "never"}</span></div><div className="grid gap-3 md:grid-cols-2"><Field name="siteName" label="Site name" value={settings.siteName} /><Field name="shortName" label="Short name" value={settings.shortName} /><Field name="mainSlogan" label="Main slogan" value={settings.mainSlogan} /><Field name="heroSubtitle" label="Hero subtitle" value={settings.heroSubtitle} textarea /><Field name="cardFooterText" label="Card footer text" value={settings.cardFooterText} /><Field name="createdWithText" label="Created with text" value={settings.createdWithText} /><Field name="metaDescription" label="Meta description" value={settings.metaDescription} textarea /><Field name="supportingCopy" label="Supporting copy" value={settings.supportingCopy} /></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-black text-slate-950">Brand assets</h2><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${config.hasBlob ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}`}>Blob {config.hasBlob ? "enabled" : "disabled"}</span></div><p className="mt-1 text-xs font-bold text-slate-500">PNG/JPEG/WebP only; SVG upload disabled. Normal assets max 500 KB, X banner max 2 MB.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{ASSETS.map(([name, label, used]) => <AssetField key={name} name={name} label={label} usedWhere={used} value={String(settings[name] || "")} uploadEnabled={config.hasBlob} meta={settings.assetMetadata?.[name]} />)}</div></section>
        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!config.hasDatabase}>Save brand settings</button>
      </div>
      <aside className="grid gap-3 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"><h2 className="font-black text-slate-950">Public previews</h2><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Site header</div><div className="mt-2 flex items-center gap-2">{settings.headerLogo || settings.primaryLogo ? <img src={settings.headerLogo || settings.primaryLogo} alt="" className="h-8 w-8 object-contain" /> : null}<span className="text-xl font-black tracking-[-0.04em]">{settings.siteName}</span></div></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Hero</div><h3 className="mt-1 text-2xl font-black tracking-[-0.05em]">{settings.mainSlogan}</h3><p className="mt-1 text-sm font-bold text-slate-500">{settings.heroSubtitle}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-600">Share footer: {settings.cardFooterText} · {settings.createdWithText}</div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Favicon / X / watermark</div><div className="mt-2 flex items-center gap-2">{[settings.favicon, settings.xAvatar, settings.watermarkMark].map((src, i) => <div key={i} className="h-10 w-10 rounded-lg border bg-white">{src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}</div>)}</div>{settings.xBanner ? <img src={settings.xBanner} alt="" className="mt-2 h-20 w-full rounded-xl object-cover" /> : <div className="mt-2 h-20 rounded-xl bg-slate-200" />}</div></aside>
    </form>
  </main>;
}
