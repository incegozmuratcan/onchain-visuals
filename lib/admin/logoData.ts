import "server-only";
import { logoRegistry, type LogoRegistryEntry } from "@/lib/logos/logoRegistry";
import { logoSourceManifestByKey } from "@/lib/logos/logoSourceManifest";
import { metricLogoRequirements } from "@/lib/logos/metricLogoRequirements";
import { queryJson, isDatabaseConfigured } from "./db";
import type { AdminLogoRecord, AdminLogoStatus, AdminLogoVisualStatus } from "./types";

const COINGECKO_IDS: Record<string, string> = {
  polygon: "polygon",
  solana: "solana",
  cardano: "cardano",
  near: "near",
  "internet-computer": "internet-computer",
  injective: "injective-protocol",
  "bsv-blockchain": "bitcoin-sv",
  hyperliquid: "hyperliquid",
  filecoin: "filecoin",
  stellar: "stellar",
  sui: "sui",
  avalanche: "avalanche-2",
  tron: "tron",
  bnb: "binancecoin",
  bsc: "binancecoin",
  ethereum: "ethereum",
  arbitrum: "arbitrum",
  optimism: "optimism",
  ton: "the-open-network",
};

const DEFILLAMA_IDS: Record<string, string> = { bsc: "bsc" };

function metricUsage(slug: string, category: string) {
  return Object.entries(metricLogoRequirements)
    .filter(([, requirement]) => requirement.category === category && requirement.requiredSlugs.includes(slug))
    .map(([key]) => key);
}

function statusFromEntry(entry: LogoRegistryEntry): AdminLogoStatus {
  if (entry.visualRejected) return "missing";
  if (entry.quality === "approved") return "approved";
  if (entry.quality === "needs-review") return "needs_review";
  if (entry.quality === "rejected") return "rejected";
  return "missing";
}

function visualStatusFromEntry(entry: LogoRegistryEntry): AdminLogoVisualStatus {
  if (entry.visualRejected) return "visual_rejected";
  if (entry.quality === "approved") return "accepted";
  if (entry.localPath?.startsWith("/api/chain-logo") || entry.fallbackPreferredUntilManualAsset) return "fallback";
  return "needs_review";
}

export function fallbackLogoRecord(entry: LogoRegistryEntry): AdminLogoRecord {
  const source = logoSourceManifestByKey.get(`${entry.category}:${entry.slug}`);
  const status = statusFromEntry(entry);
  const visualStatus = visualStatusFromEntry(entry);
  return {
    canonicalName: entry.canonicalName,
    slug: entry.slug,
    category: entry.category,
    aliases: entry.aliases,
    coingeckoId: COINGECKO_IDS[entry.slug] ?? null,
    defillamaSlug: DEFILLAMA_IDS[entry.slug] ?? entry.slug,
    status,
    visualStatus,
    sourceProvider: source?.sourceProvider ?? entry.sourceType ?? null,
    sourceUrl: source?.sourceUrl ?? entry.sourceUrl ?? null,
    sourceNote: source?.sourceNote ?? entry.sourceNote ?? null,
    rawUrl: source?.rawPath ?? null,
    optimizedUrl: status === "approved" && visualStatus === "accepted" ? source?.localPath ?? entry.localPath : null,
    localPath: entry.localPath,
    blobRawUrl: null,
    blobOptimizedUrl: null,
    fallbackText: fallbackText(entry.canonicalName),
    fallbackColor: entry.background ?? deterministicColor(entry.slug),
    sha256: source?.sha256 ?? null,
    width: source?.width ?? null,
    height: source?.height ?? null,
    fileSize: null,
    mimeType: source?.originalContentType ?? null,
    usedInMetrics: metricUsage(entry.slug, entry.category),
    lastSyncedAt: source?.downloadedAt ?? null,
    approvedAt: source?.approvalStatus === "approved" && !source.visualRejected ? source.downloadedAt : null,
    rejectedReason: entry.visualRejectReason ?? source?.visualRejectReason ?? null,
    notes: entry.notes,
    createdAt: null,
    updatedAt: null,
  };
}

export function getFallbackLogoRecords() {
  return logoRegistry.map(fallbackLogoRecord).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

export async function getAdminLogos() {
  if (!isDatabaseConfigured()) return getFallbackLogoRecords();
  try {
    const rows = await queryJson<any>(`select id, canonical_name as "canonicalName", slug, category, aliases, coingecko_id as "coingeckoId", defillama_slug as "defillamaSlug", status, visual_status as "visualStatus", source_provider as "sourceProvider", source_url as "sourceUrl", source_note as "sourceNote", raw_url as "rawUrl", optimized_url as "optimizedUrl", local_path as "localPath", blob_raw_url as "blobRawUrl", blob_optimized_url as "blobOptimizedUrl", fallback_text as "fallbackText", fallback_color as "fallbackColor", sha256, width, height, file_size as "fileSize", mime_type as "mimeType", used_in_metrics as "usedInMetrics", last_synced_at as "lastSyncedAt", approved_at as "approvedAt", rejected_reason as "rejectedReason", notes, created_at as "createdAt", updated_at as "updatedAt" from logos order by canonical_name`);
    return rows.length ? rows.map(normalizeDbRow) : getFallbackLogoRecords();
  } catch {
    return getFallbackLogoRecords();
  }
}

export async function getAdminLogo(slug: string) {
  const logos = await getAdminLogos();
  return logos.find((logo) => logo.slug === slug) ?? null;
}

export async function getApprovedDbLogoMap(slugs: string[]) {
  if (!isDatabaseConfigured() || slugs.length === 0) return new Map<string, string>();
  try {
    const quoted = slugs.map((slug) => `'${slug.replace(/'/g, "''")}'`).join(",");
    const rows = await queryJson<{ slug: string; url: string }>(`select slug, coalesce(blob_optimized_url, optimized_url) as url from logos where status = 'approved' and visual_status = 'accepted' and coalesce(blob_optimized_url, optimized_url) is not null and slug in (${quoted})`);
    return new Map(rows.filter((row) => Boolean(row.url)).map((row) => [row.slug, row.url]));
  } catch {
    return new Map<string, string>();
  }
}

function normalizeDbRow(row: any): AdminLogoRecord {
  return { ...row, aliases: Array.isArray(row.aliases) ? row.aliases : [], usedInMetrics: Array.isArray(row.usedInMetrics) ? row.usedInMetrics : [] };
}

function fallbackText(name: string) {
  const compact = name.replace(/blockchain|network|chain/gi, "").trim();
  return compact.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || name.slice(0, 3).toUpperCase();
}

function deterministicColor(slug: string) {
  const colors = ["#0f172a", "#1e293b", "#334155", "#155e75", "#166534", "#4c1d95", "#7f1d1d"];
  const sum = Array.from(slug).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}
