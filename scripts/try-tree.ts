/**
 * POSTs a spread of pitches to /api/tree and prints time and choices per pillar.
 * Run against `npm run dev` with MOCK_AI unset:
 *
 *   MOCK_AI= npx tsx scripts/try-tree.ts
 */
import { PILLAR_KEYS } from "../src/lib/pillars";
import type { Idea } from "../src/lib/types";

const BASE = process.env.BASE ?? "http://localhost:3000";

const PITCHES = [
  "an app that tells you where the fish are biting today",
  "B2B software that reconciles freight invoices automatically",
  "a marketplace for renting camera gear from people nearby",
  "a neighbourhood bakery that only sells sourdough by subscription",
  "a hardware sensor that tells farmers when soil needs water",
  "a nonprofit that refurbishes laptops for students who need them",
  "a tool that turns meeting recordings into decisions and owners",
  "a service that books and manages dog walkers for busy owners",
  "purple elephant banana telephone",
  "an app",
];

const TEAM = {
  roles: ["full stack dev", "designer"],
  skills: ["typescript", "react", "some ML"],
  tech: ["next.js", "postgres"],
  hoursPerWeek: 20,
  budget: "under $500",
};

async function main() {
  const times: number[] = [];
  let failures = 0;

  // Every run spends real credits. LIMIT=2 while iterating; unset for the full set.
  const limit = Number(process.env.LIMIT ?? PITCHES.length);
  const pitches = PITCHES.slice(0, limit);
  console.log(`running ${pitches.length} of ${PITCHES.length} pitches\n`);

  for (const pitch of pitches) {
    const t = Date.now();
    try {
      const res = await fetch(`${BASE}/api/tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch, team: TEAM }),
      });
      const ms = Date.now() - t;
      times.push(ms);

      if (!res.ok) {
        failures++;
        console.log(`✗ ${String(ms).padStart(6)}ms  HTTP ${res.status}  ${pitch.slice(0, 40)}`);
        continue;
      }

      const { idea } = (await res.json()) as { idea: Idea };
      const counts = PILLAR_KEYS.map((p) => idea.choices.filter((c) => c.pillar === p).length);
      const placeholders = idea.choices.filter((c) => c.label === "Not figured out yet").length;
      const withUrl = idea.choices.flatMap((c) => c.evidence).filter((e) => e.url).length;
      const slow = ms > 25_000 ? "!" : " ";

      console.log(
        `${slow} ${String(ms).padStart(6)}ms  [${counts.join(",")}]  ` +
          `${String(idea.choices.length).padStart(2)} choices  ${withUrl} cited  ` +
          `${placeholders ? `${placeholders} placeholder ` : ""}${pitch.slice(0, 34)}`
      );
    } catch (err) {
      failures++;
      times.push(Date.now() - t);
      console.log(`✗ ERR  ${pitch.slice(0, 40)}  ${err instanceof Error ? err.message : err}`);
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  console.log(
    `\npillar order: ${PILLAR_KEYS.join(",")}` +
      `\n${pitches.length - failures}/${pitches.length} returned a tree` +
      `\nmedian ${sorted[Math.floor(sorted.length / 2)]}ms, slowest ${sorted.at(-1)}ms (bar: under 25000ms)`
  );
}

main();
