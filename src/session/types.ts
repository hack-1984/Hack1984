// Session interface, mirroring the design's session.js (window.Session).
// Two implementations: ./local (browser-only stub, exactly session.js) and
// ./supabase (real auth). ./index picks one based on env.

export const DEMO_LIMITS = { launches: 1, graves: 3, chatMessages: 6 } as const;
export type DemoFeature = keyof typeof DEMO_LIMITS;
export type DemoCredits = Record<DemoFeature, number>;

export type SessionMode = "full" | "demo";
/** `mode: "demo"` is a guest, who gets DEMO_LIMITS. */
export type AppSession = { name: string; mode: SessionMode };

export interface SessionApi {
  readonly backend: "local" | "supabase";
  readonly DEMO_LIMITS: typeof DEMO_LIMITS;
  /** Resolves once the current session is known (instant for the local stub). */
  ready(): Promise<void>;
  getSession(): AppSession | null;
  /** Email + password. The local stub ignores the password, like session.js. */
  login(email: string, password?: string): Promise<AppSession>;
  signUp(email: string, password?: string): Promise<AppSession>;
  /** Resolves null when the browser is being redirected to Google. */
  loginWithGoogle(email?: string): Promise<AppSession | null>;
  loginAsGuest(): Promise<AppSession>;
  logout(): Promise<void>;
  getCredits(): DemoCredits;
  /** Spend one demo credit. Returns credits left; Infinity for non-guests; 0 for unknown features. */
  spend(feature: string): number;
  subscribe(listener: () => void): () => void;
}

export const nameFrom = (email?: string | null) => {
  const n = (email || "").split("@")[0].trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Guest";
};
