import "server-only";
import { getChainIdentity } from "@/lib/chainLogos";
import type { ChainRevenueRow } from "@/lib/defillama";
import { getApprovedDbLogoMap } from "./logoData";

export async function applyApprovedDbLogos<T extends ChainRevenueRow>(rows: T[]): Promise<T[]> {
  const identities = rows.map((row) => getChainIdentity(row.name));
  const dbLogos = await getApprovedDbLogoMap(Array.from(new Set(identities.map((identity) => identity.slug))));
  if (dbLogos.size === 0) return rows;
  return rows.map((row, index) => {
    const dbLogo = dbLogos.get(identities[index]?.slug || "");
    return dbLogo ? { ...row, logo: dbLogo } : row;
  });
}
