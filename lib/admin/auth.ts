import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";

const COOKIE = "learndefi_admin";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SETUP_TOKEN || "learndefi-local-admin-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(":")[2];
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function adminConfigState() {
  return {
    hasDatabase: hasDatabaseConfig(),
    hasSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SETUP_TOKEN),
    hasBlob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };
}

export async function getSetting(key: string) {
  const result = await query<{ value: string }>("SELECT value FROM admin_settings WHERE key = $1 LIMIT 1", [key]);
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await query("INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
}

type AdminConfigDiagnostic = {
  hasDatabaseConfig: boolean;
  canReadAdminSettings: boolean;
  hasAdminPasswordHash: boolean;
  adminPasswordHashLength: number;
  errorMessage?: string;
};

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  return "Unknown admin configuration error";
}

async function readAdminPasswordHashLength() {
  const result = await query<{ value_length: number | string | null }>("SELECT char_length(value)::int AS value_length FROM admin_settings WHERE key = $1 LIMIT 1", ["admin_password_hash"]);
  const rawLength = result.rows[0]?.value_length;
  const length = typeof rawLength === "number" ? rawLength : Number(rawLength ?? 0);
  return Number.isFinite(length) ? length : 0;
}

export async function getAdminConfigDiagnostic(): Promise<AdminConfigDiagnostic> {
  if (!hasDatabaseConfig()) {
    return {
      hasDatabaseConfig: false,
      canReadAdminSettings: false,
      hasAdminPasswordHash: false,
      adminPasswordHashLength: 0,
    };
  }

  try {
    const adminPasswordHashLength = await readAdminPasswordHashLength();
    return {
      hasDatabaseConfig: true,
      canReadAdminSettings: true,
      hasAdminPasswordHash: adminPasswordHashLength > 0,
      adminPasswordHashLength,
    };
  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    console.error("Admin configured check failed", { errorMessage });
    return {
      hasDatabaseConfig: true,
      canReadAdminSettings: false,
      hasAdminPasswordHash: false,
      adminPasswordHashLength: 0,
      errorMessage,
    };
  }
}

export async function isAdminConfigured() {
  if (!hasDatabaseConfig()) return false;
  try {
    return (await readAdminPasswordHashLength()) > 0;
  } catch (error) {
    console.error("Admin configured check failed", { errorMessage: safeErrorMessage(error) });
    return false;
  }
}

export async function createAdminPassword(password: string) {
  await setSetting("admin_password_hash", hashPassword(password));
}

export async function validateAdminPassword(password: string) {
  try {
    const stored = await getSetting("admin_password_hash");
    return stored ? verifyPassword(password, stored) : false;
  } catch (error) {
    console.error("Admin login DB check failed", { errorMessage: safeErrorMessage(error) });
    return false;
  }
}

export function createSession() {
  const payload = `${Date.now()}:admin`;
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export function hasSession() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return false;
  const [time, role, signature] = raw.split(/[.:]/);
  const payload = `${time}:${role}`;
  if (!time || role !== "admin" || signature !== sign(payload)) return false;
  return Date.now() - Number(time) < 1000 * 60 * 60 * 8;
}

export async function requireAdmin() {
  if (!hasSession()) redirect("/admin/login");
}
