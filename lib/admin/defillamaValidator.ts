import "server-only";
import type { LogoSource } from "@/lib/admin/logoDb";
import { normalizeProviderText, slugText } from "@/lib/admin/providerScoring";
import { sourceMetadataObject } from "@/lib/admin/providerState";

export type DefiLlamaValidationResult = { valid: boolean; reason: string; normalizedSourceSlug?: string; normalizedTargetSlugs?: string[]; isPlaceholder?: boolean; isMismatched?: boolean };

const SAFE_SUFFIX = ["network","chain","protocol","labs","foundation","dao","token"];
const PLACEHOLDER_PATTERNS = ["question-mark","question_mark","unknown-logo","placeholder","blank","empty","default-fallback","/api/chain-logo","generic"];

function uniq(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function slugFromUrl(value: string) {
  const v = String(value||"").toLowerCase();
  const m1 = v.match(/defillama\.com\/(?:protocol|chain|stablecoin)\/([^/?#]+)/i);
  if (m1?.[1]) return slugText(m1[1]);
  const m2 = v.match(/icons\.llama\.fi\/(?:chains\/)?(?:rsz_)?([^/?#.]+)\.[a-z0-9]+/i);
  return m2?.[1] ? slugText(m2[1]) : "";
}

export function validateDefiLlamaSourceForLogo(input: { logoName?: string; logoSlug?: string; logoCategory?: string; source: LogoSource | null | undefined; knownAliases?: string[]; }): DefiLlamaValidationResult {
  const source = input.source;
  if (!source || source.provider !== "defillama" || !source.id) return { valid:false, reason:"No persisted DefiLlama source row." };
  const meta = sourceMetadataObject(source.metadata);
  const imageUrl = String(source.image_url||source.blob_url||"").trim();
  if (!imageUrl) return { valid:false, reason:"Invalid source: missing image URL." };
  const combined = [imageUrl, String(source.source_url||""), JSON.stringify(meta)].join(" ").toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((p) => combined.includes(p))) return { valid:false, reason:"Placeholder image", isPlaceholder:true };

  const sourceSlug = slugText(String(meta.slug||meta.defillamaSlug||meta.savedProviderSlug||"") || slugFromUrl(String(source.source_url||"")) || slugFromUrl(imageUrl));
  const targetSlugs = uniq([
    slugText(input.logoSlug||""), slugText(input.logoName||""), ...(input.knownAliases||[]).map((a)=>slugText(a)),
  ]);
  const sourceOk = targetSlugs.some((t) => t && (sourceSlug===t || sourceSlug.startsWith(`${t}-`) && SAFE_SUFFIX.some((s)=>sourceSlug===`${t}-${s}`)));
  if (!sourceOk) return { valid:false, reason:"Target mismatch", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isMismatched:true };
  return { valid:true, reason:"OK", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs };
}
