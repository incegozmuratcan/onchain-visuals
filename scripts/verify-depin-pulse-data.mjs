import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const SOURCE_URL = 'https://depinpulse.app/';
const SAMPLE_MAX = 2000;
const parseMoney = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || /^n\/?a$/i.test(raw)) return null;
  const match = raw.replace(/[,$\s]/g, '').match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  const mult = (match[2] || '').toUpperCase();
  return n * (mult === 'B' ? 1e9 : mult === 'M' ? 1e6 : mult === 'K' ? 1e3 : 1);
};

const cleanProjectName = (v) => String(v || '').replace(/^\d+\s*/, '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[\s*image\s*:[^\]]*\]/gi, ' ').replace(/\bimage\s*:/gi, ' ').replace(/\blogo\b/gi, ' ').replace(/\s+/g, ' ').trim();

function parseRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    if (!line.includes('|')) continue;
    const c = line.split('|').map((x) => x.trim()).filter(Boolean);
    if (c.length < 2) continue;
    const project = cleanProjectName(c[0]);
    const annual = parseMoney(c[1]);
    if (!project || !annual || annual <= 0) continue;
    rows.push({ projectName: project, annualized30dRevenueUsd: annual, chain: c[6] || 'Unknown' });
  }
  return rows.sort((a, b) => b.annualized30dRevenueUsd - a.annualized30dRevenueUsd);
}

const sourceText = await fetch(`https://r.jina.ai/${SOURCE_URL}`, { headers: { 'user-agent': 'Mozilla/5.0 learnDeFi' } }).then((r) => r.text());
const rows = parseRows(sourceText);
if (!rows.length) {
  const lines = sourceText.split(/\r?\n/);
  const diag = [
    `sourceUrl=${SOURCE_URL}`,
    `sourceLength=${sourceText.length}`,
    `pipeLines=${lines.filter((l) => l.includes('|')).length}`,
    `rankLines=${lines.filter((l) => /^\s*\d+\b/.test(l)).length}`,
    `sample=${JSON.stringify(sourceText.slice(0, SAMPLE_MAX))}`,
  ].join('\n');
  writeFileSync('/tmp/depinpulse-source-sample.txt', sourceText.slice(0, SAMPLE_MAX), 'utf8');
  console.error(diag);
  throw new Error('No DePIN Pulse rows found');
}
assert.ok(rows.length > 0, 'No DePIN Pulse rows found');
const rowLimit = 15;
const visualRows = rows.slice(0, rowLimit);
const title = rows.length > rowLimit ? `Top ${visualRows.length} of ${rows.length} DePIN projects by 30D annualized revenue` : 'Top DePIN projects by 30D annualized revenue';
console.log(`title=${title}`);
console.log(`sourceRows=${rows.length} displayedRows=${visualRows.length} rowLimit=${rowLimit}`);
