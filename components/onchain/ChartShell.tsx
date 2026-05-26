"use client";
import { ReactNode, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

export function ChartShell({ title, subtitle, sourceLabel, children, insights }: { title: string; subtitle: string; sourceLabel: string; insights: string[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<'1600x900'|'1200x1200'|'1080x1350'>('1600x900');
  const style = useMemo(() => ({'1600x900': { width: 1600, minHeight: 900 }, '1200x1200': { width: 1200, minHeight: 1200 }, '1080x1350': { width: 1080, minHeight: 1350 }}[format]), [format]);
  const onExport = async () => {
    if (!ref.current) return;
    const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `onchain-visual-${format}.png`;
    a.click();
  };

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="text-zinc-600">{subtitle}</p></div>
      <div className="flex items-center gap-2"><select value={format} onChange={(e)=>setFormat(e.target.value as any)} className="rounded border px-2 py-1 text-sm"><option>1600x900</option><option>1200x1200</option><option>1080x1350</option></select><button onClick={onExport} className="rounded bg-black px-3 py-1.5 text-sm text-white">Export PNG</button></div>
    </div>
    <div ref={ref} className="rounded-2xl border bg-white p-6" style={style as any}>
      {children}
      <div className="mt-6 flex flex-wrap gap-2">{insights.slice(0,3).map((i) => <span key={i} className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{i}</span>)}</div>
      <footer className="mt-6 text-xs text-zinc-500">{sourceLabel} · Onchain Visuals</footer>
    </div>
  </section>;
}
