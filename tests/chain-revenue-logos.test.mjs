import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { ensureShareTimestamps, readPostState, recordShare } from "../scripts/x-btc-eth-etf-share-gate.mjs";

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "chain-revenue-logos-"));
  const file = join(dir, "module.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const cr = await loadTs("../lib/onchain/chainRevenueDaily.ts");
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const APPROVED = "https://assets.coingecko.com/coins/images/1/large/tron.png";
const FIXED = "/logos/chain-revenue/tron.png";
const LLAMA = cr.defillamaChainLogoUrl("tron");

function pngBytes(marker) {
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, marker]);
}

function pngDataUrl(marker) {
  return `data:image/png;base64,${Buffer.from(pngBytes(marker)).toString("base64")}`;
}

function checked(renderUrl, byteLength = 32) {
  return { contentType: renderUrl.startsWith("data:") ? "image/png" : "image/png", byteLength, renderUrl };
}

function chain(slug = "tron", name = "Tron") {
  return { slug, name, logoKey: slug, onCard: true };
}

function cacheEntry(dataUrl, approvedUrl = APPROVED, byteLength = 9) {
  return {
    slug: "tron",
    name: "Tron",
    approvedUrl,
    contentType: "image/png",
    dataUrl,
    byteLength,
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

function plan(overrides) {
  return cr.planChainRevenueLogos({
    chains: [chain()],
    dbAvailable: true,
    approvedUrlBySlug: { tron: APPROVED },
    cache: {},
    images: {},
    now: "2026-11-22T00:00:00.000Z",
    ...overrides,
  });
}

test("resolution order is approved, cache, fixed, defillama, then the initial", () => {
  const approved = pngDataUrl(1);
  const cached = pngDataUrl(2);
  const all = plan({
    cache: { tron: cacheEntry(cached) },
    images: {
      [APPROVED]: checked(approved, 40),
      [FIXED]: checked(FIXED, 20),
      [LLAMA]: checked(LLAMA, 20),
    },
  });
  assert.equal(all.choices[0].source, "approved");
  assert.equal(all.choices[0].url, approved);
  assert.equal(all.warnings.length, 0);

  const fromCache = plan({
    images: { [APPROVED]: null, [FIXED]: checked(FIXED, 20), [LLAMA]: checked(LLAMA, 20) },
    cache: { tron: cacheEntry(cached) },
  });
  assert.equal(fromCache.choices[0].source, "cache");
  assert.equal(fromCache.choices[0].url, cached);

  const fromFixed = plan({
    images: { [APPROVED]: null, [FIXED]: checked(FIXED, 20), [LLAMA]: checked(LLAMA, 20) },
  });
  assert.equal(fromFixed.choices[0].source, "fixed");
  assert.equal(fromFixed.choices[0].url, FIXED);

  const fromLlama = plan({
    images: { [APPROVED]: null, [FIXED]: null, [LLAMA]: checked(LLAMA, 20) },
  });
  assert.equal(fromLlama.choices[0].source, "defillama");
  assert.match(fromLlama.warnings[0], /DefiLlama/);

  const fromInitial = plan({ approvedUrlBySlug: { tron: null }, images: {} });
  assert.equal(fromInitial.choices[0].source, "initial");
  assert.match(fromInitial.warnings[0], /initial/);
});

test("an invalid approved image falls through, and a changed logo refreshes the cache", () => {
  const cached = pngDataUrl(2);
  const invalid = plan({
    images: { [APPROVED]: null, [FIXED]: checked(FIXED, 20) },
    cache: { tron: cacheEntry(cached) },
  });
  assert.equal(invalid.choices[0].source, "cache");
  assert.equal(invalid.cache.tron.dataUrl, cached);

  const next = pngDataUrl(3);
  const nextUrl = "https://coin-images.coingecko.com/coins/images/1/large/tron.png";
  const refreshed = plan({
    approvedUrlBySlug: { tron: nextUrl },
    images: { [nextUrl]: checked(next, 48) },
    cache: { tron: cacheEntry(cached, APPROVED, 9) },
  });
  assert.equal(refreshed.choices[0].source, "approved");
  assert.equal(refreshed.choices[0].url, next);
  assert.equal(refreshed.cache.tron.approvedUrl, nextUrl);
  assert.equal(refreshed.cache.tron.dataUrl, next);
  assert.equal(refreshed.cache.tron.updatedAt, "2026-11-22T00:00:00.000Z");

  const same = plan({
    images: { [APPROVED]: checked(pngDataUrl(9), 9) },
    cache: { tron: cacheEntry(cached, APPROVED, 9) },
  });
  assert.equal(same.cache.tron.dataUrl, cached);
  assert.equal(same.cache.tron.updatedAt, "2026-11-01T00:00:00.000Z");
});

test("a logo that is no longer approved is removed from the cache", () => {
  const cached = pngDataUrl(2);
  const removed = plan({
    approvedUrlBySlug: { tron: null },
    images: { [FIXED]: checked(FIXED, 20) },
    cache: { tron: cacheEntry(cached), solana: cacheEntry(pngDataUrl(5), "https://assets.coingecko.com/sol.png", 9) },
  });
  assert.equal(removed.cache.tron, undefined);
  assert.equal(removed.choices[0].source, "fixed");
  assert.ok(removed.cache.solana);

  const offCard = cr.planChainRevenueLogos({
    chains: [
      chain(),
      { slug: "solana", name: "Solana", logoKey: "solana", onCard: false },
    ],
    dbAvailable: true,
    approvedUrlBySlug: { tron: null, solana: null },
    cache: {
      tron: cacheEntry(cached),
      solana: { ...cacheEntry(pngDataUrl(5)), slug: "solana", name: "Solana" },
    },
    images: { [FIXED]: checked(FIXED, 20) },
    now: "2026-11-22T00:00:00.000Z",
  });
  assert.equal(offCard.cache.solana, undefined);
  assert.equal(offCard.choices.length, 1);
});

test("a down database uses the cache and does not delete it", () => {
  const cached = pngDataUrl(4);
  const down = plan({
    dbAvailable: false,
    approvedUrlBySlug: {},
    images: { [FIXED]: checked(FIXED, 20) },
    cache: { tron: cacheEntry(cached) },
  });
  assert.equal(down.choices[0].source, "cache");
  assert.equal(down.cache.tron.dataUrl, cached);
  assert.equal(down.warnings.length, 0);

  const noCache = plan({ dbAvailable: false, approvedUrlBySlug: {}, images: { [FIXED]: null, [LLAMA]: null } });
  assert.equal(noCache.choices[0].source, "initial");
  assert.equal(noCache.choices.length, 1);
});

test("the initial badge is a circle with the chain letter and passes the logo allowlist", () => {
  const badge = cr.chainInitialBadgeDataUrl("Op Mainnet");
  assert.equal(cr.chainInitialLetter("Op Mainnet"), "O");
  assert.equal(cr.chainInitialLetter("   "), "C");
  assert.equal(cr.chainInitialLetter(""), "C");
  assert.doesNotMatch(decodeURIComponent(badge), /\?/);
  assert.match(decodeURIComponent(badge), /<circle/);
  assert.match(decodeURIComponent(badge), />O</);
  assert.equal(cr.allowedChainLogoUrl(badge), badge);
  assert.equal(cr.sniffChainLogo(new TextEncoder().encode("<html></html>")), null);
  assert.equal(cr.sniffChainLogo(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(cr.sniffChainLogo(pngBytes(1)), "image/png");
});

test("approved logo hosts are allowed and other hosts are not", () => {
  assert.equal(
    cr.allowedChainLogoUrl("https://assets.coingecko.com/coins/images/1/large/tron.png"),
    "https://assets.coingecko.com/coins/images/1/large/tron.png",
  );
  assert.equal(
    cr.allowedChainLogoUrl("https://coin-images.coingecko.com/coins/images/1/large/tron.png"),
    "https://coin-images.coingecko.com/coins/images/1/large/tron.png",
  );
  assert.equal(
    cr.allowedChainLogoUrl("https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png"),
    "https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png",
  );
  assert.equal(
    cr.allowedChainLogoUrl("https://s3.coinmarketcap.com/static-gravity/image/tron.jpg"),
    "https://s3.coinmarketcap.com/static-gravity/image/tron.jpg",
  );
  assert.equal(
    cr.allowedChainLogoUrl("https://token-icons.llamao.fi/icons/tokens/gecko/tron?w=48"),
    "https://token-icons.llamao.fi/icons/tokens/gecko/tron?w=48",
  );
  assert.equal(
    cr.allowedChainLogoUrl("https://abc123.public.blob.vercel-storage.com/logos/tron.png"),
    "https://abc123.public.blob.vercel-storage.com/logos/tron.png",
  );
  assert.equal(cr.allowedChainLogoUrl("https://evil.public.blob.vercel-storage.com.example/tron.png"), null);
  assert.equal(cr.allowedChainLogoUrl("https://evil.example/tron.png"), null);
  assert.equal(cr.allowedChainLogoUrl("http://assets.coingecko.com/tron.png"), null);
  assert.equal(cr.allowedChainLogoUrl("/logos/../secret.png"), null);
});

test("recording a share keeps the logo cache in posted-state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "chain-revenue-state-"));
  const file = join(dir, "posted-state.json");
  const cached = pngDataUrl(7);
  await writeFile(
    file,
    `${JSON.stringify({ posts: [], logos: { tron: cacheEntry(cached) }, logoSources: [{ slug: "tron", source: "approved" }] }, null, 2)}\n`,
  );
  await recordShare(file, { date: "2026-11-21", mode: "dry-run", at: "2026-11-22T12:00:00.000Z" });
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.logos.tron.dataUrl, cached);
  assert.equal(saved.logoSources[0].source, "approved");
  assert.equal((await readPostState(file)).length, 1);

  const stamped = await ensureShareTimestamps(
    file,
    [{ date: "2026-11-20", mode: "live" }],
    "2026-11-22T13:00:00.000Z",
  );
  assert.deepEqual(stamped.stamped, ["2026-11-20"]);
  const afterStamp = JSON.parse(await readFile(file, "utf8"));
  assert.equal(afterStamp.logos.tron.dataUrl, cached);
  assert.equal(afterStamp.posts.find((post) => post.date === "2026-11-20").at, "2026-11-22T13:00:00.000Z");
});

test("the card, scripts, and snapshot builder use the logo order and never skip on a logo", async () => {
  const [card, daily, period, snapshots, logos, design] = await Promise.all([
    read("../components/share/ChainRevenueDailyCard.tsx"),
    read("../scripts/x-chain-revenue-daily.mjs"),
    read("../scripts/x-chain-revenue-period.mjs"),
    read("../lib/onchain/snapshots.ts"),
    read("../lib/onchain/chainRevenueLogos.ts"),
    read("../docs/DESIGN.md"),
  ]);
  assert.match(card, /chainInitialLetter/);
  assert.doesNotMatch(card, /"\?"/);
  for (const script of [daily, period]) {
    assert.match(script, /CHAIN_REVENUE_LOGO_STATE/);
    assert.match(script, /logoSources/);
    assert.match(script, /logoWarnings/);
    assert.match(script, /logos failed to load/);
    assert.doesNotMatch(script, /broken\.length/);
  }
  assert.match(snapshots, /applyChainRevenueCardLogos/);
  assert.match(logos, /approvedLogoCandidateOverlay/);
  assert.match(logos, /throwOnError: true/);
  assert.match(logos, /logo resolution failed/);
  assert.match(design, /Logo Manager approved logo/);
});
