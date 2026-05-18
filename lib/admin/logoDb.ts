import "server-only";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";
import { getChainIdentity, getChainLogo } from "@/lib/chainLogos";
import { slugifyLogoKey, logoManifestBySlug } from "@/lib/logos/logoRegistry";
import { resolveCanonicalProviderState, sourceHasRealLogoUrl, sourceHasInvalidState } from "@/lib/admin/providerState";

export type AdminLogo = {
  id: string;
  slug: string;
  name: string;
  category: string;
  approved_logo_url: string | null;
  approved_source_id: string | null;
  status: "needs_review" | "approved" | "rejected";
  notes: string | null;
  coingecko_id?: string | null;
  coinmarketcap_id?: string | null;
  last_fetch_error?: string | null;
  last_fetch_provider?: string | null;
  last_fetch_at?: string | null;
  visual_status?: string | null;
  fallback_text?: string | null;
  fallback_color?: string | null;
  created_at?: string;
  updated_at?: string;
  fallback_logo_url?: string | null;
};

export type LogoSource = {
  id: string;
  logo_id: string;
  provider: string;
  source_url: string | null;
  image_url: string;
  blob_url: string | null;
  status: "candidate" | "approved" | "rejected";
  metadata: string | Record<string, unknown>;
  rejection_reason: string | null;
  created_at: string;
};

export function logoSlug(name: string) {
  return slugifyLogoKey(name);
}

const ADMIN_LOGO_SLUG_ALIASES: Record<string, string[]> = {
  polygon: ["matic-network"],
  "matic-network": ["polygon"],
  bsc: ["bnb-chain", "binance-smart-chain", "binancecoin"],
  "bnb-chain": ["bsc", "binance-smart-chain", "binancecoin"],
  binancecoin: ["bnb-chain", "bsc"],
  "binance-smart-chain": ["bsc", "bnb-chain"],
  optimism: ["op-mainnet"],
  "op-mainnet": ["optimism"],
  ripple: ["xrp-ledger", "xrp"],
  "xrp-ledger": ["ripple", "xrp"],
  xrp: ["ripple", "xrp-ledger"],
  filecoin: ["filecoin-chain"],
  "filecoin-chain": ["filecoin"],
  "render-network": ["render"],
  render: ["render-network"],
  ethereum: ["eth"],
  eth: ["ethereum"],
  solana: ["sol"],
  sol: ["solana"],
  arbitrum: ["arbitrum-one"],
  "arbitrum-one": ["arbitrum"],
  avalanche: ["avalanche-c-chain", "avax"],
  "avalanche-c-chain": ["avalanche", "avax"],
  avax: ["avalanche"],
  base: ["base-chain"],
  "base-chain": ["base"],
  sui: ["sui-network"],
  "sui-network": ["sui"],
  aptos: ["aptos-network"],
  "aptos-network": ["aptos"],
  hyperliquid: ["hyperliquid-l1"],
  "hyperliquid-l1": ["hyperliquid"],
  megaeth: ["mega-eth"],
  "mega-eth": ["megaeth"],
  eni: ["eni-token"],
  "eni-token": ["eni"],
  "bsv-blockchain": ["bsv", "bitcoin-sv"],
  bsv: ["bsv-blockchain", "bitcoin-sv"],
  "bitcoin-sv": ["bsv-blockchain", "bsv"],
};

function uniqueSlugs(slugs: string[]) {
  return Array.from(new Set(slugs.filter(Boolean)));
}

export function approvedLogoCandidateSlugs(name: string) {
  const directSlug = logoSlug(name);
  const identity = getChainIdentity(name);
  const identitySlugs = [identity.slug, ...identity.aliases.map(logoSlug)];
  const aliases = [directSlug, identity.slug, ...identitySlugs].flatMap((slug) => ADMIN_LOGO_SLUG_ALIASES[slug] ?? []);
  const secondPassAliases = aliases.flatMap((slug) => ADMIN_LOGO_SLUG_ALIASES[slug] ?? []);
  return uniqueSlugs([directSlug, ...identitySlugs, ...aliases, ...secondPassAliases]);
}


