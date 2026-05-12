import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { addCoinGeckoAction, addDefiLlamaAction, addManualUrlAction, approveSourceAction, rejectLogoAction, rejectSourceAction, uploadLogoAction } from "@/lib/admin/actions";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { getLogo, getLogoSources } from "@/lib/admin/logoDb";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${tone}`}>{status.replace("_", " ")}</span>;
}

function LogoPreview({ src, label }: { src: string | null | undefined; label: string }) {
  return <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">{src ? <img src={src} alt={label} className="h-full w-full object-contain" /> : <span className="px-3 text-center text-xs font-black text-slate-400">No preview</span>}</div>;
}

export default async function LogoDetailPage({ params }: { params: { slug: string } }) {
  await requireAdmin();
  const logo = await getLogo(params.slug);
  if (!logo) notFound();
  const sources = (await getLogoSources(logo.id)).rows;
  const config = adminConfigState();
  const coinGeckoId = getCoinGeckoLogoId(logo.slug);
  const preview = logo.approved_logo_url || logo.fallback_logo_url;
  const hidden = <><input type="hidden" name="name" value={logo.name} /><input type="hidden" name="category" value={logo.category} /></>;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8">
      <Link href="/admin/logos" className="text-sm font-black text-slate-500">← Back to logos</Link>
      <header className="mt-5 grid gap-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-soft md:grid-cols-[1fr_140px] md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{logo.category}</p>
          <h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">{logo.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3"><StatusBadge status={logo.status} /><span className="text-sm font-bold text-slate-500">{logo.slug}</span><span className="text-sm font-bold text-slate-400">{coinGeckoId ? `CoinGecko: ${coinGeckoId}` : "Missing CoinGecko ID"}</span></div>
          {logo.approved_logo_url ? <p className="mt-2 text-sm font-bold text-emerald-700">Approved DB logo is shown in public cards when the database is available.</p> : logo.fallback_logo_url ? <p className="mt-2 text-sm font-bold text-amber-700">Showing local fallback preview because no DB logo is approved yet.</p> : null}
        </div>
        <LogoPreview src={preview} label={`${logo.name} logo preview`} />
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <form action={addCoinGeckoAction} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft">{hidden}<h2 className="font-black text-slate-950">CoinGecko candidate</h2><input name="coinGeckoId" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={coinGeckoId || "coingecko coin id, e.g. ethereum"} defaultValue={coinGeckoId || ""} required /><button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Fetch CoinGecko</button></form>
        <form action={addDefiLlamaAction} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft">{hidden}<h2 className="font-black text-slate-950">DefiLlama candidate</h2><input name="providerSlug" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={logo.slug} /><button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Add DefiLlama URL</button></form>
        <form action={addManualUrlAction} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft">{hidden}<h2 className="font-black text-slate-950">Manual URL</h2><input name="imageUrl" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="https://..." required /><button className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Add manual candidate</button></form>
        <form action={uploadLogoAction} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft">{hidden}<h2 className="font-black text-slate-950">Upload to Vercel Blob</h2>{!config.hasBlob ? <p className="mt-2 text-sm font-bold text-amber-700">BLOB_READ_WRITE_TOKEN is missing. URL candidates and local imports still work.</p> : null}<input name="file" type="file" accept="image/*" className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3" /><button disabled={!config.hasBlob} className="mt-3 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">Upload candidate</button></form>
      </section>

      <section className="mt-6 grid gap-4">
        <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Sources</h2>
        {sources.map((source) => {
          const sourcePreview = source.blob_url || source.image_url;
          return (
            <article key={source.id} className="grid gap-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-[96px_1fr_220px] md:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">{sourcePreview ? <img src={sourcePreview} alt="" className="h-full w-full object-contain" /> : <span className="text-xs font-black text-slate-400">No preview</span>}</div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="font-black text-slate-950">{source.provider}</div><StatusBadge status={source.status} /></div><a className="mt-1 block truncate text-sm font-bold text-slate-500 underline" href={source.image_url}>{source.image_url}</a>{source.rejection_reason ? <p className="mt-2 text-sm font-bold text-red-600">{source.rejection_reason}</p> : null}</div>
              <div className="grid gap-2">
                <form action={approveSourceAction}><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="slug" value={logo.slug} /><button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-black text-white">Approve</button></form>
                <form action={rejectSourceAction} className="grid gap-2"><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="slug" value={logo.slug} /><input name="reason" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Reason" /><button className="rounded-2xl border border-slate-200 px-4 py-2 font-black text-slate-700">Reject source</button></form>
              </div>
            </article>
          );
        })}
      </section>

      <form action={rejectLogoAction} className="mt-6 rounded-[26px] border border-red-200 bg-red-50 p-5"><input type="hidden" name="slug" value={logo.slug} /><h2 className="font-black text-red-900">Reject logo entity</h2><input name="reason" className="mt-3 w-full rounded-2xl border border-red-200 px-4 py-3" placeholder="Reason" /><button className="mt-3 rounded-2xl bg-red-700 px-5 py-3 font-black text-white">Reject logo</button></form>
    </main>
  );
}
