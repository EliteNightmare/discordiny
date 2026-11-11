/** Shared public feed request. Authentication is still enforced by the Worker. */
let inFlight: Promise<Response> | null = null;
let cachedBody: string | null = null;
let cachedAt = 0;
const CLIENT_TTL_MS = 15_000;

export async function fetchGlobalActivityFeed(): Promise<Response> {
  if (cachedBody !== null && Date.now() - cachedAt < CLIENT_TTL_MS) {
    return new Response(cachedBody, { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (inFlight) return (await inFlight).clone();
  inFlight = fetch("/api/game/activity/feed", { credentials: "include" }).then(async response => {
    if (!response.ok) return response;
    const body = await response.text();
    cachedBody = body;
    cachedAt = Date.now();
    return new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } });
  });
  try { return (await inFlight).clone(); }
  finally { inFlight = null; }
}
