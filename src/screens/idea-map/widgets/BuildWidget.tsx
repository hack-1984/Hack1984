"use client";

// Build: launch materials written from the tree by /api/build: a landing page, a pitch
// outline and a one-pager. Only claims the tree supports. Started by a button (one model call),
// cached per idea in this browser; "Write again" rebuilds from the tree as it stands now.
import { useState } from "react";
import { fetchBuild } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import type { BuildResponse } from "@/ideas/wire";
import type { WidgetCtx } from "./types";

type Tab = "landing" | "outline" | "onePager";
const CACHE_KEY = "build";

export default function BuildWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea } = ctx;
  const nonprofit = buildIdea()?.mode === "nonprofit";
  const TABS: { key: Tab; label: string }[] = [
    { key: "landing", label: nonprofit ? "Volunteer page" : "Landing page" },
    { key: "outline", label: nonprofit ? "Grant outline" : "Pitch outline" },
    { key: "onePager", label: nonprofit ? "Case for support" : "One-pager" },
  ];

  const [res, setRes] = useState<BuildResponse | null>(() => loadWidgetCache<BuildResponse>(ideaId, CACHE_KEY));
  const [tab, setTab] = useState<Tab>("landing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function write() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetchBuild(buildIdea());
      setRes(r);
      saveWidgetCache(ideaId, CACHE_KEY, r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const asText = (r: BuildResponse) =>
    tab === "landing"
      ? [r.landing.headline, r.landing.subhead, ...r.landing.bullets.map((b) => `• ${b}`), `[${r.landing.cta}]`].join("\n")
      : tab === "outline"
        ? r.pitchOutline.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : r.onePager;

  async function copy() {
    if (!res) return;
    try {
      await navigator.clipboard.writeText(asText(res));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy. Select the text and copy it instead.");
    }
  }

  return (
    <section className="wg-panel" aria-label="Build">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">Build</h2>
        <span className="wg-eyebrow">Written from your tree · only what it supports</span>
      </div>

      {!res && !busy ? (
        <>
          <p className="wg-muted">
            {nonprofit
              ? "A volunteer and donate page, a grant proposal outline and a case for support, written from your strongest choices."
              : "A landing page, a 6-slide pitch outline and a one-pager, written from your strongest choices."}
          </p>
          <button type="button" className="wg-btn" onClick={write}>
            Write them
          </button>
        </>
      ) : null}

      {busy ? (
        <p className="wg-muted" role="status">
          Writing from your tree…
        </p>
      ) : null}

      {error ? (
        <div className="wg-error" role="alert">
          <span>{error}</span>
          <button type="button" className="wg-btn" style={{ alignSelf: "flex-start", minHeight: "36px" }} onClick={write}>
            Try again
          </button>
        </div>
      ) : null}

      {res && !busy ? (
        <>
          <div className="cw-tabs" role="tablist" aria-label="Materials">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`cw-tab${tab === t.key ? " is-on" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "landing" ? (
            <div className="bd-landing">
              <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-.01em", lineHeight: 1.2 }}>{res.landing.headline}</div>
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--muted)" }}>{res.landing.subhead}</div>
              <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", lineHeight: 1.45 }}>
                {res.landing.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <span className="bd-cta">{res.landing.cta}</span>
            </div>
          ) : null}

          {tab === "outline" ? (
            <ol style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.45 }}>
              {res.pitchOutline.map((s, i) => {
                const at = s.indexOf(":");
                return (
                  <li key={i}>
                    {at > 0 ? (
                      <>
                        <b>{s.slice(0, at)}</b>
                        {s.slice(at)}
                      </>
                    ) : (
                      s
                    )}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {tab === "onePager" ? (
            <div style={{ fontSize: "13px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{res.onePager}</div>
          ) : null}

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="wg-btn" style={{ flex: 1 }} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" className="wg-btn" style={{ flex: 1 }} onClick={write}>
              Write again
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
