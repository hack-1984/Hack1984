export const BASE = process.env.BASE_URL ?? "http://localhost:3005";

export async function post<T = unknown>(path: string, body: unknown): Promise<{ ms: number; data: T }> {
  const t = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Math.round(performance.now() - t);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 500)}`);
  return { ms, data: JSON.parse(text) as T };
}
