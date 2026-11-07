import { NextResponse } from "next/server";
import { UpdateResponseSchema } from "@/lib/schemas";
import type { TreeUpdate } from "@/lib/types";

/**
 * STUB. The update extractor: takes new information (research, an interview,
 * a launch result, a grave) and returns the TreeUpdates it implies.
 * Replace with the Claude call; keep the Zod parse on the way out.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const updates: TreeUpdate[] = [
    {
      action: "strengthen",
      choiceId: typeof body?.choiceId === "string" ? body.choiceId : "problem-1",
      delta: 8,
      reason: "Stub update — replace this route with the real extractor.",
      source: "research",
      at: Date.now(),
    },
  ];

  return NextResponse.json(UpdateResponseSchema.parse({ updates }));
}
