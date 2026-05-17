import { AdminShell, AdminStatusPill, type AdminTone } from "@/components/admin/AdminPrimitives";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { saveBrandSettingsAction } from "@/lib/admin/actions";
import { blobStatus } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";
import type { PublicBrandSettings } from "@/lib/brandTypes";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type AssetName = keyof Pick<PublicBrandSettings, "primaryLogo" | "headerLogo" | "favicon" | "appleTouchIcon" | "watermarkMark" | "xAvatar" | "xBanner" | "darkLogo" | "iconMark">;
type AssetRow = {
  name: AssetName;
  label: string;
  usedWhere: string;
  active?: boolean;
  optionalEmptyLabel?: string;
  missingLabel?: string;
  emptyTone?: AdminTone;
};

const MAIN_PUBLIC_ASSETS: AssetRow[] = [
  { name: "primaryLogo", label: "Primary / hero logo", usedWhere: "Public hero · falls back to header logo when empty", active: true, missingLabel: "missing" },
  { name: "favicon", label: "Favicon", usedWhere: "Browser icon", active: true, missingLabel: "missing" },
];

const OPTIONAL_PUBLIC_ASSETS: AssetRow[] = [
  { name: "headerLogo", label: "Header logo", usedWhere: "Optional header / future nav", optionalEmptyLabel: "not used" },
  { name: "appleTouchIcon", label: "Apple touch icon", usedWhere: "Optional iOS home screen", optionalEmptyLabel: "optional empty" },
  { name: "watermarkMark", label: "Watermark", usedWhere: "Optional · not used by current share cards", optionalEmptyLabel: "optional empty" },
];

const ADVANCED_ASSETS: AssetRow[] = [
  { name: "xAvatar", label: "X avatar", usedWhere: "Social profile", optionalEmptyLabel: "optional empty" },
  { name: "xBanner", label: "X banner", usedWhere: "Social banner · 2 MB max", optionalEmptyLabel: "optional empty" },
  { name: "darkLogo", label: "Dark logo", usedWhere: "Advanced · unused unless referenced", optionalEmptyLabel: "not used" },
  { name: "iconMark", label: "Icon mark", usedWhere: "Advanced · unused unless referenced", optionalEmptyLabel: "not used" },
];

const PUBLIC_FIELDS = new Set(["siteName", "mainSlogan", "heroSubtitle", "cardFooterText", "createdWithText", "metaDescription", "primaryLogo", "favicon"]);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Field({ name, label, value, textarea = false }: { name: string; label: string; value: string; textarea?: boolean }) {
  const className = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold";
  return <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
    {label} {PUBLIC_FIELDS.has(name) ? <span className="text-emerald-600">· public</span> : <span className="text-slate-400">· preview</span>}
    {textarea ? <textarea name={name} defaultValue={value} className={className} rows={2} /> : <input name={name} defaultValue={value} className={className} />}
  </label>;
}

function assetStatus({ active, emptyTone = "gray", optionalEmptyLabel = "optional empty", missingLabel = "missing", value, uploadEnabled, meta }: AssetRow & { value: string; uploadEnabled: boolean; meta?: Record<string, unknown> }) {
  if (meta?.provider === "upload") return { label: "uploaded", tone: "green" as AdminTone };
  if (value) return { label: "URL", tone: "green" as AdminTone };
  if (active) return { label: missingLabel, tone: emptyTone === "gray" ? "amber" as AdminTone : emptyTone };
  if (!uploadEnabled) return { label: optionalEmptyLabel, tone: "gray" as AdminTone };
  return { label: optionalEmptyLabel, tone: "gray" as AdminTone };
}

function AssetField({ row, value, uploadEnabled, meta }: { row: AssetRow; value: string; uploadEnabled: boolean; meta?: Record<string, unknown> }) {
  const status = assetStatus({ ...row, value, uploadEnabled, meta });
  return <div className="grid gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-600 last:border-b-0 lg:grid-cols-[150px_64px_1fr_190px_170px_105px_90px] lg:items-center">
    <div>
      <div className="font-black text-slate-950">{row.label}</div>
      {row.name === "headerLogo" ? <div className="mt-0.5 text-[10px] font-black uppercase text-slate-400">Optional · Used only if a separate public header is enabled.</div> : null}
    </div>
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">{value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] text-slate-300">empty</span>}</div>
    <input name={row.name} defaultValue={value} placeholder="https://... or /asset.png" className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5" title={value} />
    <label className="inline-flex cursor-pointer items-center gap-2"><span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-black text-slate-700">Choose file</span><input name={`${row.name}File`} type="file" accept="image/png,image/jpeg,image/webp" disabled={!uploadEnabled} className="sr-only disabled:opacity-40" /><span className="truncate text-[10px] text-slate-400">PNG/JPEG/WebP</span></label>
    <div className="truncate text-slate-400" title={row.usedWhere}>{row.usedWhere}</div>
    <AdminStatusPill tone={status.tone}>{status.label}</AdminStatusPill>
    <label className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" name={`${row.name}Reset`} value="1" /> reset</label>
  </div>;
}

