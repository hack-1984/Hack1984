import { NextResponse } from "next/server";
import { ResearchResponseSchema } from "@/lib/schemas";
import type { Evidence } from "@/lib/types";

/**
 * STUB. Returns fake Evidence so the UI can render sources and tiers.
 * Replace with the Tavily search + Claude extraction.
 */
const FAKE_EVIDENCE: Evidence[] = [
  {
    type: "source",
    tier: "researched",
    text: "Large intro STEM lectures commonly exceed 300 students per section.",
    url: "https://example.edu/enrollment",
    origin: "research",
  },
  {
    type: "competitor",
    tier: "researched",
    text: "Course-specific Discord and GroupMe servers already serve as free open boards.",
    url: "https://example.com/competitor",
    origin: "research",
  },
  {
    type: "quote",
    tier: "real",
    text: "I posted in the course Discord twice and nobody replied.",
    origin: "customer interview 1",
  },
];

export async function POST(req: Request) {
  await req.json().catch(() => ({}));
  return NextResponse.json(ResearchResponseSchema.parse({ evidence: FAKE_EVIDENCE }));
}

export async function GET() {
  return NextResponse.json(ResearchResponseSchema.parse({ evidence: FAKE_EVIDENCE }));
}
