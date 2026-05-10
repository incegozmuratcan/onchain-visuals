"use client";

import { useState } from "react";

export function LogoAuditImage({ src, name, size }: { src?: string; name: string; size: number }) {
  const [broken, setBroken] = useState(false);

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-full border text-[10px] font-black ${broken || !src ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-slate-50 text-slate-400"}`} style={{ width: size, height: size }} title={broken ? "Broken image" : src ?? "Missing local logo"}>
      {src && !broken ? <img src={src} alt={`${name} logo`} className="h-full w-full object-cover" onError={() => setBroken(true)} /> : broken ? "!" : "—"}
    </div>
  );
}
