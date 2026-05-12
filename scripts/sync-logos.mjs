#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTsModule(relativePath) {
  const filename = join(process.cwd(), relativePath);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
    fileName: filename,
  }).outputText;
  const mod = { exports: {} };
  const dirname = filename.slice(0, filename.lastIndexOf("/"));
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      const target = join(dirname, specifier);
      if (existsSync(`${target}.ts`)) return loadTsModule(target.replace(`${process.cwd()}/`, "") + ".ts");
      if (existsSync(target) && target.endsWith(".ts")) return loadTsModule(target.replace(`${process.cwd()}/`, ""));
      return require(target);
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, filename, dirname);
  return mod.exports;
}

const { logoRegistry } = loadTsModule("lib/logos/logoRegistry.ts");
const { requiredActiveLogoKeys } = loadTsModule("lib/logos/metricLogoRequirements.ts");

const PUBLIC_DIR = join(process.cwd(), "public");
const RIGHTS_NOTE = "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.";
const RAW_PROVIDER_DIR = {
  defillama: "defillama",
  "crypto-logos": "cryptologos",
  "simple-icons": "simple-icons",
  "trustwallet-assets": "trustwallet",
  "spothq-cryptocurrency-icons": "spothq",
  "official-website": "official",
  "official-github": "official",
  official: "official",
  "official-brand-kit": "official",
  "other-data-provider": "other-data-provider",
};
const BLOCKED_PROVIDERS = new Set(["generated", "fallback", "placeholder"]);

const sourceOverrides = {
  "chain:ethereum": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/ethereum", note: "Simple Icons Ethereum SVG fetched as source-backed local asset." }],
  "chain:polygon": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/polygon", note: "Simple Icons Polygon SVG fetched as source-backed local asset." }],
  "chain:solana": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/solana", note: "Simple Icons Solana SVG fetched as source-backed local asset." }],
  "chain:base": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/base", note: "Simple Icons Base SVG fetched as source-backed local asset." }],
  "chain:arbitrum": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/arbitrum", note: "Simple Icons Arbitrum SVG fetched as source-backed local asset." }],
  "chain:starknet": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/starknet", note: "Simple Icons Starknet SVG fetched as source-backed local asset." }],
  "chain:aptos": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/aptos", note: "Simple Icons Aptos SVG fetched as source-backed local asset." }],
  "chain:sui": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/sui", note: "Simple Icons Sui SVG fetched as source-backed local asset." }],
  "chain:ton": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/ton", note: "Simple Icons TON SVG fetched as source-backed local asset." }],
  "chain:filecoin": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/filecoin", note: "Simple Icons Filecoin SVG fetched as source-backed local asset." }],
  "chain:near": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/near", note: "Simple Icons NEAR SVG fetched as source-backed local asset." }],
  "chain:optimism": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/optimism", note: "Simple Icons Optimism SVG fetched as source-backed local asset." }],
  "chain:mantle": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/mantle", note: "Simple Icons Mantle SVG fetched as source-backed local asset." }],
  "chain:stellar": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/stellar", note: "Simple Icons Stellar SVG fetched as source-backed local asset." }],
  "chain:ripple": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/xrp", note: "Simple Icons XRP SVG fetched as source-backed local asset." }],
  "chain:zksync-era": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/zksync", note: "Simple Icons ZKsync SVG fetched as source-backed local asset." }],
  "chain:celo": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/celo", note: "Simple Icons Celo SVG fetched as source-backed local asset." }],
  "chain:hedera": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/hedera", note: "Simple Icons Hedera SVG fetched as source-backed local asset." }],
  "chain:algorand": [{ provider: "simple-icons", url: "https://cdn.simpleicons.org/algorand", note: "Simple Icons Algorand SVG fetched as source-backed local asset." }],
  "chain:megaeth": [{ provider: "other-data-provider", url: "https://logo.svgcdn.com/token-branded/mega-eth.png", note: "MegaETH direct transparent PNG candidate from brandpnglogo/svgcdn. Needs visual review." }],
  "chain:hyperliquid": [{ provider: "official-brand-kit", url: "https://hyperliquid.gitbook.io/hyperliquid-docs/brand-kit", note: "Official Hyperliquid brand kit page provides PNG and SVG logo zip downloads; page is a source note, not a direct image.", sourceOnly: true }],
  "chain:provenance": [{ provider: "official-brand-kit", url: "https://provenance.io/presskit", note: "Official Provenance presskit page says logos are available in PNG and SVG format; page is a source note until a direct logo URL is confirmed.", sourceOnly: true }],
  "chain:eni": [
    { provider: "defillama", url: "https://icons.llama.fi/chains/rsz_eni.jpg", note: "DefiLlama ENI chain icon direct candidate." },
    { provider: "defillama", url: "https://icons.llama.fi/eni.jpg", note: "DefiLlama ENI generic icon direct candidate." },
    { provider: "other-data-provider", url: "https://www.coingecko.com/en/chains/eni", note: "CoinGecko ENI chain page source note; not a direct image.", sourceOnly: true },
  ],
};

