import Link from "next/link";
import {
  AdminShell,
  AdminStatusPill,
} from "@/components/admin/AdminPrimitives";
import { notFound } from "next/navigation";
import { requireAdmin, adminConfigState } from "@/lib/admin/auth";
import {
  addCoinGeckoAction,
  addCoinMarketCapAction,
  addDefiLlamaAction,
  addManualUrlAction,
  approveSourceAction,
  copySourceToVaultAction,
  fetchAllLogoSourcesAction,
  markNeedsReviewAction,
  markVisualRejectedAction,
  rejectLogoAction,
  rejectSourceAction,
  restoreSourceAction,
  saveFallbackAction,
  saveProviderIdsAction,
  useCoinGeckoIdAction,
  uploadLogoAction,
  useCoinMarketCapIdAction,
} from "@/lib/admin/actions";
import { getCoinGeckoLogoId } from "@/lib/admin/coingeckoLogoIds";
import {
  approvedLogoCandidateSlugs,
  getLogo,
  getLogoSources,
  type LogoSource,
} from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import { classifyLogoQa, getCoinMarketCapId } from "@/lib/admin/logoQa";
import { searchCoinGeckoIds } from "@/lib/admin/coingeckoSearch";
import { searchCoinMarketCapIds } from "@/lib/admin/cmcSearch";
import { searchDefiLlamaSources } from "@/lib/admin/defillamaResolver";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PillTone = "green" | "amber" | "red" | "gray";
type ProviderKey =
  | "coingecko"
  | "coinmarketcap"
  | "defillama"
  | "managed-vault"
  | "manual";

function firstParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function safeString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unrenderable]";
  }
}

function safeUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("/")
  )
    return text;
  return null;
}

function metadataObject(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return { parseWarning: "Metadata was not valid JSON", raw: metadata };
    }
  }
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function metadataText(metadata: unknown) {
  try {
    return JSON.stringify(metadataObject(metadata), null, 2);
  } catch {
    return JSON.stringify(
      { parseWarning: "Metadata could not be rendered" },
      null,
      2,
    );
  }
}

function metadataWarning(metadata: unknown) {
  return typeof metadata === "string" && metadataObject(metadata).parseWarning
    ? "metadata warning"
    : null;
}

function providerName(provider?: string | null) {
  if (provider === "coingecko") return "CoinGecko";
  if (provider === "coinmarketcap") return "CoinMarketCap";
  if (provider === "defillama") return "DefiLlama";
  if (provider === "manual") return "Manual URL";
  if (provider === "upload") return "Upload";
  if (provider === "managed-vault" || provider === "vault")
    return "Managed Vault";
  return safeString(provider) || "Unknown source";
}

function sourceImage(source?: LogoSource | null) {
  return safeUrl(source?.blob_url) || safeUrl(source?.image_url);
}

function sourceStatusLabel(source: {
  provider?: unknown;
  status?: unknown;
  metadata: unknown;
}) {
  const meta = metadataObject(source.metadata);
  const status = safeString(source.status) || "unknown";
  const provider = safeString(source.provider) || "unknown";
  if (status !== "approved") {
    if (meta.reviewStatus === "selected_needs_review")
      return "selected · needs review";
    return status;
  }
  if (meta.reviewStatus === "reviewed") return "approved · reviewed";
  if (meta.autoApproved || meta.approvalOrigin === "auto")
    return "approved · CoinGecko";
  if (
    provider === "manual" ||
    provider === "upload" ||
    meta.approvalOrigin === "admin"
  )
    return "approved · admin";
  return "approved";
}

function statusTone(label: string): PillTone {
  const lower = label.toLowerCase();
  if (
    lower.includes("primary") ||
    lower.includes("reviewed") ||
    lower.includes("trusted") ||
    lower.includes("available")
  )
    return "green";
  if (
    lower.includes("review") ||
    lower.includes("missing") ||
    lower.includes("add") ||
    lower.includes("key")
  )
    return "amber";
  if (
    lower.includes("reject") ||
    lower.includes("error") ||
    lower.includes("failed")
  )
    return "red";
  return "gray";
}

function StatusBadge({ status }: { status: string }) {
  const text = safeString(status) || "unknown";
  const tone = text.startsWith("approved")
    ? "green"
    : text === "rejected"
      ? "red"
      : "amber";
  return (
    <AdminStatusPill tone={tone}>{text.replace("_", " ")}</AdminStatusPill>
  );
}

