import type { Hono } from "hono";

type AdminBindings = { DB: D1Database; ASSETS_BUCKET: R2Bucket };
type AuthUser = { id: number } | null;
const ALLOWED = new Map([
  ["image/png", "png"], ["image/jpeg", "jpg"],
  ["image/webp", "webp"], ["image/gif", "gif"], ["image/avif", "avif"],
]);
const MAX_BYTES = 10 * 1024 * 1024;
const BASE = "https://assets.discordiny.com";

function validPath(path: string): boolean {
  if (!path || path.length > 220 || path.startsWith("/") || path.endsWith("/")) return false;
  return path.split("/").every(segment =>
    segment.length > 0 && segment.length <= 90 &&
    /^[a-z0-9][a-z0-9._-]*$/i.test(segment) &&
    segment !== "." && segment !== ".." && !segment.startsWith("."),
  );
}
function signatureMatches(bytes: Uint8Array, mime: string): boolean {
  const eq = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  if (mime === "image/png") return eq(137,80,78,71,13,10,26,10);
  if (mime === "image/jpeg") return eq(255,216,255);
  if (mime === "image/gif") return bytes.length >= 6 &&
    String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/) !== null;
  if (mime === "image/webp") return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (mime === "image/avif") return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4,8)) === "ftyp" &&
    ["avif","avis"].includes(String.fromCharCode(...bytes.slice(8,12)));
  return false;
}

export function registerAdminAssetRoutes<T extends AdminBindings>(
  app: Hono<{ Bindings: T }>,
  getUser: (c: any) => Promise<AuthUser>,
) {
  async function isAdmin(c: any) {
    const user = await getUser(c);
    return Number(user?.id) === 1;
  }
  app.get("/api/admin/status", async c => {
    const allowed = await isAdmin(c);
    return c.json({ authenticated: allowed, isAdmin: allowed });
  });
  app.get("/api/admin/assets", async c => {
    if (!(await isAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const rows = await c.env.DB.prepare(
      "SELECT path, url, mime_type, byte_size, created_at FROM admin_assets ORDER BY created_at DESC LIMIT 500"
    ).all();
    return c.json({ assets: rows.results ?? [] });
  });
  app.post("/api/admin/assets", async c => {
    if (!(await isAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const contentType = c.req.header("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data"))
      return c.json({ error: "Multipart form required" }, 400);
    const form = await c.req.formData().catch(() => null);
    const path = String(form?.get("path") ?? "").trim();
    const file = form?.get("file");
    if (!validPath(path)) return c.json({ error: "Invalid asset path" }, 400);
    if (!(file instanceof File)) return c.json({ error: "Select an image" }, 400);
    if (!ALLOWED.has(file.type)) return c.json({ error: "Only PNG, JPEG, WebP, GIF and AVIF images are supported" }, 400);
    if (!file.size || file.size > MAX_BYTES) return c.json({ error: "Image must be 1 byte to 10 MB" }, 400);
    const ext = ALLOWED.get(file.type)!;
    const suffix = path.split(".").pop()?.toLowerCase();
    if (suffix !== ext && !(file.type === "image/jpeg" && suffix === "jpeg"))
      return c.json({ error: `Path must end in .${ext}` }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatureMatches(bytes, file.type)) return c.json({ error: "File does not match its image type" }, 400);
    const existing = await c.env.DB.prepare("SELECT path FROM admin_assets WHERE path = ?").bind(path).first();
    if (existing || await c.env.ASSETS_BUCKET.head(path)) return c.json({ error: "Asset path already exists" }, 409);
    const url = `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
    await c.env.ASSETS_BUCKET.put(path, bytes, { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    try {
      await c.env.DB.prepare(
        "INSERT INTO admin_assets (path,url,mime_type,byte_size,created_by) VALUES (?,?,?,?,1)"
      ).bind(path,url,file.type,file.size).run();
    } catch (error) {
      await c.env.ASSETS_BUCKET.delete(path);
      throw error;
    }
    return c.json({ success: true, asset: { path, url, mime_type: file.type, byte_size: file.size } }, 201);
  });
  app.delete("/api/admin/assets", async c => {
    if (!(await isAdmin(c))) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json().catch(() => null);
    const path = String(body?.path ?? "");
    if (!validPath(path)) return c.json({ error: "Invalid path" }, 400);
    const existing = await c.env.DB.prepare("SELECT path FROM admin_assets WHERE path = ?").bind(path).first();
    if (!existing) return c.json({ error: "Asset not found" }, 404);
    await c.env.ASSETS_BUCKET.delete(path);
    await c.env.DB.prepare("DELETE FROM admin_assets WHERE path = ?").bind(path).run();
    return c.json({ success: true });
  });
}
