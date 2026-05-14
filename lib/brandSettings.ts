import "server-only";
import { query, hasDatabaseConfig } from "@/lib/server/postgres";

import type { PublicBrandSettings } from "@/lib/brandTypes";

export const defaultBrandSettings: PublicBrandSettings = {
  siteName: "learnDeFi",
  shortName: "learnDeFi",
  mainSlogan: "Make DeFi data share-ready.",
  heroSubtitle: "Create clean, source-backed market cards from trusted crypto data.",
  supportingCopy: "Clean DeFi visuals. Simple explanations. Share-ready cards.",
  cardFooterText: "Source-backed DeFi market card",
  createdWithText: "Created with learnDeFi",
  metaDescription: "Create clean, source-backed market cards from trusted crypto data.",
  primaryLogo: "",
  darkLogo: "",
  iconMark: "",
  headerLogo: "",
  favicon: "",
  appleTouchIcon: "",
  xAvatar: "",
  xBanner: "",
  watermarkMark: "",
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validAssetUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";
  return raw.startsWith("/") || /^https:\/\//.test(raw) ? raw : "";
}

export function parseBrandSettings(raw: string | null): PublicBrandSettings {
  if (!raw) return defaultBrandSettings;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...defaultBrandSettings,
      siteName: cleanString(parsed.siteName) || defaultBrandSettings.siteName,
      shortName: cleanString(parsed.shortName) || cleanString(parsed.siteName) || defaultBrandSettings.shortName,
      mainSlogan: cleanString(parsed.mainSlogan) || defaultBrandSettings.mainSlogan,
      heroSubtitle: cleanString(parsed.heroSubtitle) || defaultBrandSettings.heroSubtitle,
      supportingCopy: cleanString(parsed.supportingCopy) || defaultBrandSettings.supportingCopy,
      cardFooterText: cleanString(parsed.cardFooterText) || defaultBrandSettings.cardFooterText,
      createdWithText: cleanString(parsed.createdWithText) || defaultBrandSettings.createdWithText,
      metaDescription: cleanString(parsed.metaDescription) || defaultBrandSettings.metaDescription,
      primaryLogo: validAssetUrl(parsed.primaryLogo),
      darkLogo: validAssetUrl(parsed.darkLogo),
      iconMark: validAssetUrl(parsed.iconMark),
      headerLogo: validAssetUrl(parsed.headerLogo),
      favicon: validAssetUrl(parsed.favicon),
      appleTouchIcon: validAssetUrl(parsed.appleTouchIcon),
      xAvatar: validAssetUrl(parsed.xAvatar),
      xBanner: validAssetUrl(parsed.xBanner),
      watermarkMark: validAssetUrl(parsed.watermarkMark),
      savedAt: cleanString(parsed.savedAt) || undefined,
    };
  } catch (error) {
    console.warn("Brand settings JSON could not be parsed; using defaults", error);
    return defaultBrandSettings;
  }
}

export async function getBrandSettings() {
  if (!hasDatabaseConfig()) return defaultBrandSettings;
  try {
    const result = await query<{ value: string }>("SELECT value FROM admin_settings WHERE key = $1 LIMIT 1", ["brand_settings"]);
    return parseBrandSettings(result.rows[0]?.value ?? null);
  } catch (error) {
    console.warn("Brand settings unavailable; using defaults", error);
    return defaultBrandSettings;
  }
}

export async function getPublicBrandSettings() {
  return getBrandSettings();
}
