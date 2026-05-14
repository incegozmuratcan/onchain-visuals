import "server-only";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";
import { getChainIdentity, getChainLogo } from "@/lib/chainLogos";
import { slugifyLogoKey, logoManifestBySlug } from "@/lib/logos/logoRegistry";

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

export async function autoApproveSource(sourceId: string) {
  await query(
    `WITH chosen AS (
       UPDATE logo_sources
       SET status = 'approved', rejection_reason = NULL, metadata = COALESCE(metadata, '{}'::jsonb) || '{"approvalOrigin":"auto","autoApproved":true}'::jsonb
       WHERE id = $1 RETURNING *
     )
     UPDATE logos
     SET status = 'approved', approved_source_id = chosen.id, approved_logo_url = COALESCE(chosen.blob_url, chosen.image_url)
     FROM chosen
     WHERE logos.id = chosen.logo_id`,
    [sourceId]
  );
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
}) {
  const result = await query<LogoSource>(
    `WITH existing AS (
       SELECT id FROM logo_sources
       WHERE logo_id = $1 AND provider = $2 AND image_url = $4 AND COALESCE(source_url, '') = COALESCE($3, '')
       ORDER BY id ASC
       LIMIT 1
     ), updated AS (
       UPDATE logo_sources
       SET blob_url = $5,
           metadata = COALESCE(logo_sources.metadata, '{}'::jsonb) || $6::jsonb,
           status = CASE WHEN logo_sources.status IN ('approved', 'rejected') THEN logo_sources.status ELSE $7 END,
           rejection_reason = CASE WHEN $7 = 'rejected' THEN logo_sources.rejection_reason ELSE NULL END
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
    [input.logoId, input.provider, input.sourceUrl ?? null, input.imageUrl, input.blobUrl ?? null, JSON.stringify(input.metadata ?? {}), input.status ?? "candidate"]
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
  const source = (await query<LogoSource>("SELECT * FROM logo_sources WHERE id = $1 LIMIT 1", [sourceId])).rows[0];
  if (source?.provider === "coinmarketcap" && !source.blob_url) {
    throw new Error("CoinMarketCap candidates must be copied to Blob/local storage before approval so public cards do not hotlink CMC logos.");
  }
  await query(
    `WITH chosen AS (
       UPDATE logo_sources SET status = 'approved', rejection_reason = NULL, metadata = COALESCE(metadata, '{}'::jsonb) || '{"approvalOrigin":"admin"}'::jsonb WHERE id = $1 RETURNING *
     )
     UPDATE logos
     SET status = 'approved', approved_source_id = chosen.id, approved_logo_url = COALESCE(chosen.blob_url, chosen.image_url)
     FROM chosen
     WHERE logos.id = chosen.logo_id`,
    [sourceId]
  );
}

export async function rejectSource(sourceId: string, reason: string) {
  await query("UPDATE logo_sources SET status = 'rejected', rejection_reason = $2 WHERE id = $1", [sourceId, reason || "Rejected in admin review"]);
}

export async function rejectLogo(slug: string, reason: string) {
  await query("UPDATE logos SET status = 'rejected', notes = $2 WHERE slug = $1", [slug, reason || "Rejected in admin review"]);
}

export async function approvedLogoOverlay(names: string[]) {
  if (!hasDatabaseConfig() || names.length === 0) return new Map<string, string>();
  try {
    const candidatesByName = names.map((name) => approvedLogoCandidateSlugs(name));
    const slugs = uniqueSlugs(candidatesByName.flat());
    if (slugs.length === 0) return new Map<string, string>();

    const quoted = slugs.map((_, index) => `$${index + 1}`).join(", ");
    const result = await query<{ slug: string; approved_logo_url: string }>(
      `SELECT slug, approved_logo_url FROM logos WHERE status = 'approved' AND approved_logo_url IS NOT NULL AND slug IN (${quoted})`,
      slugs
    );
    const approvedBySlug = new Map(result.rows.map((row) => [row.slug, row.approved_logo_url]));
    const overlay = new Map<string, string>();

    for (const candidates of candidatesByName) {
      const approvedLogo = candidates.map((slug) => approvedBySlug.get(slug)).find(Boolean);
      if (!approvedLogo) continue;
      for (const candidate of candidates) overlay.set(candidate, approvedLogo);
    }

    return overlay;
  } catch (error) {
    console.warn("Approved logo overlay unavailable", error);
    return new Map<string, string>();
  }
}

export { hasDatabaseConfig };
