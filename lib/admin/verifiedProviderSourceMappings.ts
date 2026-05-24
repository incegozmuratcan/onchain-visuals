import "server-only";

export type VerifiedProviderMapping = {
  key: string;
  provider: "defillama" | "coingecko" | "coinmarketcap";
  targetSlugs: string[];
  targetNames: string[];
  aliases: string[];
  sourceType: string;
  sourceUrl: string;
  imageUrl: string;
  expectedReviewStatus: "needs_review";
};

export const verifiedProviderSourceMappings: Record<"defillama"|"coingecko"|"coinmarketcap", VerifiedProviderMapping[]> = {
  defillama: [
    { key:"rovr", provider:"defillama", targetSlugs:["rovr","rovr-network"], targetNames:["ROVR"], aliases:["rovr","rovr-network"], sourceType:"token-icon", sourceUrl:"https://defillama.com/token/ROVR", imageUrl:"https://token-icons.llamao.fi/icons/tokens/gecko/rovr-network?w=48&h=48", expectedReviewStatus:"needs_review" },
    { key:"natix", provider:"defillama", targetSlugs:["natix","natix-network"], targetNames:["NATIX"], aliases:["natix","natix-network"], sourceType:"token-icon", sourceUrl:"https://defillama.com/token/NATIX", imageUrl:"https://token-icons.llamao.fi/icons/tokens/gecko/natix-network?w=48&h=48", expectedReviewStatus:"needs_review" },
    { key:"xnet", provider:"defillama", targetSlugs:["xnet","xnet-mobile"], targetNames:["XNET Mobile"], aliases:["xnet","xnet-mobile","xnet mobile"], sourceType:"token-icon", sourceUrl:"https://defillama.com/token/XNET", imageUrl:"https://token-icons.llamao.fi/icons/tokens/gecko/xnet-mobile-2?w=48&h=48", expectedReviewStatus:"needs_review" },
    { key:"arkreen", provider:"defillama", targetSlugs:["arkreen","arkreen-token"], targetNames:["Arkreen"], aliases:["arkreen","arkreen-token"], sourceType:"token-icon", sourceUrl:"https://defillama.com/token/ARKREEN", imageUrl:"https://token-icons.llamao.fi/icons/tokens/gecko/arkreen-token?w=48&h=48", expectedReviewStatus:"needs_review" },
    { key:"bsv", provider:"defillama", targetSlugs:["bsv","bsv-blockchain","bitcoin-sv","bitcoin-cash-sv"], targetNames:["BSV Blockchain","BSV"], aliases:["bsv","bsv-blockchain","bitcoin-sv","bitcoin sv","bitcoin-cash-sv","bitcoin cash sv"], sourceType:"token-icon", sourceUrl:"https://defillama.com/token/BSV", imageUrl:"https://token-icons.llamao.fi/icons/tokens/gecko/bitcoin-cash-sv?w=48&h=48", expectedReviewStatus:"needs_review" },
    { key:"provenance", provider:"defillama", targetSlugs:["provenance","provenance-blockchain"], targetNames:["Provenance"], aliases:["provenance","provenance-blockchain","provenance blockchain","provenanced","hash"], sourceType:"chain-icon", sourceUrl:"https://defillama.com/chain/provenance", imageUrl:"https://icons.llamao.fi/icons/chains/rsz_provenance?w=48&h=48", expectedReviewStatus:"needs_review" },
  ],
  coingecko: [
    { key:"eni", provider:"coingecko", targetSlugs:["eni","eni-chain"], targetNames:["ENI"], aliases:["eni","eni-chain","eni network"], sourceType:"asset-platform", sourceUrl:"https://www.coingecko.com/en/chains/eni", imageUrl:"https://assets.coingecko.com/asset_platforms/images/32278/small/eni.png?1768464731", expectedReviewStatus:"needs_review" },
    { key:"ink", provider:"coingecko", targetSlugs:["ink","ink-chain"], targetNames:["Ink"], aliases:["ink","ink-chain"], sourceType:"asset-platform", sourceUrl:"https://www.coingecko.com/en/chains/ink", imageUrl:"https://assets.coingecko.com/asset_platforms/images/22194/small/ink.jpg?1737600222", expectedReviewStatus:"needs_review" },
    { key:"abstract", provider:"coingecko", targetSlugs:["abstract"], targetNames:["Abstract"], aliases:["abstract"], sourceType:"asset-platform", sourceUrl:"https://www.coingecko.com/en/chains/abstract", imageUrl:"https://assets.coingecko.com/asset_platforms/images/22196/small/abstract.jpg?1735611808", expectedReviewStatus:"needs_review" },
    { key:"morph", provider:"coingecko", targetSlugs:["morph","morph-l2"], targetNames:["Morph"], aliases:["morph","morph-l2"], sourceType:"asset-platform", sourceUrl:"https://www.coingecko.com/en/chains/morph-l2", imageUrl:"https://assets.coingecko.com/asset_platforms/images/22185/small/morph.jpg?1729659940", expectedReviewStatus:"needs_review" },
  ],
  coinmarketcap: [
    { key:"rootstock", provider:"coinmarketcap", targetSlugs:["rootstock","rsk","rbtc"], targetNames:["Rootstock","RSK"], aliases:["rootstock","rsk","rbtc"], sourceType:"static-gravity-image", sourceUrl:"https://s3.coinmarketcap.com/static-gravity/image/23fc47a412724b3c94917411735a9716.jpg", imageUrl:"https://s3.coinmarketcap.com/static-gravity/image/23fc47a412724b3c94917411735a9716.jpg", expectedReviewStatus:"needs_review" },
  ],
};

const norm = (v: string) => v.toLowerCase().trim();
export function findVerifiedMappings(provider: keyof typeof verifiedProviderSourceMappings, query: string, targetSlug?: string | null, targetName?: string | null) {
  const q = norm(query);
  const slug = norm(targetSlug || "");
  const name = norm(targetName || "");
  return verifiedProviderSourceMappings[provider].filter((m)=> {
    const pool = [...m.aliases,...m.targetSlugs,...m.targetNames].map(norm);
    return pool.some((p)=>p===q || p.includes(q) || q.includes(p)) || m.targetSlugs.map(norm).includes(slug) || m.targetNames.map(norm).includes(name);
  });
}
