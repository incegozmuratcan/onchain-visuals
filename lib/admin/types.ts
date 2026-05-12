import type { LogoCategory } from "@/lib/logos/logoRegistry";

export type AdminLogoStatus = "approved" | "needs_review" | "missing" | "rejected";
export type AdminLogoVisualStatus = "accepted" | "fallback" | "visual_rejected" | "needs_review";
export type AdminLogoSourceStatus = "candidate" | "downloaded" | "failed" | "rejected" | "approved";

export type AdminLogoRecord = {
  id?: number;
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  aliases: string[];
  coingeckoId?: string | null;
  defillamaSlug?: string | null;
  status: AdminLogoStatus;
  visualStatus: AdminLogoVisualStatus;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  sourceNote?: string | null;
  rawUrl?: string | null;
  optimizedUrl?: string | null;
  localPath?: string | null;
  blobRawUrl?: string | null;
  blobOptimizedUrl?: string | null;
  fallbackText?: string | null;
  fallbackColor?: string | null;
  sha256?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  usedInMetrics: string[];
  lastSyncedAt?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminSetupStatus = {
  databaseUrl: boolean;
  blobToken: boolean;
  adminPassword: boolean;
  coingeckoKey: boolean;
  sessionSecret: boolean;
  dbStatus: "configured" | "missing" | "unavailable";
  blobStatus: "configured" | "missing";
  seedStatus: "unknown" | "ready" | "needs_database";
  warnings: string[];
};
