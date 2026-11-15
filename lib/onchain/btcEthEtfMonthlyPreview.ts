import { datasetRegistry } from "./registry";
import { buildBtcEthEtfMonthlyCard } from "./snapshots";
import { monthTradingDays } from "./btcEthEtfMonth";

type Issuer = [string, string, number];
type Day = [string, number, Issuer[]];

/**
 * May 2026 starts on Friday, so the first box is the single session "May 1".
 * Memorial Day (Monday May 25) is closed and is left out of "May 26–29".
 */
const SINGLE_DAY_NOW = new Date("2026-06-02T08:00:00.000Z");

/**
 * November 2026 closes Thursday Nov 26. That week keeps Mon–Wed and Fri,
 * labelled from the first trading day to the last ("Nov 23–27").
 */
const HOLIDAY_NOW = new Date("2026-12-02T08:00:00.000Z");

function session(asset: "BTC" | "ETH", days: Day[]) {
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

function filledMonth(
  asset: "BTC" | "ETH",
  year: number,
  monthIndex: number,
  daily: (date: string, index: number) => [number, Issuer[]],
): Day[] {
  return monthTradingDays(year, monthIndex).map((date, index) => {
    const [total, issuers] = daily(date, index);
    return [date, total, issuers];
  });
}

function mayBtc(): Day[] {
  const april = filledMonth("BTC", 2026, 3, () => [20_000_000, [["BlackRock", "IBIT", 20_000_000]]]);
  const may = filledMonth("BTC", 2026, 4, (date) => {
    if (date === "2026-05-01") return [48_000_000, [["BlackRock", "IBIT", 40_000_000], ["Fidelity", "FBTC", 8_000_000]]];
    if (date === "2026-05-26") {
      return [-90_000_000, [["BlackRock", "IBIT", -70_000_000], ["Fidelity", "FBTC", -20_000_000]]];
    }
    return [-12_000_000, [["BlackRock", "IBIT", -9_000_000], ["Fidelity", "FBTC", -3_000_000]]];
  });
  const history: Day[] = [["2024-01-11", 40_000_000_000, [["BlackRock", "IBIT", 40_000_000_000]]]];
  return [...history, ...april, ...may];
}

function mayEth(): Day[] {
  const april = filledMonth("ETH", 2026, 3, () => [8_000_000, [["BlackRock", "ETHA", 8_000_000]]]);
  const may = filledMonth("ETH", 2026, 4, (date) => {
    if (date === "2026-05-01") return [-15_000_000, [["BlackRock", "ETHA", -15_000_000]]];
    if (date === "2026-05-26") {
      return [-40_000_000, [["BlackRock", "ETHA", -28_000_000], ["Grayscale", "ETHE", -12_000_000]]];
    }
    return [-6_000_000, [["BlackRock", "ETHA", -4_000_000], ["BlackRock", "ETHB", -2_000_000]]];
  });
  const history: Day[] = [["2024-07-23", 8_000_000_000, [["BlackRock", "ETHA", 8_000_000_000]]]];
  return [...history, ...april, ...may];
}

function novemberBtc(): Day[] {
  const october = filledMonth("BTC", 2026, 9, () => [10_000_000, [["BlackRock", "IBIT", 10_000_000]]]);
  const november = filledMonth("BTC", 2026, 10, (date, index) => {
    const total = index % 2 === 0 ? -25_000_000 : 8_000_000;
    return [total, [["BlackRock", "IBIT", total]]];
  });
  return [...october, ...november];
}

function novemberEth(): Day[] {
  const october = filledMonth("ETH", 2026, 9, () => [4_000_000, [["BlackRock", "ETHA", 4_000_000]]]);
  const november = filledMonth("ETH", 2026, 10, (date, index) => {
    const total = index % 2 === 0 ? -9_000_000 : 3_000_000;
    return [
      total,
      [
        ["BlackRock", "ETHA", total],
        ["Morgan Stanley", "MSSE", 0],
      ],
    ];
  });
  return [...october, ...november];
}

function dataset() {
  const item = datasetRegistry.find((entry) => entry.slug === "btc-eth-etf-monthly-flowboard");
  if (!item) throw new Error("Monthly ETF dataset is not registered.");
  return item;
}

export function buildBtcEthEtfMonthlySingleDayPreview() {
  return buildBtcEthEtfMonthlyCard(
    dataset(),
    "monthly",
    session("BTC", mayBtc()),
    session("ETH", mayEth()),
    SINGLE_DAY_NOW,
  );
}

export function buildBtcEthEtfMonthlyHolidayPreview() {
  return buildBtcEthEtfMonthlyCard(
    dataset(),
    "monthly",
    session("BTC", novemberBtc()),
    session("ETH", novemberEth()),
    HOLIDAY_NOW,
  );
}
