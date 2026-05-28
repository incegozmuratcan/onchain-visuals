"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Check, Copy, Download } from "lucide-react";
import { DatasetLibrary } from "@/components/DatasetLibrary";
import { PromptPanel } from "@/components/PromptPanel";
import { ShareCard } from "@/components/ShareCard";
import { datasetGroups } from "@/lib/datasets";
import type { ChainRevenueRow } from "@/lib/defillama";
import type { ChartSnapshot } from "@/lib/onchain/types";

const DEFAULT_CARD_INPUT = "Top 10 chains by stablecoin supply";

const tryCards = [
  "Top 10 chains by 30D revenue",
  "Top 10 chains by stablecoin supply",
  "Top 10 chains by DeFi TVL",
  "Top 10 DePIN projects by 30D annualized revenue",
  "Top 10 chains by real-time TPS",
  "BTC ETF Daily Flowboard",
  "BTC ETF Weekly Flowboard",
  "BTC ETF Monthly Issuer Report",
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
  visualType?: "leaderboard_card" | "btc_etf_card";
  chart?: ChartSnapshot;
  error?: string;
};

export function HomeClient({ brand }: { brand: import("@/lib/brandTypes").PublicBrandSettings }) {
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
  const [etfSnapshot, setEtfSnapshot] = useState<ChartSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  // Hero logo fallback order: primaryLogo → headerLogo → siteName text.
  // Header logo is only a fallback when no primary / hero logo is configured.
  const [heroLogoSrc, setHeroLogoSrc] = useState(() => brand.primaryLogo || brand.headerLogo || "");
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

      setRows(json.rows || []);
      setEtfSnapshot(json.chart || null);
      setSource(json.source || "DefiLlama");
      setUpdatedAt(json.updatedAt || "-");
      setTitle(json.title || "Market card");
      setEyebrow(json.eyebrow || "Onchain Visuals Metric");
      setDescription(json.description || "A clean visual created from supported DeFi datasets.");
      setMethodology(json.methodology || "Methodology: Source attribution is kept on every export.");
      setInsight(json.insight || "Created from supported Onchain Visuals data sources.");
      setValueFormat(json.valueFormat || "usd");
      setValueSuffix(json.valueSuffix || "");
      setValueDirection(json.valueDirection || "higher");
      setQueryLabels(json.query?.labels || []);
      setHasGenerated(true);
    } catch (err) {
      setEtfSnapshot(null);
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
    link.download = `onchain-visuals-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
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
      ...(etfSnapshot ? etfSnapshot.headlineMetrics.map((metric) => `${metric.label}: ${metric.formattedValue}`) : rows.slice(0, 10).map((row) => `${row.rank}. ${row.name} — ${valueFormat === "number" ? `${row.value}${valueSuffix ? ` ${valueSuffix}` : ""}` : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.value)}`)),
      "",
      `Data: ${source}`,
      `${brand.createdWithText}.`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCaptionCopied(true);
    window.setTimeout(() => setCaptionCopied(false), 1400);
  }

  function goHome() {
    window.location.href = "/";
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 md:px-8 md:py-7">
      <header className="mx-auto mb-6 flex max-w-4xl flex-col items-center text-center">
        <button onClick={goHome} className="inline-flex max-w-[90vw] items-center justify-center transition hover:opacity-80" aria-label={`${brand.siteName} home`}>
          {heroLogoSrc ? <img src={heroLogoSrc} alt={brand.siteName} onError={() => setHeroLogoSrc("")} className="h-auto max-h-20 w-auto max-w-[78vw] object-contain md:max-h-28" style={{ transform: `translateX(${brand.heroLogoOffsetX}px)`, maxWidth: `${brand.heroLogoMaxWidth}px`, marginBottom: `${brand.heroLogoSpacing}px` }} /> : <span className="font-serif text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">{brand.siteName}</span>}
        </button>
        <h1 className="mx-auto max-w-2xl text-balance tracking-[-0.02em] text-slate-700" style={{ fontSize: `${brand.heroSloganFontSize}px`, fontWeight: Number(brand.heroSloganFontWeight), lineHeight: `${brand.heroSloganLineHeight}px` }}>{brand.mainSlogan || "Clean onchain visuals. Simple explanations. Share-ready cards."}</h1>
        {brand.heroSubtitleVisible !== "0" && brand.heroSubtitle && brand.heroSubtitle !== brand.mainSlogan && brand.heroSubtitle !== brand.supportingCopy ? <p className="mx-auto mt-2 max-w-xl text-balance font-medium leading-5 text-slate-500" style={{ fontSize: `${brand.heroSubtitleSize}px`, opacity: Number(brand.heroSubtitleOpacity) / 100 }}>
          {brand.heroSubtitle}
        </p> : null}
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
              <ShareCard brand={brand} rows={rows} title={title} eyebrow={eyebrow} description={description} insight={insight} updatedAt={updatedAt} source={source} valueFormat={valueFormat} valueSuffix={valueSuffix} valueDirection={valueDirection} etfSnapshot={etfSnapshot} />
              <div className={etfSnapshot ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
                <button onClick={downloadCard} disabled={!rows.length && !etfSnapshot} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
                  <Download size={18} /> Download PNG
                </button>
                {!etfSnapshot && (
                  <button onClick={copyCaption} disabled={!rows.length && !etfSnapshot} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-black text-slate-950 transition hover:border-slate-950 disabled:opacity-60">
                    {captionCopied ? <Check size={18} /> : <Copy size={18} />} {captionCopied ? "Copied" : "Copy caption"}
                  </button>
                )}
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
