import { normalizeProviderText, slugText } from "@/lib/admin/providerScoring";

type AliasInput = {
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  coinGeckoId?: string | null;
  coinGeckoSymbol?: string | null;
  coinGeckoName?: string | null;
  cmcSymbol?: string | null;
  cmcName?: string | null;
  defillamaSlug?: string | null;
  knownAliases?: string[];
};

const GENERIC_SUFFIXES = ["network","chain","protocol","mainnet","token","dao","finance","labs","foundation","blockchain"];
const GROUPS: string[][] = [
  ["ethereum","eth"],["bitcoin","btc"],["bnb chain","bnb","bsc","bnb-chain","binancecoin","binance smart chain","binance-smart-chain"],
  ["optimism","op mainnet","op"],["polygon","matic","pol"],["arbitrum","arb"],["avalanche","avax"],["solana","sol"],
  ["cosmos","atom"],["stellar","xlm"],["hedera","hbar","hedera-hashgraph"],["filecoin","fil"],["near","near-protocol"],
  ["render network","render","render-network","render-network-token","rndr"],["pocket network","pocket-network","pokt"],["xrp ledger","xrp","xrpl","ripple","ripple-network","xrp-ledger","xrp ledger","xrpl-mainnet"],
  ["monad","mon","MON"],
  ["rootstock","rsk","rbtc"],["ton","toncoin","the-open-network"],["livepeer","lpt"],["hivemapper","honey"],
  ["nosana","nos"],["doublezero","double-zero","2z"],["ton","toncoin","the-open-network","the open network"],["op mainnet","optimism","op-mainnet","op"],["akash network","akash","akash-network","akash.io","akt"],["bsv blockchain","bitcoin-sv","bsv"],["quai","quai-network"],
  ["io.net","ionet","io-net","io net","io"],
  ["provenance","provenance blockchain","provenanced","hash"],
  ["dimo","dimo-network"],
  ["render","render-network","render network","rndr","render-token","render-network-token"],
  ["cosmos","atom","cosmos-hub"],
  ["megaeth","mega-eth","mega eth"],
  ["glow","glow-protocol"],
  ["eni","eni-chain","eni network"],
  ["noble","noble-chain","noble network"],
  ["pocket network","pocket-network","pocket","pokt"],
  ["bitcoin sv","bitcoin-sv-chain","bitcoin-sv","bsv","bsv-blockchain"],
];

const lookup = new Map<string, Set<string>>();
for (const g of GROUPS) {
  const n = g.flatMap((v)=>[normalizeProviderText(v), slugText(v)]).filter(Boolean);
  for (const v of n) lookup.set(v, new Set(n));
}

const uniq = (v: string[]) => [...new Set(v.filter(Boolean))];

export function buildProviderAliasSet(input: AliasInput) {
  const seed = uniq([
    input.name || "", input.slug || "", input.coinGeckoId || "", input.coinGeckoSymbol || "", input.coinGeckoName || "",
    input.cmcSymbol || "", input.cmcName || "", input.defillamaSlug || "", ...(input.knownAliases ?? []),
  ]);
  const aliases = new Set<string>();
  for (const s of seed) {
    const n = normalizeProviderText(s);
    const sl = slugText(s);
    [n, sl].filter(Boolean).forEach((t)=>aliases.add(t));
    lookup.get(n)?.forEach((a)=>aliases.add(a));
    lookup.get(sl)?.forEach((a)=>aliases.add(a));
    for (const suffix of GENERIC_SUFFIXES) {
      if (n.endsWith(` ${suffix}`)) aliases.add(n.slice(0, -(suffix.length + 1)).trim());
      if (sl.endsWith(`-${suffix}`)) aliases.add(sl.slice(0, -(suffix.length + 1)).trim());
    }
  }
  const all = uniq([...aliases]);
  const symbols = all.filter((a)=>/^[a-z0-9]{2,8}$/.test(a) && !a.includes("-"));
  return {
    aliases: all,
    normalizedAliases: all,
    searchQueries: uniq([...(input.name ? [input.name] : []), ...(input.slug ? [input.slug] : []), ...all]),
    providerVariants: {
      defillama: uniq(all.map((a)=>a.replace(/\s+/g,"-")).concat(all)),
      cmcSymbols: uniq(symbols.map((s)=>s.toUpperCase())),
      cmcSlugs: uniq(all.map((a)=>slugText(a))),
    },
  };
}