function metadataObject(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
}

function isManualOrUpload(provider: string) {
  return provider === "manual" || provider === "upload";
}

export function hasAdminChosenSource(sources: LogoSource[]) {
  return sources.some((source) => source.status === "approved" && (isManualOrUpload(source.provider) || metadataObject(source.metadata).approvalOrigin === "admin"));
}

export function sourceWasRejected(sources: LogoSource[], provider: string, imageUrl: string, sourceUrl?: string | null) {
  return sources.some((source) => source.provider === provider && source.status === "rejected" && source.image_url === imageUrl && (source.source_url || "") === (sourceUrl || ""));
}

export function canAutoApproveCoinGecko(logo: AdminLogo, sources: LogoSource[], imageUrl: string, sourceUrl?: string | null) {
  if (!imageUrl) return { ok: false, reason: "missing image URL" };
  if (logo.visual_status === "rejected") return { ok: false, reason: "visual rejected" };
  const registry = logoManifestBySlug.get(`${logo.category}:${logo.slug}`);
  if (registry?.visualRejected || registry?.fallbackPreferredUntilManualAsset) return { ok: false, reason: "visual rejected or fallback preferred" };
  if (sourceWasRejected(sources, "coingecko", imageUrl, sourceUrl)) return { ok: false, reason: "previously rejected" };
  if (hasAdminChosenSource(sources)) return { ok: false, reason: "admin-approved source exists" };
  if (["bsv", "bitcoin-sv", "bsv-blockchain"].includes(logo.slug)) return { ok: false, reason: "confusing BSV visual" };
  return { ok: true, reason: "safe CoinGecko primary source" };
}

export async function autoApproveSource(sourceId: string, reason = "safe CoinGecko primary source") {
  const result = await query<{ logo_id: string; source_id: string; approved_logo_url: string }>(
    `WITH chosen AS (
       UPDATE logo_sources
       SET status = 'approved',
           rejection_reason = NULL,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('approvalOrigin', 'auto', 'autoApproved', true, 'autoApproveReason', $2::text)
       WHERE id = $1
       RETURNING *
     ), updated_logo AS (
       UPDATE logos
       SET status = 'approved', approved_source_id = chosen.id, approved_logo_url = COALESCE(chosen.blob_url, chosen.image_url)
       FROM chosen
       WHERE logos.id = chosen.logo_id
       RETURNING logos.id AS logo_id, logos.approved_source_id AS source_id, logos.approved_logo_url
     )
     SELECT logo_id, source_id, approved_logo_url FROM updated_logo`,
    [sourceId, reason]
  );
  return result.rows[0] ?? null;
}

function withFallback(logo: AdminLogo): AdminLogo {
  return { ...logo, fallback_logo_url: getChainLogo(logo.name) };
}

export async function listLogos() {
  const result = await query<AdminLogo>("SELECT * FROM logos ORDER BY lower(name) ASC, slug ASC LIMIT 500");
  return { ...result, rows: result.rows.map(withFallback) };
}

export async function getLogo(slug: string) {
  const result = await query<AdminLogo>("SELECT * FROM logos WHERE slug = $1 LIMIT 1", [slug]);
  const logo = result.rows[0] ?? null;
  return logo ? withFallback(logo) : null;
}

export async function getLogoSources(logoId: string) {
  return query<LogoSource>("SELECT * FROM logo_sources WHERE logo_id = $1 ORDER BY created_at DESC", [logoId]);
}

export async function upsertLogo(name: string, category = "project") {
  const slug = logoSlug(name);
  const result = await query<AdminLogo>(
    `INSERT INTO logos (slug, name, category)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
     RETURNING *`,
    [slug, name.trim(), category]
  );
  return withFallback(result.rows[0]);
}

