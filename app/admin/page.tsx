import Link from "next/link";
import { AdminSection, AdminShell, AdminStatusDot, AdminStatusPill, type AdminTone } from "@/components/admin/AdminPrimitives";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { getApiProviderCards, getBulkRefreshSummaries, blobStatus, type ApiProviderCard } from "@/lib/admin/providerStatus";
import { classifyLogoQa, summarizeLogoQa } from "@/lib/admin/logoQa";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";
import { METRIC_LOGO_SCAN_SETTING, parseMetricLogoScanSummary } from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

function dotTone(status: string): AdminTone {
  if (status === "connected") return "green";
  if (status === "public-no-key" || status === "disabled") return "gray";
  if (status === "missing key" || status === "error") return "red";
  return "amber";
}

function providerState(provider: ApiProviderCard) {
  if (provider.status === "connected") return "connected";
  if (provider.status === "public-no-key") return "public";
  if (provider.status === "missing key") return "missing key";
  if (provider.status === "error") return "error";
  return provider.status;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "never";
}

function metricLine(label: string, value: number) {
  return value > 0 ? `${value} ${label}` : null;
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
  const providerErrors = counts.coingecko_fetch_failed + counts.cmc_fetch_failed + counts.coingecko_id_needs_review;
  const visualIssues = counts.visual_rejected + counts.unsafe_migrated_candidate;
  const newlyDiscovered = qaRows.filter((row) => row.issues.includes("newly_discovered_entity")).length;
  const reviewed = Math.max(counts.all - newlyDiscovered - counts.needs_review, 0);

  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const statusStrip = [
    { label: "DB", tone: config.hasDatabase ? "green" as AdminTone : "red" as AdminTone },
    { label: "CoinGecko", tone: dotTone(providerById.get("coingecko")?.status ?? "public-no-key") },
    { label: "CMC", tone: dotTone(providerById.get("coinmarketcap")?.status ?? "missing key") },
    { label: "DefiLlama", tone: "gray" as AdminTone },
    { label: "Blob", tone: config.hasBlob ? "green" as AdminTone : "amber" as AdminTone },
    { label: "Brand", tone: (brand.primaryLogo || brand.headerLogo) && brand.favicon ? "green" as AdminTone : "amber" as AdminTone },
  ];

  const coingeckoSummary = summaries.coingecko;
  const recentActivity = [
    coingeckoSummary ? `CG refresh ${(coingeckoSummary.errors ?? 0) ? "warning" : "OK"}${coingeckoSummary.idNeedsReview ? ` · ${coingeckoSummary.idNeedsReview} ID review` : ""}` : "CG refresh not run",
    scanSummary ? `Metric scan ${scanSummary.errors.length ? "warning" : "OK"}${scanSummary.missingCoinGeckoIds ? ` · ${scanSummary.missingCoinGeckoIds} missing CG` : ""}` : "Metric scan not run",
    `Brand ${(brand.primaryLogo || brand.headerLogo) && brand.favicon ? "OK" : "needs assets"}`,
  ];

  return (
    <AdminShell active="dashboard" title="Dashboard" max="max-w-6xl">
      <AdminDbErrorPanel errors={dbErrors} />

      <section className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_1fr_1fr]">
        <AdminSection title="Logo Review" action={<Link href="/admin/logos" className="text-xs font-black text-slate-500">Open Logo Manager →</Link>}>
          <p className="text-3xl font-black tracking-tight text-slate-950">
            {reviewed} / {counts.all} reviewed
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-indigo-800">New: {newlyDiscovered}</div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-800">Needs review: {counts.needs_review}</div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-rose-800">Visual issue: {visualIssues}</div>
            <div className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-amber-900">Missing logo: {counts.missing_approved_logo}</div>
          </div>
        </AdminSection>

        <AdminSection title="Coverage Gaps">
          <div className="grid gap-2 text-sm font-bold text-slate-700">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span>Missing CG</span><span>{counts.missing_coingecko_id}</span></div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span>Missing CMC</span><span>{counts.missing_cmc_id}</span></div>
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span>Missing DefiLlama</span><span>{counts.missing_defillama_source}</span></div>
            <div className="text-xs text-slate-400">Provider gaps are secondary when logo coverage is already resolved.</div>
          </div>
        </AdminSection>

        <AdminSection title="Recent Activity">
          <div className="grid gap-1.5 text-sm font-bold text-slate-700">
            {recentActivity.map((line) => <div key={line}>{line}</div>)}
            {coingeckoSummary ? <div className="text-xs text-slate-400">Last CG: {formatDate(coingeckoSummary.timestamp)}</div> : null}
          </div>
        </AdminSection>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1fr_340px]">
        <AdminSection title="API Status" action={<Link href="/admin/api" className="text-xs font-black text-slate-500">Full details →</Link>}>
          <div className="grid gap-2 sm:grid-cols-2">
            {providers.filter((provider) => ["coingecko", "coinmarketcap", "defillama", "chainspect"].includes(provider.id)).map((provider) => <div key={provider.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"><span className="font-black text-slate-800">{provider.name.replace("Chainspect / TPS provider", "TPS")}</span><AdminStatusDot tone={dotTone(provider.status)} label={providerState(provider)} /></div>)}
          </div>
        </AdminSection>

        <AdminSection title="Brand Health" action={<Link href="/admin/brand" className="text-xs font-black text-slate-500">Open Brand →</Link>}>
          <div className="flex flex-wrap gap-1.5">
            <AdminStatusPill tone={(brand.primaryLogo || brand.headerLogo) && brand.favicon ? "green" : "amber"}>Brand {(brand.primaryLogo || brand.headerLogo) && brand.favicon ? "OK" : "needs assets"}</AdminStatusPill>
            <AdminStatusPill tone={(brand.primaryLogo || brand.headerLogo) ? "green" : "amber"}>Primary logo</AdminStatusPill>
            <AdminStatusPill tone={brand.favicon ? "green" : "amber"}>Favicon</AdminStatusPill>
            <AdminStatusPill tone={config.hasBlob ? "green" : "gray"}>Upload {config.hasBlob ? "enabled" : "disabled"}</AdminStatusPill>
          </div>
        </AdminSection>
      </section>
      <section className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        <div className="flex flex-wrap gap-x-4 gap-y-2">{statusStrip.map((item) => <AdminStatusDot key={item.label} tone={item.tone} label={item.label} />)}</div>
      </section>
    </AdminShell>
  );
}
