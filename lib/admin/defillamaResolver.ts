import "server-only";
import {
  derivativeMatchTerms,
  normalizeProviderText,
  scoreProviderCandidate,
  slugText,
  type ConfidenceLabel,
} from "@/lib/admin/providerScoring";
import { buildProviderAliasSet } from "@/lib/admin/providerAliases";

export type DefiLlamaDebugAttempt = {
  url: string;
  method: "HEAD" | "GET";
  status: number | null;
  contentType: string | null;
  accepted: boolean;
  reason: string;
};

export type DefiLlamaSourceType = "chain-icon" | "chain-mirror" | "protocol-index";
export type DefiLlamaImagePattern = "chains-rsz" | "chains-direct" | "protocol-icon" | "local-chain-mirror";

export type DefiLlamaCandidate = {
  id: string;
  name: string;
  slug: string;
  category: "protocol" | "chain" | "stablecoin";
  sourceUrl: string;
  imageUrl: string;
  confidence: ConfidenceLabel;
  score: number;
  recommended: boolean;
  reasons?: string[];
  sourceType: DefiLlamaSourceType;
  selectedImagePattern: DefiLlamaImagePattern;
  debug?: {
    selectedReason: string;
    aliasesTried: string[];
    urlPatternsTried: string[];
    attempts: DefiLlamaDebugAttempt[];
  };
};

export type DefiLlamaSearchDebug = {
  query: string;
  targetName: string | null;
  targetSlug: string | null;
  targetCategory: string | null;
  expectedCategory: string | null;
  aliasesTried: string[];
  urlPatternsTried: string[];
  attempts: DefiLlamaDebugAttempt[];
  selectedCandidateReason: string | null;
  notices: string[];
};

type ResolverContext = { targetName?: string | null; targetSlug?: string | null; category?: string | null; aliases?: string[] };

type IndexRow = {
  name: string;
  slug: string;
  category: DefiLlamaCandidate["category"];
  sourceUrl: string;
  aliases?: string[];
  imageUrls?: string[];
  imageSlugs?: string[];
  trusted?: boolean;
};

const TRUSTED_NATIVE_CHAIN_MAPPINGS: Array<{ name: string; slug: string; aliases: string[] }> = [
  { name: "Ethereum", slug: "ethereum", aliases: ["ethereum", "eth"] },
  { name: "Bitcoin", slug: "bitcoin", aliases: ["bitcoin", "btc"] },
  { name: "Polygon", slug: "polygon", aliases: ["polygon", "matic", "pol"] },
  { name: "Arbitrum", slug: "arbitrum", aliases: ["arbitrum", "arb", "arbitrum one", "arbitrum-one"] },
  { name: "Avalanche", slug: "avalanche", aliases: ["avalanche", "avax", "avalanche c-chain", "avalanche c chain"] },
  { name: "Solana", slug: "solana", aliases: ["solana", "sol"] },
  { name: "BNB Chain", slug: "bsc", aliases: ["bnb", "bnb-chain", "bnb chain", "bsc", "binance smart chain", "binance-smart-chain", "binancecoin"] },
  { name: "XRP Ledger", slug: "xrp", aliases: ["xrp", "xrpl", "xrp-ledger", "xrp ledger", "ripple", "ripple-network", "xrpl-mainnet"] },
  { name: "Optimism", slug: "optimism", aliases: ["optimism", "op", "op mainnet", "op-mainnet"] },
  { name: "Base", slug: "base", aliases: ["base", "base chain"] },
  { name: "zkSync Era", slug: "zksync era", aliases: ["zksync", "zk-sync", "zksync era", "zksync-era", "zk sync era"] },
  { name: "Katana", slug: "katana", aliases: ["katana", "kat"] },
  { name: "MegaETH", slug: "megaeth", aliases: ["megaeth", "mega-eth", "mega"] },
];

