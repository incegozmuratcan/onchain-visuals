import type { Ref } from "react";
import type { ChartSnapshot } from "@/lib/onchain/types";
import { BitcoinMedallion, EthereumMedallion } from "./AssetMedallions";
import {
  ShareCardFrame,
  type ShareCardBrand,
} from "./ShareCardFrame";

export type SplitIssuerRow = {
  ticker: string;
  name: string;
  value: number;
  formattedValue: string;
};

export type SplitFlowPanel = {
  asset: "BTC" | "ETH";
  date?: string | null;
  periodLabel: string;
  metricLabel: string;
  netFlow: number;
  formattedNet: string;
  largest?: {
    ticker: string;
    issuer?: string;
    value: number;
    formattedValue: string;
  } | null;
  cumulative: number;
  formattedCumulative: string;
  issuers: SplitIssuerRow[];
};

function toneClass(value: number) {
  return value < 0 ? "text-rose-700" : "text-emerald-700";
}

function FlowPanel({ panel }: { panel: SplitFlowPanel }) {
  const net = Number(panel.netFlow) || 0;
  const largestValue = Number(panel.largest?.value);
  const largestNegative = Number.isFinite(largestValue) ? largestValue < 0 : net < 0;
  const cumulative = Number(panel.cumulative) || 0;
  const maxAbs = Math.max(
    1,
    ...panel.issuers.map((row) => Math.abs(Number(row.value) || 0)),
  );

  return (
    <section
      aria-label={`${panel.asset} ETF flows`}
      data-asset={panel.asset}
      className="flex h-full min-w-0 flex-col rounded-[28px] border border-slate-200 bg-white px-5 pb-5 pt-8 md:px-6 md:pb-6 md:pt-10"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-black uppercase leading-none tracking-[-0.02em] text-slate-950 md:text-xl">
            {panel.periodLabel}
          </div>
          <div className="mt-2 text-[10px] font-black uppercase leading-none tracking-[0.18em] text-slate-400">
            {panel.metricLabel}
          </div>
          <div
            data-hero-flow={panel.formattedNet}
            className={`mt-3 whitespace-nowrap text-[1.75rem] font-black leading-none tracking-[-0.05em] md:text-[2.5rem] ${toneClass(net)}`}
          >
            {panel.formattedNet}
          </div>
        </div>
        <div className="shrink-0">
          {panel.asset === "ETH" ? (
            <EthereumMedallion className="h-14 w-14 md:h-[88px] md:w-[88px]" />
          ) : (
            <BitcoinMedallion className="h-14 w-14 md:h-[88px] md:w-[88px]" />
          )}
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <div
          data-chip="largest"
          className={`rounded-2xl border px-4 py-4 ${
            largestNegative
              ? "border-rose-100 bg-rose-100"
              : "border-emerald-100 bg-emerald-100"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-slate-500">Largest</div>
          <div className="mt-3 flex items-baseline gap-2.5 text-lg font-black leading-none md:text-[22px]">
            <span className="text-slate-950">{panel.largest?.ticker || "—"}</span>
            <span className={`tabular-nums ${largestNegative ? "text-rose-700" : "text-emerald-700"}`}>
              {panel.largest?.formattedValue || "—"}
            </span>
          </div>
        </div>
        <div
          data-chip="cumulative"
          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4"
        >
          <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-slate-500">Cumulative</div>
          <div className={`mt-3 text-lg font-black leading-none tabular-nums md:text-[22px] ${toneClass(cumulative)}`}>
            {panel.formattedCumulative}
          </div>
        </div>
      </div>

      <ul className="mt-8 grid gap-5">
        {panel.issuers.map((row) => {
          const value = Number(row.value) || 0;
          const width = (Math.abs(value) / maxAbs) * 100;
          return (
            <li key={`${panel.asset}-${row.ticker}`}>
              <div className="flex items-baseline justify-between gap-3 text-base leading-none md:text-[22px]">
                <div className="min-w-0 truncate">
                  <span className="font-black tracking-[-0.03em] text-slate-950">{row.ticker}</span>
                  {row.name ? (
                    <span className="ml-3.5 font-medium text-slate-500">{row.name}</span>
                  ) : null}
                </div>
                <span
                  data-issuer-flow={row.formattedValue}
                  className={`shrink-0 text-right font-black tabular-nums tracking-[-0.03em] ${toneClass(value)}`}
                >
                  {row.formattedValue}
                </span>
              </div>
              <div
                className="mt-2 h-[2px] rounded-full"
                data-issuer-bar="proportional"
                style={{
                  width: `${width}%`,
                  backgroundColor: value < 0 ? "#be123c" : "#047857",
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SplitFlowboardCard({
  data,
  brand,
  cardRef,
}: {
  data: ChartSnapshot;
  brand?: ShareCardBrand;
  cardRef?: Ref<HTMLDivElement>;
}) {
  const panels = ((data.series?.cards || []) as SplitFlowPanel[]).filter(
    (panel) => panel?.asset === "BTC" || panel?.asset === "ETH",
  );
  const ordered = ["BTC", "ETH"]
    .map((asset) => panels.find((panel) => panel.asset === asset))
    .filter((panel): panel is SplitFlowPanel => Boolean(panel));
  const source = String(data.sourceLabel || "Farside")
    .replace(/^Source:\s*/i, "")
    .replace(/ Investors/g, "");

  return (
    <ShareCardFrame
      cardRef={cardRef}
      brand={brand}
      eyebrow="Capital Flows · BTC + ETH ETF"
      title={data.title || "ETF Daily Flowboard"}
      description={
        data.subtitle ||
        "Latest capital movement across US spot Bitcoin and Ethereum ETFs."
      }
      source={source || "Farside"}
      updatedAt={data.freshness?.lastUpdatedAt}
    >
      <div data-testid="split-flowboard" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {ordered.map((panel) => (
          <FlowPanel key={panel.asset} panel={panel} />
        ))}
      </div>
    </ShareCardFrame>
  );
}
