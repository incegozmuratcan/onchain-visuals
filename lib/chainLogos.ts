import { getLogoRegistryEntry, logoManifestBySlug, normalizeLogoKey, slugifyLogoKey, type LogoFit, type LogoManifestEntry } from "./logos/logoRegistry";

export type { LogoFit } from "./logos/logoRegistry";

export type LogoRenderConfig = {
  src: string;
  fit: LogoFit;
  scale: number;
  padding: number;
  sourceType?: LogoManifestEntry["sourceType"] | "generated" | "external";
  quality?: LogoManifestEntry["quality"] | "generated" | "external-only";
};

type ChainIdentity = {
  name: string;
  aliases: string[];
  slug: string;
  logoCandidates?: string[];
  manifest?: LogoManifestEntry;
};

const DEFAULT_LOGO_CONFIG = {
  fit: "cover" as LogoFit,
  scale: 1,
  padding: 0,
};

function generatedLogo(slug: string) {
  return `/api/chain-logo/${encodeURIComponent(slug)}`;
}

function llamaChain(slug: string) {
  return `https://icons.llama.fi/chains/rsz_${slug}.jpg`;
}

function llamaIcon(slug: string) {
  return `https://icons.llama.fi/${slug}.jpg`;
}

function coinLogo(id: string) {
  return `https://assets.coingecko.com/coins/images/${id}/large.png`;
}

const externalCandidates: Record<string, string[]> = {
  bsc: [llamaChain("bsc"), llamaIcon("bsc"), coinLogo("825")],
  base: [llamaChain("base"), llamaIcon("base"), coinLogo("31199")],
  avalanche: [llamaChain("avalanche"), llamaIcon("avax"), coinLogo("12559")],
  optimism: [llamaChain("optimism"), llamaIcon("optimism"), coinLogo("25244")],
  "zksync-era": [llamaChain("zksync-era"), llamaIcon("zksync-era"), coinLogo("24091")],
  "internet-computer": [llamaChain("internet-computer"), llamaIcon("internet-computer"), coinLogo("14495")],
};

function fallbackSlug(name: string) {
  return slugifyLogoKey(name);
}

function uniqueConfigs(configs: LogoRenderConfig[]) {
  const seen = new Set<string>();
  return configs.filter((config) => {
    if (seen.has(config.src)) return false;
    seen.add(config.src);
    return true;
  });
}

function manifestConfig(entry: LogoManifestEntry): LogoRenderConfig | null {
  if (!entry.localPath) return null;
  return {
    src: entry.localPath,
    fit: entry.fit,
    scale: entry.scale,
    padding: entry.padding,
    sourceType: entry.sourceType,
    quality: entry.quality,
  };
}

function configFor(slug: string, src: string, overrides?: Partial<LogoRenderConfig>): LogoRenderConfig {
  const manifest = logoManifestBySlug.get(`chain:${slug}`) ?? logoManifestBySlug.get(`project:${slug}`) ?? logoManifestBySlug.get(`asset:${slug}`);
  return {
    src,
    fit: overrides?.fit ?? manifest?.fit ?? DEFAULT_LOGO_CONFIG.fit,
    scale: overrides?.scale ?? manifest?.scale ?? DEFAULT_LOGO_CONFIG.scale,
    padding: overrides?.padding ?? manifest?.padding ?? DEFAULT_LOGO_CONFIG.padding,
    sourceType: overrides?.sourceType,
    quality: overrides?.quality,
  };
}

export function getChainIdentity(name: string): ChainIdentity {
  const key = normalizeLogoKey(name);
  const manifest = getLogoRegistryEntry(key);
  if (manifest) {
    return {
      name: manifest.canonicalName,
      aliases: manifest.aliases,
      slug: manifest.slug,
      logoCandidates: externalCandidates[manifest.slug],
      manifest,
    };
  }
  return { name: name.trim(), aliases: [key], slug: fallbackSlug(name) };
}

export function normalizeChainName(name: string) {
  return getChainIdentity(name).name;
}

export function getChainLogoCandidates(name: string, logo?: string | null): LogoRenderConfig[] {
  const identity = getChainIdentity(name);
  const local = identity.manifest ? manifestConfig(identity.manifest) : null;
  const verifiedExternal = [
    ...(logo && /^https:\/\//.test(logo) ? [logo] : []),
    ...(identity.logoCandidates ?? []),
    llamaChain(identity.slug),
    llamaIcon(identity.slug),
  ];

  return uniqueConfigs([
    ...(local ? [local] : []),
    ...(identity.manifest?.requiredActive ? [] : verifiedExternal.map((src) => configFor(identity.slug, src, { fit: "contain", padding: 1, sourceType: "external", quality: "external-only" }))),
    ...(identity.manifest?.requiredActive ? [] : [configFor(identity.slug, generatedLogo(identity.slug), { sourceType: "generated", quality: "generated" })]),
  ]);
}

export function getChainLogo(name: string, logo?: string | null) {
  return getChainLogoCandidates(name, logo)[0]?.src ?? null;
}

export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
