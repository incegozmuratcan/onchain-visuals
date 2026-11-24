#!/usr/bin/env node
/**
 * Render the stablecoin supply weekly or monthly card (CSS 1536×1134, PNG at 2×).
 *
 * Usage: node scripts/x-stablecoin-supply-period.mjs weekly|monthly [--preflight]
 *
 * Dry-run by default. A live post also waits when the sibling card of the
 * same metric posted on the same Europe/Istanbul day less than 4 hours ago.
 * On the weekly card's weekday, the monthly card waits until that weekly
 * post exists and is 4 hours old.
 */
import { spawn } from "node:child_process";
import { appendFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { decideStablecoinPeriodShare, readPostState, recordShare } from "./x-stablecoin-supply-period-gate.mjs";

const kind = process.argv.find((arg) => arg === "weekly" || arg === "monthly");
if (!kind) {
  console.error("Pass weekly or monthly.");
  process.exit(1);
}

const spec = {
  weekly: {
    kind: "weekly",
    label: "week",
    slug: "chain-stablecoin-supply-weekly",
    period: "weekly",
    layout: "stablecoin-supply-weekly",
    view: "weekly",
    badge: "7D",
    artifact: "chain-stablecoin-supply-weekly",
    publishPath: "/api/x/publish-chain-stablecoin-supply-weekly",
    role: "weekly",
    weeklyWeekday: 2,
    siblingState: "artifacts/x-chain-stablecoin-supply-monthly/posted-state.json",
  },
  monthly: {
    kind: "monthly",
    label: "month",
    slug: "chain-stablecoin-supply-monthly",
    period: "monthly",
    layout: "stablecoin-supply-monthly",
    view: "monthly",
    badge: "1M",
    artifact: "chain-stablecoin-supply-monthly",
    publishPath: "/api/x/publish-chain-stablecoin-supply-monthly",
    role: "monthly",
    weeklyWeekday: 2,
    siblingState: "artifacts/x-chain-stablecoin-supply-weekly/posted-state.json",
  },
}[kind];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || (kind === "weekly" ? 4188 : 4189));
const base = `http://127.0.0.1:${port}`;
const outDir = path.join(root, "artifacts", `x-${spec.artifact}`);
const statePath = process.env.X_STABLECOIN_POST_STATE
  ? path.resolve(process.env.X_STABLECOIN_POST_STATE)
  : path.join(outDir, "posted-state.json");
process.env.CHAIN_REVENUE_LOGO_STATE = statePath;
const preflightOnly = process.argv.includes("--preflight");
const cardWidth = 1536;
const cardHeight = 1134;
const rowCount = 10;

function livePostRequested() {
  const value = String(process.env.X_DRY_RUN ?? "true").trim().toLowerCase();
  return value === "false" || value === "0" || value === "off";
}

function pngSize(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Capture is not a PNG.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

async function importTs(relative, prefix) {
  const source = await readFile(path.join(root, relative), "utf8");
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  const file = path.join(dir, "module.mjs");
  await writeFile(file, transpile(source));
  return import(pathToFileURL(file).href);
}

let supplyModule;
function loadSupply() {
  supplyModule ||= importTs("lib/onchain/stablecoinSupply.ts", `stablecoin-supply-${kind}-`);
  return supplyModule;
}

let spacingModule;
function loadSpacing() {
  spacingModule ||= importTs("lib/onchain/sameDaySpacing.ts", "same-day-spacing-");
  return spacingModule;
}

async function fetchJson(url, { timeoutMs = 30_000, retries = 2 } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      last = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error(`Fetch failed: ${url}`);
}

async function evaluateShare(dryRun) {
  const lib = await loadSupply();
  const now = new Date();
  const history = await lib.fetchStablecoinHistory(fetchJson);
  const range = lib.periodRange(kind, now);
  const assessment = lib.assessStablecoinPeriod(history, kind, now);
  const posts = await readPostState(statePath);
  let decision = decideStablecoinPeriodShare({
    assessment,
    expectedStart: range.start,
    dryRun,
    posts,
    label: spec.label,
  });
  if (!dryRun && decision.proceed) {
    const spacing = await loadSpacing();
    const siblingPath = process.env.X_SIBLING_POST_STATE
      ? path.resolve(process.env.X_SIBLING_POST_STATE)
      : path.join(root, spec.siblingState);
    const siblingPosts = await readPostState(siblingPath);
    const gate = spacing.assessSameDaySpacing({
      now,
      role: spec.role,
      siblingPosts,
      weeklyPostWeekday: spec.weeklyWeekday,
    });
    if (!gate.proceed) {
      decision = { ...decision, proceed: false, skipped: true, reason: gate.reason, noNewSession: false, message: gate.message };
    }
  }
  return { dryRun, now: now.toISOString(), range, assessment, failed: history.failed, decision };
}

async function writeGithubProceed(proceed) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  await appendFile(output, `proceed=${proceed ? "true" : "false"}\n`);
}

