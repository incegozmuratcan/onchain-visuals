import Link from "next/link";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { blobStatus, getApiProviderCards } from "@/lib/admin/providerStatus";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "connected" || status === "public-no-key" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "missing key" || status === "error" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>{status}</span>;
}

export default async function AdminApiPage() {
  await requireAdmin();
  const config = adminConfigState();
  const providers = await getApiProviderCards();
  const blob = blobStatus();
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">API Settings</h1><p className="mt-2 max-w-2xl text-sm font-bold text-slate-500">Server-side provider readiness. Key presence is shown as yes/no only; secret values are never exposed to the browser.</p></div><div className="flex gap-2"><Link href="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Dashboard</Link><Link href="/admin/logos" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Logo Manager</Link></div></header>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => <article key={provider.id} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black text-slate-950">{provider.name}</h2><StatusBadge status={provider.status} /></div><dl className="mt-4 grid gap-2 text-sm font-bold text-slate-600"><div className="flex justify-between gap-3"><dt>Key configured</dt><dd className="text-slate-950">{provider.keyConfigured ? "yes" : "no"}</dd></div><div className="flex justify-between gap-3"><dt>Last successful check</dt><dd className="text-right text-slate-950">{provider.lastSuccessfulCheck ? new Date(provider.lastSuccessfulCheck).toLocaleString() : "—"}</dd></div><div><dt>Used by metrics</dt><dd className="mt-1 text-slate-950">{provider.metrics.join(", ")}</dd></div>{provider.lastError ? <div className="rounded-2xl bg-amber-50 p-3 text-amber-900"><dt>Last error</dt><dd>{provider.lastError}</dd></div> : null}</dl><p className="mt-4 text-sm font-bold text-slate-500">{provider.notes}</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-xs font-black text-slate-400">Test connection placeholder</span><span className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-xs font-black text-slate-400">Enable/disable placeholder</span><a href={provider.docsUrl} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">Docs/source</a></div></article>)}
      </section>
      <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Setup health</h2><p className="mt-1 text-sm font-bold text-slate-500">Missing secrets should disable admin-only features without breaking public cards.</p></div><StatusBadge status={blob.status} /></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">DATABASE_URL: {config.hasDatabase ? "yes" : "no"}</div><div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">ADMIN_SESSION_SECRET / setup token: {config.hasSessionSecret ? "yes" : "no"}</div><div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">BLOB_READ_WRITE_TOKEN: {config.hasBlob ? "yes" : "no"}</div></div><p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">{blob.message}</p></section>
    </main>
  );
}