function Img({ src, size = 32 }: { src?: string | null; size?: number }) {
  const safeSrc = safeUrl(src);
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm"
    >
      {safeSrc ? (
        <img src={safeSrc} alt="" className="h-full w-full object-contain" />
      ) : (
        <span className="text-[9px] font-black text-slate-300">—</span>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v?: unknown }) {
  const text = safeString(v);
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 text-xs sm:grid-cols-[160px_1fr] sm:gap-3">
      <dt className="font-black uppercase tracking-[0.08em] text-slate-400">
        {k}
      </dt>
      <dd
        className="min-w-0 break-words font-bold text-slate-800"
        title={text || ""}
      >
        {text || "—"}
      </dd>
    </div>
  );
}

function SmallButton({
  children,
  dark = false,
  disabled = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`${dark ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-800"} rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ApproveButton({
  source,
  slug,
  label = "Mark reviewed",
  dark = false,
}: {
  source: LogoSource;
  slug: string;
  label?: string;
  dark?: boolean;
}) {
  return (
    <form action={approveSourceAction}>
      <input type="hidden" name="sourceId" value={source.id} />
      <input type="hidden" name="slug" value={slug} />
      <SmallButton dark={dark}>{label}</SmallButton>
    </form>
  );
}

function CopyVaultButton({
  source,
  slug,
  name,
  category,
}: {
  source: LogoSource;
  slug: string;
  name: string;
  category: string;
}) {
  return (
    <form action={copySourceToVaultAction}>
      <input type="hidden" name="sourceId" value={source.id} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="category" value={category} />
      <SmallButton>Copy to Vault</SmallButton>
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


function RestoreButtons({ source, slug }: { source: LogoSource; slug: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={restoreSourceAction}>
        <input type="hidden" name="sourceId" value={source.id} />
        <input type="hidden" name="slug" value={slug} />
        <SmallButton>Restore</SmallButton>
      </form>
      <form action={restoreSourceAction}>
        <input type="hidden" name="sourceId" value={source.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="useAsPrimary" value="1" />
        <SmallButton dark>Restore and use</SmallButton>
      </form>
    </div>
  );
}

function SourceDetails({ source }: { source: LogoSource }) {
  const sourceHref = safeUrl(source.source_url);
  const imageHref = sourceImage(source);
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-black text-slate-400 hover:text-slate-600">
        Details
      </summary>
      <div className="mt-2 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 font-bold text-slate-600">
        {sourceHref ? (
          <a href={sourceHref} className="break-all underline">
            Source URL: {sourceHref}
          </a>
        ) : (
          <div className="text-slate-400">Source URL: —</div>
        )}
        {imageHref ? (
          <a href={imageHref} className="break-all underline">
            Image URL: {imageHref}
          </a>
        ) : (
          <div className="text-slate-400">Image URL: —</div>
        )}
        <div>Created: {safeString(source.created_at) || "—"}</div>
        {source.rejection_reason ? (
          <div className="text-red-700">
            Rejection reason: {safeString(source.rejection_reason)}
          </div>
        ) : null}
        {metadataWarning(source.metadata) ? (
          <div className="text-amber-700">Malformed metadata shown safely.</div>
        ) : null}
        <pre className="max-h-40 overflow-auto rounded-lg bg-white p-2 text-[10px] text-slate-500">
          {metadataText(source.metadata)}
        </pre>
      </div>
    </details>
  );
}

export default async function LogoDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: SearchParams;
}) {
  await requireAdmin();
  const logoResult = await safeAdminDbQuery(
    "Logo record",
    () => getLogo(params.slug),
    null,
  );
  const logo = logoResult.data;
  if (!logo && !logoResult.error) notFound();
  const sourceResult = logo
    ? await safeAdminDbQuery(
        "Logo sources",
        async () => (await getLogoSources(logo.id)).rows,
        [],
      )
    : { data: [], error: null };
  const sources = sourceResult.data;
  const dbErrors = [logoResult.error, sourceResult.error].filter(Boolean);
  const config = adminConfigState();

  if (!logo) {
    return (
      <AdminShell active="logos" title="Logo detail" max="max-w-6xl">
        <Link href="/admin/logos" className="text-sm font-black text-slate-500">
          ← Back to logos
        </Link>
        <AdminDbErrorPanel errors={dbErrors} />
      </AdminShell>
    );
  }

  const logoName = safeString(logo.name) || "Unknown logo";
  const logoSlug = safeString(logo.slug) || params.slug;
  const logoCategory = safeString(logo.category) || "uncategorized";
  const coinGeckoId =
    safeString(logo.coingecko_id) || getCoinGeckoLogoId(logoSlug);
  const coinMarketCapId = getCoinMarketCapId(logo, sources);
  const approvedSource =
    sources.find((source) => source.id === logo.approved_source_id) ?? null;
  const fallbackPreview = safeUrl(logo.fallback_logo_url) || null;
  const publicPreview = safeUrl(logo.approved_logo_url) || fallbackPreview;
  const overlaySlugs = approvedLogoCandidateSlugs(logoName);
  const qa = classifyLogoQa(logo, sources, config.hasBlob);
  const sourceWarnings = sources
    .map((source) => metadataWarning(source.metadata))
    .filter(Boolean);
  const cgNeedsReview =
    logo.last_fetch_provider === "coingecko" && Boolean(logo.last_fetch_error);
  const cgFinderQuery = firstParam(
    searchParams?.cgq,
    !coinGeckoId || cgNeedsReview ? logoName : "",
  );
  const cgFinderResult = cgFinderQuery
    ? await searchCoinGeckoIds(cgFinderQuery, { targetName: logoName, targetSlug: logoSlug })
    : { candidates: [], error: null };
  const cmcReady = Boolean((await resolveApiSecret("coinmarketcap")).value);
  const cmcFinderQuery = firstParam(searchParams?.cmcq, "");
  const cmcFinderResult =
    cmcFinderQuery && cmcReady
      ? await searchCoinMarketCapIds(cmcFinderQuery, { targetName: logoName, targetSlug: logoSlug })
      : {
          candidates: [],
          error: cmcReady ? null : "Add CoinMarketCap API key first",
          apiKeyMissing: !cmcReady,
        };


  const hiddenLogoFields = (
    <>
      <input type="hidden" name="name" value={logoName} />
      <input type="hidden" name="category" value={logoCategory} />
    </>
  );

  const priorityOrder = [
    "manual",
    "upload",
    "managed-vault",
    "vault",
    "coingecko",
    "coinmarketcap",
    "defillama",
  ];
  const fallbackPrimary =
    priorityOrder
      .map((provider) =>
        sources.find(
          (source) =>
            source.status === "approved" && source.provider === provider,
        ),
      )
      .find(Boolean) ?? null;
  const primarySource = approvedSource ?? fallbackPrimary;
  const primaryProvider = providerName(primarySource?.provider);
  const primaryMeta = metadataObject(primarySource?.metadata);
  const primaryNeedsReview = Boolean(
    primarySource &&
    !["coingecko", "manual", "upload"].includes(primarySource.provider) &&
    primaryMeta.reviewStatus !== "reviewed",
  );
  const primaryStatus = primarySource
    ? primarySource.provider === "coingecko"
      ? "Trusted"
      : primarySource.provider === "managed-vault" ||
          primarySource.provider === "vault"
        ? primaryNeedsReview
          ? "Pending review"
          : "Reviewed vault"
        : primaryNeedsReview
          ? "Pending review"
          : "Reviewed"
    : publicPreview
      ? "Generated fallback"
      : "Missing source";
  const nextAction = primaryNeedsReview
    ? `Review ${primaryProvider} logo`
    : !primarySource
      ? "Fetch all sources"
      : "No action required";
  const manualUploadSource =
    sources.find(
      (source) =>
        ["manual", "upload"].includes(source.provider) &&
        source.status !== "rejected",
    ) ??
    sources.find((source) => ["manual", "upload"].includes(source.provider)) ??
    null;
  const providerSource = (provider: string) =>
    sources.find(
      (source) => source.provider === provider && source.status !== "rejected",
    ) ??
    sources.find((source) => source.provider === provider) ??
    null;
  const coinGeckoSource = providerSource("coingecko");
  const coinMarketCapSource = providerSource("coinmarketcap");
  const defiLlamaSource = providerSource("defillama");
  const activeDefiLlamaSource =
    defiLlamaSource && defiLlamaSource.status !== "rejected"
      ? defiLlamaSource
      : null;
  const managedVaultSource =
    providerSource("managed-vault") ?? providerSource("vault");
  const cmcNumeric = Boolean(
    coinMarketCapId && /^\d+$/.test(String(coinMarketCapId)),
  );
  const mainProviders: Array<{
    key: ProviderKey;
    name: string;
    source: LogoSource | null;
    status: string;
    action: React.ReactNode;
    helper?: string;
    secondary?: boolean;
  }> = [
    {
      key: "coingecko",
      name: "CoinGecko",
      source: coinGeckoSource,
      status:
        coinGeckoSource?.status === "rejected"
          ? "Rejected"
          : coinGeckoSource?.id === primarySource?.id
            ? "Primary"
            : coinGeckoSource
              ? "Backup"
              : cgNeedsReview
                ? "ID review"
                : coinGeckoId
                  ? "Missing"
                  : "Missing ID",
      helper: coinGeckoId ? `ID: ${coinGeckoId}` : "Find and save an exact ID.",
      action:
        coinGeckoSource?.id === primarySource?.id ? null : (
          <div className="flex flex-wrap gap-2">
            {coinGeckoSource && coinGeckoSource.status !== "rejected" ? (
              <ApproveButton
                source={coinGeckoSource}
                slug={logoSlug}
                label="Use as primary"
                dark
              />
            ) : null}
            <form action={addCoinGeckoAction}>
              {hiddenLogoFields}
              <input
                type="hidden"
                name="coinGeckoId"
                value={safeString(coinGeckoId) || ""}
              />
              <SmallButton disabled={!coinGeckoId}>
                {cgNeedsReview ? "Retry" : coinGeckoId ? "Fetch" : "Add ID"}
              </SmallButton>
            </form>
          </div>
        ),
    },
    {
      key: "coinmarketcap",
      name: "CoinMarketCap",
      source: coinMarketCapSource,
      status:
        coinMarketCapSource?.status === "rejected"
          ? "Rejected"
          : coinMarketCapSource?.id === primarySource?.id
            ? primaryNeedsReview
              ? "Pending review"
              : "Primary"
            : coinMarketCapSource
              ? "Backup"
              : !cmcReady
                ? "API key missing"
                : coinMarketCapId && !cmcNumeric
                  ? "ID review"
                  : coinMarketCapId
                    ? "Missing"
                    : "Missing numeric ID",
      helper: !cmcReady
        ? "Add CoinMarketCap API key first."
        : coinMarketCapId && !cmcNumeric
          ? "CMC ID must be numeric; use finder."
          : coinMarketCapId
            ? `Numeric ID: ${coinMarketCapId}`
            : "Find and save a numeric CMC ID.",
      action: (
        <div className="flex flex-wrap gap-2">
          {coinMarketCapSource && coinMarketCapSource.status !== "rejected" ? (
            <ApproveButton
              source={coinMarketCapSource}
              slug={logoSlug}
              label={
                coinMarketCapSource.id === primarySource?.id
                  ? "Mark reviewed"
                  : "Use as primary"
              }
              dark={coinMarketCapSource.id !== primarySource?.id}
            />
          ) : null}
          <form action={addCoinMarketCapAction}>
            {hiddenLogoFields}
            <input
              type="hidden"
              name="coinMarketCapId"
              value={safeString(coinMarketCapId) || ""}
            />
            <SmallButton
              disabled={!coinMarketCapId || !cmcReady || !cmcNumeric}
            >
              {logo.last_fetch_provider === "coinmarketcap" &&
              logo.last_fetch_error
                ? "Retry"
                : coinMarketCapId
                  ? "Fetch CMC"
                  : "Find CMC ID"}
            </SmallButton>
          </form>
        </div>
      ),
    },
    {
      key: "defillama",
      name: "DefiLlama",
      source: defiLlamaSource,
      status:
        defiLlamaSource?.status === "rejected"
          ? "Rejected"
          : activeDefiLlamaSource?.id === primarySource?.id
            ? primaryNeedsReview
              ? "Pending review"
              : "Primary"
            : activeDefiLlamaSource
              ? "Backup"
              : "Missing",
      helper: `Default slug: ${logoSlug}`,
      action: (
        <div className="flex flex-wrap gap-2">
          {activeDefiLlamaSource ? (
            <ApproveButton
              source={activeDefiLlamaSource}
              slug={logoSlug}
              label={
                activeDefiLlamaSource.id === primarySource?.id
                  ? "Mark reviewed"
                  : "Use as primary"
              }
              dark={activeDefiLlamaSource.id !== primarySource?.id}
            />
          ) : null}
          <form action={addDefiLlamaAction}>
            {hiddenLogoFields}
            <input type="hidden" name="providerSlug" value={logoSlug} />
            <SmallButton>
              {activeDefiLlamaSource ? "Fetch again" : "Fetch"}
            </SmallButton>
          </form>
        </div>
      ),
    },
    {
      key: "managed-vault",
      name: "Managed Vault",
      source: managedVaultSource,
      status:
        managedVaultSource?.id === primarySource?.id
          ? primaryNeedsReview
            ? "Pending review"
            : "Primary"
          : managedVaultSource
            ? "Backup"
            : config.hasBlob
              ? "Missing"
              : "Blob missing",
      helper: config.hasBlob
        ? "Durable Blob copy of a selected provider logo."
        : "Set BLOB_READ_WRITE_TOKEN to enable vault copies.",
      secondary: true,
      action:
        managedVaultSource && managedVaultSource.status !== "rejected" ? (
          <ApproveButton
            source={managedVaultSource}
            slug={logoSlug}
            label={
              managedVaultSource.id === primarySource?.id
                ? "Mark reviewed"
                : "Use as primary"
            }
            dark={managedVaultSource.id !== primarySource?.id}
          />
        ) : primarySource ? (
          <CopyVaultButton
            source={primarySource}
            slug={logoSlug}
            name={logoName}
            category={logoCategory}
          />
        ) : null,
    },
    {
      key: "manual",
      name: "Manual / Upload",
      source: manualUploadSource,
      status:
        manualUploadSource?.status === "rejected"
          ? "Rejected"
          : manualUploadSource?.id === primarySource?.id
            ? "Primary"
            : manualUploadSource
              ? "Backup"
              : "Secondary",
      helper: "Admin-selected sources are never overwritten automatically.",
      secondary: true,
      action:
        manualUploadSource && manualUploadSource.status !== "rejected" ? (
          <ApproveButton
            source={manualUploadSource}
            slug={logoSlug}
            label={
              manualUploadSource.id === primarySource?.id
                ? "Mark reviewed"
                : "Use as primary"
            }
            dark={manualUploadSource.id !== primarySource?.id}
          />
        ) : (
          <span className="text-xs font-bold text-slate-400">Add below</span>
        ),
    },
  ];
  const defiLlamaQuery = firstParam(searchParams?.dflq, logoSlug);
  const defiLlamaSlug =
    (defiLlamaQuery || logoSlug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || logoSlug;
  const defiLlamaFinderResult = defiLlamaQuery
    ? await searchDefiLlamaSources(defiLlamaQuery, { targetName: logoName, targetSlug: logoSlug, category: logoCategory })
    : { candidates: [], error: null };
  const recommendedDefiLlama = defiLlamaFinderResult.candidates.find((candidate) => candidate.recommended && candidate.confidence === "high") ?? null;
  const otherDefiLlamaMatches = defiLlamaFinderResult.candidates.filter((candidate) => candidate.id !== recommendedDefiLlama?.id);
  const defiLlamaPreview = recommendedDefiLlama?.imageUrl || null;

  return (
    <AdminShell
      active="logos"
      title={logoName}
      subtitle={`${logoSlug} · ${logoCategory}`}
      max="max-w-[1320px]"
      sticky
      headerExtra={
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Link
            href="/admin/logos"
            className="text-xs font-black text-slate-500"
          >
            ← logos
          </Link>
          <StatusBadge status={safeString(logo.status) || "unknown"} />
          <span className="text-xs font-bold text-slate-400">
            Primary {primarySource ? primaryProvider : "fallback"}
          </span>
          <span className="text-xs font-bold text-slate-400">
            CG {safeString(coinGeckoId) || "missing"}
          </span>
          <span className="text-xs font-bold text-slate-400">
            CMC {safeString(coinMarketCapId) || "missing"}
          </span>
        </div>
      }
    >
      <AdminDbErrorPanel errors={dbErrors} />

      {firstParam(searchParams?.message) ? (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${firstParam(searchParams?.notice) === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : firstParam(searchParams?.notice) === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {firstParam(searchParams?.message)}
        </div>
      ) : null}
      {sourceWarnings.length ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">
          Some source metadata is malformed. It is hidden safely in details
          instead of blocking this detail page.
        </p>
      ) : null}

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft md:p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Img src={publicPreview} size={72} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-950">
                  Logo source control
                </h1>
                <StatusBadge status={safeString(logo.status) || "unknown"} />
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500">
                This is what public cards will use. Next:{" "}
                <span className="text-slate-950">{nextAction}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <AdminStatusPill tone={statusTone(primaryStatus)}>
                  {primaryStatus}
                </AdminStatusPill>
                {primarySource ? (
                  <AdminStatusPill tone="gray">
                    {primaryProvider}
                  </AdminStatusPill>
                ) : null}
                {primaryNeedsReview ? (
                  <AdminStatusPill tone="amber">
                    review required
                  </AdminStatusPill>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-center text-xs font-black text-slate-500">
            {[mainProviders[0], mainProviders[1], mainProviders[2]].map((provider) => (
              <div key={provider.key} className="rounded-xl bg-white p-2">
                <Img src={sourceImage(provider.source)} size={36} />
                <div className="mt-1 truncate">{provider.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">{provider.status}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.35fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Primary source
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                {primarySource ? primaryProvider : "Fallback"}
              </h2>
            </div>
            <AdminStatusPill tone={statusTone(primaryStatus)}>
              {primaryStatus}
            </AdminStatusPill>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
            <Img src={sourceImage(primarySource) || publicPreview} size={86} />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-950">
                {primarySource
                  ? `${primaryProvider} · ${primaryStatus} · Used publicly`
                  : "No approved source · fallback shown publicly"}
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {primarySource
                  ? sourceStatusLabel(primarySource)
                  : "Add or fetch a source, then mark it reviewed."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={fetchAllLogoSourcesAction}>
                  {hiddenLogoFields}
                  <SmallButton dark>Fetch all sources</SmallButton>
                </form>
                {primarySource && primaryNeedsReview ? (
                  <ApproveButton
                    source={primarySource}
                    slug={logoSlug}
                    label="Mark reviewed"
                    dark
                  />
                ) : null}
                {primarySource ? (
                  <CopyVaultButton
                    source={primarySource}
                    slug={logoSlug}
                    name={logoName}
                    category={logoCategory}
                  />
                ) : null}
                {primarySource ? (
                  <RejectButton source={primarySource} slug={logoSlug} />
                ) : null}
              </div>
              {primarySource ? <SourceDetails source={primarySource} /> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Logo Source Engine
              </p>
              <h2 className="text-lg font-black text-slate-950">
                Provider sources
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              One-click actions
            </span>
          </div>
          <div className="grid gap-2">
            {mainProviders.map((row) => (
              <div
                key={row.key}
                className={`${row.secondary ? "bg-slate-50/70" : "bg-white"} grid gap-3 rounded-2xl border border-slate-100 p-3 md:grid-cols-[170px_110px_64px_1fr] md:items-center`}
              >
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{row.name}</div>
                  <div className="truncate text-xs font-bold text-slate-400">
                    {row.helper}
                  </div>
                </div>
                <AdminStatusPill tone={statusTone(row.status)}>
                  {row.status}
                </AdminStatusPill>
                <Img src={sourceImage(row.source)} size={42} />
                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  {row.source?.status === "rejected" ? <RestoreButtons source={row.source} slug={logoSlug} /> : row.action}
                  {row.source &&
                  row.source.status !== "rejected" &&
                  !["managed-vault", "manual"].includes(row.key) ? (
                    <CopyVaultButton
                      source={row.source}
                      slug={logoSlug}
                      name={logoName}
                      category={logoCategory}
                    />
                  ) : null}
                  {row.source && row.source.status !== "rejected" ? (
                    <RejectButton source={row.source} slug={logoSlug} />
                  ) : null}
                </div>
                {row.source ? (
                  <div className="md:col-span-4">
                    <SourceDetails source={row.source} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Discover
              </p>
              <h2 className="text-lg font-black text-slate-950">
                Fetch and source inputs
              </h2>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={fetchAllLogoSourcesAction}>
              {hiddenLogoFields}
              <SmallButton dark>Fetch all sources</SmallButton>
            </form>
            <a
              href="#find-ids"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm"
            >
              Find IDs
            </a>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <form
              action={saveProviderIdsAction}
              className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3"
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Provider IDs
              </p>
              <input type="hidden" name="slug" value={logoSlug} />
              <input
                name="coinGeckoId"
                defaultValue={safeString(coinGeckoId) || ""}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                placeholder="CoinGecko ID"
              />
              <input
                name="coinMarketCapId"
                defaultValue={safeString(coinMarketCapId) || ""}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                placeholder="CoinMarketCap ID"
              />
              <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
                Save IDs
              </button>
            </form>
            <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Manual source
              </p>
              <form action={addManualUrlAction} className="flex gap-2">
                {hiddenLogoFields}
                <input
                  name="imageUrl"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                  placeholder="Manual https:// URL"
                />
                <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black">
                  Add
                </button>
              </form>
              <form
                action={uploadLogoAction}
                className="flex flex-wrap items-center gap-2"
              >
                {hiddenLogoFields}
                <input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!config.hasBlob}
                  className="min-w-0 flex-1 text-xs font-bold disabled:opacity-40"
                />
                <button
                  disabled={!config.hasBlob}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black disabled:opacity-40"
                >
                  Upload
                </button>
              </form>
              {!config.hasBlob ? (
                <p className="text-xs font-bold text-slate-400">
                  Blob upload disabled; manual URLs still work.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section
          id="find-ids"
          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Find CoinGecko ID
              </p>
              <h2 className="text-lg font-black text-slate-950">ID helper</h2>
            </div>
            <AdminStatusPill tone={coinGeckoId ? "gray" : "amber"}>
              {coinGeckoId ? "optional" : "ID missing"}
            </AdminStatusPill>
          </div>
          <form className="mt-3 flex gap-2">
            <input
              name="cgq"
              defaultValue={cgFinderQuery || logoName}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
              placeholder="Search CoinGecko"
            />
            <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
              Search
            </button>
          </form>
          {cgFinderResult.error ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">
              {cgFinderResult.error}
            </div>
          ) : null}
          {cgFinderResult.candidates.length ? (
            <div className="mt-3 grid gap-2">
              {cgFinderResult.candidates.slice(0, 4).map((candidate) => (
                <form
                  key={candidate.id}
                  action={useCoinGeckoIdAction}
                  className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs"
                >
                  <input type="hidden" name="slug" value={logoSlug} />
                  <input
                    type="hidden"
                    name="coinGeckoId"
                    value={candidate.id}
                  />
                  <input
                    type="hidden"
                    name="coinMarketCapId"
                    value={safeString(coinMarketCapId) || ""}
                  />
                  <Img src={candidate.thumb || candidate.large} size={30} />
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-950">
                      {candidate.name}{" "}
                      <span className="text-slate-400">{candidate.symbol}</span>
                    </div>
                    <div className="truncate font-bold text-slate-400">
                      {candidate.recommended ? "Recommended · " : "Other match · "}{candidate.confidence} confidence · {candidate.id}
                    </div>
                  </div>
                  <button className="rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white">
                    Use + Fetch
                  </button>
                </form>
              ))}
            </div>
          ) : null}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Find CoinMarketCap ID
                </p>
                <h3 className="text-sm font-black text-slate-950">
                  Numeric CMC helper
                </h3>
              </div>
              <AdminStatusPill
                tone={cmcReady ? (cmcNumeric ? "gray" : "amber") : "amber"}
              >
                {cmcReady
                  ? cmcNumeric
                    ? "optional"
                    : "numeric ID needed"
                  : "API key missing"}
              </AdminStatusPill>
            </div>
            <form className="mt-3 flex gap-2">
              <input
                name="cmcq"
                defaultValue={cmcFinderQuery || logoName}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                placeholder="Search CMC by name or symbol"
              />
              <button
                disabled={!cmcReady}
                className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white disabled:opacity-40"
              >
                Search CMC
              </button>
            </form>
            {cmcFinderResult.error ? (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-800">
                {cmcFinderResult.error}
              </div>
            ) : null}
            {cmcFinderResult.candidates.length ? (
              <div className="mt-3 grid gap-2">
                {cmcFinderResult.candidates.slice(0, 5).map((candidate) => (
                  <form
                    key={candidate.id}
                    action={useCoinMarketCapIdAction}
                    className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs"
                  >
                    <input type="hidden" name="slug" value={logoSlug} />
                    <input
                      type="hidden"
                      name="coinMarketCapId"
                      value={candidate.id}
                    />
                    <Img src={candidate.logo} size={30} />
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">
                        {candidate.name}{" "}
                        <span className="text-slate-400">
                          {candidate.symbol}
                        </span>
                      </div>
                      <div className="truncate font-bold text-slate-400">
                        {candidate.recommended ? "Recommended · " : "Other match · "}{candidate.confidence} confidence · ID {candidate.id} · slug {candidate.slug}
                      </div>
                    </div>
                    <button className="rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white">
                      Use + Fetch
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Find DefiLlama source
                </p>
                <h3 className="text-sm font-black text-slate-950">
                  Source resolver
                </h3>
              </div>
              <AdminStatusPill tone={activeDefiLlamaSource ? "gray" : recommendedDefiLlama ? "green" : "amber"}>
                {activeDefiLlamaSource
                  ? "source present"
                  : recommendedDefiLlama
                    ? "recommended source found"
                    : "no reliable source"}
              </AdminStatusPill>
            </div>
            <form className="mt-3 flex gap-2">
              <input
                name="dflq"
                defaultValue={defiLlamaSlug}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                placeholder="DefiLlama slug"
              />
              <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
                Preview
              </button>
            </form>
            <div className="mt-3 grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs">
              {defiLlamaPreview ? <Img src={defiLlamaPreview} size={30} /> : <div className="h-[30px] w-[30px] rounded-full bg-slate-200" />}
              <div className="min-w-0">
                <div className="truncate font-black text-slate-950">
                  {recommendedDefiLlama ? `${recommendedDefiLlama.name} · ${recommendedDefiLlama.slug}` : "No reliable DefiLlama source found."}
                </div>
                {recommendedDefiLlama && defiLlamaPreview ? (
                  <div className="grid gap-0.5 font-bold text-slate-400">
                    <a href={recommendedDefiLlama.sourceUrl} className="truncate underline">
                      Recommended · high confidence · {recommendedDefiLlama.category} · {recommendedDefiLlama.sourceUrl}
                    </a>
                    <a href={defiLlamaPreview} className="truncate underline">
                      Icon: {defiLlamaPreview}
                    </a>
                  </div>
                ) : (
                  <p className="truncate font-bold text-slate-400">
                    {defiLlamaFinderResult.error || "Exact name/slug/category match required."}
                  </p>
                )}
              </div>
              {recommendedDefiLlama ? (
                <form action={addDefiLlamaAction}>
                  {hiddenLogoFields}
                  <input
                    type="hidden"
                    name="providerSlug"
                    value={recommendedDefiLlama.slug}
                  />
                  <button className="rounded-lg bg-slate-950 px-2 py-1.5 font-black text-white">
                    Use + Fetch
                  </button>
                </form>
              ) : null}
            </div>
            {otherDefiLlamaMatches.length ? (
              <details className="mt-2 rounded-xl border border-slate-100 bg-white p-2 text-xs">
                <summary className="cursor-pointer font-black text-slate-600">Other possible matches</summary>
                <div className="mt-2 grid gap-1">
                  {otherDefiLlamaMatches.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                      <span className="truncate font-bold text-slate-700">{candidate.name} · {candidate.slug}</span>
                      <span className="shrink-0 font-bold text-slate-400">{candidate.confidence} · {candidate.category}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </section>
      </section>

      <details className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <summary className="cursor-pointer text-sm font-black text-slate-950">
          Advanced
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:col-span-2">
            <h3 className="text-sm font-black text-slate-950">
              Source records
            </h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-xl border border-slate-100 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <Img src={sourceImage(source)} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-950">
                        {providerName(source.provider)}
                      </div>
                      <div className="truncate text-xs font-bold text-slate-500">
                        {sourceStatusLabel(source)}
                      </div>
                    </div>
                    <AdminStatusPill tone={statusTone(source.status)}>
                      {source.status}
                    </AdminStatusPill>
                  </div>
                  <SourceDetails source={source} />
                </div>
              ))}
              {!sources.length ? (
                <p className="text-xs font-bold text-slate-400">
                  No source records yet.
                </p>
              ) : null}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-slate-950">
              Current DB state
            </h3>
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
            <h3 className="text-sm font-black text-slate-950">
              Public overlay debug
            </h3>
            <dl className="mt-2">
              <KV k="overlay slugs" v={overlaySlugs.join(", ")} />
              <KV k="source count" v={sources.length} />
              <KV k="qa action" v={qa.recommendedAction} />
              <KV k="qa issues" v={qa.issues.join(", ")} />
            </dl>
          </section>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-red-100 bg-red-50 p-3">
          <h3 className="text-sm font-black text-red-900">
            Danger / manual state controls
          </h3>
          <div className="grid gap-2 md:grid-cols-3">
            <form action={saveFallbackAction} className="grid gap-2">
              <input type="hidden" name="slug" value={logoSlug} />
              <input
                name="fallbackText"
                defaultValue={safeString(logo.fallback_text) || ""}
                className="rounded-xl border border-red-100 px-3 py-2 text-sm"
                placeholder="Fallback text"
              />
              <input
                name="fallbackColor"
                defaultValue={safeString(logo.fallback_color) || ""}
                className="rounded-xl border border-red-100 px-3 py-2 text-sm"
                placeholder="#0f172a"
              />
              <button className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-900">
                Save fallback
              </button>
            </form>
            <form
              action={markNeedsReviewAction}
              className="grid content-start gap-2"
            >
              <input type="hidden" name="slug" value={logoSlug} />
              <button className="rounded-xl bg-white px-3 py-2 text-sm font-black text-amber-800">
                Mark needs review
              </button>
            </form>
            <div className="grid gap-2">
              <form action={markVisualRejectedAction} className="grid gap-2">
                <input type="hidden" name="slug" value={logoSlug} />
                <input
                  name="reason"
                  className="rounded-xl border border-red-100 px-3 py-2 text-sm"
                  placeholder="Visual rejection reason"
                />
                <button className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white">
                  Mark visual rejected
                </button>
              </form>
              <form action={rejectLogoAction} className="grid gap-2">
                <input type="hidden" name="slug" value={logoSlug} />
                <input
                  name="reason"
                  className="rounded-xl border border-red-100 px-3 py-2 text-sm"
                  placeholder="Reject entity reason"
                />
                <button className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white">
                  Reject logo entity
                </button>
              </form>
            </div>
          </div>
        </div>
      </details>
    </AdminShell>
  );
}
