import Link from "next/link";
import { AdminShell, AdminStatusPill } from "@/components/admin/AdminPrimitives";
import { notFound } from "next/navigation";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import { addCoinGeckoAction, addCoinMarketCapAction, addDefiLlamaAction, addManualUrlAction, approveSourceAction, markNeedsReviewAction, markVisualRejectedAction, rejectLogoAction, rejectSourceAction, saveFallbackAction, saveProviderIdsAction, uploadLogoAction, importLocalVaultSourceAction } from "@/lib/admin/actions";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import { approvedLogoCandidateSlugs, getLogo, getLogoSources, type LogoSource } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { classifyLogoQa, getCoinMarketCapId } from "@/lib/admin/logoQa";
import { logoSourceManifest } from "@/lib/logos/logoSourceManifest";
import { searchCoinGeckoIds } from "@/lib/admin/coingeckoSearch";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PillTone = "green" | "amber" | "red" | "gray";
type ProviderKey = "coingecko" | "coinmarketcap" | "defillama" | "manual" | "local-vault";

function firstParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function safeString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unrenderable]";
  }
}

function safeUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/")) return text;
  return null;
}

function metadataObject(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return { parseWarning: "Metadata was not valid JSON", raw: metadata };
    }
  }
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

function metadataText(metadata: unknown) {
  try {
    return JSON.stringify(metadataObject(metadata), null, 2);
  } catch {
    return JSON.stringify({ parseWarning: "Metadata could not be rendered" }, null, 2);
  }
}

function metadataWarning(metadata: unknown) {
  return typeof metadata === "string" && metadataObject(metadata).parseWarning ? "metadata warning" : null;
}

function providerName(provider?: string | null) {
  if (provider === "coingecko") return "CoinGecko";
  if (provider === "coinmarketcap") return "CoinMarketCap";
  if (provider === "defillama") return "DefiLlama";
  if (provider === "manual") return "Manual URL";
  if (provider === "upload") return "Upload";
  if (provider === "local-vault") return "Local Vault";
  return safeString(provider) || "Unknown source";
}

function sourceImage(source?: LogoSource | null) {
  return safeUrl(source?.blob_url) || safeUrl(source?.image_url);
}

function sourceStatusLabel(source: { provider?: unknown; status?: unknown; metadata: unknown }) {
  const meta = metadataObject(source.metadata);
  const status = safeString(source.status) || "unknown";
  const provider = safeString(source.provider) || "unknown";
  if (status !== "approved") {
    if (meta.reviewStatus === "selected_needs_review") return "selected · needs review";
    return status;
  }
  if (meta.reviewStatus === "reviewed") return "approved · reviewed";
  if (meta.autoApproved || meta.approvalOrigin === "auto") return "approved · CoinGecko";
  if (meta.approvalOrigin === "local-vault" || meta.approvalOrigin === "local vault" || meta.seededFrom === "local-vault") return "approved · local vault";
  if (provider === "manual" || provider === "upload" || meta.approvalOrigin === "admin") return "approved · admin";
  return "approved";
}

function statusTone(label: string): PillTone {
  const lower = label.toLowerCase();
  if (lower.includes("primary") || lower.includes("reviewed") || lower.includes("trusted") || lower.includes("available")) return "green";
  if (lower.includes("review") || lower.includes("missing") || lower.includes("add") || lower.includes("key")) return "amber";
  if (lower.includes("reject") || lower.includes("error") || lower.includes("failed")) return "red";
  return "gray";
}

function StatusBadge({ status }: { status: string }) {
  const text = safeString(status) || "unknown";
  const tone = text.startsWith("approved") ? "green" : text === "rejected" ? "red" : "amber";
  return <AdminStatusPill tone={tone}>{text.replace("_", " ")}</AdminStatusPill>;
}

function Img({ src, size = 32 }: { src?: string | null; size?: number }) {
  const safeSrc = safeUrl(src);
  return (
    <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
      {safeSrc ? <img src={safeSrc} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] font-black text-slate-300">—</span>}
    </div>
  );
}