async function writeSkipArtifact(share) {
  await mkdir(outDir, { recursive: true });
  const result = {
    dryRun: share.dryRun,
    posted: false,
    skipped: true,
    reason: share.decision.reason,
    noNewSession: share.decision.noNewSession,
    date: share.decision.date,
    periodEnd: share.range?.end || null,
    checkedAt: share.now,
    message: share.decision.message,
    coverage: share.decision.coverage,
    failedChains: share.failed || [],
  };
  await writeFile(path.join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function refreshSecret() {
  if (!process.env.ONCHAIN_REFRESH_SECRET && !process.env.CRON_SECRET) {
    process.env.ONCHAIN_REFRESH_SECRET = `gha-local-${process.pid}`;
  }
  return process.env.ONCHAIN_REFRESH_SECRET || process.env.CRON_SECRET;
}

async function waitForServer(child, readyPath) {
  const readyUrl = `${base}${readyPath}`;
  const deadline = Date.now() + 180_000;
  let lastError = "server did not respond";
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Next.js exited early with code ${child.exitCode}.`);
    try {
      const response = await fetch(readyUrl, { signal: AbortSignal.timeout(60_000) });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Next.js did not become ready: ${lastError}`);
}

function startServer() {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = [];
  const append = (chunk) => {
    log.push(chunk.toString());
    if (log.join("").length > 200_000) log.shift();
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.logText = () => log.join("");
  return child;
}

async function refreshPeriod(secret) {
  const response = await fetch(`${base}/api/admin/onchain/refresh/${spec.slug}?period=${spec.period}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Refresh failed with HTTP ${response.status}.`);
  return payload;
}

function assertPublishable(snapshot, start) {
  if (!snapshot || snapshot.datasetSlug !== spec.slug) throw new Error(`Snapshot is not the stablecoin supply ${spec.label} card.`);
  if (snapshot.metadata?.view !== spec.view || snapshot.metadata?.layout !== spec.layout) {
    throw new Error(`Snapshot is not the ${spec.kind} stablecoin supply layout.`);
  }
  if (snapshot.metadata?.titleBadge !== spec.badge) {
    throw new Error(`Stablecoin supply badge is ${snapshot.metadata?.titleBadge}; expected ${spec.badge}.`);
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status !== "fresh") {
    throw new Error(snapshot.freshness?.message || "Stablecoin supply snapshot is not publishable.");
  }
  if (snapshot.metadata?.periodStart !== start) {
    throw new Error(`Stablecoin supply snapshot period ${snapshot.metadata?.periodStart} does not match ${start}.`);
  }
  if (!snapshot.metadata?.coverage?.complete) throw new Error("Stablecoin supply snapshot coverage is incomplete.");
  const bars = snapshot.series?.bars || [];
  if (bars.length !== rowCount) throw new Error(`Stablecoin supply snapshot has ${bars.length} rows; the card needs ${rowCount}.`);
  for (const [index, row] of bars.entries()) {
    if (row?.rank !== index + 1 || !row?.name || !row?.formattedValue || !(Number(row?.value) > 0) || !row?.formattedPercent) {
      throw new Error(`Stablecoin supply row ${index + 1} is incomplete.`);
    }
    if (index > 0 && Number(row.value) > Number(bars[index - 1].value)) {
      throw new Error(`Stablecoin supply rows are not sorted at rank ${index + 1}.`);
    }
  }
  if (!snapshot.metadata?.formattedTotal || !(Number(snapshot.metadata?.chainCount) > 0)) {
    throw new Error("Stablecoin supply total is missing.");
  }
  if (!snapshot.metadata?.leader?.name || !snapshot.metadata?.formattedHighlight) {
    throw new Error("Stablecoin supply highlight is missing.");
  }
  const caption = String(snapshot.metadata?.caption || "");
  if (!caption || /defillama/i.test(caption)) throw new Error("Stablecoin supply caption is missing.");
}

async function captureCard(pageUrl) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: cardWidth, height: cardHeight }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 120_000 });
    const card = page.locator("[data-capture='share-card']");
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode?.().catch(() => {}) ?? Promise.resolve()));
    });
    await page.locator("[data-name-fit='ready']").waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(250);
    const fit = await page.evaluate(() => {
      const boxes = ["total", "highlight"].map((chip) => {
        const el = document.querySelector(`[data-chip='${chip}']`);
        const box = el?.getBoundingClientRect();
        return { chip, width: box ? Math.round(box.width) : 0, height: box ? Math.round(box.height) : 0 };
      });
      const names = [...document.querySelectorAll("[data-chain-name]")].map((el) => {
        const style = getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight);
        return { name: el.getAttribute("data-chain-name"), fontSize, lineHeight };
      });
      const frame = document.querySelector("#share-card");
      const frameClipped = frame
        ? frame.scrollHeight > frame.clientHeight + 2 || frame.scrollWidth > frame.clientWidth + 2
        : true;
      const badge = document.querySelector("[data-title-badge]")?.getAttribute("data-title-badge") || "";
      const images = [...document.querySelectorAll("[data-capture='share-card'] img")].map((img) => ({
        alt: img.alt,
        loaded: img.complete && img.naturalWidth > 0,
      }));
      const fallbacks = [...document.querySelectorAll("[data-chain-logo-fallback]")].map((el) => el.getAttribute("data-chain-logo-fallback"));
      return {
        boxes,
        names,
        rows: document.querySelectorAll("[data-chain-row]").length,
        frameClipped,
        badge,
        images,
        fallbacks,
      };
    });
    if (fit.rows !== rowCount) throw new Error(`Stablecoin card drew ${fit.rows} rows; expected ${rowCount}.`);
    if (fit.badge !== spec.badge) throw new Error(`Title badge is ${fit.badge}; expected ${spec.badge}.`);
    const wrongBox = fit.boxes.filter((box) => Math.abs(box.width - 643) > 1 || Math.abs(box.height - 101) > 1);
    if (wrongBox.length) throw new Error(`Summary boxes are not 643×101: ${JSON.stringify(wrongBox)}.`);
    const clippedNames = fit.names.filter((row) => !(row.lineHeight >= row.fontSize * 1.15));
    if (clippedNames.length) throw new Error(`Chain names are still on line-height 1: ${JSON.stringify(clippedNames)}.`);
    if (fit.frameClipped) throw new Error("Stablecoin supply card overflows the share frame.");
    const brokenLogos = fit.images.filter((img) => !img.loaded);
    if (brokenLogos.length) {
      console.warn(`Stablecoin logos failed to load and the card kept an initial badge: ${brokenLogos.map((img) => img.alt).join(", ")}`);
    }
    const box = await card.boundingBox();
    if (!box) throw new Error("Share card bounding box is missing.");
    if (Math.abs(box.width - cardWidth) > 1 || Math.abs(box.height - cardHeight) > 1) {
      throw new Error(`Share card measured ${box.width}×${box.height}; expected ${cardWidth}×${cardHeight}.`);
    }
    const png = await page.screenshot({
      type: "png",
      animations: "disabled",
      caret: "hide",
      clip: { x: box.x, y: box.y, width: cardWidth, height: cardHeight },
    });
    const dims = pngSize(png);
    const pngWidth = cardWidth * 2;
    const pngHeight = cardHeight * 2;
    if (dims.width !== pngWidth || dims.height !== pngHeight) {
      throw new Error(`PNG is ${dims.width}×${dims.height}; expected ${pngWidth}×${pngHeight}.`);
    }
    if (png.length > 5 * 1024 * 1024) {
      throw new Error(`PNG is ${png.length} bytes; X's image limit is 5 MB.`);
    }
    return { png, dims, logoFallbacks: fit.fallbacks, names: fit.names };
  } finally {
    await browser.close();
  }
}

