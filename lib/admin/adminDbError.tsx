import "server-only";

export type AdminDbQueryError = {
  label: string;
  message: string;
};

function safeAdminErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown database error");
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "[redacted database url]")
    .replace(/DATABASE_URL=\S+/gi, "DATABASE_URL=[redacted]");
}

export async function safeAdminDbQuery<T>(label: string, queryFn: () => Promise<T>, fallback: T): Promise<{ data: T; error: AdminDbQueryError | null }> {
  try {
    return { data: await queryFn(), error: null };
  } catch (error) {
    console.error("Admin page DB query failed", error);
    return { data: fallback, error: { label, message: safeAdminErrorMessage(error) } };
  }
}

export function AdminDbErrorPanel({ errors }: { errors: Array<AdminDbQueryError | null> }) {
  const visibleErrors = errors.filter((error): error is AdminDbQueryError => Boolean(error));
  if (!visibleErrors.length) return null;
  return (
    <section className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-950 shadow-soft">
      <h2 className="text-lg font-black">Admin DB query failed</h2>
      <div className="mt-3 grid gap-3">
        {visibleErrors.map((error) => (
          <div key={`${error.label}:${error.message}`} className="rounded-2xl border border-red-100 bg-white/70 p-3">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-red-500">{error.label}</div>
            <p className="mt-1 break-words text-sm font-bold text-red-900">{error.message}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-white/70 p-3 text-sm font-bold text-red-900">
        Suggested action: Run Admin DB Setup workflow or check Vercel runtime logs.
      </p>
    </section>
  );
}
