/** Short-lived per-tab profile snapshots for pre-action level comparisons.
 * Private data never enters shared Worker caches or browser persistent storage.
 */
let cached: { at: number; data: unknown } | null = null;
let pending: Promise<unknown> | null = null;

export function invalidateProfileSnapshot(): void {
  cached = null;
}

export async function fetchProfileSnapshot<T>(maxAgeMs = 8000): Promise<T> {
  if (cached && Date.now() - cached.at < maxAgeMs) return cached.data as T;
  if (pending) return pending as Promise<T>;
  pending = (async () => {
    const response = await fetch("/api/game/profile", { credentials: "include" });
    if (!response.ok) throw new Error("Unable to load profile");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || (data as { authenticated?: boolean }).authenticated !== true) {
      throw new Error("Not authenticated");
    }
    cached = { at: Date.now(), data };
    return data;
  })();
  try { return await pending as T; }
  finally { pending = null; }
}
