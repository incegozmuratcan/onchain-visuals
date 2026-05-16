import "server-only";
import { scoreProviderCandidate, slugText, type ConfidenceLabel } from "@/lib/admin/providerScoring";

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

export async function searchDefiLlamaSources(query: string, context: ResolverContext = {}): Promise<{ candidates: DefiLlamaCandidate[]; error: string | null }> {
  const q = query.trim();
  if (!q) return { candidates: [], error: null };
  try {
    const rows = await defillamaIndex();
    const scored = rows
      .map((row) => {
        const score = scoreProviderCandidate({
          query: q,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: [...(context.aliases ?? []), ...(row.aliases ?? [])],
          candidateName: row.name,
          candidateSlug: row.slug,
          categoryMatch: Boolean(context.category && row.category === context.category),
        });
        return { row, ...score };
      })
      .filter((row) => row.score >= 35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    const candidates: DefiLlamaCandidate[] = [];
    for (const { row, score, confidence } of scored) {
      const imageUrl = `https://icons.llama.fi/${encodeURIComponent(row.slug)}.jpg`;
      if (!(await hasImage(imageUrl))) continue;
      candidates.push({ id: row.slug, name: row.name, slug: row.slug, category: row.category, sourceUrl: row.sourceUrl, imageUrl, confidence, score, recommended: false });
    }
    if (candidates[0]?.confidence === "high") candidates[0].recommended = true;
    return { candidates, error: null };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "DefiLlama source search failed." };
  }
}
