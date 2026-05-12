import Link from "next/link";
import { requireAdmin, logoutAction } from "@/lib/admin/auth";
import { getAdminSetupStatus } from "@/lib/admin/config";
import { getAdminLogos } from "@/lib/admin/logoData";
import { markNeedsReviewAction, refreshCoinGeckoAction, refreshDefiLlamaAction, approveLogoAction } from "@/lib/admin/logoOps";
import type { AdminLogoRecord } from "@/lib/admin/types";

const filters = ["all", "approved", "missing", "needs_review", "visual_rejected", "fallback", "coingecko_missing", "chain", "project", "asset", "depin", "active"];

function matchesFilter(logo: AdminLogoRecord, filter: string) {
  if (filter === "all") return true;
  if (filter === "approved") return logo.status === "approved";
  if (filter === "missing") return logo.status === "missing";
  if (filter === "needs_review") return logo.status === "needs_review" || logo.visualStatus === "needs_review";
  if (filter === "visual_rejected") return logo.visualStatus === "visual_rejected";
  if (filter === "fallback") return logo.visualStatus === "fallback" || !logo.optimizedUrl;
  if (filter === "coingecko_missing") return !logo.coingeckoId;
  if (["chain", "project", "asset"].includes(filter)) return logo.category === filter;
  if (filter === "depin") return logo.usedInMetrics.some((metric) => metric.includes("depin"));
  if (filter === "active") return logo.usedInMetrics.length > 0;
  return true;
}

function matchesSearch(logo: AdminLogoRecord, search: string) {
  if (!search) return true;
  const haystack = [logo.canonicalName, logo.slug, logo.coingeckoId || "", ...logo.aliases].join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const cls = { slate: "bg-slate-100 text-slate-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${cls}`}>{children}</span>;
}

export default async function AdminLogos({ searchParams }: { searchParams: { filter?: string; q?: string } }) {
  requireAdmin();
  const setup = getAdminSetupStatus();
  const allLogos = await getAdminLogos();
  const filter = searchParams.filter || "all";
  const q = searchParams.q || "";
  const logos = allLogos.filter((logo) => matchesFilter(logo, filter)).filter((logo) => matchesSearch(logo, q));
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Internal admin</p><h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">Logo Manager</h1><p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">Manage source-backed entity logos, CoinGecko IDs, fallbacks, review states and optimized assets without hotlinking provider logos at public runtime.</p></div>
          <div className="flex gap-2"><Link href="/admin/setup" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black">Setup</Link><form action={logoutAction as never}><button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Logout</button></form></div>
        </div>
        {setup.warnings.length > 0 && <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{setup.warnings[0]} <Link className="underline" href="/admin/setup">View setup</Link></div>}
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <form className="flex flex-wrap gap-3">
            <input type="search" name="q" defaultValue={q} placeholder="Search name, slug, alias, CoinGecko ID" className="min-w-[280px] flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-slate-950" />
            <input type="hidden" name="filter" value={filter} />
            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">{filters.map((item) => <Link key={item} href={`/admin/logos?filter=${item}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-3 py-1.5 text-xs font-black ${filter === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{item.replace(/_/g, " ")}</Link>)}</div>
        </div>
        <div className="mt-6 overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-4 py-3">Logo</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">CoinGecko</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Visual</th><th className="px-4 py-3">Fallback?</th><th className="px-4 py-3">Metrics</th><th className="px-4 py-3">Last synced</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{logos.map((logo) => <tr key={`${logo.category}:${logo.slug}`} className="align-top"><td className="px-4 py-4"><div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500">{logo.optimizedUrl || logo.localPath ? <img src={logo.optimizedUrl || logo.localPath || ""} alt="" className="h-full w-full object-contain" /> : logo.fallbackText}</div></td><td className="px-4 py-4 font-black">{logo.canonicalName}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{logo.slug}</td><td className="px-4 py-4"><Badge>{logo.category}</Badge></td><td className="px-4 py-4 text-xs font-bold text-slate-600">{logo.coingeckoId || <span className="text-slate-300">missing</span>}</td><td className="px-4 py-4 text-xs font-bold text-slate-600">{logo.sourceProvider || "—"}</td><td className="px-4 py-4"><Badge tone={logo.status === "approved" ? "green" : logo.status === "rejected" ? "red" : "amber"}>{logo.status}</Badge></td><td className="px-4 py-4"><Badge tone={logo.visualStatus === "accepted" ? "green" : logo.visualStatus === "visual_rejected" ? "red" : "amber"}>{logo.visualStatus}</Badge></td><td className="px-4 py-4"><Badge tone={logo.visualStatus === "fallback" || !logo.optimizedUrl ? "amber" : "slate"}>{logo.visualStatus === "fallback" || !logo.optimizedUrl ? "yes" : "no"}</Badge></td><td className="px-4 py-4 text-xs font-bold text-slate-500">{logo.usedInMetrics.length}</td><td className="px-4 py-4 text-xs font-bold text-slate-500">{logo.lastSyncedAt ? new Date(logo.lastSyncedAt).toLocaleDateString() : "—"}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Link className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white" href={`/admin/logos/${logo.slug}`}>View</Link><form action={refreshCoinGeckoAction as never}><input type="hidden" name="slug" value={logo.slug} /><input type="hidden" name="coingeckoId" value={logo.coingeckoId || ""} /><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">CG</button></form><form action={refreshDefiLlamaAction as never}><input type="hidden" name="slug" value={logo.slug} /><input type="hidden" name="defillamaSlug" value={logo.defillamaSlug || logo.slug} /><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">DL</button></form><form action={approveLogoAction as never}><input type="hidden" name="slug" value={logo.slug} /><button className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-black text-emerald-700">Approve</button></form><form action={markNeedsReviewAction as never}><input type="hidden" name="slug" value={logo.slug} /><button className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-black text-amber-700">Review</button></form></div></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
