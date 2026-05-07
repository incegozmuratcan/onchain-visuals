"use client";

import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";

export function RevenueTable({ rows }: { rows: ChainRevenueRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Chain</th>
            <th className="px-4 py-3 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-slate-100 transition hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-400">{row.rank}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatUsd(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
