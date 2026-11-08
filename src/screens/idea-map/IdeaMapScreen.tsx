"use client";

// IdeaMap screen, ported from the Claude Design file "Idea Map.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup is the design's; colors use the Sprout theme variables (globals.css).
// Behaviour is in ./logic.js.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { useLogic } from "../dc";
import Logic from "./logic";
import "./idea-map.css";
import "./widgets/widgets.css";
import WidgetRail, { type WidgetKey } from "./widgets/WidgetRail";
import FloatingPanel from "./widgets/FloatingPanel";
import BuildWidget from "./widgets/BuildWidget";
import DiscussionWidget from "./widgets/DiscussionWidget";
import GraveyardWidget from "./widgets/GraveyardWidget";
import LaunchWidget from "./widgets/LaunchWidget";
import TeamWidget from "./widgets/TeamWidget";
import type { WidgetCtx } from "./widgets/types";

export default function IdeaMapScreen(props: Record<string, unknown>) {
  // clientOnly: which idea to show comes from the URL and this browser's saved ideas.
  const v = useLogic(Logic, props, { clientOnly: true });
  if (!v) return <div className="pg-im" />;
  const { showPillar, panelOpen, panelW, occupied, closePanel, setPanelW, setDragW, loading, missing, widget, setWidget, showBadge, ideaId, wmem, setWmem, pillarPct, buildIdea, applyWidget, openOverview, team, saveTeam, focus, ideaInitial, ideaName, ideaPitch, accept, addAgainst, addFor, choices, clearSel, counts, curves, cv, draft, edges, ev, hasToast, hoverIdea, hoverOff, hoverOn, evCard, evCardOpen, ideaShadow, isChoice, isEvidence, isIdea, isPillar, orbit, ov, paneRef, pctRef, particles, pillars, pv, reject, removeChoice, selIdea, setDraft, showHint, toast, toggleAll, toggleAllLabel, worldRef, zoomFit, zoomIn, zoomOut } = v;
  // App: no canned idea. While the stored idea loads, or if it isn't this account's, say so instead of drawing an empty map.
  if (loading || missing) {
    return (
      <div className="pg-im">
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", boxSizing: "border-box", background: "var(--bg, #f9fafb)", color: "var(--text, #111827)" }}>
          {loading ? (
            <div style={{ fontSize: "13px", color: "var(--muted, #6b7280)" }} role="status">Loading your idea…</div>
          ) : (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
              <div style={{ fontSize: "15px", fontWeight: 600 }}>That idea isn&apos;t here</div>
              <div style={{ fontSize: "13px", color: "var(--muted, #6b7280)" }}>It may belong to another account, or it was never saved.</div>
              <a href="/sessions" style={{ marginTop: "6px", fontSize: "12px", fontWeight: 600, color: "var(--text, #111827)" }}>Back to your ideas</a>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="pg-im">
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "8px 20px 8px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "0" }}>
            {/* Back to the ideas dashboard. A real link, so it works from the keyboard and with any panel open. */}
            <Link href="/sessions" className="im-back" style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px", padding: "0 14px 0 10px", boxSizing: "border-box", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "13px", fontWeight: "500", textDecoration: "none", whiteSpace: "nowrap", transition: "background .15s,border-color .15s" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Your ideas
            </Link>
            <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}>
              {ideaName}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              {counts}
            </div>
          </div>
          <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--muted)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--green)" }} />
              Supported
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", boxSizing: "border-box", background: "transparent", border: "1.5px solid var(--muted)" }} />
              Untested
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--red)" }} />
              Weakened
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", boxSizing: "border-box", background: "transparent", border: "1.5px dashed var(--accent)" }} />
              Suggested
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--border)" }} />
              Removed
            </div>
          </div>
        </div>
        {/* Stage: the map gets the full width. The floating panel and tab strip sit over its right side;
            --wg-occ is the width they cover, so map controls center in the visible part. */}
        <div className="im-stage" style={{ display: "flex", flex: "1", minHeight: "0", position: "relative", "--wg-occ": `${occupied}px` } as CSSProperties}>
          <div style={{ flex: "1", minWidth: "0", position: "relative" }}>
            {" "}
            {/* Viewport. Pan and zoom are one transform on the world wrapper below, written by camera.ts
                outside React (no scrolling, no re-render per frame). The grid is moved with it. */}
            <div ref={paneRef} className="im-pane" style={{ position: "absolute", inset: "0", overflow: "hidden", backgroundColor: "var(--bg)", backgroundImage: "linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)" }} onClick={clearSel}>
              {" "}
              <div>
                <div ref={worldRef} style={{ position: "absolute", left: "0", top: "0", width: "1340px", height: "1100px", transformOrigin: "0 0" } as CSSProperties}>
                  {" "}
                  <svg width="1340" height="1100" style={{ position: "absolute", inset: "0", overflow: "visible" }}>
                    <circle cx="670" cy="550" r="200" fill="none" style={{ stroke: "var(--border)" }} strokeWidth="1" />
                    <circle cx="670" cy="550" r="385" fill="none" style={{ stroke: "var(--border)" }} strokeWidth="1" strokeDasharray="2 6" />
                    {(curves ?? []).map((e: any, $index: number) => (
                      <Fragment key={$index}>
                        <path d={e?.d} fill="none" stroke={e?.stroke} strokeWidth={e?.w} strokeDasharray={e?.dash} opacity={e?.op} style={{ transition: "opacity .3s" }} />
                      </Fragment>
                    ))}
                  </svg>
                  {" "}
                  {(edges ?? []).map((e: any, $index: number) => (
                    <Fragment key={e?.id ?? $index}>
                      {" "}
                      <div style={{ position: "absolute", left: `${e?.x ?? ""}px`, top: `${e?.y ?? ""}px`, width: `${e?.len ?? ""}px`, height: "0", borderTop: `${e?.w ?? ""}px ${e?.style ?? ""} ${e?.stroke ?? ""}`, transform: `rotate(${e?.rot ?? ""}deg)`, transformOrigin: "0 0", opacity: `${e?.op ?? ""}`, transition: "left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),width .5s cubic-bezier(.2,.8,.2,1),transform .5s cubic-bezier(.2,.8,.2,1),opacity .3s", pointerEvents: "none", animation: "im-edgeIn .4s ease-out both" } as CSSProperties} />
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  {(pillars ?? []).map((p: any) => (
                    <Fragment key={p?.name}>
                      {" "}
                      <div data-node="pillar" style={{ position: "absolute", left: `${p?.x ?? ""}px`, top: `${p?.y ?? ""}px`, transform: `translate(-50%,-50%) scale(${p?.scale ?? ""})`, width: "72px", height: "72px", borderRadius: "50%", padding: "4px", boxSizing: "border-box", background: `${p?.ring ?? ""}`, cursor: "pointer", opacity: `${p?.op ?? ""}`, transition: "left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),opacity .3s,box-shadow .2s,transform .35s cubic-bezier(.2,.8,.2,1)", boxShadow: `${p?.shadow ?? ""}`, animation: "im-nodeIn .4s ease-out backwards", animationDelay: `${p?.delay ?? ""}` } as CSSProperties} onClick={p?.select} onMouseEnter={p?.enter} onMouseLeave={p?.leave} title={p?.title}>
                        {" "}
                        {p?.flashing ? (
                          <Fragment key={p?.flashKey}>
                            <span className="im-flash-ring" aria-hidden="true" />
                            <span className="im-flash-label" aria-hidden="true">{p?.flashText}</span>
                          </Fragment>
                        ) : null}
                        <div style={{ position: "absolute", right: "-4px", top: "-4px", minWidth: "20px", height: "20px", padding: "0 6px", boxSizing: "border-box", borderRadius: "999px", background: `${p?.badgeBg ?? ""}`, color: `${p?.badgeFg ?? ""}`, border: `1.5px solid ${p?.badgeBorder ?? ""}`, fontSize: "10px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", animation: "im-badgePop .3s ease-out backwards", animationDelay: `${p?.badgeDelay ?? ""}` } as CSSProperties}>
                          {p?.badge}
                        </div>
                        {" "}
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1px", fontSize: "11px", fontWeight: "600", color: "var(--text)", letterSpacing: "-.01em" }}>
                          <span>
                            {p?.name}
                          </span>
                          <span style={{ fontSize: "9px", fontFamily: "'Geist Mono',monospace", fontWeight: "500", color: `${p?.labelColor ?? ""}` } as CSSProperties}>
                            {p?.pct}%
                          </span>
                        </div>
                        {" "}
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  {(particles ?? []).map((f: any, $index: number) => (
                    <Fragment key={$index}>
                      {" "}
                      <div style={{ position: "absolute", left: "0", top: "0", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", offsetPath: `path('${f?.path ?? ""}')`, offsetRotate: "0deg", animation: `im-fxTravel ${f?.dur ?? ""} linear infinite`, animationDelay: `${f?.delay ?? ""}`, opacity: "0" } as CSSProperties}>
                        <span style={{ display: "block", fontFamily: "'Geist Mono',monospace", fontSize: `${f?.size ?? ""}`, fontWeight: "500", color: "var(--muted)", lineHeight: "1" } as CSSProperties}>
                          {f?.glyph}
                        </span>
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  {(choices ?? []).map((c: any) => (
                    <Fragment key={c?.id}>
                      {" "}
                      <div data-node="choice" style={{ position: "absolute", left: `${c?.x ?? ""}px`, top: `${c?.y ?? ""}px`, transform: `translate(-50%,-50%) scale(${c?.scale ?? ""})`, width: "156px", minHeight: "44px", display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px 6px 10px", boxSizing: "border-box", borderRadius: "10px", background: `${c?.bg ?? ""}`, border: `1.5px ${c?.borderStyle ?? ""} ${c?.border ?? ""}`, color: `${c?.color ?? ""}`, boxShadow: `${c?.shadow ?? ""}`, cursor: "pointer", opacity: `${c?.op ?? ""}`, pointerEvents: `${c?.pe ?? ""}`, transition: "left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),opacity .3s,box-shadow .2s,transform .35s cubic-bezier(.2,.8,.2,1)", animation: "im-nodeIn .4s ease-out backwards", animationDelay: `${c?.delay ?? ""}` } as CSSProperties} onClick={c?.select} onMouseEnter={c?.enter} onMouseLeave={c?.leave}>
                        {c?.ghost ? (
                          <svg className="im-ghost" viewBox="-11 -11 22 22" role="img" aria-label={`Haunted by ${c.ghost}`}>
                            <title>{`Haunted by ${c.ghost}`}</title>
                            <path d="M-8,9 L-8,-1 A8,8 0 0 1 8,-1 L8,9 L5.3,6.5 L2.7,9 L0,6.5 L-2.7,9 L-5.3,6.5 Z" style={{ fill: "var(--surface)", stroke: "var(--text)" }} strokeWidth="1.3" />
                            <circle cx="-3" cy="-1" r="1.3" style={{ fill: "var(--text)" }} />
                            <circle cx="3" cy="-1" r="1.3" style={{ fill: "var(--text)" }} />
                          </svg>
                        ) : null}
                        {/* App: confidence ring in the pillars' language: one colour filling conf% of the circle, the number inside. */}
                        <span className="im-conf-ring" title={c?.confTitle} style={{ background: `${c?.ring ?? ""}` } as CSSProperties}>
                          <span className="im-conf-core" style={{ background: `${c?.bg ?? ""}`, color: `${c?.confColor ?? ""}` } as CSSProperties}>
                            {c?.conf}%
                          </span>
                        </span>
                        <div style={{ flex: "1", minWidth: "0", fontSize: "11.5px", fontWeight: "500", lineHeight: "1.25", textDecoration: `${c?.deco ?? ""}`, textWrap: "pretty" } as CSSProperties}>
                          {c?.text}
                        </div>
                        <div title={c?.confTitle} style={{ fontSize: "9px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", flex: "none", letterSpacing: ".02em", whiteSpace: "nowrap" } as CSSProperties}>
                          {c?.range}
                        </div>
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  {(orbit ?? []).map((o: any) => (
                    <Fragment key={o?.id}>
                      {" "}
                      <div data-node="orbit" style={{ position: "absolute", left: `${o?.x ?? ""}px`, top: `${o?.y ?? ""}px`, transform: `translate(-50%,-50%) scale(${o?.scale ?? ""})`, width: "176px", display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", boxSizing: "border-box", borderRadius: "8px", background: "var(--surface)", /* Longhands only: mixing the border shorthand with borderLeft makes React warn when the color changes. */ borderStyle: "solid", borderWidth: "1px 1px 1px 3px", borderColor: `${o?.border ?? ""} ${o?.border ?? ""} ${o?.border ?? ""} ${o?.accent ?? ""}`, boxShadow: `${o?.shadow ?? ""}`, cursor: "pointer", transition: "transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .2s", animation: "im-nodeIn .35s ease-out backwards", animationDelay: `${o?.delay ?? ""}` } as CSSProperties} onClick={o?.select} onMouseEnter={o?.enter} onMouseLeave={o?.leave}>
                        <div style={{ flex: "1", minWidth: "0", fontSize: "10.5px", lineHeight: "1.3", color: "var(--text)", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {o?.text}
                        </div>
                        <div style={{ fontSize: "8.5px", fontFamily: "'Geist Mono',monospace", color: `${o?.kindColor ?? ""}`, flex: "none", textTransform: "uppercase" } as CSSProperties}>
                          {o?.kind}
                        </div>
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  <div data-node="idea" className="im-hover0" style={{ position: "absolute", left: "670px", top: "550px", transform: "translate(-50%,-50%)", width: "104px", height: "104px", borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--accent)", boxShadow: `${ideaShadow ?? ""}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: "2", transition: "transform .25s cubic-bezier(.34,1.56,.64,1)" } as CSSProperties} onClick={selIdea} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                    <span className="im-breathe-ring" aria-hidden="true" />
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--on-accent)", fontSize: "30px", fontWeight: "700", letterSpacing: "-.04em" }}>
                      {ideaInitial}
                    </div>
                  </div>
                  {" "}
                  {hoverIdea ? (
                    <>
                      {" "}
                      <div style={{ position: "absolute", left: "670px", top: "482px", transform: "translate(-50%,-100%)", width: "240px", padding: "12px 14px", boxSizing: "border-box", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 12px 32px var(--shadow)", zIndex: "3", pointerEvents: "none" }}>
                        {" "}
                        <div style={{ fontSize: "9px", fontWeight: "600", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "'Geist Mono',monospace", marginBottom: "5px" }}>
                          {ideaName}{" · the idea"}
                        </div>
                        {" "}
                        <div style={{ fontSize: "12.5px", lineHeight: "1.4", textWrap: "pretty" }}>
                          {ideaPitch}
                        </div>
                        {" "}
                        <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "6px" }}>
                          Click for the overview
                        </div>
                        {" "}
                        <div style={{ position: "absolute", left: "50%", bottom: "-6px", width: "12px", height: "12px", background: "var(--surface-2)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", boxSizing: "border-box", transform: "translateX(-50%) rotate(45deg)" }} />
                        {" "}
                      </div>
                      {" "}
                    </>
                  ) : null}
                  {" "}
                </div>
              </div>
              {" "}
            </div>
            {" "}
            {/* App: the Research card, the landing page's in miniature. Rises from the bottom left while an evidence card is hovered; a click pins it. */}
            {evCard ? (
              <div className="im-research-tab" data-open={evCardOpen ? "1" : undefined} data-pinned={evCard.pinned ? "1" : undefined} aria-hidden={!evCardOpen}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", height: "44px", padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: "16px 16px 0 0", flex: "none" }}>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text)", whiteSpace: "nowrap" }}>
                    Research
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "22px", padding: "0 9px", borderRadius: "999px", background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "'Geist Mono',monospace", fontSize: "10px", letterSpacing: ".08em", color: "var(--green-text)", whiteSpace: "nowrap" }}>
                      <span className="im-ev-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                      <span>{evCard.count}</span>{evCard.count === 1 ? " SOURCE" : " SOURCES"}
                    </div>
                    {evCard.pinned ? (
                      <button className="im-hover1" onClick={evCard.close} aria-label="Close research" title="Close (Esc)" style={{ width: "24px", height: "24px", borderRadius: "999px", border: "none", background: "transparent", color: "var(--muted)", fontSize: "15px", lineHeight: "1", cursor: "pointer" }}>
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
                <div style={{ padding: "16px 16px 6px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "-.01em", lineHeight: "1.3", color: "var(--text)", textWrap: "balance" } as CSSProperties}>
                    {evCard.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {(evCard.rows ?? []).map((r: any, $index: number) => (
                      <div key={$index} className={r?.select ? "im-research-row im-research-row-live" : "im-research-row"} data-active={r?.active ? "1" : undefined} onClick={r?.select ?? undefined} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "9px 6px", margin: "0 -6px", borderRadius: "8px" }}>
                        <span style={{ width: "3px", alignSelf: "stretch", borderRadius: "2px", background: `${r?.accent ?? ""}`, flex: "none" } as CSSProperties} />
                        <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ fontSize: "12px", lineHeight: "1.35", color: "var(--text)", fontWeight: r?.active ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r?.text}
                          </div>
                          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9.5px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r?.source}
                          </div>
                        </div>
                        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9px", letterSpacing: ".1em", color: `${r?.tagColor ?? ""}`, flex: "none", paddingTop: "2px" } as CSSProperties}>
                          {r?.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: "10px", flex: "none" }} />
              </div>
            ) : null}
            <div style={{ position: "absolute", right: "var(--wg-occ)", top: "16px", transition: "right .25s ease", display: "flex", alignItems: "center", gap: "2px", padding: "4px", borderRadius: "999px", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 16px var(--shadow)", zIndex: "4" }}>
              <button className="im-hover1" style={{ width: "28px", height: "28px", borderRadius: "999px", border: "none", background: "transparent", color: "var(--text)", fontSize: "16px", cursor: "pointer", lineHeight: "1" }} onClick={zoomOut} title="Zoom out (−)" aria-label="Zoom out">
                −
              </button>
              <span ref={pctRef} aria-label="Zoom level" style={{ minWidth: "44px", textAlign: "center", color: "var(--muted)", fontSize: "11px", fontFamily: "'Geist Mono',monospace" }}>
                100%
              </span>
              <button className="im-hover1" style={{ width: "28px", height: "28px", borderRadius: "999px", border: "none", background: "transparent", color: "var(--text)", fontSize: "16px", cursor: "pointer", lineHeight: "1" }} onClick={zoomIn} title="Zoom in (+)" aria-label="Zoom in">
                +
              </button>
              <span aria-hidden="true" style={{ width: "1px", height: "18px", background: "var(--border)", margin: "0 4px" }} />
              <button className="im-hover1" style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "28px", padding: "0 10px 0 8px", borderRadius: "999px", border: "none", background: "transparent", color: "var(--text)", fontSize: "11px", fontWeight: "600", cursor: "pointer" }} onClick={zoomFit} title="Fit to screen (0)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                Fit to screen
              </button>
            </div>
            {" "}
            <div style={{ position: "absolute", left: "calc((100% - var(--wg-occ)) / 2)", bottom: "16px", transform: "translateX(-50%)", transition: "left .25s ease", display: "flex", alignItems: "center", gap: "4px", padding: "5px 6px", borderRadius: "999px", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 16px var(--shadow)", zIndex: "4" }}>
              <button className="im-hover1" style={{ height: "28px", padding: "0 12px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "11px", fontWeight: "600", cursor: "pointer" }} onClick={toggleAll}>
                {toggleAllLabel}
              </button>
            </div>
            {" "}
            {showHint ? (
              <>
                {" "}
                <div style={{ position: "absolute", left: "16px", top: "16px", padding: "6px 12px", borderRadius: "999px", background: "var(--surface)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)", zIndex: "4", animation: "im-panelIn .5s ease-out .6s both", pointerEvents: "none" }}>
                  Tap a pillar to open its choices · drag to move · pinch or ⌘-scroll to zoom
                </div>
                {" "}
              </>
            ) : null}
            {" "}
            {" "}
            {hasToast ? (
              <>
                {" "}
                <div style={{ position: "absolute", left: "calc((100% - var(--wg-occ)) / 2)", top: "16px", transform: "translateX(-50%)", padding: "8px 14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "12px", boxShadow: "0 8px 24px var(--shadow)", zIndex: "5", animation: "im-toastIn .25s ease-out", whiteSpace: "nowrap" }}>
                  {toast}
                </div>
                {" "}
              </>
            ) : null}
            {" "}
          </div>
          {/* Floating widget panel over the right of the map, then the tab strip on the far right edge.
              Collapsed = hidden, not unmounted, so a widget keeps its state. */}
          <FloatingPanel open={!!panelOpen} width={panelW} label={TITLES[widget] ?? "Overview"} onCommit={setPanelW} onLive={setDragW} onClose={closePanel}>
            {isIdea ? (
              <>
                <div style={{ animation: "im-panelIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
                  {" "}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
                      Overview
                    </div>
                    {" "}
                    <div style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.3", textWrap: "pretty" }}>
                      {ideaName}
                    </div>
                    {/* Description: 3 lines max, full text on hover (same treatment as the dashboard cards). */}
                    <div title={ideaPitch} style={{ marginTop: "4px", fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ideaPitch}
                    </div>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "16px" }}>
                      <div style={{ width: "84px", height: "84px", borderRadius: "50%", padding: "7px", boxSizing: "border-box", background: `${ov?.ring ?? ""}`, flex: "none", animation: "im-countUp .4s cubic-bezier(.34,1.56,.64,1) both" } as CSSProperties}>
                        {" "}
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", letterSpacing: "-.04em", color: `${ov?.scoreColor ?? ""}` } as CSSProperties}>
                          <span>{ov?.score}</span>%
                        </div>
                        {" "}
                      </div>
                      <div>
                        {" "}
                        <div style={{ fontSize: "12px", fontWeight: "600" }}>
                          Overall confidence
                        </div>
                        {" "}
                        <div style={{ fontSize: "11px", color: `${ov?.deltaColor ?? ""}` } as CSSProperties}>
                          {ov?.delta}
                        </div>
                        {" "}
                      </div>
                    </div>
                    {" "}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginTop: "14px" }}>
                      <div style={{ padding: "8px 6px", borderRadius: "8px", background: "var(--surface-2)", textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--green-text)" }}>
                          {ov?.nSup}
                        </div>
                        <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                          Supported
                        </div>
                      </div>
                      <div style={{ padding: "8px 6px", borderRadius: "8px", background: "var(--surface-2)", textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
                          {ov?.nUnt}
                        </div>
                        <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                          Untested
                        </div>
                      </div>
                      <div style={{ padding: "8px 6px", borderRadius: "8px", background: "var(--surface-2)", textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--red-text)" }}>
                          {ov?.nWeak}
                        </div>
                        <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                          Weakened
                        </div>
                      </div>
                      <div style={{ padding: "8px 6px", borderRadius: "8px", background: "var(--surface-2)", textAlign: "center" }}>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--green-text)" }}>
                          {ov?.nSug}
                        </div>
                        <div style={{ fontSize: "9.5px", color: "var(--muted)" }}>
                          Suggested
                        </div>
                      </div>
                    </div>
                    {" "}
                  </div>
                  {" "}
                  {ov?.hasSuggestion ? (
                    <>
                      {" "}
                      {/* Every pending suggestion (widgets can add several), newest first. */}
                      {(ov?.suggestions ?? []).map((sg: any, i: number) => (
                        <div key={sg.id} style={{ margin: "16px 20px 0", padding: "12px 14px", borderRadius: "10px", border: "1.5px dashed var(--accent)", background: "var(--accent-tint)", cursor: "pointer" }} onClick={sg.open}>
                          {i === 0 ? (
                            <div style={{ fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "4px" }}>
                              {ov?.suggestions.length > 1 ? `Waiting on you · ${ov.suggestions.length}` : "Waiting on you"}
                            </div>
                          ) : null}
                          <div style={{ fontSize: "12.5px", fontWeight: "600", lineHeight: "1.35" }}>
                            {sg.text}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px" }}>
                            {sg.note}
                          </div>
                        </div>
                      ))}
                      {" "}
                    </>
                  ) : null}
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)" }}>
                        Pillars
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {"weakest: "}
                        <span style={{ color: "var(--red-text)", fontWeight: "600" }}>
                          {ov?.weakest}
                        </span>
                      </div>
                    </div>
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(pillars ?? []).map((p: any, $index: number) => (
                        <Fragment key={$index}>
                          <div className="im-hover1" style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "3px 6px", margin: "0 -6px", borderRadius: "6px", animation: "im-rowIn .35s ease-out both", animationDelay: `${p?.rowDelay ?? ""}` } as CSSProperties} onClick={p?.select}>
                            <div style={{ width: "26px", height: "26px", borderRadius: "50%", padding: "3px", boxSizing: "border-box", background: `${p?.ring ?? ""}`, flex: "none" } as CSSProperties}>
                              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)" }}>
                                {p?.glyph}
                              </div>
                            </div>
                            <div style={{ flex: "1", fontSize: "12px", fontWeight: "500" }}>
                              {p?.name}
                            </div>
                            <div style={{ fontSize: "11px", fontFamily: "'Geist Mono',monospace", color: `${p?.labelColor ?? ""}`, fontWeight: "500" } as CSSProperties}>
                              {p?.pct}%
                            </div>
                            <div style={{ width: "44px", textAlign: "right", fontSize: "10px", color: `${p?.labelColor ?? ""}`, fontWeight: "500" } as CSSProperties}>
                              {p?.label}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      {ov?.changesTitle}
                    </div>
                    {" "}
                    {ov?.noChanges ? (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Nothing changed this week.
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(ov?.changes ?? []).map((h: any, $index: number) => (
                        <Fragment key={$index}>
                          <div className="im-hover1" style={{ display: "flex", gap: "10px", cursor: "pointer", padding: "4px 6px", margin: "0 -6px", borderRadius: "6px" }} onClick={h?.select}>
                            <span style={{ marginTop: "5px", width: "6px", height: "6px", borderRadius: "50%", background: `${h?.dot ?? ""}`, flex: "none" } as CSSProperties} />
                            <div style={{ flex: "1" }}>
                              {" "}
                              <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                                <span style={{ fontWeight: "600", color: `${h?.color ?? ""}` } as CSSProperties}>
                                  {h?.type}
                                </span>
                                {" "}
                                <span>
                                  {h?.choiceText}
                                </span>
                              </div>
                              {" "}
                              <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4", marginTop: "1px" }}>
                                {h?.note}
                              </div>
                              {" "}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                </div>
              </>
            ) : null}
            {isPillar ? (
              <>
                <div style={{ animation: "im-panelIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
                  {" "}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
                      <span style={{ cursor: "pointer" }} onClick={selIdea}>
                        Overview
                      </span>
                      <span>
                        ›
                      </span>
                      <span>
                        Pillar
                      </span>
                    </div>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-tint)", border: "1px solid var(--accent)", boxSizing: "border-box", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono',monospace", fontSize: "15px" }}>
                        {pv?.glyph}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "600" }}>
                        {pv?.name}
                      </div>
                    </div>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "14px" }}>
                      <div style={{ width: "72px", height: "72px", borderRadius: "50%", padding: "6px", boxSizing: "border-box", background: `${pv?.ring ?? ""}`, flex: "none", animation: "im-countUp .4s cubic-bezier(.34,1.56,.64,1) both" } as CSSProperties}>
                        {" "}
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "700", letterSpacing: "-.04em", color: `${pv?.labelColor ?? ""}` } as CSSProperties}>
                          <span>{pv?.pct}</span>%
                        </div>
                        {" "}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: `${pv?.labelColor ?? ""}` } as CSSProperties}>
                          {pv?.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4" }}>
                          {pv?.summary}
                        </div>
                      </div>
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      Choices
                    </div>
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(pv?.choices ?? []).map((c: any, $index: number) => (
                        <Fragment key={$index}>
                          <div className="im-hover2" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer" }} onClick={c?.select}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: `${c?.dot ?? ""}`, border: `1px solid ${c?.dotBorder ?? ""}`, boxSizing: "border-box", flex: "none" } as CSSProperties} />
                            <div style={{ flex: "1", minWidth: "0" }}>
                              <div style={{ fontSize: "12px", fontWeight: "500", textDecoration: `${c?.deco ?? ""}` } as CSSProperties}>
                                {c?.text}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                                {c?.sub}
                              </div>
                            </div>
                            <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                              →
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      What would move this pillar
                    </div>
                    {" "}
                    {pv?.noTests ? (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Every choice here is backed. Keep monitoring.
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {(pv?.tests ?? []).map((t: any, $index: number) => (
                        <Fragment key={$index}>
                          <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--surface-2)", cursor: "pointer" }} onClick={t?.select}>
                            {" "}
                            <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "3px" }}>
                              Test for “{t?.choice}”
                            </div>
                            {" "}
                            <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                              {t?.text}
                            </div>
                            {" "}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      History
                    </div>
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(pv?.history ?? []).map((h: any, $index: number) => (
                        <Fragment key={$index}>
                          <div style={{ display: "flex", gap: "12px", cursor: "pointer" }} onClick={h?.select}>
                            <div style={{ fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", flex: "none", width: "36px", paddingTop: "2px" }}>
                              {h?.week}
                            </div>
                            <div style={{ flex: "1" }}>
                              <div style={{ fontSize: "12px" }}>
                                <span style={{ fontWeight: "600", color: `${h?.color ?? ""}` } as CSSProperties}>
                                  {h?.type}
                                </span>
                                {" "}
                                <span>
                                  {h?.choiceText}
                                </span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4" }}>
                                {h?.note}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                </div>
              </>
            ) : null}
            {isChoice ? (
              <>
                <div style={{ animation: "im-panelIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
                  {" "}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
                      <span style={{ cursor: "pointer" }} onClick={selIdea}>
                        Overview
                      </span>
                      <span>
                        ›
                      </span>
                      <span style={{ cursor: "pointer" }} onClick={cv?.selectPillar}>
                        {cv?.pillar}
                      </span>
                    </div>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: `${cv?.chipBg ?? ""}`, color: `${cv?.chipFg ?? ""}` } as CSSProperties}>
                        {cv?.statusLabel}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {"since "}{cv?.since}
                      </span>
                    </div>
                    {" "}
                    <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.3", textWrap: "pretty" }}>
                      {cv?.text}
                    </div>
                    {" "}
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px", lineHeight: "1.45" }}>
                      {cv?.summary}
                    </div>
                    {" "}
                    <div style={{ display: "flex", gap: "2px", marginTop: "14px", height: "6px", borderRadius: "3px", overflow: "hidden", background: "var(--border)" }}>
                      <div style={{ width: `${cv?.forPct ?? ""}%`, background: "var(--green)", transition: "width .3s" } as CSSProperties} />
                      <div style={{ width: `${cv?.againstPct ?? ""}%`, background: "var(--red)", transition: "width .3s" } as CSSProperties} />
                    </div>
                    {" "}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)", marginTop: "5px" }}>
                      <span>
                        <b style={{ color: "var(--green-text)" }}>
                          {cv?.nFor}
                        </b>
                        {" for"}
                      </span>
                      <span>
                        <b style={{ color: "var(--red-text)" }}>
                          {cv?.nAgainst}
                        </b>
                        {" against"}
                      </span>
                    </div>
                    {" "}
                    {cv?.isSuggested ? (
                      <>
                        {" "}
                        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                          <button className="im-primary" style={{ flex: "1", height: "34px", borderRadius: "999px", border: "none", background: "var(--primary)", color: "var(--on-primary)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }} onClick={accept}>
                            Accept replacement
                          </button>
                          <button className="im-hover1" style={{ flex: "1", height: "34px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }} onClick={reject}>
                            Reject
                          </button>
                        </div>
                        {" "}
                      </>
                    ) : null}
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      {"Evidence · "}{cv?.evCount}
                    </div>
                    {" "}
                    {cv?.noEvidence ? (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic", marginBottom: "8px" }}>
                          No evidence yet. This is a guess.
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(cv?.evidence ?? []).map((ev: any, $index: number) => (
                        <Fragment key={$index}>
                          <div className="im-hover2" style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", borderRadius: "8px", borderStyle: "solid", borderWidth: "1px 1px 1px 3px", borderColor: `var(--border) var(--border) var(--border) ${ev?.accent ?? ""}`, cursor: "pointer" } as CSSProperties} onClick={ev?.select}>
                            <div style={{ flex: "1" }}>
                              <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                                {ev?.text}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "3px", fontFamily: "'Geist Mono',monospace" }}>
                                {ev?.source}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {cv?.canEdit ? (
                      <>
                        {" "}
                        <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                          {" "}
                          <textarea className="im-input" aria-label="What you learned" value={draft} onChange={setDraft} placeholder="Add what you learned… e.g. 7 of 10 testers finished setup" style={{ width: "100%", boxSizing: "border-box", minHeight: "52px", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", fontSize: "12px", resize: "vertical", background: "var(--surface-2)", color: "var(--text)" }} />
                          {" "}
                          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                            <button style={{ flex: "1", height: "30px", borderRadius: "999px", border: "1px solid var(--green-line)", background: "var(--surface)", color: "var(--green-text)", fontSize: "11px", fontWeight: "600", cursor: "pointer" }} onClick={addFor}>
                              Supports it
                            </button>
                            <button style={{ flex: "1", height: "30px", borderRadius: "999px", border: "1px solid var(--red-line)", background: "var(--surface)", color: "var(--red-text)", fontSize: "11px", fontWeight: "600", cursor: "pointer" }} onClick={addAgainst}>
                              Undermines it
                            </button>
                          </div>
                          {" "}
                        </div>
                        {" "}
                      </>
                    ) : null}
                    {" "}
                  </div>
                  {" "}
                  {/* App: pressure-test this choice (Challenge → Discussions, Research and Plan → /api/node/*). */}
                  {cv?.canAct ? (
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "8px" }}>Pressure-test it</div>
                      <div className="im-actions">
                        <button type="button" className="im-action" onClick={cv?.challenge} disabled={!!cv?.nodeBusy}>
                          Challenge
                        </button>
                        <button type="button" className="im-action" onClick={cv?.research} disabled={!!cv?.nodeBusy}>
                          {cv?.nodeBusy === "research" ? "Researching…" : "Research"}
                        </button>
                        <button type="button" className="im-action" onClick={cv?.plan} disabled={!!cv?.nodeBusy}>
                          {cv?.nodeBusy === "plan" ? "Planning…" : "Plan"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "8px" }}>
                      Next test
                    </div>
                    {" "}
                    <div style={{ fontSize: "12px", lineHeight: "1.45", padding: "10px 12px", borderRadius: "8px", background: "var(--surface-2)" }}>
                      {cv?.test}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  {cv?.hasLinks ? (
                    <>
                      {" "}
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                        {" "}
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                          Connected choices
                        </div>
                        {" "}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(cv?.links ?? []).map((l: any, $index: number) => (
                            <Fragment key={$index}>
                              <div className="im-hover2" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer" }} onClick={l?.select}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: `${l?.dot ?? ""}`, border: `1px solid ${l?.dotBorder ?? ""}`, boxSizing: "border-box", flex: "none" } as CSSProperties} />
                                <div style={{ flex: "1", minWidth: "0" }}>
                                  <div style={{ fontSize: "12px", fontWeight: "500" }}>
                                    {l?.text}
                                  </div>
                                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                                    {l?.note}
                                  </div>
                                </div>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                        {" "}
                      </div>
                      {" "}
                    </>
                  ) : null}
                  {" "}
                  <div style={{ padding: "16px 20px" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      History
                    </div>
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {(cv?.history ?? []).map((h: any, $index: number) => (
                        <Fragment key={$index}>
                          <div style={{ display: "flex", gap: "12px", cursor: "pointer" }} onClick={h?.select} title="Open this choice">
                            <div style={{ fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", flex: "none", width: "36px", paddingTop: "2px" }}>
                              {h?.week}
                            </div>
                            <div style={{ flex: "1" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: `${h?.color ?? ""}` } as CSSProperties}>
                                {h?.type}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
                                {h?.note}
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                    {cv?.canRemove ? (
                      <>
                        {" "}
                        <button className="im-hover1" style={{ marginTop: "16px", width: "100%", height: "32px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)", fontSize: "11px", fontWeight: "600", cursor: "pointer" }} onClick={removeChoice}>
                          Remove this choice
                        </button>
                        {" "}
                      </>
                    ) : null}
                    {" "}
                  </div>
                  {" "}
                </div>
              </>
            ) : null}
            {isEvidence ? (
              <>
                <div style={{ animation: "im-panelIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
                  {" "}
                  <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "8px" }}>
                      <span style={{ cursor: "pointer" }} onClick={selIdea}>
                        Overview
                      </span>
                      <span>
                        ›
                      </span>
                      <span style={{ cursor: "pointer" }} onClick={ev?.selectPillar}>
                        {ev?.pillar}
                      </span>
                      <span>
                        ›
                      </span>
                      <span style={{ cursor: "pointer" }} onClick={ev?.selectChoice}>
                        Choice
                      </span>
                    </div>
                    {" "}
                    <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: `${ev?.chipBg ?? ""}`, color: `${ev?.chipFg ?? ""}` } as CSSProperties}>
                      {ev?.kindLabel}
                    </span>
                    {" "}
                    <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.35", marginTop: "10px", textWrap: "pretty" }}>
                      {ev?.text}
                    </div>
                    {" "}
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "8px", fontFamily: "'Geist Mono',monospace" }}>
                      {ev?.source}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      What it did
                    </div>
                    {" "}
                    <div style={{ fontSize: "12px", lineHeight: "1.45", padding: "10px 12px", borderRadius: "8px", background: "var(--surface-2)" }}>
                      {ev?.impact}
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      Affects
                    </div>
                    {" "}
                    <div className="im-hover2" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer" }} onClick={ev?.selectChoice}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: `${ev?.dot ?? ""}`, border: `1px solid ${ev?.dotBorder ?? ""}`, boxSizing: "border-box", flex: "none" } as CSSProperties} />
                      <div style={{ flex: "1", fontSize: "12px", fontWeight: "500" }}>
                        {ev?.choiceText}
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                        →
                      </span>
                    </div>
                    {" "}
                  </div>
                  {" "}
                  <div style={{ padding: "16px 20px" }}>
                    {" "}
                    <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)", marginBottom: "10px" }}>
                      Other evidence on this choice
                    </div>
                    {" "}
                    {ev?.noSiblings ? (
                      <>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          This is the only evidence so far.
                        </div>
                      </>
                    ) : null}
                    {" "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(ev?.siblings ?? []).map((s: any, $index: number) => (
                        <Fragment key={$index}>
                          <div className="im-hover2" style={{ padding: "8px 10px", borderRadius: "8px", borderStyle: "solid", borderWidth: "1px 1px 1px 3px", borderColor: `var(--border) var(--border) var(--border) ${s?.accent ?? ""}`, cursor: "pointer", fontSize: "12px", lineHeight: "1.4" } as CSSProperties} onClick={s?.select}>
                            {s?.text}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                </div>
              </>
            ) : null}
            {widget !== "overview" ? (
              <WidgetSlot widget={widget} ctx={{ ideaId, wmem, setWmem, pillarPct, showPillar, buildIdea, applyWidget, openOverview, team, saveTeam, focus }} />
            ) : null}
          </FloatingPanel>
          <WidgetRail active={widget as WidgetKey} open={!!panelOpen} onPick={setWidget} badge={!!showBadge} />
        </div>
      </div>
    </div>
  );
}

const TITLES: Record<string, string> = { overview: "Overview", launch: "Launch day", graveyard: "Graveyard", customer: "Discussions", build: "Build", team: "Team" };

function WidgetSlot({ widget, ctx }: { widget: string; ctx: WidgetCtx }) {
  // key: a different idea starts the widget fresh.
  if (widget === "graveyard") return <GraveyardWidget key={ctx.ideaId} ctx={ctx} />;
  if (widget === "customer") return <DiscussionWidget key={`${ctx.ideaId}:${ctx.focus?.key ?? 0}`} ctx={ctx} />;
  if (widget === "launch") return <LaunchWidget key={ctx.ideaId} ctx={ctx} />;
  if (widget === "build") return <BuildWidget key={ctx.ideaId} ctx={ctx} />;
  if (widget === "team") return <TeamWidget key={ctx.ideaId} ctx={ctx} />;
  return (
    <section className="wg-panel" aria-label={TITLES[widget]}>
      <h2 className="wg-title">{TITLES[widget]}</h2>
      <p className="wg-muted">Coming in the next step.</p>
    </section>
  );
}
