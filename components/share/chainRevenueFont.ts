import localFont from "next/font/local";

/**
 * Inter 4.001 variable (opsz + wght), Latin subset. The approved Chain Revenue
 * v17 card was set in this exact build with optical sizing on, which is tighter
 * at 22px and up than the wght-only Inter the rest of the site loads.
 */
export const chainRevenueInter = localFont({
  src: "./fonts/InterVariable-opsz.woff",
  weight: "100 900",
  style: "normal",
  display: "block",
  fallback: ["Inter", "Helvetica", "Arial", "sans-serif"],
});
