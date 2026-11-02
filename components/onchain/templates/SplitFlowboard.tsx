"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { ExportButton, FreshnessBadge } from "../ChartShell";
import { SplitFlowboardCard } from "@/components/share/SplitFlowboardCard";
import type { ShareCardBrand } from "@/components/share/ShareCardFrame";

export function SplitFlowboard({
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
    const date = data?.metadata?.latestCompletedDate || "latest";
    const link = document.createElement("a");
    link.download = `etf-daily-flowboard-${date}.png`;
    link.href = dataUrl;
    link.click();
  }

  if (capture) {
    return (
      <div
        data-capture="share-card"
        className="m-0 flex items-center justify-center overflow-hidden bg-[#f7f8fb] p-10"
        style={{ width: 1536, height: 1024 }}
      >
        <div className="w-full">
          <SplitFlowboardCard data={data} brand={brand} cardRef={cardRef} />
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
      <SplitFlowboardCard data={data} brand={brand} cardRef={cardRef} />
    </section>
  );
}
