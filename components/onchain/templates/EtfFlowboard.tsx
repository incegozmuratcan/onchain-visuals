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
  Number(value) >= 0 ? "text-[#047a55]" : "text-[#a84352]";

const BTC_LOGO_SRC = "/logos/bitcoin.svg";
const flowLabel = (value: any) =>
  Number(value) >= 0 ? "NET INFLOW" : "NET OUTFLOW";
const driverLabel = (value: any) =>
  Number(value) >= 0 ? "LARGEST INFLOW" : "LARGEST OUTFLOW";
const displayMetricLabel = (label: string, value: any) => {
  if (/^net flow$/i.test(label)) return flowLabel(value);
  if (/^top driver$/i.test(label)) return driverLabel(value);
  if (/^since launch$/i.test(label)) return "CUMULATIVE NET FLOW";
  return label;
};
const labelParts = (metric?: any) => {
  if (metric?.periodLabel && metric?.metricLabel) {
    return {
      periodLabel: metric.periodLabel,
      metricLabel: displayMetricLabel(metric.metricLabel, metric?.value),
    };
  }
  const raw = String(metric?.label || "NET FLOW");
  const replaced = raw.replace(/NET FLOW$/i, flowLabel(metric?.value));
  const parts = replaced.split(" ");
  return {
    periodLabel: parts.length > 2 ? parts.slice(0, 2).join(" ") : parts[0],
    metricLabel:
      parts.length > 2
        ? parts.slice(2).join(" ")
        : parts.slice(1).join(" ") || flowLabel(metric?.value),
  };
};

export function BTCBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-testid="btc-logo-treatment"
      data-logo-mode="site-asset-premium-circular-coin"
      data-logo-shape="official-btc-medallion"
      data-logo-mandatory="true"
      className={
        compact
          ? "pointer-events-none absolute -right-7 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/30 p-3 opacity-[0.07] mix-blend-multiply"
          : "pointer-events-none absolute right-[10px] top-1/2 h-[240px] w-[240px] -translate-y-1/2 rounded-full border border-white bg-[#f7931a] p-[21px] shadow-[0_18px_42px_rgba(247,147,26,0.18),0_26px_66px_rgba(15,23,42,0.08),0_0_0_16px_rgba(255,255,255,0.9),0_0_0_17px_rgba(226,232,240,0.54)] ring-[2px] ring-white"
      }
      aria-hidden="true"
    >
      <img
        src={BTC_LOGO_SRC}
        alt=""
        className="h-full w-full select-none"
        draggable={false}
      />
    </div>
  );
}

function BtcLogoWatermark({ compact = false }: { compact?: boolean }) {
  return <BTCBadge compact={compact} />;
}

function BtcCanvasWatermarks() {
  return (
    <>
      <img
        src={BTC_LOGO_SRC}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-32 h-[530px] w-[530px] select-none opacity-[0.04] mix-blend-multiply"
        draggable={false}
      />
      <img
        src={BTC_LOGO_SRC}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-28 h-[260px] w-[260px] select-none opacity-[0.048] mix-blend-multiply"
        draggable={false}
      />
    </>
  );
}

export function BrandPill() {
  return (
    <div className="inline-flex h-[58px] items-center justify-center rounded-[18px] border border-slate-200/85 bg-white/88 px-7 text-[20px] font-bold tracking-[-0.03em] text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.065)]">
      Onchain Visuals
    </div>
  );
}

export function NetFlowCard({ hero }: { hero: any }) {
  const heroLabel = labelParts(hero);
  return (
    <div className="relative h-[332px] overflow-hidden rounded-[34px] border border-slate-200/75 bg-white/78 p-[42px] pr-[300px] shadow-[0_16px_48px_rgba(15,23,42,0.04)]">
      <div className="absolute right-[12px] top-1/2 h-[288px] w-[288px] -translate-y-1/2 rounded-full border border-slate-200/60 bg-slate-50/18" />
      <BTCBadge />
      <div className="relative z-10 min-w-0">
        <div
          data-hero-label-primary={heroLabel.periodLabel}
          className="text-[34px] font-extrabold uppercase leading-none tracking-[-0.045em] text-[#050b1f]"
        >
          {heroLabel.periodLabel}
        </div>
        <div
          data-hero-label-secondary={heroLabel.metricLabel}
          className="mt-6 whitespace-nowrap text-[18px] font-bold uppercase leading-none tracking-[0.34em] text-slate-500"
        >
          {heroLabel.metricLabel}
        </div>
      </div>
      <div
        className={`relative z-10 mt-[70px] truncate text-[88px] font-extrabold leading-none tracking-[-0.075em] ${toneClass(hero?.value)}`}
      >
        {hero?.formattedValue}
      </div>
    </div>
  );
}

