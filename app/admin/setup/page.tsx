import Link from "next/link";
import { logoutAction, isAdminAuthenticated } from "@/lib/admin/auth";
import { getAdminSetupStatus } from "@/lib/admin/config";

function StatusRow({ label, ok, note }: { label: string; ok: boolean; note: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4"><div><p className="font-black text-slate-950">{label}</p><p className="text-sm font-medium text-slate-500">{note}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ok ? "configured" : "missing"}</span></div>;
}

export default function AdminSetup() {
  const setup = getAdminSetupStatus();
  const authed = isAdminAuthenticated();
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Admin setup</p><h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-slate-950">Logo operations config</h1></div>
          <div className="flex gap-2"><Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black" href="/admin/logos">Logo Manager</Link>{authed && <form action={logoutAction as never}><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Logout</button></form>}</div>
        </div>
        <div className="mt-8 rounded-3xl border border-slate-200 p-5">
          <StatusRow label="DATABASE_URL" ok={setup.databaseUrl} note="Required for persistent admin logo records and seeding." />
          <StatusRow label="BLOB_READ_WRITE_TOKEN" ok={setup.blobToken} note="Required for storing raw and optimized admin-managed assets." />
          <StatusRow label="ADMIN_PASSWORD" ok={setup.adminPassword} note="Required for single-owner password login." />
          <StatusRow label="COINGECKO_DEMO_API_KEY" ok={setup.coingeckoKey} note="Server-only key for CoinGecko logo refresh." />
          <StatusRow label="ADMIN_SESSION_SECRET" ok={setup.sessionSecret} note="Optional but recommended for production cookie signing." />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">DB status</p><p className="mt-3 text-xl font-black">{setup.dbStatus}</p></div>
          <div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Blob status</p><p className="mt-3 text-xl font-black">{setup.blobStatus}</p></div>
          <div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Seed status</p><p className="mt-3 text-xl font-black">{setup.seedStatus}</p></div>
        </div>
        {setup.warnings.length > 0 && <ul className="mt-6 grid gap-2 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">{setup.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>}
        <div className="mt-6 rounded-3xl border border-slate-200 p-5 text-sm font-medium text-slate-600"><p className="font-black text-slate-950">Setup commands</p><code className="mt-3 block rounded-2xl bg-slate-100 p-4 text-slate-800">npm run db:push{"\n"}npm run admin:seed-logos</code></div>
      </div>
    </main>
  );
}
