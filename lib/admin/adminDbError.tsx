import "server-only";

export type AdminDbQueryError = {
  label: string;
  message: string;
};

export function safeAdminErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown database error");
  return raw
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "[redacted database url]")
    .replace(/DATABASE_URL=\S+/gi, "DATABASE_URL=[redacted]")
    .replace(/(COINGECKO_DEMO_API_KEY|COINMARKETCAP_API_KEY|ADMIN_SESSION_SECRET|ADMIN_SETUP_TOKEN|BLOB_READ_WRITE_TOKEN)=\S+/gi, "$1=[redacted]");
}

export async function safeAdminDbQuery<T>(label: string, queryFn: () => Promise<T>, fallback: T): Promise<{ data: T; error: AdminDbQueryError | null }> {
  try {
    return { data: await queryFn(), error: null };
  } catch (error) {
    console.error(`Admin page DB query failed: ${label}`, error);
    return { data: fallback, error: { label, message: safeAdminErrorMessage(error) } };
  }
}

const SUGGESTIONS = ["Run Admin DB Setup workflow", "Check Vercel runtime logs", "Check DATABASE_URL", "Check recent migration"];

export function AdminDbErrorPanel({ errors }: { errors: Array<AdminDbQueryError | null | undefined> }) {
  const visibleErrors = errors.filter((error): error is AdminDbQueryError => Boolean(error));
  if (!visibleErrors.length) return null;
  return (
    <section className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-950 shadow-soft">
      <h2 className="text-lg font-black">Admin section could not load safely</h2>
      <p className="mt-1 text-sm font-bold text-red-800">The rest of the admin page can keep rendering while this section is repaired.</p>
      <div className="mt-3 grid gap-3">
        {visibleErrors.map((error) => (
          <div key={`${error.label}:${error.message}`} className="rounded-2xl border border-red-100 bg-white/70 p-3">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-red-500">{error.label}</div>
            <p className="mt-1 break-words text-sm font-bold text-red-900">{error.message}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white/70 p-3 text-sm font-bold text-red-900">
        <p>Suggested actions:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {SUGGESTIONS.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
        </ul>
      </div>
    </section>
  );
}
