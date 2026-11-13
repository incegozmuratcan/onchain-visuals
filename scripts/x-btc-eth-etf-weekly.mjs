#!/usr/bin/env node
/**
 * Render the combined BTC+ETH ETF weekly Flowboard at 1536×1134 and write a caption.
 *
 * Dry-run by default: writes artifacts/x-btc-eth-etf-weekly/{png,caption,result}
 * and does not call X. A live post happens only when X_DRY_RUN is exactly
 * false (or 0 / off), ONCHAIN_PUBLISH_SECRET is set, the four OAuth 1.0a
 * secrets below are set, and --preview is unset.
 *
 * The share runs only when every NYSE trading day of the target week has a
 * total and issuer numbers in both the BTC and ETH Farside tables. A week
 * that has ended but is still incomplete exits 0 without posting. A week
 * already recorded in posted-state.json is not posted again.
 *
 * --preview=holiday-week renders the synthetic 4-day Thanksgiving fixture and
 * never posts or records a share.
 */
import { spawn } from "node:child_process";
import { appendFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { decideWeeklyEtfShare, readPostState, recordShare } from "./x-btc-eth-etf-weekly-gate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4174);
const base = `http://127.0.0.1:${port}`;
const previewArg = process.argv.find((arg) => arg.startsWith("--preview="))?.slice("--preview=".length) || "";
const outDir = path.join(root, "artifacts", "x-btc-eth-etf-weekly");
const statePath = process.env.X_ETF_WEEKLY_POST_STATE
  ? path.resolve(process.env.X_ETF_WEEKLY_POST_STATE)
  : path.join(outDir, "posted-state.json");
const datasetSlug = "btc-eth-etf-weekly-flowboard";
const useDev = process.argv.includes("--dev");
const preflightOnly = process.argv.includes("--preflight");
const cardWidth = 1536;
const cardHeight = 1134;

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
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

let farsideModule;
let weekModule;

async function loadFarsideModule() {
  if (!farsideModule) {
    const sourceDir = path.join(root, "lib", "onchain", "sources");
    const dir = await mkdtemp(path.join(tmpdir(), "farside-weekly-"));
    for (const name of ["http.ts", "farside.ts"]) {
      const source = await readFile(path.join(sourceDir, name), "utf8");
      const js = transpile(source).replace(/from\s+['"]\.\/http['"]/g, "from './http.mjs'");
      await writeFile(path.join(dir, name.replace(/\.ts$/, ".mjs")), js);
    }
    farsideModule = import(pathToFileURL(path.join(dir, "farside.mjs")).href);
  }
  return farsideModule;
}

async function loadWeekModule() {
  if (!weekModule) {
    const source = await readFile(path.join(root, "lib/onchain/btcEthEtfWeek.ts"), "utf8");
    const dir = await mkdtemp(path.join(tmpdir(), "btc-eth-etf-week-"));
    const file = path.join(dir, "week.mjs");
    await writeFile(file, transpile(source));
    weekModule = import(pathToFileURL(file).href);
  }
  return weekModule;
}

async function loadCaptionBuilder() {
  const source = await readFile(path.join(root, "lib/onchain/btcEthEtfWeeklyCaption.ts"), "utf8");
  const dir = await mkdtemp(path.join(tmpdir(), "btc-eth-etf-weekly-caption-"));
  const file = path.join(dir, "caption.mjs");
  await writeFile(file, transpile(source));
  return import(pathToFileURL(file).href);
}

async function evaluateShare(dryRun) {
  const farside = await loadFarsideModule();
  const weekLib = await loadWeekModule();
  const [btcResult, ethResult] = await Promise.all([
    farside.fetchEtfFlows("BTC"),
    farside.fetchEtfFlows("ETH"),
  ]);
  if (!btcResult?.ok) throw new Error(btcResult?.message || "BTC Farside fetch failed.");
  if (!ethResult?.ok) throw new Error(ethResult?.message || "ETH Farside fetch failed.");
  const week = weekLib.selectPostingWeek(btcResult.data.rows, ethResult.data.rows, new Date());
  const posts = await readPostState(statePath);
  const decision = decideWeeklyEtfShare({ week, dryRun, posts });
  return { dryRun, week, decision };
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
    tradingDays: share.decision.tradingDays || share.week?.tradingDays || [],
    message: share.decision.message,
    problems: share.week?.problems || [],
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

async function refreshWeekly(secret) {
  const response = await fetch(
    `${base}/api/admin/onchain/refresh/${datasetSlug}?period=weekly`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Refresh failed with HTTP ${response.status}.`);
  }
  return payload;
}

function assertPublishable(snapshot, weekStart) {
  if (!snapshot || snapshot.datasetSlug !== datasetSlug) {
    throw new Error("Snapshot is not the combined BTC+ETH ETF weekly Flowboard.");
  }
  if (snapshot.metadata?.view !== "weekly" || snapshot.metadata?.layout !== "btc-eth-weekly-split") {
    throw new Error("Snapshot is not the weekly split Flowboard.");
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status === "source_error") {
    throw new Error(
      snapshot.freshness?.message ||
        `Weekly ETF snapshot is not publishable (status ${snapshot.status}, freshness ${snapshot.freshness?.status}).`,
    );
  }
  if (snapshot.metadata?.weekStart !== weekStart) {
    throw new Error(
      `Weekly snapshot week ${snapshot.metadata?.weekStart} does not match the filled Farside week ${weekStart}.`,
    );
  }
  const tradingDays = snapshot.metadata?.tradingDays || [];
  const cards = snapshot.series?.cards || [];
  for (const asset of ["BTC", "ETH"]) {
    const panel = cards.find((row) => row?.asset === asset);
    if (!panel?.issuers?.length || !panel?.formattedNet || !panel?.formattedCumulative || !panel?.days?.length) {
      throw new Error(`Weekly ETF snapshot is missing the ${asset} panel.`);
    }
    const dates = panel.days.map((day) => day.date);
    if (dates.length !== tradingDays.length || dates.some((date, index) => date !== tradingDays[index])) {
      throw new Error(`${asset} panel days do not match ${tradingDays.join(", ")}.`);
    }
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
      let logoOverlap = 0;
      for (const panel of document.querySelectorAll("[data-asset]")) {
        const hero = panel.querySelector("[data-hero-flow]");
        const logo = panel.querySelector("svg");
        if (!hero || !logo) continue;
        const h = hero.getBoundingClientRect();
        const c = logo.getBoundingClientRect();
        const overlap = Math.min(h.right, c.right) - Math.max(h.left, c.left);
        if (overlap > logoOverlap) logoOverlap = overlap;
      }
      const values = [...document.querySelectorAll("[data-hero-flow], [data-chip], [data-issuer-flow], [data-day-flow]")].map(
        (el) => ({
          text: (el.textContent || "").replace(/\s+/g, " ").trim(),
          clipped: clipReason(el),
        }),
      );
      const assets = [...document.querySelectorAll("[data-asset]")].map((el) => el.getAttribute("data-asset"));
      const dayCounts = [...document.querySelectorAll("[data-trading-days]")].map((el) =>
        Number(el.getAttribute("data-trading-days")),
      );
      const frame = document.querySelector("#share-card");
      const frameClipped = frame
        ? frame.scrollHeight > frame.clientHeight + 2 || frame.scrollWidth > frame.clientWidth + 2
        : true;
      return { values, logoOverlap, assets, dayCounts, frameClipped };
    });
    if (!fit.assets.includes("BTC") || !fit.assets.includes("ETH")) {
      throw new Error(`Weekly card is missing a BTC or ETH panel: ${JSON.stringify(fit.assets)}`);
    }
    if (fit.dayCounts.length !== 2 || fit.dayCounts[0] < 1 || fit.dayCounts[0] !== fit.dayCounts[1]) {
      throw new Error(`Weekly panels do not share a trading-day count: ${JSON.stringify(fit.dayCounts)}`);
    }
    const overflow = fit.values.filter((item) => item.clipped || !item.text || /…/.test(item.text));
    if (overflow.length || fit.logoOverlap > 2 || fit.frameClipped) {
      throw new Error(`Weekly Flowboard values do not fit the share card: ${JSON.stringify(fit)}`);
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
    return { png, dims, values: fit.values, dayCounts: fit.dayCounts };
  } finally {
    await browser.close();
  }
}

async function capturePreview() {
  if (previewArg !== "holiday-week") {
    throw new Error("Weekly preview must be --preview=holiday-week. Previews are never posted.");
  }
  if (livePostRequested()) {
    throw new Error("Refusing to post a preview fixture. Leave X_DRY_RUN unset for --preview=holiday-week.");
  }
  await mkdir(outDir, { recursive: true });
  const child = startServer();
  try {
    await waitForServer(child, `/onchain/${datasetSlug}?preview=holiday-week&capture=1`);
    const captured = await captureCard(`${base}/onchain/${datasetSlug}?preview=holiday-week&capture=1`);
    const pngPath = path.join(outDir, "holiday-week.png");
    await writeFile(pngPath, captured.png);
    const result = {
      dryRun: true,
      posted: false,
      skipped: false,
      preview: "holiday-week",
      tradingDayCount: captured.dayCounts[0],
      image: {
        path: "holiday-week.png",
        width: captured.dims.width,
        height: captured.dims.height,
        bytes: captured.png.length,
      },
    };
    await writeFile(path.join(outDir, "holiday-result.json"), `${JSON.stringify(result, null, 2)}\n`);
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
    await waitForServer(child, `/api/charts/${datasetSlug}?period=weekly`);
    const refreshed = await refreshWeekly(secret);
    if (refreshed?.status && refreshed.status !== "active") {
      throw new Error(refreshed?.freshness?.message || `Refresh returned status ${refreshed.status}.`);
    }
    const chartResponse = await fetch(`${base}/api/charts/${datasetSlug}?period=weekly`);
    const snapshot = await chartResponse.json().catch(() => null);
    if (!chartResponse.ok) {
      throw new Error(snapshot?.error || `Chart fetch failed with HTTP ${chartResponse.status}.`);
    }
    assertPublishable(snapshot, share.decision.date);
    const { buildBtcEthEtfWeeklyCaption } = await loadCaptionBuilder();
    const caption = buildBtcEthEtfWeeklyCaption(snapshot);
    const pageUrl = `${base}/onchain/${datasetSlug}?period=weekly&capture=1`;
    const captured = await captureCard(pageUrl);
    const pngPath = path.join(outDir, "btc-eth-etf-weekly.png");
    const captionPath = path.join(outDir, "caption.txt");
    const resultPath = path.join(outDir, "result.json");
    await writeFile(pngPath, captured.png);
    await writeFile(captionPath, `${caption}\n`);
    const result = {
      dryRun,
      posted: false,
      skipped: false,
      reason: null,
      date: snapshot.metadata.weekStart,
      weekEnd: snapshot.metadata.weekEnd,
      tradingDays: snapshot.metadata.tradingDays,
      captionRange: snapshot.metadata.captionRange,
      updatedAt: snapshot.freshness?.lastUpdatedAt || null,
      caption,
      values: captured.values,
      image: {
        path: "btc-eth-etf-weekly.png",
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
      const publish = await fetch(`${base}/api/x/publish-btc-eth-etf-weekly`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.ONCHAIN_PUBLISH_SECRET}`,
        },
        body: JSON.stringify({
          date: snapshot.metadata.weekStart,
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

    await recordShare(statePath, {
      date: result.date,
      mode: dryRun ? "dry-run" : "live",
      at: new Date().toISOString(),
      postId: result.postId || null,
      postUrl: result.postUrl || null,
    });
    result.shareRecorded = true;
    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      JSON.stringify(
        {
          dryRun: result.dryRun,
          posted: result.posted,
          date: result.date,
          captionRange: result.captionRange,
          tradingDays: result.tradingDays,
          image: result.image,
          captionPath: "artifacts/x-btc-eth-etf-weekly/caption.txt",
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
