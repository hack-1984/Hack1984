// Supabase implementation of SessionApi: email + password, Google OAuth, and
// anonymous sign-in for guests (mode "demo"). Browser-only; the client is created lazily.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { clearCredits, getCredits, spendCredit } from "./credits";
import { DEMO_LIMITS, nameFrom, type AppSession, type SessionApi } from "./types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseConfigured = Boolean(SB_URL && SB_KEY);

let client: SupabaseClient | null = null;
let current: AppSession | null = null;
let readyP: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const toApp = (s: Session | null): AppSession | null => {
  if (!s) return null;
  const u = s.user;
  if (u.is_anonymous) return { name: "Guest", mode: "demo" };
  const meta = (u.user_metadata || {}) as Record<string, string | undefined>;
  const first = meta.given_name || (meta.full_name || meta.name || "").split(" ")[0];
  return { name: first || nameFrom(u.email), mode: "full" };
};

const sb = (): SupabaseClient => {
  if (!client) {
    if (!SB_URL || !SB_KEY) throw new Error("Supabase env vars are missing");
    client = createClient(SB_URL, SB_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    client.auth.onAuthStateChange((_event, s) => {
      current = toApp(s);
      emit();
    });
  }
  return client;
};

const ready = () => {
  if (typeof window === "undefined") return Promise.resolve();
  readyP ??= sb()
    .auth.getSession()
    .then(({ data }) => {
      current = toApp(data.session);
      emit();
    });
  return readyP;
};

const settle = (s: Session | null) => {
  current = toApp(s);
  emit();
  if (!current) throw new Error("Not signed in");
  return current;
};

export const supabaseSession: SessionApi = {
  backend: "supabase",
  DEMO_LIMITS,
  ready,
  getSession: () => current,
  login: async (email, password = "") => {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return settle(data.session);
  },
  signUp: async (email, password = "") => {
    const { data, error } = await sb().auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("Check your email to confirm your account.");
    return settle(data.session);
  },
  loginWithGoogle: async () => {
    const { error } = await sb().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return null; // browser is redirecting to Google
  },
  loginAsGuest: async () => {
    const { data, error } = await sb().auth.signInAnonymously();
    if (error) throw error;
    clearCredits();
    return settle(data.session);
  },
  logout: async () => {
    await sb().auth.signOut();
    clearCredits();
    current = null;
    emit();
  },
  getCredits,
  spend: (feature) => spendCredit(current, feature),
  subscribe: (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
