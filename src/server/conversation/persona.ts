import { z } from "zod";
import { askJSON, MODELS, type Idea, type Persona, type PersonaRole } from "./deps";
import { promptsFor } from "./modes";
import { activeChoices, DEADLINES, newId, overlap, withDeadline } from "./util";

type Complaint = Idea["research"]["complaints"][number];

/** The complaint most related to the focused choice, or a random one. */
export function pickComplaint(idea: Idea, choiceId?: string): Complaint | undefined {
  const complaints = idea.research?.complaints ?? [];
  if (!complaints.length) return undefined;
  const choice = activeChoices(idea).find((c) => c.id === choiceId) ?? idea.choices.find((c) => c.id === choiceId);
  if (choice) {
    const target = `${choice.label} ${choice.sub} ${choice.detail}`;
    const scored = complaints.map((c) => ({ c, s: overlap(target, c.text) })).sort((a, b) => b.s - a.s);
    if (scored[0].s > 0) return scored[0].c;
  }
  return complaints[Math.floor(Math.random() * complaints.length)];
}

const CustomerSchema = z.object({
  name: z.string().describe('First name plus a short descriptor, e.g. "Dana, weekend angler"'),
  blurb: z.string().describe("One sentence on who they are and what burned them, in third person"),
});

export async function makePersona(idea: Idea, role: PersonaRole, choiceId?: string): Promise<Persona> {
  const id = newId(8);
  const P = promptsFor(idea);
  const nonprofit = idea.mode === "nonprofit";
  switch (role) {
    case "customer": {
      const complaint = pickComplaint(idea, choiceId);
      const focus = activeChoices(idea).find((c) => c.id === choiceId);
      const customerChoice = activeChoices(idea)
        .filter((c) => c.pillar === "customer")
        .sort((a, b) => b.confidence - a.confidence)[0];
      try {
        const out = await withDeadline(askJSON({
          system: P.customerPersonaSystem,
          model: MODELS.fast,
          effort: "low",
          maxTokens: 400,
          schema: CustomerSchema,
          prompt: [
            nonprofit ? `Nonprofit mission: ${idea.pitch}` : `Startup pitch: ${idea.pitch}`,
            customerChoice
              ? `${nonprofit ? "People served" : "Target customer"}: ${customerChoice.label} – ${customerChoice.sub}`
              : "",
            focus ? `The founder wants to test: ${focus.label} – ${focus.sub}` : "",
            complaint
              ? `Real ${nonprofit ? "community voice" : "complaint"} this persona is based on (${complaint.where}):\n"""${complaint.text}"""`
              : P.customerPersonaNoComplaint,
          ]
            .filter(Boolean)
            .join("\n"),
        }), DEADLINES.persona, "persona");
        return { id, role, name: out.name.slice(0, 60), blurb: out.blurb.slice(0, 300), basedOn: complaint };
      } catch (e) {
        console.error("[persona] customer fallback", e);
        return {
          id,
          role,
          name: `Alex, ${customerChoice?.label.toLowerCase() ?? (nonprofit ? "neighbor" : "potential customer")}`,
          blurb: complaint
            ? `Wrote: "${complaint.text.slice(0, 140)}"`
            : nonprofit
              ? "A busy neighbor the program hopes to serve, wary of new programs."
              : "A skeptical potential customer.",
          basedOn: complaint,
        };
      }
    }
    case "competitor": {
      const comp = idea.research?.competitors?.[0];
      return { id, role, ...P.fixedPersona.competitor(comp?.name, comp?.summary) };
    }
    case "investor":
      return { id, role, ...P.fixedPersona.investor() };
    case "advisor":
      return { id, role, ...P.fixedPersona.advisor() };
  }
}

/** Describes a persona tersely for prompts. */
export function personaContext(p: Persona, mode?: string): string {
  const kind = mode === "nonprofit" ? "community voice" : "complaint";
  const lines = [`Name: ${p.name}`, `About: ${p.blurb}`];
  if (p.basedOn) lines.push(`Based on this real ${kind} (${p.basedOn.where}): "${p.basedOn.text}"`);
  return lines.join("\n");
}
