import Link from "next/link";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { saveBrandSettingsAction } from "@/lib/admin/actions";
import { blobStatus } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Field({ name, label, value, textarea = false }: { name: string; label: string; value: string; textarea?: boolean }) {
  const className = "mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold";
  return <label className="block text-sm font-black text-slate-700">{label}{textarea ? <textarea name={name} defaultValue={value} className={className} rows={3} /> : <input name={name} defaultValue={value} className={className} />}</label>;
}

function AssetField({ name, label, value, uploadEnabled }: { name: string; label: string; value: string; uploadEnabled: boolean }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><Field name={name} label={label} value={value} />{uploadEnabled ? <input type="file" disabled className="mt-2 w-full text-xs font-bold text-slate-400" /> : <p className="mt-2 text-xs font-bold text-amber-700">Uploads disabled; paste a manual URL candidate for now.</p>}</div>;
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
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">Brand Settings</h1><p className="mt-2 max-w-2xl text-sm font-bold text-slate-500">Brand text now feeds the public homepage, metadata, header text and share-card footer when saved. Defaults remain learnDeFi if the DB is unavailable.</p></div><div className="flex gap-2"><Link href="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Dashboard</Link><Link href="/admin/api" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">API Settings</Link></div></header>
      {!config.hasBlob ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{blob.message}</p> : null}
      <AdminDbErrorPanel errors={dbErrors} />
      {saved ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><p>Brand settings saved.</p><p>Public site is using these values.</p>{!config.hasBlob ? <p>Asset upload disabled until Blob token is configured.</p> : null}</div> : null}
      {saveError ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">Brand settings could not be saved: {saveError}</div> : null}
      <form action={saveBrandSettingsAction} className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Brand text</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field name="siteName" label="Site name" value={settings.siteName} /><Field name="shortName" label="Short name" value={settings.shortName} /><Field name="mainSlogan" label="Main slogan" value={settings.mainSlogan} /><Field name="heroSubtitle" label="Hero subtitle" value={settings.heroSubtitle} textarea /><Field name="cardFooterText" label="Card footer text" value={settings.cardFooterText} /><Field name="createdWithText" label="Created with … text" value={settings.createdWithText} /><Field name="metaDescription" label="Meta description" value={settings.metaDescription} textarea /><Field name="supportingCopy" label="Supporting copy" value={settings.supportingCopy} /></div></section>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Brand assets</h2><p className="mt-1 text-sm font-bold text-slate-500">Manual URL fields are stored as admin settings. Upload widgets are placeholders until the brand asset upload flow is wired to Blob.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><AssetField name="primaryLogo" label="Primary logo" value={settings.primaryLogo} uploadEnabled={config.hasBlob} /><AssetField name="darkLogo" label="Dark logo" value={settings.darkLogo} uploadEnabled={config.hasBlob} /><AssetField name="iconMark" label="Icon-only mark" value={settings.iconMark} uploadEnabled={config.hasBlob} /><AssetField name="headerLogo" label="Header logo" value={settings.headerLogo} uploadEnabled={config.hasBlob} /><AssetField name="favicon" label="Favicon" value={settings.favicon} uploadEnabled={config.hasBlob} /><AssetField name="appleTouchIcon" label="Apple touch icon" value={settings.appleTouchIcon} uploadEnabled={config.hasBlob} /><AssetField name="xAvatar" label="X avatar" value={settings.xAvatar} uploadEnabled={config.hasBlob} /><AssetField name="xBanner" label="X banner" value={settings.xBanner} uploadEnabled={config.hasBlob} /><AssetField name="watermarkMark" label="Watermark mark" value={settings.watermarkMark} uploadEnabled={config.hasBlob} /></div></section>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50" disabled={!config.hasDatabase}>Save brand settings</button>
        </div>
        <aside className="grid gap-4 self-start rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Preview blocks</h2><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Live-public-connected: siteName, shortName, mainSlogan, heroSubtitle, supportingCopy, metaDescription, favicon URLs, cardFooterText and createdWithText. Preview-only until a safe upload path exists: uploaded brand asset files, X banner mock and watermark asset placement.</div>{settings.savedAt ? <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-600">Last saved: {new Date(settings.savedAt).toLocaleString()}</div> : null}<div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Site header preview</div><div className="mt-3 flex items-center justify-between"><div className="text-2xl font-black tracking-[-0.05em] text-slate-950">{settings.siteName}</div><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">Admin preview</span></div></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Share card footer preview</div><p className="mt-3 text-sm font-bold text-slate-600">{settings.cardFooterText} · {settings.createdWithText}</p></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Favicon preview</div><div className="mt-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">{settings.favicon ? <img src={settings.favicon} alt="Favicon preview" className="h-full w-full object-contain" /> : null}</div></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">X avatar/banner preview</div><div className="mt-3 h-24 rounded-2xl bg-slate-200" /><div className="-mt-8 ml-4 h-16 w-16 rounded-full border-4 border-white bg-slate-950" /></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Watermark preview</div><div className="mt-3 text-4xl font-black tracking-[-0.08em] text-slate-200">{settings.shortName}</div></div></aside>
      </form>
    </main>
  );
}
