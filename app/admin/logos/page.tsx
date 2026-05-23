import Link from "next/link";
import { AdminSection, AdminShell } from "@/components/admin/AdminPrimitives";
import {
  LogoResultsClient,
  type LogoResultRow,
} from "@/components/admin/LogoResultsClient";
import { requireAdmin, adminConfigState, getSetting } from "@/lib/admin/auth";
import {
  applySafeCoinGeckoCandidatesAction,
  bulkRefreshCoinGeckoLogosAction,
  bulkRefreshCoinMarketCapLogosAction,
  discoverDefiLlamaV3SourcesAction,
  dryRunRecoverMissingDefiLlamaLogosAction,
  recoverMissingDefiLlamaLogosAction,
  hardResetAndRediscoverDefiLlamaV3Action,
  hardResetDefiLlamaProviderAction,
  createLogoAction,
  discoverLogoSourcesBulkAction,
  backfillAliasEquivalentSourcesAction,
  importLegacyLocalLogosToVaultAction,
  scanMetricLogosAction,
} from "@/lib/admin/actions";
import { getAllLogoSources, listLogos } from "@/lib/admin/logoDb";
import { AdminDbErrorPanel, safeAdminDbQuery } from "@/lib/admin/adminDbError";
import {
  classifyLogoQa,
  summarizeLogoQa,
  type LogoQaRow,
} from "@/lib/admin/logoQa";
import {
  blobStatus,
  getBulkRefreshSummaries,
  type BulkRefreshSummary,
} from "@/lib/admin/providerStatus";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";
import {
  METRIC_LOGO_SCAN_SETTING,
  parseMetricLogoScanSummary,
} from "@/lib/admin/metricLogoScanner";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type DetailEntry = { label: string; slug?: string | null; title?: string };

const DEFAULT_LIMIT = 10;
const ACTION_ISSUES = new Set([
  "needs_review",
  "missing_approved_logo",
  "coingecko_id_needs_review",
  "coingecko_fetch_failed",
  "cmc_fetch_failed",
  "fallback_used",
  "visual_rejected",
  "unsafe_migrated_candidate",
  "metric_scan_error",
  "metric_scan_missing_coingecko_id",
  "metric_scan_candidate_added",
  "auto_approve_skipped",
  "db_overlay_not_applied",
  "rejected_source",
]);

const PRIMARY_FILTERS = [
  ["issues", "Needs action"],
  ["missing_approved_logo", "Missing logo"],
  ["missing_coingecko_id", "Missing CG"],
  ["missing_cmc_id", "Missing CMC"],
  ["missing_defillama_source", "Missing DefiLlama"],
  ["needs_review", "Needs review"],
  ["newly_discovered_entity", "New"],
] as const;

const MORE_FILTERS = [
  ["all", "All"],
  ["approved", "Approved"],
  ["coingecko_candidate_waiting", "CG candidates"],
  ["provider_errors", "Provider review"],
  ["fallback_used", "Fallback"],
  ["visual_rejected", "Visual / unsafe"],
  ["rejected_source", "Rejected"],
  ["defillama_no_reliable_source", "No reliable DefiLlama"],
  ["cmc_fetch_failed", "CMC errors"],
  ["db_overlay_not_applied", "Overlay"],
  ["coingecko_rate_limited", "Rate limited"],
  ["metric_scan_error", "Scan errors"],
] as const;

