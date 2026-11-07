"use client";
// Ethan's screens (mockup): intake, persona chat with highlight-to-reply,
// graveyard, Launch Day. Greg's Team drawer. Plus a history log.
import { useImperativeHandle, useState, type Ref } from "react";
import { decide } from "@/lib/decide";
import type { Idea, LaunchSummary, PillarKey, SceneSpec, SimPersona, SimResult, TeamProfile, UpdateSource } from "@/lib/types";
import { api, describeUpdate, type Update } from "./lib";

type Role = "customer" | "competitor" | "investor" | "advisor";
type Persona = { id: string; role: Role; name: string; blurb: string; basedOn?: { text: string; url: string; where: string } };
type Msg = { from: "founder" | "persona"; text: string };
export type Highlight = { text: string; choiceId?: string; pillar?: PillarKey };
/** A highlight sent from the page-level selection bar. */
export type HighlightRequest = { mode: "ask" | "reply"; highlight: Highlight; msgIndex?: number };
export type ChatHandle = { highlight: (r: HighlightRequest) => void };

const Err = ({ e }: { e: string }) => (e ? <p className="rounded bg-red-50 p-2 text-xs text-red-700">{e}</p> : null);
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:opacity-40 ${p.className ?? ""}`} />
);

function UpdateList({ updates, idea }: { updates: Update[]; idea: Idea }) {
  if (!updates.length) return <p className="text-[11px] italic text-zinc-400">no tree updates</p>;
  return (
    <ul className="space-y-1">
      {updates.map((u, i) => (
        <li key={i} className="rounded border-l-4 border-fuchsia-400 bg-fuchsia-50 px-2 py-1 text-[11px]">
          <b>{describeUpdate(u, idea)}</b> {u.quote && <span className="italic">“{u.quote}”</span>}
          <div className="text-zinc-500">{u.reason}</div>
        </li>
      ))}
    </ul>
  );
}

// ---------------- Intake (Ethan) ----------------
export function IntakePanel({ team, onIdea, onFixture }: { team: TeamProfile; onIdea: (i: Idea) => void; onFixture: () => void }) {
  const [pitch, setPitch] = useState("An app that tells you where the fish are biting today.");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ms, setMs] = useState(0);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ idea: Idea }>("/api/tree", { pitch, team });
      onIdea(r.data.idea);
      setMs(r.ms);
    } catch (e) {
      setErr(String(e));
    }
    setBusy(false);
  };
  return (
    <div className="space-y-2">
      <textarea className="w-full rounded border p-2 text-sm" rows={3} value={pitch} onChange={(e) => setPitch(e.target.value)} />
      <div className="flex gap-2">
        <Btn disabled={busy || !pitch.trim()} onClick={go}>{busy ? "Researching…" : "Research + grow tree"}</Btn>
        <button className="text-xs underline" onClick={onFixture}>Load fixture</button>
        {ms > 0 && <span className="text-xs text-zinc-400">{ms}ms</span>}
      </div>
      <p className="text-[11px] text-zinc-500">Uses the team profile from the Team tab. Calls Nick&apos;s /api/tree.</p>
      <Err e={err} />
    </div>
  );
}

// ---------------- Persona chat + highlight-to-reply (Ethan) ----------------
const SOURCE: Record<Role, UpdateSource> = { customer: "customer", competitor: "competitor", investor: "investor", advisor: "plan" };
const METER: Record<Role, string> = { customer: "Would buy", competitor: "Unthreatened", investor: "Would invest", advisor: "Customers would buy" };

export function ChatPanel({ idea, onUpdates, ref }: { idea: Idea; onUpdates: (u: Update[]) => void; ref?: Ref<ChatHandle> }) {
  const [focus, setFocus] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [wouldBuy, setWouldBuy] = useState<number[]>([]);
  const [lastUpdates, setLastUpdates] = useState<Update[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [times, setTimes] = useState<number[]>([]);
  const [reply, setReply] = useState<{ req: HighlightRequest; text: string } | null>(null);

  const run = async <T,>(label: string, f: () => Promise<T>) => {
    setBusy(label);
    setErr("");
    try {
      return await f();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  };

  const start = (r: Role, highlight?: Highlight, firstLine?: string) =>
    run("Meeting persona…", async () => {
      const p = (await api<{ persona: Persona }>("/api/persona", { idea: idea, role: r, choiceId: focus || highlight?.choiceId })).data.persona;
      setPersona(p);
      setLastUpdates([]);
      const first: Msg[] = firstLine ? [{ from: "founder", text: firstLine }] : [];
      const c = await api<{ reply: string; wouldBuy: number }>("/api/chat", { idea: idea, persona: p, messages: first, focusChoiceId: focus || undefined, highlight });
      setTimes((t) => [...t, c.ms]);
      setMsgs([...first, { from: "persona", text: c.data.reply }]);
      setWouldBuy([c.data.wouldBuy]);
    });

  const send = (text: string, highlight?: Highlight) =>
    run("Thinking…", async () => {
      if (!persona) return;
      const next: Msg[] = [...msgs, { from: "founder", text }];
      setMsgs(next);
      setInput("");
      const c = await api<{ reply: string; wouldBuy: number }>("/api/chat", { idea: idea, persona, messages: next, focusChoiceId: focus || undefined, highlight });
      setTimes((t) => [...t, c.ms]);
      const withReply: Msg[] = [...next, { from: "persona", text: c.data.reply }];
      setMsgs(withReply);
      setWouldBuy((w) => [...w, c.data.wouldBuy]);
      setBusy("Extracting tree updates…");
      const ex = await api<{ updates: Update[] }>("/api/extract", { idea: idea, messages: withReply.slice(-2), source: SOURCE[persona.role], persona, highlight });
      setLastUpdates(ex.data.updates);
      onUpdates(ex.data.updates);
    });

  const sendReply = () =>
    run("Extracting from your reply…", async () => {
      if (!reply) return;
      const quoted = reply.req.msgIndex !== undefined ? msgs[reply.req.msgIndex]?.text ?? reply.req.highlight.text : reply.req.highlight.text;
      const exchange: Msg[] = [{ from: "persona", text: quoted }, { from: "founder", text: reply.text }];
      setMsgs((m) => [...m, { from: "founder", text: `↪ “${reply.req.highlight.text}” — ${reply.text}` }]);
      const ex = await api<{ updates: Update[] }>("/api/extract", { idea: idea, messages: exchange, source: "reply", persona: persona ?? undefined, highlight: reply.req.highlight });
      setLastUpdates(ex.data.updates);
      onUpdates(ex.data.updates);
      setReply(null);
    });

  // Highlights arriving from the page-level selection bar.
  useImperativeHandle(ref, () => ({
    highlight: (req) => {
      const q = `What do you think about: “${req.highlight.text}”?`;
      if (req.mode === "reply") setReply({ req, text: "" });
      else if (persona?.role === "advisor") send(q, req.highlight);
      else start("advisor", req.highlight, q);
    },
  }));

  const wb = wouldBuy[wouldBuy.length - 1];
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const active = idea.choices.filter((c) => c.status === "active");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {(["customer", "investor", "competitor", "advisor"] as Role[]).map((r) => (
          <button key={r} onClick={() => start(r)} disabled={!!busy} className={`rounded-full border px-3 py-1 text-xs capitalize ${persona?.role === r ? "bg-indigo-600 text-white" : ""}`}>
            Talk to {r}
          </button>
        ))}
      </div>
      <label className="block text-xs">
        Pressure-test choice:{" "}
        <select className="rounded border text-xs" value={focus} onChange={(e) => setFocus(e.target.value)}>
          <option value="">(none)</option>
          {active.map((c) => <option key={c.id} value={c.id}>[{c.id}] {c.label}</option>)}
        </select>
      </label>

      {persona && (
        <div className="rounded-lg bg-zinc-50 p-2 text-xs">
          <div className="flex items-center justify-between">
            <b>{persona.name}</b>
            <span>{METER[persona.role]}: <b className="font-mono">{wb ?? "–"}</b> <span className="text-zinc-400">{wouldBuy.join(" → ")}</span></span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-zinc-200"><div className="h-1.5 rounded bg-indigo-500 transition-all" style={{ width: `${wb ?? 0}%` }} /></div>
          <div className="mt-1 text-zinc-500">{persona.blurb}</div>
          {persona.basedOn && (
            <div className="mt-1 text-zinc-500">
              Based on: “{persona.basedOn.text}” — <a className="underline" href={persona.basedOn.url} target="_blank" rel="noreferrer">{persona.basedOn.where}</a>
            </div>
          )}
        </div>
      )}

      <div className="max-h-80 space-y-2 overflow-auto">
        {msgs.map((m, i) => (
          <div key={i} data-msg-index={m.from === "persona" ? i : undefined} className={`rounded-lg p-2 text-sm ${m.from === "founder" ? "ml-8 bg-indigo-50" : "mr-8 bg-white border"}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="text-xs text-zinc-400">{busy}</div>}
      </div>

      {reply && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs">
          Replying to “{reply.req.highlight.text}”
          <textarea className="mt-1 w-full rounded border p-1" rows={2} value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} />
          <div className="flex gap-2">
            <Btn disabled={!reply.text.trim() || !!busy} onClick={sendReply}>Send reply</Btn>
            <button onClick={() => setReply(null)}>cancel</button>
          </div>
        </div>
      )}

      {persona && (
        <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), input.trim() && send(input.trim()))}>
          <input className="flex-1 rounded border px-2 py-1 text-sm" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something to the persona…" />
          <Btn disabled={!!busy || !input.trim()}>Send</Btn>
        </form>
      )}
      {persona && <p className="text-[11px] text-zinc-400">Select text in a persona message to ask the advisor or reply to it. Chat avg {avg}ms.</p>}
      <div>
        <div className="text-xs font-semibold">Last exchange → tree</div>
        <UpdateList updates={lastUpdates} idea={idea} />
      </div>
      <Err e={err} />
    </div>
  );
}

