import "server-only";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";
import { scoreProviderCandidate, type ConfidenceLabel } from "@/lib/admin/providerScoring";
import { findVerifiedMappings } from "@/lib/admin/verifiedProviderSourceMappings";

export type CoinGeckoSearchCandidate = {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  large: string;
  confidence: ConfidenceLabel;
  score: number;
  recommended: boolean;
  sourceType?: string;
  sourceUrl?: string;
  imageUrl?: string;
  reviewOnly?: boolean;
};

export type CoinGeckoSearchResult = {
  candidates: CoinGeckoSearchCandidate[];
  error: string | null;
};

type SearchContext = { targetName?: string | null; targetSlug?: string | null; aliases?: string[] };

export async function searchCoinGeckoIds(query: string, context: SearchContext = {}): Promise<CoinGeckoSearchResult> {
  const clean = query.trim().slice(0, 80);
  if (!clean) return { candidates: [], error: null };
  try {
    const resolved = await resolveApiSecret("coingecko");
    const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(clean)}`, {
      headers: {
        accept: "application/json",
        ...(resolved.value ? { "x-cg-demo-api-key": resolved.value } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const help = response.status === 429 ? "Rate limited; retry later or add an admin CoinGecko key." : response.status === 401 || response.status === 403 ? "Check the server-side CoinGecko API key." : response.status === 404 ? "No CoinGecko search route found." : "CoinGecko search failed.";
      return { candidates: [], error: `${help} (${response.status})` };
    }
    const json = await response.json();
    const coins = Array.isArray(json.coins) ? json.coins : [];
    const scored: Array<{ coin: Record<string, unknown>; confidence: ConfidenceLabel; score: number; reasons: string[] }> = coins
      .map((coin: Record<string, unknown>) => {
        const scored = scoreProviderCandidate({
          query: clean,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: context.aliases,
          candidateName: String(coin.name || ""),
          candidateSlug: String(coin.id || ""),
          candidateSymbol: String(coin.symbol || ""),
        });
        return { coin, ...scored };
      })
      .filter((item: { coin: Record<string, unknown>; score: number }) => String(item.coin.id || "") && String(item.coin.name || "") && item.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 8);
    const verified = findVerifiedMappings("coingecko", clean, context.targetSlug, context.targetName).map((m) => ({
      id: m.targetSlugs[0] || m.key,
      name: m.targetNames[0] || m.key,
      symbol: "",
      thumb: m.imageUrl,
      large: m.imageUrl,
      confidence: "high" as ConfidenceLabel,
      score: 100,
      recommended: true,
      sourceType: m.sourceType,
      sourceUrl: m.sourceUrl,
      imageUrl: m.imageUrl,
      reviewOnly: true,
    }));
    return {
      candidates: [...verified, ...scored.map(({ coin, confidence, score }, index: number) => ({
        id: String(coin.id || ""),
        name: String(coin.name || ""),
        symbol: String(coin.symbol || ""),
        thumb: String(coin.thumb || ""),
        large: String(coin.large || ""),
        confidence,
        score,
        recommended: index === 0 && confidence === "high",
      }))],
      error: null,
    };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "CoinGecko search failed." };
  }
}
