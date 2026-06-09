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

## AI synthesis (optional)

The "AI synthesis" panel is wired to **Gemini 3.1 Flash-Lite** by default
(15 RPM / 500 RPD free), with **DeepSeek V4 Flash** as a code-level
alternative.

```bash
# .env.local — only the active provider's key is needed.
GEMINI_API_KEY=AQ.Ab...           # for Gemini
# GEMINI_MODEL=gemini-2.5-flash   # optional override (5 RPM / 20 RPD but supports grounding)
# GEMINI_GROUNDING=on             # only worth setting with gemini-2.5-flash; 3.x grounding 429s on free-tier keys
# DEEPSEEK_API_KEY=sk-...         # if you swap providers in src/app/api/analyze/route.ts
```

On Vercel, set the same variable in **Project Settings → Environment Variables**
(Production + Preview). Without a key the panel renders but the
"Generate analysis" button returns a clear error.

**Why these defaults**: `gemini-3.5-flash` and `gemini-2.5-flash` are both
capped at 5 RPM / 20 RPD on free-tier keys, which is too tight for casual
dashboard use. `gemini-3.1-flash-lite` is 500 RPD — the analysis is slightly
terser but the daily headroom matters more for "VT-and-chill" use. Google
Search grounding (live news) is gone on all Gemini 3.x for free-tier keys
right now; if it comes back, flip `GEMINI_MODEL` + `GEMINI_GROUNDING` and it
just works (the API code already handles snake-case `google_search` and the
grounding/responseMimeType incompatibility).

**Swapping providers**: change `runAnalysisGemini` to `runAnalysisDeepSeek` at
the top of `src/app/api/analyze/route.ts`.

**Caching**: the route caches the last analysis in-process for 10 minutes and
coalesces concurrent calls via a single in-flight promise. This keeps even a
busy tab safely inside Gemini's daily quota.

**Grounding sources**: when Gemini does use Google Search, cited URLs render
as chips under the analysis so the live-news context can be verified.

## Where things live

- `src/lib/tickers.ts` — ticker list, categories, descriptions, interpretations,
  and per-ticker weights used by the sentiment score.
- `src/lib/quotes.ts` — server-side Yahoo Finance fetch.
- `src/lib/sentiment.ts` — aggregate risk-on/off scoring.
- `src/app/api/quotes/route.ts` — `/api/quotes` endpoint (no-store).
- `src/components/Dashboard.tsx` — client component with auto-refresh.
- `src/components/TickerCard.tsx`, `SentimentBanner.tsx` — UI.
- `src/lib/analyze.ts`, `src/app/api/analyze/route.ts`, `src/components/AnalysisPanel.tsx` — DeepSeek-backed AI synthesis (server-cached 10 min).

## Caveats

Yahoo Finance data is unofficial, sometimes delayed, and occasionally a symbol
returns no data for a few minutes. The interpretations on each card are
rules-of-thumb, not financial advice.
