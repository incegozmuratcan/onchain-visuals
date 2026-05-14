import { AdminSection, AdminShell, AdminStatusDot, AdminStatusPill, type AdminTone } from "@/components/admin/AdminPrimitives";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { adminEncryptionHealth, blobStatus, getApiProviderCards } from "@/lib/admin/providerStatus";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { deleteApiKeyAction, saveApiKeyAction, testApiKeyAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function statusTone(status: string): AdminTone {
  if (status === "connected") return "green";
  if (status === "public-no-key" || status === "disabled") return "gray";
  if (status === "error") return "red";
  if (status === "missing key") return "amber";
  return "slate";
}
function noticeClass(tone?: string) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

export default async function AdminApiPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();
  const config = adminConfigState();
  const encryptionReady = adminEncryptionHealth();
  const providerResult = await safeAdminDbQuery("Provider status", getApiProviderCards, []);
  const providers = providerResult.data;
  const activeProviders = providers.filter((provider) => provider.active);
  const inactiveProviders = providers.filter((provider) => !provider.active);
  const dbErrors = [providerResult.error].filter(Boolean);
  const blob = blobStatus();
  const notice = firstParam(searchParams?.message);
  const tone = firstParam(searchParams?.notice);
  return (
    <AdminShell active="api" title="API Settings" subtitle="Encrypted admin-managed provider keys; secrets never render in the browser.">
      <AdminDbErrorPanel errors={dbErrors} />
      {notice ? <div className={`mt-3 rounded-xl border p-2 text-xs font-bold ${noticeClass(tone)}`}>{notice}</div> : null}
      {!encryptionReady ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">ADMIN_ENCRYPTION_KEY is missing. Saving admin-managed API keys is disabled; environment keys and public providers still resolve.</div> : null}

      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
        <div className="grid grid-cols-[1.1fr_120px_110px_110px_1fr_220px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 max-lg:hidden"><div>Provider</div><div>Status</div><div>Key source</div><div>Last tested</div><div>Last error</div><div>Actions</div></div>
        {activeProviders.map((provider) => <div key={provider.id} className="grid gap-2 border-b border-slate-100 px-3 py-2 text-xs lg:grid-cols-[1.1fr_120px_110px_110px_1fr_220px] lg:items-center">
          <div className="min-w-0"><div className="font-black text-slate-950">{provider.name}</div><div className="truncate text-[11px] font-bold text-slate-400">{provider.metrics.join(" · ")}</div></div>
          <AdminStatusDot tone={statusTone(provider.status)} label={provider.status} />
          <div className="font-bold text-slate-600"><div>{provider.keySource}</div><div className="text-[10px] text-slate-400">{provider.maskedHint || "—"}</div></div>
          <div className="font-bold text-slate-500">{provider.lastTestedAt ? new Date(provider.lastTestedAt).toLocaleDateString() : "—"}</div>
          <div className="min-w-0 truncate font-bold text-amber-800" title={provider.lastError || ""}>{provider.lastError || "—"}</div>
          <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <form action={saveApiKeyAction} className="flex gap-1 sm:col-span-3 lg:col-span-1 xl:col-span-3"><input type="hidden" name="provider" value={provider.id} /><input name="apiKey" type="password" autoComplete="off" placeholder={encryptionReady ? "new key" : "encryption required"} disabled={!encryptionReady || !config.hasDatabase} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 disabled:opacity-40" /><button disabled={!encryptionReady || !config.hasDatabase} className="rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white disabled:opacity-40">Save</button></form>
            <form action={testApiKeyAction}><input type="hidden" name="provider" value={provider.id} /><button className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-black">Test</button></form>
            <form action={deleteApiKeyAction}><input type="hidden" name="provider" value={provider.id} /><button disabled={provider.keySource !== "admin"} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-black disabled:opacity-40">Delete</button></form>
            <details className="sm:col-span-1"><summary className="cursor-pointer rounded-lg border border-slate-100 px-2 py-1.5 font-black text-slate-500">Details</summary><div className="mt-1 rounded-lg bg-slate-50 p-2 font-bold text-slate-500"><p>{provider.notes}</p><p className="mt-1">Env: {provider.envVars.join(" / ") || "none"}</p><a href={provider.docsUrl} className="mt-1 inline-block underline">provider docs</a></div></details>
          </div>
        </div>)}
      </section>

      <AdminSection title="Prepared / inactive providers" className="mt-3">
        <div className="grid gap-2 md:grid-cols-2">{inactiveProviders.map((provider) => <details key={provider.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-600"><summary className="cursor-pointer"><span className="font-black text-slate-950">{provider.name}</span> · {provider.keySource}</summary><p className="mt-1">{provider.notes}</p><p className="mt-1">{provider.nextAction}</p><p className="mt-1 text-slate-400">Env: {provider.envVars.join(" / ") || "none"}</p></details>)}</div>
      </AdminSection>

      <AdminSection title="Setup health" className="mt-3" action={<AdminStatusPill tone={statusTone(blob.status)}>{blob.status}</AdminStatusPill>}>
        <div className="grid gap-2 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">DATABASE_URL: {config.hasDatabase ? "yes" : "no"}</div><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">Admin session secret: {config.hasSessionSecret ? "yes" : "no"}</div><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">ADMIN_ENCRYPTION_KEY: {encryptionReady ? "yes" : "no"}</div><div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">BLOB_READ_WRITE_TOKEN: {config.hasBlob ? "yes" : "no"}</div></div>
        <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-600"><summary className="cursor-pointer text-slate-500">Resolution order</summary><p className="mt-1">Provider keys resolve server-side only: encrypted admin DB secret → environment variable → public/no-key fallback where supported → disabled. Decrypted values are never sent to the browser, logged, revealed or copied.</p><p className="mt-1 text-amber-800">{blob.message}</p></details>
      </AdminSection>
    </AdminShell>
  );
}
