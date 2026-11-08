"use client";

// Canvas screen, ported from the Claude Design file "Canvas.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup and inline styles are the design's, converted 1:1; behaviour is in ./logic.js.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLogic } from "../dc";
import { Session, useSession } from "@/session";
import Logic from "./logic";
import "./canvas.css";

// Sponsor logos in public/sponsors/. name: from the file name, in each brand's own casing.
// w/h: sized by visual area, so a long wordmark and a square mark look equally big (tall marks cap at 60px,
// wordmarks at 176px wide). size/pos: crop the mask to the visible mark, since some files carry uneven
// empty space (SSOJet, Within3). Measured from each file's alpha channel; the images are not edited.
const SPONSORS: { file: string; name: string; w: number; h: number; size: string; pos: string }[] = [
  { file: "adobe.webp", name: "Adobe", w: 134, h: 34, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "anthropic.webp", name: "Anthropic", w: 176, h: 20, size: "100.00% 101.77%", pos: "0.0% 50.0%" },
  { file: "bravado.webp", name: "Bravado", w: 47, h: 60, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "codecrafters.webp", name: "CodeCrafters", w: 114, h: 41, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "elisity.webp", name: "Elisity", w: 143, h: 32, size: "100.91% 103.23%", pos: "40.0% 50.0%" },
  { file: "exa.webp", name: "Exa", w: 121, h: 38, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "fuzionx.webp", name: "FuzionX", w: 165, h: 28, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "gradium.webp", name: "Gradium", w: 60, h: 60, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "jca.webp", name: "JC&A", w: 110, h: 42, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "kaleidoscope.webp", name: "Kaleidoscope", w: 53, h: 60, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "misneach.webp", name: "Misneach", w: 147, h: 31, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "northeastern-sga.webp", name: "Northeastern SGA", w: 77, h: 60, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "partiful.webp", name: "Partiful", w: 53, h: 60, size: "100.00% 101.01%", pos: "0.0% 0.0%" },
  { file: "ssojet.webp", name: "SSOJet", w: 142, h: 32, size: "154.80% 188.44%", pos: "97.7% 52.3%" },
  { file: "tavily.webp", name: "Tavily", w: 123, h: 37, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "team-impact.webp", name: "Team IMPACT", w: 52, h: 60, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "techcxo.webp", name: "TechCXO", w: 126, h: 36, size: "100.00% 100.00%", pos: "0.0% 0.0%" },
  { file: "within3.webp", name: "Within3", w: 149, h: 31, size: "100.29% 180.28%", pos: "0.0% 50.9%" },
];

type Sponsor = (typeof SPONSORS)[number];

/** One sponsor logo: the white file drawn as a mask in soft Sprout green (full green on hover, canvas.css).
 *  Used by both the top strip and the bottom row, so adding to SPONSORS updates both. */
function SponsorLogo({ sponsor: s, scale = 1, role }: { sponsor: Sponsor; scale?: number; role?: string }) {
  const logo = (
    <span
      className="cv-sponsor"
      role="img"
      aria-label={s.name}
      title={s.name}
      style={{ "--src": `url(/sponsors/${s.file})`, "--w": `${s.w * scale}px`, "--h": `${s.h * scale}px`, "--msize": s.size, "--mpos": s.pos } as CSSProperties}
    />
  );
  // In the strip each logo is a list item; the wrapper keeps the img role on the logo itself.
  return role ? <span role={role} className="cv-sponsor-item">{logo}</span> : logo;
}

/** A founder's photo through next/image (resized and lazy-loaded, so big PNGs stay fast), filling the
 *  square box. Falls back to the initials when there's no photo path or the file fails to load. */
function TeamPhoto({ src, name, initials }: { src?: string | null; name: string; initials: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{initials}</>;
  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="(max-width: 600px) 90vw, (max-width: 1100px) 45vw, 280px"
      style={{ objectFit: "cover", objectPosition: "50% 30%" }}
      onError={() => setFailed(true)}
    />
  );
}

// Strip speed: the old placeholder strip moved ~33px/s; keep that pace for however many logos there are.
const MARQUEE_GAP = 40;
const MARQUEE_SECONDS = Math.round(SPONSORS.reduce((a, sp) => a + sp.w * 0.75 + MARQUEE_GAP, 0) / 33);

