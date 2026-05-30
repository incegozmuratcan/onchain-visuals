"use client";

const usd = (v: any) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
const signedUsd = (v: any) => `${Number(v) >= 0 ? "+" : ""}${usd(v)}`;
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
const toneClass = (value: any) =>
  Number(value) >= 0 ? "text-emerald-700" : "text-rose-700";
const labelParts = (metric?: any) => {
  if (metric?.periodLabel && metric?.metricLabel) {
    return { periodLabel: metric.periodLabel, metricLabel: metric.metricLabel };
  }
  const parts = String(metric?.label || "NET FLOW").split(" ");
  return {
    periodLabel: parts.length > 2 ? parts.slice(0, 2).join(" ") : parts[0],
    metricLabel:
      parts.length > 2
        ? parts.slice(2).join(" ")
        : parts.slice(1).join(" ") || "NET FLOW",
  };
};

function BtcLogoWatermark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-testid="btc-logo-treatment"
      data-logo-mode="restored-watermark"
      data-logo-shape="warm-orange-blob"
      data-logo-mandatory="true"
      className={`pointer-events-none absolute ${compact ? "-right-5 top-1/2 h-24 w-28 -translate-y-1/2" : "-right-8 top-1/2 h-44 w-48 -translate-y-1/2"}`}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 180 160"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient id="btc-watermark-glow" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#ffcf73" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#f7931a" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#df7b10" stopOpacity="0.74" />
          </radialGradient>
          <filter
            id="btc-watermark-shadow"
            x="-20%"
            y="-18%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="-8"
              dy="14"
              stdDeviation="14"
              floodColor="#f59e0b"
              floodOpacity="0.2"
            />
          </filter>
        </defs>
        <path
          d="M144.8 23.6c24.6 18.9 26.7 58.6 8.9 89.1-17.8 30.4-55.5 51.7-89.4 41.2-34-10.5-64.2-52.8-54.1-88.3 10.2-35.6 60.8-64.4 99.8-57.9 13.2 2.2 24.9 8.3 34.8 15.9Z"
          fill="url(#btc-watermark-glow)"
          filter="url(#btc-watermark-shadow)"
        />
        <text
          x="91"
          y="103"
          textAnchor="middle"
          className="fill-white font-black"
          style={{
            fontSize: compact ? 68 : 76,
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          ₿
        </text>
      </svg>
    </div>
  );
}

