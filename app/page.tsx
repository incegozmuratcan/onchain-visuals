"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Check, Copy, Download } from "lucide-react";
import { DatasetLibrary } from "@/components/DatasetLibrary";
import { PromptPanel } from "@/components/PromptPanel";
import { ShareCard } from "@/components/ShareCard";
import { datasetGroups } from "@/lib/datasets";
import type { ChainRevenueRow } from "@/lib/defillama";

const DEFAULT_CARD_INPUT = "Top 10 chains by stablecoin supply";

const tryCards = [
  "Top 10 chains by 30D revenue",
  "Top 10 chains by stablecoin supply",
  "Top 10 chains by DeFi TVL",
  "Top 10 DePIN projects by 30D annualized revenue",
  "Top 10 chains by real-time TPS",
];

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
  valueFormat?: "usd" | "number";
  valueSuffix?: string;
  valueDirection?: "higher" | "lower";
  query?: { timeframe: string; limit: number; labels?: string[]; metric?: string };
  error?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState(DEFAULT_CARD_INPUT);
  const [rows, setRows] = useState<ChainRevenueRow[]>([]);
  const [source, setSource] = useState("DefiLlama");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [title, setTitle] = useState("Top 10 chains by stablecoin supply");
  const [eyebrow, setEyebrow] = useState("Stablecoin Supply");
  const [description, setDescription] = useState("Current stablecoin supply by chain from a trusted market data source.");
  const [methodology, setMethodology] = useState("Methodology: Current stablecoin supply by chain. Source attribution is kept on every export.");
  const [insight, setInsight] = useState("Stablecoin supply shows where dollar-denominated liquidity is issued and circulating across crypto networks.");
  const [valueFormat, setValueFormat] = useState<"usd" | "number">("usd");
  const [valueSuffix, setValueSuffix] = useState("");
  const [valueDirection, setValueDirection] = useState<"higher" | "lower">("higher");
  const [queryLabels, setQueryLabels] = useState<string[]>(["Chains", "Stablecoin Supply", "Top 10", "Current"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const didLoadDefault = useRef(false);

  const runQuery = useCallback(async (overrideInput?: string) => {
    setLoading(true);
    setError(null);

    try {
      const effectivePrompt = (overrideInput ?? prompt).trim() || DEFAULT_CARD_INPUT;
      const res = await fetch(`/api/chain-revenue?prompt=${encodeURIComponent(effectivePrompt)}`);
      const json = (await res.json()) as ApiResult;

      if (!res.ok || !json.ok || !json.rows) {
        throw new Error(json.error || "Failed to load data");
      }

      setRows(json.rows);
      setSource(json.source || "DefiLlama");
      setUpdatedAt(json.updatedAt || "-");
      setTitle(json.title || "Market card");
      setEyebrow(json.eyebrow || "learnDeFi Metric");
      setDescription(json.description || "A clean visual created from supported DeFi datasets.");
      setMethodology(json.methodology || "Methodology: Source attribution is kept on every export.");
      setInsight(json.insight || "Created from supported learnDeFi data sources.");
      setValueFormat(json.valueFormat || "usd");
      setValueSuffix(json.valueSuffix || "");
      setValueDirection(json.valueDirection || "higher");
      setQueryLabels(json.query?.labels || []);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  useEffect(() => {
    if (didLoadDefault.current) return;
    didLoadDefault.current = true;
    runQuery(DEFAULT_CARD_INPUT);
  }, [runQuery]);

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
    void runQuery(nextPrompt);
  }

  async function copyCaption() {
    const lines = [
      `${title}.`,
      "",
      ...rows.slice(0, 10).map((row) => `${row.rank}. ${row.name} — ${valueFormat === "number" ? `${row.value}${valueSuffix ? ` ${valueSuffix}` : ""}` : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.value)}`),
      "",
      `Data: ${source}`,
      "Created with learnDeFi.",
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCaptionCopied(true);
    window.setTimeout(() => setCaptionCopied(false), 1400);
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
        <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-6xl">Make DeFi data share-ready.</h1>
        <p className="mx-auto mt-5 max-w-3xl text-balance text-base font-bold leading-7 text-slate-600 md:text-2xl md:leading-9">
          Create clean, source-backed market cards from trusted crypto data.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-slate-500 md:text-base">Clean DeFi visuals. Simple explanations. Share-ready cards.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["Source-backed", "X-ready", "Simple learn notes"].map((chip) => (
            <span key={chip} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">{chip}</span>
          ))}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_390px] lg:items-start">
        <div className="grid gap-5">
          <PromptPanel prompt={prompt} setPrompt={setPrompt} onRun={runQuery} loading={loading} activeDataset={activeDataset} queryLabels={queryLabels} />

          <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-soft">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Try these cards</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tryCards.map((cardInput) => (
                <button key={cardInput} onClick={() => selectPrompt(cardInput)} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-950 transition hover:border-slate-950 hover:bg-white">
                  {cardInput}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {(hasGenerated || loading) && (
            <div className="grid gap-4">
              <ShareCard rows={rows} title={title} eyebrow={eyebrow} description={description} insight={insight} updatedAt={updatedAt} source={source} valueFormat={valueFormat} valueSuffix={valueSuffix} valueDirection={valueDirection} />
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={downloadCard} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
                  <Download size={18} /> Download PNG
                </button>
                <button onClick={copyCaption} disabled={!rows.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-950 transition hover:border-slate-950 disabled:opacity-60">
                  {captionCopied ? <Check size={18} /> : <Copy size={18} />} {captionCopied ? "Copied" : "Copy caption"}
                </button>
              </div>
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
