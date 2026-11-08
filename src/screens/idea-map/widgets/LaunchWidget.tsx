"use client";

// Launch day (Open House for nonprofits): 100 simulated people meet the idea at a price
// (hours a month for a nonprofit). /api/launch/scene → /personas → /run, started by a button
// because a live run makes ~20 model calls. The slider re-decides locally with decide(), the
// one place the buy/curious/leave rule lives, so moving it costs nothing. "Send results to
// tree" applies the run's updates, re-running first if the slider moved since the last run.
// Results are cached per idea in this browser.
import { useMemo, useState } from "react";
import { launchPersonas, launchRun, launchScene } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import type { WireUpdate } from "@/ideas/wire";
import { decide } from "@/lib/decide";
import { formatUnit, profileFor } from "@/lib/modes";
import type { Idea, LaunchSummary, SceneSpec, SimPersona, SimResult, TreeUpdate } from "@/lib/types";
import type { WidgetCtx } from "./types";

interface Run {
  price: number;
  results: SimResult[];
  summary: LaunchSummary;
  updates: TreeUpdate[];
}
interface Saved {
  scene: SceneSpec;
  personas: SimPersona[];
  run: Run;
}

const CACHE_KEY = "launch";
const COLOR = { buy: "var(--green)", curious: "var(--amber)", leave: "var(--red)" } as const;

/** Starting price: a number in the top Revenue choice ("$8/month"), or hours in the top Approach/Solution
 *  choice for a nonprofit ("2 hrs a week"), else the mode's default. */
function defaultPrice(idea: Idea | null): number {
  const p = profileFor(idea?.mode);
  if (!idea) return p.launch.fallback;
  const top = (pillar: string) =>
    idea.choices.filter((c) => c.pillar === pillar && c.status === "active").sort((a, b) => b.confidence - a.confidence)[0];
  const clamp = (n: number) => Math.min(p.launch.max, Math.max(p.launch.min, Math.round(n)));
  if (p.launch.unit === "dollars") {
    const m = top("revenue")?.label.match(/\$\s?(\d+(?:\.\d+)?)/);
    return m ? clamp(Number(m[1])) : p.launch.fallback;
  }
  for (const pillar of ["approach", "solution"]) {
    const m = top(pillar)?.label.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\b/i);
    if (m) return clamp(Number(m[1]));
  }
  return p.launch.fallback;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10;
};

