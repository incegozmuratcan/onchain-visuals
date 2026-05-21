const chooseReplacement = (sources) => {
  const pick = (providers) => sources.find((s) => providers.includes(s.provider) && ["approved", "candidate"].includes(s.status));
  return pick(["manual", "upload"]) || pick(["managed-vault", "vault"]) || pick(["coingecko"]) || pick(["coinmarketcap"]) || null;
};

const hardResetInternalSim = ({ logos, sources, settings }) => {
  const defillamaSources = sources.filter((s) => s.provider === "defillama");
  const defillamaSourceIds = new Set(defillamaSources.map((s) => s.id));
  const affectedLogoIds = [...new Set(defillamaSources.map((s) => s.logo_id))];
  let primariesRepaired = 0;
  let primariesCleared = 0;
  let savedSlugsCleared = 0;
  let summariesCleared = 0;

  const logosOut = logos.map((logo) => {
    if (!logo.approved_source_id || !defillamaSourceIds.has(logo.approved_source_id)) return { ...logo };
    const replacement = chooseReplacement(sources.filter((s) => s.logo_id === logo.id && s.provider !== "defillama"));
    if (replacement) {
      primariesRepaired += 1;
      return { ...logo, approved_source_id: replacement.id, status: "approved" };
    }
    primariesCleared += 1;
    return { ...logo, approved_source_id: null, status: "needs_review" };
  });

  const cleanedSettings = settings.map((row) => {
    if (row.key.startsWith("logo_provider_ids:")) {
      const parsed = JSON.parse(row.value || "{}");
      if (Object.prototype.hasOwnProperty.call(parsed, "defillamaSlug")) {
        delete parsed.defillamaSlug;
        savedSlugsCleared += 1;
      }
      return { ...row, value: JSON.stringify(parsed) };
    }
    if ((row.value || "").toLowerCase().includes("defillama")) {
      summariesCleared += 1;
      return { ...row, value: "" };
    }
    return row;
  });

  return {
    logosOut,
    sourcesOut: sources.filter((s) => s.provider !== "defillama"),
    cleanedSettings,
    summary: {
      defillamaRowsDeleted: defillamaSources.length,
      logosAffected: affectedLogoIds.length,
      primariesRepaired,
      primariesCleared,
      savedSlugsCleared,
      summariesCleared,
    },
  };
};

const logos = [
  { id: "l1", approved_source_id: "d1", status: "approved" },
  { id: "l2", approved_source_id: "d2", status: "approved" },
  { id: "l3", approved_source_id: "cg3", status: "approved" },
];
const sources = [
  { id: "d1", logo_id: "l1", provider: "defillama", status: "candidate" },
  { id: "d2", logo_id: "l2", provider: "defillama", status: "candidate" },
  { id: "cg1", logo_id: "l1", provider: "coingecko", status: "approved" },
  { id: "m1", logo_id: "l1", provider: "manual", status: "approved" },
  { id: "cmc2", logo_id: "l2", provider: "coinmarketcap", status: "rejected" },
  { id: "cg3", logo_id: "l3", provider: "coingecko", status: "approved" },
];
const settings = [
  { key: "logo_provider_ids:akash", value: JSON.stringify({ defillamaSlug: "akash", coinGeckoId: "akash-network" }) },
  { key: "last_defillama_discovery_summary", value: "defillama cached summary" },
  { key: "other_setting", value: "keep" },
];

const { logosOut, sourcesOut, cleanedSettings, summary } = hardResetInternalSim({ logos, sources, settings });

if (sourcesOut.some((s) => s.provider === "defillama")) throw new Error("DefiLlama rows were not deleted.");
if (sourcesOut.filter((s) => s.provider === "coingecko").length !== 2) throw new Error("Non-DefiLlama providers changed unexpectedly.");
if (logosOut.find((l) => l.id === "l1")?.approved_source_id !== "m1") throw new Error("Expected manual replacement priority for l1.");
if (logosOut.find((l) => l.id === "l2")?.approved_source_id !== null) throw new Error("Expected l2 primary cleared when only rejected backups remain.");
if (JSON.parse(cleanedSettings.find((r) => r.key === "logo_provider_ids:akash")?.value || "{}").defillamaSlug) throw new Error("Expected defillamaSlug removed from logo_provider_ids settings.");
if (cleanedSettings.find((r) => r.key === "last_defillama_discovery_summary")?.value !== "") throw new Error("Expected stale DefiLlama discovery summary to be cleared.");
if (summary.defillamaRowsDeleted !== 2 || summary.primariesRepaired !== 1 || summary.primariesCleared !== 1) throw new Error("Unexpected hard reset summary counters.");

const redirectingAction = async () => {
  throw new Error("NEXT_REDIRECT");
};
const combinedBroken = async () => {
  await redirectingAction();
  return "discover-ran";
};
let shortCircuited = false;
try {
  await combinedBroken();
} catch {
  shortCircuited = true;
}
if (!shortCircuited) throw new Error("Expected redirect-based action chain to short-circuit.");

console.log("DefiLlama hard reset verification passed (defillama-only delete, primary repair/clear, admin_settings key/value cleanup, and redirect short-circuit risk validated).\nUse internal non-redirecting functions for combined reset+rediscover to avoid short-circuiting.");
