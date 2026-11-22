import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { approvedLogoCandidateOverlay, approvedLogoCandidateSlugs, logoSlug } from "@/lib/admin/logoDb";
import {
  allowedChainLogoUrl,
  CHAIN_LOGO_MAX_BYTES,
  CURATED_CHAIN_LOGOS,
  chainLogoCacheEntryUsable,
  defillamaChainLogoUrl,
  normalizeImageContentType,
  planChainRevenueLogos,
  sniffChainLogo,
  type ChainLogoCacheEntry,
  type ChainLogoPlanChain,
  type CheckedChainLogo,
  type RevenueChain,
} from "./chainRevenueDaily";

const STATE_FILES: Record<string, string> = {
  "chain-revenue-daily": "artifacts/x-chain-revenue-daily/posted-state.json",
  "chain-revenue-weekly": "artifacts/x-chain-revenue-weekly/posted-state.json",
  "chain-revenue-monthly": "artifacts/x-chain-revenue-monthly/posted-state.json",
};

type LogoCard = {
  datasetSlug?: string;
  series?: { bars?: { slug: string; name: string; logo?: string | null }[] };
  metadata?: {
    leader?: { slug?: string; name?: string; logo?: string | null } | null;
    [key: string]: unknown;
  };
};

function readEnv(name: string) {
  return process.env[name];
}

/** Workflow artifact state. Unset on Vercel so a site render never writes the post ledger. */
export function chainRevenueLogoStatePath(datasetSlug: string) {
  if (!STATE_FILES[datasetSlug] || readEnv("VERCEL")) return null;
  const override = readEnv("CHAIN_REVENUE_LOGO_STATE");
  if (override) return override;
  return path.join(process.cwd(), STATE_FILES[datasetSlug]);
}

function cacheFromState(doc: Record<string, unknown>) {
  const logos = doc.logos;
  if (!logos || typeof logos !== "object" || Array.isArray(logos)) return {} as Record<string, ChainLogoCacheEntry>;
  return logos as Record<string, ChainLogoCacheEntry>;
}

async function readState(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    if (!raw.trim()) return { ok: true as const, doc: {} as Record<string, unknown> };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(`Chain revenue logo cache in ${file} is not an object; leaving it untouched.`);
      return { ok: false as const, doc: {} };
    }
    return { ok: true as const, doc: parsed as Record<string, unknown> };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return { ok: true as const, doc: {} as Record<string, unknown> };
    console.warn("Chain revenue logo cache could not be read; continuing without it.", error);
    return { ok: false as const, doc: {} };
  }
}

async function writeState(file: string, doc: Record<string, unknown>, logos: Record<string, ChainLogoCacheEntry>, logoSources: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const next = { ...doc, logos, logoSources };
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
}

function dataUrl(contentType: string, bytes: Uint8Array) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function readLocalLogo(urlPath: string, asDataUrl: boolean): Promise<CheckedChainLogo | null> {
  const allowed = allowedChainLogoUrl(urlPath);
  if (!allowed || !allowed.startsWith("/logos/")) return null;
  const root = path.resolve(process.cwd(), "public");
  const abs = path.resolve(root, allowed.slice(1));
  if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) return null;
  try {
    const buf = await readFile(abs);
    if (buf.byteLength <= 0 || buf.byteLength > CHAIN_LOGO_MAX_BYTES) return null;
    const sniffed = sniffChainLogo(buf);
    if (!sniffed) return null;
    const renderUrl = asDataUrl ? dataUrl(sniffed, buf) : allowed;
    if (!allowedChainLogoUrl(renderUrl)) return null;
    return { contentType: sniffed, byteLength: buf.byteLength, renderUrl };
  } catch {
    return null;
  }
}

async function readRemoteLogo(url: string, asDataUrl: boolean): Promise<CheckedChainLogo | null> {
  const allowed = allowedChainLogoUrl(url);
  if (!allowed || !allowed.startsWith("https:")) return null;
  try {
    const response = await fetch(allowed, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "image/png,image/jpeg,image/webp,image/svg+xml" },
    });
    if (!response.ok) return null;
    if (!allowedChainLogoUrl(response.url)) return null;
    const header = normalizeImageContentType(response.headers.get("content-type"));
    const buf = new Uint8Array(await response.arrayBuffer());
    if (!header || buf.byteLength <= 0 || buf.byteLength > CHAIN_LOGO_MAX_BYTES) return null;
    if (sniffChainLogo(buf) !== header) return null;
    const renderUrl = asDataUrl ? dataUrl(header, buf) : allowed;
    if (!allowedChainLogoUrl(renderUrl)) return null;
    return { contentType: header, byteLength: buf.byteLength, renderUrl };
  } catch {
    return null;
  }
}

async function checkLogo(url: string, asDataUrl: boolean) {
  if (!url) return null;
  if (url.startsWith("/")) return readLocalLogo(url, asDataUrl);
  return readRemoteLogo(url, asDataUrl);
}

