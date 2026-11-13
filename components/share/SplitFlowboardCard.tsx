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
  priorDay?: {
    date?: string | null;
    label: string;
    value: number;
    formattedValue: string;
  } | null;
  cumulative: number;
  formattedCumulative: string;
  issuers: SplitIssuerRow[];
};

function displayFlow(value?: string | null) {
  if (!value) return "—";
  return value.replace(/-/g, "−");
}

function amountColor(value: number) {
  return value < 0 ? "#b0153f" : "#127a45";
}

function FlowPanel({ panel }: { panel: SplitFlowPanel }) {
  const net = Number(panel.netFlow) || 0;
  const cumulative = Number(panel.cumulative) || 0;
  const priorValue = panel.priorDay == null ? null : Number(panel.priorDay.value);
  const prior = priorValue != null && Number.isFinite(priorValue) ? priorValue : null;
  const issuers = [...panel.issuers].sort(
    (a, b) => Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0),
  );
  const maxAbs = Math.max(
    1,
    ...issuers.map((row) => Math.abs(Number(row.value) || 0)),
  );

  return (
    <section
      aria-label={`${panel.asset} ETF flows`}
      data-asset={panel.asset}
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#cfd4dc] bg-[#f5f6f8] px-4 pb-6 pt-8 lg:px-8 lg:pb-12 lg:pt-14"
    >
      <div className="text-[20px] font-extrabold leading-[1.1] text-[#111] lg:text-[27px]">
        {panel.periodLabel}
      </div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[2px] text-[#9aa0a8] lg:text-[14px] lg:tracking-[3px]">
        {panel.metricLabel}
      </div>
      <div
        data-hero-flow={panel.formattedNet}
        className="mt-[10px] w-fit whitespace-nowrap text-[40px] font-black leading-[1.1] tracking-[-1.5px] tabular-nums lg:text-[64px]"
        style={{ color: amountColor(net) }}
      >
        {displayFlow(panel.formattedNet)}
      </div>
      <div className="absolute right-4 top-5 lg:right-8 lg:top-[30px]">
        {panel.asset === "ETH" ? (
          <EthereumMedallion className="block h-14 w-14 lg:h-[84px] lg:w-[84px]" />
        ) : (
          <BitcoinMedallion className="block h-14 w-14 lg:h-[84px] lg:w-[84px]" />
        )}
      </div>

      <div className="mt-6 flex gap-3 lg:mt-10 lg:gap-4">
        <div
          data-chip="prior-day"
          className="min-w-0 flex-1 rounded-[14px] bg-[#e8eaee] px-3 py-3 lg:px-[22px] lg:py-[22px]"
        >
          <div className="truncate text-[11px] font-extrabold uppercase tracking-[1px] text-[#6b7079] lg:text-[15px] lg:tracking-[2px]">
            {panel.priorDay?.label || "PRIOR DAY"}
          </div>
          <div
            className="mt-1.5 whitespace-nowrap text-[18px] font-black tracking-[-0.03em] tabular-nums lg:text-[28px]"
            style={{ color: prior == null ? "#6b7079" : amountColor(prior) }}
          >
            {displayFlow(panel.priorDay?.formattedValue)}
          </div>
        </div>
        <div
          data-chip="cumulative"
          className="min-w-0 flex-1 rounded-[14px] bg-[#e8eaee] px-3 py-3 lg:px-[22px] lg:py-[22px]"
        >
          <div className="truncate text-[11px] font-extrabold uppercase tracking-[1px] text-[#6b7079] lg:text-[15px] lg:tracking-[2px]">
            Cumulative
          </div>
          <div
            className="mt-1.5 whitespace-nowrap text-[18px] font-black tracking-[-0.03em] tabular-nums lg:text-[28px]"
            style={{ color: amountColor(cumulative) }}
          >
            {displayFlow(panel.formattedCumulative)}
          </div>
        </div>
      </div>

      <ul className="mt-6 lg:mt-10">
        {issuers.map((row, index) => {
          const value = Number(row.value) || 0;
          const width = (Math.abs(value) / maxAbs) * 100;
          return (
            <li
              key={`${panel.asset}-${row.ticker}`}
              className={index === 0 ? "pt-1" : "pt-[26px]"}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 truncate">
                  <span className="text-[16px] font-black tracking-[-0.03em] text-[#111] lg:text-[20px]">
                    {row.ticker}
                  </span>
                  {row.name ? (
                    <span className="ml-2 text-[14px] font-medium text-[#7b808a] lg:ml-[10px] lg:text-[18px]">
                      {row.name}
                    </span>
                  ) : null}
                </div>
                <span
                  data-issuer-flow={row.formattedValue}
                  className="shrink-0 whitespace-nowrap text-right text-[16px] font-black tabular-nums tracking-[-0.03em] lg:text-[22px]"
                  style={{ color: amountColor(value) }}
                >
                  {displayFlow(row.formattedValue)}
                </span>
              </div>
              <div
                className="mt-[13px] h-[3px] rounded-[3px] bg-[#e8eaee]"
                data-issuer-bar="proportional"
              >
                <span
                  className="block h-[3px] rounded-[3px]"
                  style={{
                    width: `${width}%`,
                    backgroundColor: value < 0 ? "#c8203f" : "#1b8f58",
                  }}
                />
              </div>
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
      <div data-testid="split-flowboard" className="grid h-full min-h-0 flex-1 grid-cols-1 gap-7 md:grid-cols-2">
        {ordered.map((panel) => (
          <FlowPanel key={panel.asset} panel={panel} />
        ))}
      </div>
    </ShareCardFrame>
  );
}
