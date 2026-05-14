import { AdminSection, AdminShell, AdminStatusDot, AdminStatusPill, type AdminTone } from "@/components/admin/AdminPrimitives";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { blobStatus, getApiProviderCards } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";

export const dynamic = "force-dynamic";

function statusTone(status: string): AdminTone {
  if (status === "connected") return "green";
  if (status === "public-no-key" || status === "disabled") return "gray";
  if (status === "error") return "red";
  if (status === "missing key") return "amber";
  return "slate";
}

export default async function AdminApiPage() {
  await requireAdmin();
  const config = adminConfigState();
  const providerResult = await safeAdminDbQuery("Provider status", getApiProviderCards, []);
  const providers = providerResult.data;
  const dbErrors = [providerResult.error].filter(Boolean);
  const blob = blobStatus();
  return (
    <AdminShell active="api" title="API Settings" subtitle="Provider readiness without exposing secret values.">
      <AdminDbErrorPanel errors={dbErrors} />
      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Env var</th><th className="px-3 py-2">Last success</th><th className="px-3 py-2">Last error</th><th className="px-3 py-2">Used by</th><th className="px-3 py-2">Action</th></tr></thead>
          <tbody>{providers.map((provider) => <tr key={provider.id} className="border-b border-slate-100 align-middle"><td className="px-3 py-2 font-black text-slate-950">{provider.name}</td><td className="px-3 py-2"><AdminStatusDot tone={statusTone(provider.status)} label={provider.status} /></td><td className="px-3 py-2 font-bold text-slate-700">{provider.keyConfigured ? "yes" : provider.envVars.length ? "no" : "n/a"}</td><td className="px-3 py-2 font-bold text-slate-500">{provider.envVars.join(" / ") || "—"}</td><td className="px-3 py-2 font-bold text-slate-500">{provider.lastSuccessfulCheck ? new Date(provider.lastSuccessfulCheck).toLocaleString() : "—"}</td><td className="max-w-[220px] truncate px-3 py-2 font-bold text-amber-800" title={provider.lastError || ""}>{provider.lastError || "—"}</td><td className="max-w-[240px] truncate px-3 py-2 font-bold text-slate-500" title={provider.metrics.join(", ")}>{provider.metrics.join(", ")}</td><td className="max-w-[240px] px-3 py-2 font-bold text-slate-700"><details><summary className="cursor-pointer">{provider.nextAction}</summary><a href={provider.docsUrl} className="mt-1 inline-block text-slate-500 underline">provider docs</a></details></td></tr>)}</tbody>
        </table>
      </section>
      <AdminSection title="Setup health" className="mt-3" action={<AdminStatusPill tone={statusTone(blob.status)}>{blob.status}</AdminStatusPill>}>
        <div className="grid gap-2 md:grid-cols-3"><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">DATABASE_URL: {config.hasDatabase ? "yes" : "no"}</div><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">Admin session secret: {config.hasSessionSecret ? "yes" : "no"}</div><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">BLOB_READ_WRITE_TOKEN: {config.hasBlob ? "yes" : "no"}</div></div>
        <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-600"><summary className="cursor-pointer text-slate-500">Setup notes</summary><p className="mt-1">Uploads are disabled when BLOB_READ_WRITE_TOKEN is missing. URL candidates, local vault imports, manual URL saves and brand text saves still work. SVG upload stays disabled until sanitization is implemented.</p><p className="mt-1 text-amber-800">{blob.message}</p></details>
      </AdminSection>
    </AdminShell>
  );
}