function approvedUrlFor(overlay: Map<string, string[]>, names: string[], slug: string) {
  const keys = new Set<string>([slug]);
  for (const name of names) {
    if (!name) continue;
    for (const candidate of approvedLogoCandidateSlugs(name)) keys.add(candidate);
    keys.add(logoSlug(name));
  }
  for (const key of keys) {
    const url = overlay.get(key)?.find((item) => item);
    if (url) return url;
  }
  return null;
}

/**
 * Resolve every chain logo for a Chain Revenue card.
 * A database or image failure falls through. It never throws.
 */
export async function applyChainRevenueCardLogos<T extends LogoCard>(card: T, chains: RevenueChain[]): Promise<T> {
  try {
    return await resolveCardLogos(card, chains);
  } catch (error) {
    console.warn("Chain revenue logo resolution failed; keeping the fixed and DefiLlama logos.", error);
    return card;
  }
}

async function resolveCardLogos<T extends LogoCard>(card: T, chains: RevenueChain[]): Promise<T> {
  const rows = card.series?.bars || [];
  const chainBySlug = new Map(chains.map((chain) => [chain.slug, chain]));
  const statePath = chainRevenueLogoStatePath(String(card.datasetSlug || ""));
  const state = statePath ? await readState(statePath) : { ok: true as const, doc: {} as Record<string, unknown> };
  const cache = state.ok ? cacheFromState(state.doc) : {};
  type PlannedChain = ChainLogoPlanChain & { lookupNames: string[] };
  const onCard: PlannedChain[] = rows.map((row) => {
    const chain = chainBySlug.get(row.slug);
    return {
      slug: row.slug,
      name: row.name,
      logoKey: chain?.logoKey || row.slug,
      onCard: true,
      lookupNames: [chain?.name || "", row.name].filter(Boolean),
    };
  });
  const cardSlugs = new Set(onCard.map((chain) => chain.slug));
  const offCard: PlannedChain[] = Object.values(cache)
    .filter((entry): entry is ChainLogoCacheEntry => {
      if (!entry?.slug || cardSlugs.has(entry.slug)) return false;
      return chainLogoCacheEntryUsable(entry);
    })
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      logoKey: entry.slug,
      onCard: false,
      lookupNames: [entry.name].filter(Boolean),
    }));
  const plannedChains = [...onCard, ...offCard];
  const lookupNames = [...new Set(plannedChains.flatMap((chain) => [...chain.lookupNames, chain.slug]))];

  let dbAvailable = false;
  let overlay = new Map<string, string[]>();
  const warnings: string[] = [];
  try {
    overlay = await approvedLogoCandidateOverlay(lookupNames, { throwOnError: true });
    dbAvailable = true;
  } catch (error) {
    const message = "Chain revenue approved logos are unavailable; using the cached copy.";
    console.warn(message, error);
    warnings.push(message);
  }

  const approvedUrlBySlug: Record<string, string | null> = {};
  for (const chain of plannedChains) {
    approvedUrlBySlug[chain.slug] = dbAvailable ? approvedUrlFor(overlay, chain.lookupNames, chain.slug) : null;
  }

  const jobs = new Map<string, boolean>();
  for (const chain of plannedChains) {
    const approved = approvedUrlBySlug[chain.slug];
    if (approved) jobs.set(approved, true);
    if (chain.onCard === false) continue;
    const fixed = CURATED_CHAIN_LOGOS[chain.slug];
    if (fixed) jobs.set(fixed, false);
    jobs.set(defillamaChainLogoUrl(chain.logoKey || chain.slug), false);
  }
  const images: Record<string, CheckedChainLogo | null> = {};
  await Promise.all(
    [...jobs.entries()].map(async ([url, asDataUrl]) => {
      images[url] = await checkLogo(url, asDataUrl);
    }),
  );

  const plan = planChainRevenueLogos({
    chains: plannedChains,
    dbAvailable,
    approvedUrlBySlug,
    cache,
    images,
  });
  const logoWarnings = [...warnings, ...plan.warnings];
  for (const warning of logoWarnings) console.warn(warning);

  const logoSources = plan.choices.map(({ slug, name, source }) => ({ slug, name, source }));
  if (statePath && state.ok) {
    try {
      await writeState(statePath, state.doc, plan.cache, logoSources);
    } catch (error) {
      console.warn("Chain revenue logo cache was not saved.", error);
    }
  }

  const bySlug = new Map(plan.choices.map((choice) => [choice.slug, choice]));
  const leader = card.metadata?.leader;
  const leaderChoice = leader?.slug ? bySlug.get(leader.slug) : undefined;
  return {
    ...card,
    series: {
      ...card.series,
      bars: rows.map((row) => {
        const choice = bySlug.get(row.slug);
        return choice ? { ...row, logo: choice.url } : row;
      }),
    },
    metadata: {
      ...card.metadata,
      leader: leader ? { ...leader, logo: leaderChoice?.url || leader.logo } : leader,
      logoSources,
      logoWarnings,
    },
  } as T;
}
