"use client";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

export type ExportFormat =
  | "1600x900"
  | "1200x1200"
  | "1080x1350"
  | "1440x1080"
  | "1536x1024";
export const EXPORT_DIMENSIONS: Record<
  ExportFormat,
  { width: number; height: number }
> = {
  "1600x900": { width: 1600, height: 900 },
  "1200x1200": { width: 1200, height: 1200 },
  "1080x1350": { width: 1080, height: 1350 },
  "1440x1080": { width: 1440, height: 1080 },
  "1536x1024": { width: 1536, height: 1024 },
};

export function ExportFormatSelector({
  value,
  onChange,
}: {
  value: ExportFormat;
  onChange: (value: ExportFormat) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExportFormat)}
      className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm"
    >
      <option>1600x900</option>
      <option>1200x1200</option>
      <option>1080x1350</option>
      <option>1440x1080</option>
      <option>1536x1024</option>
    </select>
  );
}
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm"
    >
      Export PNG
    </button>
  );
}

type PublishState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  url?: string;
};
export function FreshnessBadge({ status }: { status: string }) {
  const color =
    status === "fresh"
      ? "bg-emerald-100 text-emerald-800"
      : status === "source_config_required"
        ? "bg-amber-100 text-amber-800"
        : status === "source_error"
          ? "bg-rose-100 text-rose-800"
          : "bg-zinc-100 text-zinc-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function DatasetStatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-950">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}