function KV({ k, v }: { k: string; v?: unknown }) {
  const text = safeString(v);
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 text-xs sm:grid-cols-[160px_1fr] sm:gap-3">
      <dt className="font-black uppercase tracking-[0.08em] text-slate-400">{k}</dt>
      <dd className="min-w-0 break-words font-bold text-slate-800" title={text || ""}>{text || "—"}</dd>
    </div>
  );
}

function SmallButton({ children, dark = false, disabled = false }: { children: React.ReactNode; dark?: boolean; disabled?: boolean }) {
  return <button disabled={disabled} className={`${dark ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-800"} rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40`}>{children}</button>;
}

function ApproveButton({ source, slug, label = "Mark reviewed", dark = false }: { source: LogoSource; slug: string; label?: string; dark?: boolean }) {
  return (
    <form action={approveSourceAction}>
      <input type="hidden" name="sourceId" value={source.id} />
      <input type="hidden" name="slug" value={slug} />
      <SmallButton dark={dark}>{label}</SmallButton>
    </form>
  );
}

function RejectButton({ source, slug }: { source: LogoSource; slug: string }) {
  return (
    <form action={rejectSourceAction}>
      <input type="hidden" name="sourceId" value={source.id} />
      <input type="hidden" name="slug" value={slug} />
      <SmallButton>Reject</SmallButton>
    </form>
  );
}

function SourceDetails({ source }: { source: LogoSource }) {
  const sourceHref = safeUrl(source.source_url);
  const imageHref = sourceImage(source);
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-black text-slate-400 hover:text-slate-600">Details</summary>
      <div className="mt-2 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 font-bold text-slate-600">
        {sourceHref ? <a href={sourceHref} className="break-all underline">Source URL: {sourceHref}</a> : <div className="text-slate-400">Source URL: —</div>}
        {imageHref ? <a href={imageHref} className="break-all underline">Image URL: {imageHref}</a> : <div className="text-slate-400">Image URL: —</div>}
        <div>Created: {safeString(source.created_at) || "—"}</div>
        {source.rejection_reason ? <div className="text-red-700">Rejection reason: {safeString(source.rejection_reason)}</div> : null}
        {metadataWarning(source.metadata) ? <div className="text-amber-700">Malformed metadata shown safely.</div> : null}
        <pre className="max-h-40 overflow-auto rounded-lg bg-white p-2 text-[10px] text-slate-500">{metadataText(source.metadata)}</pre>
      </div>
    </details>
  );
}

