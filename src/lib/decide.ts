import type { SimResult } from "./types";

/**
 * The buy/curious/leave rule, in one place.
 *
 * Specified by Step 0. Ethan's price slider re-runs this locally so the client
 * can move the price without a round trip — so the backend's own decisions must
 * agree with it exactly, or the slider will disagree with the simulation.
 */
export function decide(result: SimResult, price: number): SimResult["decision"] {
  if (result.maxPrice >= price) return "buy";
  if (result.maxPrice >= 0.6 * price) return "curious";
  return "leave";
}
