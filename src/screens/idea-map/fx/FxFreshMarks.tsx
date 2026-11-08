"use client";

// Fresh marks (visual only): what moved recently. A small dot with a decaying halo sits on the
// top-right corner of every choice changed in the last minute, and a thin decaying ring circles
// its pillar for half that.
//
// Performance model: nothing runs per frame in steady state. Decay is a CSS animation sized to
// each mark's life. Positions are recomputed only while something can be moving: a MutationObserver
// on the map (the camera writes the world's transform while panning/zooming; expand/collapse and
// re-renders touch node styles) marks the layer dirty, and a short settle window (700ms, the
// nodes' left/top transition) keeps polling, then the loop stops. Each pass reads every rect first
// and writes afterwards, so there is one layout per pass, never one per mark. Writes are skipped
// when a value is unchanged. The loop also stops while the tab is hidden.
import { useEffect, useRef } from "react";
import { FX_COLOR, subscribeFx, type FxEvent } from "./bus";
import "./fx-side.css";

const DOT_MS = 60_000;
const RING_MS = 30_000;
const MAX_MARKS = 24;
const RESOLVE_MS = 600;
const SETTLE_MS = 700;

interface Mark {
  kind: "dot" | "ring";
  selector: string;
  fallback?: string;
  born: number;
  life: number;
  el: HTMLElement;
  target: HTMLElement | null;
  resolveUntil: number;
  timer: number;
  // last written values, so unchanged frames write nothing
  tx: string;
  size: number;
  hidden: boolean;
}

const q = (sel: string) => document.querySelector<HTMLElement>(sel);

export default function FxFreshMarks() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let marks: Mark[] = [];
    let raf = 0;
    let dirtyUntil = 0; // keep polling until this time, then stop

    const makeEl = (kind: Mark["kind"], color: string, life: number) => {
      const el = document.createElement("div");
      el.className = kind === "dot" ? "fxm-mark" : "fxm-ring";
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("--fxm-c", color);
      el.style.setProperty("--fxm-life", `${life}ms`);
      if (reduced) el.classList.add("fxm-reduced");
      if (kind === "dot") {
        const halo = document.createElement("span");
        halo.className = "fxm-halo";
        const dot = document.createElement("span");
        dot.className = "fxm-dot";
        el.append(halo, dot);
      }
      el.hidden = true;
      root.appendChild(el);
      return el;
    };

    const drop = (m: Mark) => {
      clearTimeout(m.timer);
      m.el.remove();
      marks = marks.filter((x) => x !== m);
    };

    const wake = (ms = SETTLE_MS) => {
      dirtyUntil = Math.max(dirtyUntil, performance.now() + ms);
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const add = (kind: Mark["kind"], selector: string, fallback: string | undefined, color: string, life: number) => {
      const now = performance.now();
      const dupe = marks.find((x) => x.kind === kind && x.selector === selector);
      if (dupe) {
        // A second change on the same node restarts its clock: re-run the decay animation.
        dupe.born = now;
        dupe.el.style.setProperty("--fxm-c", color);
        dupe.el.classList.remove("fxm-run");
        void dupe.el.offsetWidth; // restart the CSS animation
        dupe.el.classList.add("fxm-run");
        clearTimeout(dupe.timer);
        dupe.timer = window.setTimeout(() => drop(dupe), life);
        return;
      }
      while (marks.length >= MAX_MARKS) drop(marks[0]);
      const el = makeEl(kind, color, life);
      el.classList.add("fxm-run");
      const m: Mark = { kind, selector, fallback, born: now, life, el, target: null, resolveUntil: now + RESOLVE_MS, timer: 0, tx: "", size: 0, hidden: true };
      m.timer = window.setTimeout(() => drop(m), life);
      marks.push(m);
      wake(RESOLVE_MS + SETTLE_MS);
    };

    const onEvent = (e: FxEvent) => {
      for (const c of e.changes) {
        const choiceSel = `[data-node="choice"][data-id="${CSS.escape(c.choiceId)}"]`;
        const pillarSel = `[data-node="pillar"][data-id="${CSS.escape(c.pillar)}"]`;
        add("dot", choiceSel, pillarSel, FX_COLOR[c.type], DOT_MS);
        const dir = c.pillarAfter - c.pillarBefore;
        add("ring", pillarSel, undefined, dir > 0 ? "var(--green)" : dir < 0 ? "var(--red)" : "var(--muted)", RING_MS);
      }
    };

    // One pass: resolve targets, read all rects, then write. Returns true if any target is still unresolved.
    const pass = (): boolean => {
      const now = performance.now();
      let unresolved = false;
      const pr = root.getBoundingClientRect();
      const reads: { m: Mark; r: DOMRect | null }[] = [];
      for (const m of marks) {
        if (!m.target || !m.target.isConnected) {
          m.target = q(m.selector) ?? (now > m.resolveUntil && m.fallback ? q(m.fallback) : null);
          if (!m.target) {
            unresolved = now <= m.resolveUntil + SETTLE_MS;
            reads.push({ m, r: null });
            continue;
          }
        }
        reads.push({ m, r: m.target.getBoundingClientRect() });
      }
      for (const { m, r } of reads) {
        const hide = !r || (r.width === 0 && r.height === 0);
        if (hide !== m.hidden) {
          m.el.hidden = hide;
          m.hidden = hide;
        }
        if (hide || !r) continue;
        if (m.kind === "dot") {
          const tx = `translate(${(r.right - pr.left - 4).toFixed(1)}px, ${(r.top - pr.top + 4).toFixed(1)}px)`;
          if (tx !== m.tx) {
            m.el.style.transform = tx;
            m.tx = tx;
          }
        } else {
          const size = Math.round(Math.max(r.width, r.height) + 12);
          const tx = `translate(${(r.left - pr.left + r.width / 2 - size / 2).toFixed(1)}px, ${(r.top - pr.top + r.height / 2 - size / 2).toFixed(1)}px)`;
          if (size !== m.size) {
            m.el.style.width = `${size}px`;
            m.el.style.height = `${size}px`;
            m.size = size;
          }
          if (tx !== m.tx) {
            m.el.style.transform = tx;
            m.tx = tx;
          }
        }
      }
      return unresolved;
    };

    const frame = () => {
      raf = 0;
      if (!marks.length || document.hidden) return;
      const unresolved = pass();
      if (unresolved || performance.now() < dirtyUntil) raf = requestAnimationFrame(frame);
    };

    // Anything that can move a node wakes the loop: camera transform writes, expand/collapse,
    // re-renders. Callbacks are batched per task, so this is cheap even while panning.
    const stage = root.parentElement ?? document.body;
    const isFx = (n: Node | null) => n instanceof Element && !!n.closest(".fxm, .fx-layer, .fxt");
    const mo = new MutationObserver((records) => {
      // Ignore the FX layers' own writes (including this one's), or the loop would wake itself.
      if (marks.length && records.some((r) => !isFx(r.target))) wake();
    });
    mo.observe(stage, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });
    const ro = new ResizeObserver(() => {
      if (marks.length) wake();
    });
    ro.observe(root);
    const onVis = () => {
      if (!document.hidden && marks.length) wake();
    };
    document.addEventListener("visibilitychange", onVis);

    const unsub = subscribeFx(onEvent, true);
    return () => {
      unsub();
      mo.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (raf) cancelAnimationFrame(raf);
      marks.forEach((m) => {
        clearTimeout(m.timer);
        m.el.remove();
      });
      marks = [];
    };
  }, []);

  return <div ref={host} className="fxm" aria-hidden="true" />;
}