const slugCandidates = {
  "canton-network": ["canton", "canton-network"],
  bsc: ["bsc", "binance", "bnb"],
  "internet-computer": ["internet-computer", "icp"],
  ripple: ["xrp", "ripple", "xrpl"],
  "zksync-era": ["zksync-era", "zksync"],
  filecoin: ["filecoin", "fil"],
  ton: ["ton", "toncoin"],
  optimism: ["optimism", "op-mainnet"],
  "bsv-blockchain": ["bsv", "bitcoin-sv", "bsv-blockchain"],
  eni: ["eni", "eni-blockchain", "eni-network", "eniac"],
  "io-net": ["io-net", "ionet"],
  "render-network": ["render", "render-network"],
  doublezero: ["doublezero", "double-zero", "2z"],
  "pocket-network": ["pocket", "pocket-network"],
};

function ensureDirs() {
  for (const dir of ["chains", "projects", "assets", "raw/defillama", "raw/official", "raw/cryptologos", "raw/simple-icons", "raw/trustwallet", "raw/spothq", "raw/other-data-provider"]) {
    mkdirSync(join(PUBLIC_DIR, "logos", dir), { recursive: true });
  }
}

function contentExtension(contentType, url) {
  const lower = contentType.toLowerCase();
  if (lower.includes("svg")) return "svg";
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  const urlExt = extname(new URL(url).pathname).replace(/^\./, "").toLowerCase();
  if (["svg", "png", "webp", "jpg", "jpeg"].includes(urlExt)) return urlExt === "jpeg" ? "jpg" : urlExt;
  return "bin";
}

