"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Bell, Download, Sparkles } from "lucide-react";
import { DatasetLibrary } from "@/components/DatasetLibrary";
import { PromptPanel } from "@/components/PromptPanel";
import { RevenueChart } from "@/components/RevenueChart";
import { RevenueTable } from "@/components/RevenueTable";
import { ShareCard } from "@/components/ShareCard";
import { datasets, activeDatasets } from "@/lib/datasets";
import type { ChainRevenueRow } from "@/lib/defillama";

type ApiResult = {
  ok: boolean;
  rows?: ChainRevenueRow[];
  source?: string;
  updatedAt?: string;
  query?: { timeframe: string; limit: number };
  error?: string;
};

const activeDataset = activeDatasets[0];

export default function Home() {
  const [prompt, setPrompt] = useState("Top 10 chains by 30D revenue");
  const [rows, setRows] = useState<ChainRevenueRow[]>([]);
  const [source, setSource] = useState("DefiLlama Revenue by Chain");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [timeframe, setTimeframe] = useState("30D");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function runQuery() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chain-revenue?prompt=${encodeURIComponent(prompt)}`);
      const json = (await res.json()) as ApiResult;

      if (!res.ok || !json.ok || !json.rows) {
        throw new Error(json.error || "Failed to load data");
      }

      setRows(json.rows);
      setSource(json.source || "DefiLlama Revenue by Chain");
      setUpdatedAt(json.updatedAt || "-");
      setTimeframe((json.query?.timeframe || "30d").toUpperCase());
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCard() {
    const node = document.getElementById("share-card");
    if (!node) return;

    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });

    const link = document.createElement("a");
    link.download = `learndefi-chain-revenue-${timeframe.toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  }

  function selectPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mx-auto mb-8 max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
          <Sparkles size={14} /> learnDeFi v0.2
        </div>

        <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl">
          Ask DeFi data. Get X-ready visuals.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 md:text-lg">
          learnDeFi turns trusted DeFi datasets into clean visual intelligence. Start with chain revenue, then export a branded chart card.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <PromptPanel prompt={prompt} setPrompt={setPrompt} onRun={runQuery} loading={loading} activeDataset={activeDataset} />

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 shadow-soft md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex items-center gap-2 font-black text-slate-950"><Bell size={16} /> Scheduled reports</div>
            <div className="mt-2 md:mt-0">Free users will get 1 saved report. Paid users get more reports, alerts and templates.</div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {!hasGenerated && !loading && (
            <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><Sparkles size={20} /></div>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">Your visual will appear here</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">Run a supported query to generate a chart, table and share-ready learnDeFi card.</p>
            </div>
          )}

          {hasGenerated && (
            <div className="grid gap-6">
              <RevenueChart rows={rows} />
              <RevenueTable rows={rows} />
            </div>
          )}
        </div>

        <DatasetLibrary datasets={datasets} onSelectPrompt={selectPrompt} />
      </section>

      {hasGenerated && (
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <ShareCard rows={rows} timeframe={timeframe} updatedAt={updatedAt} source={source} />
          <div className="grid content-start gap-3">
            <button onClick={downloadCard} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
              <Download size={18} /> Download X-ready PNG
            </button>
            <button disabled className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-400">Save this report — coming soon</button>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold leading-6 text-slate-500 shadow-soft">
              Methodology: Chain revenue only. Protocol and dApp revenue are excluded. Source attribution is kept on every export.
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
