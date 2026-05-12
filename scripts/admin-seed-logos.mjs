import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to seed admin logos.");
  process.exit(1);
}

const logos = [
  ["ethereum", "Ethereum", "chain"], ["solana", "Solana", "chain"], ["tron", "Tron", "chain"], ["bnb-chain", "BNB Chain", "chain"], ["base", "Base", "chain"], ["arbitrum", "Arbitrum", "chain"], ["polygon", "Polygon", "chain"], ["avalanche", "Avalanche", "chain"], ["op-mainnet", "OP Mainnet", "chain"], ["sui", "Sui", "chain"], ["aptos", "Aptos", "chain"], ["near", "NEAR", "chain"], ["bitcoin", "Bitcoin", "chain"], ["stellar", "Stellar", "chain"], ["buidl", "BUIDL", "asset"], ["benji", "BENJI", "asset"], ["helium", "Helium", "project"], ["geodnet", "GEODNET", "project"], ["akash", "Akash", "project"], ["render", "Render", "project"], ["filecoin", "Filecoin", "project"],
];

const values = logos.map(([slug, name, category]) => `('${slug.replaceAll("'", "''")}', '${name.replaceAll("'", "''")}', '${category}')`).join(",\n");
const sql = `INSERT INTO logos (slug, name, category) VALUES\n${values}\nON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;`;
const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
if (result.error) {
  console.error("Failed to run psql. Install the PostgreSQL client or seed logos manually.");
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
