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


function signedUsd(value: number | string | null | undefined) {
  const numberValue = Number(value) || 0;
  return `${numberValue >= 0 ? "+" : ""}${formatUsd(numberValue)}`;
}

function BtcEtfShareCard({ brand, data }: { brand: PublicBrandSettings; data: ChartSnapshot }) {
  const view = data.metadata?.view || "daily";
  const daily = view === "daily";
  const weekly = view === "weekly";
  const monthly = view === "monthly";
  const issuerRows = (data.series.tables || []).slice(0, daily ? 5 : 8);
  const flowRows = (data.series.bars || []).slice(0, 5);
  const maxAbsIssuer = Math.max(1, ...issuerRows.map((row: any) => Math.abs(Number(row.value) || 0)));
  const maxAbsFlow = Math.max(1, ...flowRows.map((row: any) => Math.abs(Number(row.value) || 0)));
  const cleanSource = data.sourceLabel.replace(/^Source:\s*/i, "");
  const hero = data.headlineMetrics[0];
  const supportMetrics = daily ? data.headlineMetrics.slice(1, 4) : data.headlineMetrics.slice(0, 4);
  const hiddenIssuerCount = Number(data.metadata?.hiddenIssuerCount || 0);

  return (
    <div id="share-card" className="relative rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-[76%]">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Capital Flows · BTC ETF</p>
          <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-5xl">{data.title}</h2>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-500">{data.subtitle}</p>
          {data.metadata?.latestCompletedDate ? <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Latest completed row: <span className="text-slate-700">{data.metadata.latestCompletedDate}</span></p> : null}
        </div>
        <div className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">{brand.shortName}</div>
      </div>

      {daily ? (
        <div className="mt-8 grid gap-5 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Latest Net Flow</div>
            <div className={`mt-3 text-6xl font-black tracking-[-0.065em] ${Number(hero?.value) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{hero?.formattedValue}</div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {supportMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[18px] bg-white p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{metric.label}</div>
                  <div className="mt-1 text-base font-black tracking-[-0.03em] text-slate-950">{metric.formattedValue}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><span>5-day context</span><span>Latest highlighted</span></div>
            <div className="flex h-44 items-end gap-2">
              {flowRows.map((row: any) => {
                const value = Number(row.value) || 0;
                return <div key={row.date || row.name} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-xl ${value >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${Math.max(8, Math.abs(value) / maxAbsFlow * 164)}px`, opacity: row.isLatest ? 1 : 0.28 }} /><span className="text-[10px] font-bold text-slate-400">{String(row.date || row.name).slice(5)}</span></div>;
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {supportMetrics.map((metric) => (
            <div key={metric.label} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{metric.label}</div>
              <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.formattedValue}</div>
            </div>
          ))}
        </div>
      )}

      <div className={monthly ? "mt-7 rounded-[28px] border border-slate-200 bg-white p-5" : "mt-7 grid gap-5 md:grid-cols-[1fr_0.95fr]"}>
        {!monthly && weekly ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Five completed days</div>
            <div className="flex h-40 items-end gap-2">
              {flowRows.map((row: any) => {
                const value = Number(row.value) || 0;
                return <div key={row.date || row.name} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-xl ${value >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${Math.max(8, Math.abs(value) / maxAbsFlow * 150)}px`, opacity: 0.78 }} /><span className="text-[10px] font-bold text-slate-400">{String(row.date || row.name).slice(5)}</span></div>;
              })}
            </div>
          </div>
        ) : null}

        <div className={monthly ? "" : "rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white"}>
          <div className={`mb-4 text-xs font-black uppercase tracking-[0.18em] ${monthly ? "text-slate-400" : "text-slate-400"}`}>{daily ? "Issuer impact" : weekly ? "Weekly issuer net flow" : "Issuer monthly leaderboard"}</div>
          <div className="grid gap-3">
            {issuerRows.map((row: any, index: number) => (
              <div key={`${row.ticker || row.name}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className={`truncate font-black ${monthly ? "text-slate-950" : "text-white"}`}>{monthly ? `${index + 1}. ` : ""}{row.ticker || row.name} <span className={monthly ? "font-medium text-slate-400" : "font-medium text-slate-400"}>{row.name}</span></span><span className={Number(row.value) >= 0 ? "text-emerald-500" : "text-rose-500"}>{signedUsd(row.value)}</span></div>
                <div className={monthly ? "h-1.5 rounded-full bg-slate-100" : "h-1.5 rounded-full bg-white/10"}><div className={`h-1.5 rounded-full ${Number(row.value) >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${Math.max(5, Math.abs(Number(row.value) || 0) / maxAbsIssuer * 100)}%` }} /></div>
              </div>
            ))}
          </div>
          {hiddenIssuerCount > 0 ? <div className={monthly ? "mt-3 text-xs font-bold text-slate-400" : "mt-3 text-xs font-bold text-slate-400"}>+{hiddenIssuerCount} more issuers omitted for clarity.</div> : null}
        </div>
      </div>

      <div className="mt-7 rounded-[24px] bg-slate-50 p-5 text-slate-700">
        <p className="text-sm font-medium leading-7 md:text-base"><span className="font-black text-slate-950">Learn note:</span> {data.insights.slice(0, 3).join(" ")}</p>
      </div>

      <div className="mt-7 grid gap-3 text-xs font-bold text-slate-400 md:grid-cols-[1fr_2fr] md:items-end">
        <span>{brand.cardFooterText} · <span className="font-black text-slate-950">{brand.createdWithText}</span></span>
        <span className="md:text-right">Source: {cleanSource} · Updated: <span className="font-black text-slate-700">{data.freshness.lastUpdatedAt ? new Date(data.freshness.lastUpdatedAt).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "-"}</span></span>
      </div>
    </div>
  );
}

function ChainLogo({ name, logo, logoCandidates }: { name: string; logo?: string | null; logoCandidates?: string[]; compact: boolean }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidates = useMemo(() => getChainLogoCandidates(name, logoCandidates?.length ? logoCandidates : logo), [name, logo, logoCandidates]);
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
    <div id="share-card" className="card-grid-bg relative overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10">
      <div className="absolute right-8 top-8 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">
        {brand.shortName}
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
                  <ChainLogo name={row.name} logo={row.logo} logoCandidates={row.logoCandidates} compact={compact} />
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
        <span>{brand.cardFooterText} · <span className="font-black text-slate-950">{brand.createdWithText}</span></span>
        <span className="md:text-right">Data: {source} · Updated: <span className="font-black text-slate-700">{updatedAt}</span></span>
      </div>
    </div>
  );
}
