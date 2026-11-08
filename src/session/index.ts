"use client";

// The app's session. Real Supabase auth when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set; otherwise the browser-only stub
// from the design (any email/password works, nothing leaves the browser).
import { useSyncExternalStore } from "react";
import { localSession } from "./local";
import { supabaseConfigured, supabaseSession } from "./supabase";
import type { AppSession, SessionApi } from "./types";

export * from "./types";

export const Session: SessionApi = supabaseConfigured ? supabaseSession : localSession;

/** Current session, re-rendering on sign-in / sign-out. null on the server and when signed out. */
export function useSession(): AppSession | null {
  return useSyncExternalStore(Session.subscribe, Session.getSession, () => null);
}

/** Guest credits, as session.js's useDemoCredits(). */
export function useDemoCredits() {
  useSession();
  return { remaining: Session.getCredits(), spend: Session.spend };
}
