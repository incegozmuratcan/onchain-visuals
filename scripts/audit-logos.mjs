import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const registry = readFileSync("lib/logoRegistry.ts", "utf8");
const entries = [...registry.matchAll(/entry\(\{([\s\S]*?)\}\)/g)].map((match) => match[1]);
const value = (entry, key) => entry.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
const bool = (entry, key) => new RegExp(`${key}:\\s*true`).test(entry);

const rows = entries.map((entry) => ({
  name: value(entry, "canonicalName") ?? "Unknown",
  slug: value(entry, "slug") ?? "unknown",
  category: value(entry, "category") ?? "unknown",
  localPath: value(entry, "localPath"),
  sourceType: value(entry, "sourceType") ?? "existing-local",
  qualityStatus: value(entry, "qualityStatus") ?? "curated",
  knownActive: bool(entry, "knownActive"),
}));

const toFsPath = (localPath) => localPath ? join("public", localPath.replace(/^\//, "")) : null;
const missingLocalFiles = rows.filter((row) => row.localPath && !existsSync(toFsPath(row.localPath)));
const localFound = rows.filter((row) => row.localPath && existsSync(toFsPath(row.localPath)));
const externalOnly = rows.filter((row) => !row.localPath || row.qualityStatus === "external-only");
const placeholders = rows.filter((row) => row.sourceType === "placeholder" || row.qualityStatus === "placeholder");
const knownActiveWithoutLocal = rows.filter((row) => row.knownActive && (!row.localPath || !existsSync(toFsPath(row.localPath))));

console.log(`Total logos: ${rows.length}`);
console.log(`Local logos found: ${localFound.length}`);
console.log(`Missing local files: ${missingLocalFiles.length}`);
console.log(`External-only entries: ${externalOnly.length}`);
console.log(`Placeholder entries: ${placeholders.length}`);
console.log(`Known active entities without local assets: ${knownActiveWithoutLocal.length}`);

function printList(label, list) {
  if (!list.length) return;
  console.log(`\n${label}:`);
  for (const row of list) console.log(`- ${row.category}/${row.slug}: ${row.name}${row.localPath ? ` (${row.localPath})` : ""}`);
}

printList("Missing local files", missingLocalFiles);
printList("External-only entries", externalOnly);
printList("Placeholder entries", placeholders);
printList("Known active entities without local assets", knownActiveWithoutLocal);
