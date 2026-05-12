import "server-only";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";
import { slugifyLogoKey } from "@/lib/logos/logoRegistry";

export type AdminLogo = {
  id: string;
  slug: string;
  name: string;
  category: string;
  approved_logo_url: string | null;
  approved_source_id: string | null;
  status: "needs_review" | "approved" | "rejected";
  notes: string | null;
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

export async function listLogos() {
  return query<AdminLogo>("SELECT * FROM logos ORDER BY status ASC, updated_at DESC, name ASC LIMIT 300");
}

export async function getLogo(slug: string) {
  const result = await query<AdminLogo>("SELECT * FROM logos WHERE slug = $1 LIMIT 1", [slug]);
  return result.rows[0] ?? null;
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
  return result.rows[0];
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

export async function approveSource(sourceId: string) {
  await query(
    `WITH chosen AS (
       UPDATE logo_sources SET status = 'approved', rejection_reason = NULL WHERE id = $1 RETURNING *
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
    const slugs = names.map(logoSlug);
    const quoted = slugs.map((_, index) => `$${index + 1}`).join(", ");
    const result = await query<{ slug: string; approved_logo_url: string }>(
      `SELECT slug, approved_logo_url FROM logos WHERE status = 'approved' AND approved_logo_url IS NOT NULL AND slug IN (${quoted})`,
      slugs
    );
    return new Map(result.rows.map((row) => [row.slug, row.approved_logo_url]));
  } catch {
    return new Map<string, string>();
  }
}

export { hasDatabaseConfig };