function BtcMetricCard({
  label,
  value,
  sub,
  periodLabel,
  metricLabel,
  watermark = false,
}: {
  label: string;
  value: string;
  sub?: string | null;
  periodLabel?: string;
  metricLabel?: string;
  watermark?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-[70px] self-start flex-col justify-start overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-zinc-100/70 px-3.5 py-3 shadow-sm ${watermark ? "pr-20" : ""}`}
    >
      {watermark ? <BtcLogoWatermark compact /> : null}
      {periodLabel && metricLabel ? (
        <div
          data-hero-label-parts="explicit"
          className="relative z-10 space-y-1"
        >
          <div
            data-hero-label-primary={periodLabel}
            className="whitespace-nowrap text-[13px] font-bold uppercase leading-none tracking-[0.04em] text-zinc-950"
          >
            {periodLabel}
          </div>
          <div
            data-hero-label-secondary={metricLabel}
            className="whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-zinc-500"
          >
            {metricLabel}
          </div>
        </div>
      ) : (
        <div className="relative z-10 text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-500">
          {label}
        </div>
      )}
      <div className="relative z-10 mt-2 min-w-0">
        <div className="truncate text-[1.35rem] font-semibold leading-none tracking-[-0.05em] text-zinc-950">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 truncate text-[11px] font-medium text-zinc-500">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BtcHeroMetric({ hero }: { hero: any }) {
  const heroLabel = labelParts(hero);
  return (
    <div className="relative min-h-[132px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-100/85 p-5 shadow-sm">
      <BtcLogoWatermark />
      <div className="relative z-10 min-w-0">
        <div
          data-hero-label-primary={heroLabel.periodLabel}
          className="text-xl font-semibold uppercase leading-none tracking-[-0.02em] text-zinc-950"
        >
          {heroLabel.periodLabel}
        </div>
        <div
          data-hero-label-secondary={heroLabel.metricLabel}
          className="mt-1.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-zinc-500"
        >
          {heroLabel.metricLabel}
        </div>
      </div>
      <div
        className={`relative z-10 mt-6 truncate text-5xl font-semibold leading-none tracking-[-0.06em] ${toneClass(hero?.value)}`}
      >
        {hero?.formattedValue}
      </div>
    </div>
  );
}

function SignedFlowChart({
  rows,
  monthly = false,
}: {
  rows: any[];
  monthly?: boolean;
}) {
  const width = monthly ? 860 : 760;
  const height = monthly ? 430 : 360;
  const margin = monthly
    ? { top: 42, right: 12, bottom: 30, left: 32 }
    : { top: 42, right: 12, bottom: 34, left: 32 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxAbs = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.value) || 0)),
  );
  const paddedMax = maxAbs * (monthly ? 1.04 : 1.05);
  const zeroY = margin.top + plotHeight / 2;
  const slot = rows.length ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.max(
    monthly ? 24 : 100,
    Math.min(monthly ? 54 : 132, slot * (monthly ? 0.82 : 0.86)),
  );
  const valueToY = (value: number) =>
    margin.top + ((paddedMax - value) / (paddedMax * 2)) * plotHeight;
  const labeledIndexes = rows
    .map((row, index) => (row.showLabel ? index : -1))
    .filter((index) => index >= 0);
  const labelPositions = new Map<number, number>();
  if (monthly) {
    let previousX = -Infinity;
    for (const index of labeledIndexes) {
      const naturalX = margin.left + slot * index + slot / 2;
      const nextX = Math.max(naturalX, previousX + 142);
      const clampedX = Math.min(width - margin.right - 54, nextX);
      labelPositions.set(index, clampedX);
      previousX = clampedX;
    }
  }
  const labelTone = (value: number, marked: boolean) =>
    marked ? "#18181b" : value >= 0 ? "#047857" : "#be123c";

  return (
    <svg
      className="block h-auto w-full overflow-visible"
      data-chart="signed-zero-baseline"
      data-scale-mode="signed-symmetric"
      data-bar-direction="positive-up-negative-down"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        monthly
          ? "This Month signed BTC ETF flows"
          : "Last 5 Days signed BTC ETF flows"
      }
    >
      {[0.25, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={margin.left}
          x2={width - margin.right}
          y1={margin.top + plotHeight * ratio}
          y2={margin.top + plotHeight * ratio}
          stroke="#f1f5f9"
          strokeWidth="1"
        />
      ))}
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={zeroY}
        y2={zeroY}
        stroke="#a1a1aa"
        strokeWidth="1.25"
      />
      <text
        x={margin.left - 8}
        y={zeroY + 4}
        textAnchor="end"
        className="fill-zinc-400 text-[12px] font-semibold"
      >
        $0
      </text>
      {rows.map((row, index) => {
        const value = Number(row.value) || 0;
        const positive = value >= 0;
        const y = valueToY(value);
        const x = margin.left + slot * index + slot / 2 - barWidth / 2;
        const barY = positive ? y : zeroY;
        const rawHeight = Math.abs(zeroY - y);
        const barHeight = Math.max(monthly ? 22 : 42, rawHeight);
        const marked =
          row.isLargest || row.isLargestInflow || row.isLargestOutflow;
        const showLabel = !monthly || row.showLabel;
        const labelY = positive
          ? Math.max(monthly ? 30 : 28, barY - 14)
          : Math.min(
              height - margin.bottom - 8,
              barY + barHeight + (monthly ? 24 : 24),
            );
        const naturalLabelX = x + barWidth / 2;
        const labelX = monthly
          ? (labelPositions.get(index) ?? naturalLabelX)
          : naturalLabelX;

        return (
          <g key={row.date || row.name}>
            <rect
              x={x}
              y={barY}
              width={barWidth}
              height={barHeight}
              rx={monthly ? 6 : 10}
              fill={
                positive
                  ? marked
                    ? "#059669"
                    : "#34d399"
                  : marked
                    ? "#e11d48"
                    : "#fb7185"
              }
              opacity={marked ? 1 : 0.82}
            />
            {marked ? (
              <rect
                x={x - 2}
                y={barY - (positive ? 2 : 0)}
                width={barWidth + 4}
                height={barHeight + 4}
                rx={monthly ? 8 : 12}
                fill="none"
                stroke={
                  positive ? "rgba(16,185,129,0.22)" : "rgba(244,63,94,0.22)"
                }
                strokeWidth="3"
              />
            ) : null}
            {showLabel && monthly && Math.abs(labelX - naturalLabelX) > 1 ? (
              <line
                x1={naturalLabelX}
                x2={labelX}
                y1={positive ? Math.max(24, barY - 6) : barY + barHeight + 6}
                y2={labelY + (positive ? 3 : -3)}
                stroke="#d4d4d8"
                strokeWidth="1"
              />
            ) : null}
            {showLabel ? (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                data-label-size={
                  monthly ? "x-readable-key-plus" : "x-readable-daily-plus"
                }
                className={`fill-current ${monthly ? "text-[22px]" : "text-[23px]"} font-extrabold tabular-nums`}
                style={{ color: labelTone(value, Boolean(marked)) }}
              >
                {row.valueLabel || signedUsd(value)}
              </text>
            ) : null}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className={`${row.isLatest ? "fill-zinc-900" : "fill-zinc-500"} ${monthly ? "text-[15px]" : "text-[17px]"} font-semibold tabular-nums`}
            >
              {monthly
                ? String(row.date || row.name).slice(8)
                : shortDate(row.date || row.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Leaderboard({
  rows,
  maxRows,
  title,
  description,
  showRank = true,
}: {
  rows: any[];
  maxRows: number;
  title: string;
  description?: string;
  showRank?: boolean;
}) {
  const visible = rows
    .filter((row: any) => Number(row.value) !== 0)
    .slice(0, maxRows);
  const maxAbs = Math.max(
    1,
    ...visible.map((row: any) => Math.abs(Number(row.value) || 0)),
  );
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-100/70 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-2.5">
        {visible.map((row: any, index: number) => (
          <div
            key={`${row.ticker || row.name}-${index}`}
            className="rounded-2xl border border-zinc-200/70 bg-white/88 px-3.5 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-sm font-semibold text-zinc-950">
                {showRank ? (
                  <span className="mr-2 text-zinc-400">{index + 1}</span>
                ) : null}
                <span className="whitespace-nowrap">
                  {row.ticker || row.name}
                </span>
                {row.name && row.ticker ? (
                  <span className="ml-1 truncate font-medium text-zinc-400">
                    {row.name}
                  </span>
                ) : null}
              </div>
              <div
                className={`shrink-0 whitespace-nowrap text-right text-sm font-semibold tabular-nums ${toneClass(row.value)}`}
              >
                {signedUsd(row.value)}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200">
              <div
                className={`h-1.5 rounded-full ${Number(row.value) >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                style={{
                  width: `${Math.max(4, (Math.abs(Number(row.value) || 0) / maxAbs) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EtfFlowboard({ data }: { data: any }) {
  const view = data.metadata?.view || "daily";
  const daily = view === "daily";
  const weekly = view === "weekly";
  const monthly = view === "monthly";
  const metrics = data.headlineMetrics || [];
  const hero = metrics[0];
  const supportMetrics = daily ? metrics.slice(1, 3) : metrics.slice(1, 4);
  const bars = data.series?.bars || [];
  const issuerRows = (data.series?.tables || []).filter(
    (row: any) => Number(row.value) !== 0,
  );

  return (
    <div className="space-y-5">
      {daily ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <BtcHeroMetric hero={hero} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {supportMetrics.map((metric: any) => (
                <BtcMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.formattedValue}
                />
              ))}
            </div>
          </div>
          <Leaderboard
            rows={issuerRows}
            maxRows={5}
            title="Latest Issuer Flows"
            showRank={false}
          />
        </div>
      ) : null}

      {weekly ? (
        <>
          <div
            data-metric-row="compact"
            data-metric-row-variant="weekly-equal"
            className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {metrics.map((metric: any, index: number) => {
              const card = data.series?.cards?.find(
                (item: any) => item.label === metric.label,
              );
              return (
                <BtcMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.formattedValue}
                  sub={card?.date || null}
                  periodLabel={metric.periodLabel}
                  metricLabel={metric.metricLabel}
                  watermark={index === 0}
                />
              );
            })}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.18fr_0.62fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Last 5 Days
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Inflows rise above zero; outflows extend below.
              </p>
              <div className="mt-3">
                <SignedFlowChart rows={bars} />
              </div>
            </div>
            <Leaderboard
              rows={issuerRows}
              maxRows={5}
              title="Top Issuer Flows"
            />
          </div>
        </>
      ) : null}

      {monthly ? (
        <>
          <div
            data-metric-row="compact"
            data-metric-row-variant="monthly-equal"
            className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {metrics.map((metric: any, index: number) => {
              const card = data.series?.cards?.find(
                (item: any) => item.label === metric.label,
              );
              return (
                <BtcMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.formattedValue}
                  sub={card?.date || null}
                  periodLabel={metric.periodLabel}
                  metricLabel={metric.metricLabel}
                  watermark={index === 0}
                />
              );
            })}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.28fr_0.52fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                This Month
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Completed month-to-date daily net flows.
              </p>
              <div className="mt-3">
                <SignedFlowChart rows={bars} monthly />
              </div>
            </div>
            <Leaderboard
              rows={issuerRows}
              maxRows={5}
              title="Top Issuer Flows"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