function firstParam(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function hasAction(row: LogoQaRow) {
  return row.issues.some((issue) => ACTION_ISSUES.has(issue));
}

function filterRows(rows: LogoQaRow[], filter: string) {
  if (filter === "all") return rows;
  if (filter === "issues") return rows.filter(hasAction);
  if (filter === "provider_errors")
    return rows.filter(
      (row) =>
        row.issues.includes("coingecko_fetch_failed") ||
        row.issues.includes("cmc_fetch_failed") ||
        row.issues.includes("defillama_no_reliable_source") ||
        row.issues.includes("coingecko_id_needs_review"),
    );
  if (filter === "approved")
    return rows.filter(
      (row) =>
        row.logo.status === "approved" &&
        !row.issues.includes("missing_approved_logo"),
    );
  return rows.filter((row) => row.issues.includes(filter as any));
}

function actionPriority(row: LogoQaRow) {
  const order = [
    "missing_approved_logo",
    "missing_coingecko_id",
    "missing_cmc_id",
    "missing_defillama_source",
    "coingecko_id_needs_review",
    "coingecko_fetch_failed",
    "cmc_fetch_failed",
    "defillama_no_reliable_source",
    "visual_rejected",
    "unsafe_migrated_candidate",
    "needs_review",
    "newly_discovered_entity",
  ];
  const index = order.findIndex((issue) => row.issues.includes(issue as any));
  return index === -1 ? 99 : index;
}

function sortRows(rows: LogoQaRow[], sort: string) {
  const copy = [...rows];
  if (sort === "issues")
    copy.sort(
      (a, b) =>
        actionPriority(a) - actionPriority(b) ||
        b.issues.length - a.issues.length ||
        a.logo.name.localeCompare(b.logo.name),
    );
  else if (sort === "status")
    copy.sort(
      (a, b) =>
        a.logo.status.localeCompare(b.logo.status) ||
        a.logo.name.localeCompare(b.logo.name),
    );
  else if (sort === "category")
    copy.sort(
      (a, b) =>
        a.logo.category.localeCompare(b.logo.category) ||
        a.logo.name.localeCompare(b.logo.name),
    );
  else if (sort === "fetch")
    copy.sort(
      (a, b) =>
        String(b.logo.last_fetch_at ?? "").localeCompare(
          String(a.logo.last_fetch_at ?? ""),
        ) || a.logo.name.localeCompare(b.logo.name),
    );
  else copy.sort((a, b) => a.logo.name.localeCompare(b.logo.name));
  return copy;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") next.set(key, String(value));
  });
  return `?${next.toString()}`;
}

function detailFromText(item: string): DetailEntry {
  const raw = item.trim();
  const slug = raw
    .split(/[\s:—,()]+/)
    .find(Boolean)
    ?.toLowerCase();
  return { label: raw, slug: slug || null, title: raw };
}

function DetailList({
  entries,
  empty = "No details available",
}: {
  entries: DetailEntry[];
  empty?: string;
}) {
  const first = entries.slice(0, 20);
  if (!entries.length)
    return (
      <div className="mt-1 rounded-lg bg-white p-2 text-slate-400">{empty}</div>
    );
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-slate-500">
        Show first {Math.min(20, entries.length)}
        {entries.length > 20 ? ` of ${entries.length}` : ""}
      </summary>
      <div className="mt-1 max-h-44 overflow-auto rounded-lg bg-white p-2">
        {first.map((entry) =>
          entry.slug ? (
            <Link
              key={`${entry.slug}-${entry.label}`}
              href={`/admin/logos/${encodeURIComponent(entry.slug)}`}
              className="mr-2 inline-block underline"
              title={entry.title}
            >
              {entry.label}
            </Link>
          ) : (
            <span
              key={entry.label}
              className="mr-2 inline-block"
              title={entry.title}
            >
              {entry.label}
            </span>
          ),
        )}
        {entries.length > first.length ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-slate-400">
              Show all
            </summary>
            {entries.slice(20).map((entry) =>
              entry.slug ? (
                <Link
                  key={`${entry.slug}-${entry.label}`}
                  href={`/admin/logos/${encodeURIComponent(entry.slug)}`}
                  className="mr-2 inline-block underline"
                  title={entry.title}
                >
                  {entry.label}
                </Link>
              ) : (
                <span
                  key={entry.label}
                  className="mr-2 inline-block"
                  title={entry.title}
                >
                  {entry.label}
                </span>
              ),
            )}
          </details>
        ) : null}
      </div>
    </details>
  );
}

