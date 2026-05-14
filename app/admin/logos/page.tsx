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

const PRIMARY_FILTERS = [
  ["issues", "Needs action"], ["missing_approved_logo", "Missing logo"], ["missing_coingecko_id", "Missing CoinGecko ID"], ["provider_errors", "Provider errors"], ["fallback_used", "Fallback used"], ["visual_rejected", "Visual rejected"], ["newly_discovered_entity", "Newly discovered"],
] as const;

const MORE_FILTERS = [
  ["all", "All"], ["approved", "Approved"], ["coingecko_auto_approved", "Auto-approved"], ["coingecko_candidate_waiting", "CoinGecko candidates"], ["missing_cmc_id", "CoinMarketCap missing"], ["cmc_fetch_failed", "CoinMarketCap errors"], ["db_overlay_not_applied", "Overlay issues"], ["rejected_source", "Rejected sources"], ["coingecko_rate_limited", "Rate limited"], ["metric_scan_error", "Metric scan errors"],
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
  if (filter === "all") return rows;
  if (filter === "issues") return rows.filter((row) => row.issues.some((issue) => issue !== "already_approved" && issue !== "coingecko_auto_approved" && issue !== "upload_disabled"));
  if (filter === "provider_errors") return rows.filter((row) => row.issues.includes("coingecko_fetch_failed") || row.issues.includes("cmc_fetch_failed") || row.issues.includes("coingecko_id_needs_review"));
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

function parseSummaryItem(item: string) {
  const slug = item.split(":")[0]?.split(" ")[0]?.replace(/[(),]/g, "").trim();
  return slug || item;
}

function DetailList({ items, empty = "No details available" }: { items: string[]; empty?: string }) {
  const first = items.slice(0, 20);
  if (!items.length) return <div className="mt-1 rounded-lg bg-white p-2 text-slate-400">{empty}</div>;
  return <div className="mt-1 max-h-44 overflow-auto rounded-lg bg-white p-2">{first.map((item) => { const slug = parseSummaryItem(item); return <Link key={item} href={`/admin/logos/${slug}`} className="mr-2 inline-block underline" title={item}>{item}</Link>; })}{items.length > first.length ? <span className="text-slate-400">+{items.length - first.length} more</span> : null}</div>;
}

function CompactRefreshSummary({ summary, missingMappings }: { summary: NonNullable<Awaited<ReturnType<typeof getBulkRefreshSummaries>>["coingecko"]>; missingMappings?: LogoQaRow[] }) {
  const skipped = summary.firstSkippedReasons ?? [];
  const errors = summary.firstErrors ?? [];
  const auto = summary.autoApprovedList ?? [];
  const candidates = summary.candidateList ?? [];
  const missing = (missingMappings ?? []).map((row) => `${row.logo.slug} — ${row.logo.name}`);
  const missingCount = missing.length || (summary.missingMappings ?? 0);
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600"><div className="flex items-center justify-between gap-2"><div className="font-black text-slate-950">Last {summary.provider} refresh</div><div className="text-slate-400">{new Date(summary.timestamp).toLocaleString()}</div></div><div className="mt-1">{summary.checked ?? 0} checked · {summary.fetched ?? summary.refreshed} fetched · {summary.idNeedsReview ?? 0} ID review · {missingCount} missing mappings · {summary.errors ?? 0} errors</div><details className="mt-2"><summary className="cursor-pointer text-slate-500">details</summary><div className="mt-2 grid gap-1">{errors.length ? <details><summary className="cursor-pointer text-red-700">Show errors ({errors.length})</summary><DetailList items={errors} /></details> : null}{skipped.length ? <details><summary className="cursor-pointer text-amber-800">Show skipped reasons ({skipped.length})</summary><DetailList items={skipped} /></details> : null}{missingCount > 0 ? <details><summary className="cursor-pointer">Show missing mappings ({missingCount})</summary><DetailList items={missing} /></details> : null}{auto.length ? <details><summary className="cursor-pointer">Show auto-approved list ({auto.length})</summary><DetailList items={auto} /></details> : null}{candidates.length ? <details><summary className="cursor-pointer">Show candidates list ({candidates.length})</summary><DetailList items={candidates} /></details> : null}{!errors.length && !skipped.length && !missingCount && !auto.length && !candidates.length ? <div className="text-slate-400">No details available</div> : null}</div></details></div>;
}

function MetricScanSummary({ scanSummary }: { scanSummary: NonNullable<ReturnType<typeof parseMetricLogoScanSummary>> }) {
  const groups = [
    ["Missing CoinGecko ID", scanSummary.details.filter((d) => d.actionTaken === "missing_coingecko_id")],
    ["Auto-approved", scanSummary.details.filter((d) => d.actionTaken === "auto_approved")],
    ["Candidates", scanSummary.details.filter((d) => d.actionTaken === "candidate_added" || d.actionTaken === "auto_approve_skipped" || d.actionTaken === "visual_rejected" || d.actionTaken === "previous_rejection" || d.actionTaken === "existing_admin_source")],
    ["Errors", scanSummary.details.filter((d) => d.error || d.actionTaken === "coingecko_fetch_failed")],
    ["Newly discovered", scanSummary.details.filter((d) => !d.existedBefore)],
  ] as const;
  return <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><div className="flex items-center justify-between gap-2"><div className="font-black">Last metric logo scan</div><div className="text-emerald-700/70">{new Date(scanSummary.timestamp).toLocaleString()}</div></div><div className="mt-1">{scanSummary.metricsScanned} metrics · {scanSummary.rowsChecked} entities · {scanSummary.newEntities} new · {scanSummary.missingCoinGeckoIds} missing CG · {scanSummary.errors.length} error{scanSummary.errors.length === 1 ? "" : "s"}</div><div className="mt-2 grid gap-1">{groups.map(([label, details]) => details.length ? <details key={label}><summary className="cursor-pointer">Show {label.toLowerCase()} ({details.length})</summary><div className="mt-1 max-h-40 overflow-auto rounded-lg bg-white p-2 text-emerald-950">{details.map((detail) => <Link key={`${label}-${detail.slug}-${detail.actionTaken}`} href={`/admin/logos/${detail.slug}`} className="mr-2 inline-block underline" title={detail.reason || detail.error || ""}>{detail.name}</Link>)}</div></details> : null)}</div></div>;
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
  const filter = firstParam(searchParams?.filter, "issues");
  const query = firstParam(searchParams?.q, "").trim();
  const sort = firstParam(searchParams?.sort, "name");
  const candidateApplySummary = firstParam(searchParams?.candidateApply) ? `${firstParam(searchParams?.checkedCandidates, "0")} candidates checked · ${firstParam(searchParams?.autoApproved, "0")} auto-approved · ${firstParam(searchParams?.skipped, "0")} skipped` : "";
  const providerErrors = counts.coingecko_fetch_failed + counts.cmc_fetch_failed + counts.coingecko_id_needs_review;
  const needsAction = qaRows.filter((row) => row.issues.some((issue) => issue !== "already_approved" && issue !== "coingecko_auto_approved" && issue !== "upload_disabled")).length;
  const actionMetrics = [
    ["Needs action", needsAction], ["Missing approved logo", counts.missing_approved_logo], ["Missing CoinGecko ID", counts.missing_coingecko_id], ["Provider errors / ID review", providerErrors], ["Fallback used", counts.fallback_used], ["Visual rejected", counts.visual_rejected], ["Newly discovered", qaRows.filter((row) => row.issues.includes("newly_discovered_entity")).length], ["Rate limited", counts.coingecko_rate_limited], ["Overlay issues", counts.db_overlay_not_applied],
  ].filter(([, value], index) => index === 0 || Number(value) > 0);
  const rows = sortRows(filterRows(qaRows, filter).filter((row) => matches(row, query)), sort);
  const missingMappingRows = qaRows.filter((row) => row.issues.includes("missing_coingecko_id"));

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">learnDeFi admin</p><h1 className="text-3xl font-black tracking-[-0.07em] text-slate-950">Logo Manager</h1><p className="mt-1 text-xs font-bold text-slate-500">Action-first QA, source tools and DB-approved logo operations.</p></div>
        <div className="flex items-center gap-2"><nav className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-black shadow-soft"><Link href="/admin" className="rounded-full px-3 py-1.5 text-slate-600">Dashboard</Link><Link href="/admin/logos" className="rounded-full bg-slate-950 px-3 py-1.5 text-white">Logo Manager</Link><Link href="/admin/api" className="rounded-full px-3 py-1.5 text-slate-600">API</Link><Link href="/admin/brand" className="rounded-full px-3 py-1.5 text-slate-600">Brand</Link></nav><form action={logoutAction}><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Log out</button></form></div>
      </header>

      {!config.hasDatabase ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">DATABASE_URL is missing. Logo persistence is disabled, but public card fallbacks remain available.</p> : null}
      {!config.hasBlob ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{blob.message}</p> : null}
      {candidateApplySummary ? <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Apply safe CoinGecko candidates complete: {candidateApplySummary}</p> : null}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">Logo QA Inbox</h2><p className="mt-1 text-xs font-bold text-slate-500">Total logos: {counts.all} · Approved: {counts.approved} · Needs action: {needsAction}</p></div><Link href="/admin/api" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">API Settings</Link></div>
        <div className="mt-3 flex flex-wrap gap-2">{actionMetrics.map(([label, value]) => <div key={label} className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5"><span className="text-sm font-black text-slate-950">{value}</span><span className="ml-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-800">{label}</span></div>)}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">{PRIMARY_FILTERS.map(([key, label]) => <Link key={key} href={qs({ filter: key, q: query, sort })} className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</div>
        <details className="mt-2"><summary className="cursor-pointer text-xs font-black text-slate-500">More filters</summary><div className="mt-2 flex flex-wrap gap-1.5">{MORE_FILTERS.map(([key, label]) => <Link key={key} href={qs({ filter: key, q: query, sort })} className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</div></details>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[240px_1fr] lg:items-start">
        <details className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-soft">
          <summary className="cursor-pointer text-sm font-black text-slate-950">Add logo</summary>
          <form action={createLogoAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_140px_auto]"><input name="name" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Protocol, chain or asset name" required /><select name="category" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option>project</option><option>chain</option><option>asset</option></select><button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Create</button></form>
        </details>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Source tools</h2><span className="text-[10px] font-bold text-slate-400">manual only</span></div><div className="mt-2 flex flex-wrap gap-2"><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="smart" /><button className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">Refresh missing</button></form><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="retry-errors" /><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Retry failed</button></form><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="force-all" /><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Force all</button></form><form action={applySafeCoinGeckoCandidatesAction}><button className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">Apply safe CG</button></form><form action={scanMetricLogosAction}><button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">Scan metrics</button></form><form action={bulkRefreshCoinMarketCapLogosAction}><button disabled={!process.env.COINMARKETCAP_API_KEY} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black disabled:opacity-50">Refresh CMC</button></form></div><div className="mt-3 grid gap-2">{scanSummary ? <MetricScanSummary scanSummary={scanSummary} /> : null}{[summaries.coingecko, summaries.coinmarketcap].filter(Boolean).map((summary) => summary ? <CompactRefreshSummary key={summary.provider} summary={summary} missingMappings={summary.provider === "CoinGecko" ? missingMappingRows : undefined} /> : null)}</div></section>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input name="q" defaultValue={query} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search name, slug, category, provider ID, issue" /><input type="hidden" name="filter" value={filter} /><select name="sort" defaultValue={sort} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="name">Name A-Z</option><option value="issues">Issues first</option><option value="status">Status</option><option value="category">Category</option><option value="provider">Source provider</option><option value="updated">Last updated</option><option value="fetch">Last fetch time</option></select><button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Search</button></form>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="hidden grid-cols-[1.25fr_95px_160px_110px_1fr_1fr_1fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 lg:grid"><div>Logo</div><div>Category</div><div>Provider IDs</div><div>Status</div><div>Providers/issues</div><div>Last fetch</div><div>Recommended next action</div></div>
        {rows.map((row) => {
          const preview = row.logo.approved_logo_url || row.logo.fallback_logo_url;
          const displayIssues = row.issues.filter((issue) => issue !== "upload_disabled" && issue !== "already_approved" && issue !== "coingecko_auto_approved").slice(0, 3);
          return (
            <Link key={row.logo.id} href={`/admin/logos/${row.logo.slug}`} className="grid gap-3 border-b border-slate-100 px-4 py-2.5 transition hover:bg-slate-50 lg:grid-cols-[1.25fr_95px_160px_110px_1fr_1fr_1fr] lg:items-center">
              <div className="flex items-center gap-3">{preview ? <img src={preview} alt="" className="h-8 w-8 rounded-full border border-slate-200 bg-white object-contain" /> : <div className="h-8 w-8 rounded-full bg-slate-100" />}<div><div className="font-black text-slate-950">{row.logo.name}</div><div className="text-xs font-bold text-slate-400">{row.logo.slug}{!row.logo.approved_logo_url && row.logo.fallback_logo_url ? " · fallback preview" : ""}</div></div></div>
              <div className="text-sm font-black text-slate-600">{row.logo.category}</div>
              <div className="text-xs font-bold text-slate-500"><div>CG: {row.coinGeckoId || "missing"}</div><div>CMC: {row.coinMarketCapId || "missing"}</div></div>
              <StatusBadge status={row.logo.status} />
              <div><div className="mb-1 text-xs font-bold text-slate-400">{row.providerSummary}</div><div className="flex flex-wrap gap-1.5">{displayIssues.length ? displayIssues.map((issue) => <IssueBadge key={issue} issue={issue} />) : <IssueBadge issue="approved" />}</div></div>
              <div className="text-xs font-bold text-slate-500"><div>{row.logo.last_fetch_provider || "—"}</div><div>{row.logo.last_fetch_at ? new Date(row.logo.last_fetch_at).toLocaleString() : "never"}</div>{row.logo.last_fetch_error ? <div className="mt-1 truncate text-amber-700" title={row.logo.last_fetch_error || ""}>{row.logo.last_fetch_error}</div> : null}</div>
              <div className="text-sm font-bold text-slate-600">{row.recommendedAction}</div>
            </Link>
          );
        })}
        {!rows.length ? <div className="p-8 text-center text-sm font-bold text-slate-500">No logos match this search/filter.</div> : null}
      </section>
    </main>
  );
}
