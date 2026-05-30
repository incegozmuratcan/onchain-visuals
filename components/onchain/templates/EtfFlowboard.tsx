"use client";

import { useMemo, useState } from "react";
import { getChainIdentity } from "@/lib/chainLogos";

const usd = (v: any) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
const signedUsd = (v: any) => `${Number(v) >= 0 ? "+" : ""}${usd(v)}`;
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
const toneClass = (value: any) =>
  Number(value) >= 0 ? "text-emerald-700" : "text-rose-700";
const labelParts = (label?: string) => {
  const parts = String(label || "NET FLOW").split(" ");
  return {
    date: parts.length > 2 ? parts.slice(0, 2).join(" ") : parts[0],
    suffix:
      parts.length > 2
        ? parts.slice(2).join(" ")
        : parts.slice(1).join(" ") || "NET FLOW",
  };
};

function BtcLogoWatermark() {
  const [hidden, setHidden] = useState(false);
  const candidate = useMemo(() => {
    const manifest = getChainIdentity("Bitcoin").manifest;

    if (
      !manifest?.localPath ||
      manifest.quality !== "approved" ||
      manifest.localPath.startsWith("/api/")
    ) {
      return null;
    }

    return {
      src: manifest.localPath,
      fit: manifest.fit,
      padding: manifest.padding,
      scale: manifest.scale,
    };
  }, []);

  if (!candidate || hidden) return null;

  return (
    <div
      data-testid="btc-logo-treatment"
      data-logo-mode="watermark"
      className="pointer-events-none absolute -right-7 top-1/2 h-44 w-44 -translate-y-1/2 opacity-[0.18] saturate-[1.35] contrast-[1.04]"
      aria-hidden="true"
    >
      <img
        src={candidate.src}
        alt=""
        className="h-full w-full"
        style={{
          objectFit: candidate.fit,
          padding: candidate.padding,
          transform: `scale(${candidate.scale}) rotate(-10deg)`,
        }}
        onError={() => setHidden(true)}
      />
    </div>
  );
}

function BtcMetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div className="flex min-h-[70px] self-start flex-col justify-start rounded-[1.15rem] border border-zinc-200 bg-zinc-100/70 px-3.5 py-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 min-w-0">
        <div className="truncate text-[1.35rem] font-semibold leading-none tracking-[-0.05em] text-zinc-950">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 truncate text-[11px] font-medium text-zinc-500">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BtcHeroMetric({ hero }: { hero: any }) {
  const heroLabel = labelParts(hero?.label);
  return (
    <div className="relative min-h-[132px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-100/85 p-5 shadow-sm">
      <BtcLogoWatermark />
      <div className="relative z-10 min-w-0">
        <div
          data-hero-label-primary={heroLabel.date}
          className="text-xl font-semibold uppercase leading-none tracking-[-0.02em] text-zinc-950"
        >
          {heroLabel.date}
        </div>
        <div
          data-hero-label-secondary={heroLabel.suffix}
          className="mt-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-zinc-500"
        >
          {heroLabel.suffix}
        </div>
      </div>
      <div
        className={`relative z-10 mt-6 truncate text-5xl font-semibold leading-none tracking-[-0.06em] ${toneClass(hero?.value)}`}
      >
        {hero?.formattedValue}
      </div>
    </div>
  );
}

