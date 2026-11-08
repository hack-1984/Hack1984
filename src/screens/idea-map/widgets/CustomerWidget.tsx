"use client";

// Customer discussion: talk to a simulated customer grounded in a real complaint from the research.
// /api/persona once per conversation, /api/chat for every reply, then /api/extract on the newest
// exchange. Anything specific the customer said lands on the tree through applyWidget(), quoted,
// and is listed under the reply as "What this changed".
// The conversation is cached per idea in this browser, so closing the panel doesn't lose it.
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { extractUpdates, fetchPersona, sendChat } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import type { WireChatMessage, WirePersona } from "@/ideas/wire";
import { profileFor } from "@/lib/modes";
import type { Change, WidgetCtx } from "./types";

interface Turn extends WireChatMessage {
  /** Tree changes this reply caused (persona turns only). */
  changes?: Change[];
}
interface Convo {
  persona: WirePersona;
  turns: Turn[];
  wouldBuy: number;
}

const CACHE_KEY = "customer";
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export default function CustomerWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea } = ctx;
  const mode = buildIdea()?.mode;
  const nonprofit = mode === "nonprofit";
  const meterLabel = nonprofit ? "Would take part" : "Would buy";
  const who = profileFor(mode).roles.customer.toLowerCase();

  const [convo, setConvo] = useState<Convo | null>(() => loadWidgetCache<Convo>(ideaId, CACHE_KEY));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<null | "starting" | "replying">(convo ? null : "starting");
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const save = useCallback(
    (c: Convo) => {
      setConvo(c);
      saveWidgetCache(ideaId, CACHE_KEY, c);
    },
    [ideaId]
  );

  // Start: find the persona, then let them speak first.
  const start = useCallback(() => {
    setError(null);
    setBusy("starting");
    (async () => {
      const idea = buildIdea();
      const persona = await fetchPersona(idea, "customer");
      const open = await sendChat(idea, persona, []);
      save({ persona, turns: [{ from: "persona", text: open.reply }], wouldBuy: open.wouldBuy });
    })()
      .catch((e: Error) => setError({ message: e.message, retry: start }))
      .finally(() => setBusy(null));
  }, [buildIdea, save]);

  const started = useRef(false);
  useEffect(() => {
    if (convo || started.current) return;
    started.current = true;
    start();
  }, [convo, start]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [convo?.turns.length, busy]);

  function send(text: string, base: Convo) {
    const withFounder: Convo = { ...base, turns: [...base.turns, { from: "founder", text }] };
    save(withFounder);
    setDraft("");
    setError(null);
    setBusy("replying");
    (async () => {
      const idea = buildIdea();
      const messages = withFounder.turns.map(({ from, text }) => ({ from, text }));
      const res = await sendChat(idea, base.persona, messages);
      const reply: Turn = { from: "persona", text: res.reply };
      const withReply: Convo = { ...withFounder, turns: [...withFounder.turns, reply], wouldBuy: res.wouldBuy };
      save(withReply);
      // Only the newest exchange is sent to the extractor, as the route expects.
      const updates = await extractUpdates(buildIdea(), base.persona, [{ from: "founder", text }, { from: "persona", text: res.reply }]);
      if (!updates.length) return;
      const changes = ctx.applyWidget(updates, `Customer discussion · ${base.persona.name}`);
      if (!changes.length) return;
      const turns = withReply.turns.slice();
      turns[turns.length - 1] = { ...reply, changes };
      save({ ...withReply, turns });
    })()
      // A failed reply leaves the founder's line in place; retry sends it again.
      .catch((e: Error) => setError({ message: e.message, retry: () => send(text, base) }))
      .finally(() => setBusy(null));
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy || !convo) return;
    send(text, convo);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function restart() {
    saveWidgetCache(ideaId, CACHE_KEY, null);
    setConvo(null);
    start();
  }

  const p = convo?.persona;
  return (
    <section className="wg-panel" aria-label="Customer discussion">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">{nonprofit ? "Community discussion" : "Customer discussion"}</h2>
        <span className="wg-eyebrow">Simulated {who} · based on real research</span>
      </div>

      {busy === "starting" ? (
        <p className="wg-muted" role="status">
          Finding someone to talk to…
        </p>
      ) : null}

      {p ? (
        <div className="cw-persona">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700 }}>{p.name}</span>
            <button type="button" className="cw-link" onClick={restart} disabled={!!busy}>
              New conversation
            </button>
          </div>
          <span style={{ fontSize: "13px", lineHeight: 1.45 }}>{p.blurb}</span>
          {p.basedOn ? (
            <span className="cw-source">
              Based on: “{p.basedOn.text}”{" "}
              {p.basedOn.url ? (
                <a href={p.basedOn.url} target="_blank" rel="noopener noreferrer">
                  {p.basedOn.where || host(p.basedOn.url)}
                </a>
              ) : (
                p.basedOn.where
              )}
            </span>
          ) : null}
          <div className="cw-meter" aria-label={`${meterLabel}: ${convo?.wouldBuy ?? 0} out of 100`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--muted)" }}>{meterLabel}</span>
              <span style={{ fontWeight: 700 }}>{convo?.wouldBuy ?? 0}%</span>
            </div>
            <div className="cw-meter-track">
              <div className="cw-meter-fill" style={{ width: `${convo?.wouldBuy ?? 0}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {convo ? (
        <div className="cw-thread" ref={threadRef} aria-live="polite">
          {convo.turns.map((t, i) => (
            <div key={i} className={t.from === "founder" ? "cw-msg cw-me" : "cw-msg cw-them"}>
              <span className="cw-who">{t.from === "founder" ? "You" : p?.name}</span>
              <span>{t.text}</span>
              {t.changes?.length ? (
                <div className="cw-changes">
                  <span className="cw-changes-k">What this changed</span>
                  {t.changes.map((c, k) => (
                    <span key={k}>
                      <b>{c.type}</b> “{c.choiceText}” · {c.pillar}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {busy === "replying" ? (
            <div className="cw-msg cw-them cw-typing" role="status">
              <span className="cw-who">{p?.name}</span>
              <span>Thinking…</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="wg-error" role="alert">
          <span>{error.message}</span>
          <button type="button" className="wg-btn" style={{ alignSelf: "flex-start", minHeight: "36px" }} onClick={error.retry}>
            Try again
          </button>
        </div>
      ) : null}

      {convo ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            className="im-input cw-input"
            aria-label={`Message ${p?.name ?? "the customer"}`}
            placeholder={nonprofit ? "Ask what would make them come…" : "Ask about price, habits, what they use today…"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            disabled={!!busy}
          />
          <button type="submit" className="wg-btn" disabled={!draft.trim() || !!busy}>
            Send
          </button>
        </form>
      ) : null}
    </section>
  );
}
