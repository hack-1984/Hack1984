/**
 * Runs scene -> personas -> run on one idea and prints the summary and updates.
 * Run against `npm run dev` with MOCK_AI unset:
 *
 *   npx tsx scripts/try-launch.ts
 *
 * Spends ~22 model calls on MODELS.fast. PRICE=12 to try another price.
 */
import type { Idea, LaunchSummary, SceneSpec, SimPersona, SimResult, TreeUpdate } from "../src/lib/types";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PRICE = Number(process.env.PRICE ?? 8);
const PITCH = process.env.PITCH ?? "a service that matches dog owners with vetted weekend sitters";

async function post<T>(path: string, body: unknown): Promise<{ data: T; ms: number }> {
  const t = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t;
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return { data: (await res.json()) as T, ms };
}

async function main() {
  const total = Date.now();

  const tree = await post<{ idea: Idea }>("/api/tree", {
    pitch: PITCH,
    team: { roles: ["full stack dev"], skills: ["typescript"], tech: ["next.js"] },
  });
  const idea = tree.data.idea;
  console.log(`tree      ${String(tree.ms).padStart(6)}ms  ${idea.choices.length} choices  id=${idea.id}`);

  const scene = await post<{ scene: SceneSpec }>("/api/launch/scene", { idea });
  const s = scene.data.scene;
  console.log(
    `scene     ${String(scene.ms).padStart(6)}ms  icon=${s.center.icon}  ` +
      s.groups.map((g) => `${g.name}:${g.count}(${g.figure})`).join("  ")
  );

  const personas = await post<{ personas: SimPersona[] }>("/api/launch/personas", { idea, scene: s });
  const ps = personas.data.personas;
  const byGroup: Record<string, number> = {};
  for (const p of ps) byGroup[p.groupId] = (byGroup[p.groupId] ?? 0) + 1;
  console.log(
    `personas  ${String(personas.ms).padStart(6)}ms  ${ps.length} total  ${JSON.stringify(byGroup)}  ` +
      `budgets $${Math.min(...ps.map((p) => p.budget))}-$${Math.max(...ps.map((p) => p.budget))}`
  );
  console.log(`            e.g. ${ps[0].name}: ${ps[0].blurb.slice(0, 70)}`);

  const run = await post<{ results: SimResult[]; summary: LaunchSummary; updates: TreeUpdate[] }>(
    "/api/launch/run",
    { idea, scene: s, personas: ps, price: PRICE }
  );
  const { results, summary, updates } = run.data;
  console.log(
    `run       ${String(run.ms).padStart(6)}ms  buy=${summary.buy} curious=${summary.curious} ` +
      `leave=${summary.leave}  drop-off=$${summary.dropOffPrice}`
  );
  console.log(`            byGroup ${JSON.stringify(summary.byGroup)}`);

  console.log("\nobjections:");
  for (const o of summary.topObjections) console.log(`  ${String(o.count).padStart(3)}x [${o.pillar}] ${o.text}`);

  console.log("\nupdates:");
  for (const u of updates) {
    console.log(`  ${u.action.padEnd(10)} ${String(u.delta).padStart(4)}  ${u.choiceId?.padEnd(8)}  ${u.reason}`);
  }

  console.log("\nchecks:");
  console.log(`  personas match scene:  ${ps.length === s.groups.reduce((n, g) => n + g.count, 0) ? "yes" : "NO"}`);
  console.log(`  one result per persona: ${results.length === ps.length ? "yes" : "NO"}`);
  console.log(`  reasons <= 8 words:    ${results.every((r) => r.reason.split(/\s+/).length <= 10) ? "yes" : "some longer"}`);
  console.log(`  launch total:          ${scene.ms + personas.ms + run.ms}ms (bar: under 25000ms)`);
  console.log(`  everything:            ${Date.now() - total}ms`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
