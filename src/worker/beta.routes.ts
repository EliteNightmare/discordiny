import type { Hono } from "hono";

type Bindings = { DB: D1Database; ACCESS_DB?: D1Database; DISCORDINY_ENV?: string };
type Identity = { discord_id: string } | null;
const isBeta = (c: any) => c.env.DISCORDINY_ENV === "beta";
const registry = (c: any): D1Database => c.env.ACCESS_DB ?? c.env.DB;

async function admin(c: any, identity: Identity): Promise<boolean> {
  if (!identity) return false;
  // The original production administrator is account #1. Never trust beta user IDs.
  const row = await registry(c).prepare("SELECT discord_id FROM users WHERE id = 1")
    .first<{ discord_id: string }>();
  return row?.discord_id === identity.discord_id;
}
async function digest(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
function newCode(): string {
  const digits = new Uint32Array(15);
  crypto.getRandomValues(digits);
  return Array.from(digits, n => String(n % 10)).join("");
}

export function registerBetaRoutes<T extends Bindings>(
  app: Hono<{ Bindings: T }>,
  getIdentity: (c: any) => Promise<Identity>,
) {
  app.get("/api/beta/status", async c => {
    const identity = await getIdentity(c);
    const settings = await registry(c).prepare("SELECT enabled FROM beta_settings WHERE id = 1")
      .first<{ enabled: number }>();
    const member = identity ? await registry(c).prepare(
      "SELECT 1 AS allowed FROM beta_invites WHERE redeemed_by_discord_id = ? LIMIT 1"
    ).bind(identity.discord_id).first() : null;
    return c.json({ active: settings?.enabled === 1, hasAccess: !!member,
      isAdmin: await admin(c, identity), betaEnvironment: isBeta(c) });
  });

  app.post("/api/beta/redeem", async c => {
    if (isBeta(c)) return c.json({ error: "Redeem codes on discordiny.com/account" }, 403);
    const identity = await getIdentity(c);
    if (!identity) return c.json({ error: "Log in first" }, 401);
    const body = await c.req.json().catch(() => ({}));
    const code = String(body.code ?? "");
    if (!/^\d{15}$/.test(code)) return c.json({ error: "Enter a 15-digit code" }, 400);
    const result = await registry(c).prepare(
      "UPDATE beta_invites SET redeemed_by_discord_id = ?, redeemed_at = CURRENT_TIMESTAMP WHERE code_hash = ? AND redeemed_by_discord_id IS NULL"
    ).bind(identity.discord_id, await digest(code)).run().catch(() => null);
    if (!result?.meta?.changes) return c.json({ error: "Code invalid, used, or account already enrolled" }, 409);
    return c.json({ success: true });
  });

  app.post("/api/beta/admin/generate", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      const result = await registry(c).prepare(
        "INSERT OR IGNORE INTO beta_invites (code_hash, created_by_discord_id) VALUES (?, ?)"
      ).bind(await digest(code), identity!.discord_id).run();
      if (result.meta.changes) return c.json({ code });
    }
    return c.json({ error: "Could not generate unique code" }, 500);
  });

  app.post("/api/beta/admin/toggle", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.enabled !== "boolean") return c.json({ error: "enabled must be boolean" }, 400);
    await registry(c).prepare("UPDATE beta_settings SET enabled = ? WHERE id = 1")
      .bind(body.enabled ? 1 : 0).run();
    return c.json({ active: body.enabled });
  });
}
