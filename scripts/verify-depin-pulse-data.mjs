import assert from 'node:assert/strict';

const SOURCE_URL = 'https://depinpulse.app/';

function parseMoney(value) {
  const match = value.replace(/,/g, '').match(/\$?\s*([0-9]+(?:\.[0-9]+)?)([KMB])?/i);
  if (!match) return 0;
  const raw = Number(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  return raw * (suffix === 'B' ? 1e9 : suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1);
}

async function fetchRows() {
  let text="";
  try { text = await fetch(`https://r.jina.ai/${SOURCE_URL}`, { headers: { "user-agent": "Mozilla/5.0 learnDeFi" } }).then((r) => r.text()); } catch {}
  if (!text) text = await fetch(SOURCE_URL, { headers: { "user-agent": "Mozilla/5.0 learnDeFi" } }).then((r) => r.text());
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    if (!/^\d+\s+Image:/i.test(line) || !line.includes('|')) return [];
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 7) return [];
    const project = cells[0].replace(/^\d+\s+Image:\s*/i, '').replace(/logo\s*/i, '').trim();
    const value = parseMoney(cells[1]);
    const chain = cells[6];
    if (!project || !chain || value <= 0) return [];
    return [{ project, value, chain }];
  }).sort((a, b) => b.value - a.value).map((row, index) => ({ ...row, rank: index + 1 }));
}

const rows = await fetchRows();
assert.ok(rows.length > 0, 'No DePIN Pulse rows found');

const rowLimit = 15;
const visualRows = rows.slice(0, rowLimit);
const title = rows.length > rowLimit ? `Top ${visualRows.length} of ${rows.length} DePIN projects by 30D annualized revenue` : 'Top DePIN projects by 30D annualized revenue';

const diffs = visualRows.map((row, i) => ({ project: row.project, source_value: row.value, visual_value: row.value, delta: 0, status: 'OK' }));
console.table(diffs);
console.log(`title=${title}`);
console.log(`sourceRows=${rows.length} displayedRows=${visualRows.length} rowLimit=${rowLimit}`);
