#!/usr/bin/env node
/**
 * Render the Chain Revenue Daily card at 1536×1134 and write a caption.
 *
 * Dry-run by default: writes artifacts/x-chain-revenue-daily/{png,caption,result}
 * and does not call X. A live post happens only when X_DRY_RUN is exactly
 * false (or 0 / off), ONCHAIN_PUBLISH_SECRET is set, the four OAuth 1.0a
 * secrets below are set, and neither --preview nor --as-of is used.
 *
 * Data is DefiLlama dailyRevenue per chain (protocolType chain, category
 * Chain), read from each chain's summary totalDataChart for one exact UTC
 * calendar day. total24h is never used.
 *
 * The share day is the latest completed UTC day. It posts only when that day
 * is complete: the chain count reaches 95% of the median of the previous three
 * days and every chain from the previous day's top 10 has revenue on it.
 * DefiLlama fills a day late, so an incomplete pass exits 0 without posting and
 * a later pass tries again. A day already recorded in posted-state.json is not
 * posted again. A recorded post with no timestamp is given one on the next
 * run, so the weekly card can measure the hour after Sunday's daily.
 *
 * --preview=long-names renders the synthetic long-name fixture and never posts.
 * --as-of=<ISO time> runs the gate as if it were that time (dry-run only), to
 * re-render a past day.
 *
 * X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and
 * X_ACCESS_TOKEN_SECRET are the @OnchainVis OAuth 1.0 Keys (Read and write).
 */
