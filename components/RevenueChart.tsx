"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";

export function RevenueChart({ rows }: { rows: ChainRevenueRow[] }) {
  return (
    <div className="h-[390px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Visual preview</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Horizontal revenue leaderboard</p>
        </div>
        <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500">live data</div>
      </div>

      <ResponsiveContainer width="100%" height="86%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 22, bottom: 8, left: 18 }}>
          <XAxis type="number" tickFormatter={formatUsd} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }} />
          <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} tick={{ fill: "#0f172a", fontSize: 12, fontWeight: 800 }} />
          <Tooltip formatter={(value) => formatUsd(Number(value))} cursor={{ fill: "rgba(15, 23, 42, 0.04)" }} />
          <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#020617" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
