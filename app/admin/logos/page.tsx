import Link from "next/link";
import { AdminSection, AdminShell } from "@/components/admin/AdminPrimitives";
import { LogoResultsClient, type LogoResultRow } from "@/components/admin/LogoResultsClient";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { applySafeCoinGeckoCandidatesAction, bulkRefreshCoinGeckoLogosAction, bulkRefreshCoinMarketCapLogosAction, createLogoAction, scanMetricLogosAction } from "@/lib/admin/actions";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { classifyLogoQa, summarizeLogoQa, type LogoQaRow } from "@/lib/admin/logoQa";
import { blobStatus, getBulkRefreshSummaries, type BulkRefreshSummary } from "@/lib/admin/providerStatus";
import { METRIC_LOGO_SCAN_SETTING, parseMetricLogoScanSummary } from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type DetailEntry = { label: string; slug?: string | null; title?: string };

const DEFAULT_LIMIT = 10;
const ACTION_ISSUES = new Set([
  "needs_review", "missing_approved_logo", "missing_coingecko_id", "coingecko_id_needs_review", "coingecko_fetch_failed", "cmc_fetch_failed", "fallback_used", "visual_rejected", "newly_discovered_entity", "metric_scan_error", "coingecko_candidate_waiting", "metric_scan_missing_coingecko_id", "metric_scan_candidate_added", "auto_approve_skipped", "db_overlay_not_applied", "rejected_source",
]);

const PRIMARY_FILTERS = [
  ["issues", "Needs action"], ["missing_approved_logo", "Missing logo"], ["missing_coingecko_id", "Missing CG"], ["provider_errors", "Provider review"], ["fallback_used", "Fallback"], ["visual_rejected", "Rejected"], ["newly_discovered_entity", "New"],
] as const;

const MORE_FILTERS = [
  ["all", "All"], ["approved", "Approved"], ["coingecko_candidate_waiting", "CG candidates"], ["missing_cmc_id", "Missing CMC"], ["cmc_fetch_failed", "CMC errors"], ["db_overlay_not_applied", "Overlay"], ["rejected_source", "Rejected sources"], ["coingecko_rate_limited", "Rate limited"], ["metric_scan_error", "Scan errors"],
] as const;

function firstParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function hasAction(row: LogoQaRow) {
  return row.issues.some((issue) => ACTION_ISSUES.has(issue));
}

function filterRows(rows: LogoQaRow[], filter: string) {
  if (filter === "all") return rows;
  if (filter === "issues") return rows.filter(hasAction);
  if (filter === "provider_errors") return rows.filter((row) => row.issues.includes("coingecko_fetch_failed") || row.issues.includes("cmc_fetch_failed") || row.issues.includes("coingecko_id_needs_review"));
  if (filter === "approved") return rows.filter((row) => row.logo.status === "approved" && !row.issues.includes("missing_approved_logo"));
  return rows.filter((row) => row.issues.includes(filter as any));
}

function actionPriority(row: LogoQaRow) {
  const order = ["needs_review", "missing_approved_logo", "missing_coingecko_id", "coingecko_id_needs_review", "coingecko_fetch_failed", "cmc_fetch_failed", "fallback_used", "visual_rejected", "newly_discovered_entity"];
  const index = order.findIndex((issue) => row.issues.includes(issue as any));
  return index === -1 ? 99 : index;
}

function sortRows(rows: LogoQaRow[], sort: string) {
  const copy = [...rows];
  if (sort === "issues") copy.sort((a, b) => actionPriority(a) - actionPriority(b) || b.issues.length - a.issues.length || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "status") copy.sort((a, b) => a.logo.status.localeCompare(b.logo.status) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "category") copy.sort((a, b) => a.logo.category.localeCompare(b.logo.category) || a.logo.name.localeCompare(b.logo.name));
  else if (sort === "fetch") copy.sort((a, b) => String(b.logo.last_fetch_at ?? "").localeCompare(String(a.logo.last_fetch_at ?? "")) || a.logo.name.localeCompare(b.logo.name));
  else copy.sort((a, b) => a.logo.name.localeCompare(b.logo.name));
  return copy;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") next.set(key, String(value)); });
  return `?${next.toString()}`;
}

