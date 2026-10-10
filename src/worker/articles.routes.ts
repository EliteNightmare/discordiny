import type { Hono } from "hono";

type ArticleBindings = { DB: D1Database };
type AuthUser = { id: number } | null;
type ArticlePayload = {
  title: string; subtitle: string; category: string; cover_url: string;
  body: string; status: "draft" | "published"; featured: number;
};

/** Register on the EXISTING Hono app. Supply your existing session/auth resolver. */
export function registerArticleRoutes<TBindings extends ArticleBindings>(
  app: Hono<{ Bindings: TBindings }>,
  getAuthenticatedUser: (c: any) => Promise<AuthUser>,
) {
  const requireAdmin = async (c: any): Promise<boolean> => {
    const user = await getAuthenticatedUser(c);
    return Number(user?.id) === 1;
  };
  const fields = "id, slug, title, subtitle, category, cover_url, body, status, featured, author_id, created_at, updated_at, published_at";
  const parse = async (c: any): Promise<ArticlePayload | null> => {
    const raw = await c.req.json().catch(() => null);
    if (!raw || typeof raw !== "object") return null;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const body = typeof raw.body === "string" ? raw.body.trim() : "";
    if (!title || title.length > 160 || !body || body.length > 100000) return null;
    const subtitle = typeof raw.subtitle === "string" ? raw.subtitle.trim().slice(0, 320) : "";
    const category = typeof raw.category === "string" ? raw.category.trim().toUpperCase().slice(0, 40) : "NEWS";
    const cover_url = typeof raw.cover_url === "string" ? raw.cover_url.trim().slice(0, 2048) : "";
    if (cover_url && !/^https:\/\//i.test(cover_url)) return null;
    const status = raw.status === "published" ? "published" : "draft";
    return { title, subtitle, category: category || "NEWS", cover_url, body, status, featured: raw.featured ? 1 : 0 };
  };
  app.get("/api/news/articles", async c => {
    const admin = await requireAdmin(c);
    const sql = `SELECT ${fields} FROM news_articles ${admin ? "" : "WHERE status = 'published'"} ORDER BY featured DESC, published_at DESC, created_at DESC LIMIT 150`;
    const rows = await c.env.DB.prepare(sql).all();
    return c.json({ articles: rows.results });
  });
  app.get("/api/news/articles/:slug", async c => {
    const admin = await requireAdmin(c);
    const article = await c.env.DB.prepare(`SELECT ${fields} FROM news_articles WHERE slug = ? ${admin ? "" : "AND status = 'published'"}`).bind(c.req.param("slug")).first();
    return article ? c.json({ article }) : c.json({ error: "Not found" }, 404);
  });
  app.post("/api/news/admin/articles", async c => {
    if (!(await requireAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const p = await parse(c); if (!p) return c.json({ error: "Invalid article" }, 400);
    const base = p.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75) || "article";
    const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const row = await c.env.DB.prepare(`INSERT INTO news_articles (slug,title,subtitle,category,cover_url,body,status,featured,author_id,published_at) VALUES (?,?,?,?,?,?,?,?,1,?) RETURNING id,slug`).bind(slug,p.title,p.subtitle,p.category,p.cover_url,p.body,p.status,p.featured,p.status === "published" ? now : null).first();
    return c.json({ article: row }, 201);
  });
  app.put("/api/news/admin/articles/:id", async c => {
    if (!(await requireAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const id = Number(c.req.param("id")); if (!Number.isSafeInteger(id) || id < 1) return c.json({ error: "Invalid ID" }, 400);
    const p = await parse(c); if (!p) return c.json({ error: "Invalid article" }, 400);
    const now = new Date().toISOString();
    const result = await c.env.DB.prepare(`UPDATE news_articles SET title=?,subtitle=?,category=?,cover_url=?,body=?,status=?,featured=?,updated_at=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END WHERE id=? RETURNING id,slug`).bind(p.title,p.subtitle,p.category,p.cover_url,p.body,p.status,p.featured,now,p.status,now,id).first();
    return result ? c.json({ article: result }) : c.json({ error: "Not found" }, 404);
  });
  app.delete("/api/news/admin/articles/:id", async c => {
    if (!(await requireAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const id = Number(c.req.param("id")); if (!Number.isSafeInteger(id) || id < 1) return c.json({ error: "Invalid ID" }, 400);
    await c.env.DB.prepare("DELETE FROM news_articles WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  });
}
