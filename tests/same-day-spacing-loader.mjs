import { importTs } from "./load-ts.mjs";

const spacing = await importTs("../lib/onchain/sameDaySpacing.ts");
export const assessSameDaySpacing = spacing.assessSameDaySpacing;
