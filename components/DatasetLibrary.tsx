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
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">v0.5</div>
      </div>

      <div className="mt-5 grid gap-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-2xl font-black tracking-[-0.05em] text-slate-950">{group.name}</div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{group.metrics.length} metrics</div>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{group.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {group.metrics.map((metric) => {
                const defaultQuery = metric.queries[0];
                const active = metric.status === "active" && !!defaultQuery;
                return (
                  <button
                    key={metric.id}
                    onClick={() => active && onSelectPrompt(defaultQuery.prompt)}
                    disabled={!active}
                    className={active ? "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:border-slate-950 hover:bg-slate-50" : "cursor-not-allowed rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-black text-slate-400 opacity-70"}
                  >
                    {metric.label}{metric.status !== "active" ? " soon" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
