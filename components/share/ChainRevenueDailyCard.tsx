"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import type { ChartSnapshot } from "@/lib/onchain/types";
import { allowedChainLogoUrl, sanitizeChainName } from "@/lib/onchain/chainRevenueDaily";
import { ShareCardFrame, type ShareCardBrand } from "./ShareCardFrame";
import { chainRevenueInter } from "./chainRevenueFont";

export type ChainRevenueRankChange = {
  kind: "up" | "down" | "new";
  places?: number;
};

export type ChainRevenueBar = {
  rank: number;
  slug: string;
  name: string;
  logo?: string | null;
  value: number;
  formattedValue: string;
  barPercent: number;
  share: number;
  rankChange?: ChainRevenueRankChange | null;
};

type Leader = {
  slug: string;
  name: string;
  logo?: string | null;
  share: number;
  formattedShare: string;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const LOGO_RING = "0 0 0 1.5px rgba(15,23,42,.07)";
const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function dayParts(date?: string | null) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: "—", year: "" };
  return { day: `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`, year: match[1] };
}

function initialOf(name: string) {
  return (String(name || "?").trim()[0] || "?").toUpperCase();
}

/**
 * DefiLlama chain icon with a neutral initial circle when the icon is missing
 * or fails to load. A failed image never leaves an empty hole on the card.
 */
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
    return (
      <span
        data-chain-logo-fallback={name}
        aria-label={name}
        className="flex shrink-0 items-center justify-center rounded-full bg-[#dfe2e7] font-black leading-none text-[#5b616b]"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.44), boxShadow: LOGO_RING }}
      >
        {initialOf(name)}
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

/**
 * Long chain names (Robinhood Chain, Hyperliquid L1) fit the 330px name column
 * at 38px. Anything wider steps down 1px at a time, to 75% at most, so it never
 * runs into the bar. data-name-fit flips to "ready" for the capture script.
 */
