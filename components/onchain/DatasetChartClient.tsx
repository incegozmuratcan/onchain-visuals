"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartShell } from "./ChartShell";

export default function DatasetChartClient({ data }: { data: any }) {
  const bars = (data?.series?.bars ?? []).slice(0, 12);
  return (
    <ChartShell title={data.title} subtitle={data.subtitle} sourceLabel={data.sourceLabel} insights={data.insights ?? []}>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {(data.headlineMetrics ?? []).slice(0, 3).map((m: any) => (
          <div className="rounded-xl border p-4" key={m.label}><div className="text-xs text-zinc-500">{m.label}</div><div className="mt-1 text-2xl font-semibold">{m.formattedValue}</div></div>
        ))}
      </div>
      <div className="h-[420px] w-full rounded-xl border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#111827" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-zinc-500">Last updated: {data?.freshness?.lastUpdatedAt ?? 'N/A'} · Status: {data?.freshness?.status}</div>
    </ChartShell>
  );
}
