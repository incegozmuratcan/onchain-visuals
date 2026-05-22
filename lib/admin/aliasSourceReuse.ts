import { buildProviderAliasSet } from "@/lib/admin/providerAliases";
import { canAutoApproveCoinGecko, type AdminLogo, type LogoSource } from "@/lib/admin/logoDb";
import { sourceHasInvalidState, sourceHasRealLogoUrl } from "@/lib/admin/providerState";

const REUSE_PROVIDERS = new Set(["coingecko", "coinmarketcap", "defillama", "managed-vault"]);

type ReuseCandidate = { source: LogoSource; sibling: AdminLogo; aliasReason: string };

const str = (v: unknown) => String(v || "").trim().toLowerCase();
const sluggy = (v: unknown) => str(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function metadataObj(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try { return JSON.parse(metadata) || {}; } catch { return {}; }
  }
  return metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
}

function isReusableSource(source: LogoSource) {
  if (!REUSE_PROVIDERS.has(source.provider)) return false;
  if (source.status === "rejected") return false;
  if (sourceHasInvalidState(source)) return false;
  if (!sourceHasRealLogoUrl(source)) return false;
  const m = metadataObj(source.metadata);
  if (m.placeholderImage || m.placeholder || m.generatedFallback || m.invalidForTarget) return false;
  return true;
}

export function findAliasSiblingLogoSources(targetLogo: AdminLogo, allLogos: AdminLogo[], allSources: LogoSource[]): ReuseCandidate[] {
  const alias = buildProviderAliasSet({ name: targetLogo.name, slug: targetLogo.slug, knownAliases: [targetLogo.coingecko_id || "", targetLogo.coinmarketcap_id || ""] });
  const aliasTokens = new Set(alias.aliases.flatMap((a) => [str(a), sluggy(a)]).filter(Boolean));
  const sourceByLogo = new Map<string, LogoSource[]>();
  allSources.forEach((s) => { const arr = sourceByLogo.get(s.logo_id) ?? []; arr.push(s); sourceByLogo.set(s.logo_id, arr); });
  const out: ReuseCandidate[] = [];
  for (const sibling of allLogos) {
    if (sibling.id === targetLogo.id) continue;
    const siblingTokens = [sibling.slug, sibling.name, sibling.coingecko_id || "", sibling.coinmarketcap_id || ""].flatMap((v) => [str(v), sluggy(v)]).filter(Boolean);
    const reason = siblingTokens.find((t) => aliasTokens.has(t));
    if (!reason) continue;
    const isRenderPair =
      new Set([targetLogo.slug, sibling.slug]).has("render") &&
      new Set([targetLogo.slug, sibling.slug]).has("render-network");
    for (const src of sourceByLogo.get(sibling.id) ?? []) {
      if (isReusableSource(src)) out.push({ source: src, sibling, aliasReason: isRenderPair ? "render/render-network alias" : `matched:${reason}` });
    }
  }
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = `${r.source.provider}|${r.source.image_url}|${r.source.source_url || ""}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

export function resolveAliasReuseStatus(targetLogo: AdminLogo, existing: LogoSource[], reused: LogoSource) {
  if (reused.provider !== "coingecko") return "candidate" as const;
  const auto = canAutoApproveCoinGecko(targetLogo, existing, reused.image_url, reused.source_url);
  return auto.ok && !existing.some((s) => s.status === "approved") ? "approved" as const : "candidate" as const;
}
