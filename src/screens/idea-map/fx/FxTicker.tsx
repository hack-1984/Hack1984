"use client";

// The live change feed (visual only). One row per FxChange, newest on top, top-left of the map.
// Each row names the source, what happened to the choice with its confidence delta, and how far
// the pillar moved. The header shows the overall confidence change of the latest batch. Rows slide
// out to the left after a few seconds unless the pointer is over the strip. Clicking a row asks the
// FX layer to re-flash that node (CustomEvent "sprout-fx-ping"); nothing about the idea changes.
import { useEffect, useRef, useState } from "react";
import { FX_COLOR, subscribeFx, type FxChange, type FxEvent } from "./bus";
import "./fx-side.css";

const MAX_ROWS = 5;
const LIFE_MS = 6000;
const LEAVE_MS = 480;

interface Row {
  id: string;
  at: number;
  sourceLabel: string;
  change: FxChange;
  leaving?: boolean;
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The right-aligned delta: confidence move, or what kind of thing happened when it didn't move. */
function deltaOf(c: FxChange): string {
  if (c.action === "add") return c.type === "Suggested" ? "? new" : "+ new";
  if (c.action === "kill") return "removed";
  if (c.action === "haunt" && c.ghost) return `${sign(c.confAfter - c.confBefore)} · ${c.ghost}`;
  const d = c.confAfter - c.confBefore;
  return d === 0 ? (c.evidenceAdded ? `+${c.evidenceAdded} ev` : "·") : `${sign(d)} pts`;
}

export default function FxTicker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [overall, setOverall] = useState<{ before: number; after: number; key: number } | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const hover = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const unsub = subscribeFx((e: FxEvent) => {
      const shown = Date.now();
      const fresh: Row[] = e.changes.map((change, i) => ({ id: `${e.key}:${i}`, at: shown, sourceLabel: e.sourceLabel, change }));
      setRows((prev) => [...fresh.reverse(), ...prev.filter((r) => !r.leaving)].slice(0, MAX_ROWS));
      if (e.overallBefore !== e.overallAfter) setOverall({ before: e.overallBefore, after: e.overallAfter, key: e.key });
    }, true);
    const t = timers.current;
    return () => {
      unsub();
      t.forEach(clearTimeout);
    };
  }, []);

  // Decay: one interval while rows exist. A row older than LIFE_MS slides out, then is removed.
  // Hovering pauses it, and clocks restart when the pointer leaves so nothing vanishes under the cursor.
  useEffect(() => {
    if (!rows.length) return;
    const h = window.setInterval(() => {
      if (hover.current) {
        setRows((prev) => prev.map((r) => (r.leaving ? r : { ...r, at: Math.max(r.at, Date.now() - LIFE_MS + 2000) })));
        return;
      }
      const now = Date.now();
      const due = rows.filter((r) => now - r.at >= LIFE_MS && !r.leaving).map((r) => r.id);
      if (!due.length) return;
      setRows((prev) => prev.map((r) => (due.includes(r.id) ? { ...r, leaving: true } : r)));
      timers.current.push(
        window.setTimeout(() => {
          setRows((prev) => {
            const next = prev.filter((r) => !due.includes(r.id));
            if (!next.length) setOverall(null);
            return next;
          });
        }, LEAVE_MS)
      );
    }, 250);
    return () => clearInterval(h);
  }, [rows]);

  function ping(r: Row) {
    setPressed(r.id);
    window.setTimeout(() => setPressed((p) => (p === r.id ? null : p)), 180);
    window.dispatchEvent(new CustomEvent("sprout-fx-ping", { detail: { choiceId: r.change.choiceId, pillar: r.change.pillar } }));
  }

  if (!rows.length) return null;
  const od = overall ? overall.after - overall.before : 0;

  return (
    <div className="fxt" aria-label="Live changes to the map" onMouseEnter={() => (hover.current = true)} onMouseLeave={() => (hover.current = false)}>
      <div className="fxt-head" aria-hidden="true">
        <span className="fxt-live" />
        <span>Live changes</span>
        {overall ? (
          <span key={overall.key} className={`fxt-overall ${od > 0 ? "is-up" : "is-down"}`}>
            Overall {overall.before}% → {overall.after}% ({sign(od)})
          </span>
        ) : null}
      </div>
      <div className="fxt-rows">
        {rows.map((r) => {
          const c = r.change;
          const pd = c.pillarAfter - c.pillarBefore;
          const color = FX_COLOR[c.type];
          return (
            <button
              key={r.id}
              type="button"
              className={`fxt-row${r.leaving ? " is-leaving" : ""}${pressed === r.id ? " is-pressed" : ""}`}
              style={{ "--fxt-c": color } as React.CSSProperties}
              onClick={() => ping(r)}
              title={c.reason || `${c.type} “${c.choiceText}”`}
              aria-label={`${r.sourceLabel}: ${c.type} ${c.choiceText}. Show on map.`}
            >
              <div className="fxt-top">
                <span className="fxt-dot" aria-hidden="true" />
                <span className="fxt-src">{r.sourceLabel}</span>
              </div>
              <div className="fxt-main">
                <span className="fxt-what">
                  <b>{c.type}</b> “{c.choiceText}”
                </span>
                <span className="fxt-delta">{deltaOf(c)}</span>
              </div>
              <div className={`fxt-pillar${pd === 0 ? " is-flat" : pd > 0 ? " is-up" : " is-down"}`}>
                <b>{c.pillarLabel}</b> {c.pillarBefore}%<span className="fxt-arrow">→</span>{c.pillarAfter}%
                {pd !== 0 ? <span className="fxt-pdelta">({sign(pd)})</span> : <span className="fxt-pdelta">unchanged</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
