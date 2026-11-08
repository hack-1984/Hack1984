"use client";

// "Shoot and hit": every applyWidget() batch becomes a projectile from the widget's rail icon to
// the choice it changed, an impact at the node (ripple, flash, delta badge, an action flourish),
// a second hit on the parent pillar with its before → after score, and a quiet overall badge on
// the idea. Purely visual; it subscribes to the FX bus (./bus.ts) and touches nothing else.
//
// Everything is imperative DOM driven by requestAnimationFrame: nodes move while the camera
// animates, so endpoints are re-read from the DOM every frame of a flight and the dot lands
// wherever the node is when it arrives. Two containers: impacts sit under the floating panel
// (so a node hidden behind it stays hidden); projectiles ride over everything so the dot is
// seen leaving the rail icon.
import { useEffect, useRef } from "react";
import { FX_COLOR, subscribeFx, type FxChange, type FxEvent } from "./bus";
import "./fx-layer.css";

const MAX_PROJECTILES = 8;
const STAGGER_MS = 90;
const FLIGHT_MS = 650;
const RESOLVE_MS = 600;
const PILLAR_DELAY_MS = 250;

const choiceSel = (id: string) => `[data-node="choice"][data-id="${cssEscape(id)}"]`;
const pillarSel = (key: string) => `[data-node="pillar"][data-id="${cssEscape(key)}"]`;
const railSel = (w: string) => `.wg-rail-btn[data-widget="${cssEscape(w)}"]`;

function cssEscape(s: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, "\\$&");
}

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Box = { x: number; y: number; w: number; h: number; round: string };

