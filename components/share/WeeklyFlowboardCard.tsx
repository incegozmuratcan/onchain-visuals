import type { Ref } from "react";
import type { ChartSnapshot } from "@/lib/onchain/types";
import { dayBarPercent } from "@/lib/onchain/btcEthEtfWeek";
import { BitcoinMedallion, EthereumMedallion } from "./AssetMedallions";
import { IssuerFlowRow } from "./IssuerFlowRow";
import { ShareCardFrame, type ShareCardBrand } from "./ShareCardFrame";

export type WeeklyDayRow = {
  date: string;
  label: string;
  value: number;
  formattedValue: string;
};

export type WeeklyIssuerRow = {
  ticker: string;
  name: string;
  value: number;
  formattedValue: string;
};

export type WeeklyFlowPanel = {
  asset: "BTC" | "ETH";
  periodLabel: string;
  metricLabel: string;
  netFlow: number;
  formattedNet: string;
  priorWeek?: {
    label?: string;
    value: number;
    formattedValue: string;
  } | null;
  cumulative: number;
  formattedCumulative: string;
  days: WeeklyDayRow[];
  issuers: WeeklyIssuerRow[];
};

function displayFlow(value?: string | null) {
  if (!value) return "—";
  return value.replace(/-/g, "−");
}

function amountColor(value: number) {
  return value < 0 ? "#b0153f" : "#127a45";
}

function FlowPanel({ panel }: { panel: WeeklyFlowPanel }) {
  const net = Number(panel.netFlow) || 0;
  const cumulative = Number(panel.cumulative) || 0;
  const priorValue = panel.priorWeek == null ? null : Number(panel.priorWeek.value);
  const prior = priorValue != null && Number.isFinite(priorValue) ? priorValue : null;
  const days = panel.days || [];
  const issuers = [...(panel.issuers || [])].sort(
    (a, b) => Math.abs(Number(b.value) || 0) - Math.abs(Number(a.value) || 0),
  );
  const dayMax = Math.max(1, ...days.map((day) => Math.abs(Number(day.value) || 0)));
  const issuerMax = Math.max(1, ...issuers.map((row) => Math.abs(Number(row.value) || 0)));
  const shortWeek = days.length < 5;

  return (
    <section
      aria-label={`${panel.asset} ETF flows`}
      data-asset={panel.asset}
      data-trading-days={days.length}
      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#cfd4dc] bg-[#f5f6f8] px-4 pb-5 pt-6 lg:px-8 lg:pb-[30px] lg:pt-9"
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

      <div className="mt-5 flex gap-3 lg:mt-[26px] lg:gap-4">
        <div
          data-chip="prior-week"
          className="min-w-0 flex-1 rounded-[14px] bg-[#e8eaee] px-3 py-3 lg:px-[22px] lg:py-4"
        >
          <div className="truncate text-[11px] font-extrabold uppercase tracking-[1px] text-[#6b7079] lg:text-[15px] lg:tracking-[2px]">
            {panel.priorWeek?.label || "Prior week"}
          </div>
          <div
            className="mt-1.5 whitespace-nowrap text-[18px] font-black tracking-[-0.03em] tabular-nums lg:text-[28px]"
            style={{ color: prior == null ? "#6b7079" : amountColor(prior) }}
          >
            {displayFlow(panel.priorWeek?.formattedValue)}
          </div>
        </div>
        <div
          data-chip="cumulative"
          className="min-w-0 flex-1 rounded-[14px] bg-[#e8eaee] px-3 py-3 lg:px-[22px] lg:py-4"
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

      <ul
        className={`mt-5 flex flex-col gap-2 lg:mt-[26px] ${shortWeek ? "min-h-0 flex-1 justify-evenly" : ""}`}
      >
        {days.map((day) => {
          const value = Number(day.value) || 0;
          const width = dayBarPercent(value, dayMax);
          return (
            <li
              key={`${panel.asset}-${day.date}`}
              className="grid h-[54px] grid-cols-[54px_minmax(0,1fr)_118px] items-center gap-x-2 rounded-[14px] bg-[#e8eaee] px-5"
            >
              <div className="text-[21px] font-black tracking-[-0.02em] text-[#111]">{day.label}</div>
              <div className="relative h-9">
                <div className="absolute bottom-0 left-1/2 top-0 z-[2] w-[2px] -translate-x-1/2 rounded-[1px] bg-[#020617]" />
                {value !== 0 ? (
                  <div
                    data-day-bar={day.label}
                    className="absolute top-1/2 z-[1] h-3 -mt-1.5 min-w-[12px] rounded-[6px]"
                    style={{
                      width: `${width}%`,
                      backgroundColor: value < 0 ? "#b0153f" : "#127a45",
                      ...(value < 0 ? { right: "50%" } : { left: "50%" }),
                    }}
                  />
                ) : null}
              </div>
              <div
                data-day-flow={day.formattedValue}
                className="whitespace-nowrap text-right text-[22px] font-black tabular-nums tracking-[-0.03em]"
                style={{ color: amountColor(value) }}
              >
                {displayFlow(day.formattedValue)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-[18px] border-t border-[#eef0f3] pt-1.5">
        <ul>
          {issuers.map((row) => (
            <li key={`${panel.asset}-${row.ticker}`} className="pt-2">
              <IssuerFlowRow
                ticker={row.ticker}
                name={row.name}
                value={Number(row.value) || 0}
                formattedValue={row.formattedValue}
                maxAbs={issuerMax}
                barClassName="mt-[7px]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function WeeklyFlowboardCard({
  data,
  brand,
  cardRef,
}: {
  data: ChartSnapshot;
  brand?: ShareCardBrand;
  cardRef?: Ref<HTMLDivElement>;
}) {
  const panels = ((data.series?.cards || []) as WeeklyFlowPanel[]).filter(
    (panel) => panel?.asset === "BTC" || panel?.asset === "ETH",
  );
  const ordered = ["BTC", "ETH"]
    .map((asset) => panels.find((panel) => panel.asset === asset))
    .filter((panel): panel is WeeklyFlowPanel => Boolean(panel));
  const source = String(data.sourceLabel || "Farside")
    .replace(/^Source:\s*/i, "")
    .replace(/ Investors/g, "");

  return (
    <ShareCardFrame
      cardRef={cardRef}
      brand={brand}
      density="weekly"
      eyebrow="Capital Flows · BTC + ETH ETF"
      title={data.title || "ETF Weekly Flowboard"}
      description={
        data.subtitle || "Weekly capital movement across US spot Bitcoin and Ethereum ETFs."
      }
      source={source || "Farside"}
      updatedAt={data.freshness?.lastUpdatedAt}
    >
      <div data-testid="weekly-flowboard" className="grid h-full min-h-0 flex-1 grid-cols-1 gap-7 md:grid-cols-2">
        {ordered.map((panel) => (
          <FlowPanel key={panel.asset} panel={panel} />
        ))}
      </div>
    </ShareCardFrame>
  );
}