function detailFromText(item: string): DetailEntry {
  const raw = item.trim();
  const slug = raw.split(/[\s:—,()]+/).find(Boolean)?.toLowerCase();
  return { label: raw, slug: slug || null, title: raw };
}

function DetailList({ entries, empty = "No details available" }: { entries: DetailEntry[]; empty?: string }) {
  const first = entries.slice(0, 20);
  if (!entries.length) return <div className="mt-1 rounded-lg bg-white p-2 text-slate-400">{empty}</div>;
  return <details className="mt-1"><summary className="cursor-pointer text-slate-500">Show first {Math.min(20, entries.length)}{entries.length > 20 ? ` of ${entries.length}` : ""}</summary><div className="mt-1 max-h-44 overflow-auto rounded-lg bg-white p-2">{first.map((entry) => entry.slug ? <Link key={`${entry.slug}-${entry.label}`} href={`/admin/logos/${encodeURIComponent(entry.slug)}`} className="mr-2 inline-block underline" title={entry.title}>{entry.label}</Link> : <span key={entry.label} className="mr-2 inline-block" title={entry.title}>{entry.label}</span>)}{entries.length > first.length ? <details className="mt-1"><summary className="cursor-pointer text-slate-400">Show all</summary>{entries.slice(20).map((entry) => entry.slug ? <Link key={`${entry.slug}-${entry.label}`} href={`/admin/logos/${encodeURIComponent(entry.slug)}`} className="mr-2 inline-block underline" title={entry.title}>{entry.label}</Link> : <span key={entry.label} className="mr-2 inline-block" title={entry.title}>{entry.label}</span>)}</details> : null}</div></details>;
}

function CompactRefreshSummary({ summary, missingMappings }: { summary: BulkRefreshSummary; missingMappings?: DetailEntry[] }) {
  const sections = [
    ["Errors", (summary.firstErrors ?? []).map(detailFromText)],
    ["Skipped reasons", (summary.firstSkippedReasons ?? []).map(detailFromText)],
    ["Missing mappings", missingMappings ?? []],
    ["Auto-approved", (summary.autoApprovedList ?? []).map(detailFromText)],
    ["Candidates", (summary.candidateList ?? []).map(detailFromText)],
  ] as const;
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-600">
    <div className="flex items-center justify-between gap-2"><div className="font-black text-slate-950">{summary.provider} refresh</div><div className="text-slate-400">{new Date(summary.timestamp).toLocaleString()}</div></div>
    <div className="mt-1">{summary.checked ?? 0} checked · {summary.idNeedsReview ?? 0} ID review · {summary.missingMappings ?? 0} missing · {summary.errors ?? 0} errors</div>
    <details className="mt-1"><summary className="cursor-pointer text-slate-500">Details</summary><div className="mt-2 grid gap-1">{sections.map(([label, entries]) => entries.length ? <details key={label}><summary className="cursor-pointer">{label} ({entries.length})</summary><DetailList entries={entries} /></details> : null)}{sections.every(([, entries]) => !entries.length) ? <div className="text-slate-400">No details available</div> : null}</div></details>
  </div>;
}

