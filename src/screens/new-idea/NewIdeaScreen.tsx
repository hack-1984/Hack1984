"use client";

// "Plant a new seed": name + description in, a researched idea map out.
// The description is sent to POST /api/tree as the pitch (it's what research
// searches on). The name stays on the frontend with the saved idea, since the
// backend Idea has no field for it.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Session } from "@/session";
import { createIdea } from "@/ideas/store";
import { profileFor } from "@/lib/modes";
import type { Mode } from "@/lib/types";
import "./new-idea.css";

const MIN_DESCRIPTION = 20;

type Phase = "idle" | "planting" | "error";

/**
 * What kind of thing is being planted.
 *
 * It has to be chosen here and not later: mode decides which research runs,
 * and the tree is built once. The hint under each one is the real difference
 * — a nonprofit's money and its people are not the same people.
 */
const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: "startup", label: "Startup", hint: "Customers pay for it" },
  { mode: "nonprofit", label: "Nonprofit", hint: "Funders pay, a community benefits" },
];

export default function NewIdeaScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("startup");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ name: false, description: false });
  const planted = useRef(false);

  // Same sign-in check as the ideas dashboard.
  useEffect(() => {
    let live = true;
    Session.ready().then(() => {
      if (live && !Session.getSession()) router.replace("/login");
    });
    return () => {
      live = false;
    };
  }, [router]);

  // Next keeps this page alive (hidden) after we leave. Once a seed is planted,
  // start fresh next time; if the founder only cancelled, keep their draft.
  useLayoutEffect(() => {
    return () => {
      if (!planted.current) return;
      planted.current = false;
      setName("");
      setMode("startup");
      setDescription("");
      setTouched({ name: false, description: false });
      setPhase("idle");
    };
  }, []);

  const nameOk = name.trim().length > 0;
  const length = description.trim().length;
  const descriptionOk = length >= MIN_DESCRIPTION;
  const valid = nameOk && descriptionOk;

  async function plant(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || phase === "planting") return;
    setPhase("planting");
    setError("");
    try {
      const saved = await createIdea({ name, description, mode });
      planted.current = true;
      router.push(`/map?id=${encodeURIComponent(saved.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setPhase("error");
    }
  }

  return (
    <div className="pg-new">
      <main className="nw-main">
        <div className="nw-card">
          <Link href="/sessions" aria-label="Sprout, back to your ideas" className="nw-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sprout-logo-black.svg" alt="Sprout" width={100} height={28} />
          </Link>

          {phase === "planting" ? (
            <div className="nw-planting" role="status" aria-live="polite">
              <svg className="nw-seed" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 20h10" />
                <path d="M10 20c5.5-2.5.8-6.4 3-10" />
                <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
                <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
              </svg>
              <h1 className="nw-h1">Planting your seed…</h1>
              <p className="nw-sub">
                Researching {mode === "nonprofit" ? "the need" : "the market"} for{" "}
                <strong>{name.trim()}</strong>. This can take up to a minute.
              </p>
            </div>
          ) : (
            <form onSubmit={plant} noValidate className="nw-form">
              <div className="nw-head">
                <h1 className="nw-h1">Plant a new seed</h1>
                <p className="nw-sub">
                  Name your idea and describe it. Sprout researches{" "}
                  {mode === "nonprofit" ? "the need and who else is serving it" : "your market"} from the description.
                </p>
              </div>

              <fieldset className="nw-field nw-modes-field">
                <legend className="nw-label">Kind</legend>
                <div className="nw-modes" role="radiogroup" aria-label="What kind of idea is this?">
                  {MODES.map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      role="radio"
                      aria-checked={mode === m.mode}
                      className={`nw-mode${mode === m.mode ? " nw-mode-on" : ""}`}
                      onClick={() => setMode(m.mode)}
                    >
                      <span className="nw-mode-label">{m.label}</span>
                      <span className="nw-mode-hint">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="nw-field">
                <span className="nw-label">Name</span>
                <input
                  className="nw-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="Bite forecast"
                  required
                  maxLength={60}
                  autoComplete="off"
                  aria-invalid={touched.name && !nameOk}
                  aria-describedby={touched.name && !nameOk ? "nw-name-err" : undefined}
                />
                {touched.name && !nameOk ? (
                  <span id="nw-name-err" className="nw-hint nw-hint-bad">Give your idea a name.</span>
                ) : null}
              </label>

              <label className="nw-field">
                <span className="nw-label">Description</span>
                <textarea
                  className="nw-input nw-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  placeholder={profileFor(mode).pitchPlaceholder}
                  required
                  minLength={MIN_DESCRIPTION}
                  maxLength={600}
                  rows={4}
                  aria-invalid={touched.description && !descriptionOk}
                  aria-describedby="nw-desc-hint nw-desc-count"
                />
                <span className="nw-row">
                  <span id="nw-desc-hint" className="nw-hint">
                    Be specific: who it&apos;s for, the problem it solves, and where.
                  </span>
                  <span
                    id="nw-desc-count"
                    className={`nw-count${touched.description && !descriptionOk ? " nw-hint-bad" : descriptionOk ? " nw-count-ok" : ""}`}
                    aria-live="polite"
                  >
                    {descriptionOk ? `${length} characters` : `${length} / ${MIN_DESCRIPTION} min`}
                  </span>
                </span>
              </label>

              {phase === "error" ? (
                <div role="alert" className="nw-error">
                  <span>{error}</span>
                  <button type="button" className="nw-btn nw-btn-secondary nw-retry" onClick={() => plant()}>
                    Try again
                  </button>
                </div>
              ) : null}

              <div className="nw-actions">
                <Link href="/sessions" className="nw-btn nw-btn-secondary">
                  Cancel
                </Link>
                <button type="submit" className="nw-btn nw-btn-primary" disabled={!valid}>
                  Plant it
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