function StatIcon({ type }: { type: "driver" | "cumulative" }) {
  return (
    <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-[25px] border border-slate-200/80 bg-slate-100/58 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      {type === "driver" ? (
        <svg
          viewBox="0 0 34 34"
          className="h-10 w-10 fill-none stroke-slate-600"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 23 14 15l6 6 9-10" />
          <path d="M21 11h8v8" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 34 34"
          className="h-10 w-10 fill-slate-600"
          aria-hidden="true"
        >
          <rect x="6" y="18" width="6" height="11" rx="1.5" />
          <rect x="15" y="11" width="6" height="18" rx="1.5" />
          <rect x="24" y="6" width="6" height="23" rx="1.5" />
        </svg>
      )}
    </div>
  );
}

export function StatCard({
  metric,
  icon,
}: {
  metric: any;
  icon: "driver" | "cumulative";
}) {
  const label = displayMetricLabel(metric.label, metric.value);
  const match = /^top driver$/i.test(metric.label)
    ? String(metric.formattedValue).match(/^(\S+)\s+(.+)$/)
    : null;
  return (
    <div className="grid h-[194px] grid-cols-[80px_1fr] grid-rows-[80px_1fr] gap-x-7 rounded-[34px] border border-slate-200/78 bg-white/76 px-9 py-[30px] shadow-[0_15px_42px_rgba(15,23,42,0.04)]">
      <StatIcon type={icon} />
      <div className="flex h-[54px] items-start">
        <div className="text-[16px] font-extrabold uppercase leading-[1.35] tracking-[0.28em] text-slate-500">
          {label === "CUMULATIVE NET FLOW" ? (
            <>
              CUMULATIVE
              <br />
              NET FLOW
            </>
          ) : (
            label
          )}
        </div>
      </div>
      <div />
      <div className="flex min-w-0 items-baseline gap-3 self-end">
        {match ? (
          <>
            <span className="text-[32px] font-extrabold leading-none tracking-[-0.055em] text-[#050b1f]">
              {match[1]}
            </span>
            <span
              className={`truncate text-[38px] font-extrabold leading-none tracking-[-0.065em] tabular-nums ${toneClass(metric.value)}`}
            >
              {match[2]}
            </span>
          </>
        ) : (
          <span className="truncate text-[38px] font-extrabold leading-none tracking-[-0.065em] text-[#050b1f] tabular-nums">
            {metric.formattedValue}
          </span>
        )}
      </div>
    </div>
  );
}

