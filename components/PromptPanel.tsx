"use client";

type ActiveDataset = {
  id: string;
  name: string;
  examplePrompts: string[];
};

export function PromptPanel({
  prompt,
  setPrompt,
  onRun,
  loading,
  activeDataset,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  activeDataset: ActiveDataset;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-soft backdrop-blur md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Ask</label>
          <p className="mt-1 text-sm font-medium text-slate-500">Run a supported query to generate a share-ready learnDeFi card.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{activeDataset.name}</div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRun();
          }}
          className="min-h-16 flex-1 rounded-3xl border border-slate-200 bg-slate-50/60 px-5 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950 focus:bg-white"
          placeholder="Top 10 chains by 30D revenue"
        />
        <button
          onClick={onRun}
          disabled={loading}
          className="rounded-3xl bg-slate-950 px-7 py-4 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {activeDataset.examplePrompts.map((example) => (
          <button key={example} onClick={() => setPrompt(example)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400">
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