// ---------------- Graveyard (Ethan) ----------------
type Grave = { name: string; years: string; epitaph: string; raised?: string; similarity: number; story: string; threatens: PillarKey; sources: string[]; haunt: Update; learn: Update };
type Detail = { name: string; causeTags: string[]; causeOneWord: string; timeline: { year: number; event: string }[]; lesson: string; quote?: { text: string; url: string }; threatens: { pillar: string; weight: number }[] };

export function GraveyardPanel({ idea, onUpdates }: { idea: Idea; onUpdates: (u: Update[]) => void }) {
  const [graves, setGraves] = useState<Grave[] | null>(null);
  const [adjacent, setAdjacent] = useState(false);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [open, setOpen] = useState<string>("");
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ms, setMs] = useState(0);

  const visit = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ graves: Grave[]; adjacent: boolean }>("/api/graveyard", { idea });
      setGraves(r.data.graves);
      setAdjacent(r.data.adjacent);
      setMs(r.ms);
      setUsed({});
    } catch (e) {
      setErr(String(e));
    }
    setBusy(false);
  };
  const showDetail = async (name: string) => {
    setOpen(open === name ? "" : name);
    if (Object.keys(details).length) return;
    try {
      const r = await api<{ records: Detail[] }>("/api/graveyard/detail", { idea });
      setDetails(Object.fromEntries(r.data.records.map((d) => [d.name, d])));
    } catch (e) {
      setErr(String(e));
    }
  };
  const use = (g: Grave, kind: "haunt" | "learn") => {
    setUsed((u) => ({ ...u, [`${g.name}:${kind}`]: true }));
    onUpdates([g[kind]]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Btn disabled={busy} onClick={visit}>{busy ? "Digging up the dead…" : graves ? "Revisit graveyard" : "Visit the graveyard"}</Btn>
        {ms > 0 && <span className="text-xs text-zinc-400">{ms}ms</span>}
      </div>
      {graves && adjacent && <p className="rounded bg-zinc-100 p-2 text-xs">No close match: these failed in adjacent markets.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {graves?.map((g) => {
          const d = details[g.name];
          return (
            <div key={g.name} className="rounded-t-[40px] border-2 border-zinc-300 bg-gradient-to-b from-zinc-100 to-white p-3 text-xs">
              <div className="text-center">
                <div className="text-base font-bold">{g.name}</div>
                <div className="text-zinc-500">{g.years}{g.raised ? ` · raised ${g.raised}` : ""}</div>
                <div className="my-1 italic">“{g.epitaph}”</div>
                <div>similarity <b>{g.similarity}</b> · threatens <b>{g.threatens}</b></div>
              </div>
              <p className="mt-2 text-zinc-700">{g.story}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {g.sources.map((s, i) => <a key={i} href={s} target="_blank" rel="noreferrer" className="text-indigo-600 underline">source {i + 1}</a>)}
                <button className="ml-auto underline" onClick={() => showDetail(g.name)}>{open === g.name ? "less" : "more"}</button>
              </div>
              {open === g.name && d && (
                <div className="mt-1 rounded bg-white p-2">
                  <div>Cause: <b>{d.causeOneWord}</b> ({d.causeTags.join(", ")})</div>
                  <ul>{d.timeline.map((t, i) => <li key={i}>{t.year}: {t.event}</li>)}</ul>
                  {d.quote && <div className="italic">“{d.quote.text}”</div>}
                  <div>Lesson: {d.lesson}</div>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <button disabled={used[`${g.name}:haunt`]} onClick={() => use(g, "haunt")} className="rounded bg-purple-600 px-2 py-1 text-white disabled:opacity-40">👻 Let it haunt ({g.haunt.delta})</button>
                <button disabled={used[`${g.name}:learn`]} onClick={() => use(g, "learn")} className="rounded bg-emerald-600 px-2 py-1 text-white disabled:opacity-40">Learn: {g.learn.newChoice?.label}</button>
              </div>
            </div>
          );
        })}
      </div>
      <Err e={err} />
    </div>
  );
}

// ---------------- Launch Day (Ethan) ----------------
export function LaunchPanel({ idea, onUpdates }: { idea: Idea; onUpdates: (u: Update[]) => void }) {
  const [scene, setScene] = useState<SceneSpec | null>(null);
  const [personas, setPersonas] = useState<SimPersona[]>([]);
  const [results, setResults] = useState<SimResult[]>([]);
  const [summary, setSummary] = useState<LaunchSummary | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [price, setPrice] = useState(8);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const launch = async (p = price) => {
    setErr("");
    try {
      let sc = scene;
      let ps = personas;
      if (!sc) {
        setBusy("Setting the scene…");
        sc = (await api<{ scene: SceneSpec }>("/api/launch/scene", { idea })).data.scene;
        setScene(sc);
      }
      if (!ps.length) {
        setBusy("Casting customers…");
        ps = (await api<{ personas: SimPersona[] }>("/api/launch/personas", { idea, scene: sc })).data.personas;
        setPersonas(ps);
      }
      setBusy(`Launching at $${p}…`);
      const r = await api<{ results: SimResult[]; summary: LaunchSummary; updates: Update[] }>("/api/launch/run", { idea, scene: sc, personas: ps, price: p });
      setResults(r.data.results);
      setSummary(r.data.summary);
      setUpdates(r.data.updates);
    } catch (e) {
      setErr(String(e));
    }
    setBusy("");
  };

  // Slider re-decides locally with the shared decide() rule.
  const local = results.map((r) => ({ r, d: decide(r, price) }));
  const count = (d: string) => local.filter((x) => x.d === d).length;
  const color: Record<string, string> = { buy: "bg-emerald-500", curious: "bg-amber-400", leave: "bg-zinc-300" };

  return (
    <div className="space-y-2 text-xs">
      <Btn disabled={!!busy} onClick={() => launch()}>{busy || (results.length ? "Re-run at this price" : "Launch!")}</Btn>
      {scene && (
        <div className="rounded bg-zinc-50 p-2">
          <b>{scene.center.icon} {scene.center.label}</b> · {scene.groups.map((g) => `${g.name} (${g.count} ${g.figure})`).join(", ")}
        </div>
      )}
      {!!results.length && (
        <>
          <label className="block">
            Price: <b>${price}</b>
            <input type="range" min={0} max={40} value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full" />
          </label>
          <div className="flex gap-3">
            <span>{scene?.verbs.buy ?? "buy"}: <b>{count("buy")}</b></span>
            <span>{scene?.verbs.curious ?? "curious"}: <b>{count("curious")}</b></span>
            <span>{scene?.verbs.leave ?? "leave"}: <b>{count("leave")}</b></span>
          </div>
          <div className="flex flex-wrap gap-1">
            {local.map(({ r, d }) => {
              const p = personas.find((x) => x.id === r.personaId);
              return <div key={r.personaId} title={`${p?.name}: ${r.reason} (max $${r.maxPrice})`} className={`h-5 w-5 rounded-full ${color[d]}`} />;
            })}
          </div>
          <ul className="max-h-40 overflow-auto">
            {local.map(({ r, d }) => {
              const p = personas.find((x) => x.id === r.personaId);
              return <li key={r.personaId}><b>{p?.name}</b> — {d} (max ${r.maxPrice}) · {r.reason}{r.tellsFriend ? " · tells a friend" : ""}</li>;
            })}
          </ul>
        </>
      )}
      {summary && (
        <div className="rounded bg-zinc-50 p-2">
          Summary at ${summary.price}: {summary.buy} buy / {summary.curious} curious / {summary.leave} leave · drop-off at ${summary.dropOffPrice}
          <ul>{summary.topObjections.map((o, i) => <li key={i}>“{o.text}” ×{o.count} ({o.pillar})</li>)}</ul>
        </div>
      )}
      {!!updates.length && (
        <>
          <UpdateList updates={updates} idea={idea} />
          <Btn onClick={() => (onUpdates(updates), setUpdates([]))}>Apply to tree</Btn>
        </>
      )}
      <Err e={err} />
    </div>
  );
}

// ---------------- Team drawer (Greg) ----------------
export function TeamPanel({ idea, team, setTeam, onUpdates }: { idea: Idea; team: TeamProfile; setTeam: (t: TeamProfile) => void; onUpdates: (u: Update[]) => void }) {
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const list = (k: "roles" | "skills" | "tech") => (
    <label className="block">
      {k}
      <input className="w-full rounded border px-2 py-1" value={team[k].join(", ")} onChange={(e) => setTeam({ ...team, [k]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
    </label>
  );
  const check = async () => {
    setBusy(true);
    setErr("");
    try {
      setUpdates((await api<{ updates: Update[] }>("/api/feasibility", { idea, team })).data.updates);
    } catch (e) {
      setErr(String(e));
    }
    setBusy(false);
  };
  return (
    <div className="space-y-2 text-xs">
      {list("roles")}
      {list("skills")}
      {list("tech")}
      <div className="flex gap-2">
        <label>hours/week <input type="number" className="w-16 rounded border px-1" value={team.hoursPerWeek ?? ""} onChange={(e) => setTeam({ ...team, hoursPerWeek: e.target.value ? +e.target.value : undefined })} /></label>
        <label>budget <input className="w-24 rounded border px-1" value={team.budget ?? ""} onChange={(e) => setTeam({ ...team, budget: e.target.value || undefined })} /></label>
      </div>
      <Btn disabled={busy} onClick={check}>{busy ? "Checking…" : "Check feasibility"}</Btn>
      {updates && !updates.length && <p>Nothing to flag.</p>}
      {updates && !!updates.length && (
        <>
          <ul>{updates.map((u, i) => <li key={i}>{describeUpdate(u, idea)} — {u.feasibility?.note}</li>)}</ul>
          <Btn onClick={() => (onUpdates(updates), setUpdates(null))}>Apply to tree</Btn>
        </>
      )}
      <Err e={err} />
    </div>
  );
}

// ---------------- History ----------------
export function HistoryPanel({ idea }: { idea: Idea }) {
  const h = [...idea.history].reverse() as Update[];
  return h.length ? <UpdateList updates={h} idea={idea} /> : <p className="text-xs text-zinc-400">No changes yet.</p>;
}
