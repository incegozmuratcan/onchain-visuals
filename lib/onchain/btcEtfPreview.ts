import { datasetRegistry } from "./registry";
import { buildBtcEtfDailyCard } from "./snapshots";

const latestPreviewDate = "2026-06-08";
const priorPreviewDate = "2026-06-07";

const latestPreviewIssuers = [
  ["BlackRock", "IBIT", -232_900_000],
  ["ARK 21Shares", "ARKB", 63_100_000],
  ["Fidelity", "FBTC", 59_400_000],
  ["Bitwise", "BITB", 14_100_000],
  ["MSBT", "MSBT", 4_900_000],
] as const;

const jun8PreviewRows = [
  {
    date: priorPreviewDate,
    asset: "BTC",
    issuer: "Total",
    ticker: "Total",
    flowUsd: 53_991_400_000,
    isTotal: true,
    rawValue: "53991.4",
  },
  {
    date: priorPreviewDate,
    asset: "BTC",
    issuer: "Historical completed rows",
    ticker: "HIST",
    flowUsd: 53_991_400_000,
    isTotal: false,
    rawValue: "53991.4",
  },
  {
    date: latestPreviewDate,
    asset: "BTC",
    issuer: "Total",
    ticker: "Total",
    flowUsd: -91_400_000,
    isTotal: true,
    rawValue: "-91.4",
  },
  ...latestPreviewIssuers.map(([issuer, ticker, flowUsd]) => ({
    date: latestPreviewDate,
    asset: "BTC",
    issuer,
    ticker,
    flowUsd,
    isTotal: false,
    rawValue: String(flowUsd / 1_000_000),
  })),
];

const oct30PreviewIssuers = [
  ["BlackRock", "IBIT", -233_700_000],
  ["Fidelity", "FBTC", -201_000_000],
  ["ARK 21Shares", "ARKB", -129_500_000],
  ["Grayscale GBTC", "GBTC", -53_300_000],
  ["Bitwise", "BITB", -25_700_000],
] as const;

function previewSnapshot(
  previewState: string,
  latestDate: string,
  priorDate: string,
  latestTotal: number,
  priorTotal: number,
  issuers: readonly (readonly [string, string, number])[],
) {
  const dataset = datasetRegistry.find((item) => item.slug === "btc-etf-flowboard");
  if (!dataset) return null;
  const snapshot = buildBtcEtfDailyCard(dataset, "daily", {
    url: `preview://btc-etf-flowboard/${previewState}`,
    data: {
      warnings: ["Preview data for local visual verification only."],
      rows: [
        {
          date: priorDate,
          asset: "BTC",
          issuer: "Total",
          ticker: "Total",
          flowUsd: priorTotal,
          isTotal: true,
          rawValue: String(priorTotal / 1_000_000),
        },
        {
          date: priorDate,
          asset: "BTC",
          issuer: "Historical completed rows",
          ticker: "HIST",
          flowUsd: priorTotal,
          isTotal: false,
          rawValue: String(priorTotal / 1_000_000),
        },
        {
          date: latestDate,
          asset: "BTC",
          issuer: "Total",
          ticker: "Total",
          flowUsd: latestTotal,
          isTotal: true,
          rawValue: String(latestTotal / 1_000_000),
        },
        ...issuers.map(([issuer, ticker, flowUsd]) => ({
          date: latestDate,
          asset: "BTC",
          issuer,
          ticker,
          flowUsd,
          isTotal: false,
          rawValue: String(flowUsd / 1_000_000),
        })),
      ],
    },
  });
  return {
    ...snapshot,
    freshness: {
      status: "fresh" as const,
      lastUpdatedAt: "2026-10-31T18:07:00.000Z",
      source: "Local preview mock",
      fallbackUsed: false,
      missingConfig: [],
      message: null,
    },
    metadata: {
      ...snapshot.metadata,
      previewState,
    },
  };
}

/** Wide-number fixture matching the Oct 30, 2026 reference card (`-$643.2M`, `IBIT -$233.7M`). */
export function buildBtcEtfOct30OutflowPreview() {
  return previewSnapshot(
    "oct30-outflow",
    "2026-10-30",
    "2026-10-29",
    -643_200_000,
    57_643_200_000,
    oct30PreviewIssuers,
  );
}

export function buildBtcEtfJun8OutflowPreview() {
  const dataset = datasetRegistry.find((item) => item.slug === "btc-etf-flowboard");
  if (!dataset) return null;
  const snapshot = buildBtcEtfDailyCard(dataset, "daily", {
    url: "preview://btc-etf-flowboard/jun8-outflow",
    data: {
      warnings: ["Preview data for local visual verification only."],
      rows: jun8PreviewRows,
    },
  });
  return {
    ...snapshot,
    freshness: {
      status: "fresh" as const,
      lastUpdatedAt: "2026-06-09T00:00:00.000Z",
      source: "Local preview mock",
      fallbackUsed: false,
      missingConfig: [],
      message: null,
    },
    metadata: {
      ...snapshot.metadata,
      previewState: "jun8-outflow",
    },
  };
}
