import Link from "next/link";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import { logoutAction } from "@/lib/admin/actions";
import { getApiProviderCards, getBulkRefreshSummaries, blobStatus, type ApiProviderCard } from "@/lib/admin/providerStatus";
import { classifyLogoQa, summarizeLogoQa } from "@/lib/admin/logoQa";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { parseBrandSettings } from "@/lib/brandSettings";
import { METRIC_LOGO_SCAN_SETTING, parseMetricLogoScanSummary } from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

type DotTone = "green" | "gray" | "red" | "yellow";

function dotTone(status: string): DotTone {
  if (status === "connected") return "green";
  if (status === "public-no-key" || status === "disabled") return "gray";
  if (status === "missing key" || status === "error") return "red";
  return "yellow";
}

function dotClass(tone: DotTone) {
  return {
    green: "bg-emerald-500",
    gray: "bg-slate-300",
    red: "bg-red-500",
    yellow: "bg-amber-400",
  }[tone];
}

function StatusDot({ tone, label }: { tone: DotTone; label: string }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-slate-600"><span className={`h-2 w-2 rounded-full ${dotClass(tone)}`} />{label}</span>;
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
  return `${label} ${value}`;
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
  const needsAction = qaRows.filter((row) => row.issues.some((issue) => issue !== "already_approved" && issue !== "coingecko_auto_approved" && issue !== "upload_disabled")).length;

  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const statusStrip = [
    { label: "DB", tone: config.hasDatabase ? "green" as DotTone : "red" as DotTone },
    { label: "CoinGecko", tone: dotTone(providerById.get("coingecko")?.status ?? "public-no-key") },
    { label: "CMC", tone: dotTone(providerById.get("coinmarketcap")?.status ?? "missing key") },
    { label: "DefiLlama", tone: "gray" as DotTone },
    { label: "TPS", tone: dotTone(providerById.get("chainspect")?.status ?? "missing key") },
    { label: "Blob", tone: config.hasBlob ? "green" as DotTone : "red" as DotTone },
    { label: "Brand", tone: brand.favicon && brand.headerLogo && brand.watermarkMark ? "green" as DotTone : "yellow" as DotTone },
  ];

  const actionItems = [
    !config.hasDatabase ? "DATABASE_URL missing" : null,
    !process.env.COINMARKETCAP_API_KEY ? "CMC API key missing" : null,
    !(process.env.CHAINSPECT_API_KEY || process.env.CHAINSPECT_KEY) ? "TPS API key missing" : null,
    !config.hasBlob ? "Blob upload token missing" : null,
    counts.missing_approved_logo ? `${counts.missing_approved_logo} logos missing approved logo` : null,
    counts.missing_coingecko_id ? `${counts.missing_coingecko_id} logos missing CoinGecko ID` : null,
    providerErrors ? `${providerErrors} provider errors / ID reviews` : null,
    scanSummary?.errors.length ? `${scanSummary.errors.length} metric scan errors` : null,
    !brand.favicon ? "favicon missing" : null,
    !brand.headerLogo ? "header logo missing" : null,
    !brand.watermarkMark ? "watermark missing" : null,
  ].filter(Boolean) as string[];

  const logoHealth = [
    metricLine("Needs review", counts.needs_review),
    metricLine("Missing logo", counts.missing_approved_logo),
    metricLine("Missing CG", counts.missing_coingecko_id),
    metricLine("Fallback", counts.fallback_used),
    metricLine("Visual rejected", counts.visual_rejected),
  ];

  const coingeckoSummary = summaries.coingecko;
  const recentActivity = [
    coingeckoSummary ? `CG refresh: ${coingeckoSummary.checked ?? 0} checked · ${coingeckoSummary.idNeedsReview ?? 0} ID review · ${coingeckoSummary.errors ?? 0} errors` : "CG refresh: not run yet",
    scanSummary ? `Metric scan: ${scanSummary.rowsChecked} entities · ${scanSummary.missingCoinGeckoIds} missing CG · ${scanSummary.errors.length} error${scanSummary.errors.length === 1 ? "" : "s"}` : "Metric scan: not run yet",
    `Brand: favicon ${brand.favicon ? "ok" : "missing"} · header ${brand.headerLogo ? "ok" : "missing"} · upload ${blob.configured ? "enabled" : "disabled"}`,
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-4 md:px-6">
      <AdminDbErrorPanel errors={dbErrors} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">learnDeFi admin</p>
          <h1 className="text-2xl font-black tracking-[-0.06em] text-slate-950">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-black shadow-soft">
            <Link href="/admin" className="rounded-full bg-slate-950 px-3 py-1.5 text-white">Dashboard</Link>
            <Link href="/admin/logos" className="rounded-full px-3 py-1.5 text-slate-600">Logo Manager</Link>
            <Link href="/admin/api" className="rounded-full px-3 py-1.5 text-slate-600">API</Link>
            <Link href="/admin/brand" className="rounded-full px-3 py-1.5 text-slate-600">Brand</Link>
          </nav>
          <form action={logoutAction}><button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">Log out</button></form>
        </div>
      </header>

      <section className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
        {statusStrip.map((item) => <StatusDot key={item.label} tone={item.tone} label={item.label} />)}
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black text-slate-950">Action Required</h2><Link href="/admin/logos" className="text-xs font-black text-slate-500">Open Logo Tools →</Link></div>
          <div className="mt-3 grid gap-1.5">
            {actionItems.length ? actionItems.slice(0, 8).map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{item}</div>) : <div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />No urgent issues</div>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-black text-slate-950">Logo Health</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{logoHealth.join(" · ")}</p>
          <p className="mt-2 text-xs font-bold text-slate-400">Total {counts.all} · Approved {counts.approved} · Needs action {needsAction}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-black text-slate-950">Recent Activity</h2>
          <div className="mt-3 grid gap-1.5 text-sm font-bold text-slate-700">
            {recentActivity.map((line) => <div key={line}>{line}</div>)}
            {coingeckoSummary ? <div className="text-xs text-slate-400">Last CG: {formatDate(coingeckoSummary.timestamp)}</div> : null}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1fr_340px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black text-slate-950">API Status</h2><Link href="/admin/api" className="text-xs font-black text-slate-500">Full details →</Link></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {providers.filter((provider) => ["coingecko", "coinmarketcap", "defillama", "chainspect", "vercel-blob"].includes(provider.id)).map((provider) => <div key={provider.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm"><span className="font-black text-slate-800">{provider.name.replace("Chainspect / TPS provider", "TPS")}</span><StatusDot tone={dotTone(provider.status)} label={providerState(provider)} /></div>)}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-sm font-black text-slate-950">Brand Health</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">Favicon {brand.favicon ? "ok" : "missing"} · Header {brand.headerLogo ? "ok" : "missing"} · Watermark {brand.watermarkMark ? "ok" : "missing"} · Upload {config.hasBlob ? "enabled" : "disabled"}</p>
          <Link href="/admin/brand" className="mt-3 inline-flex text-xs font-black text-slate-500">Open Brand Settings →</Link>
        </article>
      </section>
    </main>
  );
}
