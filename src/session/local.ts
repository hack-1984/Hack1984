// Browser-only stub: the design's session.js, behind the SessionApi interface.
// No real auth: any email and password work.
import { clearCredits, getCredits, spendCredit } from "./credits";
import { DEMO_LIMITS, nameFrom, type AppSession, type SessionApi } from "./types";

const KEY = "ideamap.session";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Cached by raw string so repeated reads return the same object (useSyncExternalStore needs that).
let rawCache: string | null = null;
let parsedCache: AppSession | null = null;
const read = (): AppSession | null => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== rawCache) {
    rawCache = raw;
    try {
      parsedCache = raw ? JSON.parse(raw) : null;
    } catch {
      parsedCache = null;
    }
  }
  return parsedCache;
};
const write = (s: AppSession) => {
  localStorage.setItem(KEY, JSON.stringify(s));
  emit();
  return s;
};

export const localSession: SessionApi = {
  backend: "local",
  DEMO_LIMITS,
  ready: () => Promise.resolve(),
  getSession: read,
  login: async (email) => write({ name: nameFrom(email), mode: "full" }),
  signUp: async (email) => write({ name: nameFrom(email), mode: "full" }),
  loginWithGoogle: async (email) => write({ name: nameFrom(email), mode: "full" }),
  loginAsGuest: async () => {
    clearCredits();
    return write({ name: "Guest", mode: "demo" });
  },
  logout: async () => {
    localStorage.removeItem(KEY);
    clearCredits();
    emit();
  },
  getCredits,
  spend: (feature) => spendCredit(read(), feature),
  subscribe: (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
