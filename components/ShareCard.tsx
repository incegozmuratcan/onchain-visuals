"use client";

import { useMemo, useState } from "react";
import { getChainLogoCandidates, getInitials } from "@/lib/chainLogos";
import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";
import type { PublicBrandSettings } from "@/lib/brandTypes";
import type { ChartSnapshot } from "@/lib/onchain/types";

function rowLayoutClass(count: number) {
  if (count > 15) return "mt-6 grid gap-2";
  if (count > 10) return "mt-7 grid gap-2.5";
  return "mt-9 grid gap-3.5";
}

function titleSizeClass(count: number) {
  if (count > 15)
    return "mt-3 text-3xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-4xl";
  return "mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-5xl";
}

function barWidth(
  value: number,
  leaderValue?: number,
  direction: "higher" | "lower" = "higher",
) {
  if (!leaderValue || leaderValue <= 0) return "0%";
  const raw = direction === "lower" ? leaderValue / value : value / leaderValue;
  const pct = raw * 100;
  return `${Math.max(0.8, Math.min(100, pct))}%`;
}

function formatNumber(value: number, suffix?: string) {
  if (suffix === "s") {
    const formatted = value < 10 ? value.toFixed(2) : value.toFixed(1);
    return `${formatted} s`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
  }).format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function signedUsd(value: number | string | null | undefined) {
  const numberValue = Number(value) || 0;
  return `${numberValue >= 0 ? "+" : ""}${formatUsd(numberValue)}`;
}

