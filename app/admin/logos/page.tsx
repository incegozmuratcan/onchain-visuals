import Link from "next/link";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { applySafeCoinGeckoCandidatesAction, bulkRefreshCoinGeckoLogosAction, bulkRefreshCoinMarketCapLogosAction, createLogoAction, logoutAction, scanMetricLogosAction } from "@/lib/admin/actions";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { classifyLogoQa, summarizeLogoQa, type LogoQaRow } from "@/lib/admin/logoQa";
import { blobStatus, getBulkRefreshSummaries } from "@/lib/admin/providerStatus";
import { METRIC_LOGO_SCAN_SETTING, parseMetricLogoScanSummary } from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const FILTERS = [
  ["all", "All"], ["approved", "Approved"], ["newly_discovered_entity", "Newly discovered"], ["needs_review", "Needs review"], ["missing_approved_logo", "No approved logo"], ["missing_coingecko_id", "Missing CoinGecko ID"], ["coingecko_id_needs_review", "CoinGecko ID needs review"], ["coingecko_rate_limited", "Rate limited"], ["coingecko_candidate_waiting", "CoinGecko candidates"], ["coingecko_auto_approved", "Auto-approved"], ["coingecko_fetch_failed", "CoinGecko errors"], ["missing_cmc_id", "Missing CoinMarketCap ID"], ["cmc_fetch_failed", "CoinMarketCap errors"], ["fallback_used", "Fallback used"], ["visual_rejected", "Visual rejected"], ["rejected_source", "Rejected sources"], ["db_overlay_not_applied", "Overlay issues"], ["metric_scan_error", "Metric scan errors"],
] as const;

function firstParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.startsWith("approved") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tone}`}>{status.replace("_", " ")}</span>;
}

function IssueBadge({ issue }: { issue: string }) {
  const tone = issue.includes("missing") || issue.includes("failed") || issue.includes("rejected") ? "border-amber-200 bg-amber-50 text-amber-800" : issue === "visual_rejected" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${tone}`}>{issue.replaceAll("_", " ")}</span>;
}

