"use client";

// The Research card, grown out of the evidence node that was clicked.
//
// It lives inside the map's world layer, anchored at the node, and counter-scales by the camera's zoom
// (--k, set by logic.js applyView) so it pans with the map but stays screen-sized. Opening: a thin vine
// (SVG path, var(--accent)) draws itself outward from the node's edge with a sprout riding its tip; then the
// card unfolds from the tip and the sprout settles into the header. The vine stays as the connector.
// Closing plays it in reverse, faster. Only transform, opacity and stroke-dashoffset animate.
// With reduced motion the vine and card just appear. Data and actions come unchanged from logic.js (evCard).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ResearchCardData {
  key: string;
  title: string;
  count: number;
  anchor: { x: number; y: number };
  rows: any[];
  close: (e?: MouseEvent | KeyboardEvent) => void;
}
interface View {
  viewport: () => { left: number; top: number; right: number; bottom: number } | null;
  ensureVisible: (box: { left: number; top: number; right: number; bottom: number }) => void;
}

const VINE = 44; // vine length in screen px, from the node's edge to the card
const NODE_HALF_W = 88; // evidence nodes are 176 × ~44 map units
const NODE_HALF_H = 22;
const CARD_W = 340;
const T_VINE = 250, T_CARD = 200, T_OUT_CARD = 110, T_OUT_VINE = 140;

type Phase = "hidden" | "measure" | "vine" | "card" | "open" | "closing";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The leaf mark from public/brand/sprout-mark-only.svg, inline so it takes the theme colors. */
function Sprout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="4 6 40 48" aria-hidden="true">
      <g fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M24 46 V30" />
        <path d="M24 30 L15.5 20.5" />
        <path d="M24 30 L33.5 18.5" />
      </g>
      <circle cx="24" cy="48.5" r="4.6" fill="var(--text)" />
      <circle cx="12.5" cy="16.5" r="6.2" fill="var(--accent)" />
      <circle cx="36" cy="14" r="7.6" fill="var(--accent)" />
    </svg>
  );
}

