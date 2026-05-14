import Link from "next/link";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { applySafeCoinGeckoCandidatesAction, bulkRefreshCoinGeckoLogosAction, logoutAction, scanMetricLogosAction } from "@/lib/admin/actions";
import { getApiProviderCards, getBulkRefreshSummaries, blobStatus, type ApiProviderCard } from "@/lib/admin/providerStatus";
import { classifyLogoQa, summarizeLogoQa } from "@/lib/admin/logoQa";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";
import { METRIC_LOGO_SCAN_SETTING, parseMetricLogoScanSummary } from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const tone = status === "connected" || status === "public-no-key" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "error" || status === "missing key" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone}`}>{status}</span>;
}

function ProviderCard({ provider }: { provider: ApiProviderCard }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3"><h3 className="font-black text-slate-950">{provider.name}</h3><StatusBadge status={provider.status} /></div>
      <dl className="mt-3 grid gap-1 text-xs font-bold text-slate-500">
        <div className="flex justify-between gap-3"><dt>Key configured</dt><dd className="text-slate-900">{provider.keyConfigured ? "yes" : "no"}</dd></div>
        <div className="flex justify-between gap-3"><dt>Last success</dt><dd className="text-right text-slate-900">{provider.lastSuccessfulCheck ? new Date(provider.lastSuccessfulCheck).toLocaleString() : "—"}</dd></div>
        <div><dt>Metrics</dt><dd className="mt-1 text-slate-700">{provider.metrics.join(", ")}</dd></div>
        {provider.lastError ? <div className="rounded-xl bg-amber-50 p-2 text-amber-800"><dt>Last error</dt><dd>{provider.lastError}</dd></div> : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/api" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black">API Settings</Link><span className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-xs font-black text-slate-400">Test connection</span></div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><div className="text-base font-black tracking-[-0.04em] text-slate-950">{value}</div><div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</div></div>;
}

export default async function AdminIndex() {
  await requireAdmin();
  const config = adminConfigState();
  const providerResult = await safeAdminDbQuery("Provider status", getApiProviderCards, []);
  const summaryResult = await safeAdminDbQuery("Bulk refresh summaries", getBulkRefreshSummaries, { coingecko: null, coinmarketcap: null });
  const scanResult = config.hasDatabase ? await safeAdminDbQuery("Metric logo discovery", async () => parseMetricLogoScanSummary(await getSetting(METRIC_LOGO_SCAN_SETTING)), null) : { data: null, error: null };
  const brandResult = config.hasDatabase ? await safeAdminDbQuery("Brand settings", async () => parseBrandSettings(await getSetting("brand_settings")), parseBrandSettings(null)) : { data: parseBrandSettings(null), error: null };
  const blob = blobStatus();
  const logoResult = config.hasDatabase ? await safeAdminDbQuery("Logo records", async () => (await listLogos()).rows, []) : { data: [], error: null };
  const sourceResult = config.hasDatabase ? await safeAdminDbQuery("Logo sources", async () => (await getAllLogoSources()).rows, []) : { data: [], error: null };
  const providers = providerResult.data;
  const summaries = summaryResult.data;
  const scanSummary = scanResult.data;
  const brand = brandResult.data;
  const logos = logoResult.data;
  const sourceRows = sourceResult.data;
  const dbErrors = [providerResult.error, summaryResult.error, scanResult.error, brandResult.error, logoResult.error, sourceResult.error].filter(Boolean);
  const sourcesByLogo = new Map<string, typeof sourceRows>();
  for (const source of sourceRows) sourcesByLogo.set(source.logo_id, [...(sourcesByLogo.get(source.logo_id) ?? []), source]);
  const qaRows = logos.map((logo) => classifyLogoQa(logo, sourcesByLogo.get(logo.id) ?? [], config.hasBlob));
  const counts = summarizeLogoQa(qaRows);
  const actionItems = [
    !config.hasDatabase ? "DATABASE_URL missing: admin persistence is disabled." : null,
    !config.hasBlob ? blob.message : null,
    !process.env.COINMARKETCAP_API_KEY ? "COINMARKETCAP_API_KEY missing: CoinMarketCap logo tools are disabled." : null,
    !brand.favicon ? "Missing favicon brand asset." : null,
    !brand.headerLogo ? "Missing header logo brand asset." : null,
    !brand.watermarkMark ? "Missing watermark brand asset." : null,
    scanSummary?.errors.length ? `Metric scan errors: ${scanSummary.errors.length}` : null,
    scanSummary?.newEntities ? `${scanSummary.newEntities} newly discovered metric entities.` : null,
    !(process.env.CHAINSPECT_API_KEY || process.env.CHAINSPECT_KEY) ? "Chainspect key missing / TPS provider should use fallback behavior." : null,
    summaries.coingecko?.errors ? `CoinGecko refresh errors: ${summaries.coingecko.errors}` : null,
    counts.missing_coingecko_id ? `${counts.missing_coingecko_id} logos missing CoinGecko IDs.` : null,
    counts.visual_rejected ? `${counts.visual_rejected} visually rejected logos need replacement or fallback decisions.` : null,
    counts.fallback_used ? `${counts.fallback_used} logos currently preview local fallbacks.` : null,
    counts.missing_approved_logo ? `${counts.missing_approved_logo} logos have no approved DB source.` : null,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi admin</p><h1 className="text-2xl font-black tracking-[-0.07em] text-slate-950">Operations Dashboard</h1><p className="mt-1 max-w-2xl text-xs font-bold text-slate-500">Internal operating center for provider health, logo QA, bulk refresh results and setup readiness. Public cards keep their existing local fallback behavior.</p></div>
        <form action={logoutAction}><button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black">Log out</button></form>
      </header>

      <AdminDbErrorPanel errors={dbErrors} />

      <section className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft">DB {config.hasDatabase ? "connected" : "missing"} · CoinGecko {providers.find((p) => p.id === "coingecko")?.status ?? "unknown"} · CMC {providers.find((p) => p.id === "coinmarketcap")?.status ?? "unknown"} · DefiLlama {providers.find((p) => p.id === "defillama")?.status ?? "unknown"} · TPS {providers.find((p) => p.id === "chainspect")?.status ?? "unknown"} · Blob {config.hasBlob ? "connected" : "missing"} · Brand {brand.siteName ? "configured" : "defaults"}</section>

      <section className="mt-3 grid gap-2 md:grid-cols-8">
        <Link href="/admin/logos" className="rounded-full bg-slate-950 px-3 py-1.5 text-center text-xs font-black text-white">Go to Logo Manager</Link>
        <Link href="/admin/api" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-black">Go to API Settings</Link>
        <Link href="/admin/brand" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-black">Go to Brand Settings</Link>
        <form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="smart" /><button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black">Refresh missing / needs review</button></form><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="retry-errors" /><button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black">Retry failed only</button></form><form action={bulkRefreshCoinGeckoLogosAction}><input type="hidden" name="mode" value="force-all" /><button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black">Force refresh all</button></form><form action={applySafeCoinGeckoCandidatesAction}><button className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">Apply safe CG candidates</button></form><form action={scanMetricLogosAction}><button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black">Scan metric logos</button></form>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Metric Logo Discovery</h2><p className="mt-2 text-sm font-bold text-slate-600">{scanSummary ? `${scanSummary.metricsScanned} metrics · ${scanSummary.rowsChecked} rows · ${scanSummary.newEntities} new · ${scanSummary.autoApproved} auto · ${scanSummary.candidates} candidates · ${scanSummary.missingCoinGeckoIds} missing CG · ${scanSummary.errors.length} errors` : "No scan run yet."}</p><p className="mt-1 text-xs font-bold text-slate-400">Last scan: {scanSummary ? new Date(scanSummary.timestamp).toLocaleString() : "never"}</p>{scanSummary ? <div className="mt-2 grid gap-1 text-xs font-bold text-slate-500"><span>Missing CG: {scanSummary.details.filter((d) => d.actionTaken === "missing_coingecko_id").slice(0, 5).map((d) => d.name).join(", ") || "—"}</span><span>Auto-approved: {scanSummary.details.filter((d) => d.actionTaken === "auto_approved").slice(0, 5).map((d) => d.name).join(", ") || "—"}</span><span>Skipped: {scanSummary.details.filter((d) => ["auto_approve_skipped", "visual_rejected", "previous_rejection", "existing_admin_source"].includes(d.actionTaken)).slice(0, 4).map((d) => `${d.name} — ${d.reason}`).join("; ") || "—"}</span></div> : null}</div><div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="font-black text-slate-950">Brand asset health</h2><p className="mt-2 text-sm font-bold text-slate-600">Favicon: {brand.favicon ? "ok" : "missing"} · Header: {brand.headerLogo ? "ok" : "missing"} · Watermark: {brand.watermarkMark ? "ok" : "missing"} · Upload: {config.hasBlob ? "enabled" : "disabled"}</p><Link href="/admin/brand" className="mt-2 inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-black">Brand Settings</Link></div></section>

      <section className="mt-3"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black text-slate-950">API Status Overview</h2><Link href="/admin/api" className="text-sm font-black text-slate-500">Manage APIs →</Link></div><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft"><table className="w-full text-left text-xs"><tbody>{providers.map((provider) => <tr key={provider.id} className="border-b border-slate-100"><td className="px-3 py-2 font-black text-slate-950">{provider.name}</td><td className="px-3 py-2"><StatusBadge status={provider.status} /></td><td className="px-3 py-2 font-bold text-slate-600">key {provider.keyConfigured ? "yes" : provider.envVars.length ? "no" : "n/a"}</td><td className="px-3 py-2 font-bold text-slate-500">{provider.lastSuccessfulCheck ? new Date(provider.lastSuccessfulCheck).toLocaleString() : "—"}</td><td className="max-w-[260px] truncate px-3 py-2 font-bold text-amber-800">{provider.lastError || "—"}</td><td className="max-w-[320px] truncate px-3 py-2 font-bold text-slate-500">{provider.metrics.join(", ")}</td><td className="px-3 py-2"><Link href="/admin/api" className="rounded-full border px-2 py-1 text-[11px] font-black">Fix</Link></td></tr>)}</tbody></table></div></section>

      <section className="mt-3"><h2 className="mb-2 text-sm font-black text-slate-950">Logo Health Overview</h2><div className="flex flex-wrap gap-2"><SummaryCard label="Approved logos" value={counts.approved} /><SummaryCard label="Needs review" value={counts.needs_review} /><SummaryCard label="Missing approved logo" value={counts.missing_approved_logo} /><SummaryCard label="Missing CoinGecko ID" value={counts.missing_coingecko_id} /><SummaryCard label="CG ID review" value={counts.coingecko_id_needs_review} /><SummaryCard label="Rate limited" value={counts.coingecko_rate_limited} /><SummaryCard label="CG candidates" value={counts.coingecko_candidate_waiting} /><SummaryCard label="Fallback used" value={counts.fallback_used} /><SummaryCard label="Visual rejected" value={counts.visual_rejected} /><SummaryCard label="Upload disabled" value={config.hasBlob ? 0 : 1} /></div></section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="text-sm font-black text-slate-950">Action Required Inbox</h2><div className="mt-4 grid gap-2">{actionItems.length ? actionItems.slice(0, 10).map((item) => <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-900">{item}</div>) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-800">No urgent admin setup or logo QA issues detected.</div>}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft"><h2 className="text-sm font-black text-slate-950">Latest bulk results</h2>{[summaries.coingecko, summaries.coinmarketcap].filter(Boolean).map((summary) => summary ? <div key={summary.provider} className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-700"><div className="font-black text-slate-950">{summary.provider}</div><div>{summary.checked ?? 0} checked · {summary.fetched ?? summary.refreshed} fetched · {summary.autoApproved ?? 0} auto-approved · {summary.alreadyApproved ?? 0} already approved · {summary.candidates ?? 0} candidates · {summary.rateLimited ?? 0} rate limited · {summary.missingMappings} missing mappings · {summary.idNeedsReview ?? 0} ID review · {summary.errors} errors</div><div className="text-xs text-slate-400">{new Date(summary.timestamp).toLocaleString()}</div>{summary.firstSkippedReasons?.length ? <div className="mt-1 text-xs text-amber-800">Skipped: {summary.firstSkippedReasons.slice(0, 3).join("; ")}</div> : null}{summary.firstErrors.length ? <div className="mt-1 text-xs text-red-700">Errors: {summary.firstErrors.join("; ")}</div> : null}</div> : null)}<Link href="/admin/logos?filter=issues" className="mt-4 block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black">Run logo health check</Link></div>
      </section>
    </main>
  );
}
