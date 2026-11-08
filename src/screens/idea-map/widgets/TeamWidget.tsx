"use client";

// Team: who's building this, saved to the founder's account (ctx.saveTeam → ideaStore().saveTeam).
// "Save and check" then asks /api/feasibility whether
// the team can realistically build each choice; flagged choices are weakened on the tree with
// a note, and choices that play to the team's strengths are strengthened.
import { useState, type FormEvent } from "react";
import { checkFeasibility } from "@/ideas/api";
import type { WireUpdate } from "@/ideas/wire";
import type { TeamProfile } from "@/lib/types";
import type { Change, WidgetCtx } from "./types";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

interface Note {
  ok: boolean;
  label: string;
  note: string;
}

export default function TeamWidget({ ctx }: { ctx: WidgetCtx }) {
  const t = ctx.team ?? { roles: [], skills: [], tech: [] };
  const [roles, setRoles] = useState(t.roles.join(", "));
  const [skills, setSkills] = useState(t.skills.join(", "));
  const [tech, setTech] = useState(t.tech.join(", "));
  const [hours, setHours] = useState(t.hoursPerWeek ? String(t.hoursPerWeek) : "");
  const [budget, setBudget] = useState(t.budget ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const team: TeamProfile = {
      roles: list(roles),
      skills: list(skills),
      tech: list(tech),
      ...(Number(hours) > 0 ? { hoursPerWeek: Number(hours) } : {}),
      ...(budget.trim() ? { budget: budget.trim() } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      await ctx.saveTeam(team);
      const idea = ctx.buildIdea();
      const updates = await checkFeasibility(idea, team);
      const byId = new Map(idea.choices.map((c) => [c.id, c.label]));
      setNotes(
        updates
          .filter((u) => u.feasibility)
          .map((u) => ({ ok: !!u.feasibility?.ok, label: byId.get(u.choiceId ?? "") ?? "A choice", note: u.feasibility?.note ?? "" }))
      );
      setChanges(updates.length ? ctx.applyWidget(updates as WireUpdate[], "Team check", false) : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Nonprofit wording: a program is run (often by volunteers), not built.
  const np = ctx.buildIdea()?.mode === "nonprofit";
  const copy = np
    ? { eyebrow: "Who's running it · checked against every choice", skills: "e.g. teaching, fundraising", tech: "e.g. Google Forms, Canva", hours: "Volunteer hours / week", ok: "Every choice looks doable with this team." }
    : { eyebrow: "Who's building it · checked against every choice", skills: "e.g. iOS, sales", tech: "e.g. React, Figma", hours: "Hours / week", ok: "Every choice looks buildable with this team." };

  const field = (label: string, hint: string, value: string, set: (v: string) => void, type = "text") => (
    <label className="tm-label">
      <span>
        {label} {hint ? <span className="tm-hint">{hint}</span> : null}
      </span>
      <input className="im-input tm-input" type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(e) => set(e.target.value)} disabled={busy} />
    </label>
  );

  return (
    <section className="wg-panel" aria-label="Team">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 className="wg-title">Team</h2>
        <span className="wg-eyebrow">{copy.eyebrow}</span>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {field("Roles", "comma-separated", roles, setRoles)}
        {field("Skills", copy.skills, skills, setSkills)}
        {field("Tools and tech", copy.tech, tech, setTech)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {field(copy.hours, "", hours, setHours, "number")}
          {field("Budget", "", budget, setBudget)}
        </div>
        <button type="submit" className="wg-btn" disabled={busy}>
          {busy ? "Checking…" : "Save and check feasibility"}
        </button>
      </form>

      {error ? (
        <div className="wg-error" role="alert">
          <span>{error}</span>
        </div>
      ) : null}

      {notes ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} aria-live="polite">
          <span className="wg-eyebrow">{notes.length ? "What the check found" : "Nothing to flag"}</span>
          {!notes.length ? <p className="wg-muted">{copy.ok}</p> : null}
          {notes.map((n, i) => (
            <div key={i} className="tm-note" style={{ borderLeftColor: n.ok ? "var(--green)" : "var(--red)" }}>
              <b>{n.label}</b>
              <span>{n.note}</span>
            </div>
          ))}
          {changes.length ? (
            <span className="wg-muted" style={{ fontSize: "12px" }}>
              {changes.length} {changes.length === 1 ? "choice" : "choices"} updated on the tree.
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
