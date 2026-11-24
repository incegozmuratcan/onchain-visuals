#!/usr/bin/env node
/**
 * Render the four example mint/burn cards. Does not call X or a chain API.
 *
 * Usage: node scripts/preview-mint-burn-cards.mjs [out-dir]
 */
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderCardHtml } from "../lib/mint-burn/card.mjs";
import { captureCardHtml } from "../lib/mint-burn/capture.mjs";
import { FIXED_LOGOS, planMintBurnLogos, sniffLogo } from "../lib/mint-burn/logos.mjs";
import { buildCaption, exampleAlerts } from "../lib/mint-burn/rules.mjs";

const root = process.cwd();
const outDir = path.resolve(process.argv[2] || path.join(root, "artifacts", "mint-burn-preview"));
const names = [
  "mint-burn-tron-usdt-mint.png",
  "mint-burn-solana-usdc-grouped.png",
  "mint-burn-polygon-usdc-mint.png",
  "mint-burn-ethereum-usdc-burn.png",
];

const images = {};
for (const [slug, url] of Object.entries(FIXED_LOGOS)) {
  const buf = await readFile(path.join(root, "public", url.slice(1)));
  const contentType = sniffLogo(buf);
  if (!contentType) throw new Error(`Fixed logo ${url} is not a readable image.`);
  images[url] = { renderUrl: url, byteLength: buf.byteLength, contentType };
}
const plan = planMintBurnLogos({ dbAvailable: false, approvedUrlBySlug: {}, cache: {}, images });
const bySlug = new Map(plan.choices.map((choice) => [choice.slug, choice]));
for (const choice of plan.choices) {
  if (choice.source !== "fixed") throw new Error(`Preview expected the fixed ${choice.slug} logo, got ${choice.source}.`);
}

await mkdir(outDir, { recursive: true });
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const captions = [];
try {
  const alerts = exampleAlerts();
  for (const [index, alert] of alerts.entries()) {
    const caption = buildCaption(alert);
    captions.push(caption);
    const tokenSlug = alert.token.toLowerCase();
    const work = await mkdtemp(path.join(tmpdir(), "mint-burn-preview-"));
    const cardDir = path.join(work, "cards");
    await mkdir(cardDir, { recursive: true });
    const tokenFile = `${tokenSlug}.png`;
    const chainFile = `${alert.chain}.png`;
    await copyFile(path.join(root, "public", bySlug.get(tokenSlug).url.slice(1)), path.join(cardDir, tokenFile));
    await copyFile(path.join(root, "public", bySlug.get(alert.chain).url.slice(1)), path.join(cardDir, chainFile));
    const html = renderCardHtml(alert, { token: tokenFile, chain: chainFile });
    const pngPath = path.join(outDir, names[index]);
    await captureCardHtml(html, path.join(cardDir, "card.png"), browser);
    await copyFile(path.join(cardDir, "card.png"), pngPath);
    console.log(`${names[index]}: ${caption}`);
  }
} finally {
  await browser.close();
}
await writeFile(path.join(outDir, "captions.txt"), `${captions.join("\n")}\n`);

const share = process.env.MINT_BURN_SHARE_DIR;
if (share) {
  await mkdir(share, { recursive: true });
  for (const name of names) await copyFile(path.join(outDir, name), path.join(share, name));
}
