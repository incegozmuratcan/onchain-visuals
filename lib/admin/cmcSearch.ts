import "server-only";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";
import { scoreProviderCandidate, type ConfidenceLabel } from "@/lib/admin/providerScoring";

export type CoinMarketCapCandidate = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  logo: string | null;
  confidence: ConfidenceLabel;
  score: number;
  recommended: boolean;
};

function clean(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

async function cmcHeaders() {
  const resolved = await resolveApiSecret("coinmarketcap");
  if (!resolved.value) throw new Error("CoinMarketCap API key is missing. Add it from API Settings first.");
  return { accept: "application/json", "X-CMC_PRO_API_KEY": resolved.value };
}

type SearchContext = { targetName?: string | null; targetSlug?: string | null; aliases?: string[] };

export async function searchCoinMarketCapIds(query: string, context: SearchContext = {}): Promise<{ candidates: CoinMarketCapCandidate[]; error: string | null; apiKeyMissing?: boolean }> {
  const q = query.trim();
  if (!q) return { candidates: [], error: null };
  try {
    const headers = await cmcHeaders();
    const symbol = q.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const urls = [
      symbol ? `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=${encodeURIComponent(symbol)}&listing_status=active,untracked` : "",
      slug ? `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?slug=${encodeURIComponent(slug)}&listing_status=active,untracked` : "",
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&limit=500`,
    ].filter(Boolean);
    const rows: any[] = [];
    for (const url of urls) {
      const response = await fetch(url, { headers, next: { revalidate: 0 } });
      if (!response.ok) throw new Error(`CoinMarketCap ID search failed (${response.status}).`);
      const json = await response.json();
      rows.push(...(Array.isArray(json.data) ? json.data : []));
    }
    const uniqueRaw = Array.from(new Map(rows.map((row) => [String(row.id), row])).values());
    const scored = uniqueRaw
      .map((row) => {
        const scored = scoreProviderCandidate({
          query: q,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: context.aliases,
          candidateName: clean(row.name),
          candidateSlug: clean(row.slug),
          candidateSymbol: clean(row.symbol),
        });
        return { row, ...scored };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.row.rank ?? 999999) - Number(b.row.rank ?? 999999))
      .slice(0, 10);
    let logos = new Map<string, string>();
    if (scored.length) {
      const ids = scored.map(({ row }) => row.id).join(",");
      const info = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${encodeURIComponent(ids)}`, { headers, next: { revalidate: 0 } });
      if (info.ok) {
        const json = await info.json();
        logos = new Map(Object.entries(json.data ?? {}).map(([id, value]: [string, any]) => [id, clean(value?.logo)]));
      }
    }
    return {
      candidates: scored.map(({ row, score, confidence }, index) => ({
        id: String(row.id),
        name: clean(row.name),
        symbol: clean(row.symbol),
        slug: clean(row.slug),
        logo: logos.get(String(row.id)) || null,
        confidence,
        score,
        recommended: index === 0 && confidence === "high",
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CoinMarketCap ID search failed.";
    return { candidates: [], error: message, apiKeyMissing: message.toLowerCase().includes("api key") };
  }
}
