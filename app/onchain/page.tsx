import Link from 'next/link';
import { datasetsByCategory } from '@/lib/onchain';

export default function OnchainPage(){
  return <main className="mx-auto max-w-6xl p-8 space-y-8"><h1 className="text-3xl font-semibold">Onchain Visuals</h1>{datasetsByCategory.map(c=><section key={c.id}><h2 className="text-xl mb-3">{c.name}</h2><div className="grid md:grid-cols-2 gap-3">{c.datasets.map(d=><Link className="rounded-xl border p-4 hover:bg-zinc-50" key={d.slug} href={`/onchain/${d.slug}`}><div className="font-medium">{d.name}</div><div className="text-sm text-zinc-600">{d.description}</div><div className="text-xs mt-2">Status: {d.status}</div></Link>)}</div></section>)}</main>
}
