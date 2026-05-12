import Link from "next/link";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { bulkRefreshCoinGeckoLogosAction, createLogoAction, logoutAction } from "@/lib/admin/actions";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { listLogos } from "@/lib/admin/logoDb";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${tone}`}>{status.replace("_", " ")}</span>;
}

export default async function AdminLogosPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  await requireAdmin();
  const config = adminConfigState();
  const logos = config.hasDatabase ? (await listLogos()).rows : [];
  const bulkSummary = searchParams?.refreshed || searchParams?.missing || searchParams?.errors
    ? {
        refreshed: Number(searchParams.refreshed ?? 0),
        missing: Number(searchParams.missing ?? 0),
        errors: Number(searchParams.errors ?? 0),
        messages: Array.isArray(searchParams.error) ? searchParams.error : searchParams.error ? [searchParams.error] : [],
      }
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">Logo Manager</h1></div>
        <div className="flex flex-wrap gap-2">
          <form action={bulkRefreshCoinGeckoLogosAction}><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Bulk refresh CoinGecko logos</button></form>
          <form action={logoutAction}><button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Log out</button></form>
        </div>
      </header>
      {bulkSummary ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <p>Bulk CoinGecko refresh complete: {bulkSummary.refreshed} refreshed, {bulkSummary.missing} missing mappings, {bulkSummary.errors} errors.</p>
          {bulkSummary.messages.length ? <p className="mt-2 text-xs text-slate-500">First errors: {bulkSummary.messages.join("; ")}</p> : null}
        </div>
      ) : null}
      {!config.hasBlob ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">BLOB_READ_WRITE_TOKEN is missing. URL candidates and local vault imports work, but uploads are disabled.</p> : null}
      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-slate-950">Add logo</h2>
        <form action={createLogoAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input name="name" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Protocol, chain or asset name" required />
          <select name="category" className="rounded-2xl border border-slate-200 px-4 py-3"><option>project</option><option>chain</option><option>asset</option></select>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Create</button>
        </form>
      </section>
      <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        {logos.map((logo) => {
          const preview = logo.approved_logo_url || logo.fallback_logo_url;
          const isFallback = !logo.approved_logo_url && Boolean(logo.fallback_logo_url);
          const coinGeckoId = getCoinGeckoLogoId(logo.slug);
          return (
            <Link key={logo.id} href={`/admin/logos/${logo.slug}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_170px_130px_150px] md:items-center">
              <div className="flex items-center gap-3">
                {preview ? <img src={preview} alt="" className="h-10 w-10 rounded-full border border-slate-200 bg-white object-contain" /> : <div className="h-10 w-10 rounded-full bg-slate-100" />}
                <div><div className="font-black text-slate-950">{logo.name}</div><div className="text-xs font-bold text-slate-400">{logo.slug}{isFallback ? " · fallback preview" : ""}</div></div>
              </div>
              <div className="text-sm font-black text-slate-600">{logo.category}</div>
              <div className="text-xs font-bold text-slate-400">{coinGeckoId ? `CG: ${coinGeckoId}` : "Missing CoinGecko ID"}</div>
              <StatusBadge status={logo.status} />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
