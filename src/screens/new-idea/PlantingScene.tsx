"use client";

// The planting scene: what the founder watches while their idea is researched.
// Full-viewport, three layers, all driven by props (src/ideas/planting.ts):
//   background  — real research. Every query / source event becomes a card that fades in,
//                 drifts slowly and fades out. Decorative: aria-hidden, no pointer events.
//   centre      — a sprout that grows one stage per research phase, the idea's name, a
//                 Haiku narration line cycling underneath, and the true phase as a mono caption.
//   page colour — a green glow behind the sprout that strengthens by phase.
// Pure: NewIdeaScreen collects the events and narration and passes them in.
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PLANT_PHASES, type PlantEvent, type PlantPhase } from "@/ideas/planting";
import type { Mode } from "@/lib/types";
import "./planting.css";

const LIFE_MIN_MS = 11_000;
const LIFE_MAX_MS = 14_000;
const LEAVE_MS = 500; // early fade when a slot is needed
const NARRATE_EVERY_MS = 2_600;
const NARRATE_FADE_MS = 250;

/** Two side columns, four rows each. The centre column stays clear for the sprout. */
const SLOTS: { side: "left" | "right"; x: number; y: number }[] = [
  { side: "left", x: 5, y: 9 },
  { side: "left", x: 9, y: 31 },
  { side: "left", x: 6, y: 53 },
  { side: "left", x: 10, y: 75 },
  { side: "right", x: 6, y: 13 },
  { side: "right", x: 10, y: 35 },
  { side: "right", x: 5, y: 57 },
  { side: "right", x: 9, y: 79 },
];