export function InsightChips({ insights }: { insights: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {insights.slice(0, 4).map((i) => (
        <span
          key={i}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
        >
          {i}
        </span>
      ))}
    </div>
  );
}
export function SourceFooter({
  sourceLabel,
  sourceUrl,
  lastUpdatedAt,
}: {
  sourceLabel: string;
  sourceUrl?: string | null;
  lastUpdatedAt?: string | null;
}) {
  const cleanSource = sourceLabel.replace(/^Source:\s*/i, "");
  return (
    <footer className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
      <span>
        {sourceUrl ? (
          <a href={sourceUrl} className="underline">
            Source: {cleanSource}
          </a>
        ) : (
          `Source: ${cleanSource}`
        )}
        {lastUpdatedAt ? (
          <span className="ml-3">
            Last updated{" "}
            {new Date(lastUpdatedAt).toLocaleString("en-US", {
              timeZone: "UTC",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </span>
        ) : null}
      </span>
      <span className="font-semibold text-zinc-700">Onchain Visuals</span>
    </footer>
  );
}
export function StaleDataNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {message}
    </div>
  );
}
export function StateCard({
  title,
  message,
  source,
  sourceUrl,
  missingConfig,
  tone = "zinc",
}: {
  title: string;
  message?: string | null;
  source?: string;
  sourceUrl?: string | null;
  missingConfig?: string[];
  tone?: "amber" | "rose" | "zinc";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-zinc-200 bg-zinc-50 text-zinc-900";
  return (
    <div className={`rounded-3xl border p-8 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
        Onchain Visual QA state
      </p>
      <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6">
        {message ||
          "This dataset is not currently publishable. No fake data is emitted."}
      </p>
      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-2xl bg-white/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            Source
          </div>
          <div className="mt-1 font-semibold">
            {source || "Configured source"}
          </div>
          {sourceUrl ? (
            <a
              className="mt-1 block truncate text-xs underline"
              href={sourceUrl}
            >
              {sourceUrl}
            </a>
          ) : null}
        </div>
        <div className="rounded-2xl bg-white/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            Data policy
          </div>
          <div className="mt-1 font-semibold">No fake data is emitted</div>
        </div>
        <div className="rounded-2xl bg-white/70 p-4">
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            Next action
          </div>
          <div className="mt-1 font-semibold">
            Fix source/config and refresh snapshot
          </div>
        </div>
      </div>
      {missingConfig?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {missingConfig.map((k) => (
            <code key={k} className="rounded bg-white px-2 py-1 text-xs">
              {k}
            </code>
          ))}
        </div>
      ) : null}
    </div>
  );
}
export function SourceConfigRequiredState({
  missingConfig,
  message,
}: {
  missingConfig: string[];
  message?: string | null;
}) {
  return (
    <StateCard
      title="Source configuration required"
      message={
        message ||
        "Configure the missing environment variables and run a refresh."
      }
      missingConfig={missingConfig}
      tone="amber"
    />
  );
}
export function SourceErrorState({ data }: { data: any }) {
  return (
    <StateCard
      title={
        data?.metadata?.chartType === "etf_flowboard" ||
        data?.datasetSlug?.includes("etf")
          ? "ETF source error"
          : "Source error"
      }
      message={
        data?.freshness?.message ||
        "The live source could not be fetched or parsed."
      }
      source={data?.freshness?.source || data?.sourceLabel}
      sourceUrl={data?.sourceUrl}
      tone="rose"
    />
  );
}
export function DisabledState({ data }: { data: any }) {
  return (
    <StateCard
      title="Dataset disabled / source required"
      message={
        data?.freshness?.message ||
        data?.warnings?.[0] ||
        "Dataset is disabled until a reliable source is configured."
      }
      source={data?.freshness?.source || data?.sourceLabel}
      missingConfig={data?.freshness?.missingConfig || []}
      tone="zinc"
    />
  );
}
export function PeriodSwitcher({
  periods,
  current,
}: {
  periods?: string[];
  current: string;
}) {
  return (
    <div className="flex gap-2">
      {(periods || [current]).map((p) => (
        <span
          key={p}
          className={`rounded-full px-3 py-1 text-xs ${p === current ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}
        >
          {p.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function btcExportDate(data: any) {
  return (
    data?.metadata?.latestCompletedDate ||
    data?.metadata?.latestCompletedDay ||
    data?.date ||
    new Date().toISOString().slice(0, 10)
  );
}

function btcDisplayDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

function btcExportFilename(data: any) {
  return `btc-etf-daily-flowboard-${btcExportDate(data)}.png`;
}

async function assertPngDimensions(
  dataUrl: string,
  expected: { width: number; height: number },
) {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (
        img.naturalWidth !== expected.width ||
        img.naturalHeight !== expected.height
      ) {
        reject(
          new Error(
            `Exported PNG dimensions were ${img.naturalWidth}x${img.naturalHeight}; expected ${expected.width}x${expected.height}.`,
          ),
        );
        return;
      }
      resolve();
    };
    img.onerror = () =>
      reject(new Error("Unable to validate exported PNG dimensions."));
    img.src = dataUrl;
  });
}

function shouldShowPublishControls() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("publish") === "1" || params.get("adminControls") === "1";
}

export function ChartShell({
  data,
  children,
}: {
  data: any;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const singleFormat = data?.datasetSlug === "btc-etf-flowboard";
  const defaultFormat = (data?.metadata?.defaultExportFormat ||
    (singleFormat ? "1536x1024" : "1600x900")) as ExportFormat;
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [publishControls, setPublishControls] = useState(false);
  const [publishSecret, setPublishSecret] = useState("");
  const [publishState, setPublishState] = useState<PublishState>({
    status: "idle",
  });
  useEffect(() => setPublishControls(shouldShowPublishControls()), []);
  const activeFormat = singleFormat ? defaultFormat : format;
  const dims = useMemo(() => EXPORT_DIMENSIONS[activeFormat], [activeFormat]);
  const renderPng = async () => {
    if (!ref.current) return null;
    const previousTransform = ref.current.style.transform;
    ref.current.style.transform = "none";
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: dims.width,
        height: dims.height,
        canvasWidth: dims.width,
        canvasHeight: dims.height,
        backgroundColor: singleFormat ? "#f5f8fb" : "#ffffff",
      });
      if (singleFormat) await assertPngDimensions(dataUrl, dims);
      return dataUrl;
    } finally {
      if (ref.current) ref.current.style.transform = previousTransform;
    }
  };
  const onExport = async () => {
    const dataUrl = await renderPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = singleFormat
      ? btcExportFilename(data)
      : `${data.datasetSlug}-${activeFormat}.png`;
    a.click();
  };
  const onShareX = async () => {
    if (!singleFormat || publishState.status === "loading") return;
    setPublishState({ status: "loading", message: "Rendering 1536×1024 PNG…" });
    try {
      const dataUrl = await renderPng();
      if (!dataUrl) throw new Error("Unable to render the Flowboard PNG.");
      setPublishState({ status: "loading", message: "Publishing to X…" });
      const response = await fetch("/api/x/publish-btc-etf-daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(publishSecret
            ? { Authorization: `Bearer ${publishSecret}` }
            : {}),
        },
        body: JSON.stringify({
          date: btcExportDate(data),
          displayDate: btcDisplayDate(btcExportDate(data)),
          imageDataUrl: dataUrl,
          previewState: data?.metadata?.previewState || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error?.message || payload?.message || "X publish failed.",
        );
      }
      setPublishState({
        status: "success",
        message: payload.dryRun
          ? `Dry run complete: ${payload.tweetText}`
          : "Published to X.",
        url: payload.postUrl,
      });
      if (payload.postUrl)
        window.open(payload.postUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setPublishState({
        status: "error",
        message: error instanceof Error ? error.message : "X publish failed.",
      });
    }
  };
  return (
    <section className="space-y-5 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <FreshnessBadge status={data?.freshness?.status || data.status} />
            <DatasetStatusBadge status={data.status} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            {data.title}
          </h1>
          <p className="max-w-3xl text-zinc-600">{data.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {singleFormat ? null : (
            <ExportFormatSelector value={format} onChange={setFormat} />
          )}
          <ExportButton onClick={onExport} />
        </div>
      </div>
      {singleFormat && publishControls ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-950">Share on X</div>
              <p className="mt-1 text-sm text-slate-500">
                Posts the 1536×1024 Flowboard image to @OnchainVis.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="password"
                value={publishSecret}
                onChange={(event) => setPublishSecret(event.target.value)}
                placeholder="Publish secret"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={onShareX}
                disabled={publishState.status === "loading"}
                className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishState.status === "loading" ? "Sharing…" : "Share on X"}
              </button>
            </div>
          </div>
          {publishState.message ? (
            <div
              className={`mt-3 text-sm ${publishState.status === "error" ? "text-rose-700" : "text-slate-600"}`}
            >
              {publishState.message}
              {publishState.url ? (
                <a
                  className="ml-2 font-bold underline"
                  href={publishState.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open post
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className="mx-auto w-full max-w-full overflow-hidden rounded-[2rem]"
        style={
          {
            aspectRatio: `${dims.width} / ${dims.height}`,
            containerType: "inline-size",
          } as any
        }
        data-testid="responsive-preview-frame"
      >
        <div
          ref={ref}
          data-export-format={activeFormat}
          data-export-width={dims.width}
          data-export-height={dims.height}
          data-static-share="true"
          className={
            singleFormat
              ? "origin-top-left overflow-hidden rounded-[2.1rem] border border-slate-200/95 bg-[#fbfaf7] px-[58px] py-[68px] text-slate-950 shadow-[0_24px_82px_rgba(15,23,42,0.085)]"
              : "origin-top-left overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-white p-10 text-zinc-950 shadow-sm"
          }
          style={
            {
              width: dims.width,
              height: dims.height,
              transform: `scale(min(1, calc(100cqw / ${dims.width})))`,
              maxWidth: "none",
            } as any
          }
        >
          <div
            className={
              singleFormat
                ? "mb-[44px] flex items-start justify-between gap-8"
                : "mb-6 flex items-start justify-between gap-6"
            }
          >
            <div>
              <div
                className={
                  singleFormat
                    ? "text-[22px] font-extrabold uppercase tracking-[0.34em] text-slate-500/90"
                    : "text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500"
                }
              >
                {singleFormat ? "CAPITAL FLOWS · BTC ETF" : "Onchain Visuals"}
              </div>
              <h2
                className={
                  singleFormat
                    ? "mt-6 text-[80px] font-black leading-[0.93] tracking-[-0.075em] text-[#050b1f]"
                    : "mt-3 text-5xl font-semibold tracking-tight"
                }
              >
                {data.title}
              </h2>
              <p
                className={
                  singleFormat
                    ? "mt-8 max-w-4xl text-[25px] font-semibold leading-none tracking-[-0.035em] text-slate-500/90"
                    : "mt-3 max-w-3xl text-lg text-zinc-600"
                }
              >
                {data.subtitle}
              </p>
            </div>
            {singleFormat ? (
              <div className="mt-[-18px] flex h-[58px] items-center justify-center rounded-[18px] border border-slate-200/85 bg-white/88 px-7 text-[20px] font-bold tracking-[-0.03em] text-[#050b1f] shadow-[0_12px_32px_rgba(15,23,42,0.065)]">
                Onchain Visuals
              </div>
            ) : (
              <PeriodSwitcher current={data.period} />
            )}
          </div>
          <StaleDataNotice
            message={
              data?.freshness?.fallbackUsed ? data?.freshness?.message : null
            }
          />
          {children}
          {!singleFormat &&
          data.status !== "source_error" &&
          data.status !== "disabled" &&
          data.status !== "source_config_required" ? (
            <div className="mt-6">
              <InsightChips insights={data.insights || []} />
            </div>
          ) : null}
          {singleFormat ? (
            <footer className="mt-[58px] flex items-baseline justify-between text-[18px] font-semibold leading-none text-slate-500/90">
              <div className="flex items-baseline">
                Created with <span className="mx-4 text-slate-300/90">·</span>
                <span className="font-extrabold text-slate-950">
                  Onchain Visuals
                </span>
              </div>
              <div className="flex items-baseline text-right">
                <span>Source: Farside</span>
                <span className="mx-8 h-[24px] w-px translate-y-[4px] bg-slate-300/80" />
                <span>Updated:&nbsp;</span>
                <span className="font-extrabold text-slate-700">
                  {data?.freshness?.lastUpdatedAt
                    ? new Date(data.freshness.lastUpdatedAt).toLocaleString(
                        "en-US",
                        {
                          timeZone: "UTC",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZoneName: "short",
                        },
                      )
                    : "—"}
                </span>
              </div>
            </footer>
          ) : (
            <SourceFooter
              sourceLabel={data.sourceLabel}
              sourceUrl={data.sourceUrl}
              lastUpdatedAt={data?.freshness?.lastUpdatedAt}
            />
          )}
        </div>
      </div>
    </section>
  );
}
