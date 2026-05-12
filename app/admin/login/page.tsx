import Link from "next/link";
import { getAdminConfigDiagnostic } from "@/lib/admin/auth";
import { loginAction } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const diagnostic = await getAdminConfigDiagnostic();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Admin</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Logo Manager login</h1>
        {!diagnostic.hasDatabaseConfig ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">DATABASE_URL is missing. Add it before using admin login.</p>
        ) : !diagnostic.canReadAdminSettings ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            <p>Admin configuration could not be read. Check Vercel logs and verify the admin_settings table before running setup again.</p>
            {diagnostic.errorMessage ? <p className="mt-2 text-xs">Last safe error: {diagnostic.errorMessage}</p> : null}
          </div>
        ) : !diagnostic.hasAdminPasswordHash ? (
          <p className="mt-5 text-sm font-bold text-slate-600">No admin password is configured yet. <Link className="font-black text-slate-950 underline" href="/admin/setup">Run setup</Link>.</p>
        ) : (
          <form action={loginAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-black text-slate-700">Password<input name="password" type="password" className="rounded-2xl border border-slate-200 px-4 py-3" required /></label>
            <button className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white">Log in</button>
          </form>
        )}
      </div>
    </main>
  );
}
