import { datasetRegistry } from "./registry";
import { buildBtcEthEtfWeeklyCard } from "./snapshots";

/**
 * Thanksgiving week 2026: Thursday Nov 26 is closed, so the card shows
 * Mon, Tue, Wed, and Fri only. Used by the lab preview and the holiday capture.
 */
const HOLIDAY_NOW = new Date("2026-11-29T18:00:00.000Z");

function session(asset: "BTC" | "ETH", days: Array<[string, number, Array<[string, string, number]>]>) {
  return {
    url: `https://farside.co.uk/${asset === "BTC" ? "bitcoin" : "ethereum"}-etf-flow-all-data/`,
    data: {
      warnings: [],
      rows: days.flatMap(([date, total, issuers]) => [
        {
          date,
          asset,
          issuer: "Total",
          ticker: "Total",
          flowUsd: total,
          isTotal: true,
          rawValue: String(total / 1_000_000),
        },
        ...issuers.map(([issuer, ticker, flowUsd]) => ({
          date,
          asset,
          issuer,
          ticker,
          flowUsd,
          isTotal: false,
          rawValue: String(flowUsd / 1_000_000),
        })),
      ]),
    },
  };
}

const btcDays: Array<[string, number, Array<[string, string, number]>]> = [
  ["2026-11-16", -80_000_000, [["BlackRock", "IBIT", -80_000_000]]],
  ["2026-11-17", -40_000_000, [["BlackRock", "IBIT", -40_000_000]]],
  ["2026-11-18", 20_000_000, [["Fidelity", "FBTC", 20_000_000]]],
  ["2026-11-19", -30_000_000, [["BlackRock", "IBIT", -30_000_000]]],
  ["2026-11-20", -20_000_000, [["Grayscale GBTC", "GBTC", -20_000_000]]],
  ["2026-11-23", -210_000_000, [["BlackRock", "IBIT", -180_000_000], ["Fidelity", "FBTC", -30_000_000]]],
  ["2026-11-24", -90_000_000, [["BlackRock", "IBIT", -70_000_000], ["Fidelity", "FBTC", -20_000_000]]],
  ["2026-11-25", 40_000_000, [["Fidelity", "FBTC", 55_000_000], ["Grayscale GBTC", "GBTC", -15_000_000]]],
  ["2026-11-27", -120_000_000, [["BlackRock", "IBIT", -100_000_000], ["Grayscale GBTC", "GBTC", -20_000_000]]],
];

const ethDays: Array<[string, number, Array<[string, string, number]>]> = [
  ["2026-11-16", -25_000_000, [["BlackRock", "ETHA", -25_000_000]]],
  ["2026-11-17", -15_000_000, [["BlackRock", "ETHA", -15_000_000]]],
  ["2026-11-18", 10_000_000, [["Fidelity", "FETH", 10_000_000]]],
  ["2026-11-19", -12_000_000, [["BlackRock", "ETHA", -12_000_000]]],
  ["2026-11-20", -8_000_000, [["BlackRock", "ETHB", -8_000_000]]],
  ["2026-11-23", -60_000_000, [["BlackRock", "ETHA", -45_000_000], ["Fidelity", "FETH", -15_000_000]]],
  ["2026-11-24", -20_000_000, [["BlackRock", "ETHA", -20_000_000]]],
  ["2026-11-25", 18_000_000, [["Fidelity", "FETH", 18_000_000]]],
  ["2026-11-27", -35_000_000, [["BlackRock", "ETHA", -28_000_000], ["BlackRock", "ETHB", -7_000_000]]],
];

export function buildBtcEthEtfWeeklyHolidayPreview() {
  const dataset = datasetRegistry.find((item) => item.slug === "btc-eth-etf-weekly-flowboard");
  if (!dataset) throw new Error("Weekly ETF dataset is not registered.");
  return buildBtcEthEtfWeeklyCard(
    dataset,
    "weekly",
    session("BTC", btcDays),
    session("ETH", ethDays),
    HOLIDAY_NOW,
  );
}
