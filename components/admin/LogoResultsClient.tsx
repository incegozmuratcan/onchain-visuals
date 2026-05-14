"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminStatusPill } from "@/components/admin/AdminPrimitives";

export type LogoResultRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  approvedLogoUrl?: string | null;
  fallbackLogoUrl?: string | null;
  coinGeckoId?: string | null;
  coinMarketCapId?: string | null;
  provider?: string | null;
  providerSummary?: string | null;
  issues: string[];
  searchText: string;
};

const PAGE_SIZE = 10;
const ACTION_ISSUES = new Set([
  "needs_review", "missing_approved_logo", "missing_coingecko_id", "coingecko_id_needs_review", "coingecko_fetch_failed", "cmc_fetch_failed", "fallback_used", "visual_rejected", "newly_discovered_entity", "metric_scan_error", "coingecko_candidate_waiting", "metric_scan_missing_coingecko_id", "metric_scan_candidate_added", "auto_approve_skipped", "db_overlay_not_applied", "rejected_source",
]);

function safeUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/") ? text : null;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.startsWith("approved") ? "green" : status === "rejected" ? "red" : "amber";
  return <AdminStatusPill tone={tone}>{status.replace("_", " ")}</AdminStatusPill>;
}

function IssueDot({ issue }: { issue: string }) {
  const tone = issue === "visual_rejected" || issue.includes("failed") ? "red" : issue.includes("missing") || issue.includes("review") || issue.includes("fallback") ? "amber" : "gray";
  return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-400" : "bg-slate-300"}`} />{issue.replaceAll("_", " ")}</span>;
}

function LogoRow({ row }: { row: LogoResultRow }) {
  const preview = safeUrl(row.approvedLogoUrl) || safeUrl(row.fallbackLogoUrl);
  const displayIssue = row.issues.find((issue) => ACTION_ISSUES.has(issue));
  const provider = row.provider || row.providerSummary || "—";
  return <Link href={`/admin/logos/${encodeURIComponent(row.slug)}`} className="grid min-h-[50px] gap-2 border-b border-slate-100 px-2 py-1.5 transition hover:bg-slate-50 md:grid-cols-[minmax(190px,1.25fr)_74px_92px_132px_112px] md:items-center">
    <div className="flex min-w-0 items-center gap-2">{preview ? <img src={preview} alt="" className="h-7 w-7 rounded-full border border-slate-200 bg-white object-contain" /> : <div className="h-7 w-7 rounded-full bg-slate-100" />}<div className="min-w-0"><div className="truncate text-sm font-black text-slate-950">{row.name}</div><div className="truncate text-[11px] font-bold text-slate-400">{row.slug}</div></div></div>
    <div className="truncate text-xs font-black text-slate-600">{row.category}</div>
    <StatusBadge status={row.status || "unknown"} />
    <div className="min-w-0 text-[11px] font-bold leading-4 text-slate-500"><div className="truncate" title={provider}>{provider}</div><div>CG {row.coinGeckoId ? "OK" : "missing"} · CMC {row.coinMarketCapId ? "OK" : "missing"}</div></div>
    <div className="min-w-0">{displayIssue ? <IssueDot issue={displayIssue} /> : <span className="text-[10px] font-black uppercase tracking-[0.08em] text-emerald-600">healthy</span>}</div>
  </Link>;
}

export function LogoResultsClient({ rows, initialQuery = "", defaultLimit = PAGE_SIZE }: { rows: LogoResultRow[]; initialQuery?: string; defaultLimit?: number }) {
  const [query, setQuery] = useState(initialQuery);
  const [limit, setLimit] = useState(defaultLimit);
  const normalized = query.trim().toLowerCase();
  const filteredRows = useMemo(() => normalized ? rows.filter((row) => row.searchText.includes(normalized)) : rows, [rows, normalized]);
  const visibleRows = filteredRows.slice(0, normalized ? Math.max(limit, 20) : limit);
  return <div>
    <div className="border-b border-slate-100 p-2">
      <input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(defaultLimit); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400" placeholder="Type to filter name, slug, category, CG/CMC ID, provider, source, issue" />
      <div className="mt-1 text-[11px] font-bold text-slate-400">{filteredRows.length} match{filteredRows.length === 1 ? "" : "es"} · live filter</div>
    </div>
    <div className="hidden grid-cols-[minmax(190px,1.25fr)_74px_92px_132px_112px] gap-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 md:grid"><div>Logo</div><div>Category</div><div>Status</div><div>Source</div><div>Issue</div></div>
    {visibleRows.map((row) => <LogoRow key={row.id} row={row} />)}
    {!visibleRows.length ? <div className="p-8 text-center text-sm font-bold text-slate-500">No logos match this search/filter.</div> : null}
    {filteredRows.length > visibleRows.length ? <div className="p-2 text-center"><button type="button" onClick={() => setLimit((current) => current + PAGE_SIZE)} className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">Show more ({filteredRows.length - visibleRows.length} remaining)</button></div> : null}
  </div>;
}
