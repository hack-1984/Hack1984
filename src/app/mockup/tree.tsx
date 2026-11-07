"use client";
// Greg's tree screen (mockup): root pitch, 8 fixed pillars, choices with
// confidence colours, proposed (dashed) / killed (struck) states, haunt markers,
// a detail panel with evidence, and the Build button + modal.
import { useEffect, useState } from "react";
import type { Choice, Idea } from "@/lib/types";
import { PILLARS, api, confColor } from "./lib";

function ChoiceCard({ c, depth, selected, flash, onSelect }: { c: Choice; depth: number; selected: boolean; flash: boolean; onSelect: () => void }) {
  const col = confColor(c.confidence);
  const killed = c.status === "killed";
  const proposed = c.status === "proposed";
  return (
    <button
      onClick={onSelect}
      style={{ marginLeft: depth * 12, width: `calc(100% - ${depth * 12}px)` }}
      className={[
        "block text-left rounded-lg border-2 bg-white p-2 text-xs transition-all",
        proposed ? "border-dashed border-zinc-400" : killed ? "border-zinc-200 opacity-50" : col.ring,
        selected ? "ring-2 ring-indigo-500" : "",
        flash ? "animate-pulse ring-2 ring-fuchsia-400" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`font-semibold ${killed ? "line-through" : ""}`}>{c.label}</span>
        <span className={`font-mono ${col.text}`}>{Math.round(c.confidence)}</span>
      </div>
      <div className="text-zinc-500">{c.sub}</div>
      <div className="mt-1 h-1 w-full rounded bg-zinc-100">
        <div className={`h-1 rounded ${killed ? "bg-zinc-300" : col.bar}`} style={{ width: `${c.confidence}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {proposed && <span className="rounded bg-zinc-100 px-1 text-[10px]">proposed</span>}
        {c.marker && <span className="rounded bg-purple-100 px-1 text-[10px] text-purple-700">👻 {c.marker}</span>}
        {c.feasibility && (
          <span className={`rounded px-1 text-[10px] ${c.feasibility.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {c.feasibility.ok ? "feasible" : "not feasible"}
          </span>
        )}
      </div>
    </button>
  );
}

export function Tree({ idea, selectedId, flashIds, onSelect }: { idea: Idea; selectedId?: string; flashIds: string[]; onSelect: (id: string) => void }) {
  return (
    <div>
      <div className="mx-auto mb-4 max-w-xl rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white">{idea.pitch}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const inPillar = idea.choices.filter((c) => c.pillar === p.key);
          const roots = inPillar.filter((c) => !c.parentId || !inPillar.some((x) => x.id === c.parentId));
          const render = (c: Choice, depth: number): React.ReactNode[] => [
            <ChoiceCard key={c.id} c={c} depth={depth} selected={c.id === selectedId} flash={flashIds.includes(c.id)} onSelect={() => onSelect(c.id)} />,
            ...inPillar.filter((x) => x.parentId === c.id).flatMap((x) => render(x, depth + 1)),
          ];
          return (
            <div key={p.key} className="rounded-xl bg-zinc-50 p-2">
              <div className="mb-2">
                <div className="text-sm font-bold">{p.label}</div>
                <div className="text-[11px] text-zinc-500">{p.q}</div>
              </div>
              <div className="space-y-2">{roots.flatMap((c) => render(c, 0))}</div>
              {!inPillar.length && <div className="text-xs italic text-zinc-400">no choices</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChoiceDetail({ idea, id, onAccept, onDismiss, onClose }: { idea: Idea; id: string; onAccept: () => void; onDismiss: () => void; onClose: () => void }) {
  const c = idea.choices.find((x) => x.id === id);
  if (!c) return null;
  const history = idea.history.filter((u) => u.choiceId === id);
  return (
    <div className="rounded-xl border bg-white p-3 text-sm" data-highlight-choice={c.id} data-highlight-pillar={c.pillar}>
      <div className="flex justify-between">
        <div>
          <div className="text-xs uppercase text-zinc-500">
            {c.pillar} · [{c.id}] · {c.status}
          </div>
          <div className="font-semibold">{c.label}</div>
        </div>
        <button onClick={onClose} className="text-zinc-400">✕</button>
      </div>
      <p className="mt-1 text-zinc-700">{c.detail}</p>
      {c.feasibility && <p className="mt-1 text-xs">Feasibility: {c.feasibility.note}</p>}
      {c.plan && (
        <ul className="mt-1 text-xs">
          {c.plan.steps.map((s, i) => (
            <li key={i}>{c.plan!.done[i] ? "☑" : "☐"} {s}</li>
          ))}
        </ul>
      )}
      {c.status === "proposed" && (
        <div className="mt-2 flex gap-2">
          <button onClick={onAccept} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Accept pivot</button>
          <button onClick={onDismiss} className="rounded bg-zinc-200 px-2 py-1 text-xs">Dismiss</button>
        </div>
      )}
      <div className="mt-2 text-xs font-semibold">Evidence ({c.evidence.length})</div>
      <ul className="space-y-1 text-xs">
        {c.evidence.map((e, i) => (
          <li key={i} className="rounded bg-zinc-50 p-1">
            <span className="mr-1 rounded bg-zinc-200 px-1">{e.tier}</span>
            {e.type === "quote" ? `“${e.text}”` : e.text} <span className="text-zinc-400">— {e.origin}</span>
            {e.url && (
              <a className="ml-1 text-indigo-600 underline" href={e.url} target="_blank" rel="noreferrer">link</a>
            )}
          </li>
        ))}
      </ul>
      {!!history.length && (
        <>
          <div className="mt-2 text-xs font-semibold">Changes</div>
          <ul className="text-xs text-zinc-600">
            {history.map((u, i) => (
              <li key={i}>
                {u.action} {u.delta ?? ""} · {u.source} {u.quote && `· “${u.quote}”`}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-2 text-[11px] text-zinc-400">Tip: select any text here to ask the advisor about it.</p>
    </div>
  );
}

type BuildRes = { landing: { headline: string; subhead: string; bullets: string[]; cta: string }; pitchOutline: string[]; onePager: string };

export function BuildModal({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const [res, setRes] = useState<BuildRes | null>(null);
  const [err, setErr] = useState("");
  const [ms, setMs] = useState(0);
  useEffect(() => {
    api<BuildRes>("/api/build", { idea })
      .then((r) => (setRes(r.data), setMs(r.ms)))
      .catch((e) => setErr(String(e)));
    // Build once per open, from the idea as it was when clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-between">
          <h2 className="text-lg font-bold">Build {ms ? <span className="text-xs font-normal text-zinc-400">{ms}ms</span> : null}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {!res && !err && <p className="text-sm text-zinc-500">Building from your active choices…</p>}
        {res && (
          <div className="space-y-5 text-sm">
            <section className="rounded-xl bg-gradient-to-br from-indigo-50 to-white p-5 text-center">
              <div className="text-2xl font-bold">{res.landing.headline}</div>
              <p className="mt-1 text-zinc-600">{res.landing.subhead}</p>
              <ul className="mt-3 inline-block text-left">
                {res.landing.bullets.map((b, i) => <li key={i}>✓ {b}</li>)}
              </ul>
              <div><button className="mt-3 rounded-full bg-indigo-600 px-4 py-2 text-white">{res.landing.cta}</button></div>
            </section>
            <section>
              <h3 className="font-semibold">Pitch outline</h3>
              <ol className="list-decimal pl-5">{res.pitchOutline.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </section>
            <section>
              <h3 className="font-semibold">
                One-pager <span className="text-xs font-normal text-zinc-400">({res.onePager.split(/\s+/).length} words)</span>
                <button className="ml-2 rounded bg-zinc-100 px-2 text-xs" onClick={() => navigator.clipboard.writeText(res.onePager)}>copy</button>
              </h3>
              <p className="whitespace-pre-wrap text-zinc-700">{res.onePager}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