function MetricScanSummary({ scanSummary }: { scanSummary: NonNullable<ReturnType<typeof parseMetricLogoScanSummary>> }) {
  const groups = [
    ["Missing CoinGecko ID", scanSummary.details.filter((d) => d.actionTaken === "missing_coingecko_id")],
    ["Errors", scanSummary.details.filter((d) => d.error || d.actionTaken === "coingecko_fetch_failed")],
    ["Auto-approved", scanSummary.details.filter((d) => d.actionTaken === "auto_approved")],
    ["Candidates", scanSummary.details.filter((d) => d.actionTaken === "candidate_added" || d.actionTaken === "auto_approve_skipped" || d.actionTaken === "visual_rejected" || d.actionTaken === "previous_rejection" || d.actionTaken === "existing_admin_source")],
    ["Newly discovered", scanSummary.details.filter((d) => !d.existedBefore)],
  ] as const;
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-700">
    <div className="flex items-center justify-between gap-2"><div className="font-black">Metric scan</div><div className="text-slate-400">{new Date(scanSummary.timestamp).toLocaleString()}</div></div>
    <div className="mt-1">{scanSummary.rowsChecked} entities · {scanSummary.missingCoinGeckoIds} missing CG · {scanSummary.errors.length} error{scanSummary.errors.length === 1 ? "" : "s"}</div>
    <details className="mt-1"><summary className="cursor-pointer text-slate-500">Details</summary><div className="mt-2 grid gap-1">{groups.map(([label, details]) => details.length ? <details key={label}><summary className="cursor-pointer">{label} ({details.length})</summary><DetailList entries={details.map((detail) => ({ label: detail.name || detail.slug, slug: detail.slug, title: detail.reason || detail.error || detail.actionTaken }))} /></details> : null)}{groups.every(([, details]) => !details.length) ? <div className="text-slate-400">No details available</div> : null}</div></details>
  </div>;
}