export default async function LogoDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: SearchParams }) {
  await requireAdmin();
  const logoResult = await safeAdminDbQuery("Logo record", () => getLogo(params.slug), null);
  const logo = logoResult.data;
  if (!logo && !logoResult.error) notFound();
  const sourceResult = logo ? await safeAdminDbQuery("Logo sources", async () => (await getLogoSources(logo.id)).rows, []) : { data: [], error: null };
  const sources = sourceResult.data;
  const dbErrors = [logoResult.error, sourceResult.error].filter(Boolean);
  const config = adminConfigState();

  if (!logo) {
    return (
      <AdminShell active="logos" title="Logo detail" max="max-w-6xl">
        <Link href="/admin/logos" className="text-sm font-black text-slate-500">← Back to logos</Link>
        <AdminDbErrorPanel errors={dbErrors} />
      </AdminShell>
    );
  }

  const logoName = safeString(logo.name) || "Unknown logo";
  const logoSlug = safeString(logo.slug) || params.slug;
  const logoCategory = safeString(logo.category) || "uncategorized";
  const coinGeckoId = safeString(logo.coingecko_id) || getCoinGeckoLogoId(logoSlug);
  const coinMarketCapId = getCoinMarketCapId(logo, sources);
  const approvedSource = sources.find((source) => source.id === logo.approved_source_id) ?? null;
  const fallbackPreview = safeUrl(logo.fallback_logo_url) || null;
  const publicPreview = safeUrl(logo.approved_logo_url) || fallbackPreview;
  const overlaySlugs = approvedLogoCandidateSlugs(logoName);
  const qa = classifyLogoQa(logo, sources, config.hasBlob);
  const localVault = logoSourceManifest.find((entry) => entry.slug === logoSlug && entry.category === logoCategory) ?? logoSourceManifest.find((entry) => entry.slug === logoSlug);
  const localVaultSource = localVault ? sources.find((source) => safeUrl(source.image_url) === localVault.localPath || metadataObject(source.metadata).localPath === localVault.localPath) ?? null : null;
  const hasLocalVaultDbSource = Boolean(localVaultSource);
  const localVaultUsable = Boolean(localVault && localVault.approvalStatus === "approved" && !localVault.visualRejected && !localVault.fallbackPreferredUntilManualAsset);
  const sourceWarnings = sources.map((source) => metadataWarning(source.metadata)).filter(Boolean);
  const cgNeedsReview = logo.last_fetch_provider === "coingecko" && Boolean(logo.last_fetch_error);
  const cgFinderQuery = firstParam(searchParams?.cgq, (!coinGeckoId || cgNeedsReview) ? logoName : "");
  const cgFinderResult = cgFinderQuery ? await searchCoinGeckoIds(cgFinderQuery) : { candidates: [], error: null };
  const cmcReady = Boolean((await resolveApiSecret("coinmarketcap")).value);
  const hiddenLogoFields = <><input type="hidden" name="name" value={logoName} /><input type="hidden" name="category" value={logoCategory} /></>;

  const priorityOrder = ["manual", "upload", "coingecko", "coinmarketcap", "defillama"];
  const fallbackPrimary = sources.find((source) => source.status === "approved" && priorityOrder.includes(source.provider)) ?? (localVaultSource?.status === "approved" ? localVaultSource : null);
  const primarySource = approvedSource ?? fallbackPrimary;
  const primaryProvider = providerName(primarySource?.provider);
  const primaryMeta = metadataObject(primarySource?.metadata);
  const primaryNeedsReview = Boolean(primarySource && primarySource.provider !== "coingecko" && primaryMeta.reviewStatus !== "reviewed");
  const primaryStatus = primarySource ? (primarySource.provider === "coingecko" ? "Trusted primary" : primaryNeedsReview ? "Needs review" : "Reviewed") : publicPreview ? "Fallback public logo" : "Missing";
  const nextAction = localVaultUsable && !logo.approved_logo_url ? "Import local vault source" : primaryNeedsReview ? "Mark the primary source reviewed" : !coinGeckoId ? "Find or add a CoinGecko ID" : qa.recommendedAction;
  const manualUploadSource = sources.find((source) => ["manual", "upload"].includes(source.provider) && source.status !== "rejected") ?? sources.find((source) => ["manual", "upload"].includes(source.provider)) ?? null;
  const providerSource = (provider: string) => sources.find((source) => source.provider === provider && source.status !== "rejected") ?? sources.find((source) => source.provider === provider) ?? null;
  const coinGeckoSource = providerSource("coingecko");
  const coinMarketCapSource = providerSource("coinmarketcap");
  const defiLlamaSource = providerSource("defillama");
  const mainProviders: Array<{ key: ProviderKey; name: string; source: LogoSource | null; status: string; action: React.ReactNode; helper?: string; secondary?: boolean }> = [
    {
      key: "coingecko",
      name: "CoinGecko",
      source: coinGeckoSource,
      status: coinGeckoSource?.status === "rejected" ? "Rejected" : coinGeckoSource?.id === primarySource?.id ? "Primary" : coinGeckoSource ? "Backup" : cgNeedsReview ? "ID review" : coinGeckoId ? "Missing" : "Missing ID",
      helper: coinGeckoId ? `ID: ${coinGeckoId}` : "Find and save an exact ID.",
      action: coinGeckoSource?.id === primarySource?.id ? null : (
        <div className="flex flex-wrap gap-2">
          {coinGeckoSource && coinGeckoSource.status !== "rejected" ? <ApproveButton source={coinGeckoSource} slug={logoSlug} label="Use as primary" dark /> : null}
          <form action={addCoinGeckoAction}>{hiddenLogoFields}<input type="hidden" name="coinGeckoId" value={safeString(coinGeckoId) || ""} /><SmallButton disabled={!coinGeckoId}>{cgNeedsReview ? "Retry" : coinGeckoId ? "Fetch" : "Add ID"}</SmallButton></form>
        </div>
      ),
    },
    {
      key: "coinmarketcap",
      name: "CoinMarketCap",
      source: coinMarketCapSource,
      status: coinMarketCapSource?.status === "rejected" ? "Rejected" : coinMarketCapSource?.id === primarySource?.id ? (primaryNeedsReview ? "Needs review" : "Primary") : coinMarketCapSource ? "Backup" : !cmcReady ? "Missing key" : coinMarketCapId ? "Missing" : "Missing ID",
      helper: !cmcReady ? "API key missing." : coinMarketCapId ? `ID: ${coinMarketCapId}` : "Add CMC ID.",
      action: (
        <div className="flex flex-wrap gap-2">
          {coinMarketCapSource && coinMarketCapSource.status !== "rejected" ? <ApproveButton source={coinMarketCapSource} slug={logoSlug} label={coinMarketCapSource.id === primarySource?.id ? "Mark reviewed" : "Use as primary"} dark={coinMarketCapSource.id !== primarySource?.id} /> : null}
          <form action={addCoinMarketCapAction}>{hiddenLogoFields}<input type="hidden" name="coinMarketCapId" value={safeString(coinMarketCapId) || ""} /><SmallButton disabled={!coinMarketCapId || !cmcReady}>{logo.last_fetch_provider === "coinmarketcap" && logo.last_fetch_error ? "Retry" : coinMarketCapId ? "Fetch CMC" : "Add ID"}</SmallButton></form>
        </div>
      ),
    },
    {
      key: "defillama",
      name: "DefiLlama",
      source: defiLlamaSource,
      status: defiLlamaSource?.status === "rejected" ? "Rejected" : defiLlamaSource?.id === primarySource?.id ? (primaryNeedsReview ? "Needs review" : "Primary") : defiLlamaSource ? "Backup" : "Missing",
      helper: `Default slug: ${logoSlug}`,
      action: (
        <div className="flex flex-wrap gap-2">
          {defiLlamaSource && defiLlamaSource.status !== "rejected" ? <ApproveButton source={defiLlamaSource} slug={logoSlug} label={defiLlamaSource.id === primarySource?.id ? "Mark reviewed" : "Use as primary"} dark={defiLlamaSource.id !== primarySource?.id} /> : null}
          <form action={addDefiLlamaAction}>{hiddenLogoFields}<input type="hidden" name="providerSlug" value={logoSlug} /><SmallButton>{defiLlamaSource && defiLlamaSource.status !== "rejected" ? "Fetch again" : "Fetch"}</SmallButton></form>
        </div>
      ),
    },
    {
      key: "manual",
      name: "Manual / Upload",
      source: manualUploadSource,
      status: manualUploadSource?.status === "rejected" ? "Rejected" : manualUploadSource?.id === primarySource?.id ? "Primary" : manualUploadSource ? "Backup" : "Secondary",
      helper: "Admin-selected sources are never overwritten automatically.",
      secondary: true,
      action: manualUploadSource && manualUploadSource.status !== "rejected" ? <ApproveButton source={manualUploadSource} slug={logoSlug} label={manualUploadSource.id === primarySource?.id ? "Mark reviewed" : "Use as primary"} dark={manualUploadSource.id !== primarySource?.id} /> : <span className="text-xs font-bold text-slate-400">Add below</span>,
    },
    {
      key: "local-vault",
      name: "Local Vault",
      source: localVaultSource,
      status: localVaultSource?.id === primarySource?.id ? (primaryNeedsReview ? "Needs review" : "Primary") : localVaultSource ? "Backup" : localVault ? "Available · import" : "Missing",
      helper: localVault ? (localVaultUsable ? "Local manifest asset is available." : "Local source needs manual review.") : "No local manifest source.",
      secondary: true,
      action: localVaultSource && localVaultSource.status !== "rejected" ? <ApproveButton source={localVaultSource} slug={logoSlug} label={localVaultSource.id === primarySource?.id ? "Mark reviewed" : "Use as primary"} dark={localVaultSource.id !== primarySource?.id} /> : localVault ? <form action={importLocalVaultSourceAction}>{hiddenLogoFields}<input type="hidden" name="slug" value={logoSlug} /><SmallButton dark>Import</SmallButton></form> : null,
    },
  ];
  const backupSources = sources.filter((source) => source.id !== primarySource?.id);

  return (
    <AdminShell
      active="logos"
      title={logoName}
      subtitle={`${logoSlug} · ${logoCategory}`}
      max="max-w-[1320px]"
      sticky
      headerExtra={
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Link href="/admin/logos" className="text-xs font-black text-slate-500">← logos</Link>
          <StatusBadge status={safeString(logo.status) || "unknown"} />
          <span className="text-xs font-bold text-slate-400">Primary {primarySource ? primaryProvider : "fallback"}</span>
          <span className="text-xs font-bold text-slate-400">CG {safeString(coinGeckoId) || "missing"}</span>
          <span className="text-xs font-bold text-slate-400">CMC {safeString(coinMarketCapId) || "missing"}</span>
        </div>
      }
    >
      <AdminDbErrorPanel errors={dbErrors} />

      {firstParam(searchParams?.message) ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${firstParam(searchParams?.notice) === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : firstParam(searchParams?.notice) === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"}`}>{firstParam(searchParams?.message)}</div>
      ) : null}
      {sourceWarnings.length ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">Some source metadata is malformed. It is hidden safely in details instead of blocking this detail page.</p> : null}

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Img src={publicPreview} size={72} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-950">Logo source control</h1>
                <StatusBadge status={safeString(logo.status) || "unknown"} />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500">This is what public cards will use. Next: <span className="text-slate-950">{nextAction}</span></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {qa.issues.slice(0, 4).map((issue) => <AdminStatusPill key={issue} tone={issue === "visual_rejected" ? "red" : "amber"}>{issue.replaceAll("_", " ")}</AdminStatusPill>)}
                {localVault ? <AdminStatusPill tone={localVaultUsable ? "green" : "amber"}>local vault {localVaultUsable ? "available" : "review"}</AdminStatusPill> : null}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center text-xs font-black text-slate-500">
            <div className="rounded-xl bg-white p-2"><Img src={publicPreview} size={36} /><div className="mt-1">Public</div></div>
            <div className="rounded-xl bg-white p-2"><Img src={sourceImage(primarySource)} size={36} /><div className="mt-1">Primary</div></div>
            <div className="rounded-xl bg-white p-2"><Img src={fallbackPreview} size={36} /><div className="mt-1">Fallback</div></div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.35fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Primary source</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{primarySource ? primaryProvider : "Fallback"}</h2>
            </div>
            <AdminStatusPill tone={statusTone(primaryStatus)}>{primaryStatus}</AdminStatusPill>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
            <Img src={sourceImage(primarySource) || publicPreview} size={86} />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-950">{primarySource ? `${primaryProvider} · ${primaryStatus} · Used publicly` : "No approved source · fallback shown publicly"}</div>
              <p className="mt-1 text-xs font-bold text-slate-500">{primarySource ? sourceStatusLabel(primarySource) : "Add or fetch a source, then mark it reviewed."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {primarySource && primaryNeedsReview ? <ApproveButton source={primarySource} slug={logoSlug} label="Mark reviewed" dark /> : null}
                {primarySource ? <RejectButton source={primarySource} slug={logoSlug} /> : null}
              </div>
              {primarySource ? <SourceDetails source={primarySource} /> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Logo Source Engine</p>
              <h2 className="text-lg font-black text-slate-950">Providers and backups</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">One-click actions</span>
          </div>
          <div className="grid gap-2">
            {mainProviders.map((row) => (
              <div key={row.key} className={`${row.secondary ? "bg-slate-50/70" : "bg-white"} grid gap-3 rounded-2xl border border-slate-100 p-3 md:grid-cols-[170px_110px_64px_1fr] md:items-center`}>
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{row.name}</div>
                  <div className="truncate text-xs font-bold text-slate-400">{row.helper}</div>
                </div>
                <AdminStatusPill tone={statusTone(row.status)}>{row.status}</AdminStatusPill>
                <Img src={sourceImage(row.source) || (row.key === "local-vault" ? localVault?.localPath : null)} size={42} />
                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  {row.action}
                  {row.source && row.source.status !== "rejected" ? <RejectButton source={row.source} slug={logoSlug} /> : null}
                </div>
                {row.source ? <div className="md:col-span-4"><SourceDetails source={row.source} /></div> : null}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Fetch missing sources</p>
              <h2 className="text-lg font-black text-slate-950">Compact actions</h2>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <form action={saveProviderIdsAction} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <input type="hidden" name="slug" value={logoSlug} />
              <input name="coinGeckoId" defaultValue={safeString(coinGeckoId) || ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" placeholder="CoinGecko ID" />
              <input name="coinMarketCapId" defaultValue={safeString(coinMarketCapId) || ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" placeholder="CoinMarketCap ID" />
              <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Save IDs</button>
            </form>
            <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <form action={addManualUrlAction} className="flex gap-2">{hiddenLogoFields}<input name="imageUrl" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" placeholder="Manual https:// URL" /><button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black">Add</button></form>
              <form action={uploadLogoAction} className="flex flex-wrap items-center gap-2">{hiddenLogoFields}<input name="file" type="file" accept="image/png,image/jpeg,image/webp" disabled={!config.hasBlob} className="min-w-0 flex-1 text-xs font-bold disabled:opacity-40" /><button disabled={!config.hasBlob} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black disabled:opacity-40">Upload</button></form>
              {!config.hasBlob ? <p className="text-xs font-bold text-slate-400">Blob upload disabled; manual URLs still work.</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Find CoinGecko ID</p>
              <h2 className="text-lg font-black text-slate-950">ID helper</h2>
            </div>
            <AdminStatusPill tone={coinGeckoId ? "gray" : "amber"}>{coinGeckoId ? "optional" : "ID missing"}</AdminStatusPill>
          </div>
          <form className="mt-3 flex gap-2">
            <input name="cgq" defaultValue={cgFinderQuery || logoName} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold" placeholder="Search CoinGecko" />
            <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">Search</button>
          </form>
          {cgFinderResult.error ? <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">{cgFinderResult.error}</div> : null}
          {cgFinderResult.candidates.length ? (
            <div className="mt-3 grid gap-2">
              {cgFinderResult.candidates.slice(0, 4).map((candidate) => (
                <form key={candidate.id} action={saveProviderIdsAction} className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs">
                  <input type="hidden" name="slug" value={logoSlug} />
                  <input type="hidden" name="coinGeckoId" value={candidate.id} />
                  <input type="hidden" name="coinMarketCapId" value={safeString(coinMarketCapId) || ""} />
                  <Img src={candidate.thumb || candidate.large} size={30} />
                  <div className="min-w-0"><div className="truncate font-black text-slate-950">{candidate.name} <span className="text-slate-400">{candidate.symbol}</span></div><div className="truncate font-bold text-slate-400">{candidate.id}</div></div>
                  <button className="rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white">Use ID</button>
                </form>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      {backupSources.length ? (
        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-slate-950">All backup source records</h2>
            <span className="text-xs font-bold text-slate-400">Kept visible, metadata collapsed</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {backupSources.map((source) => (
              <div key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Img src={sourceImage(source)} size={42} />
                  <div className="min-w-0 flex-1"><div className="font-black text-slate-950">{providerName(source.provider)}</div><div className="truncate text-xs font-bold text-slate-500">{sourceStatusLabel(source)}</div></div>
                  <AdminStatusPill tone={statusTone(source.status)}>{source.status}</AdminStatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {source.status !== "rejected" ? <ApproveButton source={source} slug={logoSlug} label="Use as primary" dark /> : null}
                  <RejectButton source={source} slug={logoSlug} />
                </div>
                <SourceDetails source={source} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <details className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <summary className="cursor-pointer text-sm font-black text-slate-950">Advanced debug</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-slate-950">Current DB state</h3>
            <dl className="mt-2">
              <KV k="approved_logo_url" v={logo.approved_logo_url} />
              <KV k="approved_source_id" v={logo.approved_source_id} />
              <KV k="status" v={logo.status} />
              <KV k="visual_status" v={logo.visual_status} />
              <KV k="coingecko_id" v={coinGeckoId} />
              <KV k="coinmarketcap_id" v={coinMarketCapId} />
              <KV k="last_fetch_provider" v={logo.last_fetch_provider} />
              <KV k="last_fetch_error" v={logo.last_fetch_error} />
              <KV k="last_fetch_at" v={logo.last_fetch_at} />
              <KV k="fallback_text" v={logo.fallback_text} />
              <KV k="fallback_color" v={logo.fallback_color} />
              <KV k="fallback_logo_url" v={logo.fallback_logo_url} />
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-slate-950">Public overlay debug</h3>
            <dl className="mt-2">
              <KV k="overlay slugs" v={overlaySlugs.join(", ")} />
              <KV k="source count" v={sources.length} />
              <KV k="local vault path" v={localVault?.localPath} />
              <KV k="local vault sha256" v={localVault?.sha256} />
              <KV k="qa action" v={qa.recommendedAction} />
              <KV k="qa issues" v={qa.issues.join(", ")} />
            </dl>
          </section>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-3">
          <h3 className="text-sm font-black text-red-900">Danger / manual state controls</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <form action={saveFallbackAction} className="grid gap-2"><input type="hidden" name="slug" value={logoSlug} /><input name="fallbackText" defaultValue={safeString(logo.fallback_text) || ""} className="rounded-xl border border-red-100 px-3 py-2 text-sm" placeholder="Fallback text" /><input name="fallbackColor" defaultValue={safeString(logo.fallback_color) || ""} className="rounded-xl border border-red-100 px-3 py-2 text-sm" placeholder="#0f172a" /><button className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-900">Save fallback</button></form>
            <form action={markNeedsReviewAction} className="grid content-start gap-2"><input type="hidden" name="slug" value={logoSlug} /><button className="rounded-xl bg-white px-3 py-2 text-sm font-black text-amber-800">Mark needs review</button></form>
            <div className="grid gap-2">
              <form action={markVisualRejectedAction} className="grid gap-2"><input type="hidden" name="slug" value={logoSlug} /><input name="reason" className="rounded-xl border border-red-100 px-3 py-2 text-sm" placeholder="Visual rejection reason" /><button className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white">Mark visual rejected</button></form>
              <form action={rejectLogoAction} className="grid gap-2"><input type="hidden" name="slug" value={logoSlug} /><input name="reason" className="rounded-xl border border-red-100 px-3 py-2 text-sm" placeholder="Reject entity reason" /><button className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white">Reject logo entity</button></form>
            </div>
          </div>
        </div>
      </details>
    </AdminShell>
  );
}
