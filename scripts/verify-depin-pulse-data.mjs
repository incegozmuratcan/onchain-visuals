import assert from 'node:assert/strict';

const SOURCE_URL = 'https://depinpulse.app/';

function parseMoney(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || /^n\/?a$/i.test(raw)) return null;
  const normalized = raw.replace(/[,$\s]/g, '');
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  return amount * (suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1);
}
function parseRatio(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || /^n\/?a$/i.test(raw)) return null;
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}
function detectHeaderIndexes(headerCells) {
  const normalized = headerCells.map((h) => h.toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim());
  const findIdx = (patterns) => normalized.findIndex((h) => patterns.some((pattern) => pattern.test(h)));
  return {
    project: findIdx([/^project$/]),
    annualized30d: findIdx([/^30d annualized revenue$/, /30d arr/, /annualized revenue/]),
    revenue24h: findIdx([/^24h revenue$/]),
    marketCap: findIdx([/^market cap$/, /\bmcap\b/]),
    mcToArr: findIdx([/^mc\s*\/\s*30d arr$/, /mc\s*\/\s*(30d\s*)?arr/]),
    volume24h: findIdx([/^24h vol$/, /^24h volume$/, /\bvolume\b/]),
    chain: findIdx([/^chain$/, /\bnetwork\b/]),
  };
}
const extractProjectSlugFromUrl = (value) => value.match(/https?:\/\/depinpulse\.app\/projects\/([a-z0-9-]+)/i)?.[1]?.toLowerCase() ?? null;
function cleanProjectName(value) {
  return String(value || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\bimage\s*\d*\s*:\s*/gi, ' ').replace(/\blogo\b/gi, ' ').replace(/[\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}
function splitMarkdownRow(line) {
  const cells = []; let cell = ''; let bracketDepth = 0; let parenDepth = 0;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '[' && parenDepth === 0) bracketDepth += 1;
    if (ch === ']' && bracketDepth > 0 && parenDepth === 0) bracketDepth -= 1;
    if (ch === '(' && bracketDepth > 0) parenDepth += 1;
    if (ch === ')' && parenDepth > 0) parenDepth -= 1;
    if (ch === '|' && bracketDepth === 0 && parenDepth === 0) { cells.push(cell.trim()); cell = ''; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells.filter((c, idx) => !(idx === 0 && !c) && !(idx === cells.length - 1 && !c));
}
function parseRows(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let headerIndexes = null; const out = [];
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const cells = splitMarkdownRow(line);
    if (!cells.length || cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
    if (cells.some((c) => /(project|annualized|market|chain|network|revenue|arr|vol)/i.test(c)) && (!headerIndexes || /project/i.test(cells.join(' ')))) {
      const detected = detectHeaderIndexes(cells);
      if (detected.project >= 0 && detected.annualized30d >= 0) { headerIndexes = detected; continue; }
    }
    if (!headerIndexes) continue;
    const projectCell = cells[headerIndexes.project] ?? '';
    const projectName = cleanProjectName(projectCell);
    const annualized = parseMoney(cells[headerIndexes.annualized30d] ?? '');
    if (!projectName || !annualized || annualized <= 0) continue;
    out.push({
      rank: out.length + 1,
      projectName,
      projectSlug: extractProjectSlugFromUrl(projectCell) ?? projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      annualized30dRevenueUsd: annualized,
      revenue24hUsd: parseMoney(cells[headerIndexes.revenue24h] ?? '') ?? 0,
      marketCapUsd: parseMoney(cells[headerIndexes.marketCap] ?? ''),
      mcToArr: parseRatio(cells[headerIndexes.mcToArr] ?? ''),
      volume24hUsd: parseMoney(cells[headerIndexes.volume24h] ?? ''),
      chain: cells[headerIndexes.chain] ?? 'Unknown',
    });
  }
  return out.sort((a, b) => b.annualized30dRevenueUsd - a.annualized30dRevenueUsd).map((r, i) => ({ ...r, rank: i + 1 }));
}

const FIXTURE = `| Project | 30d Annualized Revenue | 24h Revenue | Market Cap | MC / 30d ARR | 24h Vol | Chain |\n| --- | --- | --- | --- | --- | --- | --- |\n| [![Image 1: Helium](https://cdn.depinpulse.app/api/helium) Helium](https://depinpulse.app/projects/helium) | $16,553,785 | $57,958 | $143,920,600 | 8.7 x | $3,225,619 | Solana |\n| [![Image 2: IO.NET](https://cdn.depinpulse.app/api/ionet) IO.NET](https://depinpulse.app/projects/io-net) | $10,932,173 | $36,505 | $48,583,399 | 4.4 x | $7,187,009 | Solana |\n| [![Image 3: GEODNET](https://cdn.depinpulse.app/api/geodnet) GEODNET](https://depinpulse.app/projects/geodnet) | $6,200,000 | $17,900 | $150,000,000 | 24.2 x | $4,001,001 | Solana |\n| [![Image 4: Chutes](https://cdn.depinpulse.app/api/chutes) Chutes](https://depinpulse.app/projects/chutes) | $3,820,000 | $8,205 | $44,000,000 | 11.5 x | $542,000 | Solana |\n| [![Image 5: Akash](https://cdn.depinpulse.app/api/akash) Akash](https://depinpulse.app/projects/akash) | $2,710,000 | $9,830 | $610,000,000 | 225.1 x | $3,201,100 | Cosmos |\n| [![Image 6: DoubleZero](https://cdn.depinpulse.app/api/doublezero) DoubleZero](https://depinpulse.app/projects/doublezero) | $1,512,000 | $5,244 | $88,200,200 | 58.3 x | $120,900 | Solana |\n| [![Image 7: Glow](https://pbs.twimg.com/profile_images/1943222033816416256/Sz11jnra_400x400.jpg) Glow](https://depinpulse.app/projects/glow) | $1,336,245 | $96 | $11,471,706 | 8.6 x | $1,178 | Ethereum |\n| [![Image 8: Render Network](https://cdn.depinpulse.app/api/render) Render Network](https://depinpulse.app/projects/render-network) | $993,357 | $5,443 | $2,111,100,100 | 1018.3 x | $2,200,100 | Solana |\n| [![Image 9: Filecoin](https://cdn.depinpulse.app/api/filecoin) Filecoin](https://depinpulse.app/projects/filecoin) | $880,222 | $2,331 | $3,111,200,000 | - | N/A | Filecoin |\n`;
const fixtureRows = parseRows(FIXTURE);
assert.ok(fixtureRows.length >= 9);
const byName = new Map(fixtureRows.map((r) => [r.projectName, r]));
assert.equal(byName.get('Helium')?.annualized30dRevenueUsd, 16553785);
assert.equal(byName.get('IO.NET')?.annualized30dRevenueUsd, 10932173);
assert.equal(byName.get('Glow')?.annualized30dRevenueUsd, 1336245);
assert.equal(byName.get('Render Network')?.annualized30dRevenueUsd, 993357);
assert.equal(byName.get('Helium')?.chain, 'Solana');
assert.equal(byName.get('IO.NET')?.chain, 'Solana');
assert.equal(byName.get('Glow')?.chain, 'Ethereum');
assert.equal(byName.get('Render Network')?.chain, 'Solana');
assert.equal(byName.get('IO.NET')?.projectSlug, 'io-net');
assert.equal(byName.get('Render Network')?.projectSlug, 'render-network');
console.log(`fixtureRows=${fixtureRows.length}`);

try {
  const response = await fetch(`https://r.jina.ai/${SOURCE_URL}`, { headers: { 'user-agent': 'Mozilla/5.0 learnDeFi' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const sourceText = await response.text();
  const rows = parseRows(sourceText);
  const hasSignals = sourceText.includes('| Project |') && sourceText.includes('30d Annualized Revenue') && sourceText.includes('Helium');
  if (hasSignals && rows.length === 0) throw new Error('live source has leaderboard signals but parsedRows=0');
  console.log(`liveRows=${rows.length}`);
  if (rows.length) console.log(`liveTop=${rows.slice(0, 5).map((r) => `${r.rank}. ${r.projectName} (${r.annualized30dRevenueUsd})`).join(' | ')}`);
} catch (error) {
  console.warn(`liveVerifyWarning=${error instanceof Error ? error.message : String(error)}`);
}
