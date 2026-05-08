"use client";

import { useMemo, useState } from "react";
import { getChainLogoCandidates, getInitials } from "@/lib/chainLogos";
import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";

function rowLayoutClass(count: number) {
  if (count > 15) return "mt-6 grid gap-2";
  if (count > 10) return "mt-7 grid gap-2.5";
  return "mt-9 grid gap-3.5";
}

function titleSizeClass(count: number) {
  if (count > 15) return "mt-3 text-3xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-4xl";
  return "mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-5xl";
}

function barWidth(value: number, leaderValue?: number, direction: "higher" | "lower" = "higher") {
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

function ChainLogo({ name, logo }: { name: string; logo?: string | null; compact: boolean }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(() => getChainLogoCandidates(name, logo), [name, logo]);
  const src = candidates[candidateIndex];

  if (!src) return <>{getInitials(name)}</>;

  return (
    <img
      src={src}
      alt={`${name} logo`}
      className="h-full w-full object-cover"
      onError={() => setCandidateIndex((index) => index + 1)}
    />
  );
}

export function ShareCard({
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
}: {
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
}) {
  const leader = rows[0];
  const count = rows.length;
  const hasChainColumn = rows.some((row) => Boolean(row.chain));

  return (
    <div id="share-card" className="card-grid-bg relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10">
      <div className="absolute right-8 top-8 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">
        learnDeFi
      </div>

      <div className="max-w-[74%]">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
        <h2 className={titleSizeClass(count)}>{title}</h2>
        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-500">{description}</p>
      </div>

      <div className={rowLayoutClass(count)}>
        {rows.map((row) => {
          const compact = count > 10;
          const width = barWidth(row.value, leader?.value, valueDirection);
          const valueLabel = valueFormat === "number" ? formatNumber(row.value, valueSuffix) : formatUsd(row.value);
          return (
            <div key={`${row.name}-${row.chain ?? ""}`} className={hasChainColumn ? "grid grid-cols-[34px_minmax(126px,170px)_1fr_104px_72px] items-center gap-3 md:grid-cols-[36px_176px_1fr_118px_86px]" : "grid grid-cols-[34px_minmax(128px,170px)_1fr_104px] items-center gap-3 md:grid-cols-[36px_190px_1fr_120px]"}>
              <div className="text-right text-sm font-black text-slate-400">{row.rank}</div>
              <div className="flex min-w-0 items-center gap-3">
                <div className={`${compact ? "h-6 w-6" : "h-7 w-7"} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500`}>
                  <ChainLogo name={row.name} logo={row.logo} compact={compact} />
                </div>
                <div className={`${compact ? "text-sm" : "text-base"} truncate font-black text-slate-950`}>{row.name}</div>
              </div>
              <div className={`${compact ? "h-2.5" : "h-3.5"} rounded-full bg-slate-100`}>
                <div className={`${compact ? "h-2.5" : "h-3.5"} rounded-full bg-slate-950`} style={{ width }} />
              </div>
              <div className="text-right text-sm font-black text-slate-950 md:text-base">{valueLabel}</div>
              {hasChainColumn && <div className="truncate text-right text-xs font-black text-slate-400 md:text-sm">{row.chain}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-9 rounded-[24px] bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-sm font-medium leading-7 text-slate-200 md:text-base"><span className="font-black text-white">Learn note:</span> {insight}</p>
      </div>

      <div className="mt-7 grid gap-3 text-xs font-bold text-slate-400 md:grid-cols-[1fr_2fr] md:items-end">
        <span>Generated by <span className="font-black text-slate-950">learnDeFi</span></span>
        <span className="md:text-right">Data: {source} · Updated: <span className="font-black text-slate-700">{updatedAt}</span></span>
      </div>
    </div>
  );
}
