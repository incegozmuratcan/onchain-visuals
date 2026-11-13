"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { ExportButton, FreshnessBadge } from "../ChartShell";
import { WeeklyFlowboardCard } from "@/components/share/WeeklyFlowboardCard";
import type { ShareCardBrand } from "@/components/share/ShareCardFrame";

export function WeeklyFlowboard({
  data,
  capture = false,
  brand,
}: {
  data: any;
  capture?: boolean;
  brand?: ShareCardBrand;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function downloadCard() {
    const node = cardRef.current;
    if (!node) return;
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    const date = data?.metadata?.weekStart || data?.metadata?.latestCompletedDate || "latest";
    const link = document.createElement("a");
    link.download = `etf-weekly-flowboard-${date}.png`;
    link.href = dataUrl;
    link.click();
  }

  if (capture) {
    return (
      <div
        data-capture="share-card"
        className="m-0 box-border flex overflow-hidden"
        style={{ width: 1536, height: 1134, background: "#f3f4f7", padding: 36 }}
      >
        <div className="flex min-h-0 min-w-0 flex-1">
          <WeeklyFlowboardCard data={data} brand={brand} cardRef={cardRef} />
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FreshnessBadge status={data?.freshness?.status || data?.status || "missing"} />
        <ExportButton onClick={downloadCard} />
      </div>
      <WeeklyFlowboardCard data={data} brand={brand} cardRef={cardRef} />
    </section>
  );
}
