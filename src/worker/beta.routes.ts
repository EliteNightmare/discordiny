import type { Hono } from "hono";

type Bindings = { DB: D1Database; ACCESS_DB?: D1Database; DISCORDINY_ENV?: string; DISCORD_CLIENT_SECRET: string };
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

async function invitationKey(c: any): Promise<CryptoKey> {
  const secret = c.env.DISCORD_CLIENT_SECRET;
  if (!secret) throw new Error("Invitation encryption key is not configured");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("discordiny-beta-invites-v1:" + secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const base64 = (bytes: Uint8Array): string => btoa(Array.from(bytes, n => String.fromCharCode(n)).join(""));
const unbase64 = (value: string): Uint8Array => Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
async function encryptCode(c: any, code: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await invitationKey(c), new TextEncoder().encode(code));
  return base64(iv) + "." + base64(new Uint8Array(ciphertext));
}
async function decryptCode(c: any, encrypted: string): Promise<string> {
  const [iv, payload] = encrypted.split(".");
  if (!iv || !payload) throw new Error("Invalid invitation ciphertext");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(iv) }, await invitationKey(c), unbase64(payload));
  return new TextDecoder().decode(plaintext);
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
    const identity = await getIdentity(c);
    if (!identity) return c.json({ error: "Log in first" }, 401);
    const body = await c.req.json().catch(() => ({}));
    const code = String(body.code ?? "");
    if (!/^\d{15}$/.test(code)) return c.json({ error: "Enter a 15-digit code" }, 400);
    const db = registry(c);
    const existing = await db.prepare("SELECT code_hash FROM beta_invites WHERE redeemed_by_discord_id = ? LIMIT 1").bind(identity.discord_id).first();
    if (existing) return c.json({ error: "This Discord account already has beta access" }, 409);
    const result = await db.prepare(
      "UPDATE beta_invites SET redeemed_by_discord_id = ?, redeemed_at = CURRENT_TIMESTAMP WHERE code_hash = ? AND redeemed_by_discord_id IS NULL"
    ).bind(identity.discord_id, await digest(code)).run();
    if (!result.meta.changes) return c.json({ error: "Invitation code is invalid or already used" }, 409);
    return c.json({ success: true });
  });

  app.get("/api/beta/admin/codes", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    const result = await registry(c).prepare(
      "SELECT code_hash, code_ciphertext, created_at, created_by_discord_id, redeemed_by_discord_id, redeemed_at FROM beta_invites ORDER BY created_at DESC, code_hash DESC LIMIT 1000"
    ).all<{ code_hash: string; code_ciphertext: string | null; created_at: string; created_by_discord_id: string; redeemed_by_discord_id: string | null; redeemed_at: string | null }>();
    const codes = await Promise.all(result.results.map(async row => {
      let code: string | null = null;
      if (row.code_ciphertext) {
        try { code = await decryptCode(c, row.code_ciphertext); } catch { code = null; }
      }
      return { code, code_id: row.code_hash.slice(0, 12), used: !!row.redeemed_by_discord_id,
        created_at: row.created_at, created_by_discord_id: row.created_by_discord_id,
        redeemed_by_discord_id: row.redeemed_by_discord_id, redeemed_at: row.redeemed_at };
    }));
    c.header("Cache-Control", "no-store");
    return c.json({ codes });
  });

  app.post("/api/beta/admin/generate", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      const hash = await digest(code);
      const result = await registry(c).prepare(
        "INSERT OR IGNORE INTO beta_invites (code_hash, created_by_discord_id, code_ciphertext) VALUES (?, ?, ?)"
      ).bind(hash, identity!.discord_id, await encryptCode(c, code)).run();
      if (result.meta.changes) {
        return c.json({ code });
      }
    }
    return c.json({ error: "Could not generate unique code" }, 500);
  });


  // All membership operations use the shared production registry and verified Discord identity.
  app.get("/api/beta/admin/members", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    const result = await registry(c).prepare(
      "SELECT i.code_hash, i.redeemed_by_discord_id AS discord_id, i.redeemed_at, u.username, u.global_name FROM beta_invites i LEFT JOIN users u ON u.discord_id = i.redeemed_by_discord_id WHERE i.redeemed_by_discord_id IS NOT NULL ORDER BY i.redeemed_at DESC LIMIT 1000"
    ).all<{ code_hash: string; discord_id: string; redeemed_at: string; username: string | null; global_name: string | null }>();
    c.header("Cache-Control", "no-store");
    return c.json({ members: result.results.map(row => ({
      discord_id: row.discord_id, username: row.username, global_name: row.global_name,
      redeemed_at: row.redeemed_at, code_id: row.code_hash.slice(0, 12),
    })) });
  });

  app.post("/api/beta/admin/revoke", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json().catch(() => ({}));
    const discordId = String(body.discord_id ?? "");
    if (!/^\\d{15,22}$/.test(discordId)) return c.json({ error: "Invalid Discord ID" }, 400);
    if (discordId === identity!.discord_id) return c.json({ error: "Cannot revoke the administrator" }, 403);
    const result = await registry(c).prepare(
      "UPDATE beta_invites SET redeemed_by_discord_id = NULL, redeemed_at = NULL WHERE redeemed_by_discord_id = ?"
    ).bind(discordId).run();
    if (!result.meta.changes) return c.json({ error: "Account has no active beta invitation" }, 404);
    return c.json({ success: true });
  });

  app.post("/api/beta/admin/delete-code", async c => {
    const identity = await getIdentity(c);
    if (!(await admin(c, identity))) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json().catch(() => ({}));
    const codeId = String(body.code_id ?? "");
    if (!/^[a-f0-9]{12}$/.test(codeId)) return c.json({ error: "Invalid invitation reference" }, 400);
    const matches = await registry(c).prepare(
      "SELECT code_hash, redeemed_by_discord_id FROM beta_invites WHERE substr(code_hash, 1, 12) = ? LIMIT 2"
    ).bind(codeId).all<{ code_hash: string; redeemed_by_discord_id: string | null }>();
    if (matches.results.length !== 1) return c.json({ error: "Invitation not found or reference ambiguous" }, 404);
    const invite = matches.results[0];
    if (invite.redeemed_by_discord_id === identity!.discord_id) return c.json({ error: "Cannot delete administrator's invitation" }, 403);
    await registry(c).prepare("DELETE FROM beta_invites WHERE code_hash = ?").bind(invite.code_hash).run();
    return c.json({ success: true });
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
