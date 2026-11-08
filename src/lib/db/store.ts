// Where Ideas and the team card are kept, behind one interface.
//
// Two implementations:
//   - supabase: signed-in accounts, rows in public.ideas / public.profiles under RLS.
//   - local:    guests and the no-Supabase stub, browser localStorage. No rows.
// ideaStore() picks one from the current session. Routes never import this;
// they are pure functions over an Idea, and the client saves after applying
// updates.
import type { Mode, TeamProfile } from "@/lib/types";
import { Session } from "@/session";
import { supabaseClient, supabaseConfigured } from "@/session/supabase";
import { pillarScores, validateSources, type StoredIdea } from "./schema";

/** What the ideas list needs, without the document. */
export interface IdeaSummary {
  id: string;
  title: string;
  description: string;
  mode: Mode;
  pillarScores: number[]; // 8 values, 0-1
  createdAt: number;
  updatedAt: number;
}

export interface IdeaStore {
  readonly backend: "supabase" | "local";
  list(): Promise<IdeaSummary[]>;
  get(id: string): Promise<StoredIdea | null>;
  /** Validates citations, then upserts. Returns the idea as saved. */
  save(idea: StoredIdea): Promise<StoredIdea>;
  remove(id: string): Promise<void>;
  getTeam(): Promise<TeamProfile | null>;
  saveTeam(team: TeamProfile): Promise<void>;
}

// ---------- local ----------

const IDEAS_KEY = "ideamap.ideas";
const TEAM_KEY = "ideamap.team";

type LocalRow = { idea: StoredIdea; updatedAt: number };

const readLocal = (): Record<string, LocalRow> => {
  try {
    return JSON.parse(localStorage.getItem(IDEAS_KEY) || "{}") as Record<string, LocalRow>;
  } catch {
    return {};
  }
};
const writeLocal = (rows: Record<string, LocalRow>) => {
  try {
    localStorage.setItem(IDEAS_KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable: the idea lives in memory for this page only */
  }
};

const summarize = (idea: StoredIdea, updatedAt: number): IdeaSummary => ({
  id: idea.id,
  title: idea.title,
  description: idea.description,
  mode: idea.mode,
  pillarScores: pillarScores(idea),
  createdAt: idea.createdAt,
  updatedAt,
});

export const localStore: IdeaStore = {
  backend: "local",
  async list() {
    return Object.values(readLocal())
      .map((r) => summarize(r.idea, r.updatedAt))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    return readLocal()[id]?.idea ?? null;
  },
  async save(input) {
    const { idea } = validateSources(input);
    const rows = readLocal();
    rows[idea.id] = { idea, updatedAt: Date.now() };
    writeLocal(rows);
    return idea;
  },
  async remove(id) {
    const rows = readLocal();
    delete rows[id];
    writeLocal(rows);
  },
  async getTeam() {
    try {
      return JSON.parse(localStorage.getItem(TEAM_KEY) || "null") as TeamProfile | null;
    } catch {
      return null;
    }
  },
  async saveTeam(team) {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(team));
    } catch {
      /* see writeLocal */
    }
  },
};

// ---------- supabase ----------

interface IdeaRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  mode: Mode;
  pillar_scores: number[];
  doc: StoredIdea;
  created_at: string;
  updated_at: string;
}

const userId = async (): Promise<string> => {
  const { data, error } = await supabaseClient().auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
};

export const supabaseStore: IdeaStore = {
  backend: "supabase",
  async list() {
    const { data, error } = await supabaseClient()
      .from("ideas")
      .select("id, title, description, mode, pillar_scores, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as Omit<IdeaRow, "owner_id" | "doc">[]).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      mode: r.mode,
      pillarScores: r.pillar_scores,
      createdAt: Date.parse(r.created_at),
      updatedAt: Date.parse(r.updated_at),
    }));
  },
  async get(id) {
    const { data, error } = await supabaseClient().from("ideas").select("doc").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data?.doc as StoredIdea | undefined) ?? null;
  },
  async save(input) {
    const { idea } = validateSources(input);
    const row = {
      id: idea.id,
      owner_id: await userId(),
      title: idea.title,
      description: idea.description,
      mode: idea.mode,
      pillar_scores: pillarScores(idea),
      doc: idea,
    };
    const { error } = await supabaseClient().from("ideas").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return idea;
  },
  async remove(id) {
    const { error } = await supabaseClient().from("ideas").delete().eq("id", id);
    if (error) throw error;
  },
  async getTeam() {
    const { data, error } = await supabaseClient().from("profiles").select("team").maybeSingle();
    if (error) throw error;
    return (data?.team as TeamProfile | undefined) ?? null;
  },
  async saveTeam(team) {
    const { error } = await supabaseClient()
      .from("profiles")
      .upsert({ user_id: await userId(), team }, { onConflict: "user_id" });
    if (error) throw error;
  },
};

// ---------- selection ----------

/**
 * The store for the current session. Signed-in accounts on Supabase get rows;
 * guests ("demo") and the local stub stay in the browser.
 */
export function ideaStore(): IdeaStore {
  const s = Session.getSession();
  return supabaseConfigured && s?.mode === "full" ? supabaseStore : localStore;
}
