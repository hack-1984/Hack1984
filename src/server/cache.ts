/**
 * A tiny in-memory cache, per the hardening step of the build plan.
 *
 * In-process and not shared between serverless instances, so treat a hit as a
 * bonus, never as a guarantee. Its real job is demo day: pre-run your backup
 * pitches once and they come back instantly afterwards.
 *
 * Note that Next's dev server clears this on hot reload. Measure hits against
 * a build, not against `npm run dev` after an edit.
 */

interface Entry<V> {
  value: V;
  expires: number;
}

export class TTLCache<V> {
  private map = new Map<string, Entry<V>>();

  constructor(
    private readonly maxEntries = 50,
    private readonly ttlMs = 6 * 60 * 60 * 1000 // a hackathon, not a weekend
  ) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency: re-inserting moves it to the end of Map iteration order.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V): void {
    if (this.map.size >= this.maxEntries && !this.map.has(key)) {
      // Oldest key is the first in insertion order.
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * Stable key from arbitrary values.
 *
 * Object key order and array order must not change the key, or two identical
 * requests miss each other — which is the usual way a cache like this looks
 * like it works in testing and never hits in practice.
 */
export function cacheKey(...parts: unknown[]): string {
  return parts.map(stable).join("|");
}

function stable(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return `[${[...v].map(stable).sort().join(",")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}:${stable(val)}`)
      .sort()
      .join(",")}}`;
  }
  return String(v).trim().toLowerCase();
}
