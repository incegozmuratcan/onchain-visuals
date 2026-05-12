import Link from "next/link";
import { loginAction } from "@/lib/admin/auth";
import { getAdminSetupStatus } from "@/lib/admin/config";

export default function AdminLogin({ searchParams }: { searchParams: { error?: string } }) {
  const setup = getAdminSetupStatus();
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Internal admin</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">Logo Manager login</h1>
        {!setup.adminPassword ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            ADMIN_PASSWORD is missing. Configure it before admin login is allowed. <Link href="/admin/setup" className="underline">View setup</Link>.
          </div>
        ) : (
          <form action={loginAction as never} className="mt-6 grid gap-4">
            {searchParams.error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Incorrect password.</p>}
            <label className="grid gap-2 text-sm font-black text-slate-700">
              Admin password
              <input name="password" type="password" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-950" autoFocus />
            </label>
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Sign in</button>
          </form>
        )}
        <Link href="/admin/setup" className="mt-5 block text-sm font-bold text-slate-500 underline">Setup status</Link>
      </div>
    </main>
  );
}
