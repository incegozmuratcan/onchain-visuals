import "server-only";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";

export type CoinMarketCapCandidate = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  logo: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function cmcHeaders() {
  const resolved = await resolveApiSecret("coinmarketcap");
  if (!resolved.value) throw new Error("CoinMarketCap API key is missing. Add it from API Settings first.");
  return { accept: "application/json", "X-CMC_PRO_API_KEY": resolved.value };
}

export async function searchCoinMarketCapIds(query: string): Promise<{ candidates: CoinMarketCapCandidate[]; error: string | null; apiKeyMissing?: boolean }> {
  const q = query.trim();
  if (!q) return { candidates: [], error: null };
  try {
    const headers = await cmcHeaders();
    const symbol = q.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const urls = [
      symbol ? `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=${encodeURIComponent(symbol)}&listing_status=active` : "",
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&limit=200`,
    ].filter(Boolean);
    const rows: any[] = [];
    for (const url of urls) {
      const response = await fetch(url, { headers, next: { revalidate: 0 } });
      if (!response.ok) throw new Error(`CoinMarketCap ID search failed (${response.status}).`);
      const json = await response.json();
      rows.push(...(Array.isArray(json.data) ? json.data : []));
    }
    const lower = q.toLowerCase();
    const filtered = rows.filter((row) => {
      const name = clean(row.name).toLowerCase();
      const sym = clean(row.symbol).toLowerCase();
      const slug = clean(row.slug).toLowerCase();
      return sym === lower || name === lower || slug === lower || name.includes(lower) || slug.includes(lower);
    });
    const unique = Array.from(new Map(filtered.map((row) => [String(row.id), row])).values()).slice(0, 8);
    let logos = new Map<string, string>();
    if (unique.length) {
      const ids = unique.map((row) => row.id).join(",");
      const info = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${encodeURIComponent(ids)}`, { headers, next: { revalidate: 0 } });
      if (info.ok) {
        const json = await info.json();
        logos = new Map(Object.entries(json.data ?? {}).map(([id, value]: [string, any]) => [id, clean(value?.logo)]));
      }
    }
    return {
      candidates: unique.map((row) => ({ id: String(row.id), name: clean(row.name), symbol: clean(row.symbol), slug: clean(row.slug), logo: logos.get(String(row.id)) || null })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CoinMarketCap ID search failed.";
    return { candidates: [], error: message, apiKeyMissing: message.toLowerCase().includes("api key") };
  }
}
