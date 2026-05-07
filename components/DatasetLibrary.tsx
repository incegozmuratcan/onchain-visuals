"use client";

import type { DatasetDefinition } from "@/lib/datasets";

export function DatasetLibrary({
  datasets,
  onSelectPrompt,
}: {
  datasets: DatasetDefinition[];
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Dataset library</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Supported metrics we can turn into visuals.</p>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">v0.2</div>
      </div>

      <div className="mt-5 grid gap-3">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-slate-950">{dataset.name}</div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{dataset.description}</p>
              </div>
              <span className={dataset.status === "active" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700" : "rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-400"}>
                {dataset.status === "active" ? "Active" : "Soon"}
              </span>
            </div>
            <div className="mt-3 text-xs font-bold text-slate-400">Source: {dataset.source}</div>
            {dataset.status === "active" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {dataset.examplePrompts.map((prompt) => (
                  <button key={prompt} onClick={() => onSelectPrompt(prompt)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-950 hover:text-slate-950">
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