async function main() {
  const dryRun = !livePostRequested();
  const share = await evaluateShare(dryRun);
  if (preflightOnly) {
    await writeGithubProceed(share.decision.proceed);
    if (!share.decision.proceed) await writeSkipArtifact(share);
    console.log(share.decision.message);
    console.log(JSON.stringify({ preflight: true, ...share.decision, dryRun }, null, 2));
    return;
  }
  if (!share.decision.proceed) {
    const skipped = await writeSkipArtifact(share);
    console.log(share.decision.message);
    console.log(JSON.stringify(skipped, null, 2));
    return;
  }
  const publishSecretProvided = Boolean(process.env.ONCHAIN_PUBLISH_SECRET);
  if (!publishSecretProvided) process.env.ONCHAIN_PUBLISH_SECRET = `local-${process.pid}`;
  const secret = refreshSecret();
  await mkdir(outDir, { recursive: true });
  const child = startServer();
  try {
    await waitForServer(child, `/api/charts/${spec.slug}?period=${spec.period}`);
    const refreshed = await refreshPeriod(secret);
    if (refreshed?.status && refreshed.status !== "active") {
      throw new Error(refreshed?.freshness?.message || `Refresh returned status ${refreshed.status}.`);
    }
    const chartResponse = await fetch(`${base}/api/charts/${spec.slug}?period=${spec.period}`);
    const snapshot = await chartResponse.json().catch(() => null);
    if (!chartResponse.ok) throw new Error(snapshot?.error || `Chart fetch failed with HTTP ${chartResponse.status}.`);
    assertPublishable(snapshot, share.decision.date);
    const caption = String(snapshot.metadata.caption || "");
    const captured = await captureCard(`${base}/onchain/${spec.slug}?period=${spec.period}&capture=1`);
    const pngName = `${spec.artifact}.png`;
    await writeFile(path.join(outDir, pngName), captured.png);
    await writeFile(path.join(outDir, "caption.txt"), `${caption}\n`);
    const result = {
      dryRun,
      posted: false,
      skipped: false,
      reason: null,
      date: snapshot.metadata.periodStart,
      periodEnd: snapshot.metadata.periodEnd,
      checkedAt: share.now,
      caption,
      titleBadge: snapshot.metadata.titleBadge,
      total: snapshot.metadata.formattedTotal,
      chainCount: snapshot.metadata.chainCount,
      highlight: snapshot.metadata.leader,
      highlightKind: snapshot.metadata.highlightKind,
      logoSources: snapshot.metadata?.logoSources || [],
      logoWarnings: snapshot.metadata?.logoWarnings || [],
      rows: (snapshot.series?.bars || []).map((row) => ({
        rank: row.rank,
        name: row.name,
        formattedValue: row.formattedValue,
        formattedPercent: row.formattedPercent,
        rankChange: row.rankChange || null,
      })),
      image: { path: pngName, width: captured.dims.width, height: captured.dims.height, bytes: captured.png.length },
    };
    for (const warning of result.logoWarnings) console.warn(warning);
    if (!dryRun) {
      const oauth1Ready = ["X_CONSUMER_KEY", "X_CONSUMER_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"].every(
        (name) => String(process.env[name] || "").trim(),
      );
      if (!publishSecretProvided || !oauth1Ready) {
        throw new Error("Refusing to post: set ONCHAIN_PUBLISH_SECRET and the @OnchainVis OAuth 1.0a secrets, with X_DRY_RUN=false.");
      }
      const publish = await fetch(`${base}${spec.publishPath}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.ONCHAIN_PUBLISH_SECRET}`,
        },
        body: JSON.stringify({
          date: snapshot.metadata.periodStart,
          imageDataUrl: `data:image/png;base64,${captured.png.toString("base64")}`,
        }),
      });
      const payload = await publish.json().catch(() => ({}));
      if (!publish.ok || !payload?.success) {
        throw new Error(payload?.error?.message || `Publish route failed with HTTP ${publish.status}.`);
      }
      if (payload.dryRun) throw new Error("Publish route stayed in dry-run. Set X_DRY_RUN=false on the server process.");
      result.posted = true;
      result.postId = payload.postId;
      result.postUrl = payload.postUrl;
    }
    await recordShare(statePath, {
      date: result.date,
      mode: dryRun ? "dry-run" : "live",
      at: new Date().toISOString(),
      postId: result.postId || null,
      postUrl: result.postUrl || null,
    });
    result.shareRecorded = true;
    await writeFile(path.join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ dryRun: result.dryRun, posted: result.posted, date: result.date, caption: result.caption, rows: result.rows, image: result.image }, null, 2));
  } catch (error) {
    await writeFile(path.join(outDir, "server.log"), child.logText()).catch(() => {});
    throw error;
  } finally {
    if (child.exitCode == null) child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