const KNOWN_ALIAS_GROUPS = [
  ...TRUSTED_NATIVE_CHAIN_MAPPINGS.map((mapping) => mapping.aliases),
  ["bsc", "bnb-chain", "bnb chain", "binance smart chain", "binance-smart-chain", "bnb", "binance", "binancecoin"],
  ["op mainnet", "op-mainnet", "optimism", "optimism mainnet", "op"],
  ["matic", "polygon", "polygon pos", "polygon-pos", "pol"],
  ["zksync", "zk-sync", "zksync era", "zksync-era", "zk sync era", "zk-sync-era"],
  ["render", "render-network", "render network", "render-network-token", "rndr"],
  ["plasma", "xpl"],
  ["sui", "sui-network"],
  ["apt", "aptos", "aptos-network"],
  ["near"],
  ["fil", "filecoin", "filecoin-chain"],
  ["xrp", "xrpl", "xrp-ledger", "xrp ledger", "ripple", "ripple-network", "xrpl-mainnet"],
];

const aliasLookup = new Map<string, Set<string>>();
for (const group of KNOWN_ALIAS_GROUPS) {
  const normalized = group.flatMap((value) => [normalizeProviderText(value), slugText(value)]).filter(Boolean);
  for (const value of normalized) {
    const set = aliasLookup.get(value) ?? new Set<string>();
    normalized.forEach((alias) => set.add(alias));
    aliasLookup.set(value, set);
  }
}

let cachedIndex: { at: number; rows: IndexRow[] } | null = null;

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function expandKnownAliases(...values: unknown[]) {
  const tokens = new Set<string>();
  for (const value of values) {
    const normalized = normalizeProviderText(value);
    const slug = slugText(value);
    for (const token of [normalized, slug]) {
      if (!token) continue;
      tokens.add(token);
      aliasLookup.get(token)?.forEach((alias) => tokens.add(alias));
    }
  }
  return [...tokens];
}

async function jsonRows(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`DefiLlama index fetch failed (${response.status}).`);
  return response.json();
}

function chainAliases(name: string, slug: string) {
  return unique([name, slug, ...expandKnownAliases(name, slug)]);
}

function imageSlugCandidates(row: Pick<IndexRow, "name" | "slug" | "aliases" | "imageSlugs">) {
  return unique([
    ...(row.imageSlugs ?? []),
    row.slug,
    slugText(row.name),
    normalizeProviderText(row.name),
    ...(row.aliases ?? []).map(slugText),
    ...(row.aliases ?? []).map(normalizeProviderText),
  ]);
}

function chainIconUrl(value: string) {
  return `https://icons.llama.fi/chains/${encodeURIComponent(value)}.jpg`;
}

function resizedChainIconUrl(value: string) {
  return `https://icons.llama.fi/chains/rsz_${encodeURIComponent(value)}.jpg`;
}

function protocolIconUrl(value: string) {
  return `https://icons.llama.fi/${encodeURIComponent(value)}.jpg`;
}

function trustedRows(): IndexRow[] {
  return TRUSTED_NATIVE_CHAIN_MAPPINGS.map((mapping) => ({
    name: mapping.name,
    slug: mapping.slug,
    category: "chain",
    sourceUrl: `https://defillama.com/chain/${slugText(mapping.slug)}`,
    aliases: chainAliases(mapping.name, mapping.slug).concat(mapping.aliases),
    imageUrls: unique([mapping.slug, ...mapping.aliases, ...expandKnownAliases(mapping.slug, ...mapping.aliases)]).flatMap((alias) => [
      resizedChainIconUrl(alias),
      chainIconUrl(alias),
      protocolIconUrl(alias),
    ]),
    imageSlugs: unique([mapping.slug, ...mapping.aliases]),
    trusted: true,
  }));
}

