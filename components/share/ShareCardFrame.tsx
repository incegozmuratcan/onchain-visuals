import type { ReactNode, Ref } from "react";
import { formatShareUpdated, shareFooterCredit } from "@/lib/formatters";

export type ShareCardBrand = {
  shortName: string;
  cardFooterText: string;
  createdWithText: string;
};

export const defaultShareCardBrand: ShareCardBrand = {
  shortName: "Onchain Visuals",
  cardFooterText: "Source-backed DeFi market card",
  createdWithText: "Created with Onchain Visuals",
};

export { formatShareUpdated };

/**
 * Site share-card shell: category line, title, subtitle, brand pill, and footer.
 * Category bodies slot in as children so later cards can reuse the same chrome.
 */
export function ShareCardFrame({
  brand = defaultShareCardBrand,
  eyebrow,
  title,
  description,
  source,
  updatedAt,
  children,
  cardRef,
  density = "daily",
}: {
  brand?: ShareCardBrand;
  eyebrow: string;
  title: string;
  description: string;
  source: string;
  updatedAt?: string | null;
  children: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
  /** Weekly capture uses the v21 chrome so five day rows fit 1536×1134. Daily stays on the original spacing. */
  density?: "daily" | "weekly";
}) {
  const credit = shareFooterCredit(brand);
  const weekly = density === "weekly";
  return (
    <div
      ref={cardRef}
      id="share-card"
      role="region"
      aria-label={title}
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-white px-5 pb-8 pt-8 antialiased lg:px-12 ${
        weekly ? "lg:pb-8 lg:pt-11" : "lg:pb-[52px] lg:pt-[60px]"
      }`}
      style={{
        boxShadow: "0 8px 30px rgba(0,0,0,.08)",
        fontFeatureSettings: '"ss01" 1, "cv01" 1, "tnum" 1',
        lineHeight: "normal",
      }}
    >
      <div className="absolute right-5 top-6 rounded-full border-[1.5px] border-[#e3e5ea] bg-white px-3 py-2 text-[13px] font-extrabold text-[#111] lg:right-12 lg:top-[44px] lg:px-6 lg:py-3 lg:text-[20px]">
        {brand.shortName}
      </div>

      <p className="pr-24 text-[12px] font-bold uppercase tracking-[2px] text-[#8a8f99] lg:pr-0 lg:text-[17px] lg:tracking-[4px]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[32px] font-black leading-[0.95] tracking-[-0.055em] text-[#020617] lg:mt-[10px] lg:text-[48px]">
        {title}
      </h2>
      <p className="mt-2 text-[15px] font-normal text-[#7b808a] lg:mt-[10px] lg:text-[22px]">
        {description}
      </p>

      <div className={`mt-6 flex min-h-0 flex-1 flex-col ${weekly ? "lg:mt-[26px]" : "lg:mt-12"}`}>{children}</div>

      <div
        className={`mt-6 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[13px] text-[#9aa0a8] lg:text-[18px] ${
          weekly ? "lg:mt-[22px]" : "lg:mt-10"
        }`}
      >
        <span>
          {credit.prefix}
          <span className="font-bold text-[#111]">{credit.emphasis}</span>
        </span>
        <span className="inline-flex flex-wrap items-center">
          <span>Source: {source}</span>
          <span aria-hidden="true" className="mx-[7px] text-[18px] text-[#c4c8cd] lg:text-[22px]">
            ·
          </span>
          <span>
            Updated:{" "}
            <span className="font-bold text-[#111]">{formatShareUpdated(updatedAt)}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
