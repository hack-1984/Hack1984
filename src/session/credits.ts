// Demo credits for guests, kept in sessionStorage exactly as session.js does.
// Client-side only: a guest can reset them. Server-side enforcement waits on the data model.
import { DEMO_LIMITS, type AppSession, type DemoCredits } from "./types";

const CREDITS = "ideamap.demoCredits";

export const clearCredits = () => {
  try {
    sessionStorage.removeItem(CREDITS);
  } catch {}
};

export const getCredits = (): DemoCredits => {
  try {
    return { ...DEMO_LIMITS, ...(JSON.parse(sessionStorage.getItem(CREDITS) || "null") || {}) };
  } catch {
    return { ...DEMO_LIMITS };
  }
};

export const spendCredit = (session: AppSession | null, feature: string): number => {
  if (!session || session.mode !== "demo") return Infinity;
  const c = getCredits() as Record<string, number>;
  if (!(feature in c)) return 0;
  c[feature] = Math.max(0, c[feature] - 1);
  try {
    sessionStorage.setItem(CREDITS, JSON.stringify(c));
  } catch {}
  return c[feature];
};
