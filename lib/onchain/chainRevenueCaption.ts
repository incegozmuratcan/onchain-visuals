type CaptionSnapshot = {
  datasetSlug?: string;
  metadata?: { latestCompletedDate?: string | null; layout?: string };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Plain question in simple English so X's translate button reads cleanly in any
 * language. The card carries the numbers. No hashtags, cashtags, or emoji.
 */
export const CHAIN_REVENUE_DAILY_CAPTION = "How much revenue did blockchains generate yesterday?";

/** X counts supplementary-plane emoji as two characters. */
export function xWeightedLength(text: string) {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    length += code > 0xffff ? 2 : 1;
  }
  return length;
}

export function buildChainRevenueDailyCaption(snapshot: CaptionSnapshot) {
  if (!DATE_RE.test(String(snapshot?.metadata?.latestCompletedDate || ""))) {
    throw new Error("Chain Revenue caption requires the completed UTC day on the card.");
  }
  return CHAIN_REVENUE_DAILY_CAPTION;
}
