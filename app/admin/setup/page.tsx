import { adminConfigState, isAdminConfigured } from "@/lib/admin/auth";
import { setupAdminAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  const config = adminConfigState();
  const configured = await isAdminConfigured();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Admin setup</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Create the Logo Manager admin</h1>
        {!config.hasDatabase ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">DATABASE_URL is missing. Run npm run db:push after configuring Postgres.</p> : null}
        {!config.hasSessionSecret ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Set ADMIN_SESSION_SECRET for durable secure sessions. ADMIN_SETUP_TOKEN is recommended for first setup.</p> : null}
        {configured ? <p className="mt-5 text-sm font-bold text-slate-600">Admin is already configured. Use /admin/login.</p> : (
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
