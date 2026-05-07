"use client";

import type { DatasetGroup } from "@/lib/datasets";

export function DatasetLibrary({
  groups,
  onSelectPrompt,
}: {
  groups: DatasetGroup[];
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Data library</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Pick a metric.</p>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">v0.4</div>
      </div>

      <div className="mt-5 grid gap-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-black text-slate-950">{group.name}</div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{group.metrics.length} metrics</div>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{group.description}</p>

            <div className="mt-4 grid gap-3">
              {group.metrics.map((metric) => (
                <div key={metric.id} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-950">{metric.label}</span>
                    <span className={metric.status === "active" ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700" : "rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-400"}>
                      {metric.status === "active" ? "Active" : "Soon"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {metric.queries.map((query) => (
                      <button
                        key={query.id}
                        onClick={() => query.status === "active" && onSelectPrompt(query.prompt)}
                        disabled={query.status !== "active"}
                        title={`${query.label} · Source: ${query.source}`}
                        className={query.status === "active" ? "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950" : "cursor-not-allowed rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-xs font-black text-slate-400"}
                      >
                        {query.chip}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