function BtcEtfShareCard({
  brand,
  data,
}: {
  brand: PublicBrandSettings;
  data: ChartSnapshot;
}) {
  const view = data.metadata?.view || "daily";
  const daily = view === "daily";
  const weekly = view === "weekly";
  const monthly = view === "monthly";
  const issuerRows = (data.series.tables || [])
    .filter((row: any) => Number(row.value) !== 0)
    .slice(0, daily ? 5 : 5);
  const flowRows = data.series.bars || [];
  const maxAbsIssuer = Math.max(
    1,
    ...issuerRows.map((row: any) => Math.abs(Number(row.value) || 0)),
  );
  const maxAbsFlow = Math.max(
    1,
    ...flowRows.map((row: any) => Math.abs(Number(row.value) || 0)),
  );
  const cleanSource =
    data.datasetSlug === "btc-etf-flowboard"
      ? "Farside"
      : data.sourceLabel.replace(/^Source:\s*/i, "").replace(/ Investors/g, "");
  const hero = data.headlineMetrics[0];
  const supportMetrics = daily
    ? data.headlineMetrics.slice(1, 3)
    : data.headlineMetrics.slice(1, 4);

  const heroParts = (() => {
    if (hero?.periodLabel && hero?.metricLabel) {
      return { periodLabel: hero.periodLabel, metricLabel: hero.metricLabel };
    }
    const parts = String(hero?.label || "NET FLOW").split(" ");
    return {
      periodLabel: parts.length > 2 ? parts.slice(0, 2).join(" ") : parts[0],
      metricLabel:
        parts.length > 2
          ? parts.slice(2).join(" ")
          : parts.slice(1).join(" ") || "NET FLOW",
    };
  })();

  const MiniMetric = ({
    metric,
    sub,
    watermark = false,
  }: {
    metric: any;
    sub?: string | null;
    watermark?: boolean;
  }) => (
    <div
      className={`relative flex min-h-[70px] self-start flex-col justify-start overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100/70 px-3.5 py-3 ${watermark ? "pr-20" : ""}`}
    >
      {watermark ? <BtcLogoWatermark compact /> : null}
      {metric.periodLabel && metric.metricLabel ? (
        <div
          data-hero-label-parts="explicit"
          className="relative z-10 space-y-1"
        >
          <div
            data-hero-label-primary={metric.periodLabel}
            className="whitespace-nowrap text-[13px] font-black uppercase leading-none tracking-[0.04em] text-slate-950"
          >
            {metric.periodLabel}
          </div>
          <div
            data-hero-label-secondary={metric.metricLabel}
            className="whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-[0.18em] text-slate-400"
          >
            {metric.metricLabel}
          </div>
        </div>
      ) : (
        <div className="relative z-10 text-[9px] font-black uppercase leading-3 tracking-[0.15em] text-slate-400">
          {metric.label}
        </div>
      )}
      <div className="relative z-10 mt-2 min-w-0">
        <div className="truncate text-[1.35rem] font-black leading-none tracking-[-0.045em] text-slate-950">
          {metric.formattedValue}
        </div>
        {sub ? (
          <div className="mt-1 truncate text-[11px] font-bold text-slate-400">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );

  const BtcLogoWatermark = ({ compact = false }: { compact?: boolean }) => (
    <div
      data-testid="btc-logo-treatment"
      data-logo-mode="restored-watermark"
      data-logo-shape="warm-orange-blob"
      data-logo-mandatory="true"
      className={`pointer-events-none absolute ${compact ? "-right-5 top-1/2 h-24 w-28 -translate-y-1/2" : "-right-8 top-1/2 h-44 w-48 -translate-y-1/2"}`}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 180 160"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient
            id="share-btc-watermark-glow"
            cx="42%"
            cy="36%"
            r="72%"
          >
            <stop offset="0%" stopColor="#ffcf73" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#f7931a" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#df7b10" stopOpacity="0.74" />
          </radialGradient>
          <filter
            id="share-btc-watermark-shadow"
            x="-20%"
            y="-18%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="-8"
              dy="14"
              stdDeviation="14"
              floodColor="#f59e0b"
              floodOpacity="0.2"
            />
          </filter>
        </defs>
        <path
          d="M144.8 23.6c24.6 18.9 26.7 58.6 8.9 89.1-17.8 30.4-55.5 51.7-89.4 41.2-34-10.5-64.2-52.8-54.1-88.3 10.2-35.6 60.8-64.4 99.8-57.9 13.2 2.2 24.9 8.3 34.8 15.9Z"
          fill="url(#share-btc-watermark-glow)"
          filter="url(#share-btc-watermark-shadow)"
        />
        <text
          x="91"
          y="103"
          textAnchor="middle"
          className="fill-white font-black"
          style={{
            fontSize: compact ? 68 : 76,
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          ₿
        </text>
      </svg>
    </div>
  );

  const HeroMetric = () => (
    <div className="relative flex min-h-[132px] flex-col justify-start overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100/85 p-5">
      <BtcLogoWatermark />
      <div className="relative z-10">
        <div
          data-hero-label-primary={heroParts.periodLabel}
          className="text-xl font-black uppercase leading-none tracking-[-0.02em] text-slate-950"
        >
          {heroParts.periodLabel}
        </div>
        <div
          data-hero-label-secondary={heroParts.metricLabel}
          className="mt-1.5 whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-[0.2em] text-slate-400"
        >
          {heroParts.metricLabel}
        </div>
      </div>
      <div
        className={`relative z-10 mt-6 truncate text-5xl font-black leading-none tracking-[-0.06em] ${Number(hero?.value) >= 0 ? "text-emerald-700" : "text-rose-700"}`}
      >
        {hero?.formattedValue}
      </div>
    </div>
  );

  const FlowStrip = ({ monthly = false }: { monthly?: boolean }) => {
    const width = monthly ? 860 : 760;
    const height = monthly ? 430 : 360;
    const margin = monthly
      ? { top: 42, right: 12, bottom: 30, left: 32 }
      : { top: 42, right: 12, bottom: 34, left: 32 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const paddedMax = maxAbsFlow * (monthly ? 1.04 : 1.05);
    const zeroY = margin.top + plotHeight / 2;
    const slot = flowRows.length ? plotWidth / flowRows.length : plotWidth;
    const barWidth = Math.max(
      monthly ? 24 : 100,
      Math.min(monthly ? 54 : 132, slot * (monthly ? 0.82 : 0.86)),
    );
    const valueToY = (value: number) =>
      margin.top + ((paddedMax - value) / (paddedMax * 2)) * plotHeight;
    const labeledIndexes = flowRows
      .map((row: any, index: number) => (row.showLabel ? index : -1))
      .filter((index: number) => index >= 0);
    const labelPositions = new Map<number, number>();
    if (monthly) {
      let previousX = -Infinity;
      for (const index of labeledIndexes) {
        const naturalX = margin.left + slot * index + slot / 2;
        const nextX = Math.max(naturalX, previousX + 142);
        const clampedX = Math.min(width - margin.right - 54, nextX);
        labelPositions.set(index, clampedX);
        previousX = clampedX;
      }
    }

    return (
      <svg
        className="block h-auto w-full overflow-visible"
        data-chart="signed-zero-baseline"
        data-scale-mode="signed-symmetric"
        data-bar-direction="positive-up-negative-down"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          monthly
            ? "This Month signed BTC ETF flows"
            : "Last 5 Days signed BTC ETF flows"
        }
      >
        {[0.25, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={margin.left}
            x2={width - margin.right}
            y1={margin.top + plotHeight * ratio}
            y2={margin.top + plotHeight * ratio}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#94a3b8"
          strokeWidth="1.25"
        />
        <text
          x={margin.left - 7}
          y={zeroY + 4}
          textAnchor="end"
          className="fill-slate-400 text-[12px] font-black"
        >
          $0
        </text>
        {flowRows.map((row: any, index: number) => {
          const value = Number(row.value) || 0;
          const positive = value >= 0;
          const y = valueToY(value);
          const x = margin.left + slot * index + slot / 2 - barWidth / 2;
          const barY = positive ? y : zeroY;
          const rawHeight = Math.abs(zeroY - y);
          const barHeight = Math.max(monthly ? 22 : 42, rawHeight);
          const marked =
            row.isLargest || row.isLargestInflow || row.isLargestOutflow;
          const showLabel = !monthly || row.showLabel;
          const labelY = positive
            ? Math.max(monthly ? 30 : 28, barY - 14)
            : Math.min(
                height - margin.bottom - 8,
                barY + barHeight + (monthly ? 24 : 24),
              );
          const naturalLabelX = x + barWidth / 2;
          const labelX = monthly
            ? (labelPositions.get(index) ?? naturalLabelX)
            : naturalLabelX;

          return (
            <g key={row.date || row.name}>
              <rect
                x={x}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={monthly ? 6 : 10}
                fill={
                  positive
                    ? marked
                      ? "#059669"
                      : "#34d399"
                    : marked
                      ? "#e11d48"
                      : "#fb7185"
                }
                opacity={marked ? 1 : 0.82}
              />
              {marked ? (
                <rect
                  x={x - 2}
                  y={barY - (positive ? 2 : 0)}
                  width={barWidth + 4}
                  height={barHeight + 4}
                  rx={monthly ? 8 : 12}
                  fill="none"
                  stroke={
                    positive ? "rgba(16,185,129,0.22)" : "rgba(244,63,94,0.22)"
                  }
                  strokeWidth="3"
                />
              ) : null}
              {showLabel && monthly && Math.abs(labelX - naturalLabelX) > 1 ? (
                <line
                  x1={naturalLabelX}
                  x2={labelX}
                  y1={positive ? Math.max(24, barY - 6) : barY + barHeight + 6}
                  y2={labelY + (positive ? 3 : -3)}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              ) : null}
              {showLabel ? (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  data-label-size={
                    monthly ? "x-readable-key-plus" : "x-readable-daily-plus"
                  }
                  className={`${monthly ? "text-[22px]" : "text-[23px]"} font-black tabular-nums`}
                  style={{
                    fill: marked ? "#0f172a" : positive ? "#047857" : "#be123c",
                  }}
                >
                  {row.valueLabel || signedUsd(value)}
                </text>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={height - 9}
                textAnchor="middle"
                className={`${row.isLatest ? "fill-slate-900" : "fill-slate-500"} ${monthly ? "text-[15px]" : "text-[17px]"} font-bold tabular-nums`}
              >
                {monthly
                  ? String(row.date || row.name).slice(8)
                  : String(row.date || row.name).slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  function IssuerList({ title }: { title: string }) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-slate-100/70 p-5">
        <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {title}
        </div>
        <div className="grid gap-3">
          {issuerRows.map((row: any, index: number) => (
            <div key={`${row.ticker || row.name}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-black text-slate-950">
                  <span className="whitespace-nowrap">
                    {row.ticker || row.name}
                  </span>{" "}
                  <span className="truncate font-medium text-slate-400">
                    {row.name}
                  </span>
                </span>
                <span
                  className={
                    Number(row.value) >= 0
                      ? "shrink-0 whitespace-nowrap text-right font-black tabular-nums text-emerald-600"
                      : "shrink-0 whitespace-nowrap text-right font-black tabular-nums text-rose-600"
                  }
                >
                  {signedUsd(row.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${Number(row.value) >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                  style={{
                    width: `${Math.max(5, (Math.abs(Number(row.value) || 0) / maxAbsIssuer) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      id="share-card"
      className="relative rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-[76%]">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
            Capital Flows · BTC ETF
          </p>
          <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-5xl">
            {data.title}
          </h2>
          <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
            {data.subtitle}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">
          {brand.shortName}
        </div>
      </div>

      {daily ? (
        <div className="mt-6 grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <HeroMetric />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {supportMetrics.map((metric) => (
                <MiniMetric key={metric.label} metric={metric} />
              ))}
            </div>
          </div>
          <IssuerList title="Latest Issuer Flows" />
        </div>
      ) : null}

      {weekly ? (
        <>
          <div
            data-metric-row="compact"
            data-metric-row-variant="weekly-equal"
            className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-4"
          >
            {data.headlineMetrics.map((metric: any, index: number) => {
              const card = (data.series.cards || []).find(
                (item: any) => item.label === metric.label,
              );
              return (
                <MiniMetric
                  key={metric.label}
                  metric={metric}
                  sub={card?.date || null}
                  watermark={index === 0}
                />
              );
            })}
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-[1.18fr_0.62fr]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Last 5 Days
              </div>
              <FlowStrip />
            </div>
            <IssuerList title="Top Issuer Flows" />
          </div>
        </>
      ) : null}

      {monthly ? (
        <>
          <div
            data-metric-row="compact"
            data-metric-row-variant="monthly-equal"
            className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-4"
          >
            {data.headlineMetrics.map((metric: any, index: number) => {
              const card = (data.series.cards || []).find(
                (item: any) => item.label === metric.label,
              );
              return (
                <MiniMetric
                  key={metric.label}
                  metric={metric}
                  sub={card?.date || null}
                  watermark={index === 0}
                />
              );
            })}
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-[1.28fr_0.52fr]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                This Month
              </div>
              <FlowStrip monthly />
            </div>
            <IssuerList title="Top Issuer Flows" />
          </div>
        </>
      ) : null}

      <div className="mt-7 rounded-[24px] bg-slate-50 p-5 text-slate-700">
        <p className="text-sm font-medium leading-7 md:text-base">
          <span className="font-black text-slate-950">Learn note:</span>{" "}
          {data.insights.slice(0, 3).join(" ")}
        </p>
      </div>
      <div className="mt-7 grid gap-3 text-xs font-bold text-slate-400 md:grid-cols-[1fr_2fr] md:items-end">
        <span>
          {brand.cardFooterText} ·{" "}
          <span className="font-black text-slate-950">
            {brand.createdWithText}
          </span>
        </span>
        <span className="md:text-right">
          Source: {cleanSource} · Updated:{" "}
          <span className="font-black text-slate-700">
            {data.freshness.lastUpdatedAt
              ? new Date(data.freshness.lastUpdatedAt).toLocaleString("en-US", {
                  timeZone: "UTC",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })
              : "-"}
          </span>
        </span>
      </div>
    </div>
  );
}

function ChainLogo({
  name,
  logo,
  logoCandidates,
}: {
  name: string;
  logo?: string | null;
  logoCandidates?: string[];
  compact: boolean;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(
    () =>
      getChainLogoCandidates(
        name,
        logoCandidates?.length ? logoCandidates : logo,
      ),
    [name, logo, logoCandidates],
  );
  const candidate = candidates[candidateIndex];

  if (!candidate) return <>{getInitials(name)}</>;

  return (
    <img
      src={candidate.src}
      alt={`${name} logo`}
      className="h-full w-full"
      style={{
        objectFit: candidate.fit,
        padding: candidate.padding,
        transform: `scale(${candidate.scale})`,
      }}
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}

export function ShareCard({
  brand,
  rows,
  updatedAt,
  source,
  title,
  eyebrow,
  description,
  insight,
  valueFormat = "usd",
  valueSuffix = "",
  valueDirection = "higher",
  etfSnapshot,
}: {
  brand: PublicBrandSettings;
  rows: ChainRevenueRow[];
  updatedAt: string;
  source: string;
  title: string;
  eyebrow: string;
  description: string;
  insight: string;
  valueFormat?: "usd" | "number";
  valueSuffix?: string;
  valueDirection?: "higher" | "lower";
  etfSnapshot?: ChartSnapshot | null;
}) {
  if (etfSnapshot) return <BtcEtfShareCard brand={brand} data={etfSnapshot} />;

  const leader = rows[0];
  const count = rows.length;
  const hasChainColumn = rows.some((row) => Boolean(row.chain));

  return (
    <div
      id="share-card"
      className="card-grid-bg relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10"
    >
      <div className="absolute right-8 top-8 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">
        {brand.shortName}
      </div>

      <div className="max-w-[74%]">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className={titleSizeClass(count)}>{title}</h2>
        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-500">
          {description}
        </p>
      </div>

      <div className={rowLayoutClass(count)}>
        {rows.map((row) => {
          const compact = count > 10;
          const width = barWidth(row.value, leader?.value, valueDirection);
          const valueLabel =
            valueFormat === "number"
              ? formatNumber(row.value, valueSuffix)
              : formatUsd(row.value);
          return (
            <div
              key={`${row.name}-${row.chain ?? ""}`}
              className={
                hasChainColumn
                  ? "grid grid-cols-[34px_minmax(126px,170px)_1fr_104px_72px] items-center gap-3 md:grid-cols-[36px_176px_1fr_118px_86px]"
                  : "grid grid-cols-[34px_minmax(128px,170px)_1fr_104px] items-center gap-3 md:grid-cols-[36px_190px_1fr_120px]"
              }
            >
              <div className="text-right text-sm font-black text-slate-400">
                {row.rank}
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`${compact ? "h-6 w-6" : "h-7 w-7"} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500`}
                >
                  <ChainLogo
                    name={row.name}
                    logo={row.logo}
                    logoCandidates={row.logoCandidates}
                    compact={compact}
                  />
                </div>
                <div
                  className={`${compact ? "text-sm" : "text-base"} truncate font-black text-slate-950`}
                >
                  {row.name}
                </div>
              </div>
              <div
                className={`${compact ? "h-2.5" : "h-3.5"} rounded-full bg-slate-100`}
              >
                <div
                  className={`${compact ? "h-2.5" : "h-3.5"} rounded-full bg-slate-950`}
                  style={{ width }}
                />
              </div>
              <div className="text-right text-sm font-black text-slate-950 md:text-base">
                {valueLabel}
              </div>
              {hasChainColumn && (
                <div className="truncate text-right text-xs font-black text-slate-400 md:text-sm">
                  {row.chain}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-9 rounded-[24px] bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-sm font-medium leading-7 text-slate-200 md:text-base">
          <span className="font-black text-white">Learn note:</span> {insight}
        </p>
      </div>

      <div className="mt-7 grid gap-3 text-xs font-bold text-slate-400 md:grid-cols-[1fr_2fr] md:items-end">
        <span>
          {brand.cardFooterText} ·{" "}
          <span className="font-black text-slate-950">
            {brand.createdWithText}
          </span>
        </span>
        <span className="md:text-right">
          Data: {source} · Updated:{" "}
          <span className="font-black text-slate-700">{updatedAt}</span>
        </span>
      </div>
    </div>
  );
}
