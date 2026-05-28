import Link from 'next/link';
import { datasetRegistry } from '@/lib/onchain';

const label: Record<string, string> = { active:'Active', source_config_required:'Source config required', disabled:'Disabled / source required', source_error:'Source error', stale:'Stale', planned:'Planned' };
const badgeClass: Record<string, string> = { active:'bg-emerald-100 text-emerald-800 border-emerald-200', source_config_required:'bg-amber-100 text-amber-800 border-amber-200', disabled:'bg-zinc-100 text-zinc-700 border-zinc-200', source_error:'bg-rose-100 text-rose-800 border-rose-200', stale:'bg-orange-100 text-orange-800 border-orange-200', planned:'bg-zinc-100 text-zinc-700 border-zinc-200' };
const groups = [
  { id:'active', title:'Active visual datasets', statuses:['active'] },
  { id:'config', title:'Needs configuration', statuses:['source_config_required'] },
  { id:'disabled', title:'Disabled / source required', statuses:['disabled','source_error','stale','planned'] },
];

export default function OnchainPage() {
  return <main className="mx-auto max-w-6xl space-y-9 p-8">
    <section className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-8">
      <div className="mb-3 inline-flex rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Lab</div>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">Onchain Data Lab</h1>
      <p className="mt-3 max-w-3xl text-zinc-600">Working dataset and visual QA library for Onchain Visuals. Active cards are publishable candidates; configuration-required and disabled cards are intentionally separated and never emit fake data.</p>
    </section>
    {groups.map((group) => {
      const datasets = datasetRegistry.filter((d) => group.statuses.includes(d.status));
      if (!datasets.length) return null;
      return <section key={group.id} className="space-y-3">
        <h2 className="text-xl font-semibold text-zinc-950">{group.title}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {datasets.map((d)=><Link className={`rounded-2xl border p-5 transition ${d.status === 'active' ? 'border-zinc-300 bg-white shadow-sm hover:bg-zinc-50' : 'border-dashed border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50'}`} key={d.slug} href={`/onchain/${d.slug}`}>
            <div className="flex items-start justify-between gap-3"><div className="font-semibold text-zinc-950">{d.name}</div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass[d.status] || badgeClass.disabled}`}>{label[d.status] || d.status}</span></div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">{d.description}</div>
            {d.status !== 'active' ? <div className="mt-3 rounded-xl bg-white p-3 text-xs text-zinc-600">{d.notes || (d.requiredEnv.length ? `Missing/config required: ${d.requiredEnv.join(', ')}` : 'Source is not currently public-ready. No fake data is emitted.')}</div> : null}
          </Link>)}
        </div>
      </section>;
    })}
  </main>;
}
