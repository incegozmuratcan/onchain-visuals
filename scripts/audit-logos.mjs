#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
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

const { logoRegistry, normalizeLogoKey, getLogoRegistryEntry } = loadTsModule("lib/logos/logoRegistry.ts");
const { logoSourceManifest, unresolvedLogoSources } = loadTsModule("lib/logos/logoSourceManifest.ts");
const { metricLogoRequirements, requiredActiveLogoKeys } = loadTsModule("lib/logos/metricLogoRequirements.ts");
const { datasetGroups } = loadTsModule("lib/datasets.ts");

const byKey = new Map(logoRegistry.map((logo) => [`${logo.category}:${logo.slug}`, logo]));
const sourceByKey = new Map(logoSourceManifest.map((entry) => [`${entry.category}:${entry.slug}`, entry]));
const requiredSet = new Set(requiredActiveLogoKeys);
const blockedProviders = new Set(["generated", "fallback", "placeholder", "data-provider"]);
const toFsPath = (localPath) => (localPath ? join("public", localPath.replace(/^\//, "")) : null);
const isExternalRuntime = (localPath) => !localPath || /^https?:\/\//i.test(localPath);
const isPlaceholderLike = (text) => /placeholder|generated|initials|fallback|temporary|fake badge|text badge/i.test(text ?? "");

function fileSha256(localPath) {
  return createHash("sha256").update(readFileSync(toFsPath(localPath))).digest("hex");
}

function fileLooksTextBadge(localPath) {
  if (!localPath || !existsSync(toFsPath(localPath)) || !/\.svg$/i.test(localPath)) return false;
  const source = readFileSync(toFsPath(localPath), "utf8");
  return /<text\b|Arial Black|Inter, Arial|dominant-baseline=["']middle|<circle[^>]+>\s*<text|stroke=["']rgba\(15,23,42,.10\)["']|role=["']img["'] aria-label=/i.test(source);
}

const activeMetrics = datasetGroups.flatMap((group) => group.metrics.filter((metric) => metric.status === "active").map((metric) => metric.id));
const activeMetricsWithoutRequirements = activeMetrics.filter((id) => !metricLogoRequirements[id]);
const missingLocalFiles = logoRegistry.filter((logo) => !logo.localPath || !existsSync(toFsPath(logo.localPath)));
const needsReview = logoSourceManifest.filter((entry) => entry.approvalStatus === "needs-review");
const unresolvedRequired = unresolvedLogoSources.filter((entry) => requiredSet.has(`${entry.category}:${entry.slug}`));
const checksumMismatch = [];
const fallbackGenerated = [];
const requiredIssues = [];
const warnings = [];

const aliasOwners = new Map();
const aliasCollisions = [];
for (const logo of logoRegistry) {
  for (const alias of [logo.canonicalName, logo.slug, ...logo.aliases]) {
    const normalized = normalizeLogoKey(alias);
    const key = `${logo.category}:${logo.slug}`;
    const existing = aliasOwners.get(normalized);
    if (existing && existing !== key && existing.split(":")[1] !== key.split(":")[1]) aliasCollisions.push(`${normalized}: ${existing} vs ${key}`);
    aliasOwners.set(normalized, key);
  }
}

for (const logo of logoRegistry) {
  const key = `${logo.category}:${logo.slug}`;
  const source = sourceByKey.get(key);
  const required = requiredSet.has(key);
  if (isPlaceholderLike(`${logo.sourceType} ${logo.quality} ${logo.sourceNote ?? ""} ${logo.notes ?? ""}`)) fallbackGenerated.push(logo);
  if (!required && (!source || source.approvalStatus !== "approved")) warnings.push(`${key}: optional/unknown may use fallback; missing approved source record`);
  if (source?.localPath && existsSync(toFsPath(source.localPath))) {
    const actual = fileSha256(source.localPath);
    if (actual !== source.sha256) checksumMismatch.push(`${key}: expected ${source.sha256}, got ${actual}`);
  }
}

for (const key of requiredActiveLogoKeys) {
  const logo = byKey.get(key);
  const source = sourceByKey.get(key);
  if (!logo) {
    requiredIssues.push(`${key}: missing registry entry`);
    continue;
  }
  const resolved = getLogoRegistryEntry(logo.canonicalName, logo.category);
  if (!resolved || `${resolved.category}:${resolved.slug}` !== key) requiredIssues.push(`${key}: canonical name resolves incorrectly`);
  if (!logo.localPath) requiredIssues.push(`${key}: registry missing localPath`);
  if (isExternalRuntime(logo.localPath)) requiredIssues.push(`${key}: registry localPath is external or empty (${logo.localPath})`);
  if (!existsSync(toFsPath(logo.localPath))) requiredIssues.push(`${key}: registry local file not found (${logo.localPath})`);
  if (logo.quality !== "approved") requiredIssues.push(`${key}: registry quality is ${logo.quality}`);
  if (isPlaceholderLike(`${logo.sourceType} ${logo.sourceNote ?? ""} ${logo.notes ?? ""}`)) requiredIssues.push(`${key}: registry metadata indicates placeholder/generated/fallback`);

  if (!source) {
    requiredIssues.push(`${key}: missing source manifest entry`);
    continue;
  }
  if (!source.localPath) requiredIssues.push(`${key}: source manifest missing localPath`);
  if (source.localPath !== logo.localPath) requiredIssues.push(`${key}: registry localPath (${logo.localPath}) does not match source manifest (${source.localPath})`);
  if (!existsSync(toFsPath(source.localPath))) requiredIssues.push(`${key}: source manifest local file not found (${source.localPath})`);
  if (source.approvalStatus !== "approved") requiredIssues.push(`${key}: source approvalStatus is ${source.approvalStatus}`);
  if (!source.sha256) requiredIssues.push(`${key}: source manifest missing sha256`);
  if (!source.sourceProvider) requiredIssues.push(`${key}: source manifest missing sourceProvider`);
  if (blockedProviders.has(source.sourceProvider)) requiredIssues.push(`${key}: sourceProvider ${source.sourceProvider} is not allowed for required active logos`);
  if (!source.sourceUrl && !source.sourceNote) requiredIssues.push(`${key}: source manifest missing sourceUrl/sourceNote`);
  if (source.localPath && existsSync(toFsPath(source.localPath)) && source.sha256 && fileSha256(source.localPath) !== source.sha256) requiredIssues.push(`${key}: checksum mismatch`);
  if (fileLooksTextBadge(source.localPath)) requiredIssues.push(`${key}: local SVG contains text-badge/initials-like markup`);
}

function printList(label, list, mapper = (row) => `${row.category}/${row.slug}: ${row.canonicalName}${row.localPath ? ` (${row.localPath})` : ""}`) {
  if (!list.length) return;
  console.log(`\n${label}:`);
  for (const row of list) console.log(`- ${mapper(row)}`);
}

const approvedRequired = requiredActiveLogoKeys.filter((key) => {
  const logo = byKey.get(key);
  const source = sourceByKey.get(key);
  return logo && source && logo.localPath === source.localPath && logo.quality === "approved" && source.approvalStatus === "approved" && existsSync(toFsPath(source.localPath)) && source.sha256 && !checksumMismatch.some((item) => item.startsWith(`${key}:`));
});

console.log("Logo audit summary");
console.log(`Total registry entries: ${logoRegistry.length}`);
console.log(`Source manifest entries: ${logoSourceManifest.length}`);
console.log(`Total required: ${requiredActiveLogoKeys.length}`);
console.log(`Approved required: ${approvedRequired.length}`);
console.log(`Missing required source records: ${requiredActiveLogoKeys.filter((key) => !sourceByKey.has(key)).length}`);
console.log(`Unresolved required: ${unresolvedRequired.length}`);
console.log(`Checksum mismatch: ${checksumMismatch.length}`);
console.log(`Fallback usage/metadata: ${fallbackGenerated.length}`);
console.log(`Missing local files: ${missingLocalFiles.length}`);
console.log(`Active metrics: ${activeMetrics.length}`);
console.log(`Active metrics without requirements: ${activeMetricsWithoutRequirements.length}`);
console.log(`Unknown/optional fallback warnings: ${warnings.length}`);
console.log(`Alias collisions: ${aliasCollisions.length}`);
console.log(`Required active entity issues: ${requiredIssues.length}`);

printList("Missing local files", missingLocalFiles);
printList("Needs-review source entries", needsReview);
printList("Checksum mismatches", checksumMismatch, (issue) => issue);
printList("Fallback/generated/initials-like entries", fallbackGenerated);
printList("Unresolved required entities", unresolvedRequired, (entry) => `${entry.category}:${entry.slug} ${entry.canonicalName}`);
printList("Alias collisions", aliasCollisions, (issue) => issue);
printList("Required active entity issues", requiredIssues, (issue) => issue);
printList("Active metrics without logo requirements", activeMetricsWithoutRequirements, (id) => id);

if (requiredIssues.length || activeMetricsWithoutRequirements.length || aliasCollisions.length || checksumMismatch.length || unresolvedRequired.length) {
  console.error("\ncheck:logos failed. Required active entities must have registry config plus approved local source-manifest records with matching checksums; active metrics must define logo requirements.");
  process.exit(1);
}

console.log("\ncheck:logos passed.");
