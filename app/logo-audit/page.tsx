import { existsSync } from "node:fs";
import { join } from "node:path";
import { LogoAuditImage } from "@/components/LogoAuditImage";
import { logoManifest, type LogoRegistryEntry } from "@/lib/logos/logoRegistry";
import { requiredActiveLogoKeys } from "@/lib/logos/metricLogoRequirements";

const requiredKeys = new Set(requiredActiveLogoKeys);

type Filter = "all" | "required" | "missing" | "needs-review" | "rejected" | "source-type" | "projects" | "chains" | "assets";

function localFileExists(logo: LogoRegistryEntry) {
  return Boolean(logo.localPath && existsSync(join(process.cwd(), "public", logo.localPath.replace(/^\//, ""))));
}

function warningsFor(logo: LogoRegistryEntry) {
  const warnings = [];
  if (!logo.localPath) warnings.push("missing local asset");
  if (!localFileExists(logo)) warnings.push("file not found");
  if (logo.sourceType === "data-provider") warnings.push("data-provider provenance");
  if (logo.quality === "rejected") warnings.push("rejected");
  if (logo.quality !== "approved") warnings.push(logo.quality);
  if (/placeholder|initial|fallback|generated/i.test(`${logo.sourceNote ?? ""} ${logo.notes}`)) warnings.push("fallback/generated review");
  if (requiredKeys.has(`${logo.category}:${logo.slug}`) && logo.quality !== "approved") warnings.push("required active not approved");
  return Array.from(new Set(warnings));
}

function statusClass(warnings: string[]) {
  if (warnings.some((warning) => /missing|not found|required/.test(warning))) return "border-red-200 bg-red-50";
  if (warnings.length) return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-white";
}

function filterLogos(filter: Filter) {
  return logoManifest.filter((logo) => {
    const warnings = warningsFor(logo);
    if (filter === "required") return requiredKeys.has(`${logo.category}:${logo.slug}`);
    if (filter === "missing") return warnings.some((warning) => /missing|not found/.test(warning));
    if (filter === "needs-review") return warnings.length > 0 && logo.quality !== "rejected";
    if (filter === "rejected") return logo.quality === "rejected";
    if (filter === "source-type") return true;
    if (filter === "projects") return logo.category === "project";
    if (filter === "chains") return logo.category === "chain";
    if (filter === "assets") return logo.category === "asset";
    return true;
  });
}

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "required", label: "Required active" },
  { id: "missing", label: "Missing" },
  { id: "needs-review", label: "Needs review" },
  { id: "rejected", label: "Rejected" },
  { id: "source-type", label: "Source type" },
  { id: "projects", label: "Projects" },
  { id: "chains", label: "Chains" },
  { id: "assets", label: "Assets" },
];

export default function LogoAuditPage({ searchParams }: { searchParams?: { filter?: Filter } }) {
  const activeFilter = filters.some((filter) => filter.id === searchParams?.filter) ? searchParams?.filter ?? "all" : "all";
  const visibleLogos = filterLogos(activeFilter).sort((a, b) => Number(requiredKeys.has(`${b.category}:${b.slug}`)) - Number(requiredKeys.has(`${a.category}:${a.slug}`)) || a.category.localeCompare(b.category) || a.canonicalName.localeCompare(b.canonicalName));
  const allWarnings = logoManifest.flatMap((logo) => warningsFor(logo));
  const missingLocalCount = logoManifest.filter((logo) => !localFileExists(logo)).length;
  const needsReviewCount = logoManifest.filter((logo) => warningsFor(logo).length > 0).length;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi QA</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-6xl">Logo audit</h1>
        <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-500">
          Internal logo audit for card quality. Required active entities must use approved local logos.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{logoManifest.length} registered</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">{requiredKeys.size} required active</span>
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">{missingLocalCount} missing files</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">{needsReviewCount} needs review</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">{allWarnings.length} warnings</span>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2 text-xs font-black">
          {filters.map((filter) => (
            <a
              key={filter.id}
              href={`/logo-audit?filter=${filter.id}`}
              className={`rounded-full border px-3 py-2 ${activeFilter === filter.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {filter.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="mt-6 grid gap-4">
        {visibleLogos.map((logo) => {
          const warnings = warningsFor(logo);
          const required = requiredKeys.has(`${logo.category}:${logo.slug}`);
          return (
            <article key={`${logo.category}-${logo.slug}`} className={`rounded-[28px] border p-4 shadow-soft ${statusClass(warnings)} ${required ? "ring-1 ring-slate-950/10" : ""}`}>
              <div className="grid gap-4 lg:grid-cols-[270px_1fr_280px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-black tracking-[-0.03em] text-slate-950">{logo.canonicalName}</div>
                    {required && <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">required active</span>}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{logo.category} · {logo.slug}</div>
                  <div className="mt-2 break-all text-[11px] font-semibold text-slate-500">{logo.localPath ?? "No local path"}</div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">aliases: {logo.aliases.join(", ")}</div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/80 p-3">
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={24} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={48} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                  <div className="flex min-w-[260px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">{logo.canonicalName}</div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 w-2/3 rounded-full bg-slate-950" /></div>
                    </div>
                    <div className="text-xs font-black text-slate-500">$1.2B</div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3">
                    <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} fit={logo.fit} scale={logo.scale} padding={logo.padding} />
                  </div>
                </div>

                <div className="grid gap-2 text-xs font-black">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">source: {logo.sourceType}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">quality: {logo.quality}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">fit/scale/padding: {logo.fit} · {logo.scale} · {logo.padding}</span>
                  <span className="break-all rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500">source: {logo.sourceUrl ?? logo.sourceNote}</span>
                  <span className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500">rights: {logo.rightsNote}</span>
                  {warnings.length > 0 && <span className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">warnings: {warnings.join(", ")}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
