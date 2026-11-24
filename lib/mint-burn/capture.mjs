import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 675;

const FONT = path.join(process.cwd(), "components/share/fonts/InterVariable-opsz.woff");

export function pngSize(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Captured image is not a PNG.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Write the approved HTML next to the repo's Inter variable font and screenshot
 * the 1200×675 card at 2× (a 2400×1350 PNG). `logos` are filenames already placed beside the HTML.
 */
export async function captureCardHtml(html, pngPath, existingBrowser) {
  const cardDir = path.dirname(pngPath);
  const root = path.dirname(cardDir);
  await mkdir(path.join(root, "assets"), { recursive: true });
  await mkdir(cardDir, { recursive: true });
  await copyFile(FONT, path.join(root, "assets", "InterVariable-opsz.woff"));
  const htmlPath = path.join(cardDir, "card.html");
  await writeFile(htmlPath, html);
  const { chromium } = await import("playwright");
  const browser = existingBrowser || await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode?.().catch(() => {}) ?? Promise.resolve()));
    });
    const loaded = await page.evaluate(() => document.fonts.check("900 100px InterCard"));
    if (!loaded) throw new Error("Inter variable font did not load for the mint/burn card.");
    const broken = await page.evaluate(() => [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src));
    if (broken.length) throw new Error(`Mint/burn card logo failed to load: ${broken.join(", ")}`);
    const card = page.locator("[data-capture='share-card']");
    await card.waitFor({ state: "visible", timeout: 15_000 });
    const png = await card.screenshot({ type: "png", animations: "disabled" });
    const size = pngSize(png);
    const pngWidth = CARD_WIDTH * 2;
    const pngHeight = CARD_HEIGHT * 2;
    if (size.width !== pngWidth || size.height !== pngHeight) {
      throw new Error(`Mint/burn card PNG is ${size.width}×${size.height}; expected ${pngWidth}×${pngHeight}.`);
    }
    if (png.length > 5 * 1024 * 1024) {
      throw new Error(`Mint/burn card PNG is ${png.length} bytes; X's image limit is 5 MB.`);
    }
    await writeFile(pngPath, png);
    return { png, ...size };
  } finally {
    if (!existingBrowser) await browser.close();
  }
}
