"use client";

// Discussions: talk to a simulated customer, investor, competitor CEO or advisor about the idea.
// /api/persona once per conversation, /api/chat for every reply, then /api/extract on the newest
// exchange. Anything specific they said lands on the tree through applyWidget(), quoted, and is
// listed under the reply as "What this changed".
// A choice's "Challenge" button opens this widget focused on that choice (ctx.focus): the persona
// is picked for that choice and the chat is told what the founder wants to test.
// One conversation per role, cached per idea in this browser.
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { extractUpdates, fetchPersona, sendChat } from "@/ideas/api";
import { loadWidgetCache, saveWidgetCache } from "@/ideas/store";
import type { WireChatMessage, WirePersona, WireRole } from "@/ideas/wire";
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
  /** Set when opened from a choice's Challenge button. */
  focus?: { choiceId: string; label: string };
}

const ROLES: WireRole[] = ["customer", "investor", "competitor", "advisor"];
// The last Challenge this browser tab acted on, so reopening the widget resumes instead of restarting.
let handledFocusKey = 0;
const cacheKey = (role: WireRole) => `discuss.${role}`;

const METER: Record<"startup" | "nonprofit", Partial<Record<WireRole, string>>> = {
  startup: { customer: "Would buy", investor: "Would invest", competitor: "Not worried" },
  nonprofit: { customer: "Would take part", investor: "Would fund", competitor: "Would partner" },
};
const PLACEHOLDER: Record<WireRole, string> = {
  customer: "Ask about price, habits, what they use today…",
  investor: "Answer their question, or ask what would get them to yes…",
  competitor: "Ask how they'd respond to your launch…",
  advisor: "Ask anything about the plan…",
};
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export default function DiscussionWidget({ ctx }: { ctx: WidgetCtx }) {
  const { ideaId, buildIdea, focus } = ctx;
  // A Challenge not acted on yet: start focused on that choice. (The map remounts this widget per Challenge.)
  const [pending] = useState(() => (focus && focus.key !== handledFocusKey ? focus : null));
  const mode = buildIdea()?.mode === "nonprofit" ? "nonprofit" : "startup";
  const titles = profileFor(mode).roles;

  const [role, setRole] = useState<WireRole>(pending?.role ?? "customer");
  const [convo, setConvo] = useState<Convo | null>(() => (pending ? null : loadWidgetCache<Convo>(ideaId, cacheKey("customer"))));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<null | "starting" | "replying">(null);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const save = useCallback(
    (r: WireRole, c: Convo | null) => {
      setConvo(c);
      saveWidgetCache(ideaId, cacheKey(r), c);
    },
    [ideaId]
  );

  // Start a conversation for `r`: find the persona, then let them speak first.
  const start = useCallback(
    (r: WireRole, f?: Convo["focus"]) => {
      setError(null);
      setBusy("starting");
      setConvo(null);
      (async () => {
        const idea = buildIdea();
        const persona = await fetchPersona(idea, r, f?.choiceId);
        const open = await sendChat(idea, persona, [], f?.choiceId);
        save(r, { persona, turns: [{ from: "persona", text: open.reply }], wouldBuy: open.wouldBuy, focus: f });
      })()
        .catch((e: Error) => setError({ message: e.message, retry: () => start(r, f) }))
        .finally(() => setBusy(null));
    },
    [buildIdea, save]
  );

  // On open: a pending Challenge starts a fresh conversation focused on its choice;
  // otherwise resume this role's conversation, or start one.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (pending) {
      handledFocusKey = pending.key;
      start(pending.role, { choiceId: pending.choiceId, label: pending.label });
    } else if (!convo) start(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [convo?.turns.length, busy]);

  function switchRole(r: WireRole) {
    if (r === role || busy) return;
    setRole(r);
    setError(null);
    setDraft("");
    const cached = loadWidgetCache<Convo>(ideaId, cacheKey(r));
    if (cached) setConvo(cached);
    else start(r);
  }

  function send(text: string, base: Convo, r: WireRole) {
    const withFounder: Convo = { ...base, turns: [...base.turns, { from: "founder", text }] };
    save(r, withFounder);
    setDraft("");
    setError(null);
    setBusy("replying");
    (async () => {
      const messages = withFounder.turns.map(({ from, text }) => ({ from, text }));
      const res = await sendChat(buildIdea(), base.persona, messages, base.focus?.choiceId);
      const reply: Turn = { from: "persona", text: res.reply };
      const withReply: Convo = { ...withFounder, turns: [...withFounder.turns, reply], wouldBuy: res.wouldBuy };
      save(r, withReply);
      // Only the newest exchange is sent to the extractor, as the route expects.
      const updates = await extractUpdates(buildIdea(), base.persona, [{ from: "founder", text }, { from: "persona", text: res.reply }]);
      if (!updates.length) return;
      const changes = ctx.applyWidget(updates, `${titles[r]} · ${base.persona.name}`);
      if (!changes.length) return;
      const turns = withReply.turns.slice();
      turns[turns.length - 1] = { ...reply, changes };
      save(r, { ...withReply, turns });
    })()
      // A failed reply leaves the founder's line in place; retry sends it again.
      .catch((e: Error) => setError({ message: e.message, retry: () => send(text, base, r) }))
      .finally(() => setBusy(null));
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy || !convo) return;
    send(text, convo, role);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const p = convo?.persona;
  const meter = METER[mode][role];
  return (
    <section className="wg-panel" aria-label="Discussions">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">Discussions</h2>
        <span className="wg-eyebrow">Simulated people · based on real research</span>
      </div>

      <div className="cw-tabs" role="tablist" aria-label="Who to talk to">
        {ROLES.map((r) => (
          <button key={r} type="button" role="tab" aria-selected={role === r} className={`cw-tab${role === r ? " is-on" : ""}`} onClick={() => switchRole(r)} disabled={!!busy && role !== r}>
            {titles[r]}
          </button>
        ))}
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
            <button type="button" className="cw-link" onClick={() => start(role)} disabled={!!busy}>
              New conversation
            </button>
          </div>
          <span style={{ fontSize: "13px", lineHeight: 1.45 }}>{p.blurb}</span>
          {convo?.focus ? <span className="cw-source">Challenging “{convo.focus.label}”</span> : null}
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
          {meter ? (
            <div className="cw-meter" aria-label={`${meter}: ${convo?.wouldBuy ?? 0} out of 100`}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>{meter}</span>
                <span style={{ fontWeight: 700 }}>{convo?.wouldBuy ?? 0}%</span>
              </div>
              <div className="cw-meter-track">
                <div className="cw-meter-fill" style={{ width: `${convo?.wouldBuy ?? 0}%` }} />
              </div>
            </div>
          ) : null}
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
            aria-label={`Message ${p?.name ?? titles[role]}`}
            placeholder={PLACEHOLDER[role]}
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
