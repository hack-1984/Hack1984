/**
 * Demo-day warm-up: pre-runs the backup pitches so they come back instantly.
 *
 *   MOCK_AI= npx tsx scripts/warm-cache.ts
 *
 * The tree cache lives in the route's own memory and is keyed on
 * pitch + team + mode, so it dies with the server. Run this AFTER the demo
 * server is up and leave it alone — restarting the server throws it away.
 *
 * The team profile here must match whatever the demo actually sends, or the
 * key differs and the cache misses. It is the intake's default: no team.
 */
import type { Idea, Mode } from "../src/lib/types";

const BASE = process.env.BASE ?? "http://localhost:3000";

/** Two nonprofit backups and one startup, per the plan. */
const WARM: { mode: Mode; pitch: string }[] = [
  { mode: "nonprofit", pitch: "a free after-school coding club for middle schoolers in Dorchester" },
  { mode: "nonprofit", pitch: "a food pantry serving families in east Austin" },
  { mode: "startup", pitch: "an app that tells you where the fish are biting today" },
];

/** The intake's default team: whatever the demo types, it sends this shape. */
const TEAM = { roles: [], skills: [], tech: [] };

async function warm(mode: Mode, pitch: string) {
  const t = Date.now();
  const res = await fetch(`${BASE}/api/tree`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pitch, team: TEAM, mode }),
  });
  if (!res.ok) {
    console.log(`x  HTTP ${res.status}  ${pitch.slice(0, 44)}`);
    return false;
  }
  const { idea } = (await res.json()) as { idea: Idea };
  const placeholders = idea.choices.filter((c) => c.label === "Not figured out yet").length;
  // A fallback tree is NOT cached by the route, so warming it achieves
  // nothing and the demo would pay full price for it live. Say so loudly.
  console.log(
    `${placeholders ? "!" : " "}  ${String(Date.now() - t).padStart(6)}ms  ` +
      `${idea.choices.length} choices  ${mode.padEnd(10)}${pitch.slice(0, 44)}` +
      `${placeholders ? "  <- fallback, NOT cached, run again" : ""}`
  );
  return placeholders === 0;
}

async function main() {
  if (process.env.MOCK_AI === "1") {
    console.log("MOCK_AI=1 — mocks are already instant and nothing needs warming.");
    return;
  }

  console.log(`warming ${WARM.length} pitches against ${BASE}\n`);
  const ok: boolean[] = [];
  for (const { mode, pitch } of WARM) ok.push(await warm(mode, pitch));

  console.log("\nsecond pass (these should all be under 500ms):");
  for (const { mode, pitch } of WARM) await warm(mode, pitch);

  const bad = ok.filter((x) => !x).length;
  console.log(
    `\n${ok.length - bad}/${ok.length} cached.` +
      (bad ? ` ${bad} came back as fallbacks and were not cached — run it again.` : "") +
      "\nLeave the server running: restarting it empties the cache."
  );
}

main();
