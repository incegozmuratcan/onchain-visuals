# Web3 Intel Demo v0.1

Small MVP for a prompt-to-visual Web3 intelligence product.

## What it does

- Uses one data category: **Chain Revenue**
- Pulls data from DefiLlama's free API
- Supports simple prompts:
  - `Top 10 chains by 30D revenue`
  - `Top 15 chains by 7D revenue`
  - `Top 20 chains by 24H revenue`
- Shows a table and chart
- Generates a branded X-ready PNG card
- Includes small source attribution: `Data: DefiLlama`

## Run locally

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## Next steps

1. Add AI parser for more flexible prompts.
2. Add scheduled report settings: daily/weekly email.
3. Add auth and usage limits.
4. Add more data categories: protocol revenue, stablecoins, TVL, flows.
5. Move to GitHub for smaller iterative changes.