export function IssuerRow({ row, scaledMax }: { row: any; scaledMax: number }) {
  const value = Number(row.value) || 0;
  const width = Math.max(13, (Math.sqrt(Math.abs(value)) / scaledMax) * 100);
  return (
    <div className="pb-[38px]">
      <div className="mb-[17px] flex items-baseline justify-between gap-5">
        <div className="min-w-0 truncate text-[24px] leading-none tracking-[-0.045em]">
          <span className="font-extrabold text-[#050b1f]">
            {row.ticker || row.name}
          </span>
          {row.name && row.ticker ? (
            <span className="ml-2 font-medium text-slate-500">{row.name}</span>
          ) : null}
        </div>
        <div
          className={`shrink-0 text-right text-[24px] font-extrabold leading-none tracking-[-0.035em] tabular-nums ${toneClass(value)}`}
        >
          {signedUsd(value)}
        </div>
      </div>
      <div className="h-[5px] rounded-full bg-slate-200/34 shadow-[inset_0_1px_2px_rgba(15,23,42,0.025)]">
        <div
          className={`h-[5px] rounded-full ${value >= 0 ? "bg-[#078a65]" : "bg-[#b94b5a]"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function IssuerFlowList({ rows }: { rows: any[] }) {
  const visible = rows
    .filter((row: any) => Number(row.value) !== 0)
    .slice(0, 5);
  const maxAbs = Math.max(
    1,
    ...visible.map((row: any) => Math.abs(Number(row.value) || 0)),
  );
  const scaledMax = Math.sqrt(maxAbs);
  return (
    <div className="h-[552px] rounded-[34px] border border-slate-200/78 bg-white/76 px-[38px] py-[40px] shadow-[0_16px_48px_rgba(15,23,42,0.04)]">
      <h3 className="mb-[42px] text-[18px] font-extrabold uppercase leading-none tracking-[0.35em] text-slate-500">
        LATEST ISSUER FLOWS
      </h3>
      <div>
        {visible.map((row: any, index: number) => (
          <IssuerRow
            key={`${row.ticker || row.name}-${index}`}
            row={row}
            scaledMax={scaledMax}
          />
        ))}
      </div>
      <div className="mt-[-4px] text-[14px] font-medium text-slate-500">
        All values in USD
      </div>
    </div>
  );
}

function BtcMetricCard({
  label,
  value,
  rawValue,
  sub,
  periodLabel,
  metricLabel,
  watermark = false,
}: {
  label: string;
  value: string;
  rawValue?: any;
  sub?: string | null;
  periodLabel?: string;
  metricLabel?: string;
  watermark?: boolean;
}) {
  const metric = { label, formattedValue: value, value: rawValue };
  return (
    <div className="relative">
      {watermark ? <BtcLogoWatermark compact /> : null}
      <StatCard
        metric={{
          ...metric,
          label: periodLabel && metricLabel ? metricLabel : label,
        }}
        icon={
          watermark
            ? "driver"
            : /^since launch$/i.test(label)
              ? "cumulative"
              : "driver"
        }
      />
    </div>
  );
}

function BtcHeroMetric({ hero }: { hero: any }) {
  return <NetFlowCard hero={hero} />;
}
function Leaderboard({
  rows,
  maxRows,
  title,
  showRank = true,
}: {
  rows: any[];
  maxRows: number;
  title: string;
  description?: string;
  showRank?: boolean;
}) {
  return <IssuerFlowList rows={rows.slice(0, maxRows)} />;
}

export function FlowboardContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem]">{children}</div>
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
    <FlowboardContainer>
      {daily ? <BtcCanvasWatermarks /> : null}
      {daily ? (
        <div className="relative z-10 grid grid-cols-[704px_640px] gap-[30px]">
          <div>
            <NetFlowCard hero={hero} />
            <div className="mt-5 grid grid-cols-2 gap-5">
              {supportMetrics.map((metric: any, index: number) => (
                <StatCard
                  key={metric.label}
                  metric={metric}
                  icon={index === 0 ? "driver" : "cumulative"}
                />
              ))}
            </div>
          </div>
          <IssuerFlowList rows={issuerRows} />
        </div>
      ) : null}

      {weekly ? (
        <>
          <div
            data-metric-row="compact"
            data-metric-row-variant="weekly-equal"
            className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {metrics.map((metric: any, index: number) => (
              <BtcMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.formattedValue}
                rawValue={metric.value}
                sub={null}
                periodLabel={metric.periodLabel}
                metricLabel={metric.metricLabel}
                watermark={index === 0}
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.18fr_0.62fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/68 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Last 5 Days
              </h3>
              <p className="mt-1 text-sm text-slate-500">
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
            {metrics.map((metric: any, index: number) => (
              <BtcMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.formattedValue}
                rawValue={metric.value}
                sub={null}
                periodLabel={metric.periodLabel}
                metricLabel={metric.metricLabel}
                watermark={index === 0}
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.28fr_0.52fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/68 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                This Month
              </h3>
              <p className="mt-1 text-sm text-slate-500">
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
    </FlowboardContainer>
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
