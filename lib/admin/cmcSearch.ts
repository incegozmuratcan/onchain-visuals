import "server-only";
import { resolveApiSecret } from "@/lib/admin/apiSecrets";
import { normalizeProviderText, scoreProviderCandidate, slugText, type ConfidenceLabel } from "@/lib/admin/providerScoring";
import { buildProviderAliasSet } from "@/lib/admin/providerAliases";
import { findVerifiedMappings } from "@/lib/admin/verifiedProviderSourceMappings";

export type CoinMarketCapCandidate = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  logo: string | null;
  confidence: ConfidenceLabel;
  score: number;
  recommended: boolean;
  sourceType?: string;
  sourceUrl?: string;
  imageUrl?: string;
  reviewOnly?: boolean;
};

const CMC_ALIAS_GROUPS = [
  ["bitcoin", "btc"],
  ["ethereum", "eth"],
  ["katana", "kat"],
  ["arbitrum", "arb", "arbitrum-one"],
  ["avalanche", "avax", "avalanche-c-chain"],
  ["polygon", "pol", "matic", "matic-network"],
  ["optimism", "op", "op-mainnet"],
  ["bnb-chain", "bnb", "bsc", "binance-smart-chain"],
  ["solana", "sol"],
  ["base", "base-chain"],
  ["zksync", "zk-sync", "zksync-era", "zk-sync-era"],
  ["render", "rndr", "render-network"],
  ["megaeth", "mega", "mega-eth"],
  ["plasma", "xpl"],
  ["sui"],
  ["aptos", "apt"],
  ["near"],
  ["filecoin", "fil"],
  ["geodnet", "geod", "geod-network"],
];

const aliasLookup = new Map<string, Set<string>>();
for (const group of CMC_ALIAS_GROUPS) {
  const normalized = group.flatMap((value) => [normalizeProviderText(value), slugText(value)]).filter(Boolean);
  for (const value of normalized) {
    const set = aliasLookup.get(value) ?? new Set<string>();
    normalized.forEach((alias) => set.add(alias));
    aliasLookup.set(value, set);
  }
}


const SUFFIX_ALIASES = ["network", "net", "protocol", "chain", "token", "finance", "labs"];
const SHORT_SYMBOL_ALIASES: Record<string, string[]> = {
  geodnet: ["geod"],
  katana: ["kat"],
  ethereum: ["eth"],
  bitcoin: ["btc"],
  arbitrum: ["arb"],
  avalanche: ["avax"],
  polygon: ["pol", "matic"],
  optimism: ["op"],
  "bnb-chain": ["bnb"],
  solana: ["sol"],
  render: ["rndr"],
};

function derivedTickerAliases(value: unknown) {
  const normalized = normalizeProviderText(value);
  const slug = slugText(value);
  const compact = normalized.replace(/[^a-z0-9]+/g, "");
  const aliases = new Set<string>();
  for (const key of [normalized, slug, compact]) {
    (SHORT_SYMBOL_ALIASES[key] ?? []).forEach((alias) => aliases.add(alias));
  }
  for (const suffix of SUFFIX_ALIASES) {
    const suffixCompact = suffix.replace(/[^a-z0-9]/g, "");
    if (compact.endsWith(suffixCompact) && compact.length > suffixCompact.length + 1) {
      const shortened = compact.slice(0, -suffixCompact.length);
      if (/^[a-z0-9]{2,6}$/.test(shortened)) aliases.add(shortened);
    }
    if (normalized.endsWith(` ${suffix}`)) {
      const shortened = normalized.slice(0, -suffix.length).trim().replace(/[^a-z0-9]/g, "");
      if (/^[a-z0-9]{2,6}$/.test(shortened)) aliases.add(shortened);
    }
  }
  return [...aliases];
}

