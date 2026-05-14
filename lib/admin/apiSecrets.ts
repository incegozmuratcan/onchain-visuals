import "server-only";
import crypto from "crypto";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";

export type ApiProviderId = "coingecko" | "coinmarketcap" | "defillama";
export type ApiSecretSource = "admin" | "env" | "public" | "missing" | "disabled";

export type ApiSecretRecord = {
  provider: ApiProviderId;
  key_name: string;
  encrypted_value: string;
  masked_hint: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_error: string | null;
  updated_at: string | null;
};

const PROVIDER_ENV: Record<ApiProviderId, string> = {
  coingecko: "COINGECKO_DEMO_API_KEY",
  coinmarketcap: "COINMARKETCAP_API_KEY",
  defillama: "DEFILLAMA_API_KEY",
};

function encryptionKey() {
  const raw = process.env.ADMIN_ENCRYPTION_KEY || "";
  if (!raw) return null;
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptionAvailable() {
  return Boolean(encryptionKey());
}

function seal(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("ADMIN_ENCRYPTION_KEY is missing; admin-managed API key saves are disabled.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function open(sealed: string) {
  const key = encryptionKey();
  if (!key) throw new Error("ADMIN_ENCRYPTION_KEY is missing; encrypted API keys cannot be read.");
  const [version, ivRaw, tagRaw, ciphertextRaw] = sealed.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Encrypted API key has an unsupported format.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

function mask(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const end = trimmed.slice(-4);
  return `••••${end}`;
}

export function providerEnvVar(provider: ApiProviderId) {
  return PROVIDER_ENV[provider];
}

export async function listAdminApiSecrets() {
  if (!hasDatabaseConfig()) return [] as ApiSecretRecord[];
  try {
    const result = await query<ApiSecretRecord>("SELECT provider, key_name, encrypted_value, masked_hint, last_tested_at, last_test_status, last_error, updated_at FROM admin_api_secrets ORDER BY provider ASC", []);
    return result.rows;
  } catch {
    return [] as ApiSecretRecord[];
  }
}

export async function getAdminApiSecret(provider: ApiProviderId) {
  if (!hasDatabaseConfig()) return null;
  try {
    const result = await query<ApiSecretRecord>("SELECT provider, key_name, encrypted_value, masked_hint, last_tested_at, last_test_status, last_error, updated_at FROM admin_api_secrets WHERE provider = $1 LIMIT 1", [provider]);
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveAdminApiSecret(provider: ApiProviderId, value: string) {
  const clean = value.trim();
  if (!clean) throw new Error("Enter an API key before saving.");
  if (!hasDatabaseConfig()) throw new Error("DATABASE_URL is missing; API keys cannot be saved.");
  const keyName = providerEnvVar(provider);
  const encrypted = seal(clean);
  await query(
    `INSERT INTO admin_api_secrets (provider, key_name, encrypted_value, masked_hint, last_error)
     VALUES ($1, $2, $3, $4, NULL)
     ON CONFLICT (provider) DO UPDATE SET key_name = EXCLUDED.key_name, encrypted_value = EXCLUDED.encrypted_value, masked_hint = EXCLUDED.masked_hint, last_error = NULL, updated_at = NOW()`,
    [provider, keyName, encrypted, mask(clean)]
  );
}

export async function deleteAdminApiSecret(provider: ApiProviderId) {
  if (!hasDatabaseConfig()) throw new Error("DATABASE_URL is missing; API keys cannot be deleted.");
  await query("DELETE FROM admin_api_secrets WHERE provider = $1", [provider]);
}

export async function setAdminApiSecretTestResult(provider: ApiProviderId, ok: boolean, error: string | null) {
  if (!hasDatabaseConfig()) return;
  await query("UPDATE admin_api_secrets SET last_tested_at = NOW(), last_test_status = $2, last_error = $3 WHERE provider = $1", [provider, ok ? "ok" : "error", error]);
}

export async function resolveApiSecret(provider: ApiProviderId): Promise<{ value: string | null; source: ApiSecretSource; maskedHint: string | null; record: ApiSecretRecord | null }> {
  const record = await getAdminApiSecret(provider);
  if (record) {
    try {
      return { value: open(record.encrypted_value), source: "admin", maskedHint: record.masked_hint, record };
    } catch {
      return { value: null, source: "disabled", maskedHint: record.masked_hint, record };
    }
  }
  const envVar = providerEnvVar(provider);
  const envValue = process.env[envVar] || "";
  if (envValue) return { value: envValue, source: "env", maskedHint: mask(envValue), record: null };
  if (provider === "coingecko" || provider === "defillama") return { value: null, source: "public", maskedHint: null, record: null };
  return { value: null, source: "missing", maskedHint: null, record: null };
}
