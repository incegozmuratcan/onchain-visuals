"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { MetricCard } from "../ChartShell";

const usd = (v: any) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(Number(v) || 0);
const signedUsd = (v: any) => `${Number(v) >= 0 ? "+" : ""}${usd(v)}`;
const shortDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const toneClass = (value: any) => Number(value) >= 0 ? "text-emerald-700" : "text-rose-700";

function FlowBars({ rows, compact = false }: { rows: any[]; compact?: boolean }) {
  const data = rows.map((row) => ({ ...row, label: shortDate(row.date || row.name) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 10, top: 12, bottom: compact ? 0 : 6 }}>
        <CartesianGrid stroke="#eceff3" vertical={false} />
        <XAxis dataKey="label" interval={0} tick={{ fill: "#71717a", fontSize: compact ? 10 : 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={usd as any} tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} width={54} />
        <Bar dataKey="value" radius={[10, 10, 10, 10]} isAnimationActive={false} activeBar={false as any}>
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
      <Leaderboard rows={rows} maxRows={5} title="Top issuer contributors" description="Largest signed contributors on the latest completed day." showRank={false} />
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
  const contextMetrics = daily ? metrics.slice(1, 4) : metrics.slice(0, 5);
  const bars = data.series?.bars || [];
  const issuerRows = data.series?.tables || [];
  const hiddenIssuerCount = Number(data.metadata?.hiddenIssuerCount || data.series?.cards?.find((card: any) => card.label === "Hidden issuer count")?.value || 0);

  return (
    <div className="space-y-5">
      {daily ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Latest Net Flow</div>
            <div className={`mt-3 text-6xl font-semibold tracking-[-0.06em] ${toneClass(hero?.value)}`}>{hero?.formattedValue}</div>
            {data.metadata?.latestCompletedDate ? <div className="mt-3 text-sm font-medium text-zinc-500">Latest completed row: <span className="font-semibold text-zinc-800">{data.metadata.latestCompletedDate}</span></div> : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {contextMetrics.map((metric: any) => <MetricCard key={metric.label} label={metric.label} value={metric.formattedValue} />)}
            </div>
          </div>
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">5-day context</h3>
                <p className="mt-1 text-sm text-zinc-500">Latest completed day highlighted; prior sessions muted.</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">5 completed days</span>
            </div>
            <div className="h-[260px]"><FlowBars rows={bars} compact /></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-5">
          {contextMetrics.map((metric: any) => {
            const card = data.series?.cards?.find((item: any) => item.label.toLowerCase().startsWith(metric.label.toLowerCase().split(" ")[0]));
            return <MetricCard key={metric.label} label={metric.label} value={metric.formattedValue} sub={card?.date || null} />;
          })}
        </div>
      )}

      {daily ? <IssuerImpact cards={data.series?.cards || []} rows={issuerRows} /> : null}

      {weekly ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.92fr]">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Five completed trading days</h3>
            <p className="mt-1 text-sm text-zinc-500">Daily net flow over the latest completed Farside rows.</p>
            <div className="mt-4 h-[300px]"><FlowBars rows={bars} /></div>
          </div>
          <Leaderboard rows={issuerRows} maxRows={8} title="Weekly issuer net flow" description="Largest issuer sums across the five completed days." />
        </div>
      ) : null}

      {monthly ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <Leaderboard rows={issuerRows} maxRows={8} title="Issuer monthly net-flow leaderboard" description={`Current month-to-date completed rows${data.metadata?.month ? ` · ${data.metadata.month}` : ""}.`} />
          <div className="grid content-start gap-3">
            {(data.series?.cards || []).filter((card: any) => card.label !== "Hidden issuer count").slice(0, 3).map((card: any) => (
              <div key={card.label} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{card.label}</div>
                <div className="mt-2 truncate text-2xl font-semibold text-zinc-950">{card.ticker || card.value}</div>
                {card.amount != null ? <div className={`mt-1 text-sm font-semibold ${toneClass(card.amount)}`}>{signedUsd(card.amount)}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hiddenIssuerCount > 0 ? <div className="text-xs font-medium text-zinc-400">+{hiddenIssuerCount} more issuers omitted for clarity.</div> : null}
    </div>
  );
}
