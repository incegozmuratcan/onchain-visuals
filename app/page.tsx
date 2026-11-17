import { HomeClient } from "@/components/HomeClient";
import { getPublicBrandSettings } from "@/lib/brandSettings";

export const revalidate = 300;

export default async function Home() {
  const brand = await getPublicBrandSettings();
  return <HomeClient brand={brand} />;
}