export default function CanvasScreen(props: Record<string, unknown>) {
  const v = useLogic(Logic, props);
  // App change: a signed-in visitor can stay on the landing page. The nav's "Log in" becomes
  // "Dashboard" (their ideas). The Supabase session only loads once something asks for it.
  const session = useSession();
  useEffect(() => {
    Session.ready().catch(() => {});
  }, []);
  if (!v) return <div className="pg-cv" />;
  const { aboutCopy, ann, barOn, barOp, barPe, barY, burst, cards, dismiss, edges, evidence, feed, feedCount, footerCols, gCaption, gDot, grid, h1a, h1b, h1c, leaves, navOp, navPe, navY, pillars, pills, progress, pulseOp, pulseR, sproutBright, sproutScale, stepLabel, stepNum, tabs, team } = v;
  return (
    <div className="pg-cv">
      <header style={{ position: "sticky", top: "0", zIndex: "50", opacity: `${navOp ?? ""}`, transform: `translateY(${navY ?? ""})`, transition: "opacity .12s linear,transform .12s linear", pointerEvents: `${navPe ?? ""}` } as CSSProperties}>
        {ann ? (
          <>
            <div style={{ height: "44px", background: "#0F2E20", color: "#F2F5F3", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 48px 0 20px" }}>
              <span style={{ whiteSpace: "nowrap" }}>
                <Link href="/map" style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  Try a Demo →
                </Link>
              </span>
              <button className="cv-hover0" aria-label="Dismiss" onClick={dismiss} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "32px", height: "32px", border: "none", background: "transparent", color: "#9AA8A1", fontSize: "18px", cursor: "pointer", borderRadius: "999px" }}>
                ×
              </button>
            </div>
          </>
        ) : null}
        <nav aria-label="Primary" style={{ height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(20px,4vw,40px)", color: "#000" }}>
          <a href="#top" aria-label="Sprout home" style={{ display: "block", width: "100px", height: "28px" }}>
            {" "}
            <svg viewBox="0 0 200 56" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }}>
              <g fill="none" stroke="#000" strokeWidth="3.2" strokeLinecap="round">
                <path d="M24 46 V30" />
                <path d="M24 30 L15.5 20.5" />
                <path d="M24 30 L33.5 18.5" />
              </g>
              <circle cx="24" cy="48.5" r="4.6" fill="#000" />
              <circle cx="12.5" cy="16.5" r="6.2" fill="#2E9E5B" />
              <circle cx="36" cy="14" r="7.6" fill="#2E9E5B" />
              <text x="58" y="41" fill="#000" fontSize="34" fontWeight="600" letterSpacing="-0.5" fontFamily="Geist, system-ui, sans-serif">
                sprout
              </text>
            </svg>
            {" "}
          </a>
          <div data-nav-links="1" style={{ display: "flex", gap: "28px", fontSize: "14px", fontWeight: "500" }}>
            <a className="cv-hover1" href="#how" style={{ color: "#4A5E53", padding: "6px 0", transition: "color .2s", whiteSpace: "nowrap", flex: "none" }}>
              How it works
            </a>
            <a className="cv-hover1" href="#about" style={{ color: "#4A5E53", padding: "6px 0", transition: "color .2s", whiteSpace: "nowrap", flex: "none" }}>
              About Us
            </a>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {session ? (
              // Avatar chip: the same initial circle + name the ideas page header uses, so a
              // signed-in visitor recognises themselves at a glance. Links to their ideas.
              <Link className="cv-hover2 cv-dash" href="/sessions" aria-label={`${session.name}: your ideas`} title="Your ideas" style={{ display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", flex: "none", minHeight: "40px", padding: "0 16px 0 6px", borderRadius: "999px", border: "1px solid #0F2E20", color: "#0F2E20", fontSize: "14px", fontWeight: "500", transition: "transform .2s,box-shadow .2s" }}>
                <span aria-hidden="true" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#2E9E5B", color: "#0F2E20", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", flex: "none" }}>
                  {(session.name || "G").charAt(0).toUpperCase()}
                </span>
                {(session.name || "").split(/\s+/)[0]}
              </Link>
            ) : (
              <Link className="cv-hover2" href="/login" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", minHeight: "40px", padding: "0 18px", borderRadius: "999px", border: "1px solid #0F2E20", color: "#0F2E20", fontSize: "14px", fontWeight: "500", transition: "transform .2s,box-shadow .2s" }}>
                Log in
              </Link>
            )}
            <Link className="cv-hover3" href="/map" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", minHeight: "40px", padding: "0 18px", borderRadius: "999px", background: "#0F2E20", color: "#F2F5F3", fontSize: "14px", fontWeight: "600", transition: "transform .2s,box-shadow .2s" }}>
              Demo
            </Link>
          </div>
        </nav>
      </header>
      <section id="hero" data-sec="1" style={{ position: "relative", padding: "80px 20px 0", background: "radial-gradient(ellipse 60% 50% at 50% 30%,#2E9E5B12,transparent 70%)", overflow: "visible", zIndex: "1" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "24px" }}>
          <h1 style={{ margin: "0", fontWeight: "600", letterSpacing: "-.03em", lineHeight: "1.02", textWrap: "balance" }}>
            {" "}
            <span style={{ display: "block", fontSize: "clamp(26px,3.4vw,44px)", color: "#4A5E53", fontWeight: "500", marginBottom: "10px" }}>
              {h1a}
            </span>
            {" "}
            <span style={{ display: "block", fontSize: "clamp(44px,7.2vw,92px)", color: "#0F2E20" }}>
              {h1b}{" "}
              <span onMouseEnter={burst} data-breathe="1" style={{ position: "relative", display: "inline-block", color: "#2E9E5B", cursor: "default", animation: "cv-breathe 4.5s ease-in-out infinite", transform: `scale(${sproutScale ?? ""})`, filter: `brightness(${sproutBright ?? ""})`, transition: "transform .6s cubic-bezier(.22,1.4,.36,1),filter .6s ease,color .6s ease" } as CSSProperties}>
                {h1c}
                <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: "0", height: "0", pointerEvents: "none" }}>
                  {" "}
                  {(leaves ?? []).map((lf: any, $index: number) => (
                    <Fragment key={$index}>
                      <span style={{ position: "absolute", left: "0", top: "0", width: "12px", height: "12px", margin: "-6px 0 0 -6px", borderRadius: "12px 0", background: `${lf?.c ?? ""}`, transform: `translate(${lf?.x ?? ""},${lf?.y ?? ""}) rotate(${lf?.r ?? ""}) scale(${lf?.s ?? ""})`, opacity: `${lf?.op ?? ""}`, transition: `${lf?.tr ?? ""}` } as CSSProperties} />
                    </Fragment>
                  ))}
                  {" "}
                </span>
              </span>
            </span>
            {" "}
          </h1>
          <p style={{ margin: "0", maxWidth: "50ch", fontSize: "clamp(16px,1.6vw,19px)", lineHeight: "1.5", color: "#4A5E53", textWrap: "pretty" }}>
            Describe your startup idea in a sentence. Sprout researches it, scores eight pillars, and pressure-tests every assumption until the map tells the truth.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
            <Link className="cv-hover4" href="/map" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", gap: "8px", minHeight: "48px", padding: "0 24px", borderRadius: "999px", background: "#0F2E20", color: "#F2F5F3", fontSize: "15px", fontWeight: "600", transition: "transform .2s,box-shadow .2s" }}>
              {"Try your idea "}
              <span aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="cv-hover5" href="/map" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", minHeight: "48px", padding: "0 20px", borderRadius: "999px", color: "#4A5E53", fontSize: "15px", fontWeight: "500", transition: "color .2s" }}>
              See a worked example
            </Link>
          </div>
        </div>
        {" "}
        <div id="map-slot" aria-hidden="true" style={{ position: "relative", width: "min(1320px,92vw)", margin: "72px auto -64px", display: "grid", gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)", gap: "240px", alignItems: "end", zIndex: "2", pointerEvents: "none", userSelect: "none" }}>
          <div data-bob="1" style={{ display: "flex", flexDirection: "column", minWidth: "0", background: "#fff", border: "1px solid #B9D4C4", borderBottom: "none", borderRadius: "16px 16px 0 0", boxShadow: "0 24px 64px #0F2E2024,0 4px 12px #0F2E2012", overflow: "hidden", animation: "cv-bob 6s ease-in-out infinite" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "44px", padding: "0 14px 0 16px", borderBottom: "1px solid #E6ECE8", background: "#F5F7F2", flex: "none" }}>
              <div style={{ display: "flex", gap: "6px", flex: "none" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#DDE3DC" }} />
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#DDE3DC" }} />
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#DDE3DC" }} />
              </div>
              <div style={{ flex: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "#0F2E20", whiteSpace: "nowrap", overflow: "hidden" }}>
                <span>
                  {stepLabel}
                </span>
                <span style={{ color: "#4A5E53", flex: "none" }}>
                  {stepNum}
                </span>
              </div>
              <div style={{ width: "96px", height: "3px", borderRadius: "2px", background: "#DDE3DC", overflow: "hidden", flex: "none" }}>
                <div style={{ height: "100%", width: `${progress ?? ""}`, background: "#2E9E5B", transition: "width 1.6s cubic-bezier(.22,1,.36,1)" } as CSSProperties} />
              </div>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "1120/560", backgroundImage: "linear-gradient(#0F2E2009 1px,transparent 1px),linear-gradient(90deg,#0F2E2009 1px,transparent 1px)", backgroundSize: "24px 24px" }}>
              {" "}
              <svg viewBox="0 40 1120 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" }} fontFamily="Geist, system-ui, sans-serif">
                <g fill="none" stroke="#B9D4C4" strokeWidth="1" strokeDasharray="2 6" opacity=".8">
                  <circle cx="370" cy="350" r="120" />
                  <circle cx="370" cy="350" r="205" />
                  <circle cx="370" cy="350" r="290" />
                </g>
                <g fill="none" stroke="#2E9E5B" strokeWidth="1.2" strokeLinecap="round">
                  {(edges ?? []).map((e: any, $index: number) => (
                    <Fragment key={$index}>
                      <path d={e?.d} pathLength="1" strokeDasharray="1" strokeDashoffset={e?.off} style={{ opacity: `${e?.op ?? ""}`, transition: `stroke-dashoffset .9s cubic-bezier(.22,1,.36,1) ${e?.delay ?? ""},opacity .5s ease ${e?.delay ?? ""}` } as CSSProperties} />
                    </Fragment>
                  ))}
                </g>
                <g>
                  <circle cx="370" cy="350" r="46" fill="none" stroke="#B9D4C4" strokeWidth="1" />
                  <circle cx="370" cy="350" r={pulseR} fill="none" stroke="#2E9E5B" strokeWidth="1.5" style={{ opacity: `${pulseOp ?? ""}`, transition: "r 1.2s ease-out,opacity 1.2s ease-out" } as CSSProperties} />
                  <g data-drift="1" style={{ animation: "cv-drift 7s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center" }}>
                    <circle cx="370" cy="350" r="30" fill="#0F2E20" />
                    <text x="370" y="350" textAnchor="middle" dominantBaseline="central" fill="#F2F5F3" fontSize="24" fontWeight="700">
                      P
                    </text>
                  </g>
                </g>
                {(pillars ?? []).map((p: any, $index: number) => (
                  <Fragment key={$index}>
                    <g transform={`translate(${p?.x ?? ""} ${p?.y ?? ""})`} style={{ opacity: `${p?.op ?? ""}`, transformBox: "fill-box", transformOrigin: "center", transition: `opacity .5s ease ${p?.delay ?? ""}` } as CSSProperties}>
                      <g style={{ transform: `scale(${p?.scale ?? ""})`, transition: `transform .7s cubic-bezier(.22,1.4,.36,1) ${p?.delay ?? ""}` } as CSSProperties}>
                        <g data-drift="1" style={{ animation: `cv-drift ${p?.dur ?? ""} ease-in-out infinite`, animationDelay: `${p?.phaseDelay ?? ""}`, transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}>
                          <circle r="42" fill="#fff" stroke={p?.stroke} strokeWidth={p?.sw} style={{ transition: "stroke .6s,stroke-width .6s" }} />
                          <circle r="38" fill="none" stroke="#DDE3DC" strokeWidth="2" />
                          <circle r="38" fill="none" stroke={p?.color} strokeWidth="2" strokeLinecap="round" strokeDasharray="238.76" strokeDashoffset={p?.offset} transform="rotate(-90)" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1),stroke .8s ease" }} />
                          <foreignObject x="-40" y="-16" width="80" height="32" style={{ overflow: "visible" }}>
                            <div style={{ width: "80px", height: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: "1.1", fontFamily: "Geist,system-ui,sans-serif" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#000" }}>
                                {p?.name}
                              </div>
                              <div style={{ fontSize: "11px", fontFamily: "'Geist Mono',monospace", color: `${p?.color ?? ""}`, transition: "color .8s ease" } as CSSProperties}>
                                {p?.pct}%
                              </div>
                            </div>
                          </foreignObject>
                          <rect x="22" y="-42" width="20" height="16" rx="8" fill="#F5F7F2" stroke="#B9D4C4" />
                          <foreignObject x="22" y="-42" width="20" height="16" style={{ overflow: "visible" }}>
                            <div style={{ width: "20px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontFamily: "'Geist Mono',monospace", color: "#4A5E53" }}>
                              {p?.count}
                            </div>
                          </foreignObject>
                        </g>
                      </g>
                    </g>
                  </Fragment>
                ))}
                {(pills ?? []).map((c: any, $index: number) => (
                  <Fragment key={$index}>
                    <g transform={`translate(${c?.x ?? ""} ${c?.y ?? ""})`} style={{ opacity: `${c?.op ?? ""}`, transition: `opacity .5s ease ${c?.delay ?? ""}` } as CSSProperties}>
                      <g style={{ transform: `translateX(${c?.slide ?? ""})`, transition: `transform .8s cubic-bezier(.22,1.3,.36,1) ${c?.delay ?? ""}` } as CSSProperties}>
                        <g data-drift="1" style={{ animation: `cv-drift ${c?.dur ?? ""} ease-in-out infinite`, animationDelay: `${c?.phaseDelay ?? ""}`, transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}>
                          <rect x="-88" y="-17" width="176" height="34" rx="17" fill={c?.fill} stroke={c?.stroke} style={{ transition: "fill .6s,stroke .6s" }} />
                          <circle cx="-72" cy="0" r="4" fill={c?.dot} style={{ transition: "fill .6s" }} />
                          <foreignObject x="-60" y="-17" width="136" height="34" style={{ overflow: "visible" }}>
                            <div style={{ width: "136px", height: "34px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontFamily: "Geist,system-ui,sans-serif", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: "12px", fontWeight: "500", color: "#000" }}>
                                {c?.label}
                              </span>
                              <span style={{ fontSize: "10px", fontFamily: "'Geist Mono',monospace", color: "#4A5E53" }}>
                                {c?.ev}
                              </span>
                            </div>
                          </foreignObject>
                        </g>
                      </g>
                    </g>
                  </Fragment>
                ))}
                {(cards ?? []).map((k: any, $index: number) => (
                  <Fragment key={$index}>
                    <g transform={`translate(${k?.x ?? ""} ${k?.y ?? ""})`} style={{ opacity: `${k?.op ?? ""}`, transition: `opacity .6s ease ${k?.delay ?? ""}` } as CSSProperties}>
                      <g style={{ transform: `translateX(${k?.slide ?? ""})`, transition: `transform .9s cubic-bezier(.22,1.3,.36,1) ${k?.delay ?? ""}` } as CSSProperties}>
                        <g data-drift="1" style={{ animation: `cv-drift ${k?.dur ?? ""} ease-in-out infinite`, animationDelay: `${k?.phaseDelay ?? ""}`, transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}>
                          <rect x="0" y="-32" width="228" height="64" rx="10" fill="#fff" stroke={k?.stroke} style={{ transition: "stroke .6s" }} />
                          <rect x="0" y="-32" width="3" height="64" rx="1.5" fill={k?.accent} />
                          <foreignObject x="14" y="-26" width="206" height="52" style={{ overflow: "visible" }}>
                            <div style={{ width: "206px", height: "52px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "3px", fontFamily: "Geist,system-ui,sans-serif", whiteSpace: "nowrap", overflow: "hidden" }}>
                              <div style={{ fontSize: "11.5px", color: "#000", textOverflow: "ellipsis", overflow: "hidden" }}>
                                {k?.l1}
                              </div>
                              <div style={{ fontSize: "11px", color: "#4A5E53", textOverflow: "ellipsis", overflow: "hidden" }}>
                                {k?.l2}
                              </div>
                              <div style={{ fontSize: "9px", letterSpacing: "1px", fontFamily: "'Geist Mono',monospace", color: "#4A5E53" }}>
                                {k?.tag}
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      </g>
                    </g>
                  </Fragment>
                ))}
              </svg>
              {" "}
              <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "96px", background: "linear-gradient(180deg,#fff0,#fff)" }} />
              {" "}
            </div>
            <div style={{ height: "64px", flex: "none", background: "#fff" }} />
          </div>
          <div data-bob="1" style={{ display: "flex", flexDirection: "column", minWidth: "0", background: "#fff", border: "1px solid #B9D4C4", borderBottom: "none", borderRadius: "16px 16px 0 0", boxShadow: "0 24px 64px #0F2E2024,0 4px 12px #0F2E2012", overflow: "hidden", animation: "cv-bob 7s ease-in-out infinite", animationDelay: "-2.5s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", height: "44px", padding: "0 16px", borderBottom: "1px solid #E6ECE8", background: "#F5F7F2", flex: "none" }}>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".12em", textTransform: "uppercase", color: "#0F2E20", whiteSpace: "nowrap" }}>
                Research
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "22px", padding: "0 9px", borderRadius: "999px", background: "#fff", border: "1px solid #B9D4C4", fontFamily: "'Geist Mono',monospace", fontSize: "10px", letterSpacing: ".08em", color: "#2E9E5B", whiteSpace: "nowrap" }}>
                <span data-drift="1" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2E9E5B", animation: "cv-drift 1.4s ease-in-out infinite" }} />
                <span>{feedCount}</span>{" SOURCES"}
              </div>
            </div>
            <div style={{ position: "relative", padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "-.01em", lineHeight: "1.3", color: "#000", textWrap: "balance" }}>
                Is there a real appetite for student meal kits?
              </div>
              <div style={{ position: "relative", height: "208px", overflow: "hidden" }}>
                {" "}
                {(feed ?? []).map((e: any, $index: number) => (
                  <Fragment key={$index}>
                    {" "}
                    <div style={{ position: "absolute", left: "0", right: "0", top: "0", display: "flex", gap: "12px", alignItems: "flex-start", transform: `translateY(${e?.y ?? ""})`, opacity: `${e?.op ?? ""}`, transition: "transform .9s cubic-bezier(.22,1,.36,1),opacity .6s ease" } as CSSProperties}>
                      <span style={{ width: "3px", alignSelf: "stretch", borderRadius: "2px", background: `${e?.accent ?? ""}`, flex: "none" } as CSSProperties} />
                      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div style={{ fontSize: "12px", lineHeight: "1.35", color: "#000", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e?.l1}
                        </div>
                        <div style={{ height: "6px", borderRadius: "3px", background: "#E6ECE8", width: `${e?.w1 ?? ""}` } as CSSProperties} />
                        <div style={{ height: "6px", borderRadius: "3px", background: "#E6ECE8", width: `${e?.w2 ?? ""}` } as CSSProperties} />
                      </div>
                      <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "9px", letterSpacing: ".1em", color: `${e?.accent ?? ""}`, flex: "none", paddingTop: "2px" } as CSSProperties}>
                        {e?.tag}
                      </span>
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "72px", background: "linear-gradient(180deg,#fff0,#fff)" }} />
            </div>
            <div style={{ height: "64px", flex: "none", background: "#fff" }} />
          </div>
        </div>
      </section>
      <section data-sec="1" style={{ background: "#fff", color: "#000", padding: "40px 20px 44px", marginTop: "0", position: "relative", zIndex: "2", borderRadius: "28px 28px 0 0", boxShadow: "0 -16px 40px -8px #0F2E201A,0 1px 0 #DDE3DC inset", clipPath: "inset(-80px 0 0 0)" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#4A5E53" }}>
            HACK1984 Sponsors
          </div>
          {/* Auto-scrolling strip. Two copies of the list slide left by exactly one copy (50%) for a seamless loop;
              the second copy is aria-hidden so each sponsor is announced once. Keeps moving on hover; with reduced
              motion it stops and wraps (canvas.css .cv-marquee). Faded edges as in the design. */}
          <div className="cv-marquee" style={{ width: "100%", maxWidth: "1120px", overflow: "hidden", maskImage: "linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)" }}>
            <div data-marquee="1" className="cv-marquee-track" style={{ "--cv-loop": `${MARQUEE_SECONDS}s` } as CSSProperties}>
              <div className="cv-marquee-copy" role="list" aria-label="Sponsors">
                {SPONSORS.map((sp) => (
                  <SponsorLogo key={sp.file} sponsor={sp} scale={0.75} role="listitem" />
                ))}
              </div>
              <div className="cv-marquee-copy" aria-hidden="true">
                {SPONSORS.map((sp) => (
                  <SponsorLogo key={sp.file} sponsor={sp} scale={0.75} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="how" data-sec="1" style={{ background: "#fff", color: "#000", padding: "72px 20px 144px", position: "relative", zIndex: "1" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {" "}
          <h2 style={{ margin: "0 0 64px", fontWeight: "600", letterSpacing: "-.025em", lineHeight: "1.1", fontSize: "clamp(30px,4vw,48px)", textWrap: "balance" }}>
            <span style={{ color: "#4A5E53" }}>
              Three steps.
            </span>
            {" "}
            <span style={{ color: "#0F2E20" }}>
              One living map.
            </span>
          </h2>
          {" "}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <svg viewBox="0 0 280 120" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}>
                <rect x="20" y="42" width="240" height="36" rx="18" fill="#fff" stroke="#B9D4C4" />
                <text x="38" y="64" fontSize="11" fill="#4A5E53" fontFamily="Geist, system-ui, sans-serif" textLength="196" lengthAdjust="spacingAndGlyphs">
                  An $8/month meal planner for students
                </text>
                <rect x="238" y="53" width="1.5" height="14" fill="#0F2E20" />
              </svg>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", color: "#4A5E53", letterSpacing: ".1em" }}>
                01
              </div>
              <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "600", color: "#0F2E20" }}>
                Describe your idea
              </h3>
              <p style={{ margin: "0", color: "#4A5E53", lineHeight: "1.55", fontSize: "15px", textWrap: "pretty" }}>
                One sentence is enough. Sprout reads it the way a sharp mentor would.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <svg viewBox="0 0 280 120" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}>
                <g fill="none" stroke="#2E9E5B" opacity=".6">
                  <path d="M140 60 C120 60 110 30 80 30" />
                  <path d="M140 60 C160 60 170 30 200 30" />
                  <path d="M140 60 C120 60 110 90 80 90" />
                  <path d="M140 60 C160 60 170 90 200 90" />
                  <path d="M140 60 C140 40 140 30 140 22" />
                  <path d="M140 60 C140 80 140 90 140 98" />
                </g>
                <circle cx="140" cy="60" r="12" fill="#0F2E20" />
                <g fill="#fff" stroke="#B9D4C4">
                  <circle cx="80" cy="30" r="12" />
                  <circle cx="200" cy="30" r="12" />
                  <circle cx="80" cy="90" r="12" />
                  <circle cx="200" cy="90" r="12" />
                  <circle cx="140" cy="22" r="10" />
                  <circle cx="140" cy="98" r="10" />
                </g>
                <g fill="none" strokeWidth="2" strokeLinecap="round">
                  <circle cx="80" cy="30" r="12" stroke="#4CC27E" strokeDasharray="60 75.4" transform="rotate(-90 80 30)" />
                  <circle cx="200" cy="30" r="12" stroke="#F2B441" strokeDasharray="40 75.4" transform="rotate(-90 200 30)" />
                  <circle cx="80" cy="90" r="12" stroke="#4CC27E" strokeDasharray="66 75.4" transform="rotate(-90 80 90)" />
                  <circle cx="200" cy="90" r="12" stroke="#F26D6D" strokeDasharray="28 75.4" transform="rotate(-90 200 90)" />
                </g>
              </svg>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", color: "#4A5E53", letterSpacing: ".1em" }}>
                02
              </div>
              <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "600", color: "#0F2E20" }}>
                It builds the map
              </h3>
              <p style={{ margin: "0", color: "#4A5E53", lineHeight: "1.55", fontSize: "15px", textWrap: "pretty" }}>
                Eight pillars, researched and scored. Every number has a source behind it.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <svg viewBox="0 0 280 120" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}>
                <circle cx="70" cy="60" r="22" fill="#fff" stroke="#B9D4C4" />
                <circle cx="70" cy="60" r="18" fill="none" stroke="#DDE3DC" strokeWidth="2" />
                <circle cx="70" cy="60" r="18" fill="none" stroke="#F26D6D" strokeWidth="2" strokeLinecap="round" strokeDasharray="44 113" transform="rotate(-90 70 60)" />
                <text x="70" y="64" textAnchor="middle" fontSize="11" fill="#4A5E53" fontFamily="'Geist Mono', monospace">
                  39
                </text>
                <path d="M92 60 C120 60 130 40 160 40" fill="none" stroke="#2E9E5B" opacity=".6" />
                <path d="M92 60 C120 60 130 80 160 80" fill="none" stroke="#2E9E5B" opacity=".6" />
                <rect x="160" y="26" width="100" height="28" rx="6" fill="#fff" stroke="#B9D4C4" />
                <rect x="160" y="26" width="3" height="28" rx="1.5" fill="#4CC27E" />
                <rect x="172" y="36" width="60" height="6" rx="3" fill="#DDE3DC" />
                <rect x="160" y="66" width="100" height="28" rx="6" fill="#fff" stroke="#B9D4C4" />
                <rect x="160" y="66" width="3" height="28" rx="1.5" fill="#F26D6D" />
                <rect x="172" y="76" width="72" height="6" rx="3" fill="#DDE3DC" />
              </svg>
              <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", color: "#4A5E53", letterSpacing: ".1em" }}>
                03
              </div>
              <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "600", color: "#0F2E20" }}>
                Pressure-test it
              </h3>
              <p style={{ margin: "0", color: "#4A5E53", lineHeight: "1.55", fontSize: "15px", textWrap: "pretty" }}>
                Every challenge moves the map, with receipts. Watch the pillars rise or fall.
              </p>
            </div>
          </div>
          {" "}
        </div>
      </section>
      <section id="slab-a" data-sec="1" style={{ background: "transparent", color: "#000", padding: "120px 20px" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "56px", alignItems: "center" }}>
          <div style={{ maxWidth: "46ch" }}>
            {" "}
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "#4A5E53", marginBottom: "16px" }}>
              Research
            </div>
            {" "}
            <h2 style={{ margin: "0 0 20px", fontWeight: "600", letterSpacing: "-.025em", lineHeight: "1.1", fontSize: "clamp(28px,3.6vw,44px)", textWrap: "balance" }}>
              <span style={{ color: "#4A5E53" }}>
                Every change
              </span>
              {" "}
              <span style={{ color: "#0F2E20" }}>
                traces to a source.
              </span>
            </h2>
            {" "}
            <p style={{ margin: "0", color: "#4A5E53", lineHeight: "1.6", fontSize: "17px", textWrap: "pretty" }}>
              {"Each pillar's score is the sum of evidence for and against it. Open any node and read exactly what moved it, where it came from, and when."}
            </p>
            {" "}
          </div>
          <div id="slab-a-card" style={{ height: "396px", border: "1px solid #B9D4C4", borderRadius: "16px", background: "#F5F7F2", boxShadow: "0 30px 80px #0F2E2014,0 4px 12px #0F2E200A", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
            {(evidence ?? []).map((ev: any, $index: number) => (
              <Fragment key={$index}>
                <div style={{ flex: "1", minHeight: "0", border: "1px solid #DDE3DC", borderLeft: `3px solid ${ev?.accent ?? ""}`, borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px", background: "#fff" } as CSSProperties}>
                  <div style={{ position: "relative", height: "20px", fontSize: "14px", lineHeight: "20px", color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ opacity: `${ev?.textOp ?? ""}`, transition: `opacity .5s ease ${ev?.d1 ?? ""}` } as CSSProperties}>
                      {ev?.l1}
                    </span>
                    <span style={{ position: "absolute", left: "0", top: "4px", height: "12px", width: `${ev?.w1 ?? ""}`, borderRadius: "6px", background: "#DDE3DC", transform: `scaleX(${ev?.sk ?? ""})`, transformOrigin: "left", transition: `transform .7s cubic-bezier(.22,1,.36,1) ${ev?.d1 ?? ""}` } as CSSProperties} />
                  </div>
                  <div style={{ position: "relative", height: "18px", fontSize: "13px", lineHeight: "18px", color: "#4A5E53", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ opacity: `${ev?.textOp ?? ""}`, transition: `opacity .5s ease ${ev?.d2 ?? ""}` } as CSSProperties}>
                      {ev?.l2}
                    </span>
                    <span style={{ position: "absolute", left: "0", top: "3px", height: "12px", width: `${ev?.w2 ?? ""}`, borderRadius: "6px", background: "#DDE3DC", transform: `scaleX(${ev?.sk ?? ""})`, transformOrigin: "left", transition: `transform .7s cubic-bezier(.22,1,.36,1) ${ev?.d2 ?? ""}` } as CSSProperties} />
                  </div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "10px", letterSpacing: ".12em", color: "#4A5E53" }}>
                    {ev?.tag}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <section id="slab-b" data-sec="1" style={{ background: "#fff", color: "#000", padding: "120px 20px", marginTop: "-24px", position: "relative", borderRadius: "28px 28px 0 0", boxShadow: "0 -16px 40px -8px #0F2E2014,0 1px 0 #DDE3DC inset" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "56px", alignItems: "center" }}>
          <div style={{ order: "2", maxWidth: "46ch" }}>
            {" "}
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "#4A5E53", marginBottom: "16px" }}>
              Challenge
            </div>
            {" "}
            <h2 style={{ margin: "0 0 20px", fontWeight: "600", letterSpacing: "-.025em", lineHeight: "1.1", fontSize: "clamp(28px,3.6vw,44px)", textWrap: "balance" }}>
              <span style={{ color: "#4A5E53" }}>
                Eight pillars.
              </span>
              {" "}
              <span style={{ color: "#0F2E20" }}>
                Every idea, same map.
              </span>
            </h2>
            {" "}
            <p style={{ margin: "0", color: "#4A5E53", lineHeight: "1.6", fontSize: "17px", textWrap: "pretty" }}>
              Customer, problem, solution, approach, edge, reach, revenue, risks. The same eight questions a partner asks, scored the same way every time.
            </p>
            {" "}
          </div>
          <div style={{ order: "1", minWidth: "0", height: "396px", border: "1px solid #B9D4C4", borderRadius: "16px", background: "#fff", boxShadow: "0 30px 80px #0F2E2014,0 4px 12px #0F2E200A", display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", padding: "20px 0", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "18px 8px", padding: "0 20px" }}>
              {(grid ?? []).map((p: any, $index: number) => (
                <Fragment key={$index}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "0", transform: `scale(${p?.gScale ?? ""})`, opacity: `${p?.gOp ?? ""}`, transition: "transform .5s cubic-bezier(.22,1.3,.36,1),opacity .5s" } as CSSProperties}>
                    <div style={{ position: "relative", width: "76px", height: "76px" }}>
                      {" "}
                      <svg viewBox="0 0 84 84" aria-hidden="true" style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}>
                        <circle cx="42" cy="42" r="40" fill="#F5F7F2" stroke={p?.gStroke} style={{ transition: "stroke .5s" }} />
                        <circle cx="42" cy="42" r="35" fill="none" stroke="#DDE3DC" strokeWidth="2.5" />
                        <circle cx="42" cy="42" r="35" fill="none" stroke={p?.gColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="219.9" strokeDashoffset={p?.gOffset} transform="rotate(-90 42 42)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1),stroke .6s" }} />
                      </svg>
                      {" "}
                      <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Geist Mono',monospace", color: "#000" }}>
                        {p?.gPct}
                      </div>
                      {" "}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#000", whiteSpace: "nowrap" }}>
                      {p?.name}
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "0 20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", maxWidth: "100%", padding: "6px 12px", borderRadius: "999px", background: "#F5F7F2", border: "1px solid #B9D4C4", fontFamily: "'Geist Mono',monospace", fontSize: "11px", color: "#4A5E53", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ width: "6px", height: "6px", flex: "none", borderRadius: "50%", background: `${gDot ?? ""}`, transition: "background .5s" } as CSSProperties} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {gCaption}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 22px", fontFamily: "'Geist Mono',monospace", fontSize: "11px", letterSpacing: ".06em", color: "#4A5E53", padding: "0 20px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4CC27E" }} />
                ≥ 70 validated
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F2B441" }} />
                45–69 uncertain
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F26D6D" }} />
                {"< 45 failing"}
              </span>
            </div>
          </div>
        </div>
      </section>
      <section id="founders" data-sec="1" style={{ background: "transparent", color: "#000", padding: "120px 20px" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "20px", alignItems: "stretch" }}>
          <div style={{ border: "1px solid #B9D4C4", borderRadius: "20px", background: "#F5F7F2", padding: "clamp(28px,4vw,48px)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "#4A5E53" }}>
              For founders
            </div>
            <h2 style={{ margin: "0", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.15", fontSize: "clamp(26px,3vw,36px)", textWrap: "balance", color: "#0F2E20" }}>
              {"Find out what's wrong before anyone else does."}
            </h2>
            <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", color: "#4A5E53", fontSize: "16px", lineHeight: "1.5", flex: "1" }}>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  01
                </span>
                A researched map of your idea in one session
              </li>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  02
                </span>
                Challenges with sources, not opinions
              </li>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  03
                </span>
                A history of every pivot, week by week
              </li>
            </ul>
            <Link className="cv-hover4" href="/map" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", gap: "8px", minHeight: "44px", padding: "0 22px", borderRadius: "999px", background: "#0F2E20", color: "#F2F5F3", fontSize: "15px", fontWeight: "600", transition: "transform .2s,box-shadow .2s" }}>
              {"Start free "}
              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
          <div id="accelerators" data-ground="dark" style={{ border: "1px solid #0F2E20", borderRadius: "20px", backgroundColor: "#0F2E20", backgroundImage: "linear-gradient(#FFFFFF0A 1px,transparent 1px),linear-gradient(90deg,#FFFFFF0A 1px,transparent 1px)", backgroundSize: "24px 24px", color: "#F2F5F3", padding: "clamp(28px,4vw,48px)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", letterSpacing: ".14em", textTransform: "uppercase", color: "#B9D4C4" }}>
              For accelerators
            </div>
            <h2 style={{ margin: "0", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.15", fontSize: "clamp(26px,3vw,36px)", textWrap: "balance" }}>
              {"Run a cohort's worth of office hours, every day."}
            </h2>
            <ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", color: "#B9D4C4", fontSize: "16px", lineHeight: "1.5", flex: "1" }}>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  01
                </span>
                {"One dashboard across every team's map"}
              </li>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  02
                </span>
                Mentors see what moved since last week, with receipts
              </li>
              <li style={{ display: "flex", gap: "12px" }}>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: "12px", paddingTop: "4px" }}>
                  03
                </span>
                Per-seat pricing for programs and university centers
              </li>
            </ul>
            <a className="cv-hover6" href="#about" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", gap: "8px", minHeight: "44px", padding: "0 22px", borderRadius: "999px", background: "#F2F5F3", color: "#0F2E20", fontSize: "15px", fontWeight: "600", transition: "transform .2s,box-shadow .2s" }}>
              {"Talk to us "}
              <span aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>
      </section>
      <section id="about" data-sec="1" style={{ background: "#fff", color: "#000", padding: "120px 20px", marginTop: "-24px", position: "relative", borderRadius: "28px 28px 0 0", boxShadow: "0 -16px 40px -8px #0F2E2014,0 1px 0 #DDE3DC inset" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "64px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "24px" }}>
            <h2 style={{ margin: "0", fontWeight: "600", letterSpacing: "-.025em", lineHeight: "1.1", fontSize: "clamp(30px,4vw,48px)", textWrap: "balance" }}>
              <span style={{ color: "#4A5E53" }}>
                Built by founders
              </span>
              {" "}
              <span style={{ color: "#0F2E20" }}>
                who got the feedback too late.
              </span>
            </h2>
            <p style={{ margin: "0", maxWidth: "60ch", fontSize: "18px", lineHeight: "1.6", color: "#4A5E53", textWrap: "pretty" }}>
              {aboutCopy}
            </p>
          </div>
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "20px", alignItems: "stretch" }}>
            {(team ?? []).map((m: any) => (
              <Fragment key={m?.name}>
                <div style={{ border: "1px solid #B9D4C4", borderRadius: "16px", background: "#fff", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "100%" }}>
                  {/* Photo box: the person's photo (logic.js team[].photo), or their initials if there's none. */}
                  <div style={{ position: "relative", aspectRatio: "1", borderRadius: "12px", background: "#E6ECE8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono',monospace", fontSize: "22px", letterSpacing: ".08em", color: "#4A5E53", overflow: "hidden" }}>
                    <TeamPhoto src={m?.photo} name={m?.name} initials={m?.initials} />
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#000", marginTop: "4px" }}>
                    {m?.name}
                  </div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: "13px", letterSpacing: ".1em", textTransform: "uppercase", color: "#4A5E53" }}>
                    {m?.role}
                  </div>
                  {/* Bio space, left empty for now. */}
                  <div aria-hidden="true" style={{ flex: "1", minHeight: "21px" }} />
                  <div style={{ display: "flex", gap: "12px", color: "#4A5E53", marginTop: "auto" }}>
                    <a className="cv-hover1" href={m?.github} target="_blank" rel="noopener noreferrer" aria-label={`${m?.name} on GitHub`} title={`${m?.name} on GitHub`} style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "color .2s" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
                      </svg>
                    </a>
                    <a className="cv-hover1" href={m?.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${m?.name} on LinkedIn`} title={`${m?.name} on LinkedIn`} style={{ width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "color .2s" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      {/* Sponsors (public/sponsors/*.webp). The files are white on transparent, so each is drawn as a CSS
          mask filled with a soft Sprout green (canvas.css .cv-sponsor), and turns full green on hover. */}
      <section aria-labelledby="cv-sponsors-h" data-sec="1" style={{ background: "transparent", color: "#000", padding: "96px 20px" }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "40px" }}>
          <h2 id="cv-sponsors-h" style={{ margin: "0", fontFamily: "'Geist Mono',monospace", fontSize: "12px", fontWeight: "400", letterSpacing: ".16em", textTransform: "uppercase", color: "#4A5E53" }}>
            Sponsored by
          </h2>
          <div className="cv-sponsors">
            {SPONSORS.map((sp) => (
              <SponsorLogo key={sp.file} sponsor={sp} />
            ))}
          </div>
        </div>
      </section>
      <section data-sec="1" data-ground="dark" style={{ backgroundColor: "#0F2E20", backgroundImage: "radial-gradient(ellipse 50% 60% at 50% 50%,#2E9E5B26,transparent 70%),linear-gradient(#FFFFFF0A 1px,transparent 1px),linear-gradient(90deg,#FFFFFF0A 1px,transparent 1px)", backgroundSize: "100% 100%,24px 24px,24px 24px", color: "#F2F5F3", padding: "140px 20px 120px", position: "relative", borderRadius: "28px 28px 0 0", boxShadow: "0 -16px 40px -8px #0F2E2024" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "28px" }}>
          <svg viewBox="4 6 40 48" aria-hidden="true" style={{ width: "40px", height: "48px" }}>
            <g fill="none" stroke="#F2F5F3" strokeWidth="3.2" strokeLinecap="round">
              <path d="M24 46 V30" />
              <path d="M24 30 L15.5 20.5" />
              <path d="M24 30 L33.5 18.5" />
            </g>
            <circle cx="24" cy="48.5" r="4.6" fill="#F2F5F3" />
            <circle cx="12.5" cy="16.5" r="6.2" fill="#4CC27E" />
            <circle cx="36" cy="14" r="7.6" fill="#4CC27E" />
          </svg>
          <h2 style={{ margin: "0", fontWeight: "600", letterSpacing: "-.03em", lineHeight: "1.05", fontSize: "clamp(36px,5.6vw,72px)", textWrap: "balance" }}>
            Put your idea on the map.
          </h2>
          <p style={{ margin: "0", fontSize: "18px", color: "#B9D4C4", maxWidth: "46ch", textWrap: "pretty" }}>
            Free for founders. One session to a researched, scored, pressure-tested map.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link className="cv-hover7" href="/map" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", minHeight: "44px", padding: "0 20px", borderRadius: "999px", border: "1px solid #F2F5F3", fontSize: "14px", fontWeight: "500", transition: "transform .2s,box-shadow .2s" }}>
              Log in
            </Link>
            <Link className="cv-hover7" href="/map" style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flex: "none", minHeight: "44px", padding: "0 20px", borderRadius: "999px", background: "#F2F5F3", color: "#0F2E20", fontSize: "14px", fontWeight: "600", transition: "transform .2s,box-shadow .2s" }}>
              Demo
            </Link>
          </div>
        </div>
      </section>
      <footer id="footer" data-ground="dark" style={{ backgroundColor: "#0F2E20", backgroundImage: "linear-gradient(#FFFFFF0A 1px,transparent 1px),linear-gradient(90deg,#FFFFFF0A 1px,transparent 1px)", backgroundSize: "24px 24px", color: "#B9D4C4", padding: "40px 20px 32px" }}>
        {" "}
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {" "}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(160px,1.4fr) repeat(auto-fit,minmax(130px,1fr))", gap: "32px", paddingBottom: "40px" }}>
            <svg viewBox="0 0 200 56" aria-label="Sprout" style={{ width: "100px", height: "28px" }}>
              <g fill="none" stroke="#F2F5F3" strokeWidth="3.2" strokeLinecap="round">
                <path d="M24 46 V30" />
                <path d="M24 30 L15.5 20.5" />
                <path d="M24 30 L33.5 18.5" />
              </g>
              <circle cx="24" cy="48.5" r="4.6" fill="#F2F5F3" />
              <circle cx="12.5" cy="16.5" r="6.2" fill="#4CC27E" />
              <circle cx="36" cy="14" r="7.6" fill="#4CC27E" />
              <text x="58" y="41" fill="#F2F5F3" fontSize="34" fontWeight="600" letterSpacing="-0.5" fontFamily="Geist, system-ui, sans-serif">
                sprout
              </text>
            </svg>
            {(footerCols ?? []).map((col: any, $index: number) => (
              <Fragment key={$index}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                  <div style={{ color: "#F2F5F3", fontWeight: "600", marginBottom: "4px" }}>
                    {col?.title}
                  </div>
                  {(col?.links ?? []).map((l: any, $index: number) => (
                    <Fragment key={$index}>
                      <a className="cv-hover8" href={l?.href} style={{ color: "#B9D4C4", transition: "color .2s" }}>
                        {l?.label}
                      </a>
                    </Fragment>
                  ))}
                </div>
              </Fragment>
            ))}
          </div>
          {" "}
          <div style={{ borderTop: "1px solid #2A5A42", paddingTop: "20px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
            <span>
              © 2026 Sprout. All rights reserved.
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <a className="cv-hover8" href="#top" aria-label="X" style={{ width: "36px", height: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "color .2s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2H22l-7.1 8.1L23 22h-6.6l-5.1-6.7L5.4 22H2.3l7.6-8.7L2 2h6.7l4.6 6.1L18.9 2zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20z" />
                </svg>
              </a>
              <a className="cv-hover8" href="#top" aria-label="LinkedIn" style={{ width: "36px", height: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "color .2s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                </svg>
              </a>
              <a className="cv-hover8" href="#top" aria-label="GitHub" style={{ width: "36px", height: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "color .2s" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
                </svg>
              </a>
            </div>
          </div>
          {" "}
        </div>
      </footer>
      {barOn ? (
        <>
          <div role="navigation" aria-label="Features" style={{ position: "fixed", left: "50%", bottom: "24px", zIndex: "60", transform: `translate(-50%,${barY ?? ""})`, opacity: `${barOp ?? ""}`, transition: "transform .5s cubic-bezier(.22,1,.36,1),opacity .4s", pointerEvents: `${barPe ?? ""}`, padding: "5px", borderRadius: "999px", background: "#fff", border: "1px solid #B9D4C4", boxShadow: "0 20px 60px #0F2E2033,0 4px 12px #0F2E2014" } as CSSProperties}>
            {" "}
            <div data-fbar-full="1" style={{ display: "flex", gap: "2px" }}>
              {(tabs ?? []).map((t: any, $index: number) => (
                <Fragment key={$index}>
                  <button className="cv-hover1" onClick={t?.go} style={{ minHeight: "36px", padding: "0 16px", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", background: `${t?.bg ?? ""}`, color: `${t?.fg ?? ""}`, transition: "background .3s,color .3s" } as CSSProperties}>
                    {t?.label}
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
            <div data-fbar-dots="1" style={{ display: "none", gap: "8px", padding: "0 10px", height: "36px", alignItems: "center" }}>
              {" "}
              {(tabs ?? []).map((t: any, $index: number) => (
                <Fragment key={$index}>
                  {" "}
                  <button onClick={t?.go} aria-label={t?.label} style={{ width: "10px", height: "10px", borderRadius: "50%", border: "none", padding: "0", cursor: "pointer", background: `${t?.dot ?? ""}`, transition: "background .3s" } as CSSProperties} />
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
          </div>
        </>
      ) : null}
      {/*
SWAP GUIDE
  #map-slot          → real idea-map component (Idea Map.dc.html via <dc-import>)
  slabA / slabB      → real feature components (#slab-a-card, #slab-b visual)
  aboutCopy          → real description (logic class)
  team[].photo       → each person's photo in public/team/ (logic class); initials show if it's missing
*/}
    </div>
  );
}