function AssetTable({ rows, settings, uploadEnabled }: { rows: AssetRow[]; settings: PublicBrandSettings; uploadEnabled: boolean }) {
  return <div className="overflow-hidden rounded-xl border border-slate-100">
    <div className="hidden bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 lg:grid lg:grid-cols-[150px_64px_1fr_190px_170px_105px_90px]"><div>Asset</div><div>Preview</div><div>URL</div><div>Upload</div><div>Used in</div><div>Status</div><div>Reset</div></div>
    {rows.map((row) => <AssetField key={row.name} row={row} value={String(settings[row.name] || "")} uploadEnabled={uploadEnabled} meta={settings.assetMetadata?.[row.name]} />)}
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
  const heroLogo = settings.primaryLogo || settings.headerLogo;
  const heroLogoLabel = settings.primaryLogo ? "Primary logo OK" : settings.headerLogo ? "Hero uses header fallback" : "Primary logo missing";
  const heroLogoTone: AdminTone = heroLogo ? "green" : "amber";

  return <AdminShell active="brand" title="Brand Settings" subtitle="Compact public text, assets and upload health." sticky>
    {!config.hasBlob ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{blob.message} Manual URLs and text saves still work.</p> : null}
    <AdminDbErrorPanel errors={dbErrors} />
    {saved ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Brand settings saved; public-connected fields are active.</div> : null}
    {saveError ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">Brand settings could not be saved: {saveError}</div> : null}
    <section className="mt-3 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-soft">
      <AdminStatusPill tone={heroLogoTone}>{heroLogoLabel}</AdminStatusPill>
      <AdminStatusPill tone={settings.favicon ? "green" : "amber"}>Favicon {settings.favicon ? "OK" : "missing"}</AdminStatusPill>
      <AdminStatusPill tone={config.hasBlob ? "green" : "gray"}>Upload {config.hasBlob ? "enabled" : "disabled"}</AdminStatusPill>
      <AdminStatusPill tone={settings.headerLogo ? "green" : "gray"}>Header logo {settings.headerLogo ? "available" : "optional"}</AdminStatusPill>
      <AdminStatusPill tone={settings.appleTouchIcon ? "green" : "gray"}>Apple touch icon {settings.appleTouchIcon ? "OK" : "optional"}</AdminStatusPill>
      <AdminStatusPill tone={settings.watermarkMark ? "green" : "gray"}>Watermark {settings.watermarkMark ? "available" : "optional"}</AdminStatusPill>
    </section>
    <form action={saveBrandSettingsAction} className="mt-4 grid gap-4 lg:grid-cols-[1fr_330px]">
      <div className="grid gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-black text-slate-950">Brand text</h2><span className="text-xs font-bold text-slate-400">Last saved: {settings.savedAt ? new Date(settings.savedAt).toLocaleString() : "never"}</span></div>
          <div className="grid gap-3 md:grid-cols-2"><Field name="siteName" label="Site name" value={settings.siteName} /><Field name="mainSlogan" label="Main slogan" value={settings.mainSlogan} /><Field name="heroSubtitle" label="Hero subtitle if used" value={settings.heroSubtitle} textarea /><Field name="cardFooterText" label="Card footer text" value={settings.cardFooterText} /><Field name="createdWithText" label="Created with text" value={settings.createdWithText} /><Field name="metaDescription" label="Meta description" value={settings.metaDescription} textarea /></div>
          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-black text-slate-500">Advanced text</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Field name="shortName" label="Short name · compact/PWA/fallback" value={settings.shortName} /><Field name="supportingCopy" label="Supporting copy · optional/preview" value={settings.supportingCopy} /></div></details>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-950">Brand assets</h2><AdminStatusPill tone={config.hasBlob ? "green" : "gray"}>Blob {config.hasBlob ? "enabled" : "disabled"}</AdminStatusPill></div>
          <p className="mt-1 text-xs font-bold text-slate-500">PNG/JPEG/WebP only; SVG upload disabled. Manual URLs work even when Blob uploads are disabled.</p>
          <h3 className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Main public assets</h3>
          <div className="mt-2"><AssetTable rows={MAIN_PUBLIC_ASSETS} settings={settings} uploadEnabled={config.hasBlob} /></div>
          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3" open>
            <summary className="cursor-pointer text-xs font-black text-slate-500">Optional public assets</summary>
            <div className="mt-3 bg-white"><AssetTable rows={OPTIONAL_PUBLIC_ASSETS} settings={settings} uploadEnabled={config.hasBlob} /></div>
          </details>
          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-black text-slate-500">Advanced / social assets</summary>
            <div className="mt-3 bg-white"><AssetTable rows={ADVANCED_ASSETS} settings={settings} uploadEnabled={config.hasBlob} /></div>
          </details>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Hero typography & layout</h2><p className="mt-1 text-xs font-bold text-slate-500">Compact optical controls for transparent padding, slogan weight and optional subtitle display.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><Field name="heroLogoOffsetX" label="Offset X" value={settings.heroLogoOffsetX} /><Field name="heroLogoMaxWidth" label="Logo width" value={settings.heroLogoMaxWidth} /><Field name="heroLogoSpacing" label="Bottom gap" value={settings.heroLogoSpacing} /><Field name="heroSloganFontSize" label="Slogan size" value={settings.heroSloganFontSize} /><Field name="heroSloganFontWeight" label="Slogan weight" value={settings.heroSloganFontWeight} /><Field name="heroSloganLineHeight" label="Slogan line height" value={settings.heroSloganLineHeight} /><Field name="heroSubtitleSize" label="Subtitle size" value={settings.heroSubtitleSize} /><Field name="heroSubtitleOpacity" label="Subtitle opacity" value={settings.heroSubtitleOpacity} /><label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Subtitle visibility<select name="heroSubtitleVisible" defaultValue={settings.heroSubtitleVisible} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><option value="1">Show subtitle</option><option value="0">Hide subtitle</option></select></label></div><div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-black"><span className="rounded-full bg-slate-100 px-2 py-1">Compact: 18 / 28</span><span className="rounded-full bg-slate-100 px-2 py-1">Balanced: 20 / 32</span><span className="rounded-full bg-slate-100 px-2 py-1">Large: 24 / 36</span><span className="rounded-full bg-slate-100 px-2 py-1">Editorial: 28 / 40</span></div></section>
        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50" disabled={!config.hasDatabase}>Save brand settings</button>
      </div>
      <aside className="sticky top-20 grid gap-3 self-start rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
        <h2 className="font-black text-slate-950">Public previews</h2>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Optional header / future nav</div><div className="mt-2 flex items-center gap-2">{settings.headerLogo ? <img src={settings.headerLogo} alt="" className="h-8 w-8 object-contain" /> : null}<span className="text-xl font-black tracking-[-0.04em]">{settings.siteName}</span></div><p className="mt-2 text-[11px] font-bold text-slate-400">Only used if a separate public header is enabled.</p></div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Hero alignment preview</div><div className="relative mt-2 flex min-h-20 items-center justify-center rounded-lg bg-white p-3"><span className="absolute bottom-0 top-0 w-px bg-amber-300" />{heroLogo ? <img src={heroLogo} alt="" className="relative z-10 h-auto max-h-14 object-contain" style={{ transform: `translateX(${settings.heroLogoOffsetX}px)`, maxWidth: `${settings.heroLogoMaxWidth}px` }} /> : <span className="font-serif text-2xl">{settings.siteName}</span>}</div><p className="mt-2 text-center font-medium text-slate-600" style={{ fontSize: `${settings.heroSloganFontSize}px`, fontWeight: Number(settings.heroSloganFontWeight), lineHeight: `${settings.heroSloganLineHeight}px` }}>{settings.mainSlogan}</p><p className="mt-1 text-xs font-bold text-amber-700">Hero source: primary logo → header fallback → site name.</p></div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-600">Share footer: {settings.cardFooterText} · {settings.createdWithText}</div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase text-slate-400">Public assets</div><div className="mt-2 flex items-center gap-2">{[settings.favicon, settings.appleTouchIcon, settings.watermarkMark].map((src, i) => <div key={i} className="h-10 w-10 rounded-lg border bg-white">{src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}</div>)}</div></div>
      </aside>
    </form>
  </AdminShell>;
}
