"use client";

import { useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Mail, Sparkles } from "lucide-react";
import { PromptPanel } from "@/components/PromptPanel";
import { RevenueChart } from "@/components/RevenueChart";
import { RevenueTable } from "@/components/RevenueTable";
import { ShareCard } from "@/components/ShareCard";
import type { ChainRevenueRow } from "@/lib/defillama";

type ApiResult = {
  ok: boolean;
  rows?: ChainRevenueRow[];
  source?: string;
  updatedAt?: string;
  query?: { timeframe: string; limit: number };
  error?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("Top 10 chains by 30D revenue");
  const [rows, setRows] = useState<ChainRevenueRow[]>([]);
  const [source, setSource] = useState("DefiLlama");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [timeframe, setTimeframe] = useState("30D");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runQuery() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chain-revenue?prompt=${encodeURIComponent(prompt)}`);
      const json = (await res.json()) as ApiResult;
      if (!res.ok || !json.ok || !json.rows) throw new Error(json.error || "Failed to load data");
      setRows(json.rows);
      setSource(json.source || "DefiLlama");
      setUpdatedAt(json.updatedAt || "-");
      setTimeframe((json.query?.timeframe || "30d").toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCard() {
    const node = document.getElementById("share-card");
    if (!node) return;
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `chain-revenue-${timeframe.toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  }

  useEffect(() => { runQuery(); }, []);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            <Sparkles size={14} /> v0.1 demo
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-6xl">Prompt-to-visual Web3 intelligence</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            First data category: chain revenue. Type a simple request, generate a leaderboard, then export an X-ready branded visual.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-soft">
          <div className="font-bold text-slate-950">Planned monetization</div>
          <div className="mt-1 flex items-center gap-2"><Mail size={15} /> Free users: 1 scheduled report</div>
          <div className="mt-1">Paid users: more reports, alerts, custom templates.</div>
        </div>
      </header>

      <PromptPanel prompt={prompt} setPrompt={setPrompt} onRun={runQuery} loading={loading} />

      {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-6">
          <RevenueChart rows={rows} />
          <RevenueTable rows={rows} />
        </div>
        <div className="grid gap-4">
          <ShareCard rows={rows} timeframe={timeframe} updatedAt={updatedAt} source={source} />
          <button onClick={downloadCard} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
            <Download size={18} /> Download X-ready PNG
          </button>
        </div>
      </section>
    </main>
  );
}
