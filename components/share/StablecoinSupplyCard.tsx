"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import type { ChartSnapshot } from "@/lib/onchain/types";
import { allowedChainLogoUrl, chainInitialLetter, chainRevenueBarPercent, sanitizeChainName } from "@/lib/onchain/chainRevenueDaily";
import { ShareCardFrame, type ShareCardBrand } from "./ShareCardFrame";
import { chainRevenueInter } from "./chainRevenueFont";

type RankChange = { kind: "up" | "down" | "new"; places?: number };

type SupplyRow = {
  rank: number;
  slug: string;
  name: string;
  logo?: string | null;
  value?: number;
  formattedValue: string;
  formattedPercent: string;
  percentValue?: number | null;
  rankChange?: RankChange | null;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const LOGO_RING = "0 0 0 1.5px rgba(15,23,42,.07)";
const GREEN = "#127a45";
const RED = "#b0153f";
const ROW_GRID = "grid grid-cols-[34px_44px_330px_minmax(0,1fr)_196px_128px] items-center gap-x-5";

function dayParts(date?: string | null) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: "—", year: "" };
  return { day: `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`, year: match[1] };
}

function ChainLogo({ src, name, size }: { src?: string | null; name: string; size: number }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(!src);
  }, [src]);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  });
  if (failed || !src) {
    const letter = chainInitialLetter(name);
    return (
      <span
        data-chain-logo-fallback={name}
        aria-label={name}
        className="flex shrink-0 items-center justify-center rounded-full bg-[#dfe2e7] font-black leading-none text-[#5b616b]"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.44), boxShadow: LOGO_RING }}
      >
        {letter}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={name}
      width={size}
      height={size}
      data-chain-logo={name}
      onError={() => setFailed(true)}
      className="block shrink-0 rounded-full bg-white object-cover"
      style={{ width: size, height: size, boxShadow: LOGO_RING }}
    />
  );
}

