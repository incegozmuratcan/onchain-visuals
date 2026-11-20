/**
 * Shared freshness skip for the ETF X scripts.
 * A snapshot that is not active+fresh must not be posted. The script exits 0
 * so a later scheduled pass can retry, matching the completeness gate.
 * A fresh snapshot returns null and the caller keeps its existing date checks.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function notFreshMessage(snapshot) {
  const status = snapshot?.status;
  const freshness = snapshot?.freshness?.status;
  if (status === "active" && freshness === "fresh") return null;
  return `not fresh / skipped (status ${status ?? "missing"}, freshness ${freshness ?? "missing"}).`;
}

export async function writeNotFreshSkip(outDir, message, extra = {}) {
  if (typeof extra.dryRun !== "boolean") {
    throw new Error("writeNotFreshSkip requires dryRun from the caller.");
  }
  await mkdir(outDir, { recursive: true });
  const result = {
    posted: false,
    skipped: true,
    reason: "not_fresh",
    message,
    ...extra,
  };
  await writeFile(path.join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(message);
  console.log(JSON.stringify(result, null, 2));
  return result;
}
