/**
 * POSTs a spread of pitches to /api/tree and prints time and choices per pillar.
 * Run against `npm run dev` with MOCK_AI unset:
 *
 *   MOCK_AI= npx tsx scripts/try-tree.ts
 *   MOCK_AI= npx tsx scripts/try-tree.ts --mode nonprofit
 *
 * Every run spends real credits. LIMIT=2 while iterating.
 */
import { PILLAR_KEYS } from "../src/lib/pillars";
import { singleSourceFunding } from "../src/server/research/modes";
import type { Idea, Mode, TeamProfile } from "../src/lib/types";

const BASE = process.env.BASE ?? "http://localhost:3000";

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const MODE = ((arg("--mode") ?? process.env.MODE ?? "startup") as Mode) satisfies Mode;

const PITCHES: Record<Mode, string[]> = {
  startup: [
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
  ],
  // The plan's ten: nine real causes across different shapes of work, and
  // one nonsense pitch, because a tree that only works on good input is not
  // something you can put in front of a judge.
  nonprofit: [
    "a food pantry serving families in east Austin",
    "free after-school tutoring for high schoolers in Providence",
    "a volunteer group that cleans up the Charles River",
    "job training and placement for refugees resettling in Boise",
    "a community theater that puts on free shows in public parks",
    "an animal rescue that fosters and rehomes dogs in rural Georgia",
    "a mutual aid network delivering groceries to housebound neighbours",
    "a free clinic offering basic primary care to uninsured adults",
    "a youth sports league for kids who cannot afford club fees",
    "purple elephant banana telephone",
  ],
};

const TEAMS: Record<Mode, TeamProfile> = {
  startup: {
    roles: ["full stack dev", "designer"],
    skills: ["typescript", "react", "some ML"],
    tech: ["next.js", "postgres"],
    hoursPerWeek: 20,
    budget: "under $500",
  },
  // Deliberately thin on admin: this is the team shape that should make
  // feasibility reach for a fiscal sponsor instead of its own 501(c)(3).
  nonprofit: {
    roles: ["organiser", "teacher"],
    skills: ["community outreach", "curriculum"],
    tech: ["google sheets"],
    hoursPerWeek: 12,
    budget: "no funding yet",
  },
};

async function main() {
  const times: number[] = [];
  let failures = 0;
  const nonprofit = MODE === "nonprofit";

  const all = PITCHES[MODE];
  const limit = Number(process.env.LIMIT ?? all.length);
  const pitches = all.slice(0, limit);
  console.log(`mode ${MODE} — running ${pitches.length} of ${all.length} pitches\n`);

  // Tallies for the plan's "done means" bar.
  let wrongMode = 0;
  let withPeerMoney = 0;
  let fundingTooConfident = 0;

  for (const pitch of pitches) {
    const t = Date.now();
    try {
      const res = await fetch(`${BASE}/api/tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch, team: TEAMS[MODE], mode: MODE }),
      });
      const ms = Date.now() - t;
      times.push(ms);

      if (!res.ok) {
        failures++;
        console.log(`x ${String(ms).padStart(6)}ms  HTTP ${res.status}  ${pitch.slice(0, 40)}`);
        continue;
      }

      const { idea } = (await res.json()) as { idea: Idea };
      const counts = PILLAR_KEYS.map((p) => idea.choices.filter((c) => c.pillar === p).length);
      const placeholders = idea.choices.filter((c) => c.label === "Not figured out yet").length;
      const withUrl = idea.choices.flatMap((c) => c.evidence).filter((e) => e.url).length;
      const slow = ms > 25_000 ? "!" : " ";

      if ((idea.mode ?? "startup") !== MODE) wrongMode++;

      // Nonprofit extras: real Form 990 money, and the single-source rule.
      let extra = "";
      if (nonprofit) {
        const peers = idea.research.competitors.filter((c) => /Form 990/.test(c.summary)).length;
        if (peers > 0) withPeerMoney++;

        const funding = idea.choices.filter((c) => c.pillar === "revenue");
        const bad = funding.filter(
          (c) => c.confidence >= 45 && singleSourceFunding(`${c.label} ${c.sub} ${c.detail}`)
        );
        if (bad.length > 0) fundingTooConfident++;
        extra =
          `${String(peers).padStart(2)} peer$  ` +
          `fund ${String(Math.max(0, ...funding.map((c) => c.confidence))).padStart(3)}` +
          `${bad.length ? " RED-FAIL" : ""}  `;
      }

      console.log(
        `${slow} ${String(ms).padStart(6)}ms  [${counts.join(",")}]  ` +
          `${String(idea.choices.length).padStart(2)} choices  ${String(withUrl).padStart(2)} cited  ` +
          `${extra}${placeholders ? `${placeholders} placeholder ` : ""}${pitch.slice(0, 34)}`
      );
    } catch (err) {
      failures++;
      times.push(Date.now() - t);
      console.log(`x ERR  ${pitch.slice(0, 40)}  ${err instanceof Error ? err.message : err}`);
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  const ok = pitches.length - failures;
  console.log(
    `\npillar order: ${PILLAR_KEYS.join(",")}` +
      `\n${ok}/${pitches.length} returned a tree` +
      `\nmedian ${sorted[Math.floor(sorted.length / 2)]}ms, slowest ${sorted.at(-1)}ms (bar: under 25000ms)` +
      `\nmode tagged ${MODE}: ${ok - wrongMode}/${ok}` +
      (nonprofit
        ? `\npeer org with real Form 990 revenue: ${withPeerMoney}/${ok} (bar: most)` +
          `\nsingle-source funding that still scored 45+: ${fundingTooConfident} (bar: 0)`
        : "")
  );
}

main();
