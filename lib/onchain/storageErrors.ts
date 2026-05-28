export const ONCHAIN_STORAGE_TABLES = ['onchain_source_runs', 'onchain_chart_snapshots'] as const;
export type OnchainStorageTable = (typeof ONCHAIN_STORAGE_TABLES)[number];

const EXPECTED_ONCHAIN_TABLES = new Set<string>([
  ...ONCHAIN_STORAGE_TABLES,
  'onchain_sources',
  'onchain_metric_observations',
]);

export class OnchainStorageNotInitializedError extends Error {
  missingTables: string[];

  constructor(missingTables: string[], cause?: unknown) {
    const uniqueTables = [...new Set(missingTables.filter((table) => EXPECTED_ONCHAIN_TABLES.has(table)))];
    super(`Onchain storage tables are not initialized: ${uniqueTables.join(', ')}`);
    this.name = 'OnchainStorageNotInitializedError';
    this.missingTables = uniqueTables.length ? uniqueTables : [...ONCHAIN_STORAGE_TABLES];
    this.cause = cause;
  }
}

export function getMissingOnchainTablesFromError(error: unknown): string[] {
  const err = error as { code?: string; message?: string; detail?: string } | null;
  const message = `${err?.message || ''} ${err?.detail || ''}`;
  return [...EXPECTED_ONCHAIN_TABLES].filter((table) => message.includes(table));
}

export function isMissingOnchainStorageTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string; detail?: string } | null;
  if (err?.code !== '42P01' && !/relation .* does not exist/i.test(err?.message || '')) return false;
  return getMissingOnchainTablesFromError(error).length > 0;
}

export function toOnchainStorageNotInitializedError(error: unknown): OnchainStorageNotInitializedError | null {
  if (error instanceof OnchainStorageNotInitializedError) return error;
  if (!isMissingOnchainStorageTableError(error)) return null;
  return new OnchainStorageNotInitializedError(getMissingOnchainTablesFromError(error), error);
}

export const ONCHAIN_STORAGE_NOT_INITIALIZED_MESSAGE = 'Onchain storage tables are not initialized. Run npm run onchain:init-db or npm run db:push.';
