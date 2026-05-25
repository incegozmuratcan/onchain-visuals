import type { Metadata } from "next";
import { getPublicBrandSettings } from "@/lib/brandSettings";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPublicBrandSettings();
  return {
    title: brand.siteName,
    description: brand.metaDescription,
    openGraph: {
      title: brand.siteName,
      description: brand.metaDescription,
      siteName: brand.siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: brand.siteName,
      description: brand.metaDescription,
    },
    icons: {
      ...(brand.favicon ? { icon: brand.favicon } : {}),
      ...(brand.appleTouchIcon ? { apple: brand.appleTouchIcon } : {}),
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
