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
          <p className="mt-1 text-sm font-medium text-slate-500">Choose a category, then run a ready-made query.</p>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">v0.2</div>
      </div>

      <div className="mt-5 grid gap-3">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="font-black text-slate-950">{group.name}</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>

            <div className="mt-3 grid gap-2">
              {group.queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => query.status === "active" && onSelectPrompt(query.prompt)}
                  disabled={query.status !== "active"}
                  className={query.status === "active" ? "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-950" : "flex cursor-not-allowed items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 text-left opacity-60"}
                >
                  <span>
                    <span className="block text-sm font-black text-slate-950">{query.label}</span>
                    <span className="mt-0.5 block text-[11px] font-bold text-slate-400">Source: {query.source}</span>
                  </span>
                  <span className={query.status === "active" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-400"}>
                    {query.status === "active" ? "Active" : "Soon"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
