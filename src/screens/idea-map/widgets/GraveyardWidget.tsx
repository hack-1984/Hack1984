"use client";

// Graveyard: similar startups that shut down, shown as gravestones.
// Opening a grave the first time haunts the choice it threatens (once per grave per idea).
// "Learn from this" adds the grave's fix as a suggested choice in Overview's "Waiting on you".
// Every idea calls /api/graveyard/detail; results are cached per idea in this browser.
// Layout from design/sprout-mocks/App.dc.html; colors from the Sprout theme.
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGraveyard } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import { PILLAR_BY_KEY } from "@/lib/pillars";
import type { GraveyardDetailResponse, WireUpdate } from "@/ideas/wire";
import type { WidgetCtx } from "./types";

interface Grave {
  name: string;
  years: string;
  epitaph: string;
  raised: string;
  pillar: string;
  story: string;
  fix: string;
  sources: string[];
  adjacent: boolean;
  similarity: number;
  x: number;
  y: number;
  rot: number;
  haunt?: WireUpdate;
  learn?: WireUpdate;
}

const label = (k: string) => PILLAR_BY_KEY[k as keyof typeof PILLAR_BY_KEY]?.startup ?? k;
// Where graves stand in the yard: x as % of the yard's width, y as % of its height (the stone's base).
// Back row higher and smaller-looking, front row lower, staggered like the mock.
const SLOTS = [
  { x: 50, y: 52, rot: -3 }, { x: 22, y: 58, rot: 4 }, { x: 78, y: 56, rot: -5 },
  { x: 36, y: 86, rot: 3 }, { x: 64, y: 88, rot: -2 }, { x: 88, y: 84, rot: 4 },
];
const money = (n?: number) => (!n ? "Not disclosed" : n >= 1e9 ? `$${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

function apiGraves(res: GraveyardDetailResponse): Grave[] {
  return res.records.slice(0, SLOTS.length).map((r, i) => ({
    name: r.name,
    years: r.founded && r.died ? `${r.founded}–${r.died}` : r.died ? `Shut down ${r.died}` : "",
    epitaph: r.epitaph,
    raised: money(r.raisedUsd),
    pillar: label(r.threatens[0]?.pillar ?? "risks"),
    story: r.story,
    fix: r.lesson,
    sources: r.sources ?? [],
    adjacent: res.adjacent,
    similarity: r.similarity,
    ...SLOTS[i],
    haunt: r.updates.find((u) => u.action === "haunt"),
    learn: r.updates.find((u) => u.action === "add"),
  }));
}

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; graves: Grave[] };

export default function GraveyardWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea } = ctx;
  const [load, setLoad] = useState<Load>(() => {
    const cached = loadWidgetCache<GraveyardDetailResponse>(ideaId, "graveyard");
    return cached ? { state: "ready", graves: apiGraves(cached) } : { state: "loading" };
  });
  const [sel, setSel] = useState<number | null>(null);
  const mem = (ctx.wmem.graveyard ?? {}) as { haunted?: Record<string, boolean>; learned?: Record<string, boolean> };

  const fetchNow = useCallback(() => {
    setLoad({ state: "loading" });
    fetchGraveyard(buildIdea())
      .then((res) => {
        saveWidgetCache(ideaId, "graveyard", res);
        setLoad({ state: "ready", graves: apiGraves(res) });
      })
      .catch((e: Error) => setLoad({ state: "error", message: e.message }));
  }, [buildIdea, ideaId]);

  // Fetch once if this idea has nothing cached.
  const started = useRef(false);
  useEffect(() => {
    if (load.state !== "loading" || started.current) return;
    started.current = true;
    fetchNow();
  }, [load.state, fetchNow]);

  // The haunt lands a moment after the grave opens, so the founder sees the grave first.
  // If the widget closes before then, apply it straight away rather than losing it.
  const pending = useRef<{ t: ReturnType<typeof setTimeout>; run: () => void } | null>(null);
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  });
  useEffect(() => () => {
    if (pending.current) {
      clearTimeout(pending.current.t);
      pending.current.run();
    }
  }, []);

  const graves = load.state === "ready" ? load.graves : [];
  const g = sel !== null ? graves[sel] : null;

  function pick(i: number) {
    const next = sel === i ? null : i;
    setSel(next);
    if (next === null) return;
    const grave = graves[next];
    if (!grave.haunt || mem.haunted?.[grave.name]) return;
    ctx.setWmem("graveyard", { haunted: { ...(mem.haunted ?? {}), [grave.name]: true } });
    if (pending.current) {
      clearTimeout(pending.current.t);
      pending.current.run();
    }
    const run = () => {
      pending.current = null;
      ctxRef.current.applyWidget([grave.haunt as WireUpdate], `Graveyard · ${grave.name}`, `Haunted by ${grave.name}`);
    };
    pending.current = { t: setTimeout(run, 700), run };
  }

  function learn() {
    if (!g) return;
    if (mem.learned?.[g.name]) {
      ctx.openOverview();
      return;
    }
    if (!g.learn) return;
    const label = g.learn.newChoice?.label ?? "the fix";
    const changes = ctx.applyWidget([g.learn], `Graveyard · ${g.name}`, `Suggested “${label}” · learned from ${g.name}`);
    if (changes.length) ctx.setWmem("graveyard", { learned: { ...(mem.learned ?? {}), [g.name]: true } });
  }

  return (
    <section className="wg-panel" aria-label="Graveyard">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">Graveyard</h2>
        {load.state === "ready" ? (
          <span className="wg-eyebrow">
            {graves.length} similar {graves.length === 1 ? "startup" : "startups"} that shut down
          </span>
        ) : null}
      </div>

      {load.state === "loading" ? (
        <p className="wg-muted" role="status">
          Digging up similar startups…
        </p>
      ) : null}

      {load.state === "error" ? (
        <div className="wg-error" role="alert">
          <span>{load.message}</span>
          <button type="button" className="wg-btn" style={{ alignSelf: "flex-start", minHeight: "36px" }} onClick={fetchNow}>
            Try again
          </button>
        </div>
      ) : null}

      {load.state === "ready" && !graves.length ? <p className="wg-muted">No similar shutdowns found for this idea.</p> : null}

      {graves.length ? (
        <>
          {/* The yard: stones scattered on a patch of ground. Size follows similarity; the open one grows.
              Names show on hover / keyboard focus, and stay under the open stone. */}
          <div className={`gy-yard${sel !== null ? " has-sel" : ""}`}>
            {graves.map((gr, i) => {
              const w = Math.round(22 + gr.similarity / 4);
              const on = sel === i;
              const other = sel !== null && !on;
              const tip = `gy-tip-${i}`;
              return (
                <div key={gr.name} className={`gy-plot${on ? " is-on" : ""}${other ? " is-other" : ""}`} style={{ left: `${gr.x}%`, top: `${gr.y}%`, zIndex: Math.round(gr.y) }}>
                  <button
                    type="button"
                    className="gy-stone"
                    aria-label={`${gr.name}, ${gr.years}${mem.haunted?.[gr.name] ? ", opened" : ""}`}
                    aria-describedby={tip}
                    aria-pressed={on}
                    onClick={() => pick(i)}
                    style={{ width: `${w}px`, height: `${Math.round(w * 1.3)}px`, transform: `translate(-50%, -100%) rotate(${gr.rot}deg) scale(${on ? 1.4 : other ? 0.82 : 1})` }}
                  >
                    <span className="gy-engrave" aria-hidden="true" />
                  </button>
                  <span id={tip} role="tooltip" className="gy-tip">
                    {gr.name}
                  </span>
                </div>
              );
            })}
          </div>
          {sel === null ? <p className="wg-muted">Hover a gravestone to see its name. Open one to learn why it shut down.</p> : null}
        </>
      ) : null}

      {g ? (
        <div className="gy-detail" key={g.name}>
          <div className="gy-head">
            <span style={{ fontSize: "16px", fontWeight: 700 }}>{g.name}</span>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>{g.years}</span>
            {g.adjacent ? <span className="gy-tag">Adjacent market</span> : null}
          </div>
          <span style={{ fontSize: "14px", fontStyle: "italic", color: "var(--text)" }}>“{g.epitaph}”</span>
          <div className="gy-tiles">
            <div className="gy-tile">
              <div className="gy-tile-k">Raised</div>
              <div className="gy-tile-v">{g.raised}</div>
            </div>
            <div className="gy-tile">
              <div className="gy-tile-k">Threatens</div>
              <div className="gy-tile-v">
                {g.pillar} · {ctx.pillarPct[g.pillar] ?? 0}%
              </div>
            </div>
          </div>
          <span style={{ fontSize: "13px", lineHeight: 1.5 }}>{g.story}</span>
          <span style={{ fontSize: "13px", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600 }}>What they should have done: </span>
            {g.fix}
          </span>
          {g.sources.length ? (
            <div className="gy-sources">
              <span>{g.sources.length} {g.sources.length === 1 ? "SOURCE" : "SOURCES"} ·</span>
              {g.sources.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                  {host(u)}
                </a>
              ))}
            </div>
          ) : (
            <div className="gy-sources">NO SOURCES</div>
          )}
          {g.learn ? (
            <button type="button" className="wg-btn" onClick={learn}>
              {mem.learned?.[g.name] ? "Review it in Overview →" : "Learn from this"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
