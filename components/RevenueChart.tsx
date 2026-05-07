"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";

export function RevenueChart({ rows }: { rows: ChainRevenueRow[] }) {
  return (
    <div className="h-[340px] rounded-2xl border border-slate-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 22 }}>
          <XAxis type="number" tickFormatter={formatUsd} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" width={110} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => formatUsd(Number(value))} cursor={{ fill: "rgba(15, 34, 56, 0.05)" }} />
          <Bar dataKey="value" radius={[0, 9, 9, 0]} fill="#0f2238" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
