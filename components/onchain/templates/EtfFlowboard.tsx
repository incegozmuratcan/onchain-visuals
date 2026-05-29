"use client";

import { useMemo, useState } from "react";
import { getChainLogoCandidates } from "@/lib/chainLogos";

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

function BtcLogoMark({ className = "h-16 w-16" }: { className?: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(() => getChainLogoCandidates("Bitcoin"), []);
  const candidate = candidates[candidateIndex];

  return (
    <div
      data-testid="btc-logo-treatment"
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white text-xs font-black text-zinc-500 shadow-sm`}
    >
      {candidate ? (
        <img
          src={candidate.src}
          alt="Bitcoin logo"
          className="h-full w-full"
          style={{
            objectFit: candidate.fit,
            padding: candidate.padding,
            transform: `scale(${candidate.scale})`,
          }}
          onError={() => setCandidateIndex((index) => index + 1)}
        />
      ) : (
        "BTC"
      )}
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
    <div className="flex min-h-[104px] flex-col justify-between rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[1.55rem] font-semibold tracking-[-0.05em] text-zinc-950">
          {value}
        </div>
        {sub ? (
          <div className="mt-1.5 truncate text-xs font-medium text-zinc-500">
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
    <div className="relative min-h-[190px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <BtcLogoMark className="h-[4.25rem] w-[4.25rem] opacity-95" />
        <div className="min-w-0 text-right">
          <div className="text-xl font-semibold uppercase tracking-[-0.02em] text-zinc-950">
            {heroLabel.date}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {heroLabel.suffix}
          </div>
        </div>
      </div>
      <div
        className={`mt-7 truncate text-6xl font-semibold tracking-[-0.06em] ${toneClass(hero?.value)}`}
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
  const maxAbs = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.value) || 0)),
  );
  const chartHeight = monthly ? 276 : 232;
  const halfHeight = monthly ? 118 : 96;
  return (
    <div className="relative" data-chart="signed-zero-baseline">
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-zinc-300" />
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-400">
        $0
      </div>
      <div
        className={`flex items-stretch ${monthly ? "gap-1" : "gap-3"}`}
        style={{ height: chartHeight }}
      >
        {rows.map((row) => {
          const value = Number(row.value) || 0;
          const positive = value >= 0;
          const height = Math.max(
            monthly ? 10 : 16,
            (Math.abs(value) / maxAbs) * halfHeight,
          );
          const marked =
            row.isLargest || row.isLargestInflow || row.isLargestOutflow;
          const showLabel = !monthly || row.showLabel;
          return (
            <div
              key={row.date || row.name}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="flex h-9 items-end justify-center">
                <span
                  className={`${showLabel ? (marked ? "text-zinc-950" : toneClass(value)) : "text-transparent"} text-[10px] font-semibold tabular-nums`}
                >
                  {showLabel ? row.valueLabel || signedUsd(value) : "·"}
                </span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-end">
                {positive ? (
                  <div
                    className={`w-full rounded-t-2xl ${marked ? "bg-emerald-600 shadow-[0_0_0_2px_rgba(16,185,129,0.14)]" : "bg-emerald-400/75"}`}
                    style={{ height }}
                  />
                ) : null}
              </div>
              <div className="h-px w-full bg-zinc-300" />
              <div className="flex flex-1 flex-col items-center justify-start">
                {!positive ? (
                  <div
                    className={`w-full rounded-b-2xl ${marked ? "bg-rose-600 shadow-[0_0_0_2px_rgba(244,63,94,0.14)]" : "bg-rose-400/75"}`}
                    style={{ height }}
                  />
                ) : null}
              </div>
              <span
                className={`mt-2 truncate text-[10px] font-semibold ${row.isLatest ? "text-zinc-900" : "text-zinc-400"}`}
              >
                {monthly
                  ? String(row.date || row.name).slice(8)
                  : shortDate(row.date || row.name)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-5 shadow-sm">
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
            className="rounded-2xl border border-zinc-100 bg-white px-3.5 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm font-semibold text-zinc-950">
                {showRank ? (
                  <span className="mr-2 text-zinc-400">{index + 1}</span>
                ) : null}
                <span>{row.ticker || row.name}</span>
                {row.name && row.ticker ? (
                  <span className="ml-1 font-medium text-zinc-400">
                    {row.name}
                  </span>
                ) : null}
              </div>
              <div
                className={`shrink-0 text-sm font-semibold tabular-nums ${toneClass(row.value)}`}
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
          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
            <BtcHeroMetric hero={hero} />
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
          <div className="grid gap-5 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Last 5 Days
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Inflows rise above zero; outflows extend below.
              </p>
              <div className="mt-5">
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
          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
            <BtcHeroMetric hero={hero} />
            {supportMetrics.map((metric: any) => (
              <BtcMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.formattedValue}
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                This Month
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Completed month-to-date daily net flows.
              </p>
              <div className="mt-5">
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
