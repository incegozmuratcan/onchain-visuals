#!/usr/bin/env node
/**
 * Copy the newest Actions artifact's posted-state.json into a local directory.
 * A missing token or artifact is not an error: the gate then treats the card
 * as never posted.
 *
 * Usage: node scripts/restore-posted-state.mjs <artifact-name> <dest-dir>
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const [artifactName, destDir] = process.argv.slice(2);
if (!artifactName || !destDir) {
  console.error("Usage: node scripts/restore-posted-state.mjs <artifact-name> <dest-dir>");
  process.exit(1);
}

const token = process.env.GH_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const dest = path.resolve(destDir);
await mkdir(dest, { recursive: true });
if (!token || !repo) {
  console.log("No Actions artifact API. Keeping any local post state.");
  process.exit(0);
}

const listUrl = `https://api.github.com/repos/${repo}/actions/artifacts?per_page=100&name=${encodeURIComponent(artifactName)}`;
const list = await fetch(listUrl, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  },
});
if (!list.ok) throw new Error(`Artifact list failed with HTTP ${list.status}.`);
const payload = await list.json();
const rows = (payload.artifacts || []).filter((row) => row && row.name === artifactName && !row.expired);
rows.sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
if (!rows[0]) {
  console.log("No earlier share record.");
  process.exit(0);
}
const zipUrl = `https://api.github.com/repos/${repo}/actions/artifacts/${rows[0].id}/zip`;
const zipRes = await fetch(zipUrl, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
  },
  redirect: "follow",
});
if (!zipRes.ok) throw new Error(`Artifact download failed with HTTP ${zipRes.status}.`);
const tmp = await mkdtemp(path.join(tmpdir(), "posted-state-"));
const zipPath = path.join(tmp, "artifact.zip");
await writeFile(zipPath, Buffer.from(await zipRes.arrayBuffer()));
await exec("unzip", ["-q", zipPath, "-d", path.join(tmp, "unzip")]);
const { stdout } = await exec("find", [path.join(tmp, "unzip"), "-name", "posted-state.json", "-print", "-quit"]);
const found = stdout.trim();
if (!found) {
  console.log(`Latest artifact ${rows[0].id} has no post state yet.`);
  process.exit(0);
}
const raw = await readFile(found);
await writeFile(path.join(dest, "posted-state.json"), raw);
console.log(`Restored posted-state.json from artifact ${rows[0].id}.`);
