import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for npm run admin:seed-logos.");
  process.exit(1);
}

const outDir = ".admin-seed-build";
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const tsc = spawnSync("npx", ["tsc", "--target", "ES2020", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--esModuleInterop", "--outDir", outDir, "lib/logos/logoRegistry.ts", "lib/logos/logoSourceManifest.ts", "lib/logos/metricLogoRequirements.ts"], { stdio: "inherit" });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

const { logoRegistry } = await import(pathToFileURL(`${process.cwd()}/${outDir}/logoRegistry.js`));
const { logoSourceManifestByKey } = await import(pathToFileURL(`${process.cwd()}/${outDir}/logoSourceManifest.js`));
const { metricLogoRequirements } = await import(pathToFileURL(`${process.cwd()}/${outDir}/metricLogoRequirements.js`));

const coingecko = { polygon: "polygon", solana: "solana", cardano: "cardano", near: "near", "internet-computer": "internet-computer", injective: "injective-protocol", "bsv-blockchain": "bitcoin-sv", hyperliquid: "hyperliquid", filecoin: "filecoin", stellar: "stellar", sui: "sui", avalanche: "avalanche-2", tron: "tron", bsc: "binancecoin", ethereum: "ethereum", arbitrum: "arbitrum", optimism: "optimism", ton: "the-open-network" };
function usedInMetrics(entry) { return Object.entries(metricLogoRequirements).filter(([, req]) => req.category === entry.category && req.requiredSlugs.includes(entry.slug)).map(([key]) => key); }
function fallbackText(name) { const compact = name.replace(/blockchain|network|chain/gi, "").trim(); return compact.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || name.slice(0, 3).toUpperCase(); }
function visualStatus(entry) { if (entry.visualRejected) return "visual_rejected"; if (entry.quality === "approved") return "accepted"; if (entry.localPath?.startsWith("/api/chain-logo") || entry.fallbackPreferredUntilManualAsset) return "fallback"; return "needs_review"; }
function status(entry) { if (entry.visualRejected) return "missing"; if (entry.quality === "approved") return "approved"; if (entry.quality === "needs-review") return "needs_review"; if (entry.quality === "rejected") return "rejected"; return "missing"; }
function lit(value) { if (value === null || value === undefined) return "null"; if (typeof value === "number") return Number.isFinite(value) ? String(Math.round(value)) : "null"; const text = typeof value === "string" ? value : JSON.stringify(value); return `'${text.replace(/'/g, "''")}'`; }

const values = logoRegistry.map((entry) => {
  const source = logoSourceManifestByKey.get(`${entry.category}:${entry.slug}`);
  const row = [entry.canonicalName, entry.slug, entry.category, entry.aliases, coingecko[entry.slug] ?? null, entry.slug, status(entry), visualStatus(entry), source?.sourceProvider ?? entry.sourceType ?? null, source?.sourceUrl ?? entry.sourceUrl ?? null, source?.sourceNote ?? entry.sourceNote ?? null, source?.rawPath ?? null, status(entry) === "approved" && visualStatus(entry) === "accepted" ? source?.localPath ?? entry.localPath : null, entry.localPath ?? null, null, null, fallbackText(entry.canonicalName), entry.background ?? null, source?.sha256 ?? null, source?.width ?? null, source?.height ?? null, null, source?.originalContentType ?? null, usedInMetrics(entry), source?.downloadedAt ?? null, source?.approvalStatus === "approved" && !source.visualRejected ? source.downloadedAt : null, entry.visualRejectReason ?? source?.visualRejectReason ?? null, entry.notes ?? null];
  return `(${row.map(lit).join(",")})`;
}).join(",\n");

const sql = `insert into logos (canonical_name, slug, category, aliases, coingecko_id, defillama_slug, status, visual_status, source_provider, source_url, source_note, raw_url, optimized_url, local_path, blob_raw_url, blob_optimized_url, fallback_text, fallback_color, sha256, width, height, file_size, mime_type, used_in_metrics, last_synced_at, approved_at, rejected_reason, notes) values\n${values}\non conflict (slug) do update set canonical_name = excluded.canonical_name, category = excluded.category, aliases = excluded.aliases, coingecko_id = coalesce(logos.coingecko_id, excluded.coingecko_id), defillama_slug = coalesce(logos.defillama_slug, excluded.defillama_slug), source_provider = coalesce(logos.source_provider, excluded.source_provider), source_url = coalesce(logos.source_url, excluded.source_url), source_note = coalesce(logos.source_note, excluded.source_note), local_path = excluded.local_path, fallback_text = coalesce(logos.fallback_text, excluded.fallback_text), fallback_color = coalesce(logos.fallback_color, excluded.fallback_color), used_in_metrics = excluded.used_in_metrics, updated_at = now();`;
writeFileSync(`${outDir}/seed.sql`, sql);
const result = spawnSync("psql", [process.env.DATABASE_URL, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
process.exit(result.status ?? 1);
