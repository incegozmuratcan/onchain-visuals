import "server-only";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function queryJson<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const rendered = params.reduce<string>((statement, param, index) => statement.replace(new RegExp(`\\$${index + 1}\\b`, "g"), literal(param)), sql);
  const { stdout } = await execFileAsync("psql", [process.env.DATABASE_URL, "-t", "-A", "-c", `select coalesce(json_agg(row_to_json(q)), '[]'::json) from (${rendered}) q;`], { maxBuffer: 1024 * 1024 * 10 });
  return JSON.parse(stdout.trim() || "[]") as T[];
}

export async function execSql(sql: string, params: unknown[] = []) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const rendered = params.reduce<string>((statement, param, index) => statement.replace(new RegExp(`\\$${index + 1}\\b`, "g"), literal(param)), sql);
  await execFileAsync("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-c", rendered], { maxBuffer: 1024 * 1024 * 10 });
}

function literal(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replace(/'/g, "''")}'`;
}
