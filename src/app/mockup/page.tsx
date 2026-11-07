"use client";
// /mockup — a basic, throwaway stand-in for Greg's and Ethan's screens, wired to
// the real routes so the whole loop can be exercised before the real UI lands.
// Works in both MOCK_AI=1 and live mode (whatever the server is running).
import { useRef, useState } from "react";
import { FIXTURE_IDEA } from "@/data/fixture-idea";
import type { Idea, PillarKey, TeamProfile } from "@/lib/types";
import { applyUpdates, describeUpdate, setStatus, type Update } from "./lib";
import { ChatPanel, GraveyardPanel, HistoryPanel, IntakePanel, LaunchPanel, TeamPanel, type ChatHandle } from "./panels";
import { BuildModal, ChoiceDetail, Tree } from "./tree";

const TABS = ["intake", "chat", "graveyard", "launch", "team", "history"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  intake: "Intake",
  chat: "Chat",
  graveyard: "Graveyard",
  launch: "Launch Day",
  team: "Team",
  history: "History",
};

type SelBar = { text: string; x: number; y: number; choiceId?: string; pillar?: PillarKey; msgIndex?: number };

export default function MockupPage() {
  const [idea, setIdea] = useState<Idea>(FIXTURE_IDEA);
  const [selected, setSelected] = useState<string>();
  const [flash, setFlash] = useState<string[]>([]);
  const [toast, setToast] = useState<Update[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [team, setTeam] = useState<TeamProfile>({ roles: ["founder"], skills: ["product"], tech: ["web"], hoursPerWeek: 20 });
  const [building, setBuilding] = useState(false);
  const [sel, setSel] = useState<SelBar | null>(null);
  const chat = useRef<ChatHandle>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onUpdates = (ups: Update[]) => {
    if (!ups.length) return;
    setIdea((prev) => {
      const { idea: next, changed } = applyUpdates(prev, ups);
      setFlash(changed);
      return next;
    });
    setToast(ups);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => (setFlash([]), setToast([])), 3500);
  };

  const onMouseUp = () => {
    const s = window.getSelection();
    const text = s?.toString().trim() ?? "";
    if (!s || text.length < 3 || !s.rangeCount) return setSel(null);
    const node = s.anchorNode instanceof Element ? s.anchorNode : s.anchorNode?.parentElement;
    const host = node?.closest<HTMLElement>("[data-msg-index],[data-highlight-choice]");
    if (!host) return setSel(null);
    const rect = s.getRangeAt(0).getBoundingClientRect();
    setSel({
      text: text.slice(0, 300),
      x: rect.left + rect.width / 2,
      y: rect.top,
      choiceId: host.dataset.highlightChoice,
      pillar: host.dataset.highlightPillar as PillarKey | undefined,
      msgIndex: host.dataset.msgIndex !== undefined ? Number(host.dataset.msgIndex) : undefined,
    });
  };

  const fire = (mode: "ask" | "reply") => {
    if (!sel) return;
    chat.current?.highlight({ mode, msgIndex: sel.msgIndex, highlight: { text: sel.text, choiceId: sel.choiceId, pillar: sel.pillar } });
    setTab("chat");
    setSel(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900" onMouseUp={onMouseUp}>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-white px-4 py-2">
        <b>Idea Tree</b>
        <span className="rounded bg-amber-100 px-2 text-[11px] text-amber-800">mockup · not the real UI</span>
        <span className="text-xs text-zinc-500">{idea.choices.filter((c) => c.status === "active").length} active choices · {idea.history.length} changes</span>
        <button onClick={() => setBuilding(true)} className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white">Build ▸</button>
      </header>

      <main className="grid gap-4 p-4 xl:grid-cols-[1fr_440px]">
        <section className="space-y-3">
          <Tree idea={idea} selectedId={selected} flashIds={flash} onSelect={setSelected} />
          {selected && (
            <ChoiceDetail
              idea={idea}
              id={selected}
              onAccept={() => setIdea((i) => setStatus(i, selected, "active"))}
              onDismiss={() => setIdea((i) => setStatus(i, selected, "killed"))}
              onClose={() => setSelected(undefined)}
            />
          )}
        </section>

        <aside className="rounded-xl bg-white p-3 xl:sticky xl:top-14 xl:max-h-[calc(100vh-4.5rem)] xl:overflow-auto">
          <nav className="mb-3 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs ${tab === t ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </nav>
          {/* Keep panels mounted so their state survives tab switches. */}
          <div hidden={tab !== "intake"}><IntakePanel team={team} onIdea={(i) => (setIdea(i), setSelected(undefined))} onFixture={() => setIdea(FIXTURE_IDEA)} /></div>
          <div hidden={tab !== "chat"}><ChatPanel ref={chat} idea={idea} onUpdates={onUpdates} /></div>
          <div hidden={tab !== "graveyard"}><GraveyardPanel idea={idea} onUpdates={onUpdates} /></div>
          <div hidden={tab !== "launch"}><LaunchPanel idea={idea} onUpdates={onUpdates} /></div>
          <div hidden={tab !== "team"}><TeamPanel idea={idea} team={team} setTeam={setTeam} onUpdates={onUpdates} /></div>
          <div hidden={tab !== "history"}><HistoryPanel idea={idea} /></div>
        </aside>
      </main>

      {sel && (
        <div className="fixed z-50 flex -translate-x-1/2 -translate-y-full gap-1 rounded-lg bg-zinc-900 p-1 text-xs text-white shadow-lg" style={{ left: sel.x, top: sel.y - 6 }} onMouseUp={(e) => e.stopPropagation()}>
          <button className="rounded px-2 py-1 hover:bg-zinc-700" onClick={() => fire("ask")}>Ask advisor</button>
          {sel.msgIndex !== undefined && <button className="rounded px-2 py-1 hover:bg-zinc-700" onClick={() => fire("reply")}>Reply to this</button>}
        </div>
      )}

      {!!toast.length && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm space-y-1">
          {toast.map((u, i) => (
            <div key={i} className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs text-white shadow-lg">
              <b>{describeUpdate(u, idea)}</b>
              {u.quote && <div className="italic">“{u.quote}”</div>}
            </div>
          ))}
        </div>
      )}

      {building && <BuildModal idea={idea} onClose={() => setBuilding(false)} />}
    </div>
  );
}
