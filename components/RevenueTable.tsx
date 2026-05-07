"use client";

import { getInitials } from "@/lib/chainLogos";
import { formatUsd } from "@/lib/format";
import type { ChainRevenueRow } from "@/lib/defillama";

function ChainIdentity({ row }: { row: ChainRevenueRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-500">
        {row.logo ? <img src={row.logo} alt="" className="h-full w-full object-cover" /> : getInitials(row.name)}
      </div>
      <span className="font-semibold text-slate-950">{row.name}</span>
    </div>
  );
}

export function RevenueTable({ rows }: { rows: ChainRevenueRow[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">Chain revenue table</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Chain revenue only · dApp/protocol revenue excluded</p>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-400">
          <tr>
            <th className="px-5 py-3">#</th>
            <th className="px-5 py-3">Chain</th>
            <th className="px-5 py-3 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-slate-100 transition hover:bg-slate-50">
              <td className="px-5 py-3 font-bold text-slate-400">{row.rank}</td>
              <td className="px-5 py-3"><ChainIdentity row={row} /></td>
              <td className="px-5 py-3 text-right font-black text-slate-950">{formatUsd(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
