"use client";

export function PromptPanel({ prompt, setPrompt, onRun, loading }: { prompt: string; setPrompt: (v: string) => void; onRun: () => void; loading: boolean }) {
  const examples = ["Top 10 chains by 30D revenue", "Top 15 chains by 7D revenue", "Top 20 chains by 24H revenue"];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Ask Web3 data</label>
      <div className="mt-3 flex flex-col gap-3 md:flex-row">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") onRun(); }}
          className="min-h-12 flex-1 rounded-2xl border border-slate-200 px-4 text-base outline-none transition focus:border-slate-900"
          placeholder="Top 10 chains by 30D revenue"
        />
        <button
          onClick={onRun}
          disabled={loading}
          className="rounded-2xl bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button key={example} onClick={() => setPrompt(example)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400">
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
