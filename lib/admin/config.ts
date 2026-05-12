import type { AdminSetupStatus } from "./types";

export function getAdminSetupStatus(): AdminSetupStatus {
  const databaseUrl = Boolean(process.env.DATABASE_URL);
  const blobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const adminPassword = Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET);
  const coingeckoKey = Boolean(process.env.COINGECKO_DEMO_API_KEY);
  const sessionSecret = Boolean(process.env.ADMIN_SESSION_SECRET);
  const warnings: string[] = [];
  if (!databaseUrl) warnings.push("DATABASE_URL is missing; admin logo persistence and seed imports are disabled.");
  if (!blobToken) warnings.push("BLOB_READ_WRITE_TOKEN is missing; admin downloads/uploads cannot be stored in Vercel Blob.");
  if (!adminPassword) warnings.push("ADMIN_PASSWORD is missing; admin login is disabled.");
  if (!coingeckoKey) warnings.push("COINGECKO_DEMO_API_KEY is missing; CoinGecko refresh actions are disabled.");
  if (!sessionSecret) warnings.push("ADMIN_SESSION_SECRET is missing; using a deterministic development fallback for cookie signing.");
  return {
    databaseUrl,
    blobToken,
    adminPassword,
    coingeckoKey,
    sessionSecret,
    dbStatus: databaseUrl ? "configured" : "missing",
    blobStatus: blobToken ? "configured" : "missing",
    seedStatus: databaseUrl ? "ready" : "needs_database",
    warnings,
  };
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "";
}

export function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || `${process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "learnDefi-dev-admin"}:dev-session-fallback`;
}
