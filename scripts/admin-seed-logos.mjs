#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const filename = join(process.cwd(), relativePath);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
    fileName: filename,
  }).outputText;
  const mod = { exports: {} };
  const dirname = filename.slice(0, filename.lastIndexOf("/"));
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      const target = join(dirname, specifier);
      if (existsSync(`${target}.ts`)) return loadTsModule(target.replace(`${process.cwd()}/`, "") + ".ts");
      if (existsSync(target) && target.endsWith(".ts")) return loadTsModule(target.replace(`${process.cwd()}/`, ""));
      return require(target);
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, filename, dirname);
  return mod.exports;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to seed admin logos. Configure Postgres and rerun npm run admin:seed-logos.");
  process.exit(1);
}

const { logoRegistry } = loadTsModule("lib/logos/logoRegistry.ts");
const { logoSourceManifest } = loadTsModule("lib/logos/logoSourceManifest.ts");
const { requiredActiveLogoKeys } = loadTsModule("lib/logos/metricLogoRequirements.ts");

const registryByKey = new Map(logoRegistry.map((logo) => [`${logo.category}:${logo.slug}`, logo]));
const sourceByKey = new Map(logoSourceManifest.map((source) => [`${source.category}:${source.slug}`, source]));
const keys = new Set([
  ...registryByKey.keys(),
  ...sourceByKey.keys(),
  ...requiredActiveLogoKeys,
]);

function titleFromSlug(slug) {
  return slug.split("-").map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)).join(" ");
}

function sourceStatus(source, visuallyAccepted) {
  if (!source) return null;
  if (source.approvalStatus === "rejected") return "rejected";
  if (source.approvalStatus === "approved" && visuallyAccepted) return "approved";
  return "candidate";
}

const payload = Array.from(keys).sort().map((key) => {
  const [categoryFromKey, slug] = key.split(":");
  const registry = registryByKey.get(key);
  const source = sourceByKey.get(key);
  const category = source?.category ?? registry?.category ?? categoryFromKey;
  const visuallyRejected = Boolean(source?.visualRejected || registry?.visualRejected);
  const fallbackPreferredUntilManualAsset = Boolean(source?.fallbackPreferredUntilManualAsset || registry?.fallbackPreferredUntilManualAsset);
  const visuallyAccepted = !visuallyRejected && !fallbackPreferredUntilManualAsset;
  const sourceApproved = source?.approvalStatus === "approved" && visuallyAccepted;
  const status = sourceApproved ? "approved" : "needs_review";
  const notes = [
    registry?.notes,
    source?.notes,
    source?.sourceNote,
    visuallyRejected ? `Visual rejection: ${source?.visualRejectReason ?? registry?.visualRejectReason ?? "source requires manual replacement"}` : null,
    fallbackPreferredUntilManualAsset ? "Fallback preferred until a manual asset is approved; not auto-approved by seed." : null,
    requiredActiveLogoKeys.includes(key) ? "Required by active metric logo coverage." : null,
  ].filter(Boolean).join("\n");

  return {
    slug,
    name: source?.canonicalName ?? registry?.canonicalName ?? titleFromSlug(slug),
    category,
    status,
    approved_logo_url: sourceApproved ? source.localPath : null,
    notes,
    source: source ? {
      provider: source.sourceProvider,
      source_url: source.sourceUrl ?? null,
      image_url: source.localPath,
      blob_url: null,
      status: sourceStatus(source, visuallyAccepted),
      rejection_reason: source.approvalStatus === "rejected" ? source.notes || source.visualRejectReason || "Rejected in source manifest" : null,
      metadata: {
        localPath: source.localPath,
        rawPath: source.rawPath ?? null,
        sha256: source.sha256,
        width: source.width,
        height: source.height,
        sourceNote: source.sourceNote ?? null,
        downloadedAt: source.downloadedAt,
        originalContentType: source.originalContentType,
        approvalStatus: source.approvalStatus,
        visualRejected,
        fallbackPreferredUntilManualAsset,
      },
    } : null,
  };
});

