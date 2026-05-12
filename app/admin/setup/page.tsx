import { adminConfigState, getAdminConfigDiagnostic } from "@/lib/admin/auth";
import { setupAdminAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

export default async function AdminSetupPage() {
  const config = adminConfigState();
  const diagnostic = await getAdminConfigDiagnostic();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Admin setup</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Create the Logo Manager admin</h1>
        {!config.hasDatabase ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">DATABASE_URL is missing. Run npm run db:push after configuring Postgres.</p> : null}
        {!config.hasSessionSecret ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Set ADMIN_SESSION_SECRET for durable secure sessions. ADMIN_SETUP_TOKEN is recommended for first setup.</p> : null}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Diagnostic status</p>
          <dl className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-4"><dt>Database configured</dt><dd>{yesNo(diagnostic.hasDatabaseConfig)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt>Admin settings readable</dt><dd>{yesNo(diagnostic.canReadAdminSettings)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt>Admin password hash found</dt><dd>{yesNo(diagnostic.hasAdminPasswordHash)}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt>Hash length</dt><dd>{diagnostic.adminPasswordHashLength}</dd></div>
          </dl>
          {diagnostic.errorMessage ? <p className="mt-3 text-xs text-amber-800">Last safe error: {diagnostic.errorMessage}</p> : null}
        </div>
        {!diagnostic.canReadAdminSettings && diagnostic.hasDatabaseConfig ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Admin configuration could not be read. Check Vercel logs and verify the admin_settings table before running setup again.</p>
        ) : diagnostic.hasAdminPasswordHash ? <p className="mt-5 text-sm font-bold text-slate-600">Admin is already configured. Use /admin/login.</p> : (
          <form action={setupAdminAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-black text-slate-700">Setup token<input name="setupToken" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Required if ADMIN_SETUP_TOKEN is set" /></label>
            <label className="grid gap-2 text-sm font-black text-slate-700">New password<input name="password" type="password" minLength={10} className="rounded-2xl border border-slate-200 px-4 py-3" required /></label>
            <button disabled={!config.hasDatabase} className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:opacity-50">Create admin</button>
          </form>
        )}
      </div>
    </main>
  );
}
