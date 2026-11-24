#!/usr/bin/env node
/**
 * Treasury mint and burn alerts.
 *
 * Dry-run unless X_DRY_RUN is false, 0, or off. A dry run writes the PNG and
 * caption and does not call X. A live post is image plus caption, with no URL.
 *
 * The first run records chain cursors and posts nothing, so history is not backfilled.
 * State is artifacts/x-mint-burn/posted-state.json, restored from the Actions artifact.
 */
import { appendFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { renderCardHtml } from "../lib/mint-burn/card.mjs";
import { captureCardHtml } from "../lib/mint-burn/capture.mjs";
import { DEFILLAMA_LOGOS, FIXED_LOGOS, LOGO_SLUGS, planMintBurnLogos, sniffLogo } from "../lib/mint-burn/logos.mjs";
import {
  buildCaption,
  emptyState,
  ingestEvents,
  markAlert,
  markUncertain,
  POSTS_PER_RUN,
  readyAlerts,
  shortenHash,
} from "../lib/mint-burn/rules.mjs";
import { readSecrets, scanAll } from "../lib/mint-burn/sources.mjs";

const root = process.cwd();
const outDir = path.resolve(process.env.MINT_BURN_OUT || path.join(root, "artifacts", "x-mint-burn"));
const statePath = path.resolve(process.env.MINT_BURN_STATE || path.join(outDir, "posted-state.json"));
const scanOnly = process.argv.includes("--scan");
const renderOnly = process.argv.includes("--render");

function liveRequested() {
  const value = String(process.env.X_DRY_RUN ?? "true").trim().toLowerCase();
  return value === "false" || value === "0" || value === "off";
}

function writeOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${name}=${value}\n`);
}

async function loadState() {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyState();
    return { ...emptyState(), ...parsed };
  } catch (error) {
    if (error?.code === "ENOENT") return emptyState();
    throw error;
  }
}

async function saveState(state) {
  await mkdir(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(tmp, statePath);
}

function hostAllowed(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (["icons.llamao.fi", "token-icons.llamao.fi", "assets.coingecko.com", "coin-images.coingecko.com", "s2.coinmarketcap.com", "s3.coinmarketcap.com"].includes(host)) {
    return true;
  }
  const suffix = ".public.blob.vercel-storage.com";
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

async function checkedImage(url) {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const abs = path.resolve(root, "public", url.slice(1));
      const publicRoot = path.resolve(root, "public");
      if (abs !== publicRoot && !abs.startsWith(`${publicRoot}${path.sep}`)) return null;
      const buf = await readFile(abs);
      const contentType = sniffLogo(buf);
      if (!contentType) return null;
      return { renderUrl: url, byteLength: buf.byteLength, contentType };
    }
    if (url.startsWith("https:")) {
      const parsed = new URL(url);
      if (!hostAllowed(parsed.hostname)) return null;
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12_000) });
      if (!response.ok || !hostAllowed(new URL(response.url).hostname)) return null;
      const buf = Buffer.from(await response.arrayBuffer());
      const contentType = sniffLogo(buf);
      if (!contentType) return null;
      return { renderUrl: `data:${contentType};base64,${buf.toString("base64")}`, byteLength: buf.byteLength, contentType };
    }
  } catch {
    return null;
  }
  return null;
}

async function approvedUrls() {
  if (!process.env.DATABASE_URL) {
    console.warn("Mint/burn approved logos are unavailable; using the cached copy.");
    return { dbAvailable: false, urls: {} };
  }
  const aliases = {
    usdt: ["usdt", "tether"],
    usdc: ["usdc", "usd-coin", "usdcoin"],
    ethereum: ["ethereum"],
    solana: ["solana"],
    polygon: ["polygon"],
    tron: ["tron"],
  };
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL, { fullResults: true });
    const slugs = [...new Set(Object.values(aliases).flat())];
    const result = await sql.query(
      "SELECT slug, approved_logo_url FROM logos WHERE status = 'approved' AND slug = ANY($1::text[])",
      [slugs],
    );
    const bySlug = new Map((result.rows || []).map((row) => [row.slug, row.approved_logo_url]));
    const urls = {};
    for (const slug of LOGO_SLUGS) {
      urls[slug] = aliases[slug].map((alias) => bySlug.get(alias)).find(Boolean) || null;
    }
    return { dbAvailable: true, urls };
  } catch (error) {
    console.warn("Mint/burn approved logos are unavailable; using the cached copy.");
    return { dbAvailable: false, urls: {} };
  }
}

async function resolveLogos(state) {
  const approved = await approvedUrls();
  const jobs = new Map();
  for (const slug of LOGO_SLUGS) {
    const approvedUrl = approved.urls[slug];
    if (approvedUrl) jobs.set(approvedUrl, approvedUrl);
    jobs.set(FIXED_LOGOS[slug], FIXED_LOGOS[slug]);
    jobs.set(DEFILLAMA_LOGOS[slug], DEFILLAMA_LOGOS[slug]);
  }
  const images = {};
  await Promise.all([...jobs.keys()].map(async (url) => {
    images[url] = await checkedImage(url);
  }));
  const plan = planMintBurnLogos({
    dbAvailable: approved.dbAvailable,
    approvedUrlBySlug: approved.urls,
    cache: state.logos || {},
    images,
  });
  for (const warning of plan.warnings) console.warn(warning);
  return plan;
}

function extensionFor(choice) {
  const url = String(choice.url || "");
  if (url.startsWith("data:image/svg") || url.endsWith(".svg")) return "svg";
  if (url.startsWith("data:image/webp") || url.endsWith(".webp")) return "webp";
  if (url.startsWith("data:image/jpeg") || url.endsWith(".jpg") || url.endsWith(".jpeg")) return "jpg";
  return "png";
}

async function writeLogoFile(choice, filePath) {
  const url = choice.url;
  if (url.startsWith("data:")) {
    const match = url.match(/^data:[^,]*;base64,([A-Za-z0-9+/=]+)$/) || url.match(/^data:[^,]*,([\s\S]+)$/);
    if (!match) throw new Error(`Logo for ${choice.slug} could not be decoded.`);
    const bytes = url.includes(";base64,") ? Buffer.from(match[1], "base64") : Buffer.from(decodeURIComponent(match[1]));
    await writeFile(filePath, bytes);
    return;
  }
  if (url.startsWith("/")) {
    await copyFile(path.join(root, "public", url.slice(1)), filePath);
    return;
  }
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Logo for ${choice.slug} could not be downloaded.`);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
}

