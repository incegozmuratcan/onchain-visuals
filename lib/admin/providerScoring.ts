import "server-only";

const derivativeTerms = [
  "bridged",
  "wrapped",
  "staked",
  "staking",
  " lp",
  "-lp",
  "iou",
  "weth",
  "wbtc",
  "usdc",
  "usdt",
  "standard bridged",
];

export type ConfidenceLabel = "high" | "medium" | "low";

export function normalizeProviderText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugText(value: unknown) {
  return normalizeProviderText(value).replace(/\s+/g, "-");
}

export function isDerivativeProviderMatch(...values: unknown[]) {
  const haystack = values.map((value) => normalizeProviderText(value)).join(" ");
  return derivativeTerms.some((term) => haystack.includes(normalizeProviderText(term)));
}

export function scoreProviderCandidate(input: {
  query: string;
  targetName?: string | null;
  targetSlug?: string | null;
  candidateName?: string | null;
  candidateSlug?: string | null;
  candidateSymbol?: string | null;
  aliases?: string[];
  categoryMatch?: boolean;
}) {
  const names = [input.query, input.targetName, input.targetSlug]
    .filter(Boolean)
    .flatMap((value) => [normalizeProviderText(value), slugText(value)]);
  const targets = new Set([...names, ...(input.aliases ?? []).map(normalizeProviderText), ...(input.aliases ?? []).map(slugText)].filter(Boolean));
  const candidateName = normalizeProviderText(input.candidateName);
  const candidateSlug = slugText(input.candidateSlug || input.candidateName);
  const candidateSymbol = normalizeProviderText(input.candidateSymbol);
  let score = 0;
  const reasons: string[] = [];
  if (targets.has(candidateName) && candidateName) {
    score += 80;
    reasons.push("exact name");
  }
  if (targets.has(candidateSlug) && candidateSlug) {
    score += 75;
    reasons.push("exact slug");
  }
  if ((input.aliases ?? []).some((alias) => normalizeProviderText(alias) === candidateName || slugText(alias) === candidateSlug)) {
    score += 70;
    reasons.push("alias");
  }
  const normalizedQuery = normalizeProviderText(input.query);
  if (normalizedQuery && candidateName.includes(normalizedQuery)) {
    score += candidateName === normalizedQuery ? 35 : 16;
    reasons.push("name match");
  }
  if (normalizedQuery && candidateSlug.includes(slugText(input.query))) {
    score += candidateSlug === slugText(input.query) ? 35 : 12;
    reasons.push("slug match");
  }
  if (candidateSymbol && normalizedQuery === candidateSymbol) {
    score += 8;
    reasons.push("symbol only");
  }
  if (input.categoryMatch) {
    score += 8;
    reasons.push("category");
  }
  if (isDerivativeProviderMatch(input.candidateName, input.candidateSlug)) {
    score -= 65;
    reasons.push("derivative penalty");
  }
  score = Math.max(0, Math.min(100, score));
  const confidence: ConfidenceLabel = score >= 78 ? "high" : score >= 45 ? "medium" : "low";
  return { score, confidence, reasons };
}
