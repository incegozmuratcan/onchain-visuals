import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to push db/schema.sql.");
  process.exit(1);
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: schema, stdio: ["pipe", "inherit", "inherit"] });
if (result.error) {
  console.error("Failed to run psql. Install the PostgreSQL client or apply db/schema.sql manually.");
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
