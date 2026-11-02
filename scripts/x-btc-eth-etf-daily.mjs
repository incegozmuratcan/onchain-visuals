#!/usr/bin/env node
/**
 * Render the combined BTC+ETH ETF daily Flowboard at 1536×1024 and write a caption.
 *
 * Dry-run by default: writes artifacts/x-btc-eth-etf-daily/{png,caption,result}
 * and does not call X. A live post happens only when X_DRY_RUN is exactly
 * false (or 0 / off), ONCHAIN_PUBLISH_SECRET is set, the four OAuth 1.0a
 * secrets below are set, and CAPTURE_PREVIEW is unset.
 *
 * The refresh target is btc-eth-etf-daily-flowboard. That snapshot fetches the
 * Farside BTC and ETH tables together in buildBtcEthDailySplit. The card does
 * not read the separate btc-etf-flowboard or eth-etf-flowboard snapshots.
 *
 * X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and
 * X_ACCESS_TOKEN_SECRET are the @OnchainVis OAuth 1.0 Keys (Read and write).
 * X_USER_ACCESS_TOKEN is not used; that OAuth 2.0 bearer cannot upload media.
 */
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const base = `http://127.0.0.1:${port}`;
const preview = String(process.env.CAPTURE_PREVIEW || "").trim();
const outDir = path.join(root, "artifacts", "x-btc-eth-etf-daily");
const datasetSlug = "btc-eth-etf-daily-flowboard";
const useDev = process.argv.includes("--dev");

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

async function loadCaptionBuilder() {
  const source = await readFile(path.join(root, "lib/onchain/btcEthEtfCaption.ts"), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dir = await mkdtemp(path.join(tmpdir(), "btc-eth-etf-caption-"));
  const file = path.join(dir, "caption.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

function refreshSecret() {
  if (!process.env.ONCHAIN_REFRESH_SECRET && !process.env.CRON_SECRET) {
    process.env.ONCHAIN_REFRESH_SECRET = `gha-local-${process.pid}`;
  }
  return process.env.ONCHAIN_REFRESH_SECRET || process.env.CRON_SECRET;
}

async function waitForServer(child) {
  const readyUrl = `${base}/api/charts/${datasetSlug}?period=daily`;
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

async function refreshCombinedDaily(secret) {
  const response = await fetch(
    `${base}/api/admin/onchain/refresh/${datasetSlug}?period=daily`,
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

function assertPublishable(snapshot) {
  if (!snapshot || snapshot.datasetSlug !== datasetSlug) {
    throw new Error("Snapshot is not the combined BTC+ETH ETF daily Flowboard.");
  }
  if (snapshot.metadata?.view !== "daily" || snapshot.metadata?.layout !== "btc-eth-split") {
    throw new Error("Snapshot is not the daily split Flowboard.");
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status === "source_error") {
    throw new Error(
      snapshot.freshness?.message ||
        `Combined ETF snapshot is not publishable (status ${snapshot.status}, freshness ${snapshot.freshness?.status}).`,
    );
  }
  const btcDate = snapshot.metadata?.latestCompletedDate;
  const ethDate = snapshot.metadata?.ethLatestCompletedDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(btcDate || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(ethDate || ""))) {
    throw new Error("Combined ETF snapshot is missing completed BTC and ETH dates.");
  }
  if (btcDate !== ethDate) {
    throw new Error(`BTC completed date ${btcDate} does not match ETH completed date ${ethDate}.`);
  }
  const cards = snapshot.series?.cards || [];
  for (const asset of ["BTC", "ETH"]) {
    const panel = cards.find((row) => row?.asset === asset);
    if (!panel?.issuers?.length || !panel?.largest?.ticker || !panel?.formattedNet || !panel?.formattedCumulative) {
      throw new Error(`Combined ETF snapshot is missing the ${asset} panel.`);
    }
    if (panel.date && panel.date !== btcDate) {
      throw new Error(`${asset} panel date ${panel.date} does not match ${btcDate}.`);
    }
  }
}

async function captureCard(pageUrl) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1536, height: 1024 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 120_000 });
    const card = page.locator("[data-capture='share-card']");
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) =>
          img.decode?.().catch(() => {}) ?? Promise.resolve(),
        ),
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
          const clips = /hidden|clip|scroll|auto/.test(
            `${style.overflow} ${style.overflowX} ${style.overflowY}`,
          );
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
      const values = [...document.querySelectorAll("[data-hero-flow], [data-chip], [data-issuer-flow]")].map(
        (el) => ({
          text: (el.textContent || "").replace(/\s+/g, " ").trim(),
          clipped: clipReason(el),
        }),
      );
      const assets = [...document.querySelectorAll("[data-asset]")].map((el) => el.getAttribute("data-asset"));
      return { values, logoOverlap, assets };
    });
    if (!fit.assets.includes("BTC") || !fit.assets.includes("ETH")) {
      throw new Error(`Split card is missing a BTC or ETH panel: ${JSON.stringify(fit.assets)}`);
    }
    const overflow = fit.values.filter((item) => item.clipped || !item.text || /…/.test(item.text));
    if (overflow.length || fit.logoOverlap > 2) {
      throw new Error(`Flowboard values do not fit the share card: ${JSON.stringify(fit)}`);
    }
    const box = await card.boundingBox();
    if (!box) throw new Error("Share card bounding box is missing.");
    if (Math.abs(box.width - 1536) > 1 || Math.abs(box.height - 1024) > 1) {
      throw new Error(`Share card measured ${box.width}×${box.height}; expected 1536×1024.`);
    }
    const png = await page.screenshot({
      type: "png",
      animations: "disabled",
      caret: "hide",
      clip: { x: box.x, y: box.y, width: 1536, height: 1024 },
    });
    const dims = pngSize(png);
    if (dims.width !== 1536 || dims.height !== 1024) {
      throw new Error(`PNG is ${dims.width}×${dims.height}; expected 1536×1024.`);
    }
    return { png, dims, values: fit.values };
  } finally {
    await browser.close();
  }
}