export async function addLogoSource(input: { logoId: string; provider: string; imageUrl: string; sourceUrl?: string | null; blobUrl?: string | null; metadata?: Record<string, unknown> }) {
  const result = await query<LogoSource>(
    `INSERT INTO logo_sources (logo_id, provider, source_url, image_url, blob_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [input.logoId, input.provider, input.sourceUrl ?? null, input.imageUrl, input.blobUrl ?? null, JSON.stringify(input.metadata ?? {})]
  );
  return result.rows[0];
}

export async function upsertLogoSource(input: {
  logoId: string;
  provider: string;
  imageUrl: string;
  sourceUrl?: string | null;
  blobUrl?: string | null;
  metadata?: Record<string, unknown>;
  status?: LogoSource["status"];
  reviveRejected?: boolean;
}) {
  const result = await query<LogoSource>(
    `WITH existing AS (
       SELECT id FROM logo_sources
       WHERE logo_id = $1
         AND provider = $2
         AND (
           (image_url = $4 AND COALESCE(source_url, '') = COALESCE($3, ''))
           OR (COALESCE(metadata->>'slug', '') <> '' AND COALESCE(metadata->>'slug', '') = COALESCE($6::jsonb->>'slug', ''))
           OR (provider = 'defillama' AND COALESCE(metadata->>'defillamaSlug', '') <> '' AND COALESCE(metadata->>'defillamaSlug', '') = COALESCE($6::jsonb->>'defillamaSlug', $6::jsonb->>'slug', ''))
           OR (provider = 'coinmarketcap' AND COALESCE(metadata->>'coinMarketCapId', metadata->>'cmcId', metadata->>'id', '') <> '' AND COALESCE(metadata->>'coinMarketCapId', metadata->>'cmcId', metadata->>'id', '') = COALESCE($6::jsonb->>'coinMarketCapId', $6::jsonb->>'cmcId', $6::jsonb->>'id', ''))
         )
       ORDER BY status = 'rejected', id ASC
       LIMIT 1
     ), updated AS (
       UPDATE logo_sources
       SET source_url = CASE WHEN logo_sources.status = 'rejected' AND NOT $8::boolean THEN logo_sources.source_url ELSE $3 END,
           image_url = CASE WHEN logo_sources.status = 'rejected' AND NOT $8::boolean THEN logo_sources.image_url ELSE $4 END,
           blob_url = CASE WHEN logo_sources.status = 'rejected' AND NOT $8::boolean THEN logo_sources.blob_url ELSE $5 END,
           metadata = CASE
             WHEN logo_sources.status = 'approved' AND COALESCE(logo_sources.metadata->>'reviewStatus', '') = 'reviewed'
               THEN COALESCE(logo_sources.metadata, '{}'::jsonb) || $6::jsonb || jsonb_build_object('reviewStatus', 'reviewed')
             ELSE COALESCE(logo_sources.metadata, '{}'::jsonb) || $6::jsonb
           END,
           status = CASE WHEN logo_sources.status = 'approved' THEN logo_sources.status WHEN logo_sources.status = 'rejected' AND $8::boolean THEN $7 ELSE CASE WHEN logo_sources.status = 'rejected' THEN logo_sources.status ELSE $7 END END,
           rejection_reason = CASE WHEN logo_sources.status = 'rejected' AND NOT $8::boolean THEN logo_sources.rejection_reason WHEN $7 = 'rejected' THEN logo_sources.rejection_reason ELSE NULL END
       WHERE id IN (SELECT id FROM existing)
       RETURNING *
     ), inserted AS (
       INSERT INTO logo_sources (logo_id, provider, source_url, image_url, blob_url, metadata, status)
       SELECT $1, $2, $3, $4, $5, $6::jsonb, $7
       WHERE NOT EXISTS (SELECT 1 FROM existing)
       RETURNING *
     )
     SELECT * FROM updated
     UNION ALL
     SELECT * FROM inserted
     LIMIT 1`,
    [input.logoId, input.provider, input.sourceUrl ?? null, input.imageUrl, input.blobUrl ?? null, JSON.stringify(input.metadata ?? {}), input.status ?? "candidate", Boolean(input.reviveRejected)]
  );
  return result.rows[0];
}

export async function listLogosForCoinGeckoBulk() {
  return query<AdminLogo>("SELECT * FROM logos WHERE status <> 'rejected' ORDER BY name ASC");
}

export async function getAllLogoSources() {
  return query<LogoSource>("SELECT * FROM logo_sources ORDER BY created_at DESC");
}

export async function setAdminSetting(key: string, value: string) {
  await query("INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
}

export async function getAdminSetting(key: string) {
  const result = await query<{ value: string }>("SELECT value FROM admin_settings WHERE key = $1 LIMIT 1", [key]);
  return result.rows[0]?.value ?? null;
}

export function logoProviderIdsSettingKey(slug: string) {
  return `logo_provider_ids:${slug}`;
}

export async function getSavedDefiLlamaSlug(slug: string) {
  const raw = await getAdminSetting(logoProviderIdsSettingKey(slug));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = typeof parsed.defillamaSlug === "string" ? parsed.defillamaSlug.trim() : "";
    return value || null;
  } catch {
    return null;
  }
}

export async function saveDefiLlamaSlug(slug: string, defillamaSlug: string) {
  await setAdminSetting(logoProviderIdsSettingKey(slug), JSON.stringify({ defillamaSlug: defillamaSlug.trim() || null, updatedAt: new Date().toISOString() }));
}

export async function updateLogoFetchState(slug: string, provider: string, error: string | null) {
  await query("UPDATE logos SET last_fetch_provider = $2, last_fetch_error = $3, last_fetch_at = NOW() WHERE slug = $1", [slug, provider, error]);
}

export async function updateLogoProviderId(slug: string, provider: "coingecko" | "coinmarketcap", providerId: string) {
  const column = provider === "coingecko" ? "coingecko_id" : "coinmarketcap_id";
  await query(`UPDATE logos SET ${column} = NULLIF($2, '') WHERE slug = $1`, [slug, providerId]);
}

export async function updateLogoFallback(slug: string, fallbackText: string, fallbackColor: string) {
  await query("UPDATE logos SET fallback_text = NULLIF($2, ''), fallback_color = NULLIF($3, '') WHERE slug = $1", [slug, fallbackText, fallbackColor]);
}

export async function updateLogoStatus(slug: string, status: "needs_review" | "approved" | "rejected", visualStatus?: string | null, notes?: string | null) {
  await query(
    "UPDATE logos SET status = $2, visual_status = COALESCE($3, visual_status), notes = COALESCE(NULLIF($4, ''), notes) WHERE slug = $1",
    [slug, status, visualStatus ?? null, notes ?? null]
  );
}

export async function approveSource(sourceId: string) {
  await query(
    `WITH chosen AS (
       UPDATE logo_sources SET status = 'approved', rejection_reason = NULL, metadata = COALESCE(metadata, '{}'::jsonb) || '{"approvalOrigin":"admin","reviewStatus":"reviewed"}'::jsonb WHERE id = $1 RETURNING *
     )
     UPDATE logos
     SET status = 'approved', approved_source_id = chosen.id, approved_logo_url = COALESCE(chosen.blob_url, chosen.image_url)
     FROM chosen
     WHERE logos.id = chosen.logo_id`,
    [sourceId]
  );
}

export async function selectSourceNeedsReview(sourceId: string, reason = "Auto-selected by source discovery") {
  await query(
    `WITH chosen AS (
       UPDATE logo_sources
       SET status = 'approved',
           rejection_reason = NULL,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('approvalOrigin', 'auto', 'reviewStatus', 'selected_needs_review', 'selectionReason', $2::text)
       WHERE id = $1 AND status <> 'rejected'
       RETURNING *
     )
     UPDATE logos
     SET status = 'needs_review', approved_source_id = chosen.id, approved_logo_url = COALESCE(chosen.blob_url, chosen.image_url)
     FROM chosen
     WHERE logos.id = chosen.logo_id`,
    [sourceId, reason]
  );
}

export async function getLogoSource(sourceId: string) {
  return (await query<LogoSource>("SELECT * FROM logo_sources WHERE id = $1 LIMIT 1", [sourceId])).rows[0] ?? null;
}

export async function rejectSource(sourceId: string, reason: string) {
  await query("UPDATE logo_sources SET status = 'rejected', rejection_reason = $2 WHERE id = $1", [sourceId, reason || "Rejected in admin review"]);
  await query("UPDATE logos SET status = 'needs_review', approved_source_id = NULL, approved_logo_url = NULL WHERE approved_source_id = $1", [sourceId]);
}

export async function rejectLogo(slug: string, reason: string) {
  await query("UPDATE logos SET status = 'rejected', notes = $2 WHERE slug = $1", [slug, reason || "Rejected in admin review"]);
}


function isReviewedMetadata(meta: Record<string, unknown>) {
  return meta.reviewStatus === "reviewed" || meta.approvalOrigin === "admin" || meta.autoApproved === true;
}

function isUnsafePublicMetadata(meta: Record<string, unknown>) {
  return Boolean(
    meta.unsafe === true ||
      meta.visualRejected === true ||
      meta.visuallyRejected === true ||
      meta.visualStatus === "visual_rejected" ||
      meta.reviewStatus === "selected_needs_review" ||
      meta.reviewStatus === "needs_review" ||
      meta.reviewStatus === "pending"
  );
}

export function sourcePublicUrl(source: LogoSource) {
  return source.blob_url || source.image_url || null;
}

export function sourceIsPublicCandidate(source: LogoSource, logo: Pick<AdminLogo, "approved_source_id">) {
  if (source.status !== "approved") return false;
  if (!sourceHasRealLogoUrl(source)) return false;
  if (sourceHasInvalidState(source)) return false;
  const meta = metadataObject(source.metadata);
  const reviewed = isReviewedMetadata(meta);
  const unsafe = isUnsafePublicMetadata(meta);
  if (unsafe && !reviewed) return false;
  if (isManualOrUpload(source.provider)) return logo.approved_source_id === source.id && reviewed;
  if (source.provider === "coingecko") return reviewed || meta.approvalOrigin === "auto" || meta.autoApproved === true;
  if (source.provider === "coinmarketcap" || source.provider === "defillama") return reviewed;
  if (source.provider === "managed-vault" || source.provider === "vault") return reviewed && (meta.optimized === true || meta.reason === "legacy-migration" || meta.copiedFromProvider);
  return false;
}

function orderedPublicSourceUrls(logo: Pick<AdminLogo, "approved_source_id">, sources: LogoSource[]) {
  const selected = sources.find((source) => source.id === logo.approved_source_id);
  const selectedPrimary =
    selected && sourceIsPublicCandidate(selected, logo) ? selected : null;
  const canonicalSource = (provider: string) => {
    const state = resolveCanonicalProviderState(sources, provider, logo);
    return state.state === "OK" && state.source && state.source.id !== selectedPrimary?.id && sourceIsPublicCandidate(state.source, logo)
      ? state.source
      : null;
  };
  const ordered = [
    selectedPrimary,
    canonicalSource("managed-vault"),
    canonicalSource("coingecko"),
    canonicalSource("coinmarketcap"),
    canonicalSource("defillama"),
  ];
  return uniqueSlugs(ordered.map((source) => (source ? sourcePublicUrl(source) || "" : "")));
}

export async function approvedLogoCandidateOverlay(names: string[]) {
  if (!hasDatabaseConfig() || names.length === 0) return new Map<string, string[]>();
  try {
    const candidatesByName = names.map((name) => approvedLogoCandidateSlugs(name));
    const slugs = uniqueSlugs(candidatesByName.flat());
    if (slugs.length === 0) return new Map<string, string[]>();

    const quoted = slugs.map((_, index) => `$${index + 1}`).join(", ");
    const logoResult = await query<AdminLogo>(`SELECT * FROM logos WHERE status = 'approved' AND slug IN (${quoted})`, slugs);
    const aliasResult = await query<AdminLogo & { alias: string }>(
      `SELECT l.*, a.alias
       FROM logo_aliases a
       JOIN logos l ON l.id = a.logo_id
       WHERE l.status = 'approved' AND a.alias IN (${quoted})`,
      slugs
    ).catch(() => ({ rows: [] as (AdminLogo & { alias: string })[] }));
    const logosBySlug = new Map<string, AdminLogo>();
    for (const row of logoResult.rows) logosBySlug.set(row.slug, row);
    for (const row of aliasResult.rows) logosBySlug.set(row.alias, row);
    const logoIds = uniqueSlugs([...logoResult.rows, ...aliasResult.rows].map((row) => String(row.id)));
    const sourcesByLogoId = new Map<string, LogoSource[]>();
    if (logoIds.length) {
      const idQuoted = logoIds.map((_, index) => `$${index + 1}`).join(", ");
      const sourceResult = await query<LogoSource>(`SELECT * FROM logo_sources WHERE logo_id IN (${idQuoted}) ORDER BY created_at ASC`, logoIds);
      for (const source of sourceResult.rows) {
        const list = sourcesByLogoId.get(String(source.logo_id)) ?? [];
        list.push(source);
        sourcesByLogoId.set(String(source.logo_id), list);
      }
    }

    const overlay = new Map<string, string[]>();
    for (const candidates of candidatesByName) {
      let urls: string[] = [];
      for (const slug of candidates) {
        const logo = logosBySlug.get(slug);
        if (!logo) continue;
        urls = orderedPublicSourceUrls(logo, sourcesByLogoId.get(String(logo.id)) ?? []);
        if (!urls.length && logo.approved_logo_url) urls = [logo.approved_logo_url];
        if (urls.length) break;
      }
      if (!urls.length) continue;
      for (const candidate of candidates) overlay.set(candidate, urls);
    }
    return overlay;
  } catch (error) {
    console.warn("Approved logo candidate overlay unavailable", error);
    return new Map<string, string[]>();
  }
}

export async function approvedLogoOverlay(names: string[]) {
  const candidateOverlay = await approvedLogoCandidateOverlay(names);
  const overlay = new Map<string, string>();
  for (const [slug, candidates] of candidateOverlay) {
    const first = candidates[0];
    if (first) overlay.set(slug, first);
  }
  return overlay;
}

export type LogoAlias = {
  id: string;
  logo_id: string;
  alias: string;
  source: string;
  metadata: string | Record<string, unknown>;
  created_at: string;
};

export async function ensureLogoAliasTable() {
  await query(`CREATE TABLE IF NOT EXISTS logo_aliases (
    id BIGSERIAL PRIMARY KEY,
    logo_id BIGINT NOT NULL REFERENCES logos(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'admin',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alias)
  )`);
}

export async function addLogoAlias(logoId: string, alias: string, source = "admin", metadata: Record<string, unknown> = {}) {
  await ensureLogoAliasTable();
  await query(
    `INSERT INTO logo_aliases (logo_id, alias, source, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (alias) DO UPDATE SET logo_id = EXCLUDED.logo_id, source = EXCLUDED.source, metadata = logo_aliases.metadata || EXCLUDED.metadata`,
    [logoId, logoSlug(alias), source, JSON.stringify(metadata)]
  );
}

export async function listLogoAliases(logoId?: string) {
  await ensureLogoAliasTable();
  return logoId
    ? query<LogoAlias>("SELECT * FROM logo_aliases WHERE logo_id = $1 ORDER BY alias ASC", [logoId])
    : query<LogoAlias>("SELECT * FROM logo_aliases ORDER BY alias ASC");
}

export async function dismissDuplicateWarning(logoId: string, duplicateLogoId: string) {
  await query(
    `UPDATE logos SET notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END || $2 WHERE id = $1`,
    [logoId, `duplicate_dismissed:${duplicateLogoId}`]
  );
}

export async function restoreSource(sourceId: string, useAsPrimary = false) {
  const result = await query<LogoSource>(
    `UPDATE logo_sources
     SET status = 'candidate', rejection_reason = NULL,
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('restoredAt', NOW()::text, 'restoredBy', 'admin')
     WHERE id = $1 AND status = 'rejected'
     RETURNING *`,
    [sourceId]
  );
  const source = result.rows[0] ?? null;
  if (source && useAsPrimary) await selectSourceNeedsReview(source.id, "Restored by admin; selected pending review");
  return source;
}

export async function findPossibleLogoDuplicates(logo: AdminLogo, sources: LogoSource[]) {
  const coingeckoIds = [logo.coingecko_id].filter(Boolean).map(String);
  const coinmarketcapIds = [logo.coinmarketcap_id].filter(Boolean).map(String);
  const sourceUrls = sources.flatMap((source) => [source.source_url, source.image_url]).filter(Boolean).map(String);
  const approvedLogoUrls = [logo.approved_logo_url].filter(Boolean).map(String);
  const aliases = approvedLogoCandidateSlugs(logo.name).filter((slug) => slug !== logo.slug);
  const normalizedName = logoSlug(logo.name).replace(/-/g, "");
  const params = [
    logo.id,
    normalizedName,
    JSON.stringify(coingeckoIds),
    JSON.stringify(coinmarketcapIds),
    JSON.stringify(sourceUrls),
    JSON.stringify(approvedLogoUrls),
    JSON.stringify(aliases),
  ];
  const result = await query<AdminLogo & { match_reason: string; match_confidence: string }>(
    `WITH matching_sources AS (
       SELECT logo_id
       FROM logo_sources
       WHERE (COALESCE(source_url, '') <> '' AND source_url IN (SELECT jsonb_array_elements_text($5::jsonb)))
          OR (COALESCE(image_url, '') <> '' AND image_url IN (SELECT jsonb_array_elements_text($5::jsonb)))
       GROUP BY logo_id
     )
     SELECT DISTINCT ON (l.id) l.*,
       CASE
         WHEN jsonb_array_length($3::jsonb) > 0 AND l.coingecko_id IN (SELECT jsonb_array_elements_text($3::jsonb)) THEN 'same CoinGecko ID'
         WHEN jsonb_array_length($4::jsonb) > 0 AND l.coinmarketcap_id IN (SELECT jsonb_array_elements_text($4::jsonb)) THEN 'same CoinMarketCap ID'
         WHEN jsonb_array_length($6::jsonb) > 0 AND l.approved_logo_url IN (SELECT jsonb_array_elements_text($6::jsonb)) THEN 'same approved logo URL'
         WHEN ms.logo_id IS NOT NULL THEN 'same exact source URL'
         WHEN l.slug IN (SELECT jsonb_array_elements_text($7::jsonb)) THEN 'name/slug alias'
         ELSE 'same normalized name'
       END AS match_reason,
       'high' AS match_confidence
     FROM logos l
     LEFT JOIN matching_sources ms ON ms.logo_id = l.id
     WHERE l.id <> $1
        AND (
         (jsonb_array_length($3::jsonb) > 0 AND l.coingecko_id IN (SELECT jsonb_array_elements_text($3::jsonb)))
         OR (jsonb_array_length($4::jsonb) > 0 AND l.coinmarketcap_id IN (SELECT jsonb_array_elements_text($4::jsonb)))
         OR (jsonb_array_length($6::jsonb) > 0 AND l.approved_logo_url IN (SELECT jsonb_array_elements_text($6::jsonb)))
         OR ms.logo_id IS NOT NULL
         OR l.slug IN (SELECT jsonb_array_elements_text($7::jsonb))
         OR regexp_replace(lower(l.name), '[^a-z0-9]+', '', 'g') = $2
       )
     ORDER BY l.id ASC
     LIMIT 8`,
    params
  );
  const dismissed = String(logo.notes || "");
  return result.rows.filter((row) => !dismissed.includes(`duplicate_dismissed:${row.id}`)).map(withFallback);
}


export { hasDatabaseConfig };
