import Link from "next/link";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { createLogoAction, logoutAction } from "@/lib/admin/actions";
import { listLogos } from "@/lib/admin/logoDb";

export const dynamic = "force-dynamic";

export default async function AdminLogosPage() {
  await requireAdmin();
  const config = adminConfigState();
  const logos = config.hasDatabase ? (await listLogos()).rows : [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">Logo Manager</h1></div>
        <form action={logoutAction}><button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Log out</button></form>
      </header>
      {!config.hasBlob ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">BLOB_READ_WRITE_TOKEN is missing. URL candidates work, but uploads are disabled.</p> : null}
      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-slate-950">Add logo</h2>
        <form action={createLogoAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input name="name" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Protocol, chain or asset name" required />
          <select name="category" className="rounded-2xl border border-slate-200 px-4 py-3"><option>project</option><option>chain</option><option>asset</option></select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Create</button>
        </form>
      </section>
      <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        {logos.map((logo) => (
          <Link key={logo.id} href={`/admin/logos/${logo.slug}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_130px_110px] md:items-center">
            <div className="flex items-center gap-3">{logo.approved_logo_url ? <img src={logo.approved_logo_url} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-contain" /> : <div className="h-9 w-9 rounded-full bg-slate-100" />}<div><div className="font-black text-slate-950">{logo.name}</div><div className="text-xs font-bold text-slate-400">{logo.slug}</div></div></div>
            <div className="text-sm font-black text-slate-600">{logo.category}</div>
            <div className="text-sm font-black text-slate-500">{logo.status}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