export default function ResearchCard({ card, view }: { card: ResearchCardData | null; view: View }) {
  // What's on screen: lags `card` while it closes, so the content stays during the exit.
  const [shown, setShown] = useState<ResearchCardData | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [side, setSide] = useState<1 | -1>(1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const key = card?.key ?? null;
  const shownKey = shown?.key ?? null;
  // The card to show once the current one has folded away (null: just close).
  const [next, setNext] = useState<ResearchCardData | null>(null);

  // Open / close / switch, driven by which evidence is pinned. Adjusting state while rendering when the
  // pinned key changes (React's pattern for reacting to a prop change); timers only finish the fold.
  const [prevKey, setPrevKey] = useState<string | null>(null);
  if (key !== prevKey) {
    setPrevKey(key);
    if (!shownKey || phase === "hidden" || reduced()) {
      setShown(card);
      setPhase(card ? "measure" : "hidden");
    } else {
      setNext(card); // fold the open card (fast), then grow the new one or stay closed
      setPhase("closing");
    }
  }
  useEffect(() => {
    if (phase !== "closing") return;
    clearTimers(); // an opening still in progress must not advance once we're folding
    const t = setTimeout(() => {
      setShown(next);
      setPhase(next ? "measure" : "hidden");
    }, next ? T_OUT_CARD + 40 : T_OUT_CARD + T_OUT_VINE);
    return () => clearTimeout(t);
  }, [phase, next]);

  // Measure, pick a side, pan just enough, then grow.
  useLayoutEffect(() => {
    if (phase !== "measure" || !shown) return;
    const a = anchorRef.current, c = cardRef.current, v = view.viewport();
    if (!a || !c || !v) return;
    const k = parseFloat(getComputedStyle(a).getPropertyValue("--k")) || 1;
    const p = a.getBoundingClientRect(); // the anchor is a 0×0 point at the node's center
    const nw = NODE_HALF_W * k, nh = NODE_HALF_H * k, h = c.offsetHeight;
    const roomRight = v.right - (p.left + nw + VINE + CARD_W);
    const roomLeft = p.left - nw - VINE - CARD_W - v.left;
    const s: 1 | -1 = roomRight >= 0 ? 1 : roomLeft >= 0 ? -1 : roomRight >= roomLeft ? 1 : -1;
    const cardLeft = s > 0 ? p.left + nw + VINE : p.left - nw - VINE - CARD_W;
    const top = p.top - 22; // the header lines up with the node
    view.ensureVisible({
      left: Math.min(cardLeft, p.left - nw),
      right: Math.max(cardLeft + CARD_W, p.left + nw),
      top: Math.min(top, p.top - nh),
      bottom: Math.max(top + h, p.top + nh),
    });
    setSide(s);
    clearTimers();
    if (reduced()) {
      setPhase("open");
      return;
    }
    setPhase("vine");
    later(T_VINE, () => setPhase("card"));
    later(T_VINE + T_CARD, () => setPhase("open"));
  }, [phase, shown, view]);

  // Focus the card once it's open (keyboard users land inside it); give focus back to the node on close.
  useEffect(() => {
    if (phase === "open") cardRef.current?.focus({ preventScroll: true });
    if (phase === "closing" || phase === "hidden") {
      const inside = cardRef.current?.contains(document.activeElement);
      if (inside && shownKey) (document.querySelector(`[data-ev-key="${CSS.escape(shownKey)}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
    }
  }, [phase, shownKey]);

  if (!shown || phase === "hidden") return null;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      shown.close(e);
    }
  };

  return (
    <div ref={anchorRef} className="rc-anchor" style={{ left: `${shown.anchor.x}px`, top: `${shown.anchor.y}px` }}>
      <div className="rc-local" data-phase={phase} data-side={side > 0 ? "right" : "left"}>
        {/* The vine: draws outward from the node's edge (stroke-dashoffset 1 → 0). */}
        <svg className="rc-vine" width={VINE} height="40" viewBox={`0 0 ${VINE} 40`} aria-hidden="true">
          <path d={`M0 20 C ${VINE * 0.3} 11, ${VINE * 0.62} 29, ${VINE} 20`} pathLength={1} />
        </svg>
        {/* The sprout riding the vine's tip; it hands over to the header icon when the card opens. */}
        <span className="rc-rider" aria-hidden="true">
          <Sprout size={14} />
        </span>
        <section
          ref={cardRef}
          className="rc-card"
          data-node="research"
          role="region"
          aria-label={`Research for ${shown.title}`}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={onKey}
          style={{ width: `${CARD_W}px` } as CSSProperties}
        >
          <div className="rc-head">
            <span className="rc-head-sprout">
              <Sprout size={14} />
            </span>
            <div className="rc-head-label">Research</div>
            <div className="rc-count">
              <span className="im-ev-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
              <span>{shown.count}</span>
              {shown.count === 1 ? " SOURCE" : " SOURCES"}
            </div>
            <button type="button" className="im-hover1 rc-close" onClick={(e) => shown.close(e)} aria-label="Close research" title="Close (Esc)">
              ×
            </button>
          </div>
          <div className="rc-body" data-scroll="1">
            <div style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.3, color: "var(--text)", textWrap: "balance" } as CSSProperties}>{shown.title}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(shown.rows ?? []).map((r: any, i: number) => (
                <button
                  type="button"
                  key={i}
                  className="im-research-row im-research-row-live"
                  data-active={r?.active ? "1" : undefined}
                  aria-current={r?.active ? "true" : undefined}
                  onClick={r?.select ?? undefined}
                >
                  <span style={{ width: "3px", alignSelf: "stretch", borderRadius: "2px", background: `${r?.accent ?? ""}`, flex: "none" } as CSSProperties} />
                  <span style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "12px", lineHeight: 1.35, color: "var(--text)", fontWeight: r?.active ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r?.text}</span>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9.5px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r?.source}</span>
                  </span>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9px", letterSpacing: ".1em", color: `${r?.tagColor ?? ""}`, flex: "none", paddingTop: "2px" } as CSSProperties}>{r?.tag}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
