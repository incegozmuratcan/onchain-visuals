import type { ReactNode, Ref } from "react";

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

export function formatShareUpdated(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

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
}: {
  brand?: ShareCardBrand;
  eyebrow: string;
  title: string;
  description: string;
  source: string;
  updatedAt?: string | null;
  children: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      id="share-card"
      role="region"
      aria-label={title}
      className="card-grid-bg relative w-full overflow-hidden rounded-[34px] border border-slate-200 bg-white p-8 shadow-soft md:p-10"
    >
      <div className="absolute right-8 top-8 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black tracking-[-0.02em] text-slate-950 shadow-sm">
        <img
          src="/logos/bitcoin.svg"
          alt=""
          className="mr-2 inline h-4 w-4"
          aria-hidden="true"
        />
        {brand.shortName}
      </div>

      <div className="max-w-[74%]">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-8">{children}</div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 text-xs font-bold text-slate-400">
        <span>
          {brand.cardFooterText} ·{" "}
          <span className="whitespace-nowrap font-black text-slate-950">{brand.createdWithText}</span>
        </span>
        <span>
          Source: {source} · Updated:{" "}
          <span className="font-black text-slate-700">{formatShareUpdated(updatedAt)}</span>
        </span>
      </div>
    </div>
  );
}
