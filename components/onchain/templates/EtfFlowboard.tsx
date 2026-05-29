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
const labelParts = (label?: string) => {
  const parts = String(label || "NET FLOW").split(" ");
  return {
    date: parts.length > 2 ? parts.slice(0, 2).join(" ") : parts[0],
    suffix:
      parts.length > 2
        ? parts.slice(2).join(" ")
        : parts.slice(1).join(" ") || "NET FLOW",
  };
};

function BtcMetricCard({
  label,
  value,
  sub,
  hero = false,
}: {
  label: string;
  value: string;
  sub?: string | null;
  hero?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[108px] flex-col justify-between rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm ${hero ? "min-h-[210px] bg-zinc-50/70 p-6" : ""}`}
    >
      <div className="text-[10px] font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="min-w-0">
        <div
          className={`${hero ? "text-6xl" : "text-[1.65rem]"} truncate font-semibold tracking-[-0.055em] text-zinc-950`}
        >
          {value}
        </div>
        {sub ? (
          <div className="mt-2 truncate text-xs font-medium text-zinc-500">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FlowStrip({
  rows,
  monthly = false,
}: {
  rows: any[];
  monthly?: boolean;
}) {
  const maxAbs = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.value) || 0)),
  );
  return (
    <div
      className={`flex items-end ${monthly ? "h-[260px] gap-1.5" : "h-[250px] gap-3"}`}
    >
      {rows.map((row) => {
        const value = Number(row.value) || 0;
        const positive = value >= 0;
        const height = Math.max(
          monthly ? 10 : 18,
          (Math.abs(value) / maxAbs) * (monthly ? 172 : 150),
        );
        return (
          <div
            key={row.date || row.name}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            {monthly ? (
              <span
                className={`h-4 text-[10px] font-semibold tabular-nums ${row.showLabel ? toneClass(value) : "text-transparent"}`}
              >
                {row.showLabel ? row.valueLabel || signedUsd(value) : "·"}
              </span>
            ) : (
              <span
                className={`text-[11px] font-semibold tabular-nums ${row.isLargest ? "text-zinc-950" : "text-zinc-500"}`}
              >
                {row.valueLabel || signedUsd(value)}
              </span>
            )}
            <div
              className={`w-full rounded-t-2xl ${positive ? "bg-emerald-500" : "bg-rose-500"} ${row.isLargest || row.isLargestInflow || row.isLargestOutflow ? "ring-2 ring-zinc-900/10" : ""}`}
              style={{
                height,
                opacity: row.isLatest || row.isLargest ? 1 : 0.68,
              }}
            />
            <span
              className={`truncate text-[10px] font-semibold ${row.isLatest ? "text-zinc-900" : "text-zinc-400"}`}
            >
              {monthly
                ? String(row.date || row.name).slice(8)
                : shortDate(row.date || row.name)}
            </span>
          </div>
        );
      })}
    </div>
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
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
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
            className="rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {showRank ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-zinc-500">
                    {index + 1}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-950">
                    {row.ticker || row.name}
                  </div>
                  <div className="truncate text-[11px] text-zinc-500">
                    {row.name}
                  </div>
                </div>
              </div>
              <div
                className={`shrink-0 text-sm font-semibold tabular-nums ${toneClass(row.value)}`}
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
  const heroLabel = labelParts(hero?.label);

  return (
    <div className="space-y-5">
      {daily ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50/70 p-6 shadow-sm">
            <div className="text-xl font-semibold uppercase tracking-[-0.02em] text-zinc-950">
              {heroLabel.date}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {heroLabel.suffix}
            </div>
            <div
              className={`mt-4 text-6xl font-semibold tracking-[-0.06em] ${toneClass(hero?.value)}`}
            >
              {hero?.formattedValue}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
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
          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
            <BtcMetricCard
              label={hero?.label || "Weekly Net Flow"}
              value={hero?.formattedValue || "Pending"}
              hero
            />
            {supportMetrics.map((metric: any) => {
              const card = data.series?.cards?.find(
                (item: any) => item.label === metric.label,
              );
              return (
                <BtcMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.formattedValue}
                  sub={card?.date || null}
                />
              );
            })}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                5-session flow strip
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Magnitude rises upward; color shows inflow or outflow.
              </p>
              <div className="mt-5">
                <FlowStrip rows={bars} />
              </div>
            </div>
            <Leaderboard
              rows={issuerRows}
              maxRows={5}
              title="Weekly issuer net flow"
            />
          </div>
        </>
      ) : null}

      {monthly ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {metrics.slice(0, 4).map((metric: any) => (
              <BtcMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.formattedValue}
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                MTD daily flow chart
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Completed current-month daily net flows.
              </p>
              <div className="mt-5">
                <FlowStrip rows={bars} monthly />
              </div>
            </div>
            <Leaderboard rows={issuerRows} maxRows={5} title="Issuer Summary" />
          </div>
        </>
      ) : null}
    </div>
  );
}
