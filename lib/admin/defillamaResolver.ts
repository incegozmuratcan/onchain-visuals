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

type IndexRow = { name: string; slug: string; category: DefiLlamaCandidate["category"]; sourceUrl: string; aliases?: string[] };

let cachedIndex: { at: number; rows: IndexRow[] } | null = null;

async function jsonRows(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`DefiLlama index fetch failed (${response.status}).`);
  return response.json();
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
      rows.push({
        name,
        slug,
        category: "protocol",
        sourceUrl: `https://defillama.com/protocol/${slug}`,
        aliases: [String(protocol.symbol || ""), String(protocol.parentProtocol || "")].filter(Boolean),
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
      rows.push({ name, slug, category: "chain", sourceUrl: `https://defillama.com/chain/${encodeURIComponent(name)}` });
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
      rows.push({ name, slug, category: "stablecoin", sourceUrl: `https://defillama.com/stablecoin/${slug}`, aliases: [symbol].filter(Boolean) });
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
    const response = await fetch(url, { method: "HEAD", headers: { accept: "image/png,image/jpeg,image/webp" }, cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}

function expectedDefiLlamaCategory(category?: string | null): DefiLlamaCandidate["category"] | null {
  const normalized = normalizeProviderText(category);
  if (["chain", "chains", "network", "networks"].includes(normalized)) return "chain";
  if (["project", "projects", "protocol", "protocols", "depin"].includes(normalized)) return "protocol";
  if (["asset", "assets", "stablecoin", "stablecoins"].includes(normalized)) return "stablecoin";
  return null;
}

function isStrictDefiLlamaMatch(row: IndexRow, context: ResolverContext, query: string) {
  const targetValues = [query, context.targetName, context.targetSlug, ...(context.aliases ?? [])].filter(Boolean) as string[];
  const targetTokens = new Set(targetValues.flatMap((value) => [normalizeProviderText(value), slugText(value)]).filter(Boolean));
  const candidateName = normalizeProviderText(row.name);
  const candidateSlug = slugText(row.slug || row.name);
  const rowAliases = (row.aliases ?? []).flatMap((value) => [normalizeProviderText(value), slugText(value)]).filter(Boolean);
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
    const scored = rows
      .map((row) => {
        const strict = isStrictDefiLlamaMatch(row, context, q);
        const score = scoreProviderCandidate({
          query: q,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: context.aliases,
          candidateName: row.name,
          candidateSlug: row.slug,
          categoryMatch: Boolean(expectedCategory && row.category === expectedCategory),
        });
        const confidence: ConfidenceLabel = strict.ok && score.score >= 78 ? "high" : score.score >= 45 ? "medium" : "low";
        return { row, ...score, confidence, strict };
      })
      .filter((row) => row.strict.ok || row.score >= 45)
      .sort((a, b) => Number(b.strict.ok) - Number(a.strict.ok) || b.score - a.score)
      .slice(0, 8);
    const candidates: DefiLlamaCandidate[] = [];
    for (const { row, score, confidence, strict } of scored) {
      const imageUrl = `https://icons.llama.fi/${encodeURIComponent(row.slug)}.jpg`;
      if (!(await hasImage(imageUrl))) continue;
      candidates.push({ id: row.slug, name: row.name, slug: row.slug, category: row.category, sourceUrl: row.sourceUrl, imageUrl, confidence, score, recommended: false, reasons: strict.reasons });
    }
    const recommended = candidates.find((candidate) => candidate.confidence === "high" && !candidate.reasons?.some((reason) => ["category_mismatch", "derivative_asset", "low_name_similarity"].includes(reason)));
    if (recommended) recommended.recommended = true;
    return { candidates, error: recommended || candidates.length ? null : "No reliable DefiLlama source found." };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "DefiLlama source search failed." };
  }
}
