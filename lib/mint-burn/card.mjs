/**
 * Approved mint/burn share card. The style block is the approved demo CSS.
 * Burn colors are inline so a mint card keeps those rules unchanged.
 */
import { buildCaption, chainLabel, formatFooterDate, formatHeroAmount, formatTxTime, issuerClass, issuerName, shortenHash } from "./rules.mjs";

export { buildCaption };

const CARD_STYLE = `<style>
@font-face{font-family:"InterCard";src:url("../assets/InterVariable-opsz.woff") format("woff");font-weight:100 900;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:InterCard,Inter,Helvetica,Arial,sans-serif;font-optical-sizing:auto;font-synthesis:none;-webkit-font-smoothing:antialiased}
:root{--tether:#009393;--tron:#EB0029;--circle:#2775CA;--solana:#9945FF;--solana-green:#088752;--polygon:#8247E5}
[data-capture="share-card"]{width:1200px;height:675px;padding:12px;background:#F4F1EC;overflow:hidden;font-feature-settings:"ss01" 1,"cv01" 1}
.frame{position:relative;width:100%;height:100%;display:flex;flex-direction:column;border:1.5px solid #C5C0B6;border-radius:20px;padding:36px 48px 28px;color:#161616}
.brand{position:absolute;right:48px;top:36px;border:1.5px solid #e3e5ea;background:#fff;border-radius:9999px;padding:12px 24px;font-size:20px;font-weight:800;color:#111;line-height:normal}
.top{display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0}
.brand-row{display:flex;align-items:center;gap:14px}
.action-label{font-size:16px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;line-height:1;color:#1E8F72}
.logos{display:flex;align-items:center;gap:10px}
.logos img{width:52px;height:52px;border-radius:50%;object-fit:cover;display:block;background:#fff;box-shadow:0 0 0 1.5px rgba(22,22,22,.12)}
.body{flex:1;min-height:0;display:flex;align-items:center;padding:4px 0 8px}
.pair{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:40px}
.copy{min-width:0;flex:1}
.hero{font-size:100px;font-weight:900;letter-spacing:-.06em;line-height:.9;font-feature-settings:"ss01" 1,"cv01" 1,"tnum" 1;color:#1E8F72}
.token{margin-top:12px;font-size:28px;font-weight:600;letter-spacing:-.03em;line-height:1;color:#161616}
.sub{margin-top:12px;display:flex;align-items:center;gap:12px;line-height:1}
.mint-count{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 14px;border-radius:9999px;background:#D8EFE6;font-size:24px;font-weight:600;letter-spacing:-.03em;color:#1E8F72;white-space:nowrap}
.sub-amount{font-size:26px;font-weight:600;letter-spacing:-.03em;color:#161616}
.where{margin-top:20px;font-size:22px;font-weight:500;letter-spacing:-.02em;line-height:1.25;color:#3F3D39}
.name-tether{font-weight:600;color:var(--tether)}.name-tron{font-weight:600;color:var(--tron)}.name-circle{font-weight:600;color:var(--circle)}.name-polygon{font-weight:600;color:var(--polygon)}.name-ethereum{font-weight:600;color:#111}
.name-solana{font-weight:600;background:linear-gradient(90deg,var(--solana) 0%,var(--solana-green) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.txs{flex:0 0 auto;display:flex;flex-direction:column;justify-content:flex-start;min-width:292px;padding-top:6px}
.txs-label{margin-bottom:8px;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:#111}
.tx{display:grid;grid-template-columns:140px auto;column-gap:16px;align-items:baseline;height:34px;font-size:20px;font-weight:500;letter-spacing:-.01em;font-feature-settings:"ss01" 1,"cv01" 1,"tnum" 1;white-space:nowrap}
.tx-time{color:#5E5C56}.tx-hash{color:#111;font-weight:600}
.bottom{display:flex;align-items:baseline;justify-content:space-between;gap:24px;flex-shrink:0;padding-bottom:52px}
.mark{font-size:20px;font-weight:600;letter-spacing:-.02em;line-height:1;color:#111}
.date{font-size:20px;font-weight:500;letter-spacing:-.01em;line-height:1;color:#111}
</style>`;

export const APPROVED_CARD_CSS = CARD_STYLE;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cardView(alert) {
  const events = [...alert.events].sort((left, right) => right.timestampMs - left.timestampMs || String(right.txHash).localeCompare(String(left.txHash)));
  const count = events.length;
  const grouped = count > 1;
  const visible = grouped && count > 4 ? events.slice(0, 3) : events;
  const more = grouped && count > 4 ? count - 3 : 0;
  const each = events[0]?.amountUsd ?? 0;
  const equal = grouped && events.every((event) => Math.abs(event.amountUsd - each) < 0.005);
  const total = events.reduce((sum, event) => sum + event.amountUsd, 0);
  return {
    kind: alert.kind,
    token: alert.token,
    chain: alert.chain,
    count,
    grouped,
    visible,
    more,
    equal,
    each,
    total,
    newest: events[0],
  };
}

export function renderCardHtml(alert, logos) {
  const view = cardView(alert);
  const burn = view.kind === "burn";
  const burnColor = burn ? ' style="color:#D93A3A"' : "";
  const action = burn ? "BURN" : "Mint";
  const whereVerb = burn ? "Burned" : "Minted";
  const pillText = `${view.count} ${burn ? "burns" : "mints"}`;
  const pillStyle = burn ? ' style="background:#F6DEDE;color:#D93A3A"' : "";
  const sub = view.grouped
    ? `<div class="sub"><span class="mint-count"${pillStyle}>${escapeHtml(pillText)}</span>${view.equal ? `<span class="sub-amount">× ${escapeHtml(formatHeroAmount(view.each))}</span>` : ""}</div>`
    : "";
  const rows = view.visible.map((event) => (
    `<div class="tx"><span class="tx-time">${escapeHtml(formatTxTime(event.timestampMs))}</span><span class="tx-hash">${escapeHtml(shortenHash(event.txHash))}</span></div>`
  )).join("");
  const more = view.more ? `<div class="tx"><span class="tx-time" style="grid-column:1 / -1">+${view.more} more</span></div>` : "";
  const tokenSrc = escapeHtml(logos.token);
  const chainSrc = escapeHtml(logos.chain);
  const body = `<div data-capture="share-card"><div class="frame">
<div class="brand">Onchain Visuals</div>
<div class="top"><div class="brand-row"><span class="action-label"${burnColor}>${action}</span><div class="logos"><img src="${tokenSrc}"/><img src="${chainSrc}"/></div></div></div>
<div class="body"><div class="pair"><div class="copy">
<div class="hero"${burnColor}>${escapeHtml(formatHeroAmount(view.total))}</div><div class="token">${escapeHtml(view.token)}</div>
${sub}
<p class="where">${whereVerb} at <span class="${issuerClass(view.token)}">${escapeHtml(issuerName(view.token))} Treasury</span> on <span class="name-${escapeHtml(view.chain)}">${escapeHtml(chainLabel(view.chain))}</span></p>
</div><div class="txs"><div class="txs-label">${view.grouped ? "Transactions" : "Transaction"}</div>
${rows}
${more}
</div></div></div>
<div class="bottom"><span class="mark">@OnchainVis</span><div class="date">${escapeHtml(formatFooterDate(view.newest.timestampMs))}</div></div>
</div></div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${CARD_STYLE}</head><body>${body}</body></html>`;
}
