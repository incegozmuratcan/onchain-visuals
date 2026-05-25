import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LogoAuditImage } from "@/components/LogoAuditImage";
import { logoManifest, type LogoRegistryEntry } from "@/lib/logos/logoRegistry";
import { logoSourceManifest, unresolvedLogoSources } from "@/lib/logos/logoSourceManifest";
import { requiredActiveLogoKeys } from "@/lib/logos/metricLogoRequirements";

const requiredKeys = new Set(requiredActiveLogoKeys);
const sourceByKey = new Map(logoSourceManifest.map((source) => [`${source.category}:${source.slug}`, source]));
const unresolvedByKey = new Map(unresolvedLogoSources.map((source) => [`${source.category}:${source.slug}`, source]));
const sourceProviderCounts = logoSourceManifest.reduce<Record<string, number>>((counts, source) => {
  counts[source.sourceProvider] = (counts[source.sourceProvider] ?? 0) + 1;
  return counts;
}, { coingecko: 0 });

type Filter = "all" | "required" | "missing" | "needs-review" | "checksum" | "fallback" | "projects" | "chains" | "assets" | "source-provider";

function fsPath(localPath?: string) {
  return localPath ? join(process.cwd(), "public", localPath.replace(/^\//, "")) : null;
}

function fileExists(localPath?: string) {
  const path = fsPath(localPath);
  return Boolean(path && existsSync(path));
}

function checksum(localPath?: string) {
  const path = fsPath(localPath);
  if (!path || !existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function textBadgeLike(localPath?: string) {
  const path = fsPath(localPath);
  if (!path || !existsSync(path) || !/\.svg$/i.test(localPath ?? "")) return false;
  const source = readFileSync(path, "utf8");
  return /<text\b|Arial Black|Inter, Arial|dominant-baseline=["']middle|stroke=["']rgba\(15,23,42,.10\)["']|role=["']img["'] aria-label=/i.test(source);
}

function warningsFor(logo: LogoRegistryEntry) {
  const key = `${logo.category}:${logo.slug}`;
  const source = sourceByKey.get(key);
  const warnings: string[] = [];
  const actualChecksum = checksum(source?.localPath ?? logo.localPath);
  if (!source) warnings.push("source manifest missing");
  if (requiredKeys.has(key) && !source) warnings.push("required unresolved");
  if (!logo.localPath) warnings.push("registry localPath missing");
  if (!fileExists(logo.localPath)) warnings.push("registry file missing");
  if (source?.localPath && !fileExists(source.localPath)) warnings.push("source file missing");
  if (source && source.localPath !== logo.localPath) warnings.push("localPath mismatch");
  if (source && source.approvalStatus !== "approved") warnings.push(source.approvalStatus);
  if (logo.visualRejected || source?.visualRejected) warnings.push("visual rejected");
  if (logo.fallbackPreferredUntilManualAsset || source?.fallbackPreferredUntilManualAsset) warnings.push("fallback used");
  if (source?.sha256 && actualChecksum && source.sha256 !== actualChecksum) warnings.push("checksum mismatch");
  if (/placeholder|initial|fallback|generated/i.test(`${logo.sourceType} ${logo.sourceNote ?? ""} ${logo.notes}`)) warnings.push("fallback/generated metadata");
  if (textBadgeLike(source?.localPath ?? logo.localPath)) warnings.push("text-badge-like SVG");
  if (unresolvedByKey.has(key)) warnings.push("unresolved candidates");
  return Array.from(new Set(warnings));
}

function statusClass(warnings: string[]) {
  if (warnings.some((warning) => /missing|unresolved|checksum|required/.test(warning))) return "border-red-200 bg-red-50";
  if (warnings.length) return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-white";
}

function filterLogos(filter: Filter) {
  return logoManifest.filter((logo) => {
    const key = `${logo.category}:${logo.slug}`;
    const warnings = warningsFor(logo);
    const source = sourceByKey.get(key);
    if (filter === "required") return requiredKeys.has(key);
    if (filter === "missing") return warnings.some((warning) => /missing|unresolved/.test(warning));
    if (filter === "needs-review") return warnings.length > 0 || source?.approvalStatus === "needs-review";
    if (filter === "checksum") return warnings.includes("checksum mismatch");
    if (filter === "fallback") return warnings.some((warning) => /fallback|generated|text-badge|visual rejected/.test(warning));
    if (filter === "projects") return logo.category === "project";
    if (filter === "chains") return logo.category === "chain";
    if (filter === "assets") return logo.category === "asset";
    if (filter === "source-provider") return true;
    return true;
  });
}

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "required", label: "Required active" },
  { id: "missing", label: "Missing" },
  { id: "needs-review", label: "Needs review" },
  { id: "checksum", label: "Checksum mismatch" },
  { id: "fallback", label: "Fallback used" },
  { id: "chains", label: "Chains" },
  { id: "projects", label: "Projects" },
  { id: "assets", label: "Assets" },
  { id: "source-provider", label: "Source provider" },
];

export default function LogoAuditPage({ searchParams }: { searchParams?: { filter?: Filter } }) {
  const activeFilter = filters.some((filter) => filter.id === searchParams?.filter) ? searchParams?.filter ?? "all" : "all";
  const visibleLogos = filterLogos(activeFilter).sort((a, b) => Number(requiredKeys.has(`${b.category}:${b.slug}`)) - Number(requiredKeys.has(`${a.category}:${a.slug}`)) || a.category.localeCompare(b.category) || a.canonicalName.localeCompare(b.canonicalName));
  const missingCount = logoManifest.filter((logo) => warningsFor(logo).some((warning) => /missing|unresolved/.test(warning))).length;
  const checksumCount = logoManifest.filter((logo) => warningsFor(logo).includes("checksum mismatch")).length;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Onchain Visuals QA</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-6xl">Logo audit</h1>
        <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-500">
          Source-backed local logo vault review. Required active entities must have matching registry config, source manifest provenance and checksum-verified local files.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{logoManifest.length} registered</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">{logoSourceManifest.length} source-backed</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">{requiredKeys.size} required active</span>
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">{missingCount} missing/unresolved</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">{checksumCount} checksum mismatch</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">coingecko sourceProvider: {sourceProviderCounts.coingecko ?? 0}</span>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2 text-xs font-black">
          {filters.map((filter) => (
            <a key={filter.id} href={`/logo-audit?filter=${filter.id}`} className={`rounded-full border px-3 py-2 ${activeFilter === filter.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
              {filter.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="mt-6 grid gap-4">
        {visibleLogos.map((logo) => {
          const key = `${logo.category}:${logo.slug}`;
          const source = sourceByKey.get(key);
          const unresolved = unresolvedByKey.get(key);
          const warnings = warningsFor(logo);
          const shortSha = source?.sha256 ? source.sha256.slice(0, 12) : "—";
          const provider = source?.sourceProvider ?? "—";
          const renderedSrc = logo.fallbackPreferredUntilManualAsset || source?.fallbackPreferredUntilManualAsset || !source ? logo.localPath : source.localPath;
          const candidates = [
            ...(source?.sourceUrl ? [{ provider: source.sourceProvider, url: source.sourceUrl, status: source.visualRejected ? "visually rejected" : source.approvalStatus, note: source.sourceNote }] : []),
            ...(logo.rejectedProvidersForCard ?? []).map((rejected) => ({ provider: rejected.provider, url: rejected.sourceUrl, status: "rejected for card", note: rejected.reason })),
            ...(unresolved?.attemptedCandidates ?? []),
          ];
          return (
            <article key={key} className={`rounded-[28px] border p-5 shadow-sm ${statusClass(warnings)}`}>
              <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{logo.category} · {logo.slug}</p>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{logo.canonicalName}</h2>
                    </div>
                    {requiredKeys.has(key) && <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">required</span>}
                  </div>
                  <p className="mt-3 break-all text-[11px] font-semibold text-slate-500">local: {logo.localPath ?? "—"}</p>
                  <p className="mt-1 break-all text-[11px] font-semibold text-slate-500">source: {source?.sourceUrl ?? source?.sourceNote ?? "—"}</p>
                  <p className="mt-1 text-[11px] font-black text-slate-500">provider: {provider} · status: {source?.approvalStatus ?? "missing"} · sha: {shortSha}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">downloaded: {source?.downloadedAt ?? "—"} · size: {source?.width ?? "?"}×{source?.height ?? "?"}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">fit: {logo.fit} · scale: {logo.scale} · padding: {logo.padding} · quality: {logo.quality}</p>
                  <p className="mt-1 text-[11px] font-black text-slate-500">approved source-backed: {source?.approvalStatus === "approved" ? "yes" : "no"} · visually accepted: {logo.visualRejected || source?.visualRejected ? "no" : source?.approvalStatus === "approved" ? "yes" : "no"} · fallback used: {logo.fallbackPreferredUntilManualAsset || source?.fallbackPreferredUntilManualAsset || !source ? "yes" : "no"}</p>
                  {(logo.visualRejectReason || source?.visualRejectReason) && <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-900">visual override: {logo.visualRejectReason ?? source?.visualRejectReason}</p>}
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">aliases: {logo.aliases.join(", ") || "—"}</p>
                </div>

                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <LogoAuditImage src={renderedSrc} name={logo.canonicalName} size={24} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                    <LogoAuditImage src={renderedSrc} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                    <LogoAuditImage src={renderedSrc} name={logo.canonicalName} size={48} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                    <div className="flex min-w-[220px] items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <LogoAuditImage src={renderedSrc} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                      <span className="font-black text-slate-950">ShareCard row preview</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-3 text-white">
                      <LogoAuditImage src={renderedSrc} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                      <span className="font-black">Dark surface</span>
                    </div>
                  </div>
                  {warnings.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">warnings: {warnings.join(", ")}</div>}
                  <details className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs font-semibold text-slate-600">
                    <summary className="cursor-pointer font-black text-slate-950">Source candidates</summary>
                    <div className="mt-2 grid gap-1 break-all">
                      {candidates.length ? candidates.map((candidate) => (
                        <a key={`${candidate.provider}:${candidate.url}:${candidate.status}`} href={candidate.url} className="text-slate-600 underline decoration-slate-300 underline-offset-2">{candidate.provider}: {candidate.url} · {candidate.status}{candidate.note ? ` · ${candidate.note}` : ""}</a>
                      )) : <span>No candidates recorded.</span>}
                    </div>
                  </details>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
