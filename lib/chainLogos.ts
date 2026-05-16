import {
  getLogoRegistryEntry,
  logoManifestBySlug,
  normalizeLogoKey,
  slugifyLogoKey,
  type LogoFit,
  type LogoManifestEntry,
} from "./logos/logoRegistry";

export type { LogoFit } from "./logos/logoRegistry";

export type LogoRenderConfig = {
  src: string;
  fit: LogoFit;
  scale: number;
  padding: number;
  sourceType?: LogoManifestEntry["sourceType"] | "generated" | "external";
  quality?:
    | LogoManifestEntry["quality"]
    | "generated"
    | "external-only"
    | "fallback";
};

type ChainIdentity = {
  name: string;
  aliases: string[];
  slug: string;
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

// Legacy local registry/source-manifest assets are intentionally not part of active public logo resolution.
function configFor(
  slug: string,
  src: string,
  overrides?: Partial<LogoRenderConfig>,
): LogoRenderConfig {
  const manifest =
    logoManifestBySlug.get(`chain:${slug}`) ??
    logoManifestBySlug.get(`project:${slug}`) ??
    logoManifestBySlug.get(`asset:${slug}`);
  return {
    src,
    fit: overrides?.fit ?? manifest?.fit ?? DEFAULT_LOGO_CONFIG.fit,
    scale: overrides?.scale ?? manifest?.scale ?? DEFAULT_LOGO_CONFIG.scale,
    padding:
      overrides?.padding ?? manifest?.padding ?? DEFAULT_LOGO_CONFIG.padding,
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
      manifest,
    };
  }
  return { name: name.trim(), aliases: [key], slug: fallbackSlug(name) };
}

export function normalizeChainName(name: string) {
  return getChainIdentity(name).name;
}

export function getChainLogoCandidates(
  name: string,
  logo?: string | null,
): LogoRenderConfig[] {
  const identity = getChainIdentity(name);
  const providedLogo = logo
    ? [
        configFor(identity.slug, logo, {
          fit: "contain",
          padding: 1,
          sourceType: logo.startsWith("/") ? undefined : "external",
          quality: logo.startsWith("/") ? undefined : "external-only",
        }),
      ]
    : [];

  return uniqueConfigs([
    ...providedLogo,
    configFor(identity.slug, generatedLogo(identity.slug), {
      fit: "contain",
      padding: 0,
      sourceType: "generated",
      quality: identity.manifest?.requiredActive ? "fallback" : "generated",
    }),
  ]);
}

export function getChainLogo(name: string, logo?: string | null) {
  return getChainLogoCandidates(name, logo)[0]?.src ?? null;
}

export function isKnownRequiredLogoName(name: string) {
  return Boolean(getChainIdentity(name).manifest?.requiredActive);
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
