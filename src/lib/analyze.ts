/**
 * AI market analysis via Gemini 3 Flash (with Google Search grounding) or
 * DeepSeek V4 Flash.
 *
 * Builds a compact synthesis context from the live quotes payload + derived
 * signals (sentiment, insights, VT projection, session states, calendar),
 * sends it to the model, parses a strict JSON response with three short
 * sections, and (for Gemini) returns any web-grounding sources cited.
 *
 * Configure with either `GEMINI_API_KEY` or `DEEPSEEK_API_KEY` in .env.local
 * and Vercel project settings.
 */

import type { Quote, QuotesPayload } from "./quotes";
import { computeSentiment } from "./sentiment";
import { computeInsights } from "./insights";
import { computeVTProjection } from "./vt";
import { eventInfo } from "./event-info";
import { SESSIONS, getSessionStatus, formatDuration } from "./sessions";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/**
 * Default model. `gemma-4-31b-it` was picked for three reasons:
 * 1. 1500 RPD vs gemini-3.x-flash's 500 RPD — 3x daily headroom for casual use.
 * 2. Grounding with Google Search actually works on Gemma (returns real
 *    groundingMetadata + cited URLs), unlike Gemini 3.x on free-tier keys
 *    where the grounded call 429s.
 * 3. Higher-quality synthesis than gemini-3.1-flash-lite.
 *
 * Alternatives via env override:
 *   GEMINI_MODEL=gemma-4-26b-a4b-it     # smaller MoE, faster, similar quota
 *   GEMINI_MODEL=gemini-2.5-flash       # grounding works, tight 20 RPD limit
 *   GEMINI_MODEL=gemini-3.1-flash-lite  # fastest, no grounding, 500 RPD
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemma-4-31b-it";
// On by default. Set GEMINI_GROUNDING=off if you swap to a model whose
// grounding quota is exhausted (most Gemini 3.x models on free-tier keys),
// so we skip the wasted ~200ms grounded attempt.
const GEMINI_GROUNDING =
  (process.env.GEMINI_GROUNDING ?? "on").toLowerCase() !== "off";

export type GroundingSource = {
  title: string;
  uri: string;
};

export type Analysis = {
  setup: string;
  interesting: string;
  watch: string;
};

export type AnalyzeResult =
  | {
      ok: true;
      analysis: Analysis;
      latencyMs: number;
      provider: "gemini" | "deepseek";
      sources?: GroundingSource[];
      searchQueries?: string[];
    }
  | { ok: false; error: string };

const SWISS_TIME = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function compactTickers(quotes: Quote[]) {
  return quotes.map((q) => {
    const low = q.range30d.low;
    const high = q.range30d.high;
    const position =
      low != null && high != null && q.price != null && high !== low
        ? Math.round(((q.price - low) / (high - low)) * 100)
        : null;
    // Last 7 daily closes (oldest first) so the model can see multi-day
    // trends and say things like "first up day after a week of weakness".
    const recent7dCloses = q.history.slice(-7).map((p) => Number(p.close.toFixed(4)));
    return {
      symbol: q.symbol,
      name: q.config.short,
      category: q.config.category,
      price: q.price,
      changePct: q.changePercent,
      marketState: q.marketState,
      range30dPositionPct: position,
      recent7dCloses,
    };
  });
}

function compactSessions(now: Date) {
  return SESSIONS.map((s) => {
    const st = getSessionStatus(now, s);
    if (st.state === "open")
      return {
        name: s.name,
        state: "open",
        closesInMin: Math.round(st.closesInMs / 60000),
      };
    if (st.state === "break")
      return {
        name: s.name,
        state: "break",
        resumesInMin: Math.round(st.resumesInMs / 60000),
      };
    return {
      name: s.name,
      state: "closed",
      opensInMin: st.opensInMs >= 0 ? Math.round(st.opensInMs / 60000) : null,
    };
  });
}

const SWISS_DAY_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function compactCalendar(events: QuotesPayload["calendar"], now: Date) {
  return events
    .filter((e) => new Date(e.date).getTime() >= now.getTime() - 30 * 60 * 1000)
    .slice(0, 8)
    .map((e) => {
      const info = eventInfo(e.title);
      const date = new Date(e.date);
      return {
        currency: e.currency,
        title: e.title,
        // Pre-formatted Swiss-local time so the model never has to do TZ math
        // (it gets CEST vs CET wrong otherwise — off by an hour in summer).
        whenSwiss: SWISS_DAY_TIME.format(date),
        inMin: Math.round((date.getTime() - now.getTime()) / 60000),
        impact: e.impact,
        forecast: e.forecast || null,
        previous: e.previous || null,
        meaning: info.what + " " + info.hot + (info.cool ? " " + info.cool : ""),
        tier: info.tier,
      };
    });
}

export function buildContext(payload: QuotesPayload) {
  const now = new Date();
  const sentiment = computeSentiment(payload.quotes);
  const insights = computeInsights(payload.quotes);
  const vt = computeVTProjection(payload.quotes);

  return {
    now: {
      iso: now.toISOString(),
      swiss: SWISS_TIME.format(now),
    },
    tickers: compactTickers(payload.quotes),
    sentiment: {
      score: sentiment.score,
      label: sentiment.label,
      headline: sentiment.headline,
      topDrivers: sentiment.drivers,
    },
    vtProjection: {
      projectedPct: vt.projectedPct,
      coveredFraction: vt.coveredFraction,
      contributions: vt.contributions.map((c) => ({
        region: c.region,
        weight: c.weight,
        changePct: c.changePct,
        contribution: c.contribution,
      })),
      usMarketState: vt.usState,
    },
    insights: insights.map((i) => ({
      severity: i.severity,
      title: i.title,
      body: i.body,
      tickers: i.tickers,
    })),
    sessions: compactSessions(now),
    calendar: compactCalendar(payload.calendar, now),
  };
}

const SYSTEM_PROMPT = `You summarise premarket market data for a personal dashboard. The user is a Swiss-based long-term VT investor — curious about what's moving markets, but they don't trade the news. Write in plain English, like a knowledgeable colleague giving a quick read of the morning.

Rules:
- No disclaimers, no hedging, no "not financial advice".
- Concrete and specific. Name tickers and exact numbers. Avoid generic filler.
- Use the recent7dCloses array to note multi-day trends ("fourth red day in a row"). The 30d range position tells you if a level is stretched.
- Reference Swiss time (HH:MM) for upcoming events. Today's date is in the "now" field.
- If Google Search found relevant headlines, mention the catalyst by name.
- Only flag things worth knowing — don't manufacture drama.

Output STRICT JSON with exactly these three keys (all strings):

- "setup" (3-5 sentences, ~60-100 words): What's happening right now? Lead with the main move. Mention which sectors or asset classes are driving it, and the one biggest signal.

- "interesting" (3-5 sentences, ~60-100 words): What stands out? A divergence, a multi-day pattern, anything unusual the user wouldn't notice from glancing at the cards. Keep it concise.

- "watch" (2-4 sentences, ~40-80 words): What could move things next? Lead with the highest-impact upcoming event (Swiss time). Mention any session transitions or news catalysts worth tracking.

Output only the JSON. Code fences are tolerated but unnecessary.`;

function extractJson(text: string): string {
  // Strip markdown code fences if the model wrapped its output despite being
  // told not to. Handle both ```json and bare ``` fences.
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return stripped.trim();
  }
  return trimmed;
}

function parseAnalysis(text: string): Analysis | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    return { error: `Model did not return valid JSON: ${text.slice(0, 200)}` };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).setup !== "string" ||
    typeof (parsed as Record<string, unknown>).interesting !== "string" ||
    typeof (parsed as Record<string, unknown>).watch !== "string"
  ) {
    return { error: "Model JSON missing one of: setup, interesting, watch." };
  }
  return parsed as Analysis;
}

type GeminiPart = { text?: string; thought?: boolean };

type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  };
};

type GeminiResponse = {
  candidates?: Array<GeminiCandidate>;
  error?: { code?: number; message?: string };
};

async function callGemini(
  apiKey: string,
  userContent: string,
  withGrounding: boolean,
): Promise<{ res: Response } | { error: string }> {
  const endpoint = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        // Note: tool name is `google_search` (snake_case). camelCase silently
        // mis-routes and returns 429 RESOURCE_EXHAUSTED. Also: grounding is
        // mutually exclusive with responseMimeType structured output, so we
        // lean on prompt + parseAnalysis() to extract the JSON.
        ...(withGrounding ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: 0.4,
          // Gemma 4 supports thinkingLevel MINIMAL only (LOW/HIGH are
          // rejected). Cuts end-to-end latency from ~30s to ~2s with no
          // visible quality loss on synthesis tasks like this.
          thinkingConfig: { thinkingLevel: "MINIMAL" },
        },
      }),
      cache: "no-store",
    });
    return { res };
  } catch (err) {
    return {
      error: `Network error reaching Gemini: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runAnalysisGemini(
  payload: QuotesPayload,
): Promise<AnalyzeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "GEMINI_API_KEY is not set. Add it to .env.local locally and to Vercel project settings.",
    };
  }

  const context = buildContext(payload);
  // For Gemini we fold the system prompt into the user content because
  // single-turn calls play nicest with the google_search tool.
  const userContent = `${SYSTEM_PROMPT}\n\nLive data:\n\n${JSON.stringify(
    context,
    null,
    2,
  )}\n\nIf relevant, use Google Search to check for breaking news that would change the read (geopolitics, central-bank surprises, major earnings). Only cite real, verifiable items. Remember: respond ONLY with the JSON object — no prose, no markdown.`;

  const started = Date.now();
  let useGrounding = GEMINI_GROUNDING;

  let call = await callGemini(apiKey, userContent, useGrounding);
  if ("error" in call) return { ok: false, error: call.error };

  // If grounding hits a quota issue (some models / projects have a separate
  // grounding bucket that empties before the model's own quota), retry once
  // without grounding so the analysis still works.
  if (!call.res.ok && useGrounding && call.res.status === 429) {
    useGrounding = false;
    call = await callGemini(apiKey, userContent, false);
    if ("error" in call) return { ok: false, error: call.error };
  }

  if (!call.res.ok) {
    const detail = await call.res.text().catch(() => "");
    return {
      ok: false,
      error: `Gemini returned HTTP ${call.res.status}: ${detail.slice(0, 300)}`,
    };
  }

  const json = (await call.res.json()) as GeminiResponse;
  const candidate = json.candidates?.[0];
  // Filter out chain-of-thought parts (Gemma marks them with thought: true).
  // Without this, the model's internal reasoning leaks into the JSON parser.
  const text =
    candidate?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("") ?? "";

  const parsed = parseAnalysis(text);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const sources: GroundingSource[] = (
    candidate?.groundingMetadata?.groundingChunks ?? []
  )
    .map((c) => ({ uri: c.web?.uri ?? "", title: c.web?.title ?? "" }))
    .filter((s) => s.uri.length > 0);

  const seen = new Set<string>();
  const dedupedSources = sources.filter((s) =>
    seen.has(s.uri) ? false : (seen.add(s.uri), true),
  );

  return {
    ok: true,
    analysis: parsed,
    latencyMs: Date.now() - started,
    provider: "gemini",
    sources: dedupedSources.length > 0 ? dedupedSources : undefined,
    searchQueries: candidate?.groundingMetadata?.webSearchQueries,
  };
}

export async function runAnalysisDeepSeek(
  payload: QuotesPayload,
): Promise<AnalyzeResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "DEEPSEEK_API_KEY is not set. Add it to .env.local locally and to Vercel project settings.",
    };
  }

  const context = buildContext(payload);
  const userContent = `Live data:\n\n${JSON.stringify(context, null, 2)}`;

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 600,
      }),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error reaching DeepSeek: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      error: `DeepSeek returned HTTP ${res.status}: ${detail.slice(0, 200)}`,
    };
  }

  type ChatResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const json = (await res.json()) as ChatResponse;
  const content = json.choices?.[0]?.message?.content ?? "";

  const parsed = parseAnalysis(content);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  return {
    ok: true,
    analysis: parsed,
    latencyMs: Date.now() - started,
    provider: "deepseek",
  };
}

// Re-export for callers that want to peek at what we'd send the model.
export type AnalysisContext = ReturnType<typeof buildContext>;
// Re-export formatDuration to keep import surface tight in route/UI.
export { formatDuration };
