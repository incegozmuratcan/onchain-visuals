import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/lib/admin/actions";

export type AdminPage = "dashboard" | "logos" | "api" | "brand";
export type AdminTone = "green" | "gray" | "amber" | "red" | "slate";

const navItems: Array<{ key: AdminPage; label: string; href: string }> = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "logos", label: "Logo Manager", href: "/admin/logos" },
  { key: "api", label: "API", href: "/admin/api" },
  { key: "brand", label: "Brand", href: "/admin/brand" },
];

export function AdminShell({ active, title, eyebrow = "learnDeFi admin", subtitle, children, max = "max-w-7xl", sticky = false, headerExtra }: { active: AdminPage; title: string; eyebrow?: string; subtitle?: string; children: ReactNode; max?: string; sticky?: boolean; headerExtra?: ReactNode }) {
  return <main className={`mx-auto min-h-screen ${max} px-4 py-4 md:px-6`}>
    <header className={`${sticky ? "sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6" : ""} flex flex-wrap items-center justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h1 className="truncate text-2xl font-black tracking-[-0.06em] text-slate-950">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs font-bold text-slate-500">{subtitle}</p> : null}
        {headerExtra}
      </div>
      <AdminNav active={active} />
    </header>
    {children}
  </main>;
}

export function AdminNav({ active }: { active: AdminPage }) {
  return <div className="flex items-center gap-2">
    <nav aria-label="Admin" className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-black shadow-soft">
      {navItems.map((item) => <Link key={item.key} href={item.href} className={`rounded-full px-3 py-1.5 transition ${active === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>{item.label}</Link>)}
    </nav>
    <form action={logoutAction}><button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-soft transition hover:border-slate-300 hover:text-slate-950">Log out</button></form>
  </div>;
}

export function AdminStatusDot({ tone, label }: { tone: AdminTone; label: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-slate-600"><span className={`h-2 w-2 rounded-full ${dotClass(tone)}`} />{label}</span>;
}

export function AdminStatusPill({ tone, children }: { tone: AdminTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${pillClass(tone)}`}>{children}</span>;
}

export function AdminSection({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-3 shadow-soft ${className}`}>{title || action ? <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-sm font-black text-slate-950">{title}</h2>{action}</div> : null}{children}</section>;
}

export function AdminToolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-2 shadow-soft ${className}`}>{children}</section>;
}

export function dotClass(tone: AdminTone) {
  return { green: "bg-emerald-500", gray: "bg-slate-300", amber: "bg-amber-400", red: "bg-red-500", slate: "bg-slate-500" }[tone];
}

function pillClass(tone: AdminTone) {
  return {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    gray: "border-slate-200 bg-slate-50 text-slate-500",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];
}
