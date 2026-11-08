/**
 * POST /api/tree/stream — { pitch, team?, mode? } -> newline-delimited JSON, one PlantEvent per line
 * (src/ideas/planting.ts):
 *   { type: "status", phase, text }          a research phase began
 *   { type: "query", purpose, text }          one search query, as written
 *   { type: "source", purpose, title, url, domain }   one page a search returned, the moment it lands
 *   { type: "idea", idea }                    the finished Idea, exactly what POST /api/tree returns
 *   { type: "error", message }                it failed; nothing follows
 *
 * Same pipeline and the same cache as /api/tree (src/server/research/treeCache.ts), so a pitch
 * warmed through one is a hit on the other. MOCK_AI=1 drips fixture events over ~10s and ends
 * with the fixture idea, so the planting scene can be built for free.
 */
import { nanoid } from "nanoid";
import type { TreeRequest } from "@/lib/contracts";
import { fixtureFor } from "@/lib/modes";
import type { Idea } from "@/lib/types";
import type { PlantEvent } from "@/ideas/planting";
import { cacheKey } from "@/server/cache";
import { extractBundle, gatherHits } from "@/server/research/gather";
import { assembleIdea, generateChoices } from "@/server/research/generateTree";
import { mockPlantEvents } from "@/server/research/plantMocks";
import { EMPTY_TEAM, treeCache } from "@/server/research/treeCache";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<TreeRequest>;
  const pitch = body.pitch?.trim();
  const mock = process.env.MOCK_AI === "1";
  if (!pitch && !mock) return Response.json({ error: "pitch is required" }, { status: 400 });
  const team = body.team ?? EMPTY_TEAM;
  const mode = body.mode ?? "startup";

  const enc = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (e: PlantEvent) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const finish = (idea: Idea) => {
        send({ type: "idea", idea });
        close();
      };

      if (mock) {
        const fixture = fixtureFor(mode);
        const idea: Idea = { ...fixture, id: nanoid(8), createdAt: Date.now(), pitch: pitch || fixture.pitch };
        const timed = mockPlantEvents(idea.pitch, mode);
        const timers = timed.map(({ at, event }) => setTimeout(() => send(event), at));
        const last = timed[timed.length - 1]?.at ?? 0;
        timers.push(setTimeout(() => finish(idea), last + 600));
        stop = () => timers.forEach(clearTimeout);
        return;
      }

      void run(pitch as string, team, mode, send, finish, close);
    },
    cancel() {
      stop(); // the client left; a real run keeps going and still fills the cache
    },
  });

  req.signal.addEventListener("abort", () => stop());
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

async function run(
  pitch: string,
  team: TreeRequest["team"],
  mode: NonNullable<TreeRequest["mode"]>,
  send: (e: PlantEvent) => void,
  finish: (idea: Idea) => void,
  close: () => void
) {
  const key = cacheKey(pitch, team, mode);
  const t0 = Date.now();

  const cached = treeCache.get(key);
  if (cached) {
    // Fresh identity, cached content, as /api/tree does. Nothing is replayed as if it
    // were happening; the one status is true.
    console.log(`[api/tree/stream] cache HIT in ${Date.now() - t0}ms for "${pitch.slice(0, 50)}"`);
    send({ type: "status", phase: "save", text: "Planting your idea" });
    finish({ ...cached, id: nanoid(8), createdAt: Date.now() });
    return;
  }

  try {
    const { hits, peers } = await gatherHits(pitch, mode, send);
    const tSearch = Date.now();
    const sites = new Set(hits.map((h) => h.url).filter(Boolean).map((u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return u;
      }
    })).size;
    send({ type: "status", phase: "read", text: hits.length ? `Reading ${hits.length} sources from ${sites} sites` : "Reading what we found" });
    send({ type: "status", phase: "grow", text: "Scoring your eight pillars" });

    const [research, choices] = await Promise.all([
      extractBundle(pitch, hits, mode, peers),
      generateChoices(pitch, hits, team, mode, peers),
    ]);
    const idea = assembleIdea(pitch, research, choices, mode);

    const isFallback = idea.choices.every((c) => c.label === "Not figured out yet");
    if (!isFallback) treeCache.set(key, idea);
    console.log(
      `[api/tree/stream] cache MISS, ${Date.now() - t0}ms total (search ${tSearch - t0}ms, parallel ${Date.now() - tSearch}ms) for "${pitch.slice(0, 50)}"`
    );
    send({ type: "status", phase: "save", text: "Planting your idea" });
    finish(idea);
  } catch (err) {
    console.error(`[api/tree/stream] unexpected failure after ${Date.now() - t0}ms:`, err);
    // Same degraded idea /api/tree returns, so the founder still gets a map.
    try {
      const idea = assembleIdea(
        pitch,
        { competitors: [], complaints: [], marketNotes: [] },
        await generateChoices(pitch, [], team, mode),
        mode
      );
      send({ type: "status", phase: "save", text: "Planting your idea" });
      finish(idea);
    } catch (err2) {
      send({ type: "error", message: err2 instanceof Error ? err2.message : "Research failed" });
      close();
    }
  }
}