function SourceTools({ summaries, scanSummary, missingMappingRows }: { summaries: Awaited<ReturnType<typeof getBulkRefreshSummaries>>; scanSummary: ReturnType<typeof parseMetricLogoScanSummary>; missingMappingRows: LogoQaRow[] }) {
  const missingEntries = missingMappingRows.map((row) => ({ label: `${row.logo.slug} — ${row.logo.name}`, slug: row.logo.slug }));
  return <AdminSection title="Source Tools" className="lg:sticky lg:top-4">
    <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3 lg:grid-cols-2">
      <form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="smart" /><button className="w-full rounded-full bg-slate-950 px-3 py-1.5 font-black text-white">Refresh missing</button></form>
      <form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="retry-errors" /><button className="w-full rounded-full border border-slate-200 px-3 py-1.5 font-black">Retry failed</button></form>
      <form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="force-all" /><button className="w-full rounded-full border border-slate-200 px-3 py-1.5 font-black">Force all</button></form>
      <form action={applySafeCoinGeckoCandidatesAction}><button className="w-full rounded-full border border-slate-200 px-3 py-1.5 font-black">Apply safe CG</button></form>
      <form action={scanMetricLogosAction}><button className="w-full rounded-full border border-slate-200 px-3 py-1.5 font-black">Scan metrics</button></form>
      <form action={bulkRefreshCoinMarketCapLogosAction}><button disabled={!process.env.COINMARKETCAP_API_KEY} className="w-full rounded-full border border-slate-200 px-3 py-1.5 font-black disabled:opacity-50">Refresh CMC</button></form>
    </div>
    <div className="mt-3 grid gap-2">
      {summaries.coingecko ? <CompactRefreshSummary summary={summaries.coingecko} missingMappings={missingEntries} /> : <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">CG refresh: not run yet</div>}
      {scanSummary ? <MetricScanSummary scanSummary={scanSummary} /> : <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">Metric scan: not run yet</div>}
      {summaries.coinmarketcap ? <CompactRefreshSummary summary={summaries.coinmarketcap} /> : null}
    </div>
  </AdminSection>;
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
  const sort = firstParam(searchParams?.sort, "issues");
  const candidateApplySummary = firstParam(searchParams?.candidateApply) ? `${firstParam(searchParams?.checkedCandidates, "0")} candidates checked · ${firstParam(searchParams?.autoApproved, "0")} auto-approved · ${firstParam(searchParams?.skipped, "0")} skipped` : "";
  const providerErrors = counts.coingecko_fetch_failed + counts.cmc_fetch_failed + counts.coingecko_id_needs_review;
  const needsAction = qaRows.filter(hasAction).length;
  const actionMetrics = [
    ["Needs action", needsAction], ["Missing approved logo", counts.missing_approved_logo], ["Missing CoinGecko ID", counts.missing_coingecko_id], ["Provider errors / ID review", providerErrors], ["Fallback used", counts.fallback_used], ["Visual rejected", counts.visual_rejected], ["Newly discovered", qaRows.filter((row) => row.issues.includes("newly_discovered_entity")).length],
  ].filter(([, value], index) => index === 0 || Number(value) > 0);
  const allMatchingRows = sortRows(filterRows(qaRows, filter), sort);
  const missingMappingRows = qaRows.filter((row) => row.issues.includes("missing_coingecko_id"));
  const clientRows: LogoResultRow[] = allMatchingRows.map((row) => ({
    id: row.logo.id,
    slug: row.logo.slug,
    name: row.logo.name,
    category: row.logo.category,
    status: row.logo.status,
    approvedLogoUrl: row.logo.approved_logo_url,
    fallbackLogoUrl: row.logo.fallback_logo_url,
    coinGeckoId: row.coinGeckoId,
    coinMarketCapId: row.coinMarketCapId,
    provider: row.logo.last_fetch_provider,
    providerSummary: row.providerSummary,
    issues: row.issues,
    searchText: [row.logo.name, row.logo.slug, row.logo.category, row.coinGeckoId, row.coinMarketCapId, row.logo.last_fetch_provider, row.logo.last_fetch_error, row.logo.notes, row.providerSummary, ...row.sources.flatMap((source) => [source.provider, source.image_url, source.source_url, source.status]), ...row.issues].filter(Boolean).join(" ").toLowerCase(),
  }));

  return <AdminShell active="logos" title="Logo Manager" subtitle="Single-screen source QA operations." max="max-w-[1500px]">
    {!config.hasDatabase ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">DATABASE_URL is missing. Logo persistence is disabled, but public card fallbacks remain available.</p> : null}
    {!config.hasBlob ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{blob.message}</p> : null}
    {firstParam(searchParams?.message) ? <p className={`mt-3 rounded-xl border p-3 text-xs font-bold ${firstParam(searchParams?.notice) === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{firstParam(searchParams?.message)}</p> : null}
    {candidateApplySummary ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Apply safe CoinGecko candidates complete: {candidateApplySummary}</p> : null}
    <AdminDbErrorPanel errors={dbErrors} />

    <section className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_370px]">
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-black tracking-[-0.02em] text-slate-950">Logo Search + Results</h2><p className="text-xs font-bold text-slate-400">Total logos: {counts.all} · Approved: {counts.approved} · Needs action: {needsAction}</p></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{actionMetrics.map(([label, value]) => <div key={label} className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1"><span className="text-xs font-black text-slate-950">{value}</span><span className="ml-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">{label}</span></div>)}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{PRIMARY_FILTERS.map(([key, label]) => <Link key={key} href={qs({ filter: key, q: query, sort })} className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</div>
          <details className="mt-1"><summary className="cursor-pointer text-xs font-black text-slate-500">More filters</summary><div className="mt-2 flex flex-wrap gap-1.5">{MORE_FILTERS.map(([key, label]) => <Link key={key} href={qs({ filter: key, q: query, sort })} className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</Link>)}</div></details>
        </div>

        <div className="border-b border-slate-100 p-2">
          <form className="flex flex-wrap gap-2"><input type="hidden" name="q" value={query} /><input type="hidden" name="filter" value={filter} /><select name="sort" defaultValue={sort} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="issues">Issues first</option><option value="name">Name A-Z</option><option value="fetch">Last fetch</option><option value="status">Status</option><option value="category">Category</option></select><button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Apply sort</button></form>
          <details className="mt-2 inline-block rounded-full border border-slate-200 bg-white px-3 py-1.5"><summary className="cursor-pointer text-xs font-black text-slate-950">+ Add logo</summary><form action={createLogoAction} className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-2 md:grid-cols-[180px_110px_auto]"><input name="name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Name" required /><select name="category" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option>project</option><option>chain</option><option>asset</option></select><button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Create</button></form></details>
        </div>

        <LogoResultsClient rows={clientRows} initialQuery={query} defaultLimit={DEFAULT_LIMIT} />
      </div>

      <SourceTools summaries={summaries} scanSummary={scanSummary} missingMappingRows={missingMappingRows} />
    </section>
  </AdminShell>;
}
