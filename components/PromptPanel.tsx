"use client";

type ActiveDataset = {
  id: string;
  name: string;
  examplePrompts: string[];
};

const limitOptions = [5, 10, 15, 20, 25, 30];
const timeframeOptions = ["24H", "7D", "30D"];

function parsePromptLabels(prompt: string) {
  const text = prompt.toLowerCase();
  const isTxFee = /(avg tx fee|average tx fee|average transaction fee|tx fee|transaction fee)/.test(text);
  const isBlockTime = /(block time|blocktime|blok süresi|blok suresi)/.test(text);
  const isTps = /(tps|throughput|transactions per second|real-time tps|realtime tps)/.test(text);
  const isBenji = /(benji|franklin|benjamin)/.test(text);
  const isBuidl = /(buidl|build|blackrock|tokenized fund|tokenized treasury)/.test(text);
  const isStablecoin = /(stablecoin|stablecoins|stable|stables|supply|mcap|market cap)/.test(text);
  const isTvl = /(tvl|total value locked|defi tvl|liquidity locked|kilitli değer|kilitli deger)/.test(text);
  const limitMatch = text.match(/top\s+(\d+)|first\s+(\d+)|(\d+)\s+(chains?|networks?)/);
  const rawLimit = Number(limitMatch?.[1] || limitMatch?.[2] || limitMatch?.[3] || 10);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10, 3), 30);

  const isCurrentOnly = isTxFee || isBlockTime || isTps || isBenji || isBuidl || isStablecoin || isTvl;
  let timeframe = "30D";
  if (isCurrentOnly) timeframe = "Current";
  else if (/(1d|24h|daily|today|bugün|son 24)/.test(text)) timeframe = "24H";
  else if (/(7d|week|weekly|hafta|son 7)/.test(text)) timeframe = "7D";

  const scope = "Chains";
  const metric = isTxFee ? "Avg Tx Fee" : isBlockTime ? "Block Time" : isTps ? "Real-time TPS" : isBenji ? "BENJI" : isBuidl ? "BUIDL" : isStablecoin ? "Stablecoin Supply" : isTvl ? "TVL" : "Revenue";
  return { scope, metric, limit, timeframe, isCurrentOnly };
}

function replaceLimit(prompt: string, nextLimit: number) {
  if (/top\s+\d+/i.test(prompt)) return prompt.replace(/top\s+\d+/i, `Top ${nextLimit}`);
  return `Top ${nextLimit} ${prompt}`;
}

function replaceTimeframe(prompt: string, nextTimeframe: string) {
  if (/stablecoin|stablecoins|supply|tvl|buidl|build|blackrock|benji|franklin|tps|throughput|block time|blocktime|tx fee|transaction fee/i.test(prompt)) return prompt;
  if (/(24h|7d|30d|daily|weekly|monthly)/i.test(prompt)) return prompt.replace(/(24h|7d|30d|daily|weekly|monthly)/i, nextTimeframe);
  return prompt.replace(/revenue/i, `${nextTimeframe} revenue`);
}

export function PromptPanel({
  prompt,
  setPrompt,
  onRun,
  loading,
  activeDataset,
  queryLabels,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onRun: () => void;
  loading: boolean;
  activeDataset: ActiveDataset;
  queryLabels: string[];
}) {
  const detected = parsePromptLabels(prompt || queryLabels.join(" "));
  const currentLimit = String(detected.limit);
  const currentTimeframe = detected.timeframe;
  const isCurrentOnly = detected.isCurrentOnly;

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-soft backdrop-blur md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Ask</label>
          <p className="mt-1 text-sm font-medium text-slate-500">Run a supported query to generate a share-ready learnDeFi card.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{activeDataset.name}</div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRun();
          }}
          className="min-h-16 flex-1 rounded-3xl border border-slate-200 bg-slate-50/60 px-5 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-slate-950 focus:bg-white"
          placeholder="Top 10 chains by stablecoin supply"
          maxLength={240}
        />
        <button
          onClick={onRun}
          disabled={loading}
          className="rounded-3xl bg-slate-950 px-7 py-4 font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Detected query</div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Select result count"
            value={currentLimit}
            onChange={(event) => setPrompt(replaceLimit(prompt, Number(event.target.value)))}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm outline-none"
          >
            {limitOptions.map((limit) => (
              <option key={limit} value={String(limit)}>Top {limit}</option>
            ))}
          </select>

          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
            {detected.scope}
          </span>

          {!isCurrentOnly && (
            <select
              aria-label="Select timeframe"
              value={currentTimeframe}
              onChange={(event) => setPrompt(replaceTimeframe(prompt, event.target.value))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm outline-none"
            >
              {timeframeOptions.map((timeframe) => <option key={timeframe} value={timeframe}>{timeframe}</option>)}
            </select>
          )}

          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
            {detected.metric}
          </span>
        </div>
      </div>
    </div>
  );
}
