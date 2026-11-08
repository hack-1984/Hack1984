"use client";

// Design gallery for the idea map's small parts: the choice pill in every status and the
// research card that opens over a hovered evidence card. Rendered flat, every state at once,
// so one screenshot reviews the whole set. The pill markup mirrors IdeaMapScreen.tsx; if the
// real pill changes, change it here too.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import { STATUS, confRing } from "../logic";
import "../idea-map.css";

const PILLS: { status: string; text: string; conf: number; lo: number; hi: number }[] = [
  { status: "strengthened", text: "Weekly meal kits for dorms", conf: 82, lo: 71, hi: 93 },
  { status: "added", text: "Campus pickup lockers", conf: 58, lo: 37, hi: 79 },
  { status: "guess", text: "Students will pay $8 a month", conf: 44, lo: 19, hi: 69 },
  { status: "weakened", text: "Shared dorm kitchens work", conf: 31, lo: 16, hi: 46 },
  { status: "suggested", text: "Partner with three cafés", conf: 62, lo: 37, hi: 87 },
  { status: "removed", text: "Door-to-door delivery", conf: 12, lo: 0, hi: 37 },
];

const ROWS = [
  { sup: false, text: "Shared dorm kitchens serve 40+ students each", source: "research · housing.edu", active: true },
  { sup: true, text: "61% of surveyed students cook three or more nights a week", source: "customer interview 2", active: false },
  { sup: true, text: "Residence halls add induction cooktops in 3 new buildings", source: "research · facilities plan", active: false },
  { sup: false, text: "Two meal-kit startups shut down campus pilots in 2024", source: "graveyard · press archive", active: false },
];

function Pill({ p }: { p: (typeof PILLS)[number] }) {
  const st = (STATUS as any)[p.status];
  const cr = confRing(p.conf, p.lo, p.hi, p.status);
  return (
    <div style={{ width: "156px", minHeight: "44px", display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", boxSizing: "border-box", borderRadius: "10px", background: st.bg, border: `1.5px ${st.style} ${st.border}`, color: st.color, boxShadow: "0 1px 2px var(--shadow)" }}>
      <span className="im-conf-ring" style={{ background: cr.ring } as CSSProperties}>
        <span className="im-conf-core" style={{ background: st.bg, color: cr.text } as CSSProperties}>{p.conf}%</span>
      </span>
      <div style={{ flex: "1", minWidth: "0", fontSize: "11.5px", fontWeight: "500", lineHeight: "1.25", textDecoration: p.status === "removed" ? "line-through" : "none", textWrap: "pretty" } as CSSProperties}>{p.text}</div>
      <div style={{ fontSize: "9px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", flex: "none", letterSpacing: ".02em", whiteSpace: "nowrap" }}>{p.lo}–{p.hi}</div>
    </div>
  );
}

function Card({ pinned }: { pinned: boolean }) {
  return (
    <div style={{ position: "relative", width: "380px", height: "360px", overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
      <div className="im-research-tab" data-open="1" data-pinned={pinned ? "1" : undefined} style={{ left: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", height: "44px", padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: "16px 16px 0 0", flex: "none" }}>
          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text)" }}>Research</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "22px", padding: "0 9px", borderRadius: "999px", background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "'Geist Mono',monospace", fontSize: "10px", letterSpacing: ".08em", color: "var(--green-text)" }}>
              <span className="im-ev-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
              <span>4</span> SOURCES
            </div>
            {pinned ? <button className="im-hover1" aria-label="Close research" style={{ width: "24px", height: "24px", borderRadius: "999px", border: "none", background: "transparent", color: "var(--muted)", fontSize: "15px", lineHeight: "1", cursor: "pointer" }}>×</button> : null}
          </div>
        </div>
        <div style={{ padding: "16px 16px 6px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "-.01em", lineHeight: "1.3", textWrap: "balance" } as CSSProperties}>Weekly meal kits for dorms</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ROWS.map((r, i) => (
              <div key={i} className={pinned ? "im-research-row im-research-row-live" : "im-research-row"} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "9px 6px", margin: "0 -6px", borderRadius: "8px" }}>
                <span style={{ width: "3px", alignSelf: "stretch", borderRadius: "2px", background: r.sup ? "var(--green)" : "var(--red)", flex: "none" }} />
                <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "12px", lineHeight: "1.35", fontWeight: r.active ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9.5px", color: "var(--muted)" }}>{r.source}</div>
                </div>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9px", letterSpacing: ".1em", color: r.sup ? "var(--green-text)" : "var(--red-text)", flex: "none", paddingTop: "2px" }}>{r.sup ? "FOR" : "AGAINST"}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: "10px", flex: "none" }} />
      </div>
    </div>
  );
}

export default function MapParts() {
  return (
    <div className="pg-im" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "40px", fontFamily: "'Geist',system-ui,sans-serif" }}>
      <section>
        <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "14px" }}>Choice pills · confidence ring + likely range</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>{PILLS.map((p) => <Pill key={p.status} p={p} />)}</div>
      </section>
      <section>
        <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "14px" }}>Research card · hover preview, and pinned by a click</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px" }}><Card pinned={false} /><Card pinned /></div>
      </section>
    </div>
  );
}
