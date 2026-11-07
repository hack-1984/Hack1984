/**
 * POST /api/graveyard/learn — { idea, grave } -> { update }
 *
 * An ADAPTER, not a second implementation. The learn update already exists:
 * buildUpdates() in src/server/graveyard/updates.ts produces one per record,
 * and /api/graveyard/detail already returns them inline. This route exists
 * only so a client holding a single Grave can ask for its replacement choice
 * by URL, without reasoning about FailureRecords.
 *
 * All the logic — the proposed choice, its confidence, its evidence — belongs
 * to the graveyard module and is NOT duplicated here. If the two ever
 * disagree, the module is right.
 */
import type { Idea, TreeUpdate } from "@/server/conversation/deps";
import { badRequest, isMock, serverError } from "@/server/conversation/util";
import { buildUpdates, getRecords, type FailureRecord } from "@/server/graveyard";
import { mockRecordsFor } from "@/server/graveyard/mocks";
import type { Grave } from "@/lib/types";

interface LearnReq {
  idea?: Idea;
  grave?: Pick<Grave, "name">;
}

export async function POST(req: Request) {
  let body: LearnReq;
  try {
    body = (await req.json()) as LearnReq;
  } catch {
    return badRequest("expected { idea, grave }");
  }

  const idea = body.idea;
  const name = body.grave?.name?.trim();
  if (!idea || !name) return badRequest("expected { idea, grave } with grave.name");

  try {
    const records: FailureRecord[] = isMock() ? mockRecordsFor(idea) : await getRecords(idea);
    const record = records.find((r) => r.name.toLowerCase() === name.toLowerCase());

    if (!record) {
      // Better than inventing a lesson for a grave we never researched.
      return Response.json(
        { error: `no graveyard record named "${name}" for this idea` },
        { status: 404 }
      );
    }

    const learn: TreeUpdate | undefined = buildUpdates(record, idea).learns[0];
    if (!learn) {
      // Happens when the record threatens no resolvable active choice.
      return Response.json(
        { error: `no threatened choice to replace for "${record.name}"` },
        { status: 409 }
      );
    }

    return Response.json({ update: learn });
  } catch (e) {
    return serverError("graveyard/learn", e);
  }
}
