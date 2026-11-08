"use client";

// Graveyard: similar startups that shut down, shown as gravestones.
// Opening a grave the first time haunts the choice it threatens (once per grave per idea).
// "Learn from this" adds the grave's fix as a suggested choice in Overview's "Waiting on you".
// Graves stream in from /api/graveyard/stream and rise into the yard one by one as they're found,
// with a live status line while the search runs. Finished results are cached per idea in this browser.
// Layout from design/sprout-mocks/App.dc.html; colors from the Sprout theme.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamGraveyard } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import type { GraveRecord, GraveyardDetailResponse, WireUpdate } from "@/ideas/wire";
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

function toGraves(records: GraveRecord[], adjacent: boolean, label: (key: string) => string): Grave[] {
  return records.slice(0, SLOTS.length).map((r, i) => ({
    name: r.name,
    years: r.founded && r.died ? `${r.founded}–${r.died}` : r.died ? `Shut down ${r.died}` : "",
    epitaph: r.epitaph,
    raised: money(r.raisedUsd),
    pillar: label(r.threatens[0]?.pillar ?? "risks"),
    story: r.story,
    fix: r.lesson,
    sources: r.sources ?? [],
    adjacent,
    similarity: r.similarity,
    ...SLOTS[i],
    haunt: r.updates.find((u) => u.action === "haunt"),
    learn: r.updates.find((u) => u.action === "add"),
  }));
}

type Phase = "searching" | "done" | "error";

export default function GraveyardWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea } = ctx;
  const nonprofit = buildIdea()?.mode === "nonprofit";
  const kind = nonprofit ? ["organization", "organizations"] : ["startup", "startups"];
  // Nonprofit wording: causes, not markets; a closed charity's money is its peak budget, not funds raised.
  const words = nonprofit
    ? { nearby: "No close matches. These shut down in nearby causes.", adjacent: "Adjacent cause", raised: "Peak budget" }
    : { nearby: "No close matches. These shut down in nearby markets.", adjacent: "Adjacent market", raised: "Raised" };
  const [cached] = useState(() => loadWidgetCache<GraveyardDetailResponse>(ideaId, "graveyard"));
  const [records, setRecords] = useState<GraveRecord[]>(cached?.records ?? []);
  const [adjacent, setAdjacent] = useState(cached?.adjacent ?? false);
  const [phase, setPhase] = useState<Phase>(cached ? "done" : "searching");
  const [status, setStatus] = useState(`Looking for similar ${kind[1]} that shut down…`);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const mem = (ctx.wmem.graveyard ?? {}) as { haunted?: Record<string, boolean>; learned?: Record<string, boolean> };
  const abort = useRef<AbortController | null>(null);
  // ctx.buildIdea is a new function every render; read it through a ref so the search isn't restarted by re-renders.
  const buildRef = useRef(buildIdea);
  useEffect(() => {
    buildRef.current = buildIdea;
  });

  // Follow the search live: each grave is added the moment the server finds it.
  // State only changes inside the stream's callbacks.
  const follow = useCallback(() => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const found: GraveRecord[] = [];
    let adj = false;
    streamGraveyard(
      buildRef.current(),
      (e) => {
        if (e.type === "status") setStatus(e.text);
        else if (e.type === "grave") {
          if (found.some((r) => r.name === e.record.name)) return;
          found.push(e.record);
          setRecords([...found]);
        } else if (e.type === "done") {
          adj = e.adjacent;
          setAdjacent(adj);
          setPhase("done");
          saveWidgetCache(ideaId, "graveyard", { records: found, adjacent: adj } satisfies GraveyardDetailResponse);
        } else if (e.type === "error") {
          setError(e.message);
          setPhase("error");
        }
      },
      ac.signal
    ).catch((err: Error) => {
      if (ac.signal.aborted) return;
      setError(err.message);
      setPhase("error");
    });
  }, [ideaId]);

  /** "Search again": reset the yard's status, then follow a fresh stream. */
  function search() {
    setPhase("searching");
    setError(null);
    follow();
  }

  // Search if this idea has nothing cached, and stop listening when the widget closes. Starting again
  // (React's dev double-mount, or reopening mid-search) costs nothing: the server shares one run per
  // idea and replays the graves already found.
  useEffect(() => {
    if (cached) return;
    follow();
    return () => abort.current?.abort();
  }, [cached, follow]);

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

  const graves = useMemo(() => toGraves(records, adjacent, ctx.showPillar), [records, adjacent, ctx.showPillar]);
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
        {phase === "done" ? (
          <span className="wg-eyebrow">
            {graves.length} similar {graves.length === 1 ? kind[0] : kind[1]} that shut down
          </span>
        ) : null}
      </div>

      {phase === "searching" ? (
        <div className="gy-status" role="status" aria-live="polite">
          <span className="gy-spin" aria-hidden="true" />
          <span>
            {status}
            {graves.length ? ` ${graves.length} found so far.` : ""}
          </span>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="wg-error" role="alert">
          <span>
            {error}
            {graves.length ? ` The ${graves.length} found so far are below.` : ""}
          </span>
          <button type="button" className="wg-btn" style={{ alignSelf: "flex-start", minHeight: "36px" }} onClick={search}>
            Search again
          </button>
        </div>
      ) : null}

      {phase === "done" && adjacent && graves.length ? <p className="wg-muted">{words.nearby}</p> : null}
      {phase === "done" && !graves.length ? <p className="wg-muted">No similar shutdowns found for this idea.</p> : null}

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
            {g.adjacent ? <span className="gy-tag">{words.adjacent}</span> : null}
          </div>
          <span style={{ fontSize: "14px", fontStyle: "italic", color: "var(--text)" }}>“{g.epitaph}”</span>
          <div className="gy-tiles">
            <div className="gy-tile">
              <div className="gy-tile-k">{words.raised}</div>
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
