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
    <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-soft md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ask learnDeFi</label>
          <p className="mt-1 text-sm font-medium text-slate-500">Type a supported query or start from the data library.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{activeDataset.name}</div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRun();
          }}
          className="min-h-14 flex-1 rounded-2xl border border-slate-200 px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950"
          placeholder="Top 10 chains by 30D revenue"
        />
        <button
          onClick={onRun}
          disabled={loading}
          className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Generate visual"}
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
