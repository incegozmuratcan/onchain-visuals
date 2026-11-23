"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import type { ChartSnapshot } from "@/lib/onchain/types";
import { allowedChainLogoUrl, chainInitialLetter, sanitizeChainName } from "@/lib/onchain/chainRevenueDaily";
import { ShareCardFrame, type ShareCardBrand } from "./ShareCardFrame";
import { chainRevenueInter } from "./chainRevenueFont";

type RankChange = { kind: "up" | "down" | "new"; places?: number };

type SupplyRow = {
  rank: number;
  slug: string;
  name: string;
  logo?: string | null;
  formattedValue: string;
  formattedPercent: string;
  percentValue?: number | null;
  rankChange?: RankChange | null;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const LOGO_RING = "0 0 0 1.5px rgba(15,23,42,.07)";
const GREEN = "#127a45";
const RED = "#b0153f";
const ROW_GRID = "grid grid-cols-[34px_44px_minmax(0,1fr)_220px_128px] items-center gap-x-5";

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

function SummaryBox({
  tone,
  children,
  chip,
}: {
  tone: "grey" | "gain" | "loss";
  chip: string;
  children: ReactNode;
}) {
  const palette = {
    grey: { background: "#e8eaee", border: "#d3d6dc" },
    gain: { background: "#d3ecdd", border: "#a9d8bc" },
    loss: { background: "#f0d3db", border: "#e1a7b7" },
  }[tone];
  return (
    <div
      data-chip={chip}
      className="box-border flex h-[101px] w-[643px] shrink-0 flex-col justify-center overflow-hidden rounded-[14px] px-[18px]"
      style={{ background: palette.background, boxShadow: `inset 0 0 0 1.5px ${palette.border}` }}
    >
      {children}
    </div>
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
  const rows = ((data.series?.bars || []) as SupplyRow[]).slice(0, 10).map((row) => ({
    ...row,
    name: sanitizeChainName(row.name),
    logo: allowedChainLogoUrl(row.logo),
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
  const amountColor = rose ? RED : GREEN;
  const pillStyle = rose
    ? { background: "#f0d3db", color: RED }
    : { background: "#d3ecdd", color: GREEN };
  const highlightColor = gain ? GREEN : RED;

  return (
    <div className={`${chainRevenueInter.className} flex h-full min-h-0 w-full min-w-0 flex-1`}>
      <ShareCardFrame
        cardRef={cardRef}
        brand={brand}
        density="weekly"
        eyebrow="Onchain Economy · Top 10 Chains"
        title={data.title || "Stablecoin Supply"}
        titleBadge={String(meta.titleBadge || "7D")}
        spacedFooterMeta
        description={data.subtitle || "Stablecoin supply by chain."}
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

          <div className="flex gap-[18px]">
            <SummaryBox tone="grey" chip="total">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[1.6px] text-[#6b7079]">
                    All Chains · Total Supply
                  </span>
                  <span
                    data-total-percent
                    className="inline-flex h-[26px] items-center rounded-full px-[8px] text-[18px] font-bold leading-none"
                    style={pillStyle}
                  >
                    {String(meta.formattedTotalPercent || "—")}
                  </span>
                </div>
                <span data-chain-count className="shrink-0 text-[18px] font-extrabold text-[#111]">
                  <b className="font-black">{meta.chainCount ?? "—"}</b> chains
                </span>
              </div>
              <div
                data-total-supply
                className="mt-[2px] text-[36px] font-black leading-none tabular-nums tracking-[-0.03em] text-[#111]"
              >
                {String(meta.formattedTotal || "—")}
              </div>
              <div
                data-total-change
                className="mt-[6px] text-[26px] font-bold leading-none tabular-nums tracking-[-0.02em]"
                style={{ color: amountColor }}
              >
                {rose ? "▼" : "▲"} {String(meta.formattedTotalChange || "—")}
              </div>
            </SummaryBox>
            <SummaryBox tone={gain ? "gain" : "loss"} chip="highlight">
              <div
                className="text-[13px] font-extrabold uppercase tracking-[1.6px]"
                style={{ color: highlightColor }}
              >
                {gain ? "Biggest Gain · Top 10" : "Biggest Loss · Top 10"}
              </div>
              <div className="mt-[6px] flex items-center gap-3">
                {leader ? <ChainLogo src={leader.logo} name={leader.name || ""} size={40} /> : null}
                <div className="min-w-0">
                  <div
                    data-highlight-name
                    className="truncate text-[28px] font-black leading-[1.2] tracking-[-0.03em]"
                    style={{ color: highlightColor }}
                  >
                    {leader?.name || "—"}
                  </div>
                  <div
                    data-highlight-amount
                    className="text-[26px] font-bold leading-none tabular-nums tracking-[-0.02em]"
                    style={{ color: highlightColor }}
                  >
                    {String(meta.formattedHighlight || "—")}
                  </div>
                </div>
              </div>
            </SummaryBox>
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
                  <span className="whitespace-nowrap text-right text-[34px] font-extrabold leading-[1.2] tabular-nums tracking-[-0.03em] text-[#111]">
                    {row.formattedValue}
                  </span>
                  <span
                    data-chain-percent={row.formattedPercent}
                    className="whitespace-nowrap text-right text-[28px] font-extrabold leading-[1.2] tabular-nums tracking-[-0.03em]"
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
