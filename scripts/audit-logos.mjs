import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";

function loadTsModule(filePath) {
  const source = readFileSync(filePath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, require: () => ({}), console });
  vm.runInContext(js, context, { filename: filePath });
  return module.exports;
}

const { logoRegistry, normalizeLogoKey, getLogoRegistryEntry } = loadTsModule("lib/logos/logoRegistry.ts");
const { metricLogoRequirements, requiredActiveLogoKeys } = loadTsModule("lib/logos/metricLogoRequirements.ts");
const { datasetGroups } = loadTsModule("lib/datasets.ts");

const byKey = new Map(logoRegistry.map((logo) => [`${logo.category}:${logo.slug}`, logo]));
const toFsPath = (localPath) => localPath ? join("public", localPath.replace(/^\//, "")) : null;
const isPlaceholderLike = (logo) => /placeholder|generated|initials|fallback|temporary/i.test(`${logo.sourceType} ${logo.quality} ${logo.sourceNote ?? ""} ${logo.notes ?? ""}`);
const hasSource = (logo) => Boolean(logo.sourceUrl || logo.sourceNote);
const isExternalRuntime = (logo) => !logo.localPath || /^https?:\/\//i.test(logo.localPath);
const requiredSet = new Set(requiredActiveLogoKeys);

function requiredFileLooksPlaceholder(logo) {
  if (!logo.localPath || !existsSync(toFsPath(logo.localPath))) return false;
  const source = readFileSync(toFsPath(logo.localPath), "utf8");
  return /<text\b|Arial Black|Inter, Arial|dominant-baseline="middle" font-family/i.test(source);
}

const activeMetrics = datasetGroups.flatMap((group) => group.metrics.filter((metric) => metric.status === "active").map((metric) => metric.id));
const activeMetricsWithoutRequirements = activeMetrics.filter((id) => !metricLogoRequirements[id]);

const missingLocalFiles = logoRegistry.filter((logo) => !logo.localPath || !existsSync(toFsPath(logo.localPath)));
const approvedLocal = logoRegistry.filter((logo) => logo.localPath && existsSync(toFsPath(logo.localPath)) && logo.quality === "approved");
const externalOnly = logoRegistry.filter((logo) => isExternalRuntime(logo) || logo.sourceType === "data-provider");
const needsReview = logoRegistry.filter((logo) => logo.quality === "needs-review");
const rejected = logoRegistry.filter((logo) => logo.quality === "rejected");
const fallbackGenerated = logoRegistry.filter(isPlaceholderLike);

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

const requiredIssues = [];
for (const key of requiredActiveLogoKeys) {
  const logo = byKey.get(key);
  if (!logo) {
    requiredIssues.push(`${key}: missing registry entry`);
    continue;
  }
  const resolved = getLogoRegistryEntry(logo.canonicalName, logo.category);
  if (!resolved || `${resolved.category}:${resolved.slug}` !== key) requiredIssues.push(`${key}: canonical name resolves incorrectly`);
  if (!logo.localPath) requiredIssues.push(`${key}: missing localPath`);
  else if (isExternalRuntime(logo)) requiredIssues.push(`${key}: external runtime localPath is not allowed (${logo.localPath})`);
  else if (!existsSync(toFsPath(logo.localPath))) requiredIssues.push(`${key}: local file not found (${logo.localPath})`);
  if (logo.sourceType === "data-provider") requiredIssues.push(`${key}: unacceptable required sourceType ${logo.sourceType}`);
  if (logo.quality !== "approved") requiredIssues.push(`${key}: quality is ${logo.quality}`);
  if (!hasSource(logo)) requiredIssues.push(`${key}: source/provenance is missing`);
  if (!logo.rightsNote) requiredIssues.push(`${key}: rights note is missing`);
  if (isPlaceholderLike(logo)) requiredIssues.push(`${key}: resolves to placeholder/generated/initials/fallback metadata`);
  if (requiredFileLooksPlaceholder(logo)) requiredIssues.push(`${key}: local file still contains text/initials placeholder markup`);
}

function printList(label, list, mapper = (row) => `${row.category}/${row.slug}: ${row.canonicalName}${row.localPath ? ` (${row.localPath})` : ""}`) {
  if (!list.length) return;
  console.log(`\n${label}:`);
  for (const row of list) console.log(`- ${mapper(row)}`);
}

console.log("Logo audit summary");
console.log(`Total registry entries: ${logoRegistry.length}`);
console.log(`Approved local logos: ${approvedLocal.length}`);
console.log(`Missing local files: ${missingLocalFiles.length}`);
console.log(`Needs-review entries: ${needsReview.length}`);
console.log(`Rejected entries: ${rejected.length}`);
console.log(`External-only/data-provider entries: ${externalOnly.length}`);
console.log(`Fallback/generated/initials-like entries: ${fallbackGenerated.length}`);
console.log(`Alias collisions: ${aliasCollisions.length}`);
console.log(`Required active entities: ${requiredActiveLogoKeys.length}`);
console.log(`Required active entity issues: ${requiredIssues.length}`);
console.log(`Active metrics: ${activeMetrics.length}`);
console.log(`Active metrics without logo requirements: ${activeMetricsWithoutRequirements.length}`);

printList("Missing local files", missingLocalFiles);
printList("Needs-review entries", needsReview);
printList("Rejected entries", rejected);
printList("External-only/data-provider entries", externalOnly);
printList("Fallback/generated/initials-like entries", fallbackGenerated);
printList("Alias collisions", aliasCollisions, (issue) => issue);
printList("Required active entity issues", requiredIssues, (issue) => issue);
printList("Active metrics without logo requirements", activeMetricsWithoutRequirements, (id) => id);

if (requiredIssues.length || activeMetricsWithoutRequirements.length || aliasCollisions.length) {
  console.error("\ncheck:logos failed. Required active entities must have approved local non-placeholder logos, aliases must not collide, and every active metric must define logo requirements.");
  process.exit(1);
}

console.log("\ncheck:logos passed.");
