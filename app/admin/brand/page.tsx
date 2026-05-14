import { AdminShell, AdminStatusPill } from "@/components/admin/AdminPrimitives";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { saveBrandSettingsAction } from "@/lib/admin/actions";
import { blobStatus } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const PUBLIC_ASSETS = [
  ["primaryLogo", "Primary / hero logo", "Public hero wordmark"], ["headerLogo", "Header logo", "Public header"], ["favicon", "Favicon", "Browser icon"], ["appleTouchIcon", "Apple touch icon", "iOS home screen"], ["watermarkMark", "Watermark", "Share card watermark"],
] as const;
const ADVANCED_ASSETS = [
  ["xAvatar", "X avatar", "Social profile"], ["xBanner", "X banner", "Social banner · 2 MB max"], ["darkLogo", "Dark logo", "Advanced / unused unless referenced"], ["iconMark", "Icon mark", "Advanced / unused unless referenced"],
] as const;
const PUBLIC_FIELDS = new Set(["siteName", "mainSlogan", "heroSubtitle", "cardFooterText", "createdWithText", "metaDescription", "headerLogo", "primaryLogo", "favicon", "appleTouchIcon", "watermarkMark"]);

function firstParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function Field({ name, label, value, textarea = false }: { name: string; label: string; value: string; textarea?: boolean }) {
  const className = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold";
  return <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label} {PUBLIC_FIELDS.has(name) ? <span className="text-emerald-600">· public</span> : <span className="text-slate-400">· preview</span>}{textarea ? <textarea name={name} defaultValue={value} className={className} rows={2} /> : <input name={name} defaultValue={value} className={className} />}</label>;
}
function AssetField({ name, label, usedWhere, value, uploadEnabled, meta }: { name: string; label: string; usedWhere: string; value: string; uploadEnabled: boolean; meta?: Record<string, unknown> }) {
  const status = meta?.provider === "upload" ? "uploaded" : value ? "URL" : uploadEnabled ? "empty" : "disabled";
  const tone = status === "uploaded" || status === "URL" ? "green" : status === "disabled" ? "gray" : "amber";
  return <div className="grid gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-600 lg:grid-cols-[150px_64px_1fr_190px_150px_80px_90px] lg:items-center">
    <div className="font-black text-slate-950">{label}</div>
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">{value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] text-slate-300">empty</span>}</div>
    <input name={name} defaultValue={value} placeholder="https://... or /asset.png" className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5" title={value} />
    <label className="inline-flex cursor-pointer items-center gap-2"><span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-black text-slate-700">Choose file</span><input name={`${name}File`} type="file" accept="image/png,image/jpeg,image/webp" disabled={!uploadEnabled} className="sr-only disabled:opacity-40" /><span className="truncate text-[10px] text-slate-400">PNG/JPEG/WebP</span></label>
    <div className="truncate text-slate-400" title={usedWhere}>{usedWhere}</div>
    <AdminStatusPill tone={tone}>{status}</AdminStatusPill>
    <label className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" name={`${name}Reset`} value="1" /> reset</label>
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
  return <AdminShell active="brand" title="Brand Settings" subtitle="Compact public text, assets and upload health." sticky>
    {!config.hasBlob ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{blob.message} Manual URLs and text saves still work.</p> : null}
    <AdminDbErrorPanel errors={dbErrors} />
    {saved ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Brand settings saved; public-connected fields are active.</div> : null}
    {saveError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">Brand settings could not be saved: {saveError}</div> : null}
    <section className="mt-3 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-soft"><AdminStatusPill tone={settings.favicon ? "green" : "amber"}>Favicon {settings.favicon ? "ok" : "missing"}</AdminStatusPill><AdminStatusPill tone={settings.headerLogo ? "green" : "amber"}>Header {settings.headerLogo ? "ok" : "missing"}</AdminStatusPill><AdminStatusPill tone={settings.watermarkMark ? "green" : "amber"}>Watermark {settings.watermarkMark ? "ok" : "missing"}</AdminStatusPill><AdminStatusPill tone={config.hasBlob ? "green" : "gray"}>Upload {config.hasBlob ? "enabled" : "disabled"}</AdminStatusPill></section>
    <form action={saveBrandSettingsAction} className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="font-black text-slate-950">Brand text</h2><span className="text-xs font-bold text-slate-400">Last saved: {settings.savedAt ? new Date(settings.savedAt).toLocaleString() : "never"}</span></div><div className="grid gap-3 md:grid-cols-2"><Field name="siteName" label="Site name" value={settings.siteName} /><Field name="mainSlogan" label="Main slogan" value={settings.mainSlogan} /><Field name="heroSubtitle" label="Hero subtitle if used" value={settings.heroSubtitle} textarea /><Field name="cardFooterText" label="Card footer text" value={settings.cardFooterText} /><Field name="createdWithText" label="Created with text" value={settings.createdWithText} /><Field name="metaDescription" label="Meta description" value={settings.metaDescription} textarea /></div><details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-black text-slate-500">Advanced text</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Field name="shortName" label="Short name · compact/PWA/fallback" value={settings.shortName} /><Field name="supportingCopy" label="Supporting copy · optional/preview" value={settings.supportingCopy} /></div></details></section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-black text-slate-950">Brand assets</h2><AdminStatusPill tone={config.hasBlob ? "green" : "gray"}>Blob {config.hasBlob ? "enabled" : "disabled"}</AdminStatusPill></div><p className="mt-1 text-xs font-bold text-slate-500">PNG/JPEG/WebP only; SVG upload disabled. Manual URLs work even when Blob uploads are disabled.</p><div className="mt-3 overflow-hidden rounded-xl border border-slate-100"><div className="hidden bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 lg:grid lg:grid-cols-[150px_64px_1fr_190px_150px_80px_90px]"><div>Asset</div><div>Preview</div><div>URL</div><div>Upload</div><div>Used in</div><div>Status</div><div>Reset</div></div>{PUBLIC_ASSETS.map(([name, label, used]) => <AssetField key={name} name={name} label={label} usedWhere={used} value={String(settings[name] || "")} uploadEnabled={config.hasBlob} meta={settings.assetMetadata?.[name]} />)}</div><details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-black text-slate-500">Optional / social / advanced assets</summary><div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-white">{ADVANCED_ASSETS.map(([name, label, used]) => <AssetField key={name} name={name} label={label} usedWhere={used} value={String(settings[name] || "")} uploadEnabled={config.hasBlob} meta={settings.assetMetadata?.[name]} />)}</div></details></section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Hero logo alignment</h2><p className="mt-1 text-xs font-bold text-slate-500">Use these manual optical controls when the uploaded wordmark has transparent padding or an uneven viewBox.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><Field name="heroLogoOffsetX" label="Horizontal offset px" value={settings.heroLogoOffsetX} /><Field name="heroLogoMaxWidth" label="Max width px" value={settings.heroLogoMaxWidth} /><Field name="heroLogoSpacing" label="Spacing below logo px" value={settings.heroLogoSpacing} /></div></section>
        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!config.hasDatabase}>Save brand settings</button>
      </div>
      <aside className="sticky top-20 grid gap-3 self-start rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Public previews</h2><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Site header</div><div className="mt-2 flex items-center gap-2">{settings.headerLogo || settings.primaryLogo ? <img src={settings.headerLogo || settings.primaryLogo} alt="" className="h-8 w-8 object-contain" /> : null}<span className="text-xl font-black tracking-[-0.04em]">{settings.siteName}</span></div></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Hero alignment preview</div><div className="relative mt-2 flex min-h-20 items-center justify-center rounded-lg bg-white p-3"><span className="absolute bottom-0 top-0 w-px bg-amber-300" />{settings.primaryLogo ? <img src={settings.primaryLogo} alt="" className="relative z-10 h-auto max-h-14 object-contain" style={{ transform: `translateX(${settings.heroLogoOffsetX}px)`, maxWidth: `${settings.heroLogoMaxWidth}px` }} /> : <span className="font-serif text-2xl">{settings.siteName}</span>}</div><p className="mt-2 text-center text-sm font-medium text-slate-600">{settings.mainSlogan}</p><p className="mt-1 text-xs font-bold text-amber-700">If the image looks off center against the guide, adjust offset or crop transparent padding.</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-600">Share footer: {settings.cardFooterText} · {settings.createdWithText}</div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Public assets</div><div className="mt-2 flex items-center gap-2">{[settings.favicon, settings.appleTouchIcon, settings.watermarkMark].map((src, i) => <div key={i} className="h-10 w-10 rounded-lg border bg-white">{src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}</div>)}</div></div></aside>
    </form>
  </AdminShell>;
}
