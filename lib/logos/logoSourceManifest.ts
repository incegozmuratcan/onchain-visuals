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
};

export type LogoSourceUnresolvedEntry = {
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  attemptedCandidates: { provider: string; url: string; status: string; error: string }[];
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/abstract.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_algorand.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/algorand.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Aptos",
    "slug": "aptos",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/aptos",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_aptos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/aptos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Arbitrum",
    "slug": "arbitrum",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/arbitrum",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_arbitrum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/arbitrum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/avalanche.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Base",
    "slug": "base",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/base",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_base.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/base.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bitcoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsc.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_binance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/binance.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bnb.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bnb.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "BSV Blockchain",
    "slug": "bsv-blockchain",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsv-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv-blockchain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bitcoin-sv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bitcoin-sv.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/canton-network.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_canton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/canton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cardano.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_celo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/celo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cosmos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/cronos.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Ethereum",
    "slug": "ethereum",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/ethereum",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ethereum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ethereum.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fantom.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Filecoin",
    "slug": "filecoin",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/filecoin",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_filecoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/filecoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_fil.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fil.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fogo.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_hedera.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hedera.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Hyperliquid L1",
    "slug": "hyperliquid",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_hyperliquid.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hyperliquid.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/injective.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ink.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/internet-computer.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_icp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/icp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/linea.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Mantle",
    "slug": "mantle",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/mantle",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_mantle.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/mantle.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/monad.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/morph.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Near",
    "slug": "near",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/near",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_near.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/near.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "OP Mainnet",
    "slug": "optimism",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/optimism",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_optimism.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/optimism.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_op-mainnet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/op-mainnet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Polygon",
    "slug": "polygon",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/polygon",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_polygon.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/polygon.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pulsechain.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "XRP Ledger",
    "slug": "ripple",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/xrp",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ripple.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ripple.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_xrp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/xrp.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_xrpl.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/xrpl.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/rootstock.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/sei.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Solana",
    "slug": "solana",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/solana",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_solana.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/solana.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Starknet",
    "slug": "starknet",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/starknet",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_starknet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/starknet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Stellar",
    "slug": "stellar",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/stellar",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_stellar.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/stellar.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "Sui",
    "slug": "sui",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/sui",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_sui.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/sui.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  },
  {
    "canonicalName": "TON",
    "slug": "ton",
    "category": "chain",
    "attemptedCandidates": [
      {
        "provider": "simple-icons",
        "url": "https://cdn.simpleicons.org/ton",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_ton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ton.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_toncoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/toncoin.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/tron.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_zksync-era.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/zksync-era.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_zksync.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/zksync.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/double-zero.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/2z.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/fil.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ionet.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pocket.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
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
        "error": "download probe failed"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/render.jpg",
        "status": "network-unavailable",
        "error": "download probe failed"
      }
    ]
  }
];

export const logoSourceManifestByKey = new Map(logoSourceManifest.map((entry) => [`${entry.category}:${entry.slug}`, entry]));
