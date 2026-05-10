import { LogoAuditImage } from "@/components/LogoAuditImage";
import { logoManifest } from "@/lib/logoRegistry";

function statusClass(status: string) {
  if (status === "placeholder") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "external-only" || status === "fallback") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-white text-slate-700";
}

export default function LogoAuditPage() {
  const placeholderCount = logoManifest.filter((logo) => logo.qualityStatus === "placeholder").length;
  const missingLocalCount = logoManifest.filter((logo) => !logo.localPath).length;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 md:px-8">
      <header className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">learnDeFi QA</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-6xl">Logo audit</h1>
        <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-500">Internal logo audit for learnDeFi card quality.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">{logoManifest.length} registered</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">{missingLocalCount} missing local</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">{placeholderCount} placeholders</span>
        </div>
      </header>

      <section className="mt-6 grid gap-4">
        {logoManifest.map((logo) => {
          const fallbackStatus = !logo.localPath ? "missing local" : logo.qualityStatus === "placeholder" ? "placeholder" : "local";
          return (
            <article key={`${logo.category}-${logo.slug}`} className={`rounded-[28px] border p-4 shadow-soft ${statusClass(logo.qualityStatus)}`}>
              <div className="grid gap-4 lg:grid-cols-[260px_1fr_220px] lg:items-center">
                <div>
                  <div className="text-lg font-black tracking-[-0.03em] text-slate-950">{logo.canonicalName}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{logo.category} · {logo.slug}</div>
                  <div className="mt-2 break-all text-[11px] font-semibold text-slate-500">{logo.localPath ?? "No local path"}</div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/80 p-3">
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={24} />
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} />
                  <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={48} />
                  <div className="flex min-w-[260px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-slate-950">{logo.canonicalName}</div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 w-2/3 rounded-full bg-slate-950" /></div>
                    </div>
                    <div className="text-xs font-black text-slate-500">$1.2B</div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-3">
                    <LogoAuditImage src={logo.localPath} name={logo.canonicalName} size={32} />
                  </div>
                </div>

                <div className="grid gap-2 text-xs font-black">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">source: {logo.sourceType}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">quality: {logo.qualityStatus}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">fallback: {fallbackStatus}</span>
                  {logo.notes && <span className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500">{logo.notes}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
