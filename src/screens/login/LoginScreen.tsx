"use client";

// Login screen, ported from the Claude Design file "Login.dc.html"
// (claude.ai/design project 64b283df-0e77-4c88-936d-707b3f0b3f61).
// Markup and inline styles are the design's, converted 1:1; behaviour is in ./logic.js.
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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", minHeight: "100vh", background: "#f9fafb" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px clamp(24px,6vw,96px)" }}>
          <div style={{ width: "100%", maxWidth: "380px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", width: "fit-content" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#111827" }} />
              <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}>
                Idea map
              </div>
            </Link>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h1 style={{ margin: "0", fontSize: "28px", fontWeight: "600", letterSpacing: "-.02em", lineHeight: "1.15" }}>
                Welcome back
              </h1>
              <p style={{ margin: "0", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
                Log in to keep growing your ideas.
              </p>
            </div>
            <button className="lg-hover0" onClick={google} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", height: "44px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", color: "#111827", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "background .15s,border-color .15s" }}>
              <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #111827", boxSizing: "border-box", borderRightColor: "transparent", flex: "none" }} />
              {" Continue with Google "}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#9ca3af", fontSize: "12px" }}>
              <span style={{ flex: "1", height: "1px", background: "#e5e7eb" }} />
              or
              <span style={{ flex: "1", height: "1px", background: "#e5e7eb" }} />
            </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "500", color: "#374151" }}>
                {"Email "}
                <input className="lg-focus1" type="email" value={email} onChange={setEmail} placeholder="you@school.edu" autoComplete="email" style={{ height: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "14px", color: "#111827", outline: "none", transition: "border-color .15s,box-shadow .15s" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: "500", color: "#374151" }}>
                {"Password "}
                <input className="lg-focus1" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" style={{ height: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "14px", color: "#111827", outline: "none", transition: "border-color .15s,box-shadow .15s" }} />
              </label>
              <button className="lg-hover2" type="submit" style={{ height: "44px", borderRadius: "10px", border: "none", background: "#111827", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "4px", transition: "background .15s" }}>
                Log in
              </button>
            </form>
            {isDev ? (
              <>
                <div style={{ fontSize: "12px", color: "#6b7280", fontFamily: "'Geist Mono',monospace", padding: "8px 10px", borderRadius: "8px", background: "#f3f4f6" }}>
                  This is a mock, so any email and password will work.
                </div>
              </>
            ) : null}
            {/* App addition: auth errors, in the design's notice style with its red chip colours. */}
            {error ? (
              <div role="alert" style={{ fontSize: "12px", color: "#b91c1c", fontFamily: "'Geist Mono',monospace", padding: "8px 10px", borderRadius: "8px", background: "#fee2e2" }}>
                {error}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "13px", flexWrap: "wrap" }}>
              <button className="lg-hover3" onClick={create} style={{ border: "none", background: "none", padding: "0", color: "#111827", fontSize: "13px", fontWeight: "500", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Create an account
              </button>
              <button className="lg-hover4" onClick={guest} style={{ border: "none", background: "none", padding: "0", color: "#6b7280", fontSize: "13px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Continue as guest
              </button>
            </div>
          </div>
        </div>
        <div data-brand="1" style={{ position: "relative", overflow: "hidden", backgroundColor: "#111827", backgroundImage: "linear-gradient(#ffffff0a 1px,transparent 1px),linear-gradient(90deg,#ffffff0a 1px,transparent 1px)", backgroundSize: "24px 24px", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "48px clamp(24px,5vw,72px)" }}>
          <svg viewBox="0 0 600 600" aria-hidden="true" style={{ position: "absolute", left: "50%", top: "44%", width: "min(560px,88%)", height: "auto", transform: "translate(-50%,-50%)", overflow: "visible" }}>
            <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" strokeOpacity=".12" />
            <circle cx="300" cy="300" r="230" fill="none" stroke="#fff" strokeOpacity=".12" strokeDasharray="2 6" />
            <g fill="none" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" pathLength="1" strokeDasharray="1">
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
                  <circle cx={n?.x} cy={n?.y} r="30" fill="#111827" stroke={n?.color} strokeWidth="3" />
                  <foreignObject x={n?.fx} y={n?.fy} width="60" height="60" style={{ overflow: "visible" }}>
                    <div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Geist,system-ui,sans-serif", fontSize: "11px", fontWeight: "600", color: "#fff" }}>
                      {n?.name}
                    </div>
                  </foreignObject>
                </g>
              </Fragment>
            ))}
            <circle cx="300" cy="300" r="44" fill="#fff" stroke="#111827" strokeWidth="2" />
            <circle cx="300" cy="300" r="30" fill="#111827" />
            <text x="300" y="300" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="22" fontWeight="700" fontFamily="Geist, system-ui, sans-serif">
              P
            </text>
          </svg>
          <div style={{ position: "relative", maxWidth: "420px" }}>
            {" "}
            <div style={{ fontSize: "11px", fontFamily: "'Geist Mono',monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "10px" }}>
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
