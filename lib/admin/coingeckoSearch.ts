import "server-only";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";

export type CoinGeckoSearchCandidate = {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  large: string;
};

export type CoinGeckoSearchResult = {
  candidates: CoinGeckoSearchCandidate[];
  error: string | null;
};

export async function searchCoinGeckoIds(query: string): Promise<CoinGeckoSearchResult> {
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
    return {
      candidates: coins.slice(0, 8).map((coin: Record<string, unknown>) => ({
        id: String(coin.id || ""),
        name: String(coin.name || ""),
        symbol: String(coin.symbol || ""),
        thumb: String(coin.thumb || ""),
        large: String(coin.large || ""),
      })).filter((coin: CoinGeckoSearchCandidate) => coin.id && coin.name),
      error: null,
    };
  } catch (error) {
    return { candidates: [], error: error instanceof Error ? error.message : "CoinGecko search failed." };
  }
}
