import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "learnDeFi",
  description: "Ask DeFi data and generate clean, share-ready visual cards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
