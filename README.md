# Premarket Overview

A clean dashboard that pulls live US-market signals from Yahoo Finance and
explains, in plain English, what each value (and the combination of them) means
for the upcoming session. Built for a CHF-based investor whose main holding is
VT, so it leans US-focused but tracks the FX and international context that
actually moves your portfolio.

## What it shows

- **US equity futures** — ES, NQ, YM, M2K. The headline read on the open.
- **Volatility** — VIX. The fear gauge that confirms or contradicts the tape.
- **US Treasury yields** — 10Y, 30Y, 3M. The discount rate behind every stock.
- **International indices** — S&P cash, Euro Stoxx 50, Nikkei, Hang Seng. The
  overnight read from the sessions that already traded.
- **Foreign exchange** — DXY, EUR/USD, USD/CHF. The dollar is the master
  variable; the CHF cross is what actually changes your wealth.
- **Commodities** — WTI crude, gold. Inflation and macro stress.
- **Crypto** — BTC. The only 24/7 risk gauge.
- **Your holding** — VT for context.

On top of the raw quotes there's an **aggregate sentiment banner**: a weighted,
sign-aware score from −100 (risk-off) to +100 (risk-on) with a headline and
top-3 drivers, so you can read the tape at a glance instead of squinting at 19
cards.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4
- `yahoo-finance2` for quotes (server-side, no API keys needed)

## Run it

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000 (or `PORT=3737 pnpm dev` for a different port).

Auto-refreshes every 60 seconds; manual refresh button in the header.

## Where things live

- `src/lib/tickers.ts` — ticker list, categories, descriptions, interpretations,
  and per-ticker weights used by the sentiment score.
- `src/lib/quotes.ts` — server-side Yahoo Finance fetch.
- `src/lib/sentiment.ts` — aggregate risk-on/off scoring.
- `src/app/api/quotes/route.ts` — `/api/quotes` endpoint (no-store).
- `src/components/Dashboard.tsx` — client component with auto-refresh.
- `src/components/TickerCard.tsx`, `SentimentBanner.tsx` — UI.

## Caveats

Yahoo Finance data is unofficial, sometimes delayed, and occasionally a symbol
returns no data for a few minutes. The interpretations on each card are
rules-of-thumb, not financial advice.