export default function FxLayer() {
  const under = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const underEl = under.current;
    const overEl = over.current;
    if (!underEl || !overEl) return;
    const live = { on: true };
    const timers = new Set<number>();
    const frames = new Set<number>();

    // ---------- geometry ----------
    const base = () => underEl.getBoundingClientRect();
    const boxOf = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      const b = base();
      const kind = el.getAttribute("data-node");
      return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height, round: kind === "choice" ? "10px" : kind === "pillar" || kind === "idea" ? "50%" : "8px" };
    };
    const centre = (el: Element) => {
      const b = boxOf(el);
      return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    };
    const q = (sel: string) => document.querySelector(sel);

    /** The element may be mounting (a pillar is expanding, a choice was just added): poll a few frames. */
    const waitFor = (sels: string[], maxMs = RESOLVE_MS) =>
      new Promise<Element | null>((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          if (!live.on) return resolve(null);
          for (const s of sels) {
            const el = q(s);
            if (el) return resolve(el);
          }
          if (performance.now() - t0 > maxMs) return resolve(null);
          frames.add(requestAnimationFrame(tick));
        };
        tick();
      });

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (live.on) fn();
      }, ms);
      timers.add(id);
    };
    const remove = (el: Element, afterMs: number) => later(() => el.remove(), afterMs);
    const make = (parent: Element, cls: string, style: Partial<CSSStyleDeclaration> = {}, text = "") => {
      const d = document.createElement("div");
      d.className = cls;
      d.setAttribute("aria-hidden", "true");
      Object.assign(d.style, style);
      if (text) d.textContent = text;
      parent.appendChild(d);
      return d;
    };

    // ---------- projectile ----------
    /** Fly a dot from `from` to `to`, re-reading both every frame. Resolves on arrival (or at once when motionless). */
    const fly = (from: Element, to: Element, color: string, bow: number) =>
      new Promise<void>((resolve) => {
        if (reduced()) return resolve();
        const dot = make(overEl, "fx-dot", { background: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent), 0 0 14px 2px color-mix(in srgb, ${color} 55%, transparent)` });
        const trail = [0.9, 0.8, 0.7, 0.6].map((s, i) =>
          make(overEl, "fx-trail", { background: color, opacity: String(0.45 - i * 0.1), width: `${8 * s}px`, height: `${8 * s}px` })
        );
        const t0 = performance.now();
        const place = (el: HTMLElement, t: number, a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }) => {
          const u = 1 - t;
          const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
          const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        };
        const step = () => {
          if (!live.on || !dot.isConnected) return;
          const raw = Math.min(1, (performance.now() - t0) / FLIGHT_MS);
          const t = easeInOut(raw);
          const a = centre(from);
          const b = centre(to);
          // Control point: midpoint pushed perpendicular to the flight, biased upward so arcs read as "thrown".
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const sign = ny < 0 ? 1 : -1; // pick the side that points up on screen
          const c = { x: (a.x + b.x) / 2 + nx * bow * sign, y: (a.y + b.y) / 2 + ny * bow * sign - 24 };
          place(dot, t, a, c, b);
          dot.style.opacity = raw < 0.08 ? String(raw / 0.08) : raw > 0.92 ? String((1 - raw) / 0.08) : "1";
          trail.forEach((g, i) => {
            const tt = Math.max(0, easeInOut(Math.max(0, raw - 0.035 * (i + 1))));
            place(g, tt, a, c, b);
            g.style.opacity = raw < 0.1 || raw > 0.9 ? "0" : String(0.4 - i * 0.09);
          });
          if (raw < 1) frames.add(requestAnimationFrame(step));
          else {
            dot.remove();
            trail.forEach((g) => g.remove());
            resolve();
          }
        };
        frames.add(requestAnimationFrame(step));
      });

    // ---------- impacts ----------
    const ripple = (el: Element, color: string, big = false) => {
      const b = boxOf(el);
      const size = Math.max(b.w, b.h) + (big ? 24 : 12);
      const r = make(underEl, "fx-ripple", { left: `${b.x + b.w / 2}px`, top: `${b.y + b.h / 2}px`, width: `${size}px`, height: `${size}px`, borderColor: color, borderRadius: b.round === "50%" ? "50%" : "14px" });
      remove(r, 700);
    };
    const flash = (el: Element, color: string) => {
      const b = boxOf(el);
      const f = make(underEl, "fx-flash", { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: b.round, background: `color-mix(in srgb, ${color} 28%, transparent)`, boxShadow: `0 0 0 1.5px ${color}` });
      remove(f, 650);
    };
    const badge = (el: Element, text: string, color: string, opts: { sub?: string; muted?: boolean; dy?: number } = {}) => {
      const b = boxOf(el);
      const wrap = make(underEl, `fx-badge${opts.muted ? " fx-badge-muted" : ""}`, { left: `${b.x + b.w / 2}px`, top: `${b.y + (opts.dy ?? -6)}px`, color });
      const main = document.createElement("span");
      main.className = "fx-badge-main";
      main.textContent = text;
      wrap.appendChild(main);
      if (opts.sub) {
        const sub = document.createElement("span");
        sub.className = "fx-badge-sub";
        sub.textContent = opts.sub;
        wrap.appendChild(sub);
      }
      remove(wrap, reduced() ? 1000 : 1300);
    };
    const particles = (el: Element, color: string, n: number, dist: number, cls = "fx-particle") => {
      if (reduced()) return;
      const c = centre(el);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const d = dist + Math.random() * 10;
        const p = make(underEl, cls, { left: `${c.x}px`, top: `${c.y}px`, background: color });
        p.style.setProperty("--fx-dx", `${Math.cos(a) * d}px`);
        p.style.setProperty("--fx-dy", `${Math.sin(a) * d}px`);
        remove(p, 800);
      }
    };
    const ghost = (el: Element, name?: string) => {
      const c = centre(el);
      // Starts just above the node so the drift never crosses its label; the badge names the ghost.
      const g = make(underEl, "fx-ghost", { left: `${c.x}px`, top: `${c.y - 34}px` });
      g.innerHTML =
        '<svg width="22" height="26" viewBox="0 0 22 26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 24V11a8 8 0 0 1 16 0v13l-3-2.4-2.7 2.4L11 21.6 8.7 24 6 21.6z"/><circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="14" cy="11" r="1.1" fill="currentColor" stroke="none"/></svg>' +
        (name ? `<span class="fx-ghost-name">${escapeHtml(name)}</span>` : "");
      remove(g, reduced() ? 1000 : 1500);
    };

    const deltaText = (ch: FxChange): { text: string; sub?: string; color: string } => {
      const d = ch.confAfter - ch.confBefore;
      const color = FX_COLOR[ch.type];
      switch (ch.action) {
        case "add":
          return ch.type === "Suggested" ? { text: "? suggested", color } : { text: "+ new choice", color };
        case "kill":
          return { text: "removed", color };
        case "haunt":
          return { text: d ? `${d > 0 ? "+" : "−"}${Math.abs(d)}` : "haunted", color, sub: ch.ghost };
        default:
          return { text: d ? `${d > 0 ? "+" : "−"}${Math.abs(d)}` : ch.type.toLowerCase(), color };
      }
    };

    const impact = (el: Element, ch: FxChange) => {
      const color = FX_COLOR[ch.type];
      flash(el, color);
      ripple(el, color);
      const dt = deltaText(ch);
      badge(el, dt.text, dt.color, { sub: dt.sub });
      switch (ch.action) {
        case "add":
          particles(el, color, 6, 22);
          break;
        case "strengthen":
          particles(el, color, 3, 18, "fx-sparkle");
          break;
        case "haunt":
          ghost(el);
          break;
        default:
          break;
      }
    };

    const pillarHit = (el: Element, ch: FxChange, stacked = false) => {
      const dir = ch.pillarAfter - ch.pillarBefore;
      const color = dir > 0 ? "var(--green)" : dir < 0 ? "var(--red)" : "var(--muted)";
      ripple(el, color, true);
      // When the choice was collapsed, its delta already sits above this pillar: start lower so they read as two lines.
      if (dir !== 0) badge(el, `${ch.pillarBefore}% → ${ch.pillarAfter}%`, color, { dy: stacked ? 18 : -10 });
    };

    const railGlow = (w: string | null) => {
      if (!w) return;
      const btn = q(railSel(w));
      if (!btn) return;
      btn.classList.remove("fx-fired");
      // restart the animation even if a previous glow is still running
      void (btn as HTMLElement).offsetWidth;
      btn.classList.add("fx-fired");
      later(() => btn.classList.remove("fx-fired"), 450);
    };

    const overallBadge = (e: FxEvent) => {
      if (e.overallBefore === e.overallAfter) return;
      const idea = q('[data-node="idea"]');
      if (!idea) return;
      badge(idea, `${e.overallBefore} → ${e.overallAfter}`, "var(--muted)", { muted: true, dy: -4 });
    };

    // ---------- one event ----------
    const run = async (e: FxEvent) => {
      const shots = e.changes.slice(0, MAX_PROJECTILES);
      const folded = e.changes.slice(MAX_PROJECTILES);
      railGlow(e.sourceWidget);
      const pillarsDone = new Set<string>();
      const hitPillar = async (ch: FxChange, landedOn?: Element | null) => {
        if (pillarsDone.has(ch.pillar)) return;
        pillarsDone.add(ch.pillar);
        const p = await waitFor([pillarSel(ch.pillar)], 200);
        if (p && live.on) pillarHit(p, ch, landedOn === p);
      };

      const flights = shots.map(async (ch, i) => {
        await sleep(i * STAGGER_MS);
        if (!live.on) return;
        const target = await waitFor([choiceSel(ch.choiceId), pillarSel(ch.pillar)]);
        if (!target || !live.on) return;
        const from = (e.sourceWidget && q(railSel(e.sourceWidget))) || q(pillarSel(ch.pillar)) || target;
        if (from !== target) await fly(from, target, FX_COLOR[ch.type], 60 + (i % 3) * 30);
        if (!live.on) return;
        impact(target, ch);
        await sleep(PILLAR_DELAY_MS);
        await hitPillar(ch, target);
      });
      await Promise.all(flights);
      // Changes beyond the cap only register on their pillars, so a 30-update Launch Day stays readable.
      for (const ch of folded) await hitPillar(ch);
      if (!live.on) return;
      await sleep(150);
      overallBadge(e);
    };

    const unsub = subscribeFx((e) => {
      void run(e);
    });

    // Re-ping from the ticker: impact only, no flight.
    const onPing = (ev: Event) => {
      const d = (ev as CustomEvent<{ choiceId?: string; pillar?: string }>).detail || {};
      const el = (d.choiceId && q(choiceSel(d.choiceId))) || (d.pillar && q(pillarSel(d.pillar)));
      if (!el) return;
      flash(el, "var(--accent)");
      ripple(el, "var(--accent)");
    };
    window.addEventListener("sprout-fx-ping", onPing);

    return () => {
      live.on = false;
      unsub();
      window.removeEventListener("sprout-fx-ping", onPing);
      timers.forEach((t) => clearTimeout(t));
      frames.forEach((f) => cancelAnimationFrame(f));
      underEl.replaceChildren();
      overEl.replaceChildren();
    };
  }, []);

  return (
    <>
      <div ref={under} className="fx-layer fx-layer-under" aria-hidden="true" />
      <div ref={over} className="fx-layer fx-layer-over" aria-hidden="true" />
    </>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
