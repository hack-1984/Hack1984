"use client";

// Login screen, ported from the Claude Design file "Login.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup is the design's; colors use the Sprout theme variables (globals.css).
// Behaviour is in ./logic.js.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { useLogic } from "../dc";
import Logic from "./logic";
import "./login.css";

export default function LoginScreen(props: Record<string, unknown>) {
  const v = useLogic(Logic, props, { clientOnly: true });
  if (!v) return <div className="pg-lg" />;
  const { create, email, error, google, guest, isDev, password, setEmail, setPassword, submit, treeNodes } = v;
  return (
    <div className="pg-lg">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px,6vw,96px)" }}>
          <div style={{ width: "100%", maxWidth: "380px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
            <Link href="/" aria-label="Sprout home" style={{ display: "flex", alignItems: "center", textDecoration: "none", width: "fit-content" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/sprout-logo-black.svg" alt="Sprout" width={129} height={36} style={{ display: "block" }} />
            </Link>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h1 style={{ margin: "0", fontSize: "28px", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.15" }}>
                Welcome back
              </h1>
              <p style={{ margin: "0", fontSize: "14px", color: "var(--muted)", lineHeight: "1.5" }}>
                Log in to keep growing your ideas.
              </p>
            </div>
            <button className="lg-hover0" onClick={google} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", height: "44px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "background .15s,border-color .15s" }}>
              {/* Google "G" mark, in Google's brand colors. */}
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flex: "none" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--muted)", fontSize: "12px" }}>
              <span style={{ flex: "1", height: "1px", background: "var(--border)" }} />
              or
              <span style={{ flex: "1", height: "1px", background: "var(--border)" }} />
            </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "500", color: "var(--muted)" }}>
                {"Email "}
                <input className="lg-focus1" type="email" value={email} onChange={setEmail} placeholder="you@school.edu" autoComplete="email" style={{ height: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "14px", color: "var(--text)", outline: "none", transition: "border-color .15s,box-shadow .15s" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "500", color: "var(--muted)" }}>
                {"Password "}
                <input className="lg-focus1" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" style={{ height: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "14px", color: "var(--text)", outline: "none", transition: "border-color .15s,box-shadow .15s" }} />
              </label>
              <button className="lg-hover2" type="submit" style={{ height: "44px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "var(--on-primary)", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "4px", transition: "background .15s" }}>
                Log in
              </button>
            </form>
            {isDev ? (
              <>
                <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'Geist Mono',monospace", padding: "8px 10px", borderRadius: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  This is a mock, so any email and password will work.
                </div>
              </>
            ) : null}
            {/* App addition: auth errors, in the design's notice style with the theme's red. */}
            {error ? (
              <div role="alert" style={{ fontSize: "12px", color: "var(--red-text)", fontFamily: "'Geist Mono',monospace", padding: "8px 10px", borderRadius: "8px", background: "var(--red-tint)" }}>
                {error}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "13px", flexWrap: "wrap" }}>
              <button className="lg-hover3" onClick={create} style={{ border: "none", background: "none", padding: "0", color: "var(--text)", fontSize: "13px", fontWeight: "500", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Create an account
              </button>
              <button className="lg-hover4" onClick={guest} style={{ border: "none", background: "none", padding: "0", color: "var(--muted)", fontSize: "13px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Continue as guest
              </button>
            </div>
          </div>
        </div>
        {/* Feature panel: stays dark in the light theme (--primary, white text, white rings at 15%). */}
        <div data-brand="1" style={{ position: "relative", overflow: "hidden", backgroundColor: "var(--primary)", backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "24px 24px", color: "var(--on-primary)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "48px clamp(24px,5vw,72px)" }}>
          <svg viewBox="0 0 600 600" aria-hidden="true" style={{ position: "absolute", left: "50%", top: "44%", width: "min(560px,88%)", height: "auto", transform: "translate(-50%,-50%)", overflow: "visible" }}>
            <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" strokeOpacity=".15" />
            <circle cx="300" cy="300" r="230" fill="none" stroke="#fff" strokeOpacity=".15" strokeDasharray="2 6" />
            <g fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round" pathLength="1" strokeDasharray="1">
              <path d="M300 300 L300 70" style={{ animation: "lg-drawIn .9s ease-out .2s both" }} />
              <path d="M300 300 L463 137" style={{ animation: "lg-drawIn .9s ease-out .3s both" }} />
              <path d="M300 300 L530 300" style={{ animation: "lg-drawIn .9s ease-out .4s both" }} />
              <path d="M300 300 L463 463" style={{ animation: "lg-drawIn .9s ease-out .5s both" }} />
              <path d="M300 300 L300 530" style={{ animation: "lg-drawIn .9s ease-out .6s both" }} />
              <path d="M300 300 L137 463" style={{ animation: "lg-drawIn .9s ease-out .7s both" }} />
              <path d="M300 300 L70 300" style={{ animation: "lg-drawIn .9s ease-out .8s both" }} />
              <path d="M300 300 L137 137" style={{ animation: "lg-drawIn .9s ease-out .9s both" }} />
            </g>
            {(treeNodes ?? []).map((n: any, $index: number) => (
              <Fragment key={$index}>
                <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: `lg-nodeIn .5s cubic-bezier(.2,.8,.2,1) ${n?.delay ?? ""} both` } as CSSProperties}>
                  {/* White track at 15%, then the score arc in its signal color, starting at 12 o'clock. */}
                  <circle cx={n?.x} cy={n?.y} r="30" strokeWidth="4" stroke="#fff" strokeOpacity=".15" style={{ fill: "var(--primary)" }} />
                  <circle cx={n?.x} cy={n?.y} r="30" strokeWidth="4" strokeLinecap="round" strokeDasharray={n?.arc} transform={`rotate(-90 ${n?.x} ${n?.y})`} style={{ fill: "none", stroke: n?.color }} />
                  <foreignObject x={n?.fx} y={n?.fy} width="60" height="60" style={{ overflow: "visible" }}>
                    <div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist,system-ui,sans-serif", fontSize: "11px", fontWeight: "600", color: "var(--on-primary)" }}>
                      {n?.name}
                    </div>
                  </foreignObject>
                </g>
              </Fragment>
            ))}
            <circle cx="300" cy="300" r="44" strokeWidth="2" style={{ fill: "var(--primary)", stroke: "var(--accent)" }} />
            <circle cx="300" cy="300" r="30" style={{ fill: "var(--accent)" }} />
            <text x="300" y="300" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" fontFamily="Geist, system-ui, sans-serif" style={{ fill: "var(--on-accent)" }}>
              P
            </text>
          </svg>
          <div style={{ position: "relative", maxWidth: "420px" }}>
            {" "}
            <div style={{ fontSize: "11px", fontFamily: "'Geist Mono',monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.72)", marginBottom: "10px" }}>
              Example map · week 6
            </div>
            {" "}
            <div style={{ fontSize: "clamp(22px,2.4vw,30px)", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.2", textWrap: "balance" }}>
              Every idea starts as a guess. Watch yours grow up.
            </div>
            {" "}
          </div>
        </div>
      </div>
    </div>
  );
}
