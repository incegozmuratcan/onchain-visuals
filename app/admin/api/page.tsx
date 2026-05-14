import Link from "next/link";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { blobStatus, getApiProviderCards } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "connected" || status === "public-no-key" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "missing key" || status === "error" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>{status}</span>;
}

export default async function AdminApiPage() {
  await requireAdmin();
  const config = adminConfigState();
  const providerResult = await safeAdminDbQuery("Provider status", getApiProviderCards, []);
  const providers = providerResult.data;
  const dbErrors = [providerResult.error].filter(Boolean);
  const blob = blobStatus();
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="text-2xl font-black tracking-[-0.07em] text-slate-950">API Settings</h1><p className="mt-1 max-w-2xl text-xs font-bold text-slate-500">Server-side provider readiness. Key presence is shown as yes/no only; secret values are never exposed to the browser.</p></div><div className="flex gap-2"><Link href="/admin" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Dashboard</Link><Link href="/admin/logos" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Logo Manager</Link></div></header>
      <AdminDbErrorPanel errors={dbErrors} />
      <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Env var</th><th className="px-3 py-2">Last success</th><th className="px-3 py-2">Last error</th><th className="px-3 py-2">Used by</th><th className="px-3 py-2">Next action</th></tr></thead>
          <tbody>{providers.map((provider) => <tr key={provider.id} className="border-b border-slate-100 align-top"><td className="px-3 py-2 font-black text-slate-950">{provider.name}</td><td className="px-3 py-2"><StatusBadge status={provider.status} /></td><td className="px-3 py-2 font-bold text-slate-700">{provider.keyConfigured ? "yes" : provider.envVars.length ? "no" : "n/a"}</td><td className="px-3 py-2 font-bold text-slate-500">{provider.envVars.join(" / ") || "—"}</td><td className="px-3 py-2 font-bold text-slate-500">{provider.lastSuccessfulCheck ? new Date(provider.lastSuccessfulCheck).toLocaleString() : "—"}</td><td className="max-w-[240px] truncate px-3 py-2 font-bold text-amber-800" title={provider.lastError || ""}>{provider.lastError || "—"}</td><td className="max-w-[280px] truncate px-3 py-2 font-bold text-slate-500" title={provider.metrics.join(", ")}>{provider.metrics.join(", ")}</td><td className="max-w-[280px] px-3 py-2 font-bold text-slate-700">{provider.nextAction} <a href={provider.docsUrl} className="ml-1 underline">docs</a></td></tr>)}</tbody>
        </table>
      </section>
      <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-950">Setup health</h2><p className="mt-1 text-sm font-bold text-slate-500">Missing secrets should disable admin-only features without breaking public cards.</p></div><StatusBadge status={blob.status} /></div><div className="mt-3 grid gap-2 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">DATABASE_URL: {config.hasDatabase ? "yes" : "no"}</div><div className="rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">ADMIN_SESSION_SECRET / setup token: {config.hasSessionSecret ? "yes" : "no"}</div><div className="rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">BLOB_READ_WRITE_TOKEN: {config.hasBlob ? "yes" : "no"}</div></div><div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-2 text-xs font-bold text-amber-900">Uploads disabled when BLOB_READ_WRITE_TOKEN is missing. URL candidates, local vault imports, manual URL save and brand text save still work. SVG upload stays disabled until sanitization is implemented.</div><p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">{blob.message}</p></section>
    </main>
  );
}
