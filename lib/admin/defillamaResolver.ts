import "server-only";
import {
  derivativeMatchTerms,
  normalizeProviderText,
  scoreProviderCandidate,
  slugText,
  type ConfidenceLabel,
} from "@/lib/admin/providerScoring";

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
};

const KNOWN_ALIAS_GROUPS = [
  ["btc", "bitcoin"],
  ["eth", "ethereum"],
  ["bsc", "bnb-chain", "bnb chain", "binance smart chain", "bnb", "binance"],
  ["op mainnet", "op-mainnet", "optimism", "optimism mainnet", "op"],
  ["avax", "avalanche", "avalanche c-chain", "avalanche c chain"],
  ["matic", "polygon", "polygon pos", "polygon-pos", "pol"],
  ["arbitrum one", "arbitrum-one", "arbitrum", "arb"],
  ["sol", "solana"],
  ["base chain", "base"],
  ["katana", "kat"],
  ["megaeth", "mega-eth", "mega"],
  ["render", "render-network", "rndr"],
  ["plasma", "xpl"],
  ["sui", "sui-network"],
  ["apt", "aptos", "aptos-network"],
  ["near"],
  ["fil", "filecoin", "filecoin-chain"],
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

function protocolIconUrl(value: string) {
  return `https://icons.llama.fi/${encodeURIComponent(value)}.jpg`;
}

async function defillamaIndex() {
  if (cachedIndex && Date.now() - cachedIndex.at < 1000 * 60 * 60) return cachedIndex.rows;
  const rows: IndexRow[] = [];
  const errors: string[] = [];
  try {
    const protocols = await jsonRows("https://api.llama.fi/protocols");
    for (const protocol of Array.isArray(protocols) ? protocols : []) {
      const slug = String(protocol.slug || "").trim();
      const name = String(protocol.name || "").trim();
      if (!slug || !name) continue;
      const aliases = unique([String(protocol.symbol || ""), String(protocol.parentProtocol || ""), ...expandKnownAliases(name, slug, protocol.symbol)]);
      rows.push({
        name,
        slug,
        category: "protocol",
        sourceUrl: `https://defillama.com/protocol/${slug}`,
        aliases,
        imageUrls: [String(protocol.logo || ""), String(protocol.logoUrl || "")].filter(Boolean),
        imageSlugs: [slug],
      });
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
          chainIconUrl(name),
          ...expandKnownAliases(name, slug).map(chainIconUrl),
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
      rows.push({
        name,
        slug,
        category: "stablecoin",
        sourceUrl: `https://defillama.com/stablecoin/${slug}`,
        aliases: unique([symbol, ...expandKnownAliases(name, slug, symbol)]),
        imageUrls: [String(stable.logo || ""), String(stable.logoUrl || "")].filter(Boolean),
        imageSlugs: [slug, symbol],
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "stablecoin index failed");
  }
  if (!rows.length) throw new Error(errors[0] || "No DefiLlama index rows available.");
  cachedIndex = { at: Date.now(), rows };
  return rows;
}

async function hasImage(url: string) {
  try {
    const head = await fetch(url, { method: "HEAD", headers: { accept: "image/png,image/jpeg,image/webp,*/*" }, cache: "no-store" });
    const contentType = head.headers.get("content-type") || "";
    if (head.ok && (contentType.startsWith("image/") || !contentType)) return true;
    if (![403, 405].includes(head.status)) return false;
  } catch {
    // Some DefiLlama image edges reject HEAD; verify with a tiny GET below.
  }
  try {
    const response = await fetch(url, { headers: { accept: "image/png,image/jpeg,image/webp,*/*", range: "bytes=0-0" }, cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && (contentType.startsWith("image/") || !contentType);
  } catch {
    return false;
  }
}

async function resolveImageUrl(row: IndexRow) {
  const urls = unique([
    ...(row.imageUrls ?? []),
    ...(row.category === "chain"
      ? imageSlugCandidates(row).flatMap((slug) => [chainIconUrl(slug), protocolIconUrl(slug)])
      : imageSlugCandidates(row).map(protocolIconUrl)),
  ]).filter((url) => /^https:\/\//.test(url));
  for (const url of urls) {
    if (await hasImage(url)) return url;
  }
  return null;
}

function expectedDefiLlamaCategory(category?: string | null): DefiLlamaCandidate["category"] | null {
  const normalized = normalizeProviderText(category);
  if (["chain", "chains", "network", "networks"].includes(normalized)) return "chain";
  if (["protocol", "protocols", "depin"].includes(normalized)) return "protocol";
  if (["project", "projects"].includes(normalized)) return null;
  if (["asset", "assets", "stablecoin", "stablecoins"].includes(normalized)) return "stablecoin";
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
  const targetDerivativeTerms = derivativeMatchTerms(...targetValues);
  const candidateDerivativeTerms = derivativeMatchTerms(row.name, row.slug, ...(row.aliases ?? []));
  const derivativeMismatch = candidateDerivativeTerms.length > 0 && !candidateDerivativeTerms.some((term) => targetDerivativeTerms.includes(term));

  const reasons: string[] = [];
  if (exactName) reasons.push("exact normalized name");
  if (exactSlug) reasons.push("exact normalized slug");
  if (knownAlias) reasons.push("known alias");
  if (categoryMatch && expectedCategory) reasons.push("category match");
  if (!categoryMatch) reasons.push("category_mismatch");
  if (derivativeMismatch) reasons.push("derivative_asset");
  if (!exactName && !exactSlug && !knownAlias) reasons.push("low_name_similarity");

  return {
    ok: categoryMatch && !derivativeMismatch && (exactName || exactSlug || knownAlias),
    categoryMatch,
    reasons,
  };
}

export async function searchDefiLlamaSources(query: string, context: ResolverContext = {}): Promise<{ candidates: DefiLlamaCandidate[]; error: string | null }> {
  const q = query.trim();
  if (!q) return { candidates: [], error: null };
  try {
    const rows = await defillamaIndex();
    const expectedCategory = expectedDefiLlamaCategory(context.category);
    const aliasContext = unique([...(context.aliases ?? []), ...expandKnownAliases(q, context.targetName, context.targetSlug)]);
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
        return { row, score: strict.ok ? Math.max(score.score, strict.categoryMatch ? 90 : 82) : score.score, confidence, strict };
      })
      .filter((row) => row.strict.ok || row.score >= 45)
      .sort((a, b) => Number(b.strict.ok) - Number(a.strict.ok) || b.score - a.score)
      .slice(0, 8);
    const candidates: DefiLlamaCandidate[] = [];
    for (const { row, score, confidence, strict } of scored) {
      const imageUrl = await resolveImageUrl(row);
      if (!imageUrl) continue;
      candidates.push({ id: row.slug, name: row.name, slug: row.slug, category: row.category, sourceUrl: row.sourceUrl, imageUrl, confidence, score, recommended: false, reasons: strict.reasons });
    }
    const recommended = candidates.find((candidate) => candidate.confidence === "high" && !candidate.reasons?.some((reason) => ["category_mismatch", "derivative_asset", "low_name_similarity"].includes(reason)));
    if (recommended) recommended.recommended = true;
    return { candidates, error: recommended || candidates.length ? null : "No reliable DefiLlama source found." };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "DefiLlama source search failed." };
  }
}