function dimensions(buffer, ext) {
  if (ext === "png" && buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (ext === "jpg" || ext === "jpeg") {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
  }
  if (ext === "svg") {
    const text = buffer.toString("utf8");
    const svg = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
    const width = Number(svg.match(/\bwidth=["']([0-9.]+)/i)?.[1]);
    const height = Number(svg.match(/\bheight=["']([0-9.]+)/i)?.[1]);
    const viewBox = svg.match(/\bviewBox=["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)/i);
    return { width: Number.isFinite(width) && width > 0 ? width : Number(viewBox?.[1] ?? 0) || null, height: Number.isFinite(height) && height > 0 ? height : Number(viewBox?.[2] ?? 0) || null };
  }
  return { width: null, height: null };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function categoryDir(category) {
  return category === "chain" ? "chains" : category === "project" ? "projects" : "assets";
}

function defillamaCandidates(logo) {
  const slugs = [...new Set([logo.slug, ...(slugCandidates[logo.slug] ?? [])])];
  const candidates = [];
  for (const slug of slugs) {
    if (logo.category === "chain") candidates.push({ provider: "defillama", url: `https://icons.llama.fi/chains/rsz_${slug}.jpg`, note: `DefiLlama chain icon mirror candidate for ${slug}.` });
    candidates.push({ provider: "defillama", url: `https://icons.llama.fi/${slug}.jpg`, note: `DefiLlama generic icon mirror candidate for ${slug}.` });
  }
  return candidates;
}

function registrySourceCandidate(logo) {
  if (!/^https?:\/\//i.test(logo.sourceUrl ?? "")) return null;
  return {
    provider: logo.sourceType,
    url: logo.sourceUrl,
    note: logo.sourceNote ?? `Registry source URL candidate for ${logo.category}:${logo.slug}.`,
  };
}

const COLOR_LOGO_FIRST_KEYS = new Set([
  "chain:solana",
  "chain:polygon",
  "chain:bsc",
  "chain:base",
  "chain:ethereum",
  "chain:avalanche",
  "chain:arbitrum",
  "chain:aptos",
  "chain:ton",
  "chain:sui",
  "chain:ripple",
  "chain:stellar",
  "chain:near",
  "chain:optimism",
  "chain:starknet",
  "chain:mantle",
  "chain:filecoin",
  "chain:cardano",
  "chain:tron",
]);

function candidatesFor(logo) {
  const key = `${logo.category}:${logo.slug}`;
  const defillama = defillamaCandidates(logo);
  const registry = registrySourceCandidate(logo);
  const overrides = sourceOverrides[key] ?? [];

  const ordered = COLOR_LOGO_FIRST_KEYS.has(key)
    ? [...defillama, registry, ...overrides]
    : [...overrides, ...defillama, registry];

  return ordered.filter((candidate) => candidate && !BLOCKED_PROVIDERS.has(candidate.provider));
}

async function download(candidate) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(candidate.url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "learnDeFi-logo-sync/1.0" } });
    if (!response.ok) return { ok: false, status: response.status, error: response.statusText };
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) return { ok: false, status: response.status, error: `too small (${buffer.length} bytes)` };
    const ext = contentExtension(contentType, candidate.url);
    if (!/(svg|png|jpg|webp)/.test(ext)) return { ok: false, status: response.status, error: `unsupported content-type ${contentType}` };
    return { ok: true, buffer, contentType, ext };
  } catch (error) {
    return { ok: false, status: "network", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function toEntry(logo, candidate, result, rawPath, localPath) {
  const hash = sha256(result.buffer);
  const size = dimensions(result.buffer, result.ext);
  return {
    canonicalName: logo.canonicalName,
    slug: logo.slug,
    category: logo.category,
    localPath,
    rawPath,
    sourceProvider: candidate.provider,
    sourceUrl: candidate.url,
    sourceNote: candidate.note,
    downloadedAt: new Date().toISOString(),
    originalContentType: result.contentType,
    sha256: hash,
    width: size.width,
    height: size.height,
    approvalStatus: candidate.approvalStatus ?? "approved",
    visualRejected: logo.visualRejected,
    visualRejectReason: logo.visualRejectReason,
    fallbackPreferredUntilManualAsset: logo.fallbackPreferredUntilManualAsset,
    rightsNote: RIGHTS_NOTE,
    notes: "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed.",
  };
}

function serializeManifest(entries, unresolved) {
  const header = `import type { LogoCategory } from "./logoRegistry";\n\nexport type LogoSourceProvider =\n  | "official"\n  | "official-brand-kit"\n  | "official-website"\n  | "official-github"\n  | "defillama"\n  | "crypto-logos"\n  | "simple-icons"\n  | "trustwallet-assets"\n  | "spothq-cryptocurrency-icons"\n  | "other-data-provider"\n  | "existing-local-reviewed";\n\nexport type LogoApprovalStatus = "approved" | "needs-review" | "missing" | "rejected";\n\nexport type LogoSourceManifestEntry = {\n  canonicalName: string;\n  slug: string;\n  category: LogoCategory;\n  localPath: string;\n  rawPath?: string;\n  sourceProvider: LogoSourceProvider;\n  sourceUrl?: string;\n  sourceNote?: string;\n  downloadedAt: string;\n  originalContentType: string;\n  sha256: string;\n  width: number | null;\n  height: number | null;\n  approvalStatus: LogoApprovalStatus;\n  rightsNote: string;\n  notes: string;\n  visualRejected?: boolean;\n  visualRejectReason?: string;\n  fallbackPreferredUntilManualAsset?: boolean;\n};\n\nexport type LogoSourceUnresolvedEntry = {\n  canonicalName: string;\n  slug: string;\n  category: LogoCategory;\n  attemptedCandidates: { provider: string; url: string; status: string; error: string; note?: string }[];\n};\n\n`;
  return `${header}export const logoSourceManifest: LogoSourceManifestEntry[] = ${JSON.stringify(entries, null, 2)};\n\nexport const unresolvedLogoSources: LogoSourceUnresolvedEntry[] = ${JSON.stringify(unresolved, null, 2)};\n\nexport const logoSourceManifestByKey = new Map(logoSourceManifest.map((entry) => [\`${"${entry.category}:${entry.slug}"}\`, entry]));\n`;
}

async function networkAvailable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("https://icons.llama.fi/favicon.ico", { signal: controller.signal, headers: { "user-agent": "learnDeFi-logo-sync/1.0" } });
    clearTimeout(timeout);
    return response.ok || response.status === 404 || response.status === 403;
  } catch {
    return false;
  }
}

async function main() {
  ensureDirs();
  const required = new Set(requiredActiveLogoKeys);
  const logos = logoRegistry.filter((logo) => required.has(`${logo.category}:${logo.slug}`)).sort((a, b) => `${a.category}:${a.slug}`.localeCompare(`${b.category}:${b.slug}`));
  const entries = [];
  const unresolved = [];
  const online = await networkAvailable();
  if (!online) console.warn("Logo sync warning: network/download unavailable; generating unresolved source candidates without fake approvals.");
  for (const logo of logos) {
    const attempted = [];
    let accepted = null;
    for (const candidate of candidatesFor(logo)) {
      if (!online) {
        attempted.push({ provider: candidate.provider, url: candidate.url, status: "network-unavailable", error: "download probe failed", note: candidate.note });
        continue;
      }
      if (candidate.sourceOnly) {
        attempted.push({ provider: candidate.provider, url: candidate.url, status: "source-note", error: "not a direct image URL", note: candidate.note });
        continue;
      }
      const result = await download(candidate);
      if (!result.ok) {
        attempted.push({ provider: candidate.provider, url: candidate.url, status: String(result.status), error: result.error, note: candidate.note });
        continue;
      }
      const providerDir = RAW_PROVIDER_DIR[candidate.provider] ?? "official";
      const rawPath = `/logos/raw/${providerDir}/${logo.category}-${logo.slug}.${result.ext}`;
      const localPath = `/logos/${categoryDir(logo.category)}/${logo.slug}.${result.ext}`;
      writeFileSync(join(PUBLIC_DIR, rawPath.replace(/^\//, "")), result.buffer);
      copyFileSync(join(PUBLIC_DIR, rawPath.replace(/^\//, "")), join(PUBLIC_DIR, localPath.replace(/^\//, "")));
      accepted = toEntry(logo, candidate, result, rawPath, localPath);
      break;
    }
    if (accepted) entries.push(accepted);
    else unresolved.push({ canonicalName: logo.canonicalName, slug: logo.slug, category: logo.category, attemptedCandidates: attempted });
  }
  entries.sort((a, b) => `${a.category}:${a.slug}`.localeCompare(`${b.category}:${b.slug}`));
  unresolved.sort((a, b) => `${a.category}:${a.slug}`.localeCompare(`${b.category}:${b.slug}`));
  writeFileSync(join(process.cwd(), "lib/logos/logoSourceManifest.ts"), serializeManifest(entries, unresolved));
  console.log("Logo sync summary");
  console.log(`Required entities: ${logos.length}`);
  console.log(`Downloaded and approved: ${entries.length}`);
  console.log(`Unresolved: ${unresolved.length}`);
  for (const entry of entries) console.log(`- approved ${entry.category}:${entry.slug} ${entry.localPath} <- ${entry.sourceProvider} ${entry.sourceUrl}`);
  if (unresolved.length) {
    console.log("\nUnresolved required entities:");
    for (const item of unresolved) {
      console.log(`- ${item.category}:${item.slug} ${item.canonicalName}`);
      for (const candidate of item.attemptedCandidates) console.log(`  · ${candidate.provider} ${candidate.url} [${candidate.status}] ${candidate.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