function matches(row: LogoQaRow, query: string) {
  if (!query) return true;
  const haystack = [row.logo.name, row.logo.slug, row.logo.category, row.coinGeckoId, row.coinMarketCapId, row.logo.last_fetch_provider, row.logo.last_fetch_error, row.logo.notes, row.providerSummary, ...row.sources.flatMap((source) => [source.provider, source.image_url, source.source_url]), ...row.issues].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function filterRows(rows: LogoQaRow[], filter: string) {
  if (filter === "all" || filter === "issues") return filter === "issues" ? rows.filter((row) => row.issues.length) : rows;
  if (filter === "approved") return rows.filter((row) => row.logo.status === "approved" && !row.issues.includes("missing_approved_logo"));
  return rows.filter((row) => row.issues.includes(filter as any) || (filter === "newly_discovered_entity" && Boolean(row.logo.notes?.includes("newly_discovered_entity"))));
}

function sortRows(rows: LogoQaRow[], sort: string) {
  const copy = [...rows];
  const issueCount = (row: LogoQaRow) => row.issues.filter((issue) => issue !== "upload_disabled").length;
  if (sort === "issues") copy.sort((a, b) => issueCount(b) - issueCount(a) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "status") copy.sort((a, b) => a.logo.status.localeCompare(b.logo.status) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "category") copy.sort((a, b) => a.logo.category.localeCompare(b.logo.category) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "provider") copy.sort((a, b) => a.providerSummary.localeCompare(b.providerSummary) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "updated") copy.sort((a, b) => String(b.logo.updated_at ?? "").localeCompare(String(a.logo.updated_at ?? "")) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "fetch") copy.sort((a, b) => String(b.logo.last_fetch_at ?? "").localeCompare(String(a.logo.last_fetch_at ?? "")) || a.logo.name.localeCompare(b.logo.name));
  else copy.sort((a, b) => a.logo.name.localeCompare(b.logo.name));
  return copy;
}

function qs(params: Record<string, string>) {
  const next = new URLSearchParams(params);
  return `?${next.toString()}`;
}

export default async function AdminLogosPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdmin();
  const config = adminConfigState();
  const blob = blobStatus();
  const summaryResult = await safeAdminDbQuery("Bulk refresh summaries", getBulkRefreshSummaries, { coingecko: null, coinmarketcap: null });
  const scanResult = config.hasDatabase ? await safeAdminDbQuery("Metric logo discovery", async () => parseMetricLogoScanSummary(await getSetting(METRIC_LOGO_SCAN_SETTING)), null) : { data: null, error: null };
  const logoResult = config.hasDatabase ? await safeAdminDbQuery("Logo records", async () => (await listLogos()).rows, []) : { data: [], error: null };
  const sourceResult = config.hasDatabase ? await safeAdminDbQuery("Logo sources", async () => (await getAllLogoSources()).rows, []) : { data: [], error: null };
  const summaries = summaryResult.data;
  const scanSummary = scanResult.data;
  const logos = logoResult.data;
  const sourceRows = sourceResult.data;
  const dbErrors = [summaryResult.error, scanResult.error, logoResult.error, sourceResult.error].filter(Boolean);
  const sourcesByLogo = new Map<string, typeof sourceRows>();
  for (const source of sourceRows) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);
  const qaRows = logos.map((logo) => classifyLogoQa(logo, sourcesByLogo.get(logo.id) ?? [], config.hasBlob));
  const counts = summarizeLogoQa(qaRows);
  const filter = firstParam(searchParams?.filter, "all");
  const query = firstParam(searchParams?.q, "").trim();
  const sort = firstParam(searchParams?.sort, "name");
  const candidateApplySummary = firstParam(searchParams?.candidateApply) ? `${firstParam(searchParams?.checkedCandidates, "0")} candidates checked · ${firstParam(searchParams?.autoApproved, "0")} auto-approved · ${firstParam(searchParams?.skipped, "0")} skipped` : "";
  const rows = sortRows(filterRows(qaRows, filter).filter((row) => matches(row, query)), sort);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="mt-2 text-5xl font-black tracking-[-0.07em] text-slate-950">Logo Manager</h1><p className="mt-2 max-w-2xl text-sm font-bold text-slate-500">QA inbox, source tools and approved DB logo operations. Public cards still prefer approved DB logos, then the local vault, then clean fallbacks.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Dashboard</Link><form action={logoutAction}><button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Log out</button></form></div>
      </header>

      {!config.hasDatabase ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">DATABASE_URL is missing. Logo persistence is disabled, but public card fallbacks remain available.</p> : null}
      {!config.hasBlob ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{blob.message}</p> : null}
      {candidateApplySummary ? <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Apply safe CoinGecko candidates complete: {candidateApplySummary}</p> : null}

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Logo QA Inbox</h2><p className="mt-1 text-sm font-bold text-slate-500">Issue detection for missing, rejected, fallbacked and provider-failed logo records.</p></div><Link href="/admin/api" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">API Settings</Link></div>
        <div className="mt-4 grid gap-3 md:grid-cols-5 xl:grid-cols-10">{[
          ["Approved", counts.approved], ["Needs review", counts.needs_review], ["Missing approved logo", counts.missing_approved_logo], ["Missing CoinGecko ID", counts.missing_coingecko_id], ["CG ID review", counts.coingecko_id_needs_review], ["Rate limited", counts.coingecko_rate_limited], ["CG candidates", counts.coingecko_candidate_waiting], ["CG auto-approved", counts.coingecko_auto_approved], ["CoinGecko errors", counts.coingecko_fetch_failed], ["Missing CoinMarketCap ID", counts.missing_cmc_id], ["CoinMarketCap errors", counts.cmc_fetch_failed], ["Fallback used", counts.fallback_used], ["Visual rejected", counts.visual_rejected], ["Rejected sources", counts.rejected_source], ["Overlay issues", counts.db_overlay_not_applied],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="text-xl font-black text-slate-950">{value}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">{FILTERS.map(([key, label]) => <Link key={key} href={qs({ filter: key, q: query, sort })} className={`rounded-full border px-3 py-1.5 text-xs font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft"><summary className="cursor-pointer text-sm font-black text-slate-950">Add logo</summary><form action={createLogoAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_150px_auto]"><input name="name" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Protocol, chain or asset name" required /><select name="category" className="rounded-2xl border border-slate-200 px-4 py-3"><option>project</option><option>chain</option><option>asset</option></select><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Create</button></form></details>
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Source tools</h2><div className="mt-3 grid gap-2"><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="smart" /><button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Refresh missing / needs review</button></form><div className="grid gap-2 sm:grid-cols-2"><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="retry-errors" /><button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black">Retry failed only</button></form><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="force-all" /><button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black">Force refresh all</button></form></div><form action={applySafeCoinGeckoCandidatesAction}><button className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">Apply safe CoinGecko candidates</button></form><form action={scanMetricLogosAction}><button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black">Scan active metrics for missing logos</button></form><form action={bulkRefreshCoinMarketCapLogosAction}><button disabled={!process.env.COINMARKETCAP_API_KEY} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black disabled:opacity-50">Bulk refresh CoinMarketCap logos</button></form></div>{scanSummary ? <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><div className="font-black">Last metric logo scan</div><div>{scanSummary.metricsScanned} metrics · {scanSummary.rowsChecked} entities · {scanSummary.newEntities} new · {scanSummary.autoApproved} auto · {scanSummary.candidates} candidates · {scanSummary.missingCoinGeckoIds} missing CG · {scanSummary.errors.length} errors</div><div>{new Date(scanSummary.timestamp).toLocaleString()}</div><div className="mt-1 text-emerald-900">Missing CG: {scanSummary.details.filter((d) => d.actionTaken === "missing_coingecko_id").slice(0, 4).map((d) => d.name).join(", ") || "—"}</div><div>Auto: {scanSummary.details.filter((d) => d.actionTaken === "auto_approved").slice(0, 4).map((d) => d.name).join(", ") || "—"}</div></div> : null}{[summaries.coingecko, summaries.coinmarketcap].filter(Boolean).map((summary) => summary ? <div key={summary.provider} className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600"><div className="font-black text-slate-950">Last {summary.provider} refresh</div><div>{summary.checked ?? 0} checked · {summary.fetched ?? summary.refreshed} fetched · {summary.autoApproved ?? 0} auto-approved · {summary.alreadyApproved ?? 0} already approved · {summary.candidates ?? 0} candidates · {summary.rateLimited ?? 0} rate limited · {summary.missingMappings} missing mappings · {summary.idNeedsReview ?? 0} ID review · {summary.errors} errors</div><div className="text-slate-400">{new Date(summary.timestamp).toLocaleString()}</div>{summary.firstSkippedReasons?.length ? <div className="mt-1 text-amber-800">Skipped: {summary.firstSkippedReasons.slice(0, 3).join("; ")}</div> : null}{summary.firstErrors.length ? <div className="mt-1 text-red-700">First errors: {summary.firstErrors.join("; ")}</div> : null}</div> : null)}</section>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-soft">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input name="q" defaultValue={query} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Search name, slug, category, CG/CMC ID, provider, source URL or issue type" /><input type="hidden" name="filter" value={filter} /><select name="sort" defaultValue={sort} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="name">Name A-Z</option><option value="issues">Issues first</option><option value="status">Status</option><option value="category">Category</option><option value="provider">Source provider</option><option value="updated">Last updated</option><option value="fetch">Last fetch time</option></select><button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Search</button></form>
      </section>

      <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="hidden grid-cols-[1.25fr_95px_160px_110px_1fr_1fr_1fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 lg:grid"><div>Logo</div><div>Category</div><div>Provider IDs</div><div>Status</div><div>Providers/issues</div><div>Last fetch</div><div>Recommended next action</div></div>
        {rows.map((row) => {
          const preview = row.logo.approved_logo_url || row.logo.fallback_logo_url;
          const displayIssues = row.issues.filter((issue) => issue !== "upload_disabled").slice(0, 5);
          return (
            <Link key={row.logo.id} href={`/admin/logos/${row.logo.slug}`} className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.25fr_95px_160px_110px_1fr_1fr_1fr] lg:items-center">
              <div className="flex items-center gap-3">{preview ? <img src={preview} alt="" className="h-10 w-10 rounded-full border border-slate-200 bg-white object-contain" /> : <div className="h-10 w-10 rounded-full bg-slate-100" />}<div><div className="font-black text-slate-950">{row.logo.name}</div><div className="text-xs font-bold text-slate-400">{row.logo.slug}{!row.logo.approved_logo_url && row.logo.fallback_logo_url ? " · fallback preview" : ""}</div></div></div>
              <div className="text-sm font-black text-slate-600">{row.logo.category}</div>
              <div className="text-xs font-bold text-slate-500"><div>CG: {row.coinGeckoId || "missing"}</div><div>CMC: {row.coinMarketCapId || "missing"}</div></div>
              <StatusBadge status={row.logo.status} />
              <div><div className="mb-1 text-xs font-bold text-slate-400">{row.providerSummary}</div><div className="flex flex-wrap gap-1.5">{displayIssues.length ? displayIssues.map((issue) => <IssueBadge key={issue} issue={issue} />) : <IssueBadge issue="approved" />}</div></div>
              <div className="text-xs font-bold text-slate-500"><div>{row.logo.last_fetch_provider || "—"}</div><div>{row.logo.last_fetch_at ? new Date(row.logo.last_fetch_at).toLocaleString() : "never"}</div>{row.logo.last_fetch_error ? <div className="mt-1 text-amber-700">{row.logo.last_fetch_error}</div> : null}</div>
              <div className="text-sm font-bold text-slate-600">{row.recommendedAction}</div>
            </Link>
          );
        })}
        {!rows.length ? <div className="p-8 text-center text-sm font-bold text-slate-500">No logos match this search/filter.</div> : null}
      </section>
    </main>
  );
}
