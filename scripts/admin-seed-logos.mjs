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

function mergeOptionalBoolean(...values) {
  if (values.some((value) => value === true)) return true;
  if (values.some((value) => value === false)) return false;
  return undefined;
}

function uniqueText(values) {
  return Array.from(new Set(values.filter(Boolean).flatMap((value) => String(value).split("\n")).map((value) => value.trim()).filter(Boolean)));
}

function sourceScore(source, visuallyAccepted) {
  if (!source) return 0;
  if (source.approvalStatus === "approved" && visuallyAccepted && source.localPath) return 4;
  if (source.approvalStatus === "approved" && source.localPath) return 3;
  if (source.localPath && source.approvalStatus !== "rejected") return 2;
  if (source.localPath) return 1;
  return 0;
}

function recordScore(record) {
  return [
    record.status === "approved" ? 100 : 0,
    record.approved_logo_url ? 20 : 0,
    record.sources.some((source) => source.status === "approved") ? 10 : 0,
    record.sources.length ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

function sourceKey(source) {
  return [source.provider, source.image_url, source.source_url ?? ""].join("\u0000");
}

function mergeSource(existing, incoming) {
  const existingScore = existing.status === "approved" ? 3 : existing.status === "candidate" ? 2 : existing.status === "rejected" ? 1 : 0;
  const incomingScore = incoming.status === "approved" ? 3 : incoming.status === "candidate" ? 2 : incoming.status === "rejected" ? 1 : 0;
  const preferred = incomingScore > existingScore ? incoming : existing;
  const other = preferred === incoming ? existing : incoming;
  return {
    ...preferred,
    metadata: {
      ...other.metadata,
      ...preferred.metadata,
      seedRecords: [
        ...(Array.isArray(other.metadata?.seedRecords) ? other.metadata.seedRecords : []),
        ...(Array.isArray(preferred.metadata?.seedRecords) ? preferred.metadata.seedRecords : []),
      ],
    },
  };
}

function dedupePayloadBySlug(rawPayload) {
  const grouped = new Map();
  for (const record of rawPayload) {
    const records = grouped.get(record.slug) ?? [];
    records.push(record);
    grouped.set(record.slug, records);
  }

  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, records]) => {
    const sorted = [...records].sort((a, b) => recordScore(b) - recordScore(a) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    const winner = sorted[0];
    const sourceMap = new Map();

    for (const record of sorted) {
      for (const source of record.sources) {
        const key = sourceKey(source);
        const existing = sourceMap.get(key);
        sourceMap.set(key, existing ? mergeSource(existing, source) : source);
      }
    }

    const sources = Array.from(sourceMap.values()).sort((a, b) => {
      const statusRank = (source) => source.status === "approved" ? 3 : source.status === "candidate" ? 2 : source.status === "rejected" ? 1 : 0;
      return statusRank(b) - statusRank(a) || a.provider.localeCompare(b.provider) || a.image_url.localeCompare(b.image_url);
    });

    return {
      slug: winner.slug,
      name: winner.name,
      category: winner.category,
      status: winner.status,
      approved_logo_url: winner.approved_logo_url,
      notes: uniqueText(records.map((record) => record.notes)).join("\n"),
      sources,
    };
  });
}

const rawPayload = Array.from(keys).sort().map((key) => {
  const [categoryFromKey, slug] = key.split(":");
  const registry = registryByKey.get(key);
  const source = sourceByKey.get(key);
  const category = source?.category ?? registry?.category ?? categoryFromKey;
  const visualRejected = mergeOptionalBoolean(source?.visualRejected, registry?.visualRejected);
  const fallbackPreferredUntilManualAsset = mergeOptionalBoolean(source?.fallbackPreferredUntilManualAsset, registry?.fallbackPreferredUntilManualAsset);
  const visualRejectReason = source?.visualRejectReason ?? registry?.visualRejectReason;
  const visuallyAccepted = !Boolean(visualRejected) && !Boolean(fallbackPreferredUntilManualAsset);
  const sourceApproved = sourceScore(source, visuallyAccepted) === 4;
  const status = sourceApproved ? "approved" : "needs_review";
  const notes = [
    registry?.notes,
    source?.notes,
    source?.sourceNote,
    visualRejected ? `Visual rejection: ${visualRejectReason ?? "source requires manual replacement"}` : null,
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
    sources: source ? [{
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
        seedRecords: [{ slug, category, canonicalName: source.canonicalName }],
        ...(visualRejected === undefined ? {} : { visualRejected }),
        ...(fallbackPreferredUntilManualAsset === undefined ? {} : { fallbackPreferredUntilManualAsset }),
        ...(visualRejectReason === undefined ? {} : { visualRejectReason }),
      },
    }] : [],
  };
});

