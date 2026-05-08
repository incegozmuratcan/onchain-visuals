"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { Bell, Download } from "lucide-react";
import { DatasetLibrary } from "@/components/DatasetLibrary";
import { PromptPanel } from "@/components/PromptPanel";
import { ShareCard } from "@/components/ShareCard";
import { datasetGroups } from "@/lib/datasets";
import type { ChainRevenueRow } from "@/lib/defillama";

const activeDataset = {
  id: "market_metrics",
  name: "Market Metrics",
  examplePrompts: [],
};

type ApiResult = {
  ok: boolean;
  rows?: ChainRevenueRow[];
  source?: string;
  updatedAt?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  methodology?: string;
  insight?: string;
  query?: { timeframe: string; limit: number; labels?: string[]; metric?: string };
  error?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("Top 10 chains by 30D revenue");
  const [rows, setRows] = useState<ChainRevenueRow[]>([]);
  const [source, setSource] = useState("DefiLlama");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [title, setTitle] = useState("Top 10 chains by 30D revenue");
  const [eyebrow, setEyebrow] = useState("Chain Revenue");
  const [description, setDescription] = useState("Shows revenue captured by chains themselves, excluding app and protocol revenue.");
  const [methodology, setMethodology] = useState("Methodology: Chain revenue only. Protocol and app revenue are excluded. Source attribution is kept on every export.");
  const [insight, setInsight] = useState("Chain revenue measures value captured at the network level. It is different from protocol revenue and helps separate chain economics from app activity.");
  const [queryLabels, setQueryLabels] = useState<string[]>(["Chains", "Revenue", "Top 10", "30D"]);
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
      setSource(json.source || "DefiLlama");
      setUpdatedAt(json.updatedAt || "-");
      setTitle(json.title || "Generated metric");
      setEyebrow(json.eyebrow || "learnDeFi Metric");
      setDescription(json.description || "A clean visual generated from supported DeFi datasets.");
      setMethodology(json.methodology || "Methodology: Source attribution is kept on every export.");
      setInsight(json.insight || "Generated from supported learnDeFi data sources.");
      setQueryLabels(json.query?.labels || []);
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
    link.download = `learndefi-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
    link.href = dataUrl;
    link.click();
  }

  function selectPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
  }

  function goHome() {
    window.location.href = "/";
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mx-auto mb-8 max-w-5xl text-center">
        <button onClick={goHome} className="text-5xl font-black tracking-[-0.07em] text-slate-950 transition hover:opacity-75 md:text-8xl">
          learnDeFi
        </button>
        <p className="mx-auto mt-5 max-w-3xl text-balance text-base font-bold leading-7 text-slate-600 md:text-2xl md:leading-9">
          Clean DeFi visuals. Simple explanations. Share-ready cards.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
        <div className="grid gap-5">
          <PromptPanel prompt={prompt} setPrompt={setPrompt} onRun={runQuery} loading={loading} activeDataset={activeDataset} queryLabels={queryLabels} />

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 shadow-soft md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex items-center gap-2 font-black text-slate-950"><Bell size={16} /> Scheduled reports <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">soon</span></div>
            <div className="mt-2 md:mt-0">Free users will get 1 saved report. Paid users get more reports, alerts and templates.</div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {hasGenerated && (
            <div className="grid gap-4">
              <ShareCard rows={rows} title={title} eyebrow={eyebrow} description={description} insight={insight} updatedAt={updatedAt} source={source} />
              <button onClick={downloadCard} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
                <Download size={18} /> Download PNG
              </button>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold leading-6 text-slate-500 shadow-soft">
                {methodology}
              </div>
            </div>
          )}
        </div>

        <DatasetLibrary groups={datasetGroups} onSelectPrompt={selectPrompt} />
      </section>
    </main>
  );
}
