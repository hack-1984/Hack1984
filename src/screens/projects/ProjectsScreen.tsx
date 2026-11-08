"use client";

// Projects screen, ported from the Claude Design file "Projects.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup is the design's; colors use the Sprout theme variables (globals.css).
// Behaviour is in ./logic.js.
// App addition: a remove control on each card (hover-revealed X, inline confirm, animated exit).
// It sits beside the card link in a positioned wrapper so the anchor stays valid and a click on
// it never navigates.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { useLogic } from "../dc";
import Logic from "./logic";
import "./projects.css";

export default function ProjectsScreen(props: Record<string, unknown>) {
  const v = useLogic(Logic, props, { clientOnly: true });
  if (!v) return <div className="pg-pj" />;
  const { initial, isDemo, logout, name, projects, askRemove, cancelRemove, confirmRemove } = v;
  return (
    <div className="pg-pj">
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "8px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap" }}>
          <Link href="/" aria-label="Sprout home" style={{ display: "flex", alignItems: "center", minHeight: "44px", textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sprout-logo-black.svg" alt="Sprout" width={100} height={28} style={{ display: "block" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isDemo ? (
              <>
                <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "999px", background: "var(--surface-2)", color: "var(--muted)", fontFamily: "'Geist Mono',monospace" }}>
                  Demo mode
                </span>
              </>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>
                {initial}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "500" }}>
                {name}
              </div>
            </div>
            <button className="pj-hover0" onClick={logout} style={{ minHeight: "44px", padding: "0 16px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "background .15s,border-color .15s" }}>
              Log out
            </button>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "48px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h1 style={{ margin: "0", fontSize: "26px", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.2" }}>
              {"Hi "}{name}, here are your ideas
            </h1>
            <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)" }}>
              Pick up where you left off, or plant something new.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "16px" }}>
            {(projects ?? []).map((p: any) => (
              <Fragment key={p?.id}>
                <div className={"pj-card" + (p?.confirming ? " pj-card-confirming" : "") + (p?.leaving ? " pj-card-leaving" : "")} style={{ position: "relative", display: "flex", borderRadius: "14px", transition: "transform .15s", animation: p?.leaving ? "pj-cardOut .24s cubic-bezier(.4,0,.6,1) both" : "pj-cardIn .35s cubic-bezier(.2,.8,.2,1) both", animationDelay: p?.leaving ? "0s" : `${p?.delay ?? ""}` } as CSSProperties}>
                <Link className="pj-hover1" href={p?.href} aria-hidden={p?.confirming ? true : undefined} tabIndex={p?.confirming ? -1 : undefined} style={{ flex: "1", display: "flex", flexDirection: "column", gap: "14px", padding: "18px", borderRadius: "14px", border: "1px solid var(--border)", background: "var(--surface)", textDecoration: "none", color: "var(--text)", textAlign: "left", cursor: "pointer", transition: "background .15s,border-color .15s,box-shadow .15s" } as CSSProperties}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "56px", padding: "0 2px" }}>
                    {(p?.bars ?? []).map((b: any, $index: number) => (
                      <Fragment key={$index}>
                        <div title={b?.title} style={{ flex: "1", height: `${b?.h ?? ""}`, borderRadius: "3px 3px 1px 1px", background: `${b?.color ?? ""}`, minHeight: "3px" } as CSSProperties} />
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.3", textWrap: "pretty" }}>
                      {p?.title}
                    </div>
                    {/* Description: 2 lines max, full text on hover. */}
                    <div title={p?.description} style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p?.description}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "auto" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "22px", padding: "0 8px", borderRadius: "999px", background: `${p?.pillBg ?? ""}`, color: `${p?.pillFg ?? ""}`, fontSize: "11px", fontWeight: "600" } as CSSProperties}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: `${p?.pillDot ?? ""}` } as CSSProperties} />
                      <span>{`${p?.readiness}% ready`}</span>
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'Geist Mono',monospace" }}>
                      {p?.meta}
                    </span>
                  </div>
                </Link>
                {/* Remove: revealed on hover/focus, always visible on touch (projects.css). */}
                <button type="button" className="pj-x" aria-label={`Remove ${p?.title ?? "idea"}`} title="Remove idea" onClick={() => askRemove?.(p?.id)} style={{ position: "absolute", top: "10px", right: "10px", width: "26px", height: "26px", padding: "0", borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 2px var(--shadow)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                {p?.confirming ? (
                  <div className="pj-confirm" role="dialog" aria-label={`Remove ${p?.title ?? "idea"}?`} onClick={(e) => { if (e.target === e.currentTarget) cancelRemove?.(); }} style={{ position: "absolute", inset: "0", borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "18px", textAlign: "center", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "100%" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", lineHeight: "1.3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                        {"Remove “"}{p?.title}{"”?"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        This can&apos;t be undone.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" className="pj-hover0" autoFocus onClick={() => cancelRemove?.()} style={{ height: "32px", padding: "0 14px", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "12.5px", fontWeight: "500", cursor: "pointer", transition: "background .15s,border-color .15s" }}>
                        Keep
                      </button>
                      <button type="button" className="pj-danger" onClick={() => confirmRemove?.(p?.id)} style={{ height: "32px", padding: "0 14px", borderRadius: "999px", border: "1px solid var(--red)", background: "var(--red)", color: "#fff", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", transition: "background .15s,border-color .15s,transform .1s" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
                </div>
              </Fragment>
            ))}
            <Link className="pj-hover2" href="/new" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "200px", padding: "18px", borderRadius: "14px", border: "1.5px dashed var(--border)", background: "transparent", textDecoration: "none", color: "var(--muted)", cursor: "pointer", transition: "border-color .15s,color .15s,background .15s" }}>
              <span style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid currentColor", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* Seedling, same stroke style as the other icons. */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 20h10" />
                  <path d="M10 20c5.5-2.5.8-6.4 3-10" />
                  <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
                  <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
                </svg>
              </span>
              <span style={{ fontSize: "14px", fontWeight: "500" }}>
                Plant a new seed
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
