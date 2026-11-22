#!/usr/bin/env node
/**
 * Render the Chain Revenue weekly or monthly card at 1536×1134 and write a caption.
 *
 * Usage: node scripts/x-chain-revenue-period.mjs weekly|monthly [--preflight]
 *
 * Dry-run by default. A live post happens only when X_DRY_RUN is exactly
 * false (or 0 / off) and the publish secrets are set. This does not call X
 * during a dry run.
 *
 * The period is the last completed Monday–Sunday UTC week, or the last
 * completed UTC calendar month. Each chain's value is the sum of its
 * dailyRevenue points. The period is shared only when every day passes
 * assessChainRevenueDay. A period already recorded in this job's
 * posted-state.json is not posted again. The weekly card also reads the
 * daily posted-state.json and waits until Sunday's daily has been posted
 * for 60 minutes. A daily post with no timestamp is stamped, then the run waits.
 */
import { spawn } from "node:child_process";
import { appendFile, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import {
  decideChainRevenuePeriodShare,
  ensureShareTimestamps,
  readPostState,
  recordShare,
} from "./x-chain-revenue-period-gate.mjs";

const kind = process.argv.find((arg) => arg === "weekly" || arg === "monthly");
if (!kind) {
  console.error("Pass weekly or monthly.");
  process.exit(1);
}

const spec = {
  weekly: {
    kind: "weekly",
    label: "week",
    slug: "chain-revenue-weekly",
    period: "weekly",
    layout: "chain-revenue-weekly",
    view: "weekly",
    badge: "7D",
    artifact: "chain-revenue-weekly",
    publishPath: "/api/x/publish-chain-revenue-weekly",
    keep: "CHAIN_REVENUE_WEEK_KEEP_DAYS",
    select: (lib, now) => lib.lastCompletedUtcWeek(now),
    caption: (builders, start, end) => builders.buildChainRevenueWeeklyCaption(start, end),
  },
  monthly: {
    kind: "monthly",
    label: "month",
    slug: "chain-revenue-monthly",
    period: "monthly",
    layout: "chain-revenue-monthly",
    view: "monthly",
    badge: "1M",
    artifact: "chain-revenue-monthly",
    publishPath: "/api/x/publish-chain-revenue-monthly",
    keep: "CHAIN_REVENUE_MONTH_KEEP_DAYS",
    select: (lib, now) => lib.lastCompletedUtcMonth(now),
    caption: (builders, start) => builders.buildChainRevenueMonthlyCaption(start),
  },
}[kind];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || (kind === "weekly" ? 4178 : 4179));
const base = `http://127.0.0.1:${port}`;
const outDir = path.join(root, "artifacts", `x-${spec.artifact}`);
const statePath = process.env.X_CHAIN_REVENUE_POST_STATE
  ? path.resolve(process.env.X_CHAIN_REVENUE_POST_STATE)
  : path.join(outDir, "posted-state.json");
const dailyStatePath = process.env.X_CHAIN_REVENUE_DAILY_POST_STATE
  ? path.resolve(process.env.X_CHAIN_REVENUE_DAILY_POST_STATE)
  : path.join(root, "artifacts", "x-chain-revenue-daily", "posted-state.json");
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

let revenueModule;
function loadRevenueModule() {
  revenueModule ||= importTs("lib/onchain/chainRevenueDaily.ts", `chain-revenue-${kind}-`);
  return revenueModule;
}