function clean(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function expandCmcAliases(...values: unknown[]) {
  const tokens = new Set<string>();
  for (const value of values) {
    const normalized = normalizeProviderText(value);
    const slug = slugText(value);
    for (const token of [normalized, slug, ...derivedTickerAliases(value)]) {
      if (!token) continue;
      tokens.add(token);
      aliasLookup.get(token)?.forEach((alias) => tokens.add(alias));
    }
  }
  return [...tokens];
}

function symbolTokens(tokens: string[]) {
  return tokens.filter((token) => /^[a-z0-9]{2,6}$/.test(token) && !token.includes("-"));
}

async function cmcHeaders() {
  const resolved = await resolveApiSecret("coinmarketcap");
  if (!resolved.value) throw new Error("CoinMarketCap API key is missing. Add it from API Settings first.");
  return { accept: "application/json", "X-CMC_PRO_API_KEY": resolved.value };
}

type SearchContext = { targetName?: string | null; targetSlug?: string | null; aliases?: string[]; numericId?: string | null };

export async function searchCoinMarketCapIds(query: string, context: SearchContext = {}): Promise<{ candidates: CoinMarketCapCandidate[]; error: string | null; apiKeyMissing?: boolean }> {
  if (context.numericId && /^\d+$/.test(String(context.numericId))) {
    return { candidates: [], error: null };
  }
  const q = query.trim();
  if (!q) return { candidates: [], error: null };
  try {
    const verified = findVerifiedMappings("coinmarketcap", q, context.targetSlug, context.targetName).map((m) => ({
      id: "",
      name: m.targetNames[0] || m.key,
      symbol: "",
      slug: m.targetSlugs[0] || m.key,
      logo: m.imageUrl,
      confidence: "high" as ConfidenceLabel,
      score: 100,
      recommended: true,
      sourceType: m.sourceType,
      sourceUrl: m.sourceUrl,
      imageUrl: m.imageUrl,
      reviewOnly: true,
    }));
    const headers = await cmcHeaders();
    const shared = buildProviderAliasSet({ name: context.targetName, slug: context.targetSlug, knownAliases: context.aliases });
    const aliasTokens = unique([...expandCmcAliases(q, context.targetName, context.targetSlug, ...(context.aliases ?? []), ...shared.aliases), ...(context.aliases ?? []), ...shared.aliases]);
    const slugTokens = unique([slugText(q), ...aliasTokens.map(slugText)]).slice(0, 10);
    const symbols = unique([q.replace(/[^a-z0-9]/gi, "").toUpperCase(), ...symbolTokens(aliasTokens).map((token) => token.toUpperCase())]).slice(0, 10);
    const urls = unique([
      ...symbols.filter(Boolean).map((symbol) => `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=${encodeURIComponent(symbol)}&listing_status=active,untracked`),
      ...slugTokens.filter(Boolean).map((slug) => `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?slug=${encodeURIComponent(slug)}&listing_status=active,untracked`),
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&limit=500`,
    ]);
    const rows: any[] = [];
    const attemptFailures: string[] = [];
    let hadAnySuccess = false;
    for (const url of urls) {
      const response = await fetch(url, { headers, next: { revalidate: 0 } });
      if (!response.ok) {
        attemptFailures.push(`${url.includes("symbol=") ? "symbol" : url.includes("slug=") ? "slug" : "list"}:${response.status}`);
        continue;
      }
      hadAnySuccess = true;
      const json = await response.json();
      rows.push(...(Array.isArray(json.data) ? json.data : []));
    }
    if (!hadAnySuccess) {
      throw new Error(`CoinMarketCap search failed (${attemptFailures.join(", ") || "no successful queries"}).`);
    }
    const uniqueRaw = Array.from(new Map(rows.map((row) => [String(row.id), row])).values());
    const scored = uniqueRaw
      .map((row) => {
        const scored = scoreProviderCandidate({
          query: q,
          targetName: context.targetName,
          targetSlug: context.targetSlug,
          aliases: aliasTokens,
          expectedSymbols: symbolTokens(aliasTokens),
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
    const noReliable = scored.length === 0;
    return {
      candidates: [...verified, ...scored.map(({ row, score, confidence }, index) => ({
        id: String(row.id),
        name: clean(row.name),
        symbol: clean(row.symbol),
        slug: clean(row.slug),
        logo: logos.get(String(row.id)) || null,
        confidence,
        score,
        recommended: index === 0 && confidence === "high" && score >= 78,
      }))],
      error: noReliable ? `No reliable CMC match. tried: ${symbols.slice(0, 3).join(", ") || "-"}, ${slugTokens.slice(0, 3).join(", ") || "-"}` : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "CoinMarketCap ID search failed.";
    return { candidates: [], error: message, apiKeyMissing: message.toLowerCase().includes("api key") };
  }
}