import { spawn } from "node:child_process";
import { appendFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { decideChainRevenueShare, ensureShareTimestamps, readPostState, recordShare } from "./x-chain-revenue-daily-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4177);
const base = `http://127.0.0.1:${port}`;
const previewArg = process.argv.find((arg) => arg.startsWith("--preview="))?.slice("--preview=".length) || "";
const asOfArg = process.argv.find((arg) => arg.startsWith("--as-of="))?.slice("--as-of=".length) || "";
const outDir = path.join(root, "artifacts", "x-chain-revenue-daily");
const statePath = process.env.X_CHAIN_REVENUE_POST_STATE
  ? path.resolve(process.env.X_CHAIN_REVENUE_POST_STATE)
  : path.join(outDir, "posted-state.json");
process.env.CHAIN_REVENUE_LOGO_STATE = statePath;
const datasetSlug = "chain-revenue-daily";
const useDev = process.argv.includes("--dev");
const preflightOnly = process.argv.includes("--preflight");
const cardWidth = 1536;
const cardHeight = 1134;
const rowCount = 10;

function livePostRequested() {
  const value = String(process.env.X_DRY_RUN ?? "true").trim().toLowerCase();
  return value === "false" || value === "0" || value === "off";
}

function runNow() {
  if (!asOfArg) return new Date();
  const at = new Date(asOfArg);
  if (Number.isNaN(at.getTime())) throw new Error(`--as-of=${asOfArg} is not a valid time.`);
  return at;
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
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

async function importTs(relative, prefix) {
  const source = await readFile(path.join(root, relative), "utf8");
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  const file = path.join(dir, "module.mjs");
  await writeFile(file, transpile(source));
  return import(pathToFileURL(file).href);
}

let revenueModule;

function loadRevenueModule() {
  revenueModule ||= importTs("lib/onchain/chainRevenueDaily.ts", "chain-revenue-daily-");
  return revenueModule;
}

function loadCaptionBuilder() {
  return importTs("lib/onchain/chainRevenueCaption.ts", "chain-revenue-caption-");
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
  const lib = await loadRevenueModule();
  const now = runNow();
  const stored = await readPostState(statePath);
  const posts = (await ensureShareTimestamps(statePath, stored, new Date().toISOString())).posts;
  const fetched = await lib.fetchChainRevenueDays(fetchJson, { now });
  const expectedDate = lib.latestCompletedUtcDay(now);
  const assessment = lib.assessChainRevenueDay(fetched.days, expectedDate);
  const decision = decideChainRevenueShare({ assessment, expectedDate, dryRun, posts });
  return { dryRun, now: now.toISOString(), assessment, failed: fetched.failed, decision };
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
    if (child.exitCode != null) {
      throw new Error(`Next.js exited early with code ${child.exitCode}.`);
    }
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
  const args = useDev
    ? [nextBin, "dev", "-p", String(port), "-H", "127.0.0.1"]
    : [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"];
  const child = spawn(process.execPath, args, {
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

async function refreshDaily(secret) {
  const response = await fetch(`${base}/api/admin/onchain/refresh/${datasetSlug}?period=24h`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Refresh failed with HTTP ${response.status}.`);
  }
  return payload;
}

function assertPublishable(snapshot, date) {
  if (!snapshot || snapshot.datasetSlug !== datasetSlug) {
    throw new Error("Snapshot is not the Chain Revenue Daily card.");
  }
  if (snapshot.metadata?.view !== "daily" || snapshot.metadata?.layout !== "chain-revenue-daily") {
    throw new Error("Snapshot is not the daily chain revenue layout.");
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status !== "fresh") {
    throw new Error(
      snapshot.freshness?.message ||
        `Chain revenue snapshot is not publishable (status ${snapshot.status}, freshness ${snapshot.freshness?.status}).`,
    );
  }
  if (snapshot.metadata?.latestCompletedDate !== date) {
    throw new Error(
      `Chain revenue snapshot day ${snapshot.metadata?.latestCompletedDate} does not match the complete UTC day ${date}.`,
    );
  }
  if (!snapshot.metadata?.coverage?.complete) {
    throw new Error(`Chain revenue snapshot coverage is incomplete: ${snapshot.metadata?.coverage?.message || "unknown"}.`);
  }
  const bars = snapshot.series?.bars || [];
  if (bars.length !== rowCount) {
    throw new Error(`Chain revenue snapshot has ${bars.length} rows; the card needs ${rowCount}.`);
  }
  for (const [index, row] of bars.entries()) {
    if (row?.rank !== index + 1 || !row?.name || !row?.formattedValue || !(Number(row?.value) > 0)) {
      throw new Error(`Chain revenue row ${index + 1} is incomplete: ${JSON.stringify(row)}.`);
    }
    if (index > 0 && Number(row.value) > Number(bars[index - 1].value)) {
      throw new Error(`Chain revenue rows are not sorted at rank ${index + 1}.`);
    }
  }
  const leader = snapshot.metadata?.leader;
  if (!leader?.name || leader.slug !== bars[0].slug || !leader.formattedShare) {
    throw new Error("Chain revenue #1 share chip does not match the top row.");
  }
  if (!snapshot.metadata?.formattedTotal || !(Number(snapshot.metadata?.chainCount) > 0)) {
    throw new Error("Chain revenue total chip is missing.");
  }
}

async function captureCard(pageUrl) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: cardWidth, height: cardHeight },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 120_000 });
    const card = page.locator("[data-capture='share-card']");
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) => img.decode?.().catch(() => {}) ?? Promise.resolve()),
      );
    });
    // Long names shrink after fonts load; a failed icon swaps to its initial circle.
    await page.locator("[data-name-fit='ready']").waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForTimeout(250);
    const fit = await page.evaluate(() => {
      function clipReason(el) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return "empty";
        if (el.scrollWidth > el.clientWidth + 1) return "self";
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const style = getComputedStyle(parent);
          const clips = /hidden|clip|scroll|auto/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`);
          const parentRect = parent.getBoundingClientRect();
          if (
            clips &&
            (rect.right > parentRect.right + 1.5 ||
              rect.left < parentRect.left - 1.5 ||
              rect.bottom > parentRect.bottom + 1.5)
          ) {
            return "parent";
          }
          parent = parent.parentElement;
        }
        return null;
      }
      const values = [
        ...document.querySelectorAll(
          "[data-chip], [data-total-revenue], [data-chain-count], [data-leader-name], [data-leader-share], [data-chain-name], [data-chain-amount], [data-title-badge]",
        ),
      ].map((el) => ({
        text: (el.textContent || "").replace(/\s+/g, " ").trim(),
        clipped: clipReason(el),
      }));
      // A name must end before its bar starts.
      const nameOverlap = [...document.querySelectorAll("[data-chain-row]")].map((row) => {
        const name = row.querySelector("[data-chain-name]");
        const bar = row.querySelector("[data-chain-bar]")?.parentElement;
        if (!name || !bar) return 999;
        const range = document.createRange();
        range.selectNodeContents(name);
        return range.getBoundingClientRect().right - bar.getBoundingClientRect().left;
      });
      const tracks = [...document.querySelectorAll("[data-bar-track]")].map((el) => Math.round(el.getBoundingClientRect().x));
      const names = [...document.querySelectorAll("[data-chain-name]")].map((el) => ({
        name: el.getAttribute("data-chain-name"),
        fontSize: getComputedStyle(el).fontSize,
      }));
      const images = [...document.querySelectorAll("[data-capture='share-card'] img")].map((img) => ({
        alt: img.alt,
        src: img.currentSrc || img.src,
        loaded: img.complete && img.naturalWidth > 0,
      }));
      const fallbacks = [...document.querySelectorAll("[data-chain-logo-fallback]")].map((el) =>
        el.getAttribute("data-chain-logo-fallback"),
      );
      const rows = document.querySelectorAll("[data-chain-row]").length;
      const frame = document.querySelector("#share-card");
      const frameClipped = frame
        ? frame.scrollHeight > frame.clientHeight + 2 || frame.scrollWidth > frame.clientWidth + 2
        : true;
      return { values, nameOverlap, tracks, names, images, fallbacks, rows, frameClipped };
    });
    if (fit.rows !== rowCount) {
      throw new Error(`Chain revenue card drew ${fit.rows} rows; expected ${rowCount}.`);
    }
    if (fit.tracks?.length && new Set(fit.tracks).size !== 1) {
      throw new Error(`Chain revenue bar columns do not share one x: ${fit.tracks.join(", ")}.`);
    }
    const overflow = fit.values.filter((item) => item.clipped || !item.text || /…/.test(item.text));
    const overlapping = fit.nameOverlap.filter((gap) => gap > -4);
    const brokenLogos = fit.images.filter((img) => !img.loaded);
    if (brokenLogos.length) {
      console.warn(`Chain revenue logos failed to load and the card kept an initial badge: ${brokenLogos.map((img) => img.alt).join(", ")}`);
    }
    if (overflow.length || overlapping.length || fit.frameClipped) {
      throw new Error(`Chain revenue values do not fit the share card: ${JSON.stringify({ overflow, overlapping, frameClipped: fit.frameClipped })}`);
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
    if (dims.width !== cardWidth || dims.height !== cardHeight) {
      throw new Error(`PNG is ${dims.width}×${dims.height}; expected ${cardWidth}×${cardHeight}.`);
    }
    return { png, dims, values: fit.values, names: fit.names, logoFallbacks: fit.fallbacks, barX: fit.tracks?.[0] ?? null };
  } finally {
    await browser.close();
  }
}

async function capturePreview() {
  if (previewArg !== "long-names") {
    throw new Error("Chain revenue preview must be --preview=long-names. Previews are never posted.");
  }
  if (livePostRequested()) {
    throw new Error("Refusing to post a preview fixture. Leave X_DRY_RUN unset for --preview=long-names.");
  }
  await mkdir(outDir, { recursive: true });
  const child = startServer();
  try {
    const previewPath = `/onchain/${datasetSlug}?preview=long-names&capture=1`;
    await waitForServer(child, previewPath);
    const captured = await captureCard(`${base}${previewPath}`);
    await writeFile(path.join(outDir, "long-names.png"), captured.png);
    const result = {
      dryRun: true,
      posted: false,
      skipped: false,
      preview: "long-names",
      names: captured.names,
      logoFallbacks: captured.logoFallbacks,
      image: {
        path: "long-names.png",
        width: captured.dims.width,
        height: captured.dims.height,
        bytes: captured.png.length,
      },
    };
    await writeFile(path.join(outDir, "long-names-result.json"), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await writeFile(path.join(outDir, "server.log"), child.logText()).catch(() => {});
    throw error;
  } finally {
    if (child.exitCode == null) child.kill("SIGTERM");
  }
}

async function main() {
  if (previewArg) {
    await capturePreview();
    return;
  }
  const dryRun = !livePostRequested();
  if (asOfArg && !dryRun) {
    throw new Error("Refusing to post with --as-of. Re-rendering a past day is dry-run only.");
  }
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
  if (!publishSecretProvided) {
    process.env.ONCHAIN_PUBLISH_SECRET = `local-${process.pid}`;
  }
  const secret = refreshSecret();
  await mkdir(outDir, { recursive: true });
  const child = startServer();
  try {
    await waitForServer(child, `/api/charts/${datasetSlug}?period=24h`);
    const refreshed = await refreshDaily(secret);
    if (refreshed?.status && refreshed.status !== "active") {
      throw new Error(refreshed?.freshness?.message || `Refresh returned status ${refreshed.status}.`);
    }
    const chartResponse = await fetch(`${base}/api/charts/${datasetSlug}?period=24h`);
    const snapshot = await chartResponse.json().catch(() => null);
    if (!chartResponse.ok) {
      throw new Error(snapshot?.error || `Chart fetch failed with HTTP ${chartResponse.status}.`);
    }
    assertPublishable(snapshot, share.decision.date);
    const { buildChainRevenueDailyCaption } = await loadCaptionBuilder();
    const caption = buildChainRevenueDailyCaption(snapshot);
    const captured = await captureCard(`${base}/onchain/${datasetSlug}?period=24h&capture=1`);
    const pngPath = path.join(outDir, "chain-revenue-daily.png");
    const captionPath = path.join(outDir, "caption.txt");
    const resultPath = path.join(outDir, "result.json");
    await writeFile(pngPath, captured.png);
    await writeFile(captionPath, `${caption}\n`);
    const result = {
      dryRun,
      posted: false,
      skipped: false,
      reason: null,
      date: snapshot.metadata.latestCompletedDate,
      checkedAt: share.now,
      updatedAt: snapshot.freshness?.lastUpdatedAt || null,
      caption,
      coverage: share.decision.coverage,
      total: snapshot.metadata.formattedTotal,
      chainCount: snapshot.metadata.chainCount,
      leader: snapshot.metadata.leader,
      rows: (snapshot.series?.bars || []).map((row) => ({
        rank: row.rank,
        slug: row.slug,
        name: row.name,
        formattedValue: row.formattedValue,
        logo: row.logo,
      })),
      names: captured.names,
      logoFallbacks: captured.logoFallbacks,
      logoSources: snapshot.metadata?.logoSources || [],
      barX: captured.barX,
      image: {
        path: "chain-revenue-daily.png",
        width: captured.dims.width,
        height: captured.dims.height,
        bytes: captured.png.length,
      },
      preview: null,
    };

    if (!dryRun) {
      const oauth1Ready = [
        "X_CONSUMER_KEY",
        "X_CONSUMER_SECRET",
        "X_ACCESS_TOKEN",
        "X_ACCESS_TOKEN_SECRET",
      ].every((name) => String(process.env[name] || "").trim());
      if (!publishSecretProvided || !oauth1Ready) {
        throw new Error(
          "Refusing to post: set ONCHAIN_PUBLISH_SECRET and the @OnchainVis OAuth 1.0a secrets X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET, with X_DRY_RUN=false. X_USER_ACCESS_TOKEN is not used.",
        );
      }
      const publish = await fetch(`${base}/api/x/publish-chain-revenue-daily`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.ONCHAIN_PUBLISH_SECRET}`,
        },
        body: JSON.stringify({
          date: snapshot.metadata.latestCompletedDate,
          imageDataUrl: `data:image/png;base64,${captured.png.toString("base64")}`,
        }),
      });
      const payload = await publish.json().catch(() => ({}));
      if (!publish.ok || !payload?.success) {
        throw new Error(payload?.error?.message || `Publish route failed with HTTP ${publish.status}.`);
      }
      if (payload.dryRun) {
        throw new Error("Publish route stayed in dry-run. Set X_DRY_RUN=false on the server process.");
      }
      result.posted = true;
      result.postId = payload.postId;
      result.postUrl = payload.postUrl;
      result.duplicate = Boolean(payload.duplicate);
    }

    if (!asOfArg) {
      await recordShare(statePath, {
        date: result.date,
        mode: dryRun ? "dry-run" : "live",
        at: new Date().toISOString(),
        postId: result.postId || null,
        postUrl: result.postUrl || null,
      });
      result.shareRecorded = true;
    } else {
      result.asOf = share.now;
      result.shareRecorded = false;
    }
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    for (const warning of snapshot.metadata?.logoWarnings || []) console.warn(warning);
    console.log(
      JSON.stringify(
        {
          dryRun: result.dryRun,
          posted: result.posted,
          date: result.date,
          total: result.total,
          chainCount: result.chainCount,
          logoFallbacks: result.logoFallbacks,
          logoSources: result.logoSources,
          barX: result.barX,
          image: result.image,
          captionPath: "artifacts/x-chain-revenue-daily/caption.txt",
        },
        null,
        2,
      ),
    );
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
