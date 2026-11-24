/**
 * Logo order for a mint/burn card, the same order as Chain Revenue (PR #193):
 * Logo Manager approved, the copy cached in posted-state.json, the fixed file,
 * DefiLlama, then a circle with the initial. A missing logo never skips the card.
 */

export const LOGO_SLUGS = ["usdt", "usdc", "ethereum", "solana", "polygon", "tron"];

export const FIXED_LOGOS = {
  usdt: "/logos/mint-burn/usdt.png",
  usdc: "/logos/mint-burn/usdc.png",
  ethereum: "/logos/mint-burn/ethereum.png",
  solana: "/logos/mint-burn/solana.png",
  polygon: "/logos/mint-burn/polygon.png",
  tron: "/logos/mint-burn/tron.png",
};

export const DEFILLAMA_LOGOS = {
  usdt: "https://icons.llamao.fi/icons/protocols/tether?w=96",
  usdc: "https://icons.llamao.fi/icons/protocols/usd-coin?w=96",
  ethereum: "https://icons.llamao.fi/icons/chains/rsz_ethereum?w=96",
  solana: "https://icons.llamao.fi/icons/chains/rsz_solana?w=96",
  polygon: "https://icons.llamao.fi/icons/chains/rsz_polygon?w=96",
  tron: "https://icons.llamao.fi/icons/chains/rsz_tron?w=96",
};

const LOGO_NAMES = {
  usdt: "USDT",
  usdc: "USDC",
  ethereum: "Ethereum",
  solana: "Solana",
  polygon: "Polygon",
  tron: "Tron",
};

export function logoInitialDataUrl(name) {
  const letter = (String(name || "C").match(/\p{L}|\p{N}/u) || ["C"])[0].toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="46" fill="#dfe2e7" stroke="#e3e6eb" stroke-width="3"/><text x="48" y="50" text-anchor="middle" dominant-baseline="central" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="900" fill="#5b616b">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function usable(checked) {
  return Boolean(checked && checked.renderUrl && checked.byteLength > 0 && checked.byteLength <= 512 * 1024);
}

function cacheUsable(entry) {
  return Boolean(entry && entry.approvedUrl && entry.dataUrl && entry.byteLength > 0 && entry.byteLength <= 512 * 1024);
}

/**
 * @param {object} input
 * @param {boolean} input.dbAvailable
 * @param {Record<string, string | null | undefined>} input.approvedUrlBySlug
 * @param {Record<string, object>} input.cache
 * @param {Record<string, { renderUrl: string, byteLength: number, contentType?: string } | null>} input.images
 */
export function planMintBurnLogos(input) {
  const now = input.now || new Date().toISOString();
  const cache = {};
  const choices = [];
  const warnings = [];
  for (const slug of LOGO_SLUGS) {
    const name = LOGO_NAMES[slug];
    const approvedUrl = input.dbAvailable ? String(input.approvedUrlBySlug?.[slug] || "") : "";
    const cached = input.cache?.[slug];
    const approved = approvedUrl ? input.images?.[approvedUrl] : null;
    let choice = null;
    if (input.dbAvailable && approvedUrl && usable(approved) && String(approved.renderUrl).startsWith("data:")) {
      const same = cacheUsable(cached) && cached.approvedUrl === approvedUrl && cached.byteLength === approved.byteLength;
      cache[slug] = same
        ? { ...cached, name }
        : {
          slug,
          name,
          approvedUrl,
          contentType: approved.contentType || "image/png",
          dataUrl: approved.renderUrl,
          byteLength: approved.byteLength,
          updatedAt: now,
        };
      choice = { source: "approved", url: cache[slug].dataUrl };
    } else if (!(input.dbAvailable && !approvedUrl) && cacheUsable(cached)) {
      cache[slug] = cached;
      choice = { source: "cache", url: cached.dataUrl };
    }
    if (!choice) {
      const fixed = FIXED_LOGOS[slug];
      if (fixed && usable(input.images?.[fixed])) choice = { source: "fixed", url: fixed };
    }
    if (!choice) {
      const llama = DEFILLAMA_LOGOS[slug];
      if (usable(input.images?.[llama])) {
        choice = { source: "defillama", url: llama };
        warnings.push(`Mint/burn logo for ${slug} fell back to DefiLlama.`);
      }
    }
    if (!choice) {
      choice = { source: "initial", url: logoInitialDataUrl(name) };
      warnings.push(`Mint/burn logo for ${slug} fell back to an initial badge.`);
    }
    choices.push({ slug, name, source: choice.source, url: choice.url });
  }
  return { choices, cache, warnings };
}

export function sniffLogo(bytes) {
  if (!bytes || bytes.byteLength < 8 || bytes.byteLength > 512 * 1024) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.byteLength >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  const text = new TextDecoder().decode(bytes).trimStart();
  if (!/^<\?xml[\s>]|^<svg[\s>]/i.test(text) || /<script|javascript:|on[a-z]+\s*=/i.test(text)) return null;
  return "image/svg+xml";
}
