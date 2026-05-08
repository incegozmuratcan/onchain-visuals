import { NextRequest, NextResponse } from "next/server";

type LogoMeta = {
  bg: string;
  fg: string;
  mark: string;
};

const logos: Record<string, LogoMeta> = {
  ethereum: { bg: "#d8d8d8", fg: "#343434", mark: "◆" },
  solana: { bg: "#050505", fg: "#14f195", mark: "≋" },
  tron: { bg: "#ef0027", fg: "#ffffff", mark: "△" },
  bsc: { bg: "#f3ba2f", fg: "#111827", mark: "⬢" },
  base: { bg: "#1f3bff", fg: "#ffffff", mark: "B" },
  arbitrum: { bg: "#2d6bf3", fg: "#ffffff", mark: "A" },
  polygon: { bg: "#8247e5", fg: "#ffffff", mark: "∞" },
  avalanche: { bg: "#e84142", fg: "#ffffff", mark: "▲" },
  optimism: { bg: "#ff0420", fg: "#ffffff", mark: "OP" },
  aptos: { bg: "#d9f7df", fg: "#0f3b24", mark: "≋" },
  stellar: { bg: "#ffffff", fg: "#111827", mark: "◌" },
  ripple: { bg: "#1a73e8", fg: "#ffffff", mark: "X" },
  sui: { bg: "#d8f0ff", fg: "#2a87d0", mark: "◊" },
  mantle: { bg: "#050505", fg: "#ffffff", mark: "✺" },
  ton: { bg: "#159bdc", fg: "#ffffff", mark: "▼" },
  sei: { bg: "#c7362f", fg: "#ffffff", mark: "≈" },
  celo: { bg: "#fbff3f", fg: "#111827", mark: "C" },
  hedera: { bg: "#000000", fg: "#ffffff", mark: "H" },
  algorand: { bg: "#ffffff", fg: "#111827", mark: "Λ" },
  plume: { bg: "#ff4f1f", fg: "#ffffff", mark: "P" },
  "zksync-era": { bg: "#eef4ff", fg: "#1f2937", mark: "ZK" },
  hyperliquid: { bg: "#eaf7f3", fg: "#0f766e", mark: "HL" },
  bitcoin: { bg: "#f7931a", fg: "#ffffff", mark: "₿" },
  cardano: { bg: "#2a61d6", fg: "#ffffff", mark: "✣" },
  cosmos: { bg: "#20243f", fg: "#ffffff", mark: "✳" },
  cronos: { bg: "#0f172a", fg: "#ffffff", mark: "C" },
  fantom: { bg: "#1969ff", fg: "#ffffff", mark: "F" },
  near: { bg: "#f7fafc", fg: "#111827", mark: "N" },
  starknet: { bg: "#fff0e8", fg: "#1e1b4b", mark: "S" },
  stacks: { bg: "#ff5b2e", fg: "#ffffff", mark: "≡" },
  rootstock: { bg: "#050505", fg: "#f7931a", mark: "✹" },
  "internet-computer": { bg: "#0f172a", fg: "#ff4ecd", mark: "∞" },
  kusama: { bg: "#050505", fg: "#ffffff", mark: "✦" },
  fogo: { bg: "#ff4b1f", fg: "#ffffff", mark: "F" },
  "bsv-blockchain": { bg: "#3156d4", fg: "#ffffff", mark: "BSV" },
  ink: { bg: "#6d28d9", fg: "#ffffff", mark: "I" },
  kaia: { bg: "#ffffff", fg: "#111827", mark: "K" },
  megaeth: { bg: "#f8fafc", fg: "#64748b", mark: "M" },
  monad: { bg: "#6d5dfc", fg: "#ffffff", mark: "M" },
  plasma: { bg: "#0f2f2f", fg: "#b6fff2", mark: "P" },
  provenance: { bg: "#f8fafc", fg: "#64748b", mark: "P" },
  saga: { bg: "#000000", fg: "#ffffff", mark: "S" },
  "x-layer": { bg: "#050505", fg: "#ffffff", mark: "X" },
  katana: { bg: "#e2e8f0", fg: "#111827", mark: "K" },
  movement: { bg: "#f8fafc", fg: "#64748b", mark: "M" },
  flare: { bg: "#ef4770", fg: "#ffffff", mark: "F" },
  default: { bg: "#f8fafc", fg: "#64748b", mark: "?" },
};

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  const logo = logos[slug] || logos.default;
  const fontSize = logo.mark.length > 2 ? 24 : logo.mark.length > 1 ? 31 : 42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${esc(slug)} logo"><circle cx="64" cy="64" r="62" fill="${logo.bg}"/><circle cx="64" cy="64" r="61" fill="none" stroke="rgba(15,23,42,0.10)" stroke-width="3"/><text x="64" y="70" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${logo.fg}">${esc(logo.mark)}</text></svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