function useFittedNames(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      await (document as any).fonts?.ready;
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

/** Rank move versus the previous period. Daily rows omit this. The chip sits in the name column. */
function RankChangeBadge({ change }: { change: ChainRevenueRankChange }) {
  const up = change.kind === "up";
  const down = change.kind === "down";
  return (
    <span
      data-rank-badge={change.kind}
      className="inline-flex h-[30px] w-fit flex-none items-center justify-center gap-[3px] whitespace-nowrap rounded-full bg-[#d5d9e0] px-[10px] text-[21px] font-bold leading-none"
    >
      {up ? <span style={{ color: "#127a45" }}>▲</span> : null}
      {down ? <span style={{ color: "#b0153f" }}>▼</span> : null}
      <span className="text-[#1f2937]">{change.kind === "new" ? "NEW" : change.places}</span>
    </span>
  );
}

function ShareRing({ share }: { share: number }) {
  const arc = Math.max(0, Math.min(1, Number(share) || 0)) * RING_LENGTH;
  return (
    <svg className="block h-[52px] w-[52px] shrink-0" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r={RING_RADIUS} fill="none" stroke="#d5d9df" strokeWidth="7" />
      <circle
        cx="26"
        cy="26"
        r={RING_RADIUS}
        fill="none"
        stroke="#111"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${arc.toFixed(2)} ${RING_LENGTH.toFixed(2)}`}
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

const ROW_GRID = "grid grid-cols-[34px_44px_330px_minmax(0,1fr)_196px] items-center gap-x-5";

export function ChainRevenueDailyCard({
  data,
  brand,
  cardRef,
}: {
  data: ChartSnapshot;
  brand?: ShareCardBrand;
  cardRef?: Ref<HTMLDivElement>;
}) {
  const rows = ((data.series?.bars || []) as ChainRevenueBar[]).slice(0, 10).map((row) => ({
    ...row,
    name: sanitizeChainName(row.name),
    logo: allowedChainLogoUrl(row.logo),
  }));
  const meta = data.metadata || {};
  const rawLeader = (meta.leader || null) as Leader | null;
  const leader = rawLeader
    ? { ...rawLeader, name: sanitizeChainName(rawLeader.name), logo: allowedChainLogoUrl(rawLeader.logo) }
    : null;
  const fallbackDate = dayParts(meta.latestCompletedDate || data.date);
  const day = meta.panelDay ? String(meta.panelDay) : fallbackDate.day;
  const year = meta.panelDay ? String(meta.panelYear || "") : fallbackDate.year;
  const { ref: fitRef, ready } = useFittedNames([
    rows.map((row) => `${row.name}:${row.rankChange?.kind || ""}:${row.rankChange?.places || ""}`).join("|"),
  ]);

  return (
    <div className={`${chainRevenueInter.className} flex h-full min-h-0 w-full min-w-0 flex-1`}>
    <ShareCardFrame
      cardRef={cardRef}
      brand={brand}
      density="weekly"
      eyebrow="Onchain Economy · Top 10 Chains"
      title={data.title || "Chain Revenue"}
      titleBadge={String(meta.titleBadge || "24H")}
      spacedFooterMeta
      description={
        data.subtitle || "Revenue captured by the blockchains themselves on the latest completed UTC day."
      }
      source={String(data.sourceLabel || "DefiLlama").replace(/^Source:\s*/i, "")}
      updatedAt={data.freshness?.lastUpdatedAt}
    >
      <section
        ref={fitRef}
        aria-label={`Chain revenue ${day} ${year}`}
        data-chain-revenue-day={meta.latestCompletedDate || data.date}
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
            className="flex min-w-0 flex-1 items-center gap-4 rounded-[14px] bg-[#d3ecdd] px-[22px] py-4"
            style={{ boxShadow: "inset 0 0 0 1.5px #a9d8bc" }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold uppercase tracking-[2px] text-[#2f6e4d]">
                All Chains · Total Revenue
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-[14px] whitespace-nowrap text-[28px] font-black tabular-nums tracking-[-0.03em] text-[#111]">
                <span data-total-revenue className="text-[36px] font-black tracking-[-0.03em] text-[#0f6e3d]">
                  {meta.formattedTotal || "—"}
                </span>
                <span data-chain-count className="text-[22px] font-extrabold tracking-normal text-[#111]">
                  <b className="font-black">{meta.chainCount ?? "—"}</b> chains
                </span>
              </div>
            </div>
          </div>
          <div
            data-chip="leader-share"
            className="flex min-w-0 flex-1 items-center gap-4 rounded-[14px] bg-[#e8eaee] px-[22px] py-4"
            style={{ boxShadow: "inset 0 0 0 1.5px #d3d6dc" }}
          >
            {leader ? <ChainLogo src={leader.logo} name={leader.name} size={52} /> : null}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold uppercase tracking-[2px] text-[#6b7079]">
                #1 Share · Of All Chains
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-[14px] whitespace-nowrap text-[28px] font-black tabular-nums tracking-[-0.03em] text-[#111]">
                <span data-leader-name className="min-w-0 overflow-hidden">{leader?.name || "—"}</span>
                <span data-leader-share className="text-[32px] font-black tracking-[-0.03em] text-[#111]">
                  {leader?.formattedShare || "—"}
                </span>
              </div>
            </div>
            {leader ? <ShareRing share={leader.share} /> : null}
          </div>
        </div>

        <ol className="mt-6 flex flex-auto flex-col justify-between">
          {rows.map((row) => (
            <li key={row.slug} data-chain-row={row.slug} className={`${ROW_GRID} h-[50px]`}>
              <span className="text-right text-[25px] font-extrabold tabular-nums tracking-[-0.02em] text-[#6b7079]">
                {row.rank}
              </span>
              <ChainLogo src={row.logo} name={row.name} size={44} />
              <span className="flex w-full min-w-0 items-center justify-start gap-[10px]">
                <span
                  data-chain-name={row.name}
                  className="block min-w-0 shrink overflow-hidden whitespace-nowrap text-[38px] font-extrabold leading-none tracking-[-0.035em] text-[#111]"
                >
                  {row.name}
                </span>
                {row.rankChange ? <RankChangeBadge change={row.rankChange} /> : null}
              </span>
              <div data-bar-track={row.slug} className="h-3 rounded-[6px] bg-[#e8eaee]">
                <div
                  data-chain-bar={row.slug}
                  className="h-3 rounded-[6px] bg-[#1b8f58]"
                  style={{ width: `${Math.max(0, Math.min(100, Number(row.barPercent) || 0))}%` }}
                />
              </div>
              <span
                data-chain-amount={row.formattedValue}
                className="whitespace-nowrap text-right text-[40px] font-extrabold leading-none tabular-nums tracking-[-0.03em] text-[#111]"
              >
                {row.formattedValue}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </ShareCardFrame>
    </div>
  );
}
