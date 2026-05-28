"use client";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { MetricCard } from "../ChartShell";
const usd = (v:any)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(Number(v)||0);
const signedUsd = (v:any)=>`${Number(v) >= 0 ? '+' : ''}${usd(v)}`;
const shortDate = (date:string)=>new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'});

function FlowBars({ rows }: { rows:any[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={rows.map((row)=>({...row,label:shortDate(row.date || row.name)}))} margin={{left:0,right:16,top:12,bottom:6}}><CartesianGrid stroke="#e4e4e7" vertical={false}/><XAxis dataKey="label" tick={{fill:'#71717a',fontSize:11}} tickLine={false} axisLine={false}/><YAxis tickFormatter={usd as any} tick={{fill:'#71717a',fontSize:11}} tickLine={false} axisLine={false}/><Bar dataKey="value" radius={[8,8,8,8]} isAnimationActive={false} activeBar={false as any}>{rows.map((entry:any, index:number)=><Cell key={`flow-${index}`} fill={Number(entry.value) >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.76}/>)}</Bar></BarChart></ResponsiveContainer>;
}

function IssuerList({ rows, title, description }: { rows:any[]; title:string; description:string }) {
  const maxAbs = Math.max(1, ...rows.map((b:any)=>Math.abs(Number(b.value)||0)));
  return <div className="col-span-5 rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
    <div className="mb-5"><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">{title}</h3><p className="mt-1 text-sm text-zinc-500">{description}</p></div>
    <div className="space-y-3">{rows.slice(0,11).map((row:any)=><div key={row.ticker || row.name} className={`rounded-2xl border px-4 py-3 ${row.isLargestInflow ? 'border-emerald-200 bg-emerald-50/70' : row.isLargestOutflow ? 'border-rose-200 bg-rose-50/70' : 'border-zinc-100 bg-zinc-50/70'}`}>
      <div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-semibold text-zinc-950">{row.ticker || row.name}</div><div className="truncate text-xs text-zinc-500">{row.name}</div></div><div className={`text-sm font-semibold tabular-nums ${Number(row.value) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signedUsd(row.value)}</div></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className={`h-full rounded-full ${Number(row.value) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{width:`${Math.max(4, Math.abs(Number(row.value)||0)/maxAbs*100)}%`}}/></div>
    </div>)}</div>
  </div>;
}

export function EtfFlowboard({ data }: { data:any }) {
  const view = data.metadata?.view || 'daily';
  const daily = view === 'daily';
  const monthly = view === 'monthly';
  const lines=(data.series?.lines||[]).slice(-60).map((row:any)=>({...row, label:shortDate(row.date)}));
  const bars=(data.series?.bars||[]);
  const issuerRows = daily ? bars : (data.series?.tables || []);
  return <div className="space-y-6">
    <div className="grid grid-cols-4 gap-4">{(data.headlineMetrics||[]).slice(0,4).map((m:any)=><MetricCard key={m.label} label={m.label} value={m.formattedValue}/>)}</div>
    {data.metadata?.latestCompletedDate ? <div className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-xs font-medium text-zinc-500">Latest completed row: <span className="font-semibold text-zinc-800">{data.metadata.latestCompletedDate}</span></div> : null}
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-7 rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">{daily ? 'Daily net flow' : monthly ? 'Month-to-date flow' : '5-day net flow'}</h3><p className="mt-1 text-sm text-zinc-500">{daily ? 'Columns show daily net demand; the line tracks cumulative flow.' : monthly ? 'Completed current-month sessions only; issuer table ranks net flow.' : 'Latest five completed trading days, excluding pending Farside rows.'}</p></div>
          <div className="flex gap-3 text-xs text-zinc-500"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500"/>Inflow</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-950"/>Cumulative</span></div>
        </div>
        <div className="h-[390px]">
          {daily ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={lines} margin={{left:0,right:16,top:12,bottom:6}}><CartesianGrid stroke="#e4e4e7" vertical={false}/><XAxis dataKey="label" interval="preserveStartEnd" minTickGap={28} tick={{fill:'#71717a',fontSize:11}} tickLine={false} axisLine={false}/><YAxis yAxisId="flow" tickFormatter={usd as any} tick={{fill:'#71717a',fontSize:11}} tickLine={false} axisLine={false}/><YAxis yAxisId="cum" orientation="right" tickFormatter={usd as any} tick={{fill:'#a1a1aa',fontSize:11}} tickLine={false} axisLine={false}/><Bar yAxisId="flow" dataKey="value" radius={[8,8,8,8]} isAnimationActive={false} activeBar={false as any}>{lines.map((entry:any, index:number)=><Cell key={`flow-${index}`} fill={Number(entry.value) >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.76}/>)}</Bar><Line yAxisId="cum" type="monotone" dataKey="cumulative" stroke="#18181b" strokeWidth={3} dot={false} activeDot={false} isAnimationActive={false}/></ComposedChart></ResponsiveContainer> : <FlowBars rows={bars}/>}
        </div>
      </div>
      <IssuerList rows={issuerRows} title={daily ? 'Issuer latest day' : monthly ? 'Issuer monthly leaderboard' : 'Issuer weekly net flow'} description={daily ? 'Signed issuer flow for the latest completed Farside row.' : monthly ? 'Month-to-date signed issuer flow from completed rows only.' : 'Signed issuer flow over the latest five completed trading days.'}/>
    </div>
  </div>;
}