async function defillamaIndex() {
  if (cachedIndex && Date.now() - cachedIndex.at < 1000 * 60 * 60) return cachedIndex.rows;
  const rows: IndexRow[] = trustedRows();
  const errors: string[] = [];
  try {
    const protocols = await jsonRows("https://api.llama.fi/protocols");
    for (const protocol of Array.isArray(protocols) ? protocols : []) {
      const slug = String(protocol.slug || "").trim();
      const name = String(protocol.name || "").trim();
      if (!slug || !name) continue;
      const aliases = unique([String(protocol.symbol || ""), String(protocol.parentProtocol || ""), ...expandKnownAliases(name, slug, protocol.symbol)]);
      rows.push({ name, slug, category: "protocol", sourceUrl: `https://defillama.com/protocol/${slug}`, aliases, imageUrls: [String(protocol.logo || ""), String(protocol.logoUrl || "")].filter(Boolean), imageSlugs: [slug] });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "protocol index failed");
  }
  try {
    const chains = await jsonRows("https://api.llama.fi/v2/chains");
    for (const chain of Array.isArray(chains) ? chains : []) {
      const name = String(chain.name || "").trim();
      if (!name) continue;
      const slug = slugText(name);
      rows.push({
        name,
        slug,
        category: "chain",
        sourceUrl: `https://defillama.com/chain/${slug}`,
        aliases: chainAliases(name, slug),
        imageUrls: [
          String(chain.logo || ""),
          String(chain.logoUrl || ""),
          ...imageSlugCandidates({ name, slug, aliases: chainAliases(name, slug), imageSlugs: [slug, name] }).flatMap((alias) => [resizedChainIconUrl(alias), chainIconUrl(alias), protocolIconUrl(alias)]),
        ].filter(Boolean),
        imageSlugs: [slug, name, ...expandKnownAliases(name, slug)],
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "chain index failed");
  }
  try {
    const stablecoins = await jsonRows("https://stablecoins.llama.fi/stablecoins?includePrices=false");
    for (const stable of Array.isArray(stablecoins?.peggedAssets) ? stablecoins.peggedAssets : []) {
      const name = String(stable.name || "").trim();
      const symbol = String(stable.symbol || "").trim();
      const slug = slugText(name || symbol);
      if (!slug || !name) continue;
      rows.push({ name, slug, category: "stablecoin", sourceUrl: `https://defillama.com/stablecoin/${slug}`, aliases: unique([symbol, ...expandKnownAliases(name, slug, symbol)]), imageUrls: [String(stable.logo || ""), String(stable.logoUrl || "")].filter(Boolean), imageSlugs: [slug, symbol] });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "stablecoin index failed");
  }
  if (!rows.length) throw new Error(errors[0] || "No DefiLlama index rows available.");
  cachedIndex = { at: Date.now(), rows };
  return rows;
}

function imageLike(contentType: string | null) {
  return Boolean(contentType && contentType.toLowerCase().startsWith("image/"));
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function hasImage(url: string): Promise<{ ok: boolean; attempts: DefiLlamaDebugAttempt[] }> {
  const attempts: DefiLlamaDebugAttempt[] = [];
  try {
    const head = await fetchWithTimeout(url, { method: "HEAD", headers: { accept: "image/png,image/jpeg,image/webp,*/*" }, cache: "no-store" });
    const contentType = head.headers.get("content-type");
    const accepted = head.ok && imageLike(contentType);
    attempts.push({ url, method: "HEAD", status: head.status, contentType, accepted, reason: accepted ? "image content-type" : head.ok ? "weak_or_missing_content_type" : `status_${head.status}` });
    if (accepted) return { ok: true, attempts };
  } catch (error) {
    attempts.push({ url, method: "HEAD", status: null, contentType: null, accepted: false, reason: error instanceof Error ? error.message : "head_failed" });
  }
  try {
    const response = await fetchWithTimeout(url, { headers: { accept: "image/png,image/jpeg,image/webp,*/*", range: "bytes=0-2047" }, cache: "no-store" });
    const contentType = response.headers.get("content-type");
    const accepted = response.ok && imageLike(contentType);
    attempts.push({ url, method: "GET", status: response.status, contentType, accepted, reason: accepted ? "partial GET image content-type" : response.ok ? "weak_or_missing_content_type" : `status_${response.status}` });
    return { ok: accepted, attempts };
  } catch (error) {
    attempts.push({ url, method: "GET", status: null, contentType: null, accepted: false, reason: error instanceof Error ? error.message : "get_failed" });
    return { ok: false, attempts };
  }
}

async function resolveImageUrl(row: IndexRow) {
  const isTrustedChain = row.category === "chain" && Boolean(row.trusted);
  const chainSlugs = imageSlugCandidates(row);
  const chainFirstUrls = chainSlugs.flatMap((slug) => [resizedChainIconUrl(slug), chainIconUrl(slug)]);
  const protocolUrls = imageSlugCandidates(row).map(protocolIconUrl);
  const urls = unique([
    ...(isTrustedChain ? [] : (row.imageUrls ?? [])),
    ...(row.category === "chain" ? (isTrustedChain ? chainFirstUrls : chainFirstUrls.concat(protocolUrls)) : protocolUrls),
    ...((!isTrustedChain ? (row.imageUrls ?? []) : []).filter((url) => /^https:\/\//.test(url) && !/icons\.llama\.fi\/(?!chains\/)[^?#]+/i.test(url))),
  ]).filter((url) => /^https:\/\//.test(url));
  const attempts: DefiLlamaDebugAttempt[] = [];
  for (const url of urls) {
    const result = await hasImage(url);
    attempts.push(...result.attempts);
    if (!result.ok) continue;
    const selectedImagePattern: DefiLlamaImagePattern = /icons\.llama\.fi\/chains\/rsz_/i.test(url)
      ? "chains-rsz"
      : /icons\.llama\.fi\/chains\//i.test(url)
        ? "chains-direct"
        : "protocol-icon";
    const sourceType: DefiLlamaSourceType = row.category === "chain" ? "chain-icon" : "protocol-index";
    return { imageUrl: url, urls, attempts, sourceType, selectedImagePattern };
  }
  return { imageUrl: null, urls, attempts, sourceType: row.category === "chain" ? "chain-icon" : "protocol-index", selectedImagePattern: row.category === "chain" ? "chains-rsz" : "protocol-icon" };
}

function isStablecoinCategory(category?: string | null) {
  const normalized = normalizeProviderText(category);
  return ["stablecoin", "stablecoins"].includes(normalized);
}

function expectedDefiLlamaCategory(category?: string | null): DefiLlamaCandidate["category"] | null {
  const normalized = normalizeProviderText(category);
  if (["chain", "chains", "network", "networks"].includes(normalized)) return "chain";
  if (["protocol", "protocols", "depin"].includes(normalized)) return "protocol";
  if (isStablecoinCategory(category)) return "stablecoin";
  // Generic assets can be native tokens; do not force ETH/BTC/SOL/etc. into stablecoin-only matching.
  if (["asset", "assets", "project", "projects"].includes(normalized)) return null;
  return null;
}

function isStrictDefiLlamaMatch(row: IndexRow, context: ResolverContext, query: string) {
  const targetValues = [query, context.targetName, context.targetSlug, ...(context.aliases ?? [])].filter(Boolean) as string[];
  const targetTokens = new Set(expandKnownAliases(...targetValues));
  const candidateName = normalizeProviderText(row.name);
  const candidateSlug = slugText(row.slug || row.name);
  const rowAliases = expandKnownAliases(row.name, row.slug, ...(row.aliases ?? []));
  const exactName = Boolean(candidateName && targetTokens.has(candidateName));
  const exactSlug = Boolean(candidateSlug && targetTokens.has(candidateSlug));
  const knownAlias = rowAliases.some((alias) => targetTokens.has(alias));
  const expectedCategory = expectedDefiLlamaCategory(context.category);
  const categoryMatch = !expectedCategory || row.category === expectedCategory;
  const stablecoinBlocked = isStablecoinCategory(context.category) && row.category !== "stablecoin";
  const targetDerivativeTerms = derivativeMatchTerms(...targetValues);
  const candidateDerivativeTerms = derivativeMatchTerms(row.name, row.slug, ...(row.aliases ?? []));
  const derivativeMismatch = candidateDerivativeTerms.length > 0 && !candidateDerivativeTerms.some((term) => targetDerivativeTerms.includes(term));

  const reasons: string[] = [];
  if (row.trusted) reasons.push("trusted native chain mapping");
  if (exactName) reasons.push("exact normalized name");
  if (exactSlug) reasons.push("exact normalized slug");
  if (knownAlias) reasons.push("known alias");
  if (categoryMatch && expectedCategory) reasons.push("category match");
  if (!categoryMatch) reasons.push("category_mismatch");
  if (stablecoinBlocked) reasons.push("stablecoin_only_category");
  if (derivativeMismatch) reasons.push("derivative_asset");
  if (!exactName && !exactSlug && !knownAlias) reasons.push("low_name_similarity");

  return { ok: categoryMatch && !stablecoinBlocked && !derivativeMismatch && (exactName || exactSlug || knownAlias), categoryMatch, reasons };
}

export async function searchDefiLlamaSources(query: string, context: ResolverContext = {}): Promise<{ candidates: DefiLlamaCandidate[]; error: string | null; debug: DefiLlamaSearchDebug }> {
  const q = query.trim();
  const emptyDebug: DefiLlamaSearchDebug = { query: q, targetName: context.targetName ?? null, targetSlug: context.targetSlug ?? null, targetCategory: context.category ?? null, expectedCategory: expectedDefiLlamaCategory(context.category), aliasesTried: [], urlPatternsTried: [], attempts: [], selectedCandidateReason: null, notices: [] };
  if (!q) return { candidates: [], error: null, debug: emptyDebug };
  try {
    const rows = await defillamaIndex();
    const expectedCategory = expectedDefiLlamaCategory(context.category);
    const shared = buildProviderAliasSet({ name: context.targetName, slug: context.targetSlug, category: context.category, knownAliases: context.aliases });
    const aliasContext = unique([...(context.aliases ?? []), ...shared.aliases, ...expandKnownAliases(q, context.targetName, context.targetSlug, ...shared.aliases)]);
    const debug: DefiLlamaSearchDebug = { ...emptyDebug, aliasesTried: aliasContext, expectedCategory, notices: [] };
    if (context.category && !expectedCategory && normalizeProviderText(context.category).includes("asset")) debug.notices.push("Asset category allowed chain/native-token matches.");
    const scored = rows
      .map((row) => {
        const strict = isStrictDefiLlamaMatch(row, { ...context, aliases: aliasContext }, q);
        const score = scoreProviderCandidate({
          query: q,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: aliasContext,
          candidateName: row.name,
          candidateSlug: row.slug,
          categoryMatch: Boolean(expectedCategory && row.category === expectedCategory),
        });
        const confidence: ConfidenceLabel = strict.ok ? "high" : score.score >= 45 ? "medium" : "low";
        return { row, score: strict.ok ? Math.max(score.score, strict.categoryMatch ? 92 : 86) : score.score, confidence, strict };
      })
      .filter((row) => row.strict.ok || row.score >= 45)
      .sort((a, b) => Number(b.row.trusted) - Number(a.row.trusted) || Number(b.strict.ok) - Number(a.strict.ok) || b.score - a.score)
      .slice(0, 10);
    const candidates: DefiLlamaCandidate[] = [];
    for (const { row, score, confidence, strict } of scored) {
      const resolved = await resolveImageUrl(row);
      debug.urlPatternsTried.push(...resolved.urls);
      debug.attempts.push(...resolved.attempts);
      if (!resolved.imageUrl) continue;
      candidates.push({ id: row.slug, name: row.name, slug: row.slug, category: row.category, sourceUrl: row.sourceUrl, imageUrl: resolved.imageUrl, confidence, score, recommended: false, sourceType: resolved.sourceType, selectedImagePattern: resolved.selectedImagePattern, reasons: strict.reasons, debug: { selectedReason: strict.reasons.join(", "), aliasesTried: aliasContext, urlPatternsTried: resolved.urls, attempts: resolved.attempts } });
    }
    const recommended = candidates.find((candidate) => candidate.confidence === "high" && !candidate.reasons?.some((reason) => ["category_mismatch", "derivative_asset", "low_name_similarity", "stablecoin_only_category"].includes(reason)));
    if (recommended) {
      recommended.recommended = true;
      debug.selectedCandidateReason = `${recommended.name} selected: ${recommended.reasons?.join(", ") || "high confidence"}`;
    }
    debug.urlPatternsTried = unique(debug.urlPatternsTried);
    return { candidates, error: recommended || candidates.length ? null : "No reliable DefiLlama source found.", debug };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "DefiLlama source search failed.", debug: { ...emptyDebug, notices: [error instanceof Error ? error.message : "DefiLlama source search failed."] } };
  }
}
