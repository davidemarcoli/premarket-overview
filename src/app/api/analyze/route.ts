import { NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/quotes";
import {
  runAnalysisGemini,
  // runAnalysisDeepSeek, // alternative provider, swap into `runAnalysis` below
  type Analysis,
  type GroundingSource,
} from "@/lib/analyze";

// Active provider. Swap to runAnalysisDeepSeek (and set DEEPSEEK_API_KEY) to
// trade grounding-with-search for slightly cheaper paid inference.
const runAnalysis = runAnalysisGemini;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  analysis: Analysis;
  latencyMs: number;
  generatedAt: string;
  provider: "gemini" | "deepseek";
  sources?: GroundingSource[];
  searchQueries?: string[];
};
let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry | { error: string }> | null = null;

async function generate(): Promise<CacheEntry | { error: string }> {
  const payload = await fetchQuotes();
  const result = await runAnalysis(payload);
  if (!result.ok) return { error: result.error };
  const entry: CacheEntry = {
    analysis: result.analysis,
    latencyMs: result.latencyMs,
    generatedAt: payload.fetchedAt,
    provider: result.provider,
    sources: result.sources,
    searchQueries: result.searchQueries,
  };
  cache = entry;
  return entry;
}

function fresh(entry: CacheEntry | null): entry is CacheEntry {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.generatedAt).getTime();
  return age < TTL_MS;
}

/** Read the cached analysis (or null). Never generates. */
export async function GET() {
  if (cache) {
    return NextResponse.json(
      { ok: true, cached: true, fresh: fresh(cache), ...cache },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, cached: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Force a new generation (or join an in-flight one). The button in the UI
 * always calls POST so the user controls when AI credit is spent.
 */
export async function POST() {
  if (inflight) {
    const result = await inflight;
    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, cached: false, fresh: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  inflight = generate();
  try {
    const result = await inflight;
    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, cached: false, fresh: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    inflight = null;
  }
}
