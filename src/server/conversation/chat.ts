import { z } from "zod";
import { askJSON, MODELS, type ChatMessage, type ChatReq, type ChatRes } from "./deps";
import { promptsFor } from "./modes";
import { personaContext } from "./persona";
import { choiceLine, pillarLabel, treeText } from "./treeText";
import { clamp, DEADLINES, withDeadline } from "./util";

const ChatSchema = z.object({
  reply: z.string(),
  wouldBuy: z.number().describe("0-100, as defined for your role"),
});

export function renderTranscript(messages: ChatMessage[], personaName: string): string {
  return messages.map((m) => `${m.from === "founder" ? "Founder" : personaName}: ${m.text}`).join("\n");
}

export function chatSystem(req: ChatReq): string {
  const { idea, persona, focusChoiceId, highlight } = req;
  const focus = idea.choices.find((c) => c.id === focusChoiceId);
  const hlChoice = highlight?.choiceId ? idea.choices.find((c) => c.id === highlight.choiceId) : undefined;
  const P = promptsFor(idea);
  const nonprofit = idea.mode === "nonprofit";
  const hlPillar = highlight?.pillar && (nonprofit ? pillarLabel(highlight.pillar, idea.mode) : highlight.pillar);
  const parts = [
    `You are role-playing in ${P.simulator}.`,
    `## Your persona\n${personaContext(persona, idea.mode)}`,
    `## Your role\n${P.roleRules[persona.role]}`,
    P.sharedRules,
    `## ${nonprofit ? "The nonprofit plan" : "The startup"} you're talking about\n${treeText(idea)}`,
  ];
  if (focus) parts.push(`## The founder wants to test this choice\n${choiceLine(focus, idea.mode)}\n${focus.detail}`);
  if (highlight?.text)
    parts.push(
      `## The founder highlighted this text\n"""${highlight.text}"""` +
        (hlChoice ? `\n(on choice ${choiceLine(hlChoice, idea.mode)})` : hlPillar ? `\n(on the ${hlPillar} pillar)` : "")
    );
  return parts.join("\n\n");
}

export async function runChat(req: ChatReq): Promise<ChatRes> {
  const { persona, messages } = req;
  const subject = req.idea.mode === "nonprofit" ? "the program" : "the startup";
  const prompt = messages.length
    ? `Conversation so far:\n${renderTranscript(messages, persona.name)}\n\nWrite ${persona.name}'s next reply and your current wouldBuy.`
    : `The conversation is just starting. Write ${persona.name}'s opening line: introduce yourself in a few words and open with your first reaction, objection or question about ${subject}. Also give your starting wouldBuy.`;

  const out = await withDeadline(
    askJSON({
      system: chatSystem(req),
      prompt,
      schema: ChatSchema,
      model: MODELS.main,
      effort: "low",
      maxTokens: 1500,
    }),
    DEADLINES.chat,
    "chat"
  );
  return { reply: out.reply.trim(), wouldBuy: Math.round(clamp(out.wouldBuy, 0, 100)) };
}
