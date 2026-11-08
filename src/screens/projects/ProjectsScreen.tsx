"use client";

// Projects screen, ported from the Claude Design file "Projects.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup and inline styles are the design's, converted 1:1; behaviour is in ./logic.js.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { useLogic } from "../dc";
import Logic from "./logic";
import "./projects.css";

export default function ProjectsScreen(props: Record<string, unknown>) {
  const v = useLogic(Logic, props, { clientOnly: true });
  if (!v) return <div className="pg-pj" />;
  const { initial, isDemo, logout, name, projects } = v;
  return (
    <div className="pg-pj">
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f9fafb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", background: "#fff", flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#111827" }} />
            <div style={{ fontSize: "14px", fontWeight: "600" }}>
              Idea map
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isDemo ? (
              <>
                <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "999px", background: "#f3f4f6", color: "#4b5563", fontFamily: "'Geist Mono',monospace" }}>
                  Demo mode
                </span>
              </>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#111827", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>
                {initial}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "500" }}>
                {name}
              </div>
            </div>
            <button className="pj-hover0" onClick={logout} style={{ height: "32px", padding: "0 12px", borderRadius: "999px", border: "1px solid #e5e7eb", background: "#fff", color: "#111827", fontSize: "12px", fontWeight: "500", cursor: "pointer", transition: "background .15s" }}>
              Log out
            </button>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: "1100px", margin: "0 auto", padding: "48px 20px 80px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h1 style={{ margin: "0", fontSize: "26px", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.2" }}>
              {"Hi "}{name}, here are your ideas
            </h1>
            <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
              Pick up where you left off, or start something new.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "16px" }}>
            {(projects ?? []).map((p: any, $index: number) => (
              <Fragment key={$index}>
                <a className="pj-hover1" href={p?.href} style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", borderRadius: "14px", border: "1px solid #e5e7eb", background: "#fff", textDecoration: "none", color: "#111827", textAlign: "left", cursor: "pointer", transition: "border-color .15s,box-shadow .15s,transform .15s", animation: "pj-cardIn .35s cubic-bezier(.2,.8,.2,1) both", animationDelay: `${p?.delay ?? ""}` } as CSSProperties}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "56px", padding: "0 2px" }}>
                    {(p?.bars ?? []).map((b: any, $index: number) => (
                      <Fragment key={$index}>
                        <div title={b?.title} style={{ flex: "1", height: `${b?.h ?? ""}`, borderRadius: "3px 3px 1px 1px", background: `${b?.color ?? ""}`, minHeight: "3px" } as CSSProperties} />
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", lineHeight: "1.3", textWrap: "pretty" }}>
                      {p?.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>
                      {p?.subtitle}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginTop: "auto" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "22px", padding: "0 8px", borderRadius: "999px", background: `${p?.pillBg ?? ""}`, color: `${p?.pillFg ?? ""}`, fontSize: "11px", fontWeight: "600" } as CSSProperties}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: `${p?.pillFg ?? ""}` } as CSSProperties} />
                      <span>{p?.readiness}</span>% ready
                    </span>
                    <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'Geist Mono',monospace" }}>
                      {p?.edited}
                    </span>
                  </div>
                </a>
              </Fragment>
            ))}
            <Link className="pj-hover2" href="/map?new=1" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "200px", padding: "18px", borderRadius: "14px", border: "1.5px dashed #d1d5db", background: "transparent", textDecoration: "none", color: "#4b5563", cursor: "pointer", transition: "border-color .15s,color .15s,background .15s" }}>
              <span style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", lineHeight: "1" }}>
                +
              </span>
              <span style={{ fontSize: "14px", fontWeight: "500" }}>
                Start a new idea
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
