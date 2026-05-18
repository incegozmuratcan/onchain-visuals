import "server-only";
import type { LogoSource } from "@/lib/admin/logoDb";
import { slugText } from "@/lib/admin/providerScoring";
import { sourceMetadataObject } from "@/lib/admin/providerState";
import { searchDefiLlamaSources } from "@/lib/admin/defillamaResolver";

export type DefiLlamaSourceType = "chain-mirror" | "chain-icon" | "protocol-index" | "manual-reviewed" | "invalid";
export type DefiLlamaValidationResult = { valid: boolean; reason: string; sourceType: DefiLlamaSourceType; normalizedSourceSlug?: string; normalizedTargetSlugs?: string[]; isPlaceholder?: boolean; isMismatched?: boolean; isExternalProtocolIcon?: boolean; };
const AUTO_REVIEW_STATUSES = new Set(["selected_needs_review", "needs_review", "pending"]);

const SAFE_SUFFIX = ["network","chain","protocol","labs","foundation","dao","token"];
const PLACEHOLDER_PATTERNS = ["question-mark","question_mark","unknown-logo","placeholder","blank","empty","default-fallback","/api/chain-logo","generic"]

function isChainIconUrl(url: string) {
  return /https?:\/\/icons\.llama\.fi\/chains\/(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(url);
}

function isGuessedProtocolRow(sourceUrl: string, imageUrl: string) {
  return /defillama\.com\/protocol\//i.test(sourceUrl) && /https?:\/\/icons\.llama\.fi\/(?!chains\/)(?:rsz_)?[^/?#.]+\.[a-z0-9]+/i.test(imageUrl);
}

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

export function classifyDefiLlamaSourceV2(input: { logoName?: string; logoSlug?: string; logoCategory?: string; source: LogoSource | null | undefined; knownAliases?: string[]; }): DefiLlamaValidationResult {
  const source = input.source;
  if (!source || source.provider !== "defillama" || !source.id) return { valid:false, reason:"No persisted DefiLlama source row.", sourceType:"invalid" };
  const meta = sourceMetadataObject(source.metadata);
  const imageUrl = String(source.image_url||source.blob_url||"").trim();
  if (!imageUrl) return { valid:false, reason:"Invalid source: missing image URL.", sourceType:"invalid" };
  const sourceUrl = String(source.source_url||"").trim();
  const combined = [imageUrl, sourceUrl, JSON.stringify(meta)].join(" ").toLowerCase();
  const externalProtocolIcon = isExternalProtocolIcon(imageUrl);
  if (PLACEHOLDER_PATTERNS.some((p) => combined.includes(p))) return { valid:false, reason:"placeholder_image", sourceType:"invalid", isPlaceholder:true, isExternalProtocolIcon: externalProtocolIcon };

  const sourceSlug = slugText(String(meta.slug||meta.defillamaSlug||meta.savedProviderSlug||"") || slugFromUrl(sourceUrl) || slugFromUrl(imageUrl));
  const targetSlugs = uniq([
    slugText(input.logoSlug||""), slugText(input.logoName||""), ...(input.knownAliases||[]).map((a)=>slugText(a)),
  ]);
  const sourceOk = targetSlugs.some((t) => t && (sourceSlug===t || sourceSlug.startsWith(`${t}-`) && SAFE_SUFFIX.some((s)=>sourceSlug===`${t}-${s}`)));
  if (!sourceOk) return { valid:false, reason:"target_mismatch", sourceType:"invalid", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isMismatched:true, isExternalProtocolIcon: externalProtocolIcon };

  const reviewStatus = String(meta.reviewStatus || "").toLowerCase();
  const approvalOrigin = String(meta.approvalOrigin || "").toLowerCase();
  const adminReviewed = reviewStatus === "reviewed" || approvalOrigin === "admin";
  const chainMirror = imageUrl.startsWith("/logos/chains/") && /\/chains\/rsz_/i.test(sourceUrl);
  const chainIcon = isChainIconUrl(sourceUrl) || isChainIconUrl(imageUrl);
  if (adminReviewed) return { valid:true, reason:"admin_reviewed", sourceType:"manual-reviewed", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
  if (chainMirror) return { valid:true, reason:"valid_chain_mirror", sourceType:"chain-mirror", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
  if (chainIcon) return { valid:true, reason:"valid_chain_icon", sourceType:"chain-icon", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
  if (isGuessedProtocolRow(sourceUrl, imageUrl)) return { valid:false, reason:"old_guessed_protocol_source", sourceType:"invalid", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
  return { valid:true, reason:"valid_protocol_index_candidate", sourceType:"protocol-index", normalizedSourceSlug:sourceSlug, normalizedTargetSlugs:targetSlugs, isExternalProtocolIcon: externalProtocolIcon };
}

export function validateDefiLlamaSourceForLogo(input: { logoName?: string; logoSlug?: string; logoCategory?: string; source: LogoSource | null | undefined; knownAliases?: string[]; }): DefiLlamaValidationResult {
  return classifyDefiLlamaSourceV2(input);
}

export async function validateDefiLlamaSourceForLogoWithResolver(input: { logoName?: string; logoSlug?: string; logoCategory?: string; source: LogoSource | null | undefined; knownAliases?: string[]; }): Promise<DefiLlamaValidationResult> {
  const base = classifyDefiLlamaSourceV2(input);
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
  if (reliable) return { ...base, sourceType: base.sourceType === "invalid" ? "protocol-index" : base.sourceType, reason: "valid_protocol_index" };
  if (base.isExternalProtocolIcon) return { ...base, valid: false, reason: "placeholder_image", sourceType:"invalid", isPlaceholder: true };
  if (AUTO_REVIEW_STATUSES.has(reviewStatus)) return { ...base, valid: false, reason: "resolver_no_reliable_source", sourceType:"invalid" };
  return { ...base, valid: false, reason: "placeholder_or_unverified", sourceType:"invalid" };
}
