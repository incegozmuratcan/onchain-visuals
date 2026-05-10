import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "learnDeFi",
  description: "Create clean, source-backed market cards from trusted crypto data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