async function loadOauth() {
  const source = await readFile(new URL("../lib/x/oauth1.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

function xCredentials() {
  const consumerKey = String(process.env.X_CONSUMER_KEY || "").trim();
  const consumerSecret = String(process.env.X_CONSUMER_SECRET || "").trim();
  const accessToken = String(process.env.X_ACCESS_TOKEN || "").trim();
  const accessTokenSecret = String(process.env.X_ACCESS_TOKEN_SECRET || "").trim();
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

async function postImage(png, caption) {
  if (/https?:\/\//i.test(caption)) throw new Error("Refusing to post a caption that contains a URL.");
  const credentials = xCredentials();
  if (!credentials) {
    throw new Error("Refusing to post: set the @OnchainVis OAuth 1.0a secrets X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET, with X_DRY_RUN=false.");
  }
  const { oauth1AuthorizationHeader } = await loadOauth();
  const mediaUrl = "https://api.x.com/2/media/upload";
  const form = new FormData();
  form.set("media_category", "tweet_image");
  form.set("media_type", "image/png");
  form.set("media", new Blob([png], { type: "image/png" }), "mint-burn.png");
  const mediaResponse = await fetch(mediaUrl, {
    method: "POST",
    headers: { authorization: oauth1AuthorizationHeader("POST", mediaUrl, credentials) },
    body: form,
  });
  const mediaPayload = await mediaResponse.json().catch(() => ({}));
  if (!mediaResponse.ok) {
    const error = new Error(`X media upload failed with HTTP ${mediaResponse.status}.`);
    error.stage = "media";
    error.status = mediaResponse.status;
    throw error;
  }
  const mediaId = mediaPayload?.data?.id || mediaPayload?.media_id_string || mediaPayload?.media_id;
  if (!mediaId) {
    const error = new Error("X media upload response did not include a media id.");
    error.stage = "media";
    throw error;
  }
  const tweetUrl = "https://api.x.com/2/tweets";
  const tweetResponse = await fetch(tweetUrl, {
    method: "POST",
    headers: {
      authorization: oauth1AuthorizationHeader("POST", tweetUrl, credentials),
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: caption, media: { media_ids: [String(mediaId)] } }),
  });
  const tweetPayload = await tweetResponse.json().catch(() => ({}));
  if (!tweetResponse.ok) {
    const error = new Error(`X post failed with HTTP ${tweetResponse.status}.`);
    error.stage = "tweet";
    error.status = tweetResponse.status;
    throw error;
  }
  const postId = tweetPayload?.data?.id;
  if (!postId) {
    const error = new Error("X post response did not include a post id.");
    error.stage = "tweet";
    throw error;
  }
  return { postId: String(postId), postUrl: `https://x.com/OnchainVis/status/${postId}` };
}

async function scan(state) {
  const secrets = readSecrets();
  if (secrets.missing.length) {
    throw new Error(`Mint/burn scan needs ${secrets.missing.join(", ")}.`);
  }
  const scanned = await scanAll(state, secrets);
  for (const note of scanned.notes) {
    const alreadyLogged = scanned.failures?.some((name) => note.startsWith(`${name} failed and will be retried next run.`));
    if (!alreadyLogged) console.warn(note);
  }
  const next = ingestEvents({ ...state, cursors: scanned.cursors }, scanned.events);
  next.cursors = scanned.cursors;
  await saveState(next);
  const mode = liveRequested() ? "live" : "dry-run";
  const alerts = readyAlerts(next, Date.now(), mode);
  writeOutput("render", alerts.length ? "true" : "false");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "result.json"), `${JSON.stringify({
    dryRun: mode !== "live",
    posted: false,
    scanned: scanned.events.length,
    ready: alerts.length,
    reason: alerts.length ? null : "nothing_ready",
    notes: scanned.notes,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ scanned: scanned.events.length, ready: alerts.length, mode }, null, 2));
  return next;
}

async function render(state) {
  const mode = liveRequested() ? "live" : "dry-run";
  const alerts = readyAlerts(state, Date.now(), mode).slice(0, POSTS_PER_RUN);
  if (!alerts.length) {
    await writeFile(path.join(outDir, "result.json"), `${JSON.stringify({ dryRun: mode !== "live", posted: false, reason: "nothing_ready" }, null, 2)}\n`);
    console.log("No mint or burn is ready to post.");
    return;
  }
  const plan = await resolveLogos(state);
  state.logos = plan.cache;
  const bySlug = new Map(plan.choices.map((choice) => [choice.slug, choice]));
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const posted = [];
  try {
    for (const alert of alerts) {
      const caption = buildCaption(alert);
      const tokenSlug = alert.token.toLowerCase();
      const tokenChoice = bySlug.get(tokenSlug);
      const chainChoice = bySlug.get(alert.chain);
      const work = await mkdtemp(path.join(tmpdir(), "mint-burn-"));
      const cardDir = path.join(work, "cards");
      await mkdir(cardDir, { recursive: true });
      const tokenFile = `${tokenSlug}.${extensionFor(tokenChoice)}`;
      const chainFile = `${alert.chain}.${extensionFor(chainChoice)}`;
      await writeLogoFile(tokenChoice, path.join(cardDir, tokenFile));
      await writeLogoFile(chainChoice, path.join(cardDir, chainFile));
      const html = renderCardHtml(alert, { token: tokenFile, chain: chainFile });
      const pngName = `${alert.chain}-${tokenSlug}-${alert.kind}-${shortenHash(alert.events[alert.events.length - 1].txHash).replace("…", "-")}.png`;
      const captured = await captureCardHtml(html, path.join(cardDir, "card.png"), browser);
      await copyFile(path.join(cardDir, "card.png"), path.join(outDir, pngName));
      const record = {
        id: alert.id,
        chain: alert.chain,
        token: alert.token,
        kind: alert.kind,
        count: alert.count,
        caption,
        image: pngName,
        logos: {
          [tokenSlug]: tokenChoice.source,
          [alert.chain]: chainChoice.source,
        },
      };
      if (mode === "live") {
        try {
          const tweet = await postImage(captured.png, caption);
          record.postId = tweet.postId;
          record.postUrl = tweet.postUrl;
          state = markAlert(state, alert, "live", { at: new Date().toISOString(), postId: tweet.postId });
        } catch (error) {
          const definite = error.stage === "media" || (error.status >= 400 && error.status < 500);
          if (!definite) state = markUncertain(state, alert, { at: new Date().toISOString(), message: error.message });
          state.logos = plan.cache;
          await saveState(state);
          throw error;
        }
      } else {
        state = markAlert(state, alert, "dry-run", { at: new Date().toISOString() });
      }
      state.logos = plan.cache;
      await saveState(state);
      posted.push(record);
      console.log(caption);
    }
  } finally {
    await browser.close();
  }
  const result = {
    dryRun: mode !== "live",
    posted: mode === "live",
    count: posted.length,
    captions: posted.map((row) => row.caption),
    alerts: posted,
    logoWarnings: plan.warnings,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "caption.txt"), `${posted.map((row) => row.caption).join("\n\n")}\n`);
  await writeFile(path.join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let state = await loadState();
  if (!renderOnly) state = await scan(state);
  if (!scanOnly) await render(state);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