function SignedFlowChart({
  rows,
  monthly = false,
}: {
  rows: any[];
  monthly?: boolean;
}) {
  const width = monthly ? 860 : 780;
  const height = monthly ? 460 : 380;
  const margin = monthly
    ? { top: 58, right: 16, bottom: 42, left: 38 }
    : { top: 56, right: 16, bottom: 44, left: 38 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxAbs = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.value) || 0)),
  );
  const paddedMax = maxAbs * (monthly ? 1.04 : 1.05);
  const zeroY = margin.top + plotHeight / 2;
  const slot = rows.length ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.max(
    monthly ? 22 : 78,
    Math.min(monthly ? 48 : 122, slot * (monthly ? 0.76 : 0.78)),
  );
  const valueToY = (value: number) =>
    margin.top + ((paddedMax - value) / (paddedMax * 2)) * plotHeight;
  const labeledIndexes = rows
    .map((row, index) => (row.showLabel ? index : -1))
    .filter((index) => index >= 0);
  const labelPositions = new Map<number, number>();
  if (monthly) {
    let previousX = -Infinity;
    for (const index of labeledIndexes) {
      const naturalX = margin.left + slot * index + slot / 2;
      const nextX = Math.max(naturalX, previousX + 108);
      const clampedX = Math.min(width - margin.right - 36, nextX);
      labelPositions.set(index, clampedX);
      previousX = clampedX;
    }
  }
  const labelTone = (value: number, marked: boolean) =>
    marked ? "#18181b" : value >= 0 ? "#047857" : "#be123c";

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
        stroke="#a1a1aa"
        strokeWidth="1.25"
      />
      <text
        x={margin.left - 8}
        y={zeroY + 4}
        textAnchor="end"
        className="fill-zinc-400 text-[12px] font-semibold"
      >
        $0
      </text>
      {rows.map((row, index) => {
        const value = Number(row.value) || 0;
        const positive = value >= 0;
        const y = valueToY(value);
        const x = margin.left + slot * index + slot / 2 - barWidth / 2;
        const barY = positive ? y : zeroY;
        const rawHeight = Math.abs(zeroY - y);
        const barHeight = Math.max(monthly ? 16 : 30, rawHeight);
        const marked =
          row.isLargest || row.isLargestInflow || row.isLargestOutflow;
        const showLabel = !monthly || row.showLabel;
        const labelY = positive
          ? Math.max(22, barY - 12)
          : Math.min(height - margin.bottom - 6, barY + barHeight + 22);
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
                stroke="#d4d4d8"
                strokeWidth="1"
              />
            ) : null}
            {showLabel ? (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                data-label-size={monthly ? "x-readable-key" : "x-readable-daily"}
                className={`fill-current ${monthly ? "text-[15px]" : "text-[17px]"} font-bold tabular-nums`}
                style={{ color: labelTone(value, Boolean(marked)) }}
              >
                {row.valueLabel || signedUsd(value)}
              </text>
            ) : null}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className={`${row.isLatest ? "fill-zinc-900" : "fill-zinc-500"} ${monthly ? "text-[13px]" : "text-[15px]"} font-semibold tabular-nums`}
            >
              {monthly
                ? String(row.date || row.name).slice(8)
                : shortDate(row.date || row.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Leaderboard({
  rows,
  maxRows,
  title,
  description,
  showRank = true,
}: {
  rows: any[];
  maxRows: number;
  title: string;
  description?: string;
  showRank?: boolean;
}) {
  const visible = rows
    .filter((row: any) => Number(row.value) !== 0)
    .slice(0, maxRows);
  const maxAbs = Math.max(
    1,
    ...visible.map((row: any) => Math.abs(Number(row.value) || 0)),
  );
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-100/70 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-2.5">
        {visible.map((row: any, index: number) => (
          <div
            key={`${row.ticker || row.name}-${index}`}
            className="rounded-2xl border border-zinc-200/70 bg-white/88 px-3.5 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-sm font-semibold text-zinc-950">
                {showRank ? (
                  <span className="mr-2 text-zinc-400">{index + 1}</span>
                ) : null}
                <span className="whitespace-nowrap">
                  {row.ticker || row.name}
                </span>
                {row.name && row.ticker ? (
                  <span className="ml-1 truncate font-medium text-zinc-400">
                    {row.name}
                  </span>
                ) : null}
              </div>
              <div
                className={`shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums ${toneClass(row.value)}`}
              >
                {signedUsd(row.value)}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200">
              <div
                className={`h-1.5 rounded-full ${Number(row.value) >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                style={{
                  width: `${Math.max(4, (Math.abs(Number(row.value) || 0) / maxAbs) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EtfFlowboard({ data }: { data: any }) {
  const view = data.metadata?.view || "daily";
  const daily = view === "daily";
  const weekly = view === "weekly";
  const monthly = view === "monthly";
  const metrics = data.headlineMetrics || [];
  const hero = metrics[0];
  const supportMetrics = daily ? metrics.slice(1, 3) : metrics.slice(1, 4);
  const bars = data.series?.bars || [];
  const issuerRows = (data.series?.tables || []).filter(
    (row: any) => Number(row.value) !== 0,
  );

  return (
    <div className="space-y-5">
      {daily ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <BtcHeroMetric hero={hero} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {supportMetrics.map((metric: any) => (
                <BtcMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.formattedValue}
                />
              ))}
            </div>
          </div>
          <Leaderboard
            rows={issuerRows}
            maxRows={5}
            title="Latest Issuer Flows"
            showRank={false}
          />
        </div>
      ) : null}

      {weekly ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.02fr_2fr] lg:items-center">
            <BtcHeroMetric hero={hero} />
            <div data-metric-row="compact" className="grid gap-2.5 sm:grid-cols-3 lg:self-center">
              {supportMetrics.map((metric: any) => {
                const card = data.series?.cards?.find(
                  (item: any) => item.label === metric.label,
                );
                return (
                  <BtcMetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.formattedValue}
                    sub={card?.date || null}
                  />
                );
              })}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.18fr_0.62fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Last 5 Days
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Inflows rise above zero; outflows extend below.
              </p>
              <div className="mt-3">
                <SignedFlowChart rows={bars} />
              </div>
            </div>
            <Leaderboard
              rows={issuerRows}
              maxRows={5}
              title="Top Issuer Flows"
            />
          </div>
        </>
      ) : null}

      {monthly ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.02fr_2fr] lg:items-center">
            <BtcHeroMetric hero={hero} />
            <div data-metric-row="compact" className="grid gap-2.5 sm:grid-cols-3 lg:self-center">
              {supportMetrics.map((metric: any) => {
                const card = data.series?.cards?.find(
                  (item: any) => item.label === metric.label,
                );
                return (
                  <BtcMetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.formattedValue}
                    sub={card?.date || null}
                  />
                );
              })}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.28fr_0.52fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                This Month
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Completed month-to-date daily net flows.
              </p>
              <div className="mt-3">
                <SignedFlowChart rows={bars} monthly />
              </div>
            </div>
            <Leaderboard
              rows={issuerRows}
              maxRows={5}
              title="Top Issuer Flows"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