export default function LaunchWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea } = ctx;
  const idea = buildIdea();
  const mode = idea?.mode;
  const prof = profileFor(mode).launch;
  const fmt = (n: number) => formatUnit(n, mode);

  const [saved, setSaved] = useState<Saved | null>(() => loadWidgetCache<Saved>(ideaId, CACHE_KEY));
  const [price, setPrice] = useState<number>(() => saved?.run.price ?? defaultPrice(idea));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const mem = (ctx.wmem.launch ?? {}) as { sent?: Record<string, boolean> };

  const store = (s: Saved) => {
    setSaved(s);
    saveWidgetCache(ideaId, CACHE_KEY, s);
  };

  async function runAll() {
    setError(null);
    try {
      const fresh = buildIdea();
      setBusy("Setting the scene…");
      const scene = await launchScene(fresh);
      setBusy(`Inviting ${scene.groups.reduce((n, g) => n + g.count, 0) || 100} people…`);
      const personas = await launchPersonas(fresh, scene);
      setBusy("Opening the doors…");
      const r = await launchRun(fresh, scene, personas, price);
      store({ scene, personas, run: { price, ...r } });
    } catch (e) {
      setError({ message: (e as Error).message, retry: runAll });
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!saved) return;
    setError(null);
    try {
      let run = saved.run;
      if (run.price !== price) {
        setBusy(`Re-running at ${fmt(price)}…`);
        const r = await launchRun(buildIdea(), saved.scene, saved.personas, price);
        run = { price, ...r };
        store({ ...saved, run });
      }
      ctx.applyWidget(run.updates as WireUpdate[], `${prof.title} · ${fmt(run.price)}`);
      ctx.setWmem("launch", { sent: { ...(mem.sent ?? {}), [String(run.price)]: true } });
    } catch (e) {
      setError({ message: (e as Error).message, retry: send });
    } finally {
      setBusy(null);
    }
  }

  // Everything below re-derives from the slider with decide(), no network.
  const view = useMemo(() => {
    if (!saved) return null;
    const byId = new Map(saved.personas.map((p) => [p.id, p]));
    const rows = saved.run.results.map((r) => ({ r, persona: byId.get(r.personaId), d: decide(r, price) }));
    const count = { buy: 0, curious: 0, leave: 0 };
    rows.forEach((x) => count[x.d]++);
    const groups = saved.scene.groups.map((g) => {
      const mine = rows.filter((x) => x.persona?.groupId === g.id);
      const buys = mine.filter((x) => x.d === "buy").length;
      return { id: g.id, name: g.name, n: mine.length, rate: mine.length ? Math.round((100 * buys) / mine.length) : 0 };
    });
    const dropOff = median(saved.run.results.map((r) => r.maxPrice).filter((n) => n > 0));
    return { rows, count, groups, dropOff, total: rows.length };
  }, [saved, price]);

  const verbs = saved?.scene.verbs ?? prof.verbs;
  const sentHere = saved ? !!mem.sent?.[String(price)] && saved.run.price === price : false;

  return (
    <section className="wg-panel" aria-label={prof.title}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">{prof.title}</h2>
        <span className="wg-eyebrow">A rehearsal, not proof · simulated people</span>
      </div>

      {!saved && !busy ? (
        <>
          <p className="wg-muted">
            {mode === "nonprofit"
              ? "About 100 simulated community members hear about the program. See who would give the time it asks, and why the rest walk away."
              : "About 100 simulated customers see the idea at a price. See who buys, who's curious, and why the rest walk past."}
          </p>
          <p className="wg-muted" style={{ margin: 0 }}>
            Starting {mode === "nonprofit" ? "ask" : "price"}: <b style={{ color: "var(--text)" }}>{fmt(price)}</b>
          </p>
          <button type="button" className="wg-btn" onClick={runAll}>
            Run {prof.title}
          </button>
        </>
      ) : null}

      {busy ? (
        <p className="wg-muted" role="status">
          {busy}
        </p>
      ) : null}

      {error ? (
        <div className="wg-error" role="alert">
          <span>{error.message}</span>
          <button type="button" className="wg-btn" style={{ alignSelf: "flex-start", minHeight: "36px" }} onClick={error.retry}>
            Try again
          </button>
        </div>
      ) : null}

      {saved && view ? (
        <>
          <label className="ld-slider">
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--muted)" }}>{mode === "nonprofit" ? "Time asked" : "Price"}</span>
              <b>{fmt(price)}</b>
            </span>
            <input
              type="range"
              min={Math.min(prof.min, price)}
              max={Math.max(prof.max, price)}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              disabled={!!busy}
            />
          </label>

          <div className="gy-tiles" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
            {(["buy", "curious", "leave"] as const).map((k) => (
              <div className="gy-tile" key={k}>
                <div className="gy-tile-k" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="ld-dot" style={{ background: COLOR[k] }} />
                  {verbs[k]}
                </div>
                <div className="gy-tile-v">{view.count[k]}</div>
              </div>
            ))}
          </div>

          <div className="ld-grid" role="img" aria-label={`${view.count.buy} ${verbs.buy}, ${view.count.curious} ${verbs.curious}, ${view.count.leave} ${verbs.leave}`}>
            {view.rows.map(({ r, persona, d }) => (
              <span key={r.personaId} className="ld-dot" style={{ background: COLOR[d] }} title={`${persona?.name ?? "Someone"}: ${r.reason}`} />
            ))}
          </div>

          <div className="gy-tiles">
            <div className="gy-tile">
              <div className="gy-tile-k">{mode === "nonprofit" ? "Join rate" : "Buy rate"}</div>
              <div className="gy-tile-v">{view.total ? Math.round((100 * view.count.buy) / view.total) : 0}%</div>
            </div>
            <div className="gy-tile">
              <div className="gy-tile-k">Drop-off point</div>
              <div className="gy-tile-v">{fmt(view.dropOff)}</div>
            </div>
          </div>

          {view.groups.length > 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span className="wg-eyebrow">By group</span>
              {view.groups.map((g) => (
                <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>
                      {g.name} <span style={{ color: "var(--muted)" }}>· {g.n}</span>
                    </span>
                    <b>{g.rate}%</b>
                  </span>
                  <div className="cw-meter-track">
                    <div className="cw-meter-fill" style={{ width: `${g.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {saved.run.summary.topObjections?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span className="wg-eyebrow">Top objections at {fmt(saved.run.price)}</span>
              {saved.run.summary.topObjections.map((o, i) => (
                <span key={i} style={{ fontSize: "13px", lineHeight: 1.4 }}>
                  “{o.text}” <span style={{ color: "var(--muted)" }}>· {o.count}</span>
                </span>
              ))}
            </div>
          ) : null}

          <button type="button" className="wg-btn" onClick={send} disabled={!!busy || sentHere}>
            {sentHere ? "Sent to the tree" : saved.run.price === price ? "Send results to tree" : `Re-run at ${fmt(price)} and send`}
          </button>
          <button type="button" className="cw-link" style={{ alignSelf: "flex-start" }} onClick={runAll} disabled={!!busy}>
            Run again with a new crowd
          </button>
        </>
      ) : null}
    </section>
  );
}
