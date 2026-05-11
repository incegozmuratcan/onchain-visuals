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

export const logoSourceManifest: LogoSourceManifestEntry[] = [
  {
    "canonicalName": "Abstract",
    "slug": "abstract",
    "category": "chain",
    "localPath": "/logos/chains/abstract.jpg",
    "rawPath": "/logos/raw/defillama/chain-abstract.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_abstract.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for abstract.",
    "downloadedAt": "2026-05-11T21:02:29.266Z",
    "originalContentType": "image/jpeg",
    "sha256": "05c33fb58ea56989391d2ad0df8b62040d0b4e2cf58f89d944377dad38b6fa0c",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Algorand",
    "slug": "algorand",
    "category": "chain",
    "localPath": "/logos/chains/algorand.svg",
    "rawPath": "/logos/raw/simple-icons/chain-algorand.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/algorand",
    "sourceNote": "Simple Icons Algorand SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:29.471Z",
    "originalContentType": "image/svg+xml",
    "sha256": "75ad3f9286c14e80ae143c13a0056fad8014426d1bbcaf8ef8d3619aec3e07d2",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Aptos",
    "slug": "aptos",
    "category": "chain",
    "localPath": "/logos/chains/aptos.jpg",
    "rawPath": "/logos/raw/defillama/chain-aptos.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_aptos.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for aptos.",
    "downloadedAt": "2026-05-11T21:02:29.628Z",
    "originalContentType": "image/jpeg",
    "sha256": "722285a86992f2f9ece156ce9af7e19db8c44315f5ccf0f2122c5b268e6aea68",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Arbitrum",
    "slug": "arbitrum",
    "category": "chain",
    "localPath": "/logos/chains/arbitrum.jpg",
    "rawPath": "/logos/raw/defillama/chain-arbitrum.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_arbitrum.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for arbitrum.",
    "downloadedAt": "2026-05-11T21:02:29.693Z",
    "originalContentType": "image/jpeg",
    "sha256": "fd631ecef20f16e36cd3309d59a2e59a5d6e183edcf3681850c17d8d4b04919d",
    "width": 250,
    "height": 250,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Avalanche",
    "slug": "avalanche",
    "category": "chain",
    "localPath": "/logos/chains/avalanche.jpg",
    "rawPath": "/logos/raw/defillama/chain-avalanche.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_avalanche.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for avalanche.",
    "downloadedAt": "2026-05-11T21:02:29.737Z",
    "originalContentType": "image/jpeg",
    "sha256": "3a64cdb1c67f3dbda43766226cd1868fb651532cdbc53c334f53e1c3fc30e43a",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Base",
    "slug": "base",
    "category": "chain",
    "localPath": "/logos/chains/base.jpg",
    "rawPath": "/logos/raw/defillama/chain-base.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_base.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for base.",
    "downloadedAt": "2026-05-11T21:02:29.782Z",
    "originalContentType": "image/jpeg",
    "sha256": "a1021141945eed5807481f6a872ffc3c177f995823ea16d7c29414cf31fae52b",
    "width": 249,
    "height": 249,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Bitcoin",
    "slug": "bitcoin",
    "category": "chain",
    "localPath": "/logos/chains/bitcoin.jpg",
    "rawPath": "/logos/raw/defillama/chain-bitcoin.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_bitcoin.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for bitcoin.",
    "downloadedAt": "2026-05-11T21:02:29.822Z",
    "originalContentType": "image/jpeg",
    "sha256": "41a54e858f96365fe2fbd7bc0216df4ec488ea8a44d39595196da91188b2ee25",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "BNB Chain",
    "slug": "bsc",
    "category": "chain",
    "localPath": "/logos/chains/bsc.jpg",
    "rawPath": "/logos/raw/defillama/chain-bsc.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/bsc.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for bsc.",
    "downloadedAt": "2026-05-11T21:02:29.907Z",
    "originalContentType": "image/jpeg",
    "sha256": "b5b78fc3ce1d5db250ca2adec253001f12c2c9877b13a8179216c62a919dd5ba",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Canton",
    "slug": "canton-network",
    "category": "chain",
    "localPath": "/logos/chains/canton-network.jpg",
    "rawPath": "/logos/raw/defillama/chain-canton-network.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/canton.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for canton.",
    "downloadedAt": "2026-05-11T21:02:30.286Z",
    "originalContentType": "image/jpeg",
    "sha256": "c21b358de1f1cdab2256e25d97dd2ac3c0983843a6dc3700c735281195d63d00",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Cardano",
    "slug": "cardano",
    "category": "chain",
    "localPath": "/logos/chains/cardano.jpg",
    "rawPath": "/logos/raw/defillama/chain-cardano.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_cardano.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for cardano.",
    "downloadedAt": "2026-05-11T21:02:30.323Z",
    "originalContentType": "image/jpeg",
    "sha256": "c1b075e75d3e8bfb1bf5fb7fb16458f49b47fdd55db7c8afdb173f7de1c5c49a",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Celo",
    "slug": "celo",
    "category": "chain",
    "localPath": "/logos/chains/celo.jpg",
    "rawPath": "/logos/raw/defillama/chain-celo.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_celo.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for celo.",
    "downloadedAt": "2026-05-11T21:02:30.438Z",
    "originalContentType": "image/jpeg",
    "sha256": "19aa76545f31b3d060afb31b1474d05db0d38192e18dac0771300a25daf0343d",
    "width": 200,
    "height": 200,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Cosmos",
    "slug": "cosmos",
    "category": "chain",
    "localPath": "/logos/chains/cosmos.jpg",
    "rawPath": "/logos/raw/defillama/chain-cosmos.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_cosmos.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for cosmos.",
    "downloadedAt": "2026-05-11T21:02:30.477Z",
    "originalContentType": "image/jpeg",
    "sha256": "a3530ad9fb100c0a7bcbb56a10b3774cb5261e4d28f951c3e1433b2ab3bb0375",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Cronos",
    "slug": "cronos",
    "category": "chain",
    "localPath": "/logos/chains/cronos.jpg",
    "rawPath": "/logos/raw/defillama/chain-cronos.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_cronos.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for cronos.",
    "downloadedAt": "2026-05-11T21:02:30.513Z",
    "originalContentType": "image/jpeg",
    "sha256": "29481fd63f82aae14872c1197e3bcd5dfd3039a27d54f6d9984068957f5c81bd",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Ethereum",
    "slug": "ethereum",
    "category": "chain",
    "localPath": "/logos/chains/ethereum.svg",
    "rawPath": "/logos/raw/simple-icons/chain-ethereum.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/ethereum",
    "sourceNote": "Simple Icons Ethereum SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:30.524Z",
    "originalContentType": "image/svg+xml",
    "sha256": "88c4652c0c711ae19c0a5c5320e494fd839a9194adafa3165745e4d5e28df268",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Fantom",
    "slug": "fantom",
    "category": "chain",
    "localPath": "/logos/chains/fantom.jpg",
    "rawPath": "/logos/raw/defillama/chain-fantom.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_fantom.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for fantom.",
    "downloadedAt": "2026-05-11T21:02:30.557Z",
    "originalContentType": "image/jpeg",
    "sha256": "ba5c24b59e0ce9c4723f761c3d179a0ec2a161440f50dede4292583993df054b",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Filecoin",
    "slug": "filecoin",
    "category": "chain",
    "localPath": "/logos/chains/filecoin.jpg",
    "rawPath": "/logos/raw/defillama/chain-filecoin.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_filecoin.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for filecoin.",
    "downloadedAt": "2026-05-11T21:02:30.747Z",
    "originalContentType": "image/jpeg",
    "sha256": "a8fd6439f06d25a59bd687feec2738965d575637ca89dcc58dddcfb012491909",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Fogo",
    "slug": "fogo",
    "category": "chain",
    "localPath": "/logos/chains/fogo.jpg",
    "rawPath": "/logos/raw/defillama/chain-fogo.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_fogo.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for fogo.",
    "downloadedAt": "2026-05-11T21:02:30.788Z",
    "originalContentType": "image/jpeg",
    "sha256": "0eec561f85d09d3a36ab7d8065cb86ae2d946cdc93e2b07c24c37b073f16dc07",
    "width": 399,
    "height": 399,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Hedera",
    "slug": "hedera",
    "category": "chain",
    "localPath": "/logos/chains/hedera.svg",
    "rawPath": "/logos/raw/simple-icons/chain-hedera.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/hedera",
    "sourceNote": "Simple Icons Hedera SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:30.874Z",
    "originalContentType": "image/svg+xml",
    "sha256": "5237cd1b7ac030594b2d316468f959cf04c5c725be0ffaf93cbcb97120f6030d",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Injective",
    "slug": "injective",
    "category": "chain",
    "localPath": "/logos/chains/injective.jpg",
    "rawPath": "/logos/raw/defillama/chain-injective.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_injective.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for injective.",
    "downloadedAt": "2026-05-11T21:02:30.986Z",
    "originalContentType": "image/jpeg",
    "sha256": "33ea87da887c4025bc54f5a96f8763dfda30779152b3c2a87a95a458b01f1dec",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Ink",
    "slug": "ink",
    "category": "chain",
    "localPath": "/logos/chains/ink.jpg",
    "rawPath": "/logos/raw/defillama/chain-ink.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_ink.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for ink.",
    "downloadedAt": "2026-05-11T21:02:31.030Z",
    "originalContentType": "image/jpeg",
    "sha256": "52d0e802c69c65b7eb1662629668c8d0f173c5984914f2c7577c0dd39a530f4d",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "ICP",
    "slug": "internet-computer",
    "category": "chain",
    "localPath": "/logos/chains/internet-computer.jpg",
    "rawPath": "/logos/raw/defillama/chain-internet-computer.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_internet-computer.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for internet-computer.",
    "downloadedAt": "2026-05-11T21:02:31.069Z",
    "originalContentType": "image/jpeg",
    "sha256": "ae479010ef8f5822b99bbaf62a252855674033765c8c06d52390ab59bd6a6bac",
    "width": 250,
    "height": 250,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Linea",
    "slug": "linea",
    "category": "chain",
    "localPath": "/logos/chains/linea.jpg",
    "rawPath": "/logos/raw/defillama/chain-linea.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_linea.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for linea.",
    "downloadedAt": "2026-05-11T21:02:31.110Z",
    "originalContentType": "image/jpeg",
    "sha256": "f3c65cba07722269616f4778de96cfea93ac0351a8d628776d5841ce28467011",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Mantle",
    "slug": "mantle",
    "category": "chain",
    "localPath": "/logos/chains/mantle.jpg",
    "rawPath": "/logos/raw/defillama/chain-mantle.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_mantle.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for mantle.",
    "downloadedAt": "2026-05-11T21:02:31.261Z",
    "originalContentType": "image/jpeg",
    "sha256": "6aa0ac56f199768d3c0e33d59c656d24eddf43399efd4e8e1f8273017ba72ecf",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Monad",
    "slug": "monad",
    "category": "chain",
    "localPath": "/logos/chains/monad.jpg",
    "rawPath": "/logos/raw/defillama/chain-monad.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_monad.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for monad.",
    "downloadedAt": "2026-05-11T21:02:31.303Z",
    "originalContentType": "image/jpeg",
    "sha256": "0f4512d8366d9fccb6cf7d857bb0acac3c0a241e2da7f2fd3c85d5274714b57a",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Morph",
    "slug": "morph",
    "category": "chain",
    "localPath": "/logos/chains/morph.jpg",
    "rawPath": "/logos/raw/defillama/chain-morph.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_morph.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for morph.",
    "downloadedAt": "2026-05-11T21:02:31.342Z",
    "originalContentType": "image/jpeg",
    "sha256": "43cc3bba306dc16a1a4dfe8f64c32da6b36d67a373e6ab3cd6740e09c0bd2a6d",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Near",
    "slug": "near",
    "category": "chain",
    "localPath": "/logos/chains/near.svg",
    "rawPath": "/logos/raw/simple-icons/chain-near.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/near",
    "sourceNote": "Simple Icons NEAR SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.352Z",
    "originalContentType": "image/svg+xml",
    "sha256": "99d86985ecf4342fdcc9ba84edf7378bfeb374207386063d907a457b9696c963",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "OP Mainnet",
    "slug": "optimism",
    "category": "chain",
    "localPath": "/logos/chains/optimism.svg",
    "rawPath": "/logos/raw/simple-icons/chain-optimism.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/optimism",
    "sourceNote": "Simple Icons Optimism SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.483Z",
    "originalContentType": "image/svg+xml",
    "sha256": "ab9a77c764dff4d0c4c2df0898a344737f00e768da80afa4322fe8cc6351d6d3",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Polygon",
    "slug": "polygon",
    "category": "chain",
    "localPath": "/logos/chains/polygon.svg",
    "rawPath": "/logos/raw/simple-icons/chain-polygon.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/polygon",
    "sourceNote": "Simple Icons Polygon SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.495Z",
    "originalContentType": "image/svg+xml",
    "sha256": "c914c7b05a45079c59120960b53106f4c9fd0a3db9cd1ca92f9c86c2beb4b406",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "PulseChain",
    "slug": "pulsechain",
    "category": "chain",
    "localPath": "/logos/chains/pulsechain.jpg",
    "rawPath": "/logos/raw/defillama/chain-pulsechain.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/pulsechain.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for pulsechain.",
    "downloadedAt": "2026-05-11T21:02:31.575Z",
    "originalContentType": "image/jpeg",
    "sha256": "096b03091143b52021240ac4adcf8527654b8364dfc7ed5dd59626fda8b62a4e",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "XRP Ledger",
    "slug": "ripple",
    "category": "chain",
    "localPath": "/logos/chains/ripple.svg",
    "rawPath": "/logos/raw/simple-icons/chain-ripple.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/xrp",
    "sourceNote": "Simple Icons XRP SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.587Z",
    "originalContentType": "image/svg+xml",
    "sha256": "026e30bdd44d10abd8c2646cebfc86a698257d42cc527f7224aa9a9ea7b18b35",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Rootstock",
    "slug": "rootstock",
    "category": "chain",
    "localPath": "/logos/chains/rootstock.jpg",
    "rawPath": "/logos/raw/defillama/chain-rootstock.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_rootstock.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for rootstock.",
    "downloadedAt": "2026-05-11T21:02:31.622Z",
    "originalContentType": "image/jpeg",
    "sha256": "f13e53a89a9a7151873757a65a67a68a5d108182ee51ef9f7d6e6e78e63ca80a",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Sei",
    "slug": "sei",
    "category": "chain",
    "localPath": "/logos/chains/sei.jpg",
    "rawPath": "/logos/raw/defillama/chain-sei.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_sei.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for sei.",
    "downloadedAt": "2026-05-11T21:02:31.664Z",
    "originalContentType": "image/jpeg",
    "sha256": "d0ce715b1519cc22636ab4b8d69861cce0abbab42f495c7abb95b712f2b65206",
    "width": 250,
    "height": 250,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Solana",
    "slug": "solana",
    "category": "chain",
    "localPath": "/logos/chains/solana.svg",
    "rawPath": "/logos/raw/simple-icons/chain-solana.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/solana",
    "sourceNote": "Simple Icons Solana SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.676Z",
    "originalContentType": "image/svg+xml",
    "sha256": "1d554d9b882e66be4f972162f33b5b5231701f8c081a7d47c3c3d608cdd8feaa",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Starknet",
    "slug": "starknet",
    "category": "chain",
    "localPath": "/logos/chains/starknet.jpg",
    "rawPath": "/logos/raw/defillama/chain-starknet.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/starknet.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for starknet.",
    "downloadedAt": "2026-05-11T21:02:31.846Z",
    "originalContentType": "image/jpeg",
    "sha256": "1dea98123cd4726a50f9ba7245fc65754ca1ba2c8d82fb2a0b13dc74985ef59b",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Stellar",
    "slug": "stellar",
    "category": "chain",
    "localPath": "/logos/chains/stellar.svg",
    "rawPath": "/logos/raw/simple-icons/chain-stellar.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/stellar",
    "sourceNote": "Simple Icons Stellar SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.858Z",
    "originalContentType": "image/svg+xml",
    "sha256": "aeb19004ba05cad0ce0f0812f92d712dfbc782e412dcad2515965dd0ec752426",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Sui",
    "slug": "sui",
    "category": "chain",
    "localPath": "/logos/chains/sui.svg",
    "rawPath": "/logos/raw/simple-icons/chain-sui.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/sui",
    "sourceNote": "Simple Icons Sui SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.981Z",
    "originalContentType": "image/svg+xml",
    "sha256": "f4ab2c1b5cca82b7f9f1fa403f81e4b7055943e16f7f316bdba8395681b93ba6",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "TON",
    "slug": "ton",
    "category": "chain",
    "localPath": "/logos/chains/ton.svg",
    "rawPath": "/logos/raw/simple-icons/chain-ton.svg",
    "sourceProvider": "simple-icons",
    "sourceUrl": "https://cdn.simpleicons.org/ton",
    "sourceNote": "Simple Icons TON SVG fetched as source-backed local asset.",
    "downloadedAt": "2026-05-11T21:02:31.992Z",
    "originalContentType": "image/svg+xml",
    "sha256": "f268d0767e86ec424c6cad3b689da9baf53c30d7c35078da1aef1ac1a2514b97",
    "width": 24,
    "height": 24,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Tron",
    "slug": "tron",
    "category": "chain",
    "localPath": "/logos/chains/tron.jpg",
    "rawPath": "/logos/raw/defillama/chain-tron.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_tron.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for tron.",
    "downloadedAt": "2026-05-11T21:02:32.031Z",
    "originalContentType": "image/jpeg",
    "sha256": "f4ed79700edc67b4e002778ed507e4d5d077351a08b7e61544974bca98393d1a",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "ZKsync Era",
    "slug": "zksync-era",
    "category": "chain",
    "localPath": "/logos/chains/zksync-era.jpg",
    "rawPath": "/logos/raw/defillama/chain-zksync-era.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chains/rsz_zksync-era.jpg",
    "sourceNote": "DefiLlama chain icon mirror candidate for zksync-era.",
    "downloadedAt": "2026-05-11T21:02:32.144Z",
    "originalContentType": "image/jpeg",
    "sha256": "382bb9074aaa6809a8a5e1ce2fb5d15455c5f7c1e71ef81ff4cd6dfe6cbe2166",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Chutes",
    "slug": "chutes",
    "category": "project",
    "localPath": "/logos/projects/chutes.jpg",
    "rawPath": "/logos/raw/defillama/project-chutes.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/chutes.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for chutes.",
    "downloadedAt": "2026-05-11T21:02:32.246Z",
    "originalContentType": "image/jpeg",
    "sha256": "1f5e5018833d359552688017ea9cc14e39b1a2b1bc48364b6c3c39c7595d6f05",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "DoubleZero",
    "slug": "doublezero",
    "category": "project",
    "localPath": "/logos/projects/doublezero.jpg",
    "rawPath": "/logos/raw/defillama/project-doublezero.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/doublezero.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for doublezero.",
    "downloadedAt": "2026-05-11T21:02:32.352Z",
    "originalContentType": "image/jpeg",
    "sha256": "72a46bb1fc5ecdcf5826c42f8b25e15db056919deb6d46c272c2025219f96446",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Filecoin",
    "slug": "filecoin",
    "category": "project",
    "localPath": "/logos/projects/filecoin.jpg",
    "rawPath": "/logos/raw/defillama/project-filecoin.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/filecoin.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for filecoin.",
    "downloadedAt": "2026-05-11T21:02:32.392Z",
    "originalContentType": "image/jpeg",
    "sha256": "a8fd6439f06d25a59bd687feec2738965d575637ca89dcc58dddcfb012491909",
    "width": 28,
    "height": 28,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "GEODNET",
    "slug": "geodnet",
    "category": "project",
    "localPath": "/logos/projects/geodnet.jpg",
    "rawPath": "/logos/raw/defillama/project-geodnet.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/geodnet.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for geodnet.",
    "downloadedAt": "2026-05-11T21:02:32.428Z",
    "originalContentType": "image/jpeg",
    "sha256": "56e0bbfc7a5689a6109ddce847f076957383b06376aa10be0603e4059c8292c8",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Grass",
    "slug": "grass",
    "category": "project",
    "localPath": "/logos/projects/grass.jpg",
    "rawPath": "/logos/raw/defillama/project-grass.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/grass.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for grass.",
    "downloadedAt": "2026-05-11T21:02:32.508Z",
    "originalContentType": "image/jpeg",
    "sha256": "f44f2aa499ff94f60d9edd3fa7875462e964c00a2efa4e961924a599a678fb95",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Helium",
    "slug": "helium",
    "category": "project",
    "localPath": "/logos/projects/helium.jpg",
    "rawPath": "/logos/raw/defillama/project-helium.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/helium.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for helium.",
    "downloadedAt": "2026-05-11T21:02:32.545Z",
    "originalContentType": "image/jpeg",
    "sha256": "fbb8714c3616372c48007f7f4f97f59d2c6506a19b573413fcde35db5abe3aa8",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Hivemapper",
    "slug": "hivemapper",
    "category": "project",
    "localPath": "/logos/projects/hivemapper.jpg",
    "rawPath": "/logos/raw/defillama/project-hivemapper.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/hivemapper.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for hivemapper.",
    "downloadedAt": "2026-05-11T21:02:32.587Z",
    "originalContentType": "image/jpeg",
    "sha256": "a8e1151b05846f0ff46c394c6711cdbbf1699c8720b01ae088bf7b3f9f75d363",
    "width": 400,
    "height": 400,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  },
  {
    "canonicalName": "Livepeer",
    "slug": "livepeer",
    "category": "project",
    "localPath": "/logos/projects/livepeer.jpg",
    "rawPath": "/logos/raw/defillama/project-livepeer.jpg",
    "sourceProvider": "defillama",
    "sourceUrl": "https://icons.llama.fi/livepeer.jpg",
    "sourceNote": "DefiLlama generic icon mirror candidate for livepeer.",
    "downloadedAt": "2026-05-11T21:02:32.701Z",
    "originalContentType": "image/jpeg",
    "sha256": "2106029da788ee6461b018e5c65965a3363c624e34598e0a9a81eb5c6e6b81e3",
    "width": 200,
    "height": 200,
    "approvalStatus": "approved",
    "rightsNote": "Logos are trademarks of their respective owners and are used for identification purposes. Source/provenance is tracked in the logo source manifest.",
    "notes": "Downloaded by scripts/sync-logos.mjs; final asset is local and source-backed."
  }
];

export const unresolvedLogoSources: LogoSourceUnresolvedEntry[] = [
  {
    "canonicalName": "BENJI",
    "slug": "benji",
    "category": "asset",
    "attemptedCandidates": [
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/benji.jpg",
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv-blockchain.jpg",
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bsv.jpg",
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bsv.jpg",
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/chains/rsz_bitcoin-sv.jpg",
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/bitcoin-sv.jpg",
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/hyperliquid.jpg",
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/ionet.jpg",
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/pocket.jpg",
        "status": "404",
        "error": "Not Found"
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
        "status": "404",
        "error": "Not Found"
      },
      {
        "provider": "defillama",
        "url": "https://icons.llama.fi/render.jpg",
        "status": "404",
        "error": "Not Found"
      }
    ]
  }
];

export const logoSourceManifestByKey = new Map(logoSourceManifest.map((entry) => [`${entry.category}:${entry.slug}`, entry]));