async function main() {
  const dryRun = !livePostRequested();
  if (preview && !dryRun) {
    throw new Error("Refusing to post a preview fixture. Unset CAPTURE_PREVIEW for a live post.");
  }
  if (preview) {
    throw new Error("Combined ETF daily capture has no preview fixture. Unset CAPTURE_PREVIEW.");
  }
  const publishSecretProvided = Boolean(process.env.ONCHAIN_PUBLISH_SECRET);
  if (!publishSecretProvided) {
    process.env.ONCHAIN_PUBLISH_SECRET = `local-${process.pid}`;
  }
  const secret = refreshSecret();
  await mkdir(outDir, { recursive: true });
  const child = startServer();
  try {
    await waitForServer(child);
    const refreshed = await refreshCombinedDaily(secret);
    if (refreshed?.status && refreshed.status !== "active") {
      throw new Error(
        refreshed?.freshness?.message || `Refresh returned status ${refreshed.status}.`,
      );
    }
    const chartUrl = `${base}/api/charts/${datasetSlug}?period=daily`;
    const chartResponse = await fetch(chartUrl);
    const snapshot = await chartResponse.json().catch(() => null);
    if (!chartResponse.ok) {
      throw new Error(snapshot?.error || `Chart fetch failed with HTTP ${chartResponse.status}.`);
    }
    assertPublishable(snapshot);
    const { buildBtcEthEtfDailyCaption } = await loadCaptionBuilder();
    const caption = buildBtcEthEtfDailyCaption(snapshot);
    const pageUrl = `${base}/onchain/${datasetSlug}?period=daily&capture=1`;
    const captured = await captureCard(pageUrl);
    const pngPath = path.join(outDir, "btc-eth-etf-daily.png");
    const captionPath = path.join(outDir, "caption.txt");
    const resultPath = path.join(outDir, "result.json");
    await writeFile(pngPath, captured.png);
    await writeFile(captionPath, `${caption}\n`);
    const result = {
      dryRun,
      posted: false,
      date: snapshot.metadata.latestCompletedDate,
      ethDate: snapshot.metadata.ethLatestCompletedDate,
      caption,
      values: captured.values,
      image: {
        path: "btc-eth-etf-daily.png",
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
      const publish = await fetch(`${base}/api/x/publish-btc-eth-etf-daily`, {
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

    await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      JSON.stringify(
        {
          dryRun: result.dryRun,
          posted: result.posted,
          date: result.date,
          image: result.image,
          captionPath: "artifacts/x-btc-eth-etf-daily/caption.txt",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const logPath = path.join(outDir, "server.log");
    await writeFile(logPath, child.logText()).catch(() => {});
    throw error;
  } finally {
    if (child.exitCode == null) child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
