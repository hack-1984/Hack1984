/**
 * POST /api/graveyard/stream — { idea } -> newline-delimited JSON, one event per line:
 *   { type: "status", text }                     what the search is doing now
 *   { type: "grave", record }                    a DetailedRecord (same as /detail), the moment it's found
 *   { type: "done", adjacent, count }            the search finished
 *   { type: "error", message }                   it failed; graves already sent stay valid
 *
 * Joins the same per-idea run as /api/graveyard and /detail (and any prefetch), so a stream
 * opened mid-search replays what's been found and nothing is searched twice.
 * MOCK_AI=1 drips the mock graves ~400ms apart, so the UI can be built and tested for free.
 */
import type { GraveyardReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody } from "@/server/conversation/util";
import { isAdjacent, subscribeRecords, toDetailed, type GraveEvent } from "@/server/graveyard";
import { mockRecordsFor } from "@/server/graveyard/mocks";

const MOCK_STEP_MS = 400;

export async function POST(req: Request) {
  const body = await readBody<GraveyardReq>(req);
  if (!body) return badRequest("expected { idea }");
  const idea = body.idea;
  const enc = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (line: object) => {
        if (!closed) controller.enqueue(enc.encode(JSON.stringify(line) + "\n"));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        stop();
        controller.close();
      };
      const onEvent = (e: GraveEvent) => {
        if (e.type === "record") send({ type: "grave", record: toDetailed([e.record], idea)[0] });
        else send(e);
        if (e.type === "done" || e.type === "error") close();
      };

      if (isMock()) {
        const records = mockRecordsFor(idea);
        const timers: ReturnType<typeof setTimeout>[] = [];
        stop = () => timers.forEach(clearTimeout);
        onEvent({ type: "status", text: "Searching for similar startups that shut down… (mock)" });
        records.forEach((record, i) => timers.push(setTimeout(() => onEvent({ type: "record", record }), (i + 1) * MOCK_STEP_MS)));
        timers.push(setTimeout(() => onEvent({ type: "done", adjacent: isAdjacent(records), count: records.length }), (records.length + 1) * MOCK_STEP_MS));
        return;
      }
      stop = subscribeRecords(idea, onEvent);
    },
    cancel() {
      stop(); // the client left; the run itself keeps going and stays cached
    },
  });

  req.signal.addEventListener("abort", () => stop());
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
