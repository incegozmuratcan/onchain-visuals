"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Bell, Download } from "lucide-react";
import { DatasetLibrary } from "@/components/DatasetLibrary";
import { PromptPanel } from "@/components/PromptPanel";
import { ShareCard } from "@/components/ShareCard";
import { activeDataset, datasetGroups } from "@/lib/datasets";
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
        <h1 className="text-5xl font-black tracking-[-0.07em] text-slate-950 md:text-8xl">
          learnDeFi
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-600 md:text-lg">
          Ask supported DeFi datasets and generate clean, share-ready visual cards.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
        <div className="grid gap-5">
          <PromptPanel prompt={prompt} setPrompt={setPrompt} onRun={runQuery} loading={loading} activeDataset={activeDataset} />

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 shadow-soft md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex items-center gap-2 font-black text-slate-950"><Bell size={16} /> Scheduled reports</div>
            <div className="mt-2 md:mt-0">Free users will get 1 saved report. Paid users get more reports, alerts and templates.</div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {hasGenerated && (
            <div className="grid gap-4">
              <ShareCard rows={rows} timeframe={timeframe} updatedAt={updatedAt} source={source} />
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <button onClick={downloadCard} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
                  <Download size={18} /> Download X-ready PNG
                </button>
                <button disabled className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-400">Save this report — coming soon</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold leading-6 text-slate-500 shadow-soft">
                Methodology: Chain revenue only. Protocol and app revenue are excluded. Source attribution is kept on every export.
              </div>
            </div>
          )}
        </div>

        <DatasetLibrary groups={datasetGroups} onSelectPrompt={selectPrompt} />
      </section>
    </main>
  );
}
