import type { LogoCategory } from "./logoRegistry";

export type LogoSourceProvider =
  | "official"
  | "official-brand-kit"
  | "official-website"
  | "official-github"
  | "defillama"
  | "crypto-logos"
  | "simple-icons"
  | "trustwallet-assets"
  | "spothq-cryptocurrency-icons"
  | "other-data-provider"
  | "existing-local-reviewed";

export type LogoApprovalStatus = "approved" | "needs-review" | "missing" | "rejected";

export type LogoSourceManifestEntry = {
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  localPath: string;
  rawPath?: string;
  sourceProvider: LogoSourceProvider;
  sourceUrl?: string;
  sourceNote?: string;
  downloadedAt: string;
  originalContentType: string;
  sha256: string;
  width: number | null;
  height: number | null;
  approvalStatus: LogoApprovalStatus;
  rightsNote: string;
  notes: string;
  visualRejected?: boolean;
  visualRejectReason?: string;
  fallbackPreferredUntilManualAsset?: boolean;
};

export type LogoSourceUnresolvedEntry = {
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  attemptedCandidates: { provider: string; url: string; status: string; error: string; note?: string }[];
};

export const logoSourceManifest: LogoSourceManifestEntry[] = [];

export const unresolvedLogoSources: LogoSourceUnresolvedEntry[] = [
  {
    "canonicalName": "BENJI",
    "slug": "benji",
    "category": "asset",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/benji.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for benji."
      },
      {
        "provider": "official",
        "url": "https://www.franklintempleton.com/solutions/blockchain/benji",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for asset:benji."
      }
    ]
  },
  {
    "canonicalName": "BUIDL",
    "slug": "buidl",
    "category": "asset",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/buidl.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for buidl."
      },
      {
        "provider": "official",
        "url": "https://www.blackrock.com/cash/en-us/products/329365/blackrock-usd-institutional-digital-liquidity-fund",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for asset:buidl."
      }
    ]
  },
  {
    "canonicalName": "Abstract",
    "slug": "abstract",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_abstract.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for abstract."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/abstract.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for abstract."
      },
      {
        "provider": "official",
        "url": "https://www.abs.xyz/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:abstract."
      }
    ]
  },
  {
    "canonicalName": "Algorand",
    "slug": "algorand",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/algorand",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Algorand SVG fetched as source-backed local asset."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_algorand.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for algorand."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/algorand.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for algorand."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/algorand.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:algorand."
      }
    ]
  },
  {
    "canonicalName": "Aptos",
    "slug": "aptos",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_aptos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for aptos."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/aptos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for aptos."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/aptos.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:aptos."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/aptos",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Aptos SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Arbitrum",
    "slug": "arbitrum",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_arbitrum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for arbitrum."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/arbitrum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for arbitrum."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/arbitrum.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:arbitrum."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/arbitrum",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Arbitrum SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Avalanche",
    "slug": "avalanche",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_avalanche.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for avalanche."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/avalanche.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for avalanche."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/avalanche-avax-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:avalanche."
      }
    ]
  },
  {
    "canonicalName": "Base",
    "slug": "base",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_base.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for base."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/base.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for base."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/base.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:base."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/base",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Base SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Bitcoin",
    "slug": "bitcoin",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bitcoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bitcoin."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bitcoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bitcoin."
      },
      {
        "provider": "spothq-cryptocurrency-icons",
        "url": "https://github.com/spothq/cryptocurrency-icons/blob/master/svg/color/btc.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:bitcoin."
      }
    ]
  },
  {
    "canonicalName": "BNB Chain",
    "slug": "bsc",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsc.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bsc."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsc.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bsc."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_binance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for binance."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/binance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for binance."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bnb.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bnb."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bnb.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bnb."
      },
      {
        "provider": "official-brand-kit",
        "url": "https://www.bnbchain.org/en/brand",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:bsc."
      }
    ]
  },
  {
    "canonicalName": "BSV Blockchain",
    "slug": "bsv-blockchain",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "coingecko",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin-sv",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "CoinGecko markets API candidate for bitcoin-sv."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsv-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bsv-blockchain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bsv-blockchain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bsv."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bsv."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bitcoin-sv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for bitcoin-sv."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bitcoin-sv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for bitcoin-sv."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/bitcoin-sv-bsv-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:bsv-blockchain."
      }
    ]
  },
  {
    "canonicalName": "Canton",
    "slug": "canton-network",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_canton-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for canton-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/canton-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for canton-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_canton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for canton."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/canton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for canton."
      },
      {
        "provider": "official",
        "url": "https://www.canton.network/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:canton-network."
      }
    ]
  },
  {
    "canonicalName": "Cardano",
    "slug": "cardano",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_cardano.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for cardano."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cardano.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for cardano."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/cardano-ada-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:cardano."
      }
    ]
  },
  {
    "canonicalName": "Celo",
    "slug": "celo",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/celo",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Celo SVG fetched as source-backed local asset."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_celo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for celo."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/celo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for celo."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/celo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:celo."
      }
    ]
  },
  {
    "canonicalName": "Cosmos",
    "slug": "cosmos",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_cosmos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for cosmos."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cosmos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for cosmos."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/cosmos-atom-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:cosmos."
      }
    ]
  },
  {
    "canonicalName": "Cronos",
    "slug": "cronos",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_cronos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for cronos."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cronos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for cronos."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/cronos-cro-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:cronos."
      }
    ]
  },
  {
    "canonicalName": "ENI",
    "slug": "eni",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eni.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama ENI chain icon direct candidate."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/eni.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama ENI generic icon direct candidate."
      },
      {
        "provider": "coingecko",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=eni",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "CoinGecko markets API candidate for eni."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eni.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for eni."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/eni.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for eni."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eni-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for eni-blockchain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/eni-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for eni-blockchain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eni-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for eni-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/eni-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for eni-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eniac.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for eniac."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/eniac.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for eniac."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_eni.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "ENI appears as a real chain entity on CoinGecko; DefiLlama direct image candidates are tracked in unresolved source candidates."
      }
    ]
  },
  {
    "canonicalName": "Ethereum",
    "slug": "ethereum",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ethereum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for ethereum."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ethereum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for ethereum."
      },
      {
        "provider": "spothq-cryptocurrency-icons",
        "url": "https://github.com/spothq/cryptocurrency-icons/blob/master/svg/color/eth.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:ethereum."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/ethereum",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Ethereum SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Fantom",
    "slug": "fantom",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_fantom.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for fantom."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fantom.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for fantom."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/fantom-ftm-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:fantom."
      }
    ]
  },
  {
    "canonicalName": "Fogo",
    "slug": "fogo",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_fogo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for fogo."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fogo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for fogo."
      },
      {
        "provider": "official",
        "url": "https://www.fogo.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:fogo."
      }
    ]
  },
  {
    "canonicalName": "Hedera",
    "slug": "hedera",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/hedera",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Hedera SVG fetched as source-backed local asset."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_hedera.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for hedera."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hedera.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for hedera."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/hedera.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:hedera."
      }
    ]
  },
  {
    "canonicalName": "Hyperliquid L1",
    "slug": "hyperliquid",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "official-brand-kit",
        "url": "https://hyperliquid.gitbook.io/hyperliquid-docs/brand-kit",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Official Hyperliquid brand kit page provides PNG and SVG logo zip downloads; page is a source note, not a direct image."
      },
      {
        "provider": "coingecko",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=hyperliquid",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "CoinGecko markets API candidate for hyperliquid."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_hyperliquid.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for hyperliquid."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hyperliquid.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for hyperliquid."
      },
      {
        "provider": "official-brand-kit",
        "url": "https://hyperliquid.gitbook.io/hyperliquid-docs/brand-kit",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Official Hyperliquid brand kit page provides PNG and SVG logo zip downloads; page is a source note, not a direct image."
      }
    ]
  },
  {
    "canonicalName": "Injective",
    "slug": "injective",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_injective.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for injective."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/injective.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for injective."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/injective-inj-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:injective."
      }
    ]
  },
  {
    "canonicalName": "Ink",
    "slug": "ink",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ink.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for ink."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ink.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for ink."
      },
      {
        "provider": "official",
        "url": "https://inkonchain.com/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:ink."
      }
    ]
  },
  {
    "canonicalName": "ICP",
    "slug": "internet-computer",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_internet-computer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for internet-computer."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/internet-computer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for internet-computer."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_icp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for icp."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/icp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for icp."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/internet-computer-icp-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:internet-computer."
      }
    ]
  },
  {
    "canonicalName": "Kaia",
    "slug": "kaia",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_kaia.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for kaia."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/kaia.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for kaia."
      },
      {
        "provider": "official",
        "url": "https://www.kaia.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:kaia."
      }
    ]
  },
  {
    "canonicalName": "Linea",
    "slug": "linea",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_linea.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for linea."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/linea.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for linea."
      },
      {
        "provider": "official",
        "url": "https://linea.build/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:linea."
      }
    ]
  },
  {
    "canonicalName": "Mantle",
    "slug": "mantle",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_mantle.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for mantle."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/mantle.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for mantle."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/mantle.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:mantle."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/mantle",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Mantle SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "MegaETH",
    "slug": "megaeth",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "other-data-provider",
        "url": "https://logo.svgcdn.com/token-branded/mega-eth.png",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "MegaETH direct transparent PNG candidate from brandpnglogo/svgcdn. Needs visual review."
      },
      {
        "provider": "coingecko",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=megaeth",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "CoinGecko markets API candidate for megaeth."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_megaeth.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for megaeth."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/megaeth.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for megaeth."
      },
      {
        "provider": "other-data-provider",
        "url": "https://logo.svgcdn.com/token-branded/mega-eth.png",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "MegaETH direct transparent PNG candidate from brandpnglogo/svgcdn. Needs visual review."
      }
    ]
  },
  {
    "canonicalName": "Monad",
    "slug": "monad",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_monad.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for monad."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/monad.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for monad."
      },
      {
        "provider": "official",
        "url": "https://www.monad.xyz/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:monad."
      }
    ]
  },
  {
    "canonicalName": "Morph",
    "slug": "morph",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_morph.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for morph."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/morph.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for morph."
      },
      {
        "provider": "official",
        "url": "https://www.morphl2.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:morph."
      }
    ]
  },
  {
    "canonicalName": "Near",
    "slug": "near",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_near.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for near."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/near.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for near."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/near.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:near."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/near",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons NEAR SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "OP Mainnet",
    "slug": "optimism",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_optimism.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for optimism."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/optimism.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for optimism."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_op-mainnet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for op-mainnet."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/op-mainnet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for op-mainnet."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/optimism.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:optimism."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/optimism",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Optimism SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Plasma",
    "slug": "plasma",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_plasma.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for plasma."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/plasma.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for plasma."
      },
      {
        "provider": "official",
        "url": "https://www.plasma.to/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:plasma."
      }
    ]
  },
  {
    "canonicalName": "Plume",
    "slug": "plume",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_plume.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for plume."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/plume.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for plume."
      },
      {
        "provider": "official",
        "url": "https://plume.org/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:plume."
      }
    ]
  },
  {
    "canonicalName": "Polygon",
    "slug": "polygon",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_polygon.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for polygon."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/polygon.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for polygon."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/polygon.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:polygon."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/polygon",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Polygon SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Provenance",
    "slug": "provenance",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "official-brand-kit",
        "url": "https://provenance.io/presskit",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Official Provenance presskit page says logos are available in PNG and SVG format; page is a source note until a direct logo URL is confirmed."
      },
      {
        "provider": "coingecko",
        "url": "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=provenance-blockchain",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "CoinGecko markets API candidate for provenance-blockchain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_provenance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for provenance."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/provenance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for provenance."
      },
      {
        "provider": "official-brand-kit",
        "url": "https://provenance.io/presskit",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Official Provenance presskit page says logos are available in PNG and SVG format; page is a source note until a direct logo URL is confirmed."
      }
    ]
  },
  {
    "canonicalName": "PulseChain",
    "slug": "pulsechain",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_pulsechain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for pulsechain."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pulsechain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for pulsechain."
      },
      {
        "provider": "official",
        "url": "https://pulsechain.com/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:pulsechain."
      }
    ]
  },
  {
    "canonicalName": "XRP Ledger",
    "slug": "ripple",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ripple.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for ripple."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ripple.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for ripple."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_xrp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for xrp."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/xrp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for xrp."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_xrpl.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for xrpl."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/xrpl.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for xrpl."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/xrp.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:ripple."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/xrp",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons XRP SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Rootstock",
    "slug": "rootstock",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_rootstock.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for rootstock."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/rootstock.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for rootstock."
      },
      {
        "provider": "official",
        "url": "https://rootstock.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:rootstock."
      }
    ]
  },
  {
    "canonicalName": "Saga",
    "slug": "saga",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_saga.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for saga."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/saga.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for saga."
      },
      {
        "provider": "official",
        "url": "https://www.saga.xyz/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:saga."
      }
    ]
  },
  {
    "canonicalName": "Sei",
    "slug": "sei",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_sei.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for sei."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/sei.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for sei."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/sei-sei-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:sei."
      }
    ]
  },
  {
    "canonicalName": "Solana",
    "slug": "solana",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_solana.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for solana."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/solana.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for solana."
      },
      {
        "provider": "official-brand-kit",
        "url": "https://solana.com/branding/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:solana."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/solana",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Solana SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Starknet",
    "slug": "starknet",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_starknet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for starknet."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/starknet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for starknet."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/starknet.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:starknet."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/starknet",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Starknet SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Stellar",
    "slug": "stellar",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_stellar.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for stellar."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/stellar.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for stellar."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/stellar.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:stellar."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/stellar",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Stellar SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Sui",
    "slug": "sui",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_sui.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for sui."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/sui.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for sui."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/sui.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:sui."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/sui",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons Sui SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "TON",
    "slug": "ton",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for ton."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for ton."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_toncoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for toncoin."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/toncoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for toncoin."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/ton.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:ton."
      },
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/ton",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons TON SVG fetched as source-backed local asset."
      }
    ]
  },
  {
    "canonicalName": "Tron",
    "slug": "tron",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_tron.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for tron."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/tron.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for tron."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/tron-trx-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:tron."
      }
    ]
  },
  {
    "canonicalName": "X Layer",
    "slug": "x-layer",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_x-layer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for x-layer."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/x-layer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for x-layer."
      },
      {
        "provider": "official",
        "url": "https://www.okx.com/xlayer",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:x-layer."
      }
    ]
  },
  {
    "canonicalName": "ZKsync Era",
    "slug": "zksync-era",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/zksync",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Simple Icons ZKsync SVG fetched as source-backed local asset."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_zksync-era.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for zksync-era."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/zksync-era.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for zksync-era."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_zksync.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama chain icon mirror candidate for zksync."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/zksync.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for zksync."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/zksync.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for chain:zksync-era."
      }
    ]
  },
  {
    "canonicalName": "Akash",
    "slug": "akash",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/akash.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for akash."
      },
      {
        "provider": "crypto-logos",
        "url": "https://cryptologos.cc/logos/akash-network-akt-logo.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:akash."
      }
    ]
  },
  {
    "canonicalName": "Chutes",
    "slug": "chutes",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chutes.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for chutes."
      },
      {
        "provider": "official",
        "url": "https://chutes.ai/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:chutes."
      }
    ]
  },
  {
    "canonicalName": "DIMO",
    "slug": "dimo",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/dimo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for dimo."
      },
      {
        "provider": "official",
        "url": "https://dimo.org/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:dimo."
      }
    ]
  },
  {
    "canonicalName": "DoubleZero",
    "slug": "doublezero",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/doublezero.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for doublezero."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/double-zero.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for double-zero."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/2z.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for 2z."
      },
      {
        "provider": "official",
        "url": "https://doublezero.xyz/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:doublezero."
      }
    ]
  },
  {
    "canonicalName": "Filecoin",
    "slug": "filecoin",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/filecoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for filecoin."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fil.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for fil."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/filecoin.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:filecoin."
      }
    ]
  },
  {
    "canonicalName": "GEODNET",
    "slug": "geodnet",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/geodnet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for geodnet."
      },
      {
        "provider": "official",
        "url": "https://geodnet.com/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:geodnet."
      }
    ]
  },
  {
    "canonicalName": "Glow",
    "slug": "glow",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/glow.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for glow."
      },
      {
        "provider": "official",
        "url": "https://glowlabs.org/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:glow."
      }
    ]
  },
  {
    "canonicalName": "Grass",
    "slug": "grass",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/grass.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for grass."
      },
      {
        "provider": "official",
        "url": "https://www.getgrass.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:grass."
      }
    ]
  },
  {
    "canonicalName": "Helium",
    "slug": "helium",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/helium.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for helium."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/helium.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:helium."
      }
    ]
  },
  {
    "canonicalName": "Hivemapper",
    "slug": "hivemapper",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hivemapper.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for hivemapper."
      },
      {
        "provider": "official",
        "url": "https://hivemapper.com/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:hivemapper."
      }
    ]
  },
  {
    "canonicalName": "IO.NET",
    "slug": "io-net",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/io-net.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for io-net."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ionet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for ionet."
      },
      {
        "provider": "official",
        "url": "https://io.net/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:io-net."
      }
    ]
  },
  {
    "canonicalName": "Livepeer",
    "slug": "livepeer",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/livepeer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for livepeer."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/livepeer.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:livepeer."
      }
    ]
  },
  {
    "canonicalName": "Nosana",
    "slug": "nosana",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/nosana.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for nosana."
      },
      {
        "provider": "official",
        "url": "https://nosana.io/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:nosana."
      }
    ]
  },
  {
    "canonicalName": "Pocket Network",
    "slug": "pocket-network",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pocket-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for pocket-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pocket.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for pocket."
      },
      {
        "provider": "official",
        "url": "https://www.pokt.network/",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:pocket-network."
      }
    ]
  },
  {
    "canonicalName": "Render Network",
    "slug": "render-network",
    "category": "project",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/render-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for render-network."
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/render.jpg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "DefiLlama generic icon mirror candidate for render."
      },
      {
        "provider": "simple-icons",
        "url": "https://simpleicons.org/icons/render.svg",
        "status": "network-unavailable",
        "error": "download probe failed",
        "note": "Registry source URL candidate for project:render-network."
      }
    ]
  }
];

export const logoSourceManifestByKey = new Map(logoSourceManifest.map((entry) => [`${entry.category}:${entry.slug}`, entry]));
