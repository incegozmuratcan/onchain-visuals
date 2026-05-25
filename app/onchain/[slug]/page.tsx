import { formatDataStatus } from '@/lib/formatters';

async function getChart(slug:string){ const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/charts/${slug}`,{cache:'no-store'}); return r.json(); }

export default async function DatasetPage({params}:{params:{slug:string}}){
  const data = await getChart(params.slug);
  return <main className="mx-auto max-w-5xl p-8 space-y-4"><h1 className="text-3xl font-semibold">{data.title}</h1><p className="text-zinc-600">{data.subtitle}</p><div className="text-sm">Freshness: {formatDataStatus(data?.freshness?.status ?? 'missing')}</div><div className="grid md:grid-cols-3 gap-3">{(data.headlineMetrics||[]).map((m:any)=><div className="rounded-xl border p-4" key={m.label}><div className="text-xs text-zinc-500">{m.label}</div><div className="text-2xl">{m.formattedValue}</div></div>)}</div><div className="rounded-xl border p-4"><pre className="text-xs overflow-auto">{JSON.stringify(data.series?.bars?.slice(0,10),null,2)}</pre></div><div className="flex flex-wrap gap-2">{(data.insights||[]).map((i:string)=><span key={i} className="text-xs rounded-full bg-zinc-100 px-3 py-1">{i}</span>)}</div><div className="text-xs text-zinc-500">{data.sourceLabel}</div></main>
}
