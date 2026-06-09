import { NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await fetchQuotes();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