const json = JSON.stringify(payload).replaceAll("$learndefi_seed$", "$learndefi seed$");
const sql = `
WITH seed AS (
  SELECT *
  FROM jsonb_to_recordset($learndefi_seed$${json}$learndefi_seed$::jsonb) AS x(
    slug text,
    name text,
    category text,
    status text,
    approved_logo_url text,
    notes text,
    source jsonb
  )
), upserted_logos AS (
  INSERT INTO logos (slug, name, category, status, approved_logo_url, notes)
  SELECT slug, name, category, status, approved_logo_url, NULLIF(notes, '')
  FROM seed
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    status = CASE WHEN logos.status = 'rejected' THEN logos.status ELSE EXCLUDED.status END,
    approved_logo_url = CASE WHEN logos.status = 'rejected' THEN logos.approved_logo_url ELSE EXCLUDED.approved_logo_url END,
    notes = EXCLUDED.notes
  RETURNING id, slug
), source_seed AS (
  SELECT
    l.id AS logo_id,
    seed.slug,
    seed.source->>'provider' AS provider,
    seed.source->>'source_url' AS source_url,
    seed.source->>'image_url' AS image_url,
    seed.source->>'blob_url' AS blob_url,
    seed.source->>'status' AS status,
    seed.source->>'rejection_reason' AS rejection_reason,
    seed.source->'metadata' AS metadata
  FROM seed
  JOIN upserted_logos l ON l.slug = seed.slug
  WHERE seed.source IS NOT NULL
), existing_sources AS (
  SELECT DISTINCT ON (s.logo_id, s.provider, s.image_url, COALESCE(s.source_url, '')) s.id, s.logo_id, s.provider, s.image_url, COALESCE(s.source_url, '') AS source_url_key
  FROM logo_sources s
  JOIN source_seed seed ON seed.logo_id = s.logo_id
    AND seed.provider = s.provider
    AND seed.image_url = s.image_url
    AND COALESCE(seed.source_url, '') = COALESCE(s.source_url, '')
  ORDER BY s.logo_id, s.provider, s.image_url, COALESCE(s.source_url, ''), s.id
), updated_sources AS (
  UPDATE logo_sources s
  SET blob_url = NULLIF(seed.blob_url, ''),
      metadata = seed.metadata,
      status = seed.status,
      rejection_reason = seed.rejection_reason
  FROM source_seed seed
  JOIN existing_sources existing ON existing.logo_id = seed.logo_id
    AND existing.provider = seed.provider
    AND existing.image_url = seed.image_url
    AND existing.source_url_key = COALESCE(seed.source_url, '')
  WHERE s.id = existing.id
  RETURNING s.id, s.logo_id, s.status
), inserted_sources AS (
  INSERT INTO logo_sources (logo_id, provider, source_url, image_url, blob_url, metadata, status, rejection_reason)
  SELECT seed.logo_id, seed.provider, seed.source_url, seed.image_url, NULLIF(seed.blob_url, ''), seed.metadata, seed.status, seed.rejection_reason
  FROM source_seed seed
  WHERE NOT EXISTS (
    SELECT 1 FROM existing_sources existing
    WHERE existing.logo_id = seed.logo_id
      AND existing.provider = seed.provider
      AND existing.image_url = seed.image_url
      AND existing.source_url_key = COALESCE(seed.source_url, '')
  )
  RETURNING id, logo_id, status
), approved_sources AS (
  SELECT DISTINCT ON (logo_id) id, logo_id
  FROM (
    SELECT * FROM updated_sources
    UNION ALL
    SELECT * FROM inserted_sources
  ) sources
  WHERE status = 'approved'
  ORDER BY logo_id, id
), approved_logos AS (
  UPDATE logos l
  SET approved_source_id = approved_sources.id
  FROM approved_sources
  WHERE l.id = approved_sources.logo_id AND l.status = 'approved'
  RETURNING l.id
)
SELECT
  (SELECT count(*) FROM seed) AS logos_seen,
  (SELECT count(*) FROM source_seed) AS local_sources_seen,
  (SELECT count(*) FROM approved_logos) AS approved_logos;
`;

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
if (result.error) {
  console.error("Failed to run psql. Install the PostgreSQL client or seed logos manually.");
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