function loadCaptionBuilder() {
  return importTs("lib/onchain/chainRevenueCaption.ts", `chain-revenue-${kind}-caption-`);
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
  const now = new Date();
  let dailyPosts;
  if (kind === "weekly") {
    const storedDaily = await readPostState(dailyStatePath);
    dailyPosts = (await ensureShareTimestamps(dailyStatePath, storedDaily, now.toISOString())).posts;
  }
  const fetched = await lib.fetchChainRevenueDays(fetchJson, { now, keepDays: lib[spec.keep] });
  const range = spec.select(lib, now);
  const assessment = lib.assessChainRevenuePeriod(fetched.days, range.start, range.end, now);
  const posts = await readPostState(statePath);
  const decision = decideChainRevenuePeriodShare({
    assessment,
    expectedStart: range.start,
    dryRun,
    posts,
    label: spec.label,
    dailyPosts,
    now,
  });
  return { dryRun, now: now.toISOString(), range, assessment, failed: fetched.failed, decision };
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
    dailyPostedAt: share.decision.dailyPostedAt || null,
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
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Refresh failed with HTTP ${response.status}.`);
  }
  return payload;
}

function assertPublishable(snapshot, start) {
  if (!snapshot || snapshot.datasetSlug !== spec.slug) {
    throw new Error(`Snapshot is not the Chain Revenue ${spec.label} card.`);
  }
  if (snapshot.metadata?.view !== spec.view || snapshot.metadata?.layout !== spec.layout) {
    throw new Error(`Snapshot is not the ${spec.kind} chain revenue layout.`);
  }
  if (snapshot.metadata?.titleBadge !== spec.badge) {
    throw new Error(`Chain revenue ${spec.label} badge is ${snapshot.metadata?.titleBadge}; expected ${spec.badge}.`);
  }
  if (snapshot.status !== "active" || snapshot.freshness?.status !== "fresh") {
    throw new Error(
      snapshot.freshness?.message ||
        `Chain revenue snapshot is not publishable (status ${snapshot.status}, freshness ${snapshot.freshness?.status}).`,
    );
  }
  if (snapshot.metadata?.periodStart !== start) {
    throw new Error(`Chain revenue snapshot period ${snapshot.metadata?.periodStart} does not match ${start}.`);
  }
  if (!snapshot.metadata?.coverage?.complete) {
    throw new Error(`Chain revenue snapshot coverage is incomplete: ${snapshot.metadata?.coverage?.message || "unknown"}.`);
  }
  const bars = snapshot.series?.bars || [];
  if (bars.length !== rowCount) throw new Error(`Chain revenue snapshot has ${bars.length} rows; the card needs ${rowCount}.`);
  for (const [index, row] of bars.entries()) {
    if (row?.rank !== index + 1 || !row?.name || !row?.formattedValue || !(Number(row?.value) > 0)) {
      throw new Error(`Chain revenue row ${index + 1} is incomplete: ${JSON.stringify(row)}.`);
    }
    if (index > 0 && Number(row.value) > Number(bars[index - 1].value)) {
      throw new Error(`Chain revenue rows are not sorted at rank ${index + 1}.`);
    }
    const change = row.rankChange;
    if (change != null && change.kind !== "up" && change.kind !== "down" && change.kind !== "new") {
      throw new Error(`Chain revenue row ${index + 1} has an unknown rank change.`);
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
      await Promise.all([...document.images].map((img) => img.decode?.().catch(() => {}) ?? Promise.resolve()));
    });
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
          "[data-chip], [data-total-revenue], [data-chain-count], [data-leader-name], [data-leader-share], [data-chain-name], [data-chain-amount], [data-title-badge], [data-rank-badge]",
        ),
      ].map((el) => ({
        text: (el.textContent || "").replace(/\s+/g, " ").trim(),
        clipped: clipReason(el),
      }));
      const nameOverlap = [...document.querySelectorAll("[data-chain-row]")].map((row) => {
        const name = row.querySelector("[data-chain-name]");
        const bar = row.querySelector("[data-chain-bar]")?.parentElement;
        if (!name || !bar) return 999;
        const range = document.createRange();
        range.selectNodeContents(name);
        return range.getBoundingClientRect().right - bar.getBoundingClientRect().left;
      });
      const tracks = [...document.querySelectorAll("[data-bar-track]")].map((el) => Math.round(el.getBoundingClientRect().x));
      const badges = [...document.querySelectorAll("[data-rank-badge]")].map((el) => {
        const name = el.parentElement?.querySelector("[data-chain-name]");
        const range = document.createRange();
        if (name) range.selectNodeContents(name);
        const nameRight = name ? range.getBoundingClientRect().right : 0;
        const box = el.getBoundingClientRect();
        return {
          kind: el.getAttribute("data-rank-badge"),
          width: Math.round(box.width),
          height: Math.round(box.height),
          gap: name ? Math.round(box.left - nameRight) : null,
        };
      });
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
      const badge = document.querySelector("[data-title-badge]")?.getAttribute("data-title-badge") || "";
      return { values, nameOverlap, tracks, badges, names, images, fallbacks, rows, frameClipped, badge };
    });
    if (fit.rows !== rowCount) throw new Error(`Chain revenue card drew ${fit.rows} rows; expected ${rowCount}.`);
    if (fit.badge !== spec.badge) throw new Error(`Title badge is ${fit.badge}; expected ${spec.badge}.`);
    if (new Set(fit.tracks).size !== 1) {
      throw new Error(`Chain revenue bar columns do not share one x: ${fit.tracks.join(", ")}.`);
    }
    const stretched = (fit.badges || []).filter(
      (badge) => badge.width > 88 || badge.height < 28 || badge.height > 34 || badge.gap == null || Math.abs(badge.gap - 10) > 3,
    );
    if (stretched.length) {
      throw new Error(`Rank badges are not compact pills after the name: ${JSON.stringify(stretched)}.`);
    }
    const overflow = fit.values.filter((item) => item.clipped || !item.text || /…/.test(item.text));
    const overlapping = fit.nameOverlap.filter((gap) => gap > -4);
    const brokenLogos = fit.images.filter((img) => !img.loaded);
    if (brokenLogos.length) {
      console.warn(`Chain revenue logos failed to load and the card kept an initial badge: ${brokenLogos.map((img) => img.alt).join(", ")}`);
    }
    if (overflow.length || overlapping.length || fit.frameClipped) {
      throw new Error(
        `Chain revenue values do not fit the share card: ${JSON.stringify({ overflow, overlapping, frameClipped: fit.frameClipped })}`,
      );
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
    return { png, dims, values: fit.values, names: fit.names, logoFallbacks: fit.fallbacks, barX: fit.tracks[0] };
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
    const builders = await loadCaptionBuilder();
    const caption = spec.caption(builders, snapshot.metadata.periodStart, snapshot.metadata.periodEnd);
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
      updatedAt: snapshot.freshness?.lastUpdatedAt || null,
      caption,
      subtitle: snapshot.subtitle,
      panelDay: snapshot.metadata.panelDay,
      panelYear: snapshot.metadata.panelYear,
      titleBadge: snapshot.metadata.titleBadge,
      coverage: share.decision.coverage,
      total: snapshot.metadata.formattedTotal,
      chainCount: snapshot.metadata.chainCount,
      leader: snapshot.metadata.leader,
      barX: captured.barX,
      rows: (snapshot.series?.bars || []).map((row) => ({
        rank: row.rank,
        slug: row.slug,
        name: row.name,
        formattedValue: row.formattedValue,
        rankChange: row.rankChange || null,
        logo: row.logo,
      })),
      names: captured.names,
      logoFallbacks: captured.logoFallbacks,
      logoSources: snapshot.metadata?.logoSources || [],
      image: { path: pngName, width: captured.dims.width, height: captured.dims.height, bytes: captured.png.length },
    };
    if (!dryRun) {
      const oauth1Ready = ["X_CONSUMER_KEY", "X_CONSUMER_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"].every(
        (name) => String(process.env[name] || "").trim(),
      );
      if (!publishSecretProvided || !oauth1Ready) {
        throw new Error(
          "Refusing to post: set ONCHAIN_PUBLISH_SECRET and the @OnchainVis OAuth 1.0a secrets X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET, with X_DRY_RUN=false. X_USER_ACCESS_TOKEN is not used.",
        );
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
    await writeFile(path.join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
    for (const warning of snapshot.metadata?.logoWarnings || []) console.warn(warning);
    console.log(
      JSON.stringify(
        {
          dryRun: result.dryRun,
          posted: result.posted,
          date: result.date,
          periodEnd: result.periodEnd,
          caption: result.caption,
          total: result.total,
          barX: result.barX,
          logoSources: result.logoSources,
          rows: result.rows.map((row) => ({ rank: row.rank, name: row.name, rankChange: row.rankChange, formattedValue: row.formattedValue })),
          image: result.image,
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
