import "server-only";

export type QueryParam = string | number | boolean | null | undefined;

type NeonFullQueryResult = {
  rows: Record<string, any>[];
  rowCount: number | null;
};

type NeonSqlClient = {
  query(text: string, params?: QueryParam[]): Promise<NeonFullQueryResult>;
};

type NeonFactory = (connectionString: string, options?: Record<string, unknown>) => unknown;

export type QueryResult<T extends Record<string, any> = Record<string, any>> = {
  rows: T[];
  rowCount: number;
};

let cachedDatabaseUrl: string | null = null;
let cachedSql: NeonSqlClient | null = null;
let cachedNeonFactory: NeonFactory | null = null;

async function loadNeonFactory() {
  if (cachedNeonFactory) return cachedNeonFactory;
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ neon: NeonFactory }>;
  const module = await dynamicImport("@neondatabase/serverless");
  cachedNeonFactory = module.neon;
  return cachedNeonFactory;
}

async function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  if (cachedSql && cachedDatabaseUrl === databaseUrl) return cachedSql;

  const neon = await loadNeonFactory();
  cachedDatabaseUrl = databaseUrl;
  cachedSql = neon(databaseUrl, { fullResults: true }) as NeonSqlClient;
  return cachedSql;
}

export async function query<T extends Record<string, any> = Record<string, any>>(text: string, params: QueryParam[] = []): Promise<QueryResult<T>> {
  const sql = await getSqlClient();
  if (!sql) return { rows: [], rowCount: 0 };

  const result = await sql.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount ?? result.rows.length,
  };
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}
