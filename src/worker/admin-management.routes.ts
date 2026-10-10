import type { Hono } from "hono";

type Bindings = { DB: D1Database };
type AuthUser = { id: number } | null;
const statuses = new Set(["ACTIVE", "UPCOMING", "CONCLUDED"]);
const validSlug = (v: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 100;

export function registerAdminManagementRoutes<T extends Bindings>(app: Hono<{ Bindings: T }>, getUser: (c: any) => Promise<AuthUser>) {
  const allowed = async (c: any) => Number((await getUser(c))?.id) === 1;
  const deny = (c: any) => c.json({ error: "Administrator access required" }, 403);
  const log = (c: any, action: string, target: string, details: unknown) => c.env.DB.prepare(
    "INSERT INTO admin_action_log (actor_id, action, target, details_json) VALUES (1, ?, ?, ?)"
  ).bind(action, target, JSON.stringify(details)).run();

  app.get("/api/admin/players", async c => {
    if (!(await allowed(c))) return deny(c);
    const q = (c.req.query("q") ?? "").trim().slice(0, 80);
    if (!q) return c.json({ players: [] });
    const escaped = q.replace(/[\\%_]/g, ch => `\\${ch}`);
    const result = await c.env.DB.prepare("SELECT id, username, global_name, discord_id FROM users WHERE username LIKE ? ESCAPE '\\' OR global_name LIKE ? ESCAPE '\\' OR CAST(id AS TEXT) = ? ORDER BY id LIMIT 30")
      .bind(`%${escaped}%`, `%${escaped}%`, q).all();
    return c.json({ players: result.results ?? [] });
  });
  app.get("/api/admin/players/:id/inventory", async c => {
    if (!(await allowed(c))) return deny(c);
    const id = Number(c.req.param("id"));
    if (!Number.isSafeInteger(id) || id < 1) return c.json({ error: "Invalid player" }, 400);
    const user = await c.env.DB.prepare("SELECT id, username, global_name FROM users WHERE id = ?").bind(id).first();
    if (!user) return c.json({ error: "Player not found" }, 404);
    const [weapons, currencies, materials] = await Promise.all([
      c.env.DB.prepare("SELECT weapon_name, masterwork FROM player_weapons WHERE user_id = ? ORDER BY weapon_name").bind(id).all(),
      c.env.DB.prepare("SELECT currency_name, amount FROM player_currencies WHERE user_id = ? ORDER BY currency_name").bind(id).all(),
      c.env.DB.prepare("SELECT material_name, amount FROM player_upgrade_materials WHERE user_id = ? ORDER BY material_name").bind(id).all(),
    ]);
    return c.json({ user, weapons: weapons.results ?? [], currencies: currencies.results ?? [], materials: materials.results ?? [] });
  });
  app.get("/api/admin/weapon-catalog", async c => {
    if (!(await allowed(c))) return deny(c);
    const q = (c.req.query("q") ?? "").trim().slice(0, 80);
    if (!q) return c.json({ weapons: [] });
    const escaped = q.replace(/[\\%_]/g, ch => `\\${ch}`);
    const rows = await c.env.DB.prepare("SELECT name, rarity FROM weapons WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT 50").bind(`%${escaped}%`).all();
    return c.json({ weapons: rows.results ?? [] });
  });
  app.post("/api/admin/players/:id/grants", async c => {
    if (!(await allowed(c))) return deny(c);
    const id = Number(c.req.param("id"));
    if (!Number.isSafeInteger(id) || id < 1) return c.json({ error: "Invalid player" }, 400);
    const user = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
    if (!user) return c.json({ error: "Player not found" }, 404);
    const body = await c.req.json().catch(() => null) as { kind?: string; name?: string; amount?: number } | null;
    const name = String(body?.name ?? "").trim();
    const kind = body?.kind;
    const amount = Number(body?.amount ?? 1);
    if (!name || name.length > 150 || !["weapon", "currency", "material"].includes(kind ?? "") || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)
      return c.json({ error: "Invalid grant" }, 400);
    if (kind === "weapon") {
      const weapon = await c.env.DB.prepare("SELECT name FROM weapons WHERE name = ? COLLATE NOCASE LIMIT 1").bind(name).first<{name:string}>();
      if (!weapon) return c.json({ error: "Weapon not found in catalog" }, 404);
      const owned = await c.env.DB.prepare("SELECT weapon_name FROM player_weapons WHERE user_id = ? AND weapon_name = ?").bind(id, weapon.name).first();
      if (owned) return c.json({ error: "Player already owns this weapon" }, 409);
      await c.env.DB.prepare("INSERT INTO player_weapons (user_id, weapon_name, masterwork) VALUES (?, ?, 0)").bind(id, weapon.name).run();
      await log(c, "grant_weapon", String(id), { name: weapon.name });
    } else if (kind === "currency") {
      await c.env.DB.prepare("INSERT INTO player_currencies (user_id, currency_name, amount) VALUES (?, ?, ?) ON CONFLICT(user_id, currency_name) DO UPDATE SET amount = player_currencies.amount + excluded.amount").bind(id, name, amount).run();
      await log(c, "grant_currency", String(id), { name, amount });
    } else {
      await c.env.DB.prepare("INSERT INTO player_upgrade_materials (user_id, material_name, amount) VALUES (?, ?, ?) ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_upgrade_materials.amount + excluded.amount").bind(id, name, amount).run();
      await log(c, "grant_material", String(id), { name, amount });
    }
    return c.json({ success: true });
  });
  app.get("/api/events/managed", async c => {
    const rows = await c.env.DB.prepare("SELECT slug AS id, eyebrow, title, status, description, destination, objective, accent, start_at, end_at FROM managed_events WHERE published = 1 ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'UPCOMING' THEN 1 ELSE 2 END, created_at DESC").all();
    return c.json({ events: rows.results ?? [] });
  });
  app.get("/api/admin/events", async c => {
    if (!(await allowed(c))) return deny(c);
    const rows = await c.env.DB.prepare("SELECT * FROM managed_events ORDER BY updated_at DESC").all();
    return c.json({ events: rows.results ?? [] });
  });
  app.post("/api/admin/events", async c => {
    if (!(await allowed(c))) return deny(c);
    const b = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const slug = String(b?.slug ?? "").trim();
    const title = String(b?.title ?? "").trim();
    const status = String(b?.status ?? "UPCOMING");
    if (!validSlug(slug) || !title || title.length > 160 || !statuses.has(status)) return c.json({ error: "Invalid slug, title or status" }, 400);
    const fields = ["eyebrow", "description", "destination", "objective"] as const;
    const values = fields.map(k => String(b?.[k] ?? "").slice(0, k === "description" ? 3000 : 180));
    const accent = b?.accent === "siva" ? "siva" : "neutral";
    const published = b?.published === true ? 1 : 0;
    const start = b?.start_at ? String(b.start_at).slice(0, 40) : null;
    const end = b?.end_at ? String(b.end_at).slice(0, 40) : null;
    try {
      await c.env.DB.prepare("INSERT INTO managed_events (slug, title, status, eyebrow, description, destination, objective, accent, published, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(slug, title, status, ...values, accent, published, start, end).run();
    } catch { return c.json({ error: "Event slug already exists" }, 409); }
    await log(c, "create_event", slug, { title, published });
    return c.json({ success: true }, 201);
  });
  app.put("/api/admin/events/:slug", async c => {
    if (!(await allowed(c))) return deny(c);
    const slug = c.req.param("slug");
    const b = await c.req.json().catch(() => null) as Record<string, unknown> | null;
    const title = String(b?.title ?? "").trim();
    const status = String(b?.status ?? "UPCOMING");
    if (!validSlug(slug) || !title || title.length > 160 || !statuses.has(status)) return c.json({ error: "Invalid event" }, 400);
    const values = ["eyebrow", "description", "destination", "objective"].map(k => String(b?.[k] ?? "").slice(0, k === "description" ? 3000 : 180));
    const result = await c.env.DB.prepare("UPDATE managed_events SET title=?, status=?, eyebrow=?, description=?, destination=?, objective=?, accent=?, published=?, start_at=?, end_at=?, updated_at=CURRENT_TIMESTAMP WHERE slug=?")
      .bind(title, status, ...values, b?.accent === "siva" ? "siva" : "neutral", b?.published === true ? 1 : 0, b?.start_at ? String(b.start_at).slice(0,40) : null, b?.end_at ? String(b.end_at).slice(0,40) : null, slug).run();
    if (!result.meta.changes) return c.json({ error: "Event not found" }, 404);
    await log(c, "update_event", slug, { title, status });
    return c.json({ success: true });
  });
  app.delete("/api/admin/events/:slug", async c => {
    if (!(await allowed(c))) return deny(c);
    const slug = c.req.param("slug");
    if (!validSlug(slug)) return c.json({ error: "Invalid event" }, 400);
    const result = await c.env.DB.prepare("DELETE FROM managed_events WHERE slug = ?").bind(slug).run();
    if (!result.meta.changes) return c.json({ error: "Event not found" }, 404);
    await log(c, "delete_event", slug, {});
    return c.json({ success: true });
  });
  app.get("/api/admin/audit", async c => {
    if (!(await allowed(c))) return deny(c);
    const rows = await c.env.DB.prepare("SELECT id, actor_id, action, target, details_json, created_at FROM admin_action_log ORDER BY id DESC LIMIT 100").all();
    return c.json({ entries: rows.results ?? [] });
  });
}
