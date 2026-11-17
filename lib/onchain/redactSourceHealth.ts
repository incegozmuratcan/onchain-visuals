/** Drop secret names and upstream error text for callers who are not signed in as admin. */
export function redactPublicSourceHealth<T extends { sources: Array<Record<string, any>> }>(health: T): T {
  return {
    ...health,
    sources: health.sources.map((source) => ({
      ...source,
      missingEnv: [],
      lastError: null,
      warnings: Array.isArray(source.warnings)
        ? source.warnings.filter((warning) => typeof warning === "string" && !/is not configured|api[_ ]?key|secret|token/i.test(warning))
        : source.warnings,
    })),
  };
}
