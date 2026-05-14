#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const slug = process.env.SEED_PROTECTION_SLUG || "polygon";
const testUrl = "/test/admin-approved-logo.png";
const testSourceId = "987654321";
const manualNote = "seed protection test manual note";

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runPsql(sql, { capture = false } = {}) {
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-X", capture ? "-tA" : "-a"], {
    input: sql,
    encoding: "utf8",
    stdio: capture ? ["pipe", "pipe", "inherit"] : ["pipe", "inherit", "inherit"],
  });
  if (result.error) {
    throw new Error(`Failed to run psql. Install the PostgreSQL client before running the seed protection test. ${result.error.message}`);
  }
  if (result.status !== 0) throw new Error(`psql exited with status ${result.status ?? 1}`);
  return result.stdout?.trim() ?? "";
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required for admin seed protection testing.");
  process.exit(1);
}

console.log(`Admin seed protection test starting for slug=${slug}`);

const beforeJson = runPsql(`SELECT COALESCE((SELECT row_to_json(l)::text FROM logos l WHERE slug = ${sqlString(slug)} LIMIT 1), '');`, { capture: true });
if (!beforeJson) {
  console.error(`Cannot run seed protection test: ${slug} does not exist. Run npm run admin:seed-logos once, then retry.`);
  process.exit(1);
}

try {
  runPsql(`
    UPDATE logos
    SET status = 'approved',
        approved_logo_url = ${sqlString(testUrl)},
        approved_source_id = ${testSourceId},
        coingecko_id = 'polygon-pos',
        coinmarketcap_id = '3890',
        visual_status = 'approved',
        fallback_text = 'POL',
        fallback_color = '#8247e5',
        notes = NULLIF(
          CONCAT_WS(
            E'\n',
            NULLIF(notes, ''),
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM regexp_split_to_table(COALESCE(notes, ''), E'\n') AS existing_notes(value)
                WHERE btrim(existing_notes.value) = ${sqlString(manualNote)}
              ) THEN NULL
              ELSE ${sqlString(manualNote)}
            END
          ),
          ''
        )
    WHERE slug = ${sqlString(slug)};
  `);

  const expectedNotesJson = runPsql(`SELECT json_build_object('notes', notes)::text FROM logos WHERE slug = ${sqlString(slug)} LIMIT 1;`, { capture: true });
  const expectedNotes = String(JSON.parse(expectedNotesJson).notes || "");

  console.log("Running npm run admin:seed-logos to verify it preserves the simulated admin approval...");
  const seed = spawnSync("npm", ["run", "admin:seed-logos"], { stdio: "inherit", env: process.env });
  if (seed.error) throw seed.error;
  if (seed.status !== 0) throw new Error(`admin:seed-logos exited with status ${seed.status ?? 1}`);

  const after = runPsql(`
    SELECT json_build_object(
      'status', status,
      'approved_logo_url', approved_logo_url,
      'approved_source_id', approved_source_id::text,
      'coingecko_id', coingecko_id,
      'coinmarketcap_id', coinmarketcap_id,
      'visual_status', visual_status,
      'fallback_text', fallback_text,
      'fallback_color', fallback_color,
      'notes', notes
    )::text
    FROM logos WHERE slug = ${sqlString(slug)} LIMIT 1;
  `, { capture: true });
  const parsed = JSON.parse(after);
  const failures = [];
  if (parsed.status !== "approved") failures.push(`status changed to ${parsed.status}`);
  if (parsed.approved_logo_url !== testUrl) failures.push(`approved_logo_url changed to ${parsed.approved_logo_url}`);
  if (parsed.approved_source_id !== testSourceId) failures.push(`approved_source_id changed to ${parsed.approved_source_id}`);
  if (!parsed.coingecko_id) failures.push("coingecko_id was cleared");
  if (!parsed.coinmarketcap_id) failures.push("coinmarketcap_id was cleared");
  if (parsed.visual_status !== "approved") failures.push(`visual_status changed to ${parsed.visual_status}`);
  if (parsed.fallback_text !== "POL") failures.push(`fallback_text changed to ${parsed.fallback_text}`);
  if (parsed.fallback_color !== "#8247e5") failures.push(`fallback_color changed to ${parsed.fallback_color}`);
  const parsedNotes = String(parsed.notes || "");
  const notesChanged = parsedNotes !== expectedNotes;
  if (!parsedNotes.includes(manualNote)) failures.push("manual notes were overwritten");
  if (notesChanged) failures.push("notes changed for protected approved logo");

  if (failures.length) {
    console.error("Admin seed protection FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    if (!parsedNotes.includes(manualNote) || notesChanged) {
      console.error("Parsed notes after admin:seed-logos:");
      console.error(JSON.stringify(parsed.notes ?? null));
    }
    process.exitCode = 1;
  } else {
    console.log("Admin seed protection passed: admin-approved logo state survived admin:seed-logos.");
  }
} finally {
  console.log(`Restoring original ${slug} logo row state...`);
  const escaped = beforeJson.replaceAll("'", "''");
  runPsql(`
    WITH backup AS (SELECT '${escaped}'::jsonb AS data)
    UPDATE logos l
    SET name = backup.data->>'name',
        category = backup.data->>'category',
        approved_logo_url = backup.data->>'approved_logo_url',
        approved_source_id = NULLIF(backup.data->>'approved_source_id', '')::bigint,
        status = backup.data->>'status',
        notes = backup.data->>'notes',
        coingecko_id = backup.data->>'coingecko_id',
        coinmarketcap_id = backup.data->>'coinmarketcap_id',
        last_fetch_error = backup.data->>'last_fetch_error',
        last_fetch_provider = backup.data->>'last_fetch_provider',
        last_fetch_at = NULLIF(backup.data->>'last_fetch_at', '')::timestamptz,
        fallback_text = backup.data->>'fallback_text',
        fallback_color = backup.data->>'fallback_color',
        visual_status = backup.data->>'visual_status'
    FROM backup
    WHERE l.slug = ${sqlString(slug)};
  `);
}