function CompactRefreshSummary({
  summary,
  missingMappings,
}: {
  summary: BulkRefreshSummary;
  missingMappings?: DetailEntry[];
}) {
  const sections = [
    ["Errors", (summary.firstErrors ?? []).map(detailFromText)],
    [
      "Skipped reasons",
      (summary.firstSkippedReasons ?? []).map(detailFromText),
    ],
    ["Missing mappings", missingMappings ?? []],
    ["Auto-approved", (summary.autoApprovedList ?? []).map(detailFromText)],
    ["Candidates", (summary.candidateList ?? []).map(detailFromText)],
  ] as const;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-600">
      <div className="flex items-center justify-between gap-2">
        <div className="font-black text-slate-950">
          {summary.provider} refresh
        </div>
        <div className="text-slate-400">
          {new Date(summary.timestamp).toLocaleString()}
        </div>
      </div>
      <div className="mt-1">
        {summary.checked ?? 0} checked · {summary.idNeedsReview ?? 0} ID review
        · {summary.missingMappings ?? 0} missing · {summary.errors ?? 0} errors
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-slate-500">Details</summary>
        <div className="mt-2 grid gap-1">
          {sections.map(([label, entries]) =>
            entries.length ? (
              <details key={label}>
                <summary className="cursor-pointer">
                  {label} ({entries.length})
                </summary>
                <DetailList entries={entries} />
              </details>
            ) : null,
          )}
          {sections.every(([, entries]) => !entries.length) ? (
            <div className="text-slate-400">No details available</div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function summaryToneClass(errors: number, warnings: number) {
  if (errors > 0) return "border-red-100 bg-red-50 text-red-800";
  if (warnings > 0) return "border-amber-100 bg-amber-50 text-amber-800";
  return "border-emerald-100 bg-emerald-50 text-emerald-800";
}

function DiscoverySummary({ summary }: { summary: string }) {
  try {
    const data = JSON.parse(summary) as Record<string, unknown>;
    const checked = Number(data.checked ?? 0);
    const cg = Number(data.coingeckoFetched ?? data.cgFound ?? 0);
    const cmc = Number(data.cmcFetched ?? data.cmcFound ?? 0);
    const dfl = Number(data.defillamaFetched ?? data.defillamaFound ?? 0);
    const vault = Number(data.vaultCopiesCreated ?? data.vaultCopied ?? 0);
    const found = cg + cmc + dfl + vault;
    const cgMissing = Number(data.cgMissing ?? 0);
    const cmcMissing = Number(data.cmcMissing ?? 0);
    const dflNoReliable = Number(data.defillamaNoReliable ?? data.defillamaMissing ?? 0);
    const dflErrors = Number(data.defillamaErrors ?? 0);
    const vaultMissing = Number(data.vaultMissing ?? data.skippedMissingSource ?? 0);
    const vaultAlready = Number(data.vaultAlready ?? data.skippedAlreadyVaulted ?? 0);
    const needsReview = Number(data.needsReview ?? 0);
    const errors = Number(data.errors ?? 0);
    const detailEntries = [
      `selected: ${String(data.primarySelected ?? 0)}`,
      `already vaulted: ${String(data.skippedAlreadyVaulted ?? 0)}`,
      `missing source: ${String(data.skippedMissingSource ?? 0)}`,
      `protected admin sources: ${String(data.skippedProtectedAdminSources ?? 0)}`,
      `skipped rejected: ${String(data.skippedRejected ?? 0)}`,
      `checked: ${checked}`,
      `raw CG: ${cg}`,
      `raw CMC: ${cmc}`,
      `raw DefiLlama found: ${dfl}`,
      `DefiLlama no reliable source: ${dflNoReliable}`,
      `DefiLlama errors: ${dflErrors}`,
      `raw Vault copied: ${vault}`,
      `Vault missing: ${vaultMissing}`,
      `already vaulted: ${vaultAlready}`,
      ...(Array.isArray(data.candidateList) ? data.candidateList.map(String) : []),
    ].map(detailFromText);
    return (
      <div className={`rounded-2xl border p-3 text-xs font-bold ${summaryToneClass(errors, needsReview)}`}>
        <div className="text-sm font-black">Discovery complete</div>
        <div className="mt-1 text-slate-700">
          {checked} checked · {found} sources found · {needsReview} need review · {errors} errors
        </div>
        <div className="mt-2 rounded-xl bg-white p-2 text-slate-600">
          <div className="font-black text-slate-950">Provider coverage</div>
          <div>CG {cg} found · {cgMissing} missing</div>
          <div>CMC {cmc} found · {cmcMissing} missing</div>
          <div>DefiLlama {dfl} found · {dflNoReliable} no reliable source · {dflErrors} errors</div>
          <div>Vault {vault} copied · {vaultMissing} missing · {vaultAlready} already vaulted</div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-slate-500">Details</summary>
          <DetailList entries={detailEntries} />
        </details>
      </div>
    );
  } catch {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-700">
        Last discovery: {summary}
      </div>
    );
  }
}

function formatDefiLlamaDetailEntries(summary: Record<string, unknown>) {
  const rawDetails = Array.isArray(summary.details)
    ? (summary.details as Record<string, unknown>[])
    : [];
  return rawDetails.map((row) => {
    const candidate = (row.selectedCandidate ?? null) as
      | Record<string, unknown>
      | null;
    return {
      slug: String(row.slug ?? "-"),
      name: row.name ? String(row.name) : null,
      finalStatus: String(row.finalStatus ?? "-"),
      aliases: Array.isArray(row.aliasesTried) ? row.aliasesTried.map(String) : [],
      sourceUrl: candidate?.sourceUrl ? String(candidate.sourceUrl) : "-",
      imageUrl: candidate?.imageUrl ? String(candidate.imageUrl) : "-",
      sourceType: candidate?.sourceType ? String(candidate.sourceType) : "-",
      candidateLabel: candidate?.name
        ? `${String(candidate.name)} / ${String(candidate.slug ?? "-")}`
        : "-",
      validation:
        typeof row.validationResult === "string"
          ? row.validationResult
          : "-",
      rejectionReason: row.rejectionReason ? String(row.rejectionReason) : "-",
      canonicalResult: row.canonicalSimulation
        ? String(row.canonicalSimulation)
        : row.canonicalStateAfterSave
          ? String(row.canonicalStateAfterSave)
          : "-",
      vaultResult: row.vaultSimulation
        ? String(row.vaultSimulation)
        : row.vaultCopyResult
          ? String(row.vaultCopyResult)
          : "-",
    };
  });
}

function DefiLlamaDiscoveryCard({
  title,
  summary,
  emptyLabel,
  mode,
}: {
  title: string;
  summary: string | null;
  emptyLabel: string;
  mode: "discovery" | "dry-run" | "live";
}) {
  if (!summary)
    return (
      <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">
        {emptyLabel}: not run yet
      </div>
    );
  try {
    const data = JSON.parse(summary) as Record<string, unknown>;
    const checked = Number(data.checked ?? 0);
    const noReliable = Number(data.noReliable ?? data.defillamaNoReliable ?? 0);
    const errors = Number(data.errors ?? data.defillamaErrors ?? 0);
    const details = [
      ...(Array.isArray(data.candidateList) ? data.candidateList.map(String).filter((item) => item.includes("DefiLlama")) : []),
      ...(Array.isArray(data.firstErrors) ? data.firstErrors.map(String).filter((item) => item.includes("DefiLlama")) : []),
      ...(Array.isArray(data.firstSkippedReasons) ? data.firstSkippedReasons.map(String).filter((item) => item.includes("DefiLlama")) : []),
    ].map(detailFromText);
    const recoveryDetails = formatDefiLlamaDetailEntries(data);
    const headline =
      mode === "dry-run"
        ? `${checked} checked · ${Number(data.candidatesFound ?? 0)} candidatesFound · ${Number(data.saveable ?? 0)} saveable · ${Number(data.wouldSave ?? 0)} wouldSave · ${Number(data.rejectedCandidates ?? 0)} rejectedCandidates · ${Number(data.noCandidate ?? 0)} noCandidate · ${Number(data.noReliable ?? 0)} noReliable · ${Number(data.validationFailed ?? 0)} validationFailed · ${Number(data.canonicalWouldFail ?? 0)} canonicalWouldFail · ${Number(data.vaultWouldCopy ?? 0)} vaultWouldCopy · ${Number(data.vaultWouldFail ?? 0)} vaultWouldFail · ${errors} errors`
        : mode === "live"
          ? `${checked} checked · ${Number(data.sourceSaved ?? 0)} sourceSaved · ${Number(data.canonicalUpdated ?? 0)} canonicalUpdated · ${Number(data.vaultCopied ?? 0)} vaultCopied · ${Number(data.vaultCopyFailed ?? 0)} vaultCopyFailed · ${Number(data.noReliable ?? 0)} noReliable · ${errors} errors`
          : `${checked} checked · ${Number(data.defillamaFetched ?? data.defillamaFound ?? 0)} found · ${Number(data.defillamaNoReliable ?? data.defillamaMissing ?? 0)} no reliable · ${Number(data.defillamaMissing ?? data.defillamaNoReliable ?? 0)} missing · ${Number(data.defillamaErrors ?? 0)} errors`;
    return (
      <div className={`rounded-lg border p-2 text-xs font-bold ${summaryToneClass(errors, noReliable)}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="font-black">{title}</div>
          <div className="text-slate-400">{data.timestamp ? new Date(String(data.timestamp)).toLocaleString() : "latest"}</div>
        </div>
        <div className="mt-1">{headline}</div>
        {details.length ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-slate-500">Details</summary>
            <DetailList entries={details} empty="No DefiLlama details recorded" />
          </details>
        ) : null}
        {recoveryDetails.length ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-slate-500">
              Show all detail rows ({recoveryDetails.length})
            </summary>
            <div className="mt-1 grid gap-1">
              {recoveryDetails.slice(0, 300).map((row) => (
                <div
                  key={`${row.slug}-${row.finalStatus}`}
                  className="rounded border border-slate-100 bg-white p-1.5 text-[11px] text-slate-700"
                >
                  <div className="font-black">
                    {row.slug}
                    {row.name ? ` — ${row.name}` : ""} — {row.finalStatus}
                  </div>
                  <div>aliases: {row.aliases.length ? row.aliases.join(", ") : "-"}</div>
                  <div>candidate: {row.candidateLabel}</div>
                  <div>source: {row.sourceUrl}</div>
                  <div>image: {row.imageUrl}</div>
                  <div>sourceType: {row.sourceType}</div>
                  <div>validation: {row.validation}</div>
                  <div>reason: {row.rejectionReason}</div>
                  <div>canonical: {row.canonicalResult}</div>
                  <div>vault: {row.vaultResult}</div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    );
  } catch {
    return (
      <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">
        {emptyLabel}: not run yet
      </div>
    );
  }
}

function MetricScanSummary({
  scanSummary,
}: {
  scanSummary: NonNullable<ReturnType<typeof parseMetricLogoScanSummary>>;
}) {
  const groups = [
    [
      "Missing CoinGecko ID",
      scanSummary.details.filter(
        (d) => d.actionTaken === "missing_coingecko_id",
      ),
    ],
    [
      "Errors",
      scanSummary.details.filter(
        (d) => d.error || d.actionTaken === "coingecko_fetch_failed",
      ),
    ],
    [
      "Auto-approved",
      scanSummary.details.filter((d) => d.actionTaken === "auto_approved"),
    ],
    [
      "Candidates",
      scanSummary.details.filter(
        (d) =>
          d.actionTaken === "candidate_added" ||
          d.actionTaken === "auto_approve_skipped" ||
          d.actionTaken === "visual_rejected" ||
          d.actionTaken === "previous_rejection" ||
          d.actionTaken === "existing_admin_source",
      ),
    ],
    ["Newly discovered", scanSummary.details.filter((d) => !d.existedBefore)],
  ] as const;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="font-black">Metric scan</div>
        <div className="text-slate-400">
          {new Date(scanSummary.timestamp).toLocaleString()}
        </div>
      </div>
      <div className="mt-1">
        {scanSummary.rowsChecked} entities · {scanSummary.missingCoinGeckoIds}{" "}
        missing CG · {scanSummary.errors.length} error
        {scanSummary.errors.length === 1 ? "" : "s"}
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-slate-500">Details</summary>
        <div className="mt-2 grid gap-1">
          {groups.map(([label, details]) =>
            details.length ? (
              <details key={label}>
                <summary className="cursor-pointer">
                  {label} ({details.length})
                </summary>
                <DetailList
                  entries={details.map((detail) => ({
                    label: detail.name || detail.slug,
                    slug: detail.slug,
                    title: detail.reason || detail.error || detail.actionTaken,
                  }))}
                />
              </details>
            ) : null,
          )}
          {groups.every(([, details]) => !details.length) ? (
            <div className="text-slate-400">No details available</div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function SourceTools({
  summaries,
  scanSummary,
  discoverySummary,
  defillamaDiscoverySummary,
  dryRunRecoverySummary,
  liveRecoverySummary,
  missingMappingRows,
  cmcEnabled,
  blobEnabled,
}: {
  summaries: Awaited<ReturnType<typeof getBulkRefreshSummaries>>;
  scanSummary: ReturnType<typeof parseMetricLogoScanSummary>;
  discoverySummary: string | null;
  defillamaDiscoverySummary: string | null;
  dryRunRecoverySummary: string | null;
  liveRecoverySummary: string | null;
  missingMappingRows: LogoQaRow[];
  cmcEnabled: boolean;
  blobEnabled: boolean;
}) {
  const missingEntries = missingMappingRows.map((row) => ({
    label: `${row.logo.slug} — ${row.logo.name}`,
    slug: row.logo.slug,
  }));
  return (
    <AdminSection title="Source Tools" className="lg:sticky lg:top-4">
      <div className="grid gap-3 text-xs">
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Daily actions</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
            <form action={discoverLogoSourcesBulkAction}>
              <input type="hidden" name="mode" value="smart" />
              <button className="w-full rounded-full bg-slate-950 px-3 py-1.5 font-black text-white shadow-sm">
                Complete logo coverage
              </button>
            </form>
            <form action={backfillAliasEquivalentSourcesAction}>
              <button className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-slate-300">
                Backfill alias-equivalent sources
              </button>
            </form>
            <form action={bulkRefreshCoinGeckoLogosAction}>
              <input type="hidden" name="mode" value="retry-errors" />
              <button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700">
                Retry failed
              </button>
            </form>
            <form action={scanMetricLogosAction}>
              <button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700">
                Scan metric entities
              </button>
            </form>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Maintenance</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2">
            <form action={discoverLogoSourcesBulkAction}>
              <input type="hidden" name="mode" value="force" />
              <button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600">
                Force discover all
              </button>
            </form>
            <form action={applySafeCoinGeckoCandidatesAction}>
              <button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600">
                Apply safe CG
              </button>
            </form>
            <form action={discoverLogoSourcesBulkAction}>
              <input type="hidden" name="mode" value="vault" />
              <button
                disabled={!blobEnabled}
                className="w-full rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-black text-emerald-800 disabled:opacity-50"
              >
                Backup approved to vault
              </button>
            </form>
            <form action={importLegacyLocalLogosToVaultAction}>
              <button
                disabled={!blobEnabled}
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600 disabled:opacity-50"
              >
                Import legacy local logos to Vault
              </button>
            </form>
            <form action={discoverDefiLlamaV3SourcesAction}>
              <button className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600">
                Discover DefiLlama v3 sources
              </button>
            </form>
            <form action={recoverMissingDefiLlamaLogosAction}>
              <button className="w-full rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 font-black text-sky-700">
                Recover missing DefiLlama logos
              </button>
            </form>
            <form action={dryRunRecoverMissingDefiLlamaLogosAction}>
              <button className="w-full rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-black text-indigo-700">
                Dry run missing DefiLlama recovery
              </button>
            </form>
            <form action={hardResetDefiLlamaProviderAction} className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-2">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">Hard reset DefiLlama provider</p>
              <p className="mb-1 text-[11px] text-rose-700">Deletes all old DefiLlama source rows and rebuilds from v3 discovery.</p>
              <button className="w-full rounded-full border border-rose-300 bg-rose-600 px-3 py-1.5 font-black text-white">
                Hard reset DefiLlama provider
              </button>
            </form>
            <form action={hardResetAndRediscoverDefiLlamaV3Action} className="col-span-2 sm:col-span-3 lg:col-span-2">
              <button className="w-full rounded-full border border-rose-300 bg-rose-700 px-3 py-1.5 font-black text-white">
                Hard reset + rediscover DefiLlama v3
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {discoverySummary ? (
          <DiscoverySummary summary={discoverySummary} />
        ) : null}
        {scanSummary ? (
          <MetricScanSummary scanSummary={scanSummary} />
        ) : (
          <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">
            Metric scan: not run yet
          </div>
        )}
        {summaries.coingecko ? (
          <CompactRefreshSummary
            summary={summaries.coingecko}
            missingMappings={missingEntries}
          />
        ) : (
          <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">
            CoinGecko refresh: not run yet
          </div>
        )}
        {summaries.coinmarketcap ? (
          <CompactRefreshSummary summary={summaries.coinmarketcap} />
        ) : (
          <div className="rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-400">
            CoinMarketCap refresh: not run yet
          </div>
        )}
        <DefiLlamaDiscoveryCard title="DefiLlama dry-run recovery" summary={dryRunRecoverySummary} emptyLabel="DefiLlama dry-run recovery" mode="dry-run" />
        <DefiLlamaDiscoveryCard title="DefiLlama live recovery" summary={liveRecoverySummary} emptyLabel="DefiLlama live recovery" mode="live" />
        <DefiLlamaDiscoveryCard title="DefiLlama discovery" summary={defillamaDiscoverySummary ?? discoverySummary} emptyLabel="DefiLlama discovery" mode="discovery" />
      </div>
    </AdminSection>
  );
}

export default async function AdminLogosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdmin();
  const config = adminConfigState();
  const blob = blobStatus();
  const summaryResult = await safeAdminDbQuery(
    "Bulk refresh summaries",
    getBulkRefreshSummaries,
    { coingecko: null, coinmarketcap: null },
  );
  const scanResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "Metric logo discovery",
        async () =>
          parseMetricLogoScanSummary(
            await getSetting(METRIC_LOGO_SCAN_SETTING),
          ),
        null,
      )
    : { data: null, error: null };
  const discoveryResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "Logo source discovery",
        async () => await getSetting("last_logo_source_discovery_summary"),
        null,
      )
    : { data: null, error: null };
  const defillamaDryRunResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "DefiLlama dry-run recovery summary",
        async () => await getSetting("last_defillama_dry_run_recovery_summary"),
        null,
      )
    : { data: null, error: null };
  const defillamaLiveResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "DefiLlama live recovery summary",
        async () => await getSetting("last_defillama_live_recovery_summary"),
        null,
      )
    : { data: null, error: null };
  const defillamaDiscoveryResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "DefiLlama discovery summary",
        async () => await getSetting("last_defillama_discovery_summary"),
        null,
      )
    : { data: null, error: null };
  const logoResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "Logo records",
        async () => (await listLogos()).rows,
        [],
      )
    : { data: [], error: null };
  const sourceResult = config.hasDatabase
    ? await safeAdminDbQuery(
        "Logo sources",
        async () => (await getAllLogoSources()).rows,
        [],
      )
    : { data: [], error: null };
  const providersReady = {
    coinmarketcap: Boolean((await resolveApiSecret("coinmarketcap")).value),
  };
  const summaries = summaryResult.data;
  const scanSummary = scanResult.data;
  const logos = logoResult.data;
  const sourceRows = sourceResult.data;
  const dbErrors = [
    summaryResult.error,
    scanResult.error,
    discoveryResult.error,
    defillamaDryRunResult.error,
    defillamaLiveResult.error,
    defillamaDiscoveryResult.error,
    logoResult.error,
    sourceResult.error,
  ].filter(Boolean);
  const sourcesByLogo = new Map<string, typeof sourceRows>();
  for (const source of sourceRows)
    sourcesByLogo.set(source.logo_id, [
      ...(sourcesByLogo.get(source.logo_id) ?? []),
      source,
    ]);
  const qaRows = logos.map((logo) =>
    classifyLogoQa(logo, sourcesByLogo.get(logo.id) ?? [], config.hasBlob),
  );
  const counts = summarizeLogoQa(qaRows);
  const filter = firstParam(searchParams?.filter, "issues");
  const query = firstParam(searchParams?.q, "").trim();
  const sort = firstParam(searchParams?.sort, "issues");
  const candidateApplySummary = firstParam(searchParams?.candidateApply)
    ? `${firstParam(searchParams?.checkedCandidates, "0")} candidates checked · ${firstParam(searchParams?.autoApproved, "0")} auto-approved · ${firstParam(searchParams?.skipped, "0")} skipped`
    : "";
  const providerErrors =
    counts.coingecko_fetch_failed +
    counts.cmc_fetch_failed +
    counts.defillama_no_reliable_source +
    counts.coingecko_id_needs_review;
  const urgentRows = qaRows.filter((row) => row.issues.some((issue) => ["missing_approved_logo", "missing_coingecko_id", "missing_cmc_id", "missing_defillama_source", "coingecko_id_needs_review", "coingecko_fetch_failed", "cmc_fetch_failed", "defillama_no_reliable_source", "visual_rejected", "unsafe_migrated_candidate"].includes(issue)));
  const needsAction = urgentRows.length;
  const reviewLater = qaRows.filter((row) => row.issues.some((issue) => ["needs_review", "newly_discovered_entity", "coingecko_candidate_waiting", "metric_scan_candidate_added"].includes(issue)) && !urgentRows.includes(row)).length;
  const newlyDiscovered = qaRows.filter((row) => row.issues.includes("newly_discovered_entity")).length;
  const visualIssues = counts.visual_rejected + counts.unsafe_migrated_candidate;
  const coverageMetrics = [
    ["Needs action", needsAction],
    ["Missing logo", counts.missing_approved_logo],
    ["Missing CG", counts.missing_coingecko_id],
    ["Missing CMC", counts.missing_cmc_id],
    ["Missing DefiLlama", counts.missing_defillama_source],
  ];
  const reviewMetrics = [
    ["Needs review", counts.needs_review],
    ["Visual / unsafe", visualIssues],
    ["Newly discovered", newlyDiscovered],
    ["Provider review", providerErrors],
  ].filter(([, value]) => Number(value) > 0);
  const allMatchingRows = sortRows(qaRows, sort);
  const missingMappingRows = qaRows.filter((row) => !row.coinGeckoId);
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
    provider: row.primarySourceLabel,
    providerSummary: row.coverageSummary,
    issues: row.issues,
    searchText: [
      row.logo.name,
      row.logo.slug,
      row.logo.category,
      row.coinGeckoId,
      row.coinMarketCapId,
      row.logo.last_fetch_provider,
      row.logo.last_fetch_error,
      row.logo.notes,
      row.providerSummary,
      ...row.sources.flatMap((source) => [
        source.provider,
        source.image_url,
        source.source_url,
        source.status,
      ]),
      row.primarySourceLabel,
      row.coverageSummary,
      ...row.issues,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  return (
    <AdminShell
      active="logos"
      title="Logo Manager"
      subtitle="Single-screen source QA operations."
      max="max-w-[1500px]"
    >
      {!config.hasDatabase ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
          DATABASE_URL is missing. Logo persistence is disabled, but public card
          fallbacks remain available.
        </p>
      ) : null}
      {!config.hasBlob ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          {blob.message}
        </p>
      ) : null}
      {firstParam(searchParams?.message) ? (
        <p
          className={`mt-3 rounded-xl border p-3 text-xs font-bold ${firstParam(searchParams?.notice) === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {firstParam(searchParams?.message)}
        </p>
      ) : null}
      {candidateApplySummary ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          Apply safe CoinGecko candidates complete: {candidateApplySummary}
        </p>
      ) : null}
      <AdminDbErrorPanel errors={dbErrors} />

      <section className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black tracking-[-0.02em] text-slate-950">
                Logo Search + Results
              </h2>
              <p className="text-xs font-bold text-slate-400">
                Total logos: {counts.all} · Approved: {counts.approved} · Needs
                attention: {needsAction}{reviewLater ? ` · Review later: ${reviewLater}` : ""}
              </p>
            </div>
            <div className="mt-2 grid gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Coverage</span>
                {coverageMetrics.map(([label, value]) => (
                  <div key={label} className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1">
                    <span className="text-xs font-black text-slate-950">{value}</span>
                    <span className="ml-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">{label}</span>
                  </div>
                ))}
              </div>
              {reviewMetrics.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Review</span>
                  {reviewMetrics.map(([label, value]) => (
                    <div key={label} className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1">
                      <span className="text-xs font-black text-slate-950">{value}</span>
                      <span className="ml-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRIMARY_FILTERS.map(([key, label]) => (
                <Link
                  key={key}
                  href={qs({ filter: key, q: query, sort })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs font-black text-slate-500">
                More filters
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MORE_FILTERS.map(([key, label]) => (
                  <Link
                    key={key}
                    href={qs({ filter: key, q: query, sort })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${filter === key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          </div>

          <div className="border-b border-slate-100 p-2">
            <form className="flex flex-wrap gap-2">
              <input type="hidden" name="q" value={query} />
              <input type="hidden" name="filter" value={filter} />
              <select
                name="sort"
                defaultValue={sort}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="issues">Issues first</option>
                <option value="name">Name A-Z</option>
                <option value="fetch">Last fetch</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
              </select>
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
                Apply sort
              </button>
            </form>
            <details className="mt-2 inline-block rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <summary className="cursor-pointer text-xs font-black text-slate-950">
                + Add logo
              </summary>
              <form
                action={createLogoAction}
                className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-2 md:grid-cols-[180px_110px_auto]"
              >
                <input
                  name="name"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Name"
                  required
                />
                <select
                  name="category"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option>project</option>
                  <option>chain</option>
                  <option>asset</option>
                </select>
                <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  Create
                </button>
              </form>
            </details>
          </div>

          <LogoResultsClient
            rows={clientRows}
            initialQuery={query}
            defaultLimit={DEFAULT_LIMIT}
            activeFilter={filter}
          />
        </div>

        <SourceTools
          summaries={summaries}
          scanSummary={scanSummary}
          discoverySummary={discoveryResult.data}
          defillamaDiscoverySummary={defillamaDiscoveryResult.data}
          dryRunRecoverySummary={defillamaDryRunResult.data}
          liveRecoverySummary={defillamaLiveResult.data}
          missingMappingRows={missingMappingRows}
          cmcEnabled={Boolean(providersReady.coinmarketcap)}
          blobEnabled={config.hasBlob}
        />
      </section>
    </AdminShell>
  );
}