interface Card {
  key: number; // index into events
  kind: "query" | "source";
  text: string;
  domain?: string;
  slot: number;
  jx: number; // jitter, px
  jy: number;
  dx: number; // drift, px
  dy: number;
  life: number; // ms
  bornAt: number;
  leavingAt?: number;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

const stageOf = (phase: PlantPhase | null) => (phase ? Math.max(0, PLANT_PHASES.indexOf(phase)) : 0);

export interface PlantingSceneProps {
  name: string;
  mode: Mode;
  events: PlantEvent[];
  lines: string[];
}

export default function PlantingScene({ name, mode, events, lines }: PlantingSceneProps) {
  // ---- latest true status -------------------------------------------------------------
  let status: { phase: PlantPhase; text: string } | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "status") {
      status = { phase: e.phase, text: e.text };
      break;
    }
  }
  const stage = stageOf(status?.phase ?? null);
  const statusText = status?.text ?? (mode === "nonprofit" ? "Looking at the need" : "Looking at the market");

  // ---- background cards ---------------------------------------------------------------
  const [cards, setCards] = useState<Card[]>([]);
  const processed = useRef(0);
  const lastUsed = useRef<number[]>(SLOTS.map(() => 0));

  useEffect(() => {
    if (events.length <= processed.current) return;
    const from = processed.current;
    processed.current = events.length;
    const now = Date.now();
    setCards((prev) => {
      let next = prev.slice();
      for (let i = from; i < events.length; i++) {
        const e = events[i];
        if (e.type !== "query" && e.type !== "source") continue;
        // Least-recently-used free slot; if none is free, the oldest card gives up its slot.
        const live = next.filter((c) => !c.leavingAt);
        const taken = new Set(live.map((c) => c.slot));
        let slot = -1;
        let best = Infinity;
        SLOTS.forEach((_, s) => {
          if (!taken.has(s) && lastUsed.current[s] < best) {
            best = lastUsed.current[s];
            slot = s;
          }
        });
        if (slot < 0 && live.length) {
          const oldest = live.reduce((a, b) => (a.bornAt <= b.bornAt ? a : b));
          next = next.map((c) => (c.key === oldest.key ? { ...c, leavingAt: now } : c));
          slot = oldest.slot;
        }
        if (slot < 0) slot = 0;
        lastUsed.current[slot] = now + i;
        const angle = rand(0, Math.PI * 2);
        const dist = rand(30, 60);
        next.push({
          key: i,
          kind: e.type,
          text: e.type === "query" ? e.text : e.title,
          domain: e.type === "source" ? e.domain : undefined,
          slot,
          jx: rand(-20, 20),
          jy: rand(-20, 20),
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist * 0.6,
          life: rand(LIFE_MIN_MS, LIFE_MAX_MS),
          bornAt: now,
        });
      }
      return next;
    });
  }, [events]);

  // Prune: natural end of life, or shortly after an early leave.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setCards((prev) => {
        const next = prev.filter((c) => (c.leavingAt ? now - c.leavingAt < LEAVE_MS + 60 : now - c.bornAt < c.life));
        return next.length === prev.length ? prev : next;
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  // ---- narration --------------------------------------------------------------------
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  // New lines (they arrive once, a moment after the scene opens): start from the top.
  const [seenLines, setSeenLines] = useState(lines);
  if (seenLines !== lines) {
    setSeenLines(lines);
    setIdx(0);
    setFading(false);
  }
  useEffect(() => {
    if (lines.length < 2) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(() => {
      setFading(true);
      swap = setTimeout(() => {
        setIdx((i) => (i + 1) % lines.length);
        setFading(false);
      }, NARRATE_FADE_MS);
    }, NARRATE_EVERY_MS);
    return () => {
      clearInterval(t);
      if (swap) clearTimeout(swap);
    };
  }, [lines]);
  const narration = lines.length ? lines[idx % lines.length] : statusText;

  const growth = PLANT_PHASES.slice(0, stage + 1)
    .map((_, i) => `pl-ge${i}`)
    .join(" ");

  return (
    <div className={`pl-scene ${growth}`} data-stage={stage}>
      <div className="pl-tint" aria-hidden="true" />
      <div className="pl-flash" aria-hidden="true" />

      <Link href="/sessions" aria-label="Sprout, back to your ideas" className="pl-logo">
        <img src="/brand/sprout-logo-black.svg" alt="Sprout" width={100} height={28} />
      </Link>

      {/* Research drifting in the background. */}
      <div className="pl-field" aria-hidden="true">
        {cards.map((c) => {
          const s = SLOTS[c.slot];
          const style = {
            top: `calc(${s.y}% + ${c.jy.toFixed(0)}px)`,
            [s.side]: `calc(${s.x}% + ${c.jx.toFixed(0)}px)`,
            "--dx": `${c.dx.toFixed(0)}px`,
            "--dy": `${c.dy.toFixed(0)}px`,
            "--life": `${c.life}ms`,
          } as React.CSSProperties;
          return (
            <div key={c.key} className="pl-card" style={style}>
              <div className={`pl-card-in pl-${c.kind}${c.leavingAt ? " pl-leaving" : ""}`}>
                {c.kind === "query" ? (
                  <>
                    <svg className="pl-q-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                    <span className="pl-q-text">{c.text}</span>
                  </>
                ) : (
                  <>
                    <div className="pl-src-head">
                      <img
                        className="pl-favicon"
                        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(c.domain || "")}&sz=32`}
                        alt=""
                        width={14}
                        height={14}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="pl-src-domain">{c.domain}</span>
                    </div>
                    <div className="pl-src-title">{c.text}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* The sprout, the name, the words. */}
      <div className="pl-centre">
        <div className="pl-sprout-wrap">
          {/* Sprout, from the Claude Design file "Sprout Animation.dc.html". Driven by the
              cumulative pl-ge0…pl-ge4 stage classes on .pl-scene: seed, stem, leaf, leaves, bloom. */}
          <svg className="pl-sprout" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <radialGradient id="pl-glow-grad">
                <stop offset="0" stopColor="var(--accent)" stopOpacity=".3" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle className="pl-glow" cx="60" cy="58" r="42" />
            <circle className="pl-ring" cx="60" cy="58" r="12" />
            <path className="pl-soil" d="M22 96 H98" />
            <path className="pl-stem" pathLength={1} d="M60 92 V64" />
            <g className="pl-leaf pl-leaf1">
              <path className="pl-branch" pathLength={1} d="M60 64 L75.2 45.6" />
              <circle className="pl-disc" cx="79.2" cy="38.4" r="12.2" />
            </g>
            <g className="pl-leaf pl-leaf2">
              <path className="pl-branch" pathLength={1} d="M60 64 L46.4 48.8" />
              <circle className="pl-disc" cx="41.6" cy="42.4" r="9.9" />
            </g>
            <g className="pl-seed">
              <path className="pl-seed-l" d="M60 83 A6 6 0 0 0 60 95 Z" />
              <path className="pl-seed-r" d="M60 83 A6 6 0 0 1 60 95 Z" />
            </g>
          </svg>
        </div>
        <h1 className="pl-h1">{name}</h1>
        <p className={`pl-line${fading ? " pl-line-fade" : ""}`} aria-hidden="true">
          {narration}
        </p>
        <p className="pl-caption" role="status" aria-live="polite">
          {statusText}
        </p>
        <div className="pl-track" aria-hidden="true">
          {PLANT_PHASES.map((p, i) => (
            <span key={p} className={`pl-seg${i < stage ? " pl-seg-done" : i === stage ? " pl-seg-now" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
