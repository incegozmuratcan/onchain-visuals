export type Timeframe = "24h" | "7d" | "30d";

export type ParsedQuery = {
  limit: number;
  timeframe: Timeframe;
  metric: "chain_revenue";
};

export function parsePrompt(input: string): ParsedQuery {
  const text = input.toLowerCase();
  const limitMatch = text.match(/top\s+(\d+)|first\s+(\d+)|(\d+)\s+chains?/);
  const requestedLimit = Number(limitMatch?.[1] || limitMatch?.[2] || limitMatch?.[3] || 10);
  const limit = Math.min(Math.max(requestedLimit || 10, 3), 30);

  let timeframe: Timeframe = "30d";
  if (/(1d|24h|daily|today|bugün|son 24)/.test(text)) timeframe = "24h";
  if (/(7d|week|weekly|hafta|son 7)/.test(text)) timeframe = "7d";
  if (/(30d|month|monthly|aylık|son 30)/.test(text)) timeframe = "30d";

  return { limit, timeframe, metric: "chain_revenue" };
}