const duplicateSlugsCollapsed = new Set(rawPayload.map((record) => record.slug).filter((slug, index, slugs) => slugs.indexOf(slug) !== index)).size;
const payload = dedupePayloadBySlug(rawPayload);

console.log(`Admin logo seed raw payload records: ${rawPayload.length}`);
console.log(`Admin logo seed deduped logo records: ${payload.length}`);
console.log(`Admin logo seed duplicate slugs collapsed: ${duplicateSlugsCollapsed}`);
console.log(`Admin logo seed visually rejected/fallback-preferred records in payload: ${rawPayload.filter((record) => record.sources.some((source) => source.metadata?.visualRejected || source.metadata?.fallbackPreferredUntilManualAsset)).length}`);

const duplicateSlugsAfterDedupe = payload.map((record) => record.slug).filter((slug, index, slugs) => slugs.indexOf(slug) !== index);
if (duplicateSlugsAfterDedupe.length) {
  console.error(`Admin logo seed still has duplicate slugs after dedupe: ${Array.from(new Set(duplicateSlugsAfterDedupe)).join(", ")}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required to seed admin logos. Configure Postgres and rerun npm run admin:seed-logos.");
  process.exit(1);
}

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
    sources jsonb
  )
	), existing_logo_state AS (
	  SELECT
	    l.id,
	    l.slug,
	    l.name,
	    l.category,
	    l.status,
	    l.approved_logo_url,
	    l.approved_source_id,
	    l.coingecko_id,
	    l.coinmarketcap_id,
	    l.visual_status,
	    l.fallback_text,
	    l.fallback_color,
	    l.notes,
	    (l.status = 'approved' AND l.approved_logo_url IS NOT NULL AND (l.approved_source_id IS NOT NULL OR l.approved_logo_url IS NOT NULL)) AS has_admin_approved_logo,
	    (l.visual_status = 'rejected' OR l.fallback_text IS NOT NULL OR l.fallback_color IS NOT NULL) AS preserve_visual_decision
	  FROM logos l
	  JOIN seed ON seed.slug = l.slug
	), upserted_logos AS (
  INSERT INTO logos (slug, name, category, status, approved_logo_url, notes)
  SELECT slug, name, category, status, approved_logo_url, NULLIF(notes, '')
  FROM seed
	  ON CONFLICT (slug) DO UPDATE SET
	    name = CASE
	      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL THEN COALESCE(NULLIF(logos.name, ''), EXCLUDED.name)
	      ELSE EXCLUDED.name
	    END,
	    category = CASE
	      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL THEN COALESCE(NULLIF(logos.category, ''), EXCLUDED.category)
	      ELSE EXCLUDED.category
	    END,
    status = CASE
      WHEN logos.status = 'rejected' OR logos.visual_status = 'rejected' THEN logos.status
      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL AND (logos.approved_source_id IS NOT NULL OR logos.approved_logo_url IS NOT NULL) THEN logos.status
      ELSE EXCLUDED.status
    END,
    approved_logo_url = CASE
      WHEN logos.status = 'rejected' OR logos.visual_status = 'rejected' THEN logos.approved_logo_url
      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL AND (logos.approved_source_id IS NOT NULL OR logos.approved_logo_url IS NOT NULL) THEN logos.approved_logo_url
      ELSE EXCLUDED.approved_logo_url
    END,
    approved_source_id = CASE
      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL AND (logos.approved_source_id IS NOT NULL OR logos.approved_logo_url IS NOT NULL) THEN logos.approved_source_id
      ELSE logos.approved_source_id
    END,
	    visual_status = logos.visual_status,
	    fallback_text = logos.fallback_text,
	    fallback_color = logos.fallback_color,
	    notes = CASE
	      WHEN logos.status = 'approved' AND logos.approved_logo_url IS NOT NULL AND NULLIF(logos.notes, '') IS NOT NULL THEN logos.notes
	      ELSE NULLIF(CONCAT_WS(E'\n', NULLIF(logos.notes, ''), NULLIF(EXCLUDED.notes, '')), '')
	    END
	  RETURNING id, slug
), source_seed AS (
  SELECT
    l.id AS logo_id,
    seed.slug,
    COALESCE(existing.has_admin_approved_logo, false) AS has_admin_approved_logo,
    COALESCE(existing.preserve_visual_decision, false) AS preserve_visual_decision,
    source.value->>'provider' AS provider,
    source.value->>'source_url' AS source_url,
    source.value->>'image_url' AS image_url,
    source.value->>'blob_url' AS blob_url,
    CASE
      WHEN (COALESCE(existing.has_admin_approved_logo, false) OR COALESCE(existing.preserve_visual_decision, false)) AND source.value->>'status' = 'approved' THEN 'candidate'
      ELSE source.value->>'status'
    END AS status,
    source.value->>'rejection_reason' AS rejection_reason,
    source.value->'metadata' AS metadata
  FROM seed
  JOIN upserted_logos l ON l.slug = seed.slug
  LEFT JOIN existing_logo_state existing ON existing.slug = seed.slug
  CROSS JOIN LATERAL jsonb_array_elements(seed.sources) AS source(value)
  WHERE seed.sources IS NOT NULL AND jsonb_typeof(seed.sources) = 'array'
), deduped_source_seed AS (
  SELECT DISTINCT ON (logo_id, provider, image_url, COALESCE(source_url, '')) *
  FROM source_seed
  ORDER BY logo_id, provider, image_url, COALESCE(source_url, ''),
    CASE status WHEN 'approved' THEN 1 WHEN 'candidate' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END
), existing_sources AS (
  SELECT DISTINCT ON (s.logo_id, s.provider, s.image_url, COALESCE(s.source_url, ''))
    s.id,
    s.logo_id,
    s.provider,
    s.image_url,
    COALESCE(s.source_url, '') AS source_url_key
  FROM logo_sources s
  JOIN deduped_source_seed seed ON seed.logo_id = s.logo_id
    AND seed.provider = s.provider
    AND seed.image_url = s.image_url
    AND COALESCE(seed.source_url, '') = COALESCE(s.source_url, '')
  ORDER BY s.logo_id, s.provider, s.image_url, COALESCE(s.source_url, ''), s.id
), updated_sources AS (
  UPDATE logo_sources s
  SET blob_url = COALESCE(s.blob_url, NULLIF(seed.blob_url, '')),
      metadata = COALESCE(s.metadata, '{}'::jsonb) || COALESCE(seed.metadata, '{}'::jsonb),
      status = CASE WHEN s.status = 'approved' THEN s.status ELSE seed.status END,
      rejection_reason = CASE WHEN s.status = 'approved' THEN s.rejection_reason ELSE seed.rejection_reason END
  FROM deduped_source_seed seed
  JOIN existing_sources existing ON existing.logo_id = seed.logo_id
    AND existing.provider = seed.provider
    AND existing.image_url = seed.image_url
    AND existing.source_url_key = COALESCE(seed.source_url, '')
  WHERE s.id = existing.id
  RETURNING s.id, s.logo_id, s.status
), inserted_sources AS (
  INSERT INTO logo_sources (logo_id, provider, source_url, image_url, blob_url, metadata, status, rejection_reason)
  SELECT seed.logo_id, seed.provider, seed.source_url, seed.image_url, NULLIF(seed.blob_url, ''), seed.metadata, seed.status, seed.rejection_reason
  FROM deduped_source_seed seed
  WHERE NOT EXISTS (
    SELECT 1 FROM existing_sources existing
    WHERE existing.logo_id = seed.logo_id
      AND existing.provider = seed.provider
      AND existing.image_url = seed.image_url
      AND existing.source_url_key = COALESCE(seed.source_url, '')
  )
  RETURNING id, logo_id, status
), source_changes AS (
  SELECT * FROM updated_sources
  UNION ALL
  SELECT * FROM inserted_sources
), approved_sources AS (
  SELECT DISTINCT ON (sources.logo_id) sources.id, sources.logo_id
  FROM source_changes sources
  LEFT JOIN existing_logo_state existing ON existing.id = sources.logo_id
  WHERE sources.status = 'approved' AND NOT COALESCE(existing.has_admin_approved_logo, false) AND NOT COALESCE(existing.preserve_visual_decision, false)
  ORDER BY sources.logo_id, sources.id
), approved_logos AS (
  UPDATE logos l
  SET approved_source_id = approved_sources.id
  FROM approved_sources
  WHERE l.id = approved_sources.logo_id AND l.status = 'approved'
  RETURNING l.id
)
	SELECT
	  (SELECT count(*) FROM seed) AS seed_records_seen,
	  ${rawPayload.length} AS raw_records_seen,
	  ${payload.length} AS deduped_records_seen,
	  (SELECT count(*) FROM existing_logo_state WHERE has_admin_approved_logo) AS existing_approved_logos_preserved,
	  (SELECT count(*) FROM approved_logos) AS new_approved_local_logos_imported,
	  (SELECT count(*) FROM inserted_sources) AS source_candidates_added,
	  (SELECT count(*) FROM source_seed WHERE (has_admin_approved_logo OR preserve_visual_decision) AND status = 'candidate') AS skipped_approved_overwrites,
	  (SELECT count(*) FROM existing_logo_state WHERE preserve_visual_decision) AS visually_rejected_or_fallback_records_preserved,
	  (SELECT count(*) FROM deduped_source_seed) AS local_sources_seen;
`;

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
if (result.error) {
  console.error("Failed to run psql. Install the PostgreSQL client or seed logos manually.");
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
