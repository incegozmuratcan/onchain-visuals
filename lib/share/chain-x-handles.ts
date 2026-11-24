/**
 * Approved X handles for chain mentions. Bitcoin is never tagged.
 * A chain missing from this map is written as its plain name.
 * A post uses at most 3 tags. Format is "Name (@handle)".
 * tether and circle are issuers approved for mint and burn captions.
 */

const HANDLES: Record<string, string> = {
  ethereum: "ethereum",
  tether: "tether",
  circle: "circle",
  tron: "trondao",
  "bnb chain": "BNBCHAIN",
  bsc: "BNBCHAIN",
  solana: "solana",
  hyperliquid: "HyperliquidX",
  "hyperliquid l1": "HyperliquidX",
  base: "base",
  arbitrum: "arbitrum",
  polygon: "0xPolygon",
  arc: "arc",
  "x layer": "XLayerOfficial",
  xlayer: "XLayerOfficial",
  plasma: "Plasma",
  avalanche: "avax",
  optimism: "Optimism",
  sui: "SuiNetwork",
  aptos: "Aptos",
  ton: "ton_blockchain",
  sonic: "SonicLabs",
  mantle: "Mantle_Official",
  linea: "LineaBuild",
  zksync: "zksync",
  "zksync era": "zksync",
  scroll: "Scroll_ZKP",
  starknet: "Starknet",
  berachain: "berachain",
  sei: "SeiNetwork",
  unichain: "unichain",
  ink: "inkonchain",
  celo: "Celo",
  near: "NEARProtocol",
  cardano: "Cardano",
};

const NEVER_TAG = new Set(["bitcoin", "btc"]);

export const CHAIN_X_HANDLE_LIMIT = 3;

function handleKey(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chainXHandle(name: string) {
  const key = handleKey(name);
  if (!key || NEVER_TAG.has(key)) return null;
  return HANDLES[key] || null;
}

/** Returns "Name (@handle)" until the post has used 3 tags, then the plain name. */
export function createChainMention(maxTags = CHAIN_X_HANDLE_LIMIT) {
  let used = 0;
  return (name: string) => {
    const handle = chainXHandle(name);
    if (!handle || used >= maxTags) return name;
    used += 1;
    return `${name} (@${handle})`;
  };
}
