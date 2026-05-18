import "server-only";
import type { LogoSource } from "@/lib/admin/logoDb";
import { normalizeProviderText, slugText } from "@/lib/admin/providerScoring";
import { sourceMetadataObject } from "@/lib/admin/providerState";
import { searchDefiLlamaSources } from "@/lib/admin/defillamaResolver";

export type DefiLlamaValidationResult = { valid: boolean; reason: string; normalizedSourceSlug?: string; normalizedTargetSlugs?: string[]; isPlaceholder?: boolean; isMismatched?: boolean; isExternalProtocolIcon?: boolean };
const AUTO_REVIEW_STATUSES = new Set(["selected_needs_review", "needs_review", "pending"]);

const SAFE_SUFFIX = ["network","chain","protocol","labs","foundation","dao","token"];
const PLACEHOLDER_PATTERNS = ["question-mark","question_mark","unknown-logo","placeholder","blank","empty","default-fallback","/api/chain-logo","generic"]

function isExternalProtocolIcon(url: string) {
  return /https?:\/\/icons\.llama\.fi\/(?!chains\/)(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(url);
}

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
  const sourceUrl = String(source.source_url||"").trim();
  const combined = [imageUrl, sourceUrl, JSON.stringify(meta)].join(" ").toLowerCase();
  const externalProtocolIcon = isExternalProtocolIcon(imageUrl);
  if (PLACEHOLDER_PATTERNS.some((p) => combined.includes(p))) return { valid:false, reason:"placeholder_image", isPlaceholder:true, isExternalProtocolIcon: externalProtocolIcon };

  const sourceSlug = slugText(String(meta.slug||meta.defillamaSlug||meta.savedProviderSlug||"") || slugFromUrl(sourceUrl) || slugFromUrl(imageUrl));
  const targetSlugs = uniq([
    slugText(input.logoSlug||""), slugText(input.logoName||""), ...(input.knownAliases||[]).map((a)=>slugText(a)),
  ]);
  const sourceOk = targetSlugs.some((t) => t && (sourceSlug===t || sourceSlug.startsWith(`${t}-`) && SAFE_SUFFIX.some((s)=>sourceSlug===`${t}-${s}`)));
  if (!sourceOk) return { valid:false, reason:"target_mismatch", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isMismatched:true, isExternalProtocolIcon: externalProtocolIcon };
  return { valid:true, reason:"OK", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
}

export async function validateDefiLlamaSourceForLogoWithResolver(input: { logoName?: string; logoSlug?: string; logoCategory?: string; source: LogoSource | null | undefined; knownAliases?: string[]; }): Promise<DefiLlamaValidationResult> {
  const base = validateDefiLlamaSourceForLogo(input);
  if (!base.valid) return base;
  const source = input.source!;
  const meta = sourceMetadataObject(source.metadata);
  const reviewStatus = String(meta.reviewStatus || "").toLowerCase();
  const approvalOrigin = String(meta.approvalOrigin || "").toLowerCase();
  const adminReviewed = reviewStatus === "reviewed" && approvalOrigin === "admin";
  if (adminReviewed) return base;
  const query = String(meta.slug || meta.defillamaSlug || input.logoSlug || input.logoName || "").trim();
  const found = await searchDefiLlamaSources(query, { targetName: input.logoName, targetSlug: input.logoSlug, category: input.logoCategory, aliases: input.knownAliases || [] });
  const reliable = found.candidates.some((candidate) => candidate.recommended && candidate.confidence === "high");
  if (reliable) return base;
  if (base.isExternalProtocolIcon) return { ...base, valid: false, reason: "placeholder_image", isPlaceholder: true };
  if (AUTO_REVIEW_STATUSES.has(reviewStatus)) return { ...base, valid: false, reason: "resolver_no_reliable_source" };
  return { ...base, valid: false, reason: "placeholder_or_unverified" };
}
