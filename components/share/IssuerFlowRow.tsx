import { issuerBarPercent } from "@/lib/onchain/btcEthEtfWeek";

function displayFlow(value?: string | null) {
  if (!value) return "—";
  return value.replace(/-/g, "−");
}

/**
 * Shared issuer line for the daily and weekly ETF cards.
 * The ticker sits in a fixed column sized for a 5-character bold ticker plus
 * the old name gap, so every issuer name starts on the same vertical line.
 * The underline uses the weekly v21 square-root scale.
 */
export function IssuerFlowRow({
  ticker,
  name,
  value,
  formattedValue,
  maxAbs,
  barClassName,
}: {
  ticker: string;
  name?: string;
  value: number;
  formattedValue: string;
  maxAbs: number;
  barClassName: string;
}) {
  const width = issuerBarPercent(value, maxAbs);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-[4.25rem_minmax(0,1fr)] items-baseline lg:grid-cols-[5.125rem_minmax(0,1fr)]">
          <span
            data-issuer-ticker={ticker}
            className="whitespace-nowrap text-[16px] font-black tracking-[-0.03em] text-[#111] lg:text-[20px]"
          >
            {ticker}
          </span>
          {name ? (
            <span
              data-issuer-name={name}
              className="min-w-0 truncate text-[14px] font-medium text-[#7b808a] lg:text-[18px]"
            >
              {name}
            </span>
          ) : (
            <span data-issuer-name="" />
          )}
        </div>
        <span
          data-issuer-flow={formattedValue}
          className="shrink-0 whitespace-nowrap text-right text-[16px] font-black tabular-nums tracking-[-0.03em] lg:text-[22px]"
          style={{ color: value < 0 ? "#b0153f" : "#127a45" }}
        >
          {displayFlow(formattedValue)}
        </span>
      </div>
      <div className={`${barClassName} h-[3px] rounded-[3px] bg-[#e8eaee]`} data-issuer-bar="proportional">
        <span
          className="block h-[3px] rounded-[3px]"
          style={{
            width: `${width}%`,
            backgroundColor: value < 0 ? "#c8203f" : "#1b8f58",
          }}
        />
      </div>
    </>
  );
}
