import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to apply the admin schema.");
  process.exit(1);
}
const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const result = spawnSync("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
process.exit(result.status ?? 1);