function useFittedNames(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      await (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
      if (cancelled || !ref.current) return;
      for (const el of ref.current.querySelectorAll<HTMLElement>("[data-chain-name]")) {
        el.style.fontSize = "";
        let size = parseFloat(getComputedStyle(el).fontSize);
        const min = Math.floor(size * 0.75);
        while (el.scrollWidth > el.clientWidth + 0.5 && size > min) {
          size -= 1;
          el.style.fontSize = `${size}px`;
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, ready };
}

function RankChangeBadge({ change }: { change: RankChange }) {
  const up = change.kind === "up";
  const down = change.kind === "down";
  return (
    <span
      data-rank-badge={change.kind}
      className="inline-flex h-[30px] w-fit flex-none items-center justify-center gap-[3px] whitespace-nowrap rounded-full bg-[#d5d9e0] px-[10px] text-[21px] font-bold leading-none"
    >
      {up ? <span style={{ color: GREEN }}>▲</span> : null}
      {down ? <span style={{ color: RED }}>▼</span> : null}
      <span className="text-[#1f2937]">{change.kind === "new" ? "NEW" : change.places}</span>
    </span>
  );
}

export function StablecoinSupplyCard({
  data,
  brand,
  cardRef,
}: {
  data: ChartSnapshot;
  brand?: ShareCardBrand;
  cardRef?: Ref<HTMLDivElement>;
}) {
  const rawRows = ((data.series?.bars || []) as SupplyRow[]).slice(0, 10);
  const barMax = Math.max(0, ...rawRows.map((row) => Number(row.value) || 0));
  const rows = rawRows.map((row) => ({
    ...row,
    name: sanitizeChainName(row.name),
    logo: allowedChainLogoUrl(row.logo),
    barPercent: chainRevenueBarPercent(Number(row.value) || 0, barMax),
  }));
  const meta = data.metadata || {};
  const leaderRaw = (meta.leader || null) as { slug?: string; name?: string; logo?: string | null } | null;
  const leader = leaderRaw
    ? { ...leaderRaw, name: sanitizeChainName(leaderRaw.name || ""), logo: allowedChainLogoUrl(leaderRaw.logo) }
    : null;
  const rose = meta.totalDirection !== "up";
  const gain = meta.highlightKind !== "loss";
  const fallbackDate = dayParts(meta.latestCompletedDate || data.date);
  const day = meta.panelDay ? String(meta.panelDay) : fallbackDate.day;
  const year = meta.panelDay ? String(meta.panelYear || "") : fallbackDate.year;
  const { ref: fitRef, ready } = useFittedNames([
    rows.map((row) => `${row.name}:${row.rankChange?.kind || ""}:${row.rankChange?.places || ""}`).join("|"),
  ]);
  const pillStyle = rose
    ? { background: "#f4e6ea", boxShadow: "inset 0 0 0 1.5px #e4c3cc", color: RED }
    : { background: "#d3ecdd", boxShadow: "inset 0 0 0 1.5px #a9d8bc", color: GREEN };
  const deltaColor = rose ? RED : GREEN;
  const signedHighlight = `${gain ? "+" : "-"}${String(meta.formattedHighlight || "").replace(/^[+-]/, "")}`;

  return (
    <div className={`${chainRevenueInter.className} flex h-full min-h-0 w-full min-w-0 flex-1`}>
      <ShareCardFrame
        cardRef={cardRef}
        brand={brand}
        density="weekly"
        eyebrow="Onchain Economy · Top 10 Chains"
        title={data.title || "Stablecoin Supply by Chain"}
        titleBadge={String(meta.titleBadge || "7D")}
        spacedFooterMeta
        description={data.subtitle || "Stablecoin supply sitting on each blockchain."}
        source={String(data.sourceLabel || "DefiLlama").replace(/^Source:\s*/i, "")}
        updatedAt={data.freshness?.lastUpdatedAt}
      >
        <section
          ref={fitRef}
          aria-label={`Stablecoin supply ${day} ${year}`}
          data-stablecoin-period={meta.periodStart || data.date}
          data-caption={String(meta.caption || "")}
          data-name-fit={ready ? "ready" : "pending"}
          className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#cfd4dc] bg-[#f5f6f8] px-8 pb-[34px] pt-9"
        >
          <div className="-mt-[10px] mb-[14px] flex items-baseline gap-[10px]">
            <span className="text-[30px] font-black leading-none tracking-[-0.02em] text-[#020617]">{day}</span>
            <span className="text-[18px] font-extrabold tracking-[0.02em] text-[#a7acb4]">{year}</span>
          </div>

          <div className="flex gap-4">
            <div
              data-chip="total"
              className="box-border flex h-[101px] w-[643px] shrink-0 items-center gap-4 overflow-hidden rounded-[14px] bg-[#e8eaee] px-[22px] py-4"
              style={{ boxShadow: "inset 0 0 0 1.5px #d3d6dc" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="text-[15px] font-extrabold uppercase tracking-[2px] text-[#6b7079]">
                    All Chains · Total Supply
                  </div>
                  <span
                    data-total-pct={String(meta.formattedTotalPercent || "")}
                    className="-my-1 inline-flex h-[26px] flex-none items-center whitespace-nowrap rounded-full px-[11px] text-[18px] font-extrabold leading-none tabular-nums tracking-[-0.02em]"
                    style={pillStyle}
                  >
                    {String(meta.formattedTotalPercent || "—")}
                  </span>
                </div>
                <div className="mt-[5px] flex items-center justify-between gap-[14px] whitespace-nowrap font-black tabular-nums tracking-[-0.03em] text-[#111]">
                  <span className="flex min-w-0 items-center gap-4">
                    <span data-total-revenue className="text-[36px] font-black tracking-[-0.03em] text-[#111]">
                      {String(meta.formattedTotal || "—")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[22px] font-bold leading-none" style={{ color: deltaColor }}>
                        {rose ? "▼" : "▲"}
                      </span>
                      <span
                        data-total-usd={String(meta.formattedTotalChange || "")}
                        className="text-[26px] font-extrabold leading-none tabular-nums tracking-[-0.03em]"
                        style={{ color: deltaColor }}
                      >
                        {String(meta.formattedTotalChange || "—")}
                      </span>
                    </span>
                  </span>
                  <span data-chain-count className="text-[22px] font-extrabold tracking-normal text-[#111]">
                    <b className="font-black">{meta.chainCount ?? "—"}</b> chains
                  </span>
                </div>
              </div>
            </div>
            <div
              data-chip="highlight"
              className="box-border flex h-[101px] w-[643px] shrink-0 items-center gap-4 overflow-hidden rounded-[14px] px-[22px] py-4"
              style={
                gain
                  ? { background: "#d3ecdd", boxShadow: "inset 0 0 0 1.5px #a9d8bc" }
                  : { background: "#f0d3db", boxShadow: "inset 0 0 0 1.5px #e1a7b7" }
              }
            >
              {leader ? <ChainLogo src={leader.logo} name={leader.name || ""} size={52} /> : null}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[15px] font-extrabold uppercase tracking-[2px]"
                  style={{ color: gain ? GREEN : RED }}
                >
                  {gain ? "Biggest Gain · Top 10" : "Biggest Loss · Top 10"}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-[14px] whitespace-nowrap">
                  <span data-leader-name className="min-w-0 overflow-hidden text-[28px] font-black text-[#111]">
                    {leader?.name || "—"}
                  </span>
                  <span
                    data-gain-usd={signedHighlight}
                    className="text-[36px] font-black tabular-nums tracking-[-0.03em]"
                    style={{ color: gain ? GREEN : RED }}
                  >
                    {signedHighlight}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ol className="mt-6 flex flex-auto flex-col justify-between">
            {rows.map((row) => {
              const up = Number(row.percentValue) > 0;
              const down = Number(row.percentValue) < 0;
              return (
                <li key={row.slug} data-chain-row={row.slug} className={`${ROW_GRID} h-[50px]`}>
                  <span className="text-right text-[25px] font-extrabold tabular-nums tracking-[-0.02em] text-[#6b7079]">
                    {row.rank}
                  </span>
                  <ChainLogo src={row.logo} name={row.name} size={44} />
                  <span className="flex w-full min-w-0 items-center justify-start gap-[10px]">
                    <span
                      data-chain-name={row.name}
                      className="block min-w-0 shrink overflow-hidden whitespace-nowrap text-[38px] font-extrabold leading-[1.2] tracking-[-0.035em] text-[#111]"
                    >
                      {row.name}
                    </span>
                    {row.rankChange ? <RankChangeBadge change={row.rankChange} /> : null}
                  </span>
                  <div data-bar-track={row.slug} className="h-3 rounded-[6px] bg-[#e8eaee]">
                    <div
                      data-chain-bar={row.slug}
                      className="h-3 rounded-[6px] bg-[#1b8f58]"
                      style={{ width: `${Math.max(0, Math.min(100, row.barPercent))}%` }}
                    />
                  </div>
                  <span
                    data-chain-amount={row.formattedValue}
                    className="whitespace-nowrap text-right text-[40px] font-extrabold leading-none tabular-nums tracking-[-0.03em] text-[#111]"
                  >
                    {row.formattedValue}
                  </span>
                  <span
                    data-chain-pct={row.formattedPercent}
                    className="whitespace-nowrap text-right text-[32px] font-extrabold leading-none tabular-nums tracking-[-0.03em]"
                    style={{ color: up ? GREEN : down ? RED : "#6b7079" }}
                  >
                    {row.formattedPercent}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </ShareCardFrame>
    </div>
  );
}
