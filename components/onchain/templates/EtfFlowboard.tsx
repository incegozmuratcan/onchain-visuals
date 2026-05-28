"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

const usd = (v: any) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(Number(v) || 0);
const signedUsd = (v: any) => `${Number(v) >= 0 ? "+" : ""}${usd(v)}`;
const shortDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const toneClass = (value: any) => Number(value) >= 0 ? "text-emerald-700" : "text-rose-700";

function BtcMetricCard({ label, value, sub, hero = false }: { label: string; value: string; sub?: string | null; hero?: boolean }) {
  return (
    <div className={`flex min-h-[112px] flex-col justify-between rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm ${hero ? "min-h-[230px] p-6" : ""}`}>
      <div className="min-h-[28px] text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-zinc-500">{label}</div>
      <div>
        <div className={`${hero ? "text-6xl tracking-[-0.06em]" : "text-2xl tracking-[-0.04em]"} font-semibold text-zinc-950`}>{value}</div>
        {sub ? <div className="mt-2 text-sm font-medium text-zinc-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function FlowBars({ rows, compact = false }: { rows: any[]; compact?: boolean }) {
  const data = rows.map((row) => ({ ...row, label: shortDate(row.date || row.name) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 10, top: 12, bottom: compact ? 0 : 6 }}>
        <CartesianGrid stroke="#eceff3" vertical={false} />
        <XAxis dataKey="label" interval={0} tick={{ fill: "#71717a", fontSize: compact ? 10 : 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={usd as any} tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} width={54} />
        <Bar dataKey="value" radius={[10, 10, 10, 10]} isAnimationActive={false} activeBar={false as any} label={{ position: "top", formatter: usd as any, fill: "#52525b", fontSize: compact ? 10 : 11 }}>
          {data.map((entry: any, index: number) => (
            <Cell key={`flow-${index}`} fill={Number(entry.value) >= 0 ? "#10b981" : "#ef4444"} fillOpacity={entry.opacity ?? (entry.isLatest ? 1 : 0.7)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Leaderboard({ rows, maxRows, title, description, showRank = true }: { rows: any[]; maxRows: number; title: string; description: string; showRank?: boolean }) {
  const visible = rows.slice(0, maxRows);
  const maxAbs = Math.max(1, ...visible.map((row: any) => Math.abs(Number(row.value) || 0)));
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
      </div>
      <div className="grid gap-2.5">
        {visible.map((row: any, index: number) => (
          <div key={`${row.ticker || row.name}-${index}`} className="rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {showRank ? <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-zinc-500">{index + 1}</span> : null}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-950">{row.ticker || row.name}</div>
                  <div className="truncate text-[11px] text-zinc-500">{row.name}</div>
                </div>
              </div>
              <div className={`shrink-0 text-sm font-semibold tabular-nums ${toneClass(row.value)}`}>{signedUsd(row.value)}</div>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200">
              <div className={`h-1.5 rounded-full ${Number(row.value) >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.max(4, Math.abs(Number(row.value) || 0) / maxAbs * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuerImpact({ cards, rows }: { cards: any[]; rows: any[] }) {
  const inflow = cards.find((card) => card.label === "Largest inflow issuer");
  const outflow = cards.find((card) => card.label === "Largest outflow issuer");
  const breadth = cards.find((card) => card.label === "Issuer breadth");
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[inflow, outflow, breadth].filter(Boolean).map((card: any) => (
          <div key={card.label} className="rounded-[1.35rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{card.label}</div>
            <div className="mt-2 truncate text-lg font-semibold text-zinc-950">{card.ticker || card.value}</div>
            {card.amount != null ? <div className={`mt-1 text-sm font-semibold ${toneClass(card.amount)}`}>{signedUsd(card.amount)}</div> : null}
          </div>
        ))}
      </div>
      <Leaderboard rows={rows} maxRows={5} title="Latest Issuer Flows" description="Largest signed issuer moves on the latest completed row." showRank={false} />
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
  const supportMetrics = daily ? metrics.slice(1, 4) : metrics.slice(1, 4);
  const sinceLaunch = metrics.find((metric: any) => metric.label === "Since Launch");
  const bars = data.series?.bars || [];
  const issuerRows = data.series?.tables || [];
  const hiddenIssuerCount = monthly ? Number(data.metadata?.hiddenIssuerCount || data.series?.cards?.find((card: any) => card.label === "Hidden issuer count")?.value || 0) : 0;

  return (
    <div className="space-y-5">
      {daily ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50/70 p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">{hero?.label}</div>
            <div className={`mt-3 text-6xl font-semibold tracking-[-0.06em] ${toneClass(hero?.value)}`}>{hero?.formattedValue}</div>
            <div className="mt-3 text-sm font-medium text-zinc-500">Latest completed row{data.metadata?.latestCompletedDate ? <>: <span className="font-semibold text-zinc-800">{data.metadata.latestCompletedDate}</span></> : null}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {supportMetrics.map((metric: any) => <BtcMetricCard key={metric.label} label={metric.label} value={metric.formattedValue} />)}
            </div>
          </div>
          <Leaderboard rows={issuerRows} maxRows={5} title="Latest Issuer Flows" description="Largest signed issuer moves on the latest completed row." showRank={false} />
        </div>
      ) : null}

      {weekly ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <BtcMetricCard label={hero?.label || "Weekly Net Flow"} value={hero?.formattedValue || "Pending"} sub="Last five completed sessions" hero />
            {supportMetrics.map((metric: any) => {
              const card = data.series?.cards?.find((item: any) => item.label === metric.label);
              return <BtcMetricCard key={metric.label} label={metric.label} value={metric.formattedValue} sub={card?.date || (metric.label === "Top Issuer" ? "This week" : null)} />;
            })}
          </div>
          {sinceLaunch ? <div className="rounded-[1.35rem] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-500"><span className="font-semibold uppercase tracking-[0.16em] text-zinc-400">Since Launch</span> <span className="ml-2 font-semibold text-zinc-950">{sinceLaunch.formattedValue}</span></div> : null}
          <div className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Five completed days</h3>
              <p className="mt-1 text-sm text-zinc-500">Daily net flow with readable signed values.</p>
              <div className="mt-4 h-[300px]"><FlowBars rows={bars} /></div>
            </div>
            <Leaderboard rows={issuerRows} maxRows={8} title="Weekly issuer net flow" description="Largest issuer sums across the five completed days." />
          </div>
        </>
      ) : null}

      {monthly ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {metrics.slice(0, 4).map((metric: any) => {
              const card = data.series?.cards?.find((item: any) => item.label === metric.label);
              return <BtcMetricCard key={metric.label} label={metric.label} value={metric.formattedValue} sub={card?.ticker || null} />;
            })}
          </div>
          <Leaderboard rows={issuerRows} maxRows={8} title="Issuer Monthly Flows" description={`Month-to-date issuer leaderboard${data.metadata?.month ? ` · ${data.metadata.month}` : ""}.`} />
        </>
      ) : null}

      {hiddenIssuerCount > 0 ? <div className="text-xs font-medium text-zinc-400">{hiddenIssuerCount} smaller issuers omitted.</div> : null}
    </div>
  );
}
