declare global {
  interface Env {
    DISCORD_CLIENT_SECRET: string;
    BUNGIE_API_KEY: string;
    DB: D1Database;
  }
}

import { Hono } from "hono";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "hono/cookie";
import { ACTIVITIES } from "./game/activities";
import {
  runEndgameActivity,
  type EndgameActivity,
  type WeaponStats,
} from "./game/endgame";
import {
  GM_MIN_LEVEL,
  makeVanguardResult,
  rollVanguardRewards,
  rollVanguardWeapon,
  type VanguardActivity,
} from "./game/vanguard";

import {
  runInfiltration,
} from "./game/infiltration";

import {
  runShowdownActivity,
  type ShowdownActivity,
  type ShowdownWeaponSource,
} from "./game/showdown";

import {
  finalizeCrawlWithoutSecret,
  finalizeFailedCrawlSecret,
  finalizeSuccessfulCrawlSecret,
  getPublicCrawlRun,
  runCrawl,
  validateCrawlSecret,
  type CrawlActivity,
  type CrawlRunResult,
  type CrawlWeaponCatalogEntry,
  type CrawlWeaponSource,
} from "./game/crawl";

const REGULAR_SHOWDOWN_SOURCES =
  new Set<ShowdownWeaponSource>([
    "seraph",
    "elivagar",
    "lucent",
  ]);

const DAILY_SHOWDOWN_SOURCES =
  new Set<ShowdownWeaponSource>([
    "cos",
    "sos",
    "eow",
  ]);

const DAILY_SHOWDOWN_MAX_CHARGES = 3;

type WeaponRow = {
  weapon_name: string;
  masterwork: number;
  rarity: string | null;
};

type ArmorRow = {
  helmet: string;
  arms: string;
  chest: string;
  legs: string;
};

type ArtifactRow = {
  artifact_name: string;
  level: number;
};

const app = new Hono<{ Bindings: Env }>();

const DISCORD_CLIENT_ID = "1529513718176813166";

const DISCORD_REDIRECT_URI =
  "https://discordiny.com/api/auth/callback";

const BUNGIE_CLIENT_ID =
  "55059";

const BUNGIE_REDIRECT_URI =
  "https://discordiny.com/api/bungie/callback";

const SESSION_COOKIE =
  "__Host-discordiny_session";

const BUNGIE_STATE_COOKIE =
  "__Host-discordiny_bungie_state";

const SESSION_DURATION_SECONDS =
  60 * 60 * 24 * 30;

const BUNGIE_STATE_DURATION_SECONDS =
  60 * 10;


/* =========================================================
   API ROOT
========================================================= */

app.get("/api/", (c) => {
  return c.json({
    name: "Discordiny",
  });
});

/* =========================================================
   TERMINAL - ACCOUNT LIBRARY
========================================================= */
const TERMINAL_ORIGIN = "https://terminal.discordiny.com";
const TERMINAL_URL = "https://terminal.discordiny.com/";
const TERMINAL_ROOT_CODE = "ROOT.INITIATE.KEY=8556";
const TERMINAL_ROOT_URL = "https://root.discordiny.com/5dfg46df4gs4gs6";
const TERMINAL_ADMIN_USER_ID = 1;

function terminalCors(c: any) {
  if (c.req.header("Origin") === TERMINAL_ORIGIN) {
    c.header("Access-Control-Allow-Origin", TERMINAL_ORIGIN);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
}
app.options("/api/terminal/*", (c) => {
  terminalCors(c);
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");
  return c.body(null, 204);
});
app.use("/api/terminal/*", async (c, next) => { await next(); terminalCors(c); });

async function getTerminalUser(c: any) {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) return null;
  const row = await c.env.DB.prepare(`SELECT sessions.user_id, sessions.expires_at, users.discord_id, users.username, users.global_name, users.avatar FROM sessions INNER JOIN users ON users.id=sessions.user_id WHERE sessions.id=? LIMIT 1`).bind(sessionId).first() as {user_id:number;expires_at:string;discord_id:string;username:string;global_name:string|null;avatar:string|null}|null;
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}
async function ensureTerminalRow(c:any,userId:number){
  await c.env.DB.prepare(`INSERT INTO player_terminal_access (user_id,terminal_unlocked,root_unlocked) VALUES (?,0,0) ON CONFLICT(user_id) DO NOTHING`).bind(userId).run();
}

app.get("/api/terminal/status", async c => {
  const u=await getTerminalUser(c);
  if(!u) return c.json({authenticated:false,terminalUnlocked:false,rootUnlocked:false,isAdmin:false});
  await ensureTerminalRow(c,u.user_id);
  const x=await c.env.DB.prepare(`SELECT terminal_unlocked,root_unlocked,unknown_signal_resolved FROM player_terminal_access WHERE user_id=?`).bind(u.user_id).first() as {terminal_unlocked:number;root_unlocked:number;unknown_signal_resolved:number}|null;
  return c.json({authenticated:true,terminalUnlocked:!!x?.terminal_unlocked,rootUnlocked:!!x?.root_unlocked,unknownSignalResolved:!!x?.unknown_signal_resolved,isAdmin:u.user_id===1,user:{id:u.user_id,discord_id:u.discord_id,username:u.username,global_name:u.global_name,avatar:u.avatar}});
});

app.post("/api/terminal/unlock", async c => {
  const u=await getTerminalUser(c);
  if(!u) return c.json({success:false,error:"ACCOUNT AUTHENTICATION REQUIRED"},401);
  const now=new Date().toISOString();
  await c.env.DB.prepare(`INSERT INTO player_terminal_access (user_id,terminal_unlocked,root_unlocked,terminal_unlocked_at) VALUES (?,1,0,?) ON CONFLICT(user_id) DO UPDATE SET terminal_unlocked=1, terminal_unlocked_at=COALESCE(player_terminal_access.terminal_unlocked_at,excluded.terminal_unlocked_at)`).bind(u.user_id,now).run();
  return c.json({success:true,redirectUrl:TERMINAL_URL});
});

app.get("/api/terminal/library", async c => {
  const u=await getTerminalUser(c);
  if(!u) return c.json({authenticated:false,error:"ACCOUNT AUTHENTICATION REQUIRED"},401);
  await ensureTerminalRow(c,u.user_id);
  const x=await c.env.DB.prepare(`SELECT terminal_unlocked,root_unlocked,unknown_signal_resolved FROM player_terminal_access WHERE user_id=?`).bind(u.user_id).first() as {terminal_unlocked:number;root_unlocked:number;unknown_signal_resolved:number}|null;
  if(!x?.terminal_unlocked) return c.json({authenticated:true,terminalUnlocked:false,error:"TERMINAL NOT DISCOVERED"},403);
  const f=await c.env.DB.prepare(`SELECT terminal_files.id,terminal_files.code,terminal_files.title,terminal_files.subtitle,terminal_files.classification,terminal_files.content,player_terminal_files.discovered_at FROM player_terminal_files INNER JOIN terminal_files ON terminal_files.id=player_terminal_files.file_id WHERE player_terminal_files.user_id=? ORDER BY player_terminal_files.discovered_at DESC`).bind(u.user_id).all();
  return c.json({authenticated:true,terminalUnlocked:true,rootUnlocked:!!x.root_unlocked,unknownSignalResolved:!!x.unknown_signal_resolved,isAdmin:u.user_id===1,files:f.results,user:{id:u.user_id,discord_id:u.discord_id,username:u.username,global_name:u.global_name,avatar:u.avatar}});
});

app.post("/api/terminal/execute", async c => {
  const u=await getTerminalUser(c); if(!u) return c.json({success:false,error:"ACCOUNT AUTHENTICATION REQUIRED"},401);
  let body:{code?:string}; try{body=await c.req.json()}catch{return c.json({success:false,error:"INVALID TERMINAL REQUEST"},400)}
  const code=body.code?.trim(); if(!code) return c.json({success:false,error:"ACCESS CODE REQUIRED"},400);
  await ensureTerminalRow(c,u.user_id);
  const access=await c.env.DB.prepare(`SELECT terminal_unlocked FROM player_terminal_access WHERE user_id=?`).bind(u.user_id).first() as {terminal_unlocked:number}|null;
  if(!access?.terminal_unlocked) return c.json({success:false,error:"TERMINAL NOT DISCOVERED"},403);
  if(code.toUpperCase()===TERMINAL_ROOT_CODE){
    await c.env.DB.prepare(`UPDATE player_terminal_access SET root_unlocked=1,root_unlocked_at=COALESCE(root_unlocked_at,?) WHERE user_id=?`).bind(new Date().toISOString(),u.user_id).run();
    return c.json({success:true,type:"root",rootUnlocked:true,redirectUrl:TERMINAL_ROOT_URL});
  }
  const file=await c.env.DB.prepare(`SELECT id,code,title,subtitle,classification,content FROM terminal_files WHERE lower(code)=lower(?) LIMIT 1`).bind(code).first() as {id:number;code:string;title:string;subtitle:string;classification:string;content:string}|null;
  if(!file) return c.json({success:false,error:"ACCESS CODE NOT RECOGNIZED"},404);
  await c.env.DB.prepare(`INSERT INTO player_terminal_files (user_id,file_id,discovered_at) VALUES (?,?,?) ON CONFLICT(user_id,file_id) DO NOTHING`).bind(u.user_id,file.id,new Date().toISOString()).run();

  const unknownSignalResolved=file.code.toUpperCase()==="UH3C";
  if(unknownSignalResolved){
    await c.env.DB.prepare(`UPDATE player_terminal_access SET unknown_signal_resolved=1 WHERE user_id=?`).bind(u.user_id).run();
  }

  return c.json({success:true,type:"file",file,unknownSignalResolved});
});

app.post("/api/terminal/root-access", async c => {
  const u=await getTerminalUser(c); if(!u) return c.json({success:false,error:"ACCOUNT AUTHENTICATION REQUIRED"},401);
  const x=await c.env.DB.prepare(`SELECT root_unlocked FROM player_terminal_access WHERE user_id=?`).bind(u.user_id).first() as {root_unlocked:number}|null;
  if(!x?.root_unlocked) return c.json({success:false,error:"ROOT ACCESS NOT DISCOVERED"},403);
  return c.json({success:true,redirectUrl:TERMINAL_ROOT_URL});
});

app.get("/api/terminal/admin/files", async c => {
  const u=await getTerminalUser(c); if(!u||u.user_id!==TERMINAL_ADMIN_USER_ID) return c.json({error:"ADMINISTRATOR ACCESS REQUIRED"},403);
  const f=await c.env.DB.prepare(`SELECT id,code,title,subtitle,classification,content,created_by,created_at,updated_at FROM terminal_files ORDER BY updated_at DESC,id DESC`).all();
  return c.json({success:true,files:f.results});
});
app.post("/api/terminal/admin/files", async c => {
  const u=await getTerminalUser(c); if(!u||u.user_id!==1) return c.json({error:"ADMINISTRATOR ACCESS REQUIRED"},403);
  let b:{code?:string;title?:string;subtitle?:string;classification?:string;content?:string}; try{b=await c.req.json()}catch{return c.json({error:"INVALID FILE REQUEST"},400)}
  const code=b.code?.trim(),title=b.title?.trim(); if(!code||!title)return c.json({error:"ACCESS CODE AND TITLE ARE REQUIRED"},400);
  try{const r=await c.env.DB.prepare(`INSERT INTO terminal_files (code,title,subtitle,classification,content,created_by) VALUES (?,?,?,?,?,?)`).bind(code,title,b.subtitle?.trim()??"",b.classification?.trim()??"",b.content??"",u.user_id).run();return c.json({success:true,id:r.meta.last_row_id})}catch{return c.json({error:"ACCESS CODE ALREADY EXISTS OR FILE COULD NOT BE CREATED"},409)}
});
app.put("/api/terminal/admin/files/:id", async c => {
  const u=await getTerminalUser(c); if(!u||u.user_id!==1)return c.json({error:"ADMINISTRATOR ACCESS REQUIRED"},403); const id=Number(c.req.param("id"));
  let b:{code?:string;title?:string;subtitle?:string;classification?:string;content?:string};try{b=await c.req.json()}catch{return c.json({error:"INVALID FILE REQUEST"},400)}
  if(!b.code?.trim()||!b.title?.trim())return c.json({error:"ACCESS CODE AND TITLE ARE REQUIRED"},400);
  try{const r=await c.env.DB.prepare(`UPDATE terminal_files SET code=?,title=?,subtitle=?,classification=?,content=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(b.code.trim(),b.title.trim(),b.subtitle?.trim()??"",b.classification?.trim()??"",b.content??"",id).run();return r.meta.changes?c.json({success:true}):c.json({error:"FILE NOT FOUND"},404)}catch{return c.json({error:"ACCESS CODE ALREADY EXISTS OR FILE COULD NOT BE UPDATED"},409)}
});
app.delete("/api/terminal/admin/files/:id", async c => {
  const u=await getTerminalUser(c);if(!u||u.user_id!==1)return c.json({error:"ADMINISTRATOR ACCESS REQUIRED"},403);const id=Number(c.req.param("id"));
  const r=await c.env.DB.prepare(`DELETE FROM terminal_files WHERE id=?`).bind(id).run();return r.meta.changes?c.json({success:true}):c.json({error:"FILE NOT FOUND"},404);
});


/* =========================================================
   ROOT - LIVE FILESYSTEM + DISCORDINY ADMIN
========================================================= */

const ROOT_ORIGIN = "https://root.discordiny.com";
const ROOT_ADMIN_USER_ID = 1;

const ROOT_LOGINS = [
  {
    name: "ADMIN",
    username: "admin",
    password: "admin",
    level: 1,
  },
  {
    name: "WILHELMINA",
    username: "wlhlm.bray",
    password: "XJ57-4BA6-QSM9",
    level: 2,
  },
  {
    name: "CLOVIS",
    username: "The Lord of Logic, King of Code",
    password:
      "Tell yourself a story... Let the story twist in unlikely directions",
    level: 3,
  },
] as const;

function rootCors(c: any) {
  if (c.req.header("Origin") === ROOT_ORIGIN) {
    c.header("Access-Control-Allow-Origin", ROOT_ORIGIN);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
}

app.options("/api/root/*", (c) => {
  rootCors(c);
  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  c.header("Access-Control-Allow-Headers", "Content-Type");
  return c.body(null, 204);
});

app.use("/api/root/*", async (c, next) => {
  await next();
  rootCors(c);
});

function normalizeRootFsPath(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function validRootFsPath(value: string): boolean {
  if (!value || value.length > 500) return false;
  const parts = value.split("/");
  return parts.every(
    (part) =>
      part.length > 0 &&
      part.length <= 120 &&
      part !== "." &&
      part !== ".." &&
      !/[\u0000-\u001f]/.test(part),
  );
}

function normalizeRootAssetReference(value: unknown): string | null {
  const path = normalizeRootFsPath(value);
  if (!path) return null;

  const lower = path.toLowerCase();
  if (lower.startsWith("assets/root/")) {
    return path.slice("assets/root/".length);
  }

  if (lower.startsWith("discordiny/assets/root/")) {
    return path.slice("discordiny/assets/root/".length);
  }

  return path;
}

async function requireRootAdmin(c: any) {
  const user = await getTerminalUser(c);
  if (!user || user.user_id !== ROOT_ADMIN_USER_ID) {
    return null;
  }
  return user;
}

app.get("/api/root/status", async (c) => {
  const user = await getTerminalUser(c);

  if (!user) {
    return c.json({
      authenticated: false,
      isAdmin: false,
      savedAuthorizationLevel: 0,
    });
  }

  const saved = await c.env.DB.prepare(
    `SELECT authorization_level
     FROM player_root_authorization
     WHERE user_id = ?
     LIMIT 1`,
  ).bind(user.user_id).first<{ authorization_level: number }>();

  return c.json({
    authenticated: true,
    isAdmin: user.user_id === ROOT_ADMIN_USER_ID,
    savedAuthorizationLevel: Math.max(
      0,
      Math.min(3, Number(saved?.authorization_level) || 0),
    ),
    user: {
      id: user.user_id,
      discord_id: user.discord_id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
    },
  });
});

app.post("/api/root/login", async (c) => {
  const user = await getTerminalUser(c);

  if (!user) {
    return c.json(
      {
        success: false,
        error: "DISCORDINY ACCOUNT AUTHENTICATION REQUIRED",
      },
      401,
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "INVALID ROOT LOGIN REQUEST" },
      400,
    );
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();

  const rootLogin = ROOT_LOGINS.find(
    (candidate) =>
      candidate.username === username &&
      candidate.password === password,
  );

  if (!rootLogin) {
    return c.json(
      {
        success: false,
        error: "AUTHENTICATION FAILURE // INVALID ROOT CREDENTIALS",
      },
      401,
    );
  }

  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO player_root_authorization (
       user_id,
       authorization_level,
       first_authorized_at,
       last_authorized_at
     )
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       authorization_level =
         MAX(player_root_authorization.authorization_level,
             excluded.authorization_level),
       last_authorized_at = excluded.last_authorized_at`,
  ).bind(
    user.user_id,
    rootLogin.level,
    now,
    now,
  ).run();

  const saved = await c.env.DB.prepare(
    `SELECT authorization_level
     FROM player_root_authorization
     WHERE user_id = ?
     LIMIT 1`,
  ).bind(user.user_id).first<{ authorization_level: number }>();

  return c.json({
    success: true,
    name: rootLogin.name,
    authorizationLevel: rootLogin.level,
    savedAuthorizationLevel: Math.max(
      rootLogin.level,
      Number(saved?.authorization_level) || 0,
    ),
  });
});

app.post("/api/root/resume", async (c) => {
  const user = await getTerminalUser(c);

  if (!user) {
    return c.json(
      {
        success: false,
        error: "DISCORDINY ACCOUNT AUTHENTICATION REQUIRED",
      },
      401,
    );
  }

  const saved = await c.env.DB.prepare(
    `SELECT authorization_level
     FROM player_root_authorization
     WHERE user_id = ?
     LIMIT 1`,
  ).bind(user.user_id).first<{ authorization_level: number }>();

  const level = Math.max(
    0,
    Math.min(3, Number(saved?.authorization_level) || 0),
  );

  if (level < 1) {
    return c.json(
      {
        success: false,
        error: "NO SAVED ROOT AUTHORIZATION",
      },
      404,
    );
  }

  const name =
    level >= 3
      ? "CLOVIS"
      : level >= 2
        ? "WILHELMINA"
        : "ADMIN";

  return c.json({
    success: true,
    name,
    authorizationLevel: level,
  });
});

app.get("/api/root/content", async (c) => {
  const [directories, files] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, path, created_by, created_at, updated_at
       FROM root_directories
       ORDER BY path COLLATE NOCASE ASC`,
    ).all(),
    c.env.DB.prepare(
      `SELECT
         id,
         directory_path,
         filename,
         title,
         description,
         embed_description,
         authorization_level,
         authorization_status,
         fields_json,
         images_json,
         created_by,
         created_at,
         updated_at
       FROM root_files
       ORDER BY directory_path COLLATE NOCASE ASC,
                filename COLLATE NOCASE ASC`,
    ).all(),
  ]);

  return c.json({
    success: true,
    directories: directories.results,
    files: files.results,
  });
});

app.post("/api/root/admin/directories", async (c) => {
  const user = await requireRootAdmin(c);
  if (!user) {
    return c.json({ error: "ADMINISTRATOR ACCESS REQUIRED" }, 403);
  }

  let body: { path?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "INVALID DIRECTORY REQUEST" }, 400);
  }

  const path = normalizeRootFsPath(body.path);
  if (!validRootFsPath(path)) {
    return c.json({ error: "INVALID DIRECTORY PATH" }, 400);
  }

  const parts = path.split("/");
  const statements = parts.map((_, index) => {
    const currentPath = parts.slice(0, index + 1).join("/");
    return c.env.DB.prepare(
      `INSERT INTO root_directories
         (path, created_by, created_at, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(path) DO NOTHING`,
    ).bind(currentPath, user.user_id);
  });

  await c.env.DB.batch(statements);
  return c.json({ success: true, path });
});

app.delete("/api/root/admin/directories", async (c) => {
  const user = await requireRootAdmin(c);
  if (!user) {
    return c.json({ error: "ADMINISTRATOR ACCESS REQUIRED" }, 403);
  }

  let body: { path?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "INVALID DIRECTORY REQUEST" }, 400);
  }

  const path = normalizeRootFsPath(body.path);
  if (!validRootFsPath(path)) {
    return c.json({ error: "INVALID DIRECTORY PATH" }, 400);
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `DELETE FROM root_files
       WHERE directory_path = ?
          OR directory_path LIKE ?`,
    ).bind(path, `${path}/%`),
    c.env.DB.prepare(
      `DELETE FROM root_directories
       WHERE path = ?
          OR path LIKE ?`,
    ).bind(path, `${path}/%`),
  ]);

  return c.json({ success: true });
});

app.post("/api/root/admin/files", async (c) => {
  const user = await requireRootAdmin(c);
  if (!user) {
    return c.json({ error: "ADMINISTRATOR ACCESS REQUIRED" }, 403);
  }

  let body: {
    directoryPath?: string;
    filename?: string;
    title?: string;
    description?: string;
    embedDescription?: string;
    authorizationLevel?: number;
    authorizationStatus?: string;
    fields?: unknown[];
    images?: unknown[];
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "INVALID FILE REQUEST" }, 400);
  }

  const directoryPath = normalizeRootFsPath(body.directoryPath);
  const filename = String(body.filename ?? "").trim();

  if (
    (directoryPath && !validRootFsPath(directoryPath)) ||
    !filename ||
    filename.length > 160 ||
    filename === "." ||
    filename === ".." ||
    /[\/\\\u0000-\u001f]/.test(filename)
  ) {
    return c.json({ error: "INVALID FILE PATH" }, 400);
  }

  const level = Math.max(
    1,
    Math.min(3, Math.trunc(Number(body.authorizationLevel) || 1)),
  );
  const status =
    String(body.authorizationStatus ?? "AUTHORIZED").trim() ||
    "AUTHORIZED";

  const fields = Array.isArray(body.fields) ? body.fields : [];
  const images = (Array.isArray(body.images) ? body.images : [])
    .map(normalizeRootAssetReference)
    .filter((value): value is string => Boolean(value));

  if (directoryPath) {
    const parts = directoryPath.split("/");
    await c.env.DB.batch(
      parts.map((_, index) =>
        c.env.DB.prepare(
          `INSERT INTO root_directories
             (path, created_by, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(path) DO NOTHING`,
        ).bind(parts.slice(0, index + 1).join("/"), user.user_id),
      ),
    );
  }

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO root_files (
         directory_path,
         filename,
         title,
         description,
         embed_description,
         authorization_level,
         authorization_status,
         fields_json,
         images_json,
         created_by,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ).bind(
      directoryPath,
      filename,
      String(body.title ?? "").trim(),
      String(body.description ?? ""),
      String(body.embedDescription ?? ""),
      level,
      status,
      JSON.stringify(fields),
      JSON.stringify(images),
      user.user_id,
    ).run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
    });
  } catch {
    return c.json(
      { error: "FILE ALREADY EXISTS OR COULD NOT BE CREATED" },
      409,
    );
  }
});

app.put("/api/root/admin/files/:id", async (c) => {
  const user = await requireRootAdmin(c);
  if (!user) {
    return c.json({ error: "ADMINISTRATOR ACCESS REQUIRED" }, 403);
  }

  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: "INVALID FILE ID" }, 400);
  }

  let body: {
    directoryPath?: string;
    filename?: string;
    title?: string;
    description?: string;
    embedDescription?: string;
    authorizationLevel?: number;
    authorizationStatus?: string;
    fields?: unknown[];
    images?: unknown[];
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "INVALID FILE REQUEST" }, 400);
  }

  const directoryPath = normalizeRootFsPath(body.directoryPath);
  const filename = String(body.filename ?? "").trim();

  if (
    (directoryPath && !validRootFsPath(directoryPath)) ||
    !filename ||
    filename.length > 160 ||
    filename === "." ||
    filename === ".." ||
    /[\/\\\u0000-\u001f]/.test(filename)
  ) {
    return c.json({ error: "INVALID FILE PATH" }, 400);
  }

  const level = Math.max(
    1,
    Math.min(3, Math.trunc(Number(body.authorizationLevel) || 1)),
  );
  const status =
    String(body.authorizationStatus ?? "AUTHORIZED").trim() ||
    "AUTHORIZED";
  const fields = Array.isArray(body.fields) ? body.fields : [];
  const images = (Array.isArray(body.images) ? body.images : [])
    .map(normalizeRootAssetReference)
    .filter((value): value is string => Boolean(value));

  if (directoryPath) {
    const parts = directoryPath.split("/");
    await c.env.DB.batch(
      parts.map((_, index) =>
        c.env.DB.prepare(
          `INSERT INTO root_directories
             (path, created_by, created_at, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(path) DO NOTHING`,
        ).bind(parts.slice(0, index + 1).join("/"), user.user_id),
      ),
    );
  }

  try {
    const result = await c.env.DB.prepare(
      `UPDATE root_files
       SET directory_path = ?,
           filename = ?,
           title = ?,
           description = ?,
           embed_description = ?,
           authorization_level = ?,
           authorization_status = ?,
           fields_json = ?,
           images_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).bind(
      directoryPath,
      filename,
      String(body.title ?? "").trim(),
      String(body.description ?? ""),
      String(body.embedDescription ?? ""),
      level,
      status,
      JSON.stringify(fields),
      JSON.stringify(images),
      id,
    ).run();

    return result.meta.changes
      ? c.json({ success: true })
      : c.json({ error: "FILE NOT FOUND" }, 404);
  } catch {
    return c.json(
      { error: "FILE ALREADY EXISTS OR COULD NOT BE UPDATED" },
      409,
    );
  }
});

app.delete("/api/root/admin/files/:id", async (c) => {
  const user = await requireRootAdmin(c);
  if (!user) {
    return c.json({ error: "ADMINISTRATOR ACCESS REQUIRED" }, 403);
  }

  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: "INVALID FILE ID" }, 400);
  }

  const result = await c.env.DB.prepare(
    `DELETE FROM root_files WHERE id = ?`,
  ).bind(id).run();

  return result.meta.changes
    ? c.json({ success: true })
    : c.json({ error: "FILE NOT FOUND" }, 404);
});


app.get("/5dfg46df4gs4gs6", c => {
  const host=c.req.header("Host")?.split(":")[0]?.toLowerCase();
  if(host!=="root.discordiny.com") return c.notFound();
  return c.html(`<!doctype html><html><head><meta charset="utf-8"><title></title></head><body></body></html>`);
});

/* =========================================================
   DISCORD LOGIN
========================================================= */

app.get("/api/auth/login", (c) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: "identify",
  });

  return c.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
});


/* =========================================================
   DISCORD CALLBACK
========================================================= */

app.get("/api/auth/callback", async (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.json(
      {
        error: "Missing authorization code",
      },
      400
    );
  }

  const basicAuth = btoa(
    `${DISCORD_CLIENT_ID}:${c.env.DISCORD_CLIENT_SECRET}`
  );

  const tokenResponse = await fetch(
    "https://discord.com/api/v10/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();

    console.error(
      "Discord token exchange failed:",
      error
    );

    return c.json(
      {
        error: "Discord token exchange failed",
      },
      500
    );
  }

  const tokenData =
    await tokenResponse.json<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
    }>();

  const userResponse = await fetch(
    "https://discord.com/api/users/@me",
    {
      headers: {
        Authorization:
          `${tokenData.token_type} ${tokenData.access_token}`,
      },
    }
  );

  if (!userResponse.ok) {
    const error = await userResponse.text();

    console.error(
      "Discord user lookup failed:",
      error
    );

    return c.json(
      {
        error: "Could not retrieve Discord user",
      },
      500
    );
  }

  const user =
    await userResponse.json<{
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
    }>();


  /* =======================================================
     FIND OR CREATE DISCORDINY USER
  ======================================================= */

  const existingUser = await c.env.DB
    .prepare(
      `SELECT
        id,
        discord_id,
        username,
        global_name,
        avatar
       FROM users
       WHERE discord_id = ?`
    )
    .bind(user.id)
    .first<{
      id: number;
      discord_id: string;
      username: string;
      global_name: string | null;
      avatar: string | null;
    }>();

  let discordinyUser;

  if (existingUser) {
    await c.env.DB
      .prepare(
        `UPDATE users
         SET username = ?,
             global_name = ?,
             avatar = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE discord_id = ?`
      )
      .bind(
        user.username,
        user.global_name ?? null,
        user.avatar ?? null,
        user.id
      )
      .run();

    discordinyUser = {
      ...existingUser,
      username: user.username,
      global_name: user.global_name ?? null,
      avatar: user.avatar ?? null,
    };
  } else {
    const result = await c.env.DB
      .prepare(
        `INSERT INTO users
         (discord_id, username, global_name, avatar)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        user.id,
        user.username,
        user.global_name ?? null,
        user.avatar ?? null
      )
      .run();

    discordinyUser = {
      id: result.meta.last_row_id,
      discord_id: user.id,
      username: user.username,
      global_name: user.global_name ?? null,
      avatar: user.avatar ?? null,
    };
  }


  /* =======================================================
     CREATE LOGIN SESSION
  ======================================================= */

  const sessionId = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() +
      SESSION_DURATION_SECONDS * 1000
  ).toISOString();

  await c.env.DB
    .prepare(
      `INSERT INTO sessions
       (id, user_id, expires_at)
       VALUES (?, ?, ?)`
    )
    .bind(
      sessionId,
      discordinyUser.id,
      expiresAt
    )
    .run();


  /* =======================================================
     SET SECURE SESSION COOKIE
  ======================================================= */

  setCookie(
    c,
    SESSION_COOKIE,
    sessionId,
    {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
      prefix: "host",
    }
  );

  return c.redirect("/");
});


/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/auth/me", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        sessions.id,
        sessions.user_id,
        sessions.expires_at,
        users.discord_id,
        users.username,
        users.global_name,
        users.avatar
       FROM sessions
       INNER JOIN users
         ON users.id = sessions.user_id
       WHERE sessions.id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      id: string;
      user_id: number;
      expires_at: string;
      discord_id: string;
      username: string;
      global_name: string | null;
      avatar: string | null;
    }>();

  if (!session) {
    deleteCookie(c, SESSION_COOKIE, {
      path: "/",
      secure: true,
      prefix: "host",
    });

    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  if (
    new Date(session.expires_at).getTime() <=
    Date.now()
  ) {
    await c.env.DB
      .prepare(
        `DELETE FROM sessions
         WHERE id = ?`
      )
      .bind(sessionId)
      .run();

    deleteCookie(c, SESSION_COOKIE, {
      path: "/",
      secure: true,
      prefix: "host",
    });

    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  return c.json({
    authenticated: true,
    user: {
      id: session.user_id,
      discord_id: session.discord_id,
      username: session.username,
      global_name: session.global_name,
      avatar: session.avatar,
    },
  });
});


/* =========================================================
   LOGOUT
========================================================= */

app.get("/api/auth/logout", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (sessionId) {
    await c.env.DB
      .prepare(
        `DELETE FROM sessions
         WHERE id = ?`
      )
      .bind(sessionId)
      .run();
  }

  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: true,
    prefix: "host",
  });

  return c.redirect("/");
});


/* =========================================================
   BUNGIE LINK
========================================================= */

app.get("/api/bungie/link", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.redirect("/api/auth/login");
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      id: string;
    }>();

  if (!session) {
    return c.redirect("/api/auth/login");
  }

  const state = crypto.randomUUID();

  setCookie(
    c,
    BUNGIE_STATE_COOKIE,
    state,
    {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: BUNGIE_STATE_DURATION_SECONDS,
      prefix: "host",
    }
  );

  const params = new URLSearchParams({
    client_id: BUNGIE_CLIENT_ID,
    response_type: "code",
    state,
    redirect_uri: BUNGIE_REDIRECT_URI,
  });

  return c.redirect(
    `https://www.bungie.net/en/OAuth/Authorize?${params.toString()}`
  );
});


/* =========================================================
   BUNGIE CALLBACK
========================================================= */

app.get("/api/bungie/callback", async (c) => {
  const code = c.req.query("code");

  const returnedState = c.req.query("state");

  const savedState = getCookie(
    c,
    BUNGIE_STATE_COOKIE,
    "host"
  );

  /* -------------------------------------------------------
     Verify authorization code
  ------------------------------------------------------- */

  if (!code) {
    return c.json(
      {
        error:
          "Missing Bungie authorization code",
      },
      400
    );
  }


  /* -------------------------------------------------------
     Verify OAuth state
  ------------------------------------------------------- */

  if (
    !returnedState ||
    !savedState ||
    returnedState !== savedState
  ) {
    return c.json(
      {
        error:
          "Invalid Bungie OAuth state",
      },
      400
    );
  }


  /* -------------------------------------------------------
     Find logged-in Discordiny user
  ------------------------------------------------------- */

  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.redirect(
      "/api/auth/login"
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.redirect(
      "/api/auth/login"
    );
  }


  /* -------------------------------------------------------
     Exchange Bungie authorization code
     for an access token
  ------------------------------------------------------- */

  const tokenResponse = await fetch(
    "https://www.bungie.net/Platform/App/OAuth/Token/",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",

        "X-API-Key":
          c.env.BUNGIE_API_KEY,
      },

      body: new URLSearchParams({
        grant_type:
          "authorization_code",

        client_id:
          BUNGIE_CLIENT_ID,

        code,

        redirect_uri:
          BUNGIE_REDIRECT_URI,
      }),
    }
  );

  if (!tokenResponse.ok) {
    const error =
      await tokenResponse.text();

    console.error(
      "Bungie token exchange failed:",
      error
    );

    return c.json(
      {
        error:
          "Bungie token exchange failed",
      },
      500
    );
  }


  const tokenData =
    await tokenResponse.json<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token?: string;
    }>();


  /* -------------------------------------------------------
     Get Bungie memberships for current user
  ------------------------------------------------------- */

  const membershipResponse = await fetch(
    "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
    {
      method: "GET",

      headers: {
        "X-API-Key":
          c.env.BUNGIE_API_KEY,

        "Authorization":
          `Bearer ${tokenData.access_token}`,
      },
    }
  );

  if (!membershipResponse.ok) {
    const error =
      await membershipResponse.text();

    console.error(
      "Bungie membership lookup failed:",
      error
    );

    return c.json(
      {
        error:
          "Could not retrieve Bungie account",
      },
      500
    );
  }


  /* -------------------------------------------------------
     Bungie membership response
  ------------------------------------------------------- */

  const membershipData =
    await membershipResponse.json<{
      Response?: {
        bungieNetUser?: {
          membershipId?: string;
          displayName?: string;
          uniqueName?: string;
        };
        destinyMemberships?: Array<{
          membershipId?: string;
          membershipType?: number;
          displayName?: string;
          displayNameCode?: number;
          uniqueName?: string;
          crossSaveOverride?: number;
        }>;
      };
      ErrorCode?: number;
      ErrorStatus?: string;
      Message?: string;
    }>();


  /* -------------------------------------------------------
     Make sure Bungie returned account information
  ------------------------------------------------------- */

  const bungieNetUser =
    membershipData.Response?.bungieNetUser;

  const destinyMemberships =
    membershipData.Response?.destinyMemberships ?? [];

  if (
    !bungieNetUser ||
    !bungieNetUser.membershipId
  ) {
    console.error(
      "Bungie membership response did not contain a Bungie.net user:",
      JSON.stringify(membershipData)
    );

    return c.json(
      {
        error:
          "Bungie account information was not returned",
      },
      500
    );
  }


  /* -------------------------------------------------------
     Determine Bungie Name
  ------------------------------------------------------- */

  const bungieName =
    bungieNetUser.uniqueName ||
    bungieNetUser.displayName;

  if (!bungieName) {
    console.error(
      "Bungie membership response did not contain a Bungie name:",
      JSON.stringify(membershipData)
    );

    return c.json(
      {
        error:
          "Bungie account name was not returned",
      },
      500
    );
  }


  /* -------------------------------------------------------
     Determine membership type
     
     Prefer the active/cross-save membership when available.
     Otherwise use the first Destiny membership returned.
  ------------------------------------------------------- */

  let selectedMembership =
    destinyMemberships.find(
      (membership) =>
        membership.membershipId &&
        membership.membershipType !== undefined
    );

  if (!selectedMembership) {
    return c.json(
      {
        error:
          "No Destiny membership was returned for this Bungie account",
      },
      400
    );
  }


  const membershipId =
    selectedMembership.membershipId!;

  const membershipType =
    selectedMembership.membershipType!;


  /* -------------------------------------------------------
     Make sure this Bungie membership is not already
     linked to another Discordiny account.
  ------------------------------------------------------- */

  const existingBungieOwner =
    await c.env.DB
      .prepare(
        `SELECT user_id
         FROM bungie_accounts
         WHERE membership_type = ?
           AND membership_id = ?
         LIMIT 1`
      )
      .bind(
        membershipType,
        membershipId
      )
      .first<{
        user_id: number;
      }>();

  if (
    existingBungieOwner &&
    existingBungieOwner.user_id !==
      session.user_id
  ) {
    deleteCookie(
      c,
      BUNGIE_STATE_COOKIE,
      {
        path: "/",
        secure: true,
        prefix: "host",
      }
    );

    return c.redirect(
      "/account?bungie_error=already_linked"
    );
  }
  
  /* -------------------------------------------------------
     Save Bungie account
     
     If this Discordiny user already has a Bungie
     account linked, update it instead.
  ------------------------------------------------------- */

  await c.env.DB
    .prepare(
      `INSERT INTO bungie_accounts
       (
         user_id,
         membership_id,
         membership_type,
         bungie_name,
         access_token,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id)
       DO UPDATE SET
         membership_id = excluded.membership_id,
         membership_type = excluded.membership_type,
         bungie_name = excluded.bungie_name,
         access_token = excluded.access_token,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      session.user_id,
      membershipId,
      membershipType,
      bungieName,
      tokenData.access_token
    )
    .run();


  /* -------------------------------------------------------
     Remove OAuth state cookie
  ------------------------------------------------------- */

  deleteCookie(
    c,
    BUNGIE_STATE_COOKIE,
    {
      path: "/",
      secure: true,
      prefix: "host",
    }
  );


  /* -------------------------------------------------------
     Redirect Success
  ------------------------------------------------------- */

  return c.redirect("/account");
});

/* =========================================================
   CURRENT BUNGIE ACCOUNT
========================================================= */

app.get("/api/bungie/me", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        linked: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        linked: false,
      },
      401
    );
  }

  const bungieAccount = await c.env.DB
    .prepare(
      `SELECT
        membership_id,
        membership_type,
        bungie_name
       FROM bungie_accounts
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(session.user_id)
    .first<{
      membership_id: string;
      membership_type: number;
      bungie_name: string;
    }>();

  if (!bungieAccount) {
    return c.json({
      linked: false,
    });
  }

  return c.json({
    linked: true,
    account: {
      membership_id:
        bungieAccount.membership_id,

      membership_type:
        bungieAccount.membership_type,

      bungie_name:
        bungieAccount.bungie_name,
    },
  });
});

/* =========================================================
   UNLINK BUNGIE ACCOUNT
========================================================= */

app.post("/api/bungie/unlink", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        error: "Not authenticated",
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        error: "Not authenticated",
      },
      401
    );
  }

  await c.env.DB
    .prepare(
      `DELETE FROM bungie_accounts
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .run();

  return c.json({
    success: true,
  });
});

/* =========================================================
   GAME - WEAPON VAULT
========================================================= */

const VAULT_MAX_MASTERWORK = 77;

const VAULT_SPECIAL_VARIANT_SUFFIX =
  /\s*\((Adept|Timelost|Harrowed)\)\s*$/i;

function getVaultBaseWeaponName(
  weaponName: string,
): string {
  return weaponName
    .replace(VAULT_SPECIAL_VARIANT_SUFFIX, "")
    .trim();
}

function getVaultVariantSuffix(
  weaponName: string,
): "Adept" | "Timelost" | "Harrowed" | null {
  const match =
    weaponName.match(VAULT_SPECIAL_VARIANT_SUFFIX);

  if (!match) return null;

  const suffix = match[1].toLowerCase();

  if (suffix === "timelost") return "Timelost";
  if (suffix === "harrowed") return "Harrowed";
  return "Adept";
}


function getVaultMasterworkCost(
  rarity: string | null,
  weaponName: string,
  currentLevel: number,
): Record<string, number> {
  const specialVariant =
    getVaultVariantSuffix(weaponName) !== null;

  const effectiveRarity = specialVariant
    ? "exotic"
    : String(rarity ?? "Legendary")
        .trim()
        .toLowerCase();

  const cost: Record<string, number> = {
    Glimmer: 2500 * (currentLevel + 1),
  };

  if (effectiveRarity === "exotic") {
    cost["Enhancement Core"] =
      (currentLevel * 2 + 4) * 2;
    cost["Enhancement Prism"] =
      (currentLevel * 2 + 3) * 2;
    cost["Ascendant Shard"] =
      (currentLevel + 1) * 2;

    if (currentLevel >= 3) {
      cost["Ascendant Alloy"] =
        currentLevel - 2;
    }
  } else {
    cost["Enhancement Core"] =
      (currentLevel * 2 + 3) * 3;
    cost["Enhancement Prism"] =
      (currentLevel + 1) * 3;
    cost["Ascendant Shard"] =
      (currentLevel + 1) * 2;

    if (currentLevel >= 3) {
      cost["Ascendant Alloy"] =
        currentLevel - 2;
    }
  }

  return cost;
}

app.get("/api/game/vault/index", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(`SELECT user_id FROM sessions WHERE id = ? LIMIT 1`)
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const [catalog, owned] = await Promise.all([
    c.env.DB.prepare(
      `SELECT name, source FROM weapons ORDER BY source, name`,
    ).all<{ name: string; source: string | null }>(),
    c.env.DB.prepare(
      `SELECT weapon_name, masterwork FROM player_weapons WHERE user_id = ?`,
    ).bind(session.user_id).all<{ weapon_name: string; masterwork: number }>(),
  ]);

  const ownedMap = new Map(
    owned.results.map((row) => [
      row.weapon_name.trim().toLowerCase(),
      row.masterwork,
    ]),
  );

  const sources: Record<string, {
    normalOwned: number;
    normalTotal: number;
    adeptOwned: number;
    adeptTotal: number;
    owned: number;
    total: number;
    maxed: number;
  }> = {};

  let normalOwned = 0;
  let adeptOwned = 0;
  let maxed = 0;

  /*
   * The catalog may contain both "Weapon" and "Weapon (Adept)" rows.
   * Treat those as ONE logical weapon family. Otherwise the Vault index
   * double-counts the family and later code can manufacture
   * "Weapon (Adept) (Adept)".
   */
  const catalogFamilies = new Map<
    string,
    { name: string; source: string }
  >();

  for (const weapon of catalog.results) {
    const source = weapon.source ?? "unknown";
    const baseName = weapon.name
      .replace(VAULT_SPECIAL_VARIANT_SUFFIX, "")
      .trim();
    const familyKey =
      `${source.trim().toLowerCase()}::${baseName.toLowerCase()}`;

    if (!catalogFamilies.has(familyKey)) {
      catalogFamilies.set(familyKey, {
        name: baseName,
        source,
      });
    }
  }

  for (const weapon of catalogFamilies.values()) {
    const source = weapon.source;
    const normalKey = weapon.name.trim().toLowerCase();
    const specialKeys = [
      `${weapon.name} (Adept)`.trim().toLowerCase(),
      `${weapon.name} (Timelost)`.trim().toLowerCase(),
      `${weapon.name} (Harrowed)`.trim().toLowerCase(),
    ];
    const normalMw = ownedMap.get(normalKey);
    const adeptMw = specialKeys
      .map((key) => ownedMap.get(key))
      .find((value) => value !== undefined);

    const stats = sources[source] ?? {
      normalOwned: 0, normalTotal: 0, adeptOwned: 0, adeptTotal: 0,
      owned: 0, total: 0, maxed: 0,
    };

    stats.normalTotal += 1;
    stats.adeptTotal += 1;
    stats.total += 2;

    if (normalMw !== undefined) {
      normalOwned += 1;
      stats.normalOwned += 1;
      stats.owned += 1;
      if (normalMw >= VAULT_MAX_MASTERWORK) { maxed += 1; stats.maxed += 1; }
    }

    if (adeptMw !== undefined) {
      adeptOwned += 1;
      stats.adeptOwned += 1;
      stats.owned += 1;
      if (adeptMw >= VAULT_MAX_MASTERWORK) { maxed += 1; stats.maxed += 1; }
    }

    sources[source] = stats;
  }

  const normalTotal = catalogFamilies.size;
  const adeptTotal = catalogFamilies.size;
  const total = normalTotal + adeptTotal;
  const totalOwned = normalOwned + adeptOwned;

  return c.json({
    authenticated: true,
    maxMasterwork: VAULT_MAX_MASTERWORK,
    collection: {
      owned: totalOwned,
      total,
      percentage: total > 0 ? totalOwned / total * 100 : 0,
      maxed,
      normal: { owned: normalOwned, total: normalTotal },
      adept: { owned: adeptOwned, total: adeptTotal },
    },
    sources,
  });
});

app.get("/api/game/weapons/masterwork", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) return c.json({ authenticated: false }, 401);

  const session = await c.env.DB
    .prepare(`SELECT user_id FROM sessions WHERE id = ? LIMIT 1`)
    .bind(sessionId)
    .first<{ user_id: number }>();
  if (!session) return c.json({ authenticated: false }, 401);

  const weaponName = c.req.query("weaponName")?.trim();
  if (!weaponName) return c.json({ error: "Missing weapon name" }, 400);

  const ownedWeapon = await c.env.DB
    .prepare(`SELECT masterwork FROM player_weapons WHERE user_id = ? AND lower(weapon_name) = lower(?) LIMIT 1`)
    .bind(session.user_id, weaponName)
    .first<{ masterwork: number }>();
  if (!ownedWeapon) return c.json({ error: "You do not own this weapon." }, 403);

  const currentMasterwork = Math.max(0, Number(ownedWeapon.masterwork) || 0);
  const baseName = getVaultBaseWeaponName(weaponName);
  const catalogWeapon = await c.env.DB
    .prepare(`SELECT rarity FROM weapons WHERE lower(name) = lower(?) LIMIT 1`)
    .bind(
      baseName,
      `${baseName} (Adept)`,
      `${baseName} (Timelost)`,
      `${baseName} (Harrowed)`,
    )
    .first<{ rarity: string | null }>();
  if (!catalogWeapon) return c.json({ error: "Weapon is not in the Vault catalog." }, 404);

  return c.json({
    authenticated: true,
    weaponName,
    masterwork: currentMasterwork,
    maxMasterwork: VAULT_MAX_MASTERWORK,
    maxed: currentMasterwork >= VAULT_MAX_MASTERWORK,
    cost: currentMasterwork >= VAULT_MAX_MASTERWORK
      ? {}
      : getVaultMasterworkCost(catalogWeapon.rarity, weaponName, currentMasterwork),
  });
});

app.post("/api/game/weapons/masterwork", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) {
    return c.json({ authenticated: false, error: "Not authenticated" }, 401);
  }

  const session = await c.env.DB
    .prepare(`SELECT user_id FROM sessions WHERE id = ? LIMIT 1`)
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false, error: "Not authenticated" }, 401);
  }

  let body: {
    weaponName?: string;
    amount?: 1 | 10 | "max";
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const weaponName = body.weaponName?.trim();
  const amount = body.amount ?? 1;

  if (!weaponName) {
    return c.json({ error: "Invalid weapon name" }, 400);
  }

  if (amount !== 1 && amount !== 10 && amount !== "max") {
    return c.json({ error: "Invalid Masterwork amount" }, 400);
  }

  const ownedWeapon = await c.env.DB
    .prepare(
      `SELECT masterwork
       FROM player_weapons
       WHERE user_id = ?
         AND lower(weapon_name) = lower(?)
       LIMIT 1`,
    )
    .bind(session.user_id, weaponName)
    .first<{ masterwork: number }>();

  if (!ownedWeapon) {
    return c.json({ error: "You do not own this weapon." }, 403);
  }

  const currentMasterwork = Math.min(
    VAULT_MAX_MASTERWORK,
    Math.max(0, Number(ownedWeapon.masterwork) || 0),
  );

  if (currentMasterwork >= VAULT_MAX_MASTERWORK) {
    return c.json(
      { error: "This weapon is already fully masterworked." },
      409,
    );
  }

  const baseName = getVaultBaseWeaponName(weaponName);

  const catalogWeapon = await c.env.DB
    .prepare(
      `SELECT rarity
       FROM weapons
       WHERE lower(name) = lower(?)
          OR lower(name) = lower(?)
          OR lower(name) = lower(?)
          OR lower(name) = lower(?)
       LIMIT 1`,
    )
    .bind(baseName)
    .first<{ rarity: string | null }>();

  if (!catalogWeapon) {
    return c.json(
      { error: "Weapon is not in the Vault catalog." },
      404,
    );
  }

  const [currencyRows, materialRows] = await Promise.all([
    c.env.DB
      .prepare(
        `SELECT currency_name, amount
         FROM player_currencies
         WHERE user_id = ?`,
      )
      .bind(session.user_id)
      .all<{ currency_name: string; amount: number }>(),
    c.env.DB
      .prepare(
        `SELECT material_name, amount
         FROM player_upgrade_materials
         WHERE user_id = ?`,
      )
      .bind(session.user_id)
      .all<{ material_name: string; amount: number }>(),
  ]);

  const available = new Map<string, number>();

  for (const row of currencyRows.results) {
    available.set(row.currency_name, Number(row.amount) || 0);
  }

  for (const row of materialRows.results) {
    available.set(row.material_name, Number(row.amount) || 0);
  }

  const cumulativeCost: Record<string, number> = {};
  let targetMasterwork = currentMasterwork;

  const requestedTarget =
    amount === "max"
      ? VAULT_MAX_MASTERWORK
      : Math.min(
          VAULT_MAX_MASTERWORK,
          currentMasterwork + amount,
        );

  for (
    let level = currentMasterwork;
    level < requestedTarget;
    level += 1
  ) {
    const rankCost = getVaultMasterworkCost(
      catalogWeapon.rarity,
      weaponName,
      level,
    );

    const candidateCost = {
      ...cumulativeCost,
    };

    for (const [material, costAmount] of Object.entries(rankCost)) {
      candidateCost[material] =
        (candidateCost[material] ?? 0) + costAmount;
    }

    const affordable = Object.entries(candidateCost).every(
      ([material, costAmount]) =>
        (available.get(material) ?? 0) >= costAmount,
    );

    if (!affordable) {
      break;
    }

    Object.assign(cumulativeCost, candidateCost);
    targetMasterwork = level + 1;
  }

  const ranksGained =
    targetMasterwork - currentMasterwork;

  if (ranksGained <= 0) {
    return c.json(
      {
        error: "You do not have enough materials for another Masterwork rank.",
        masterwork: currentMasterwork,
        maxMasterwork: VAULT_MAX_MASTERWORK,
      },
      409,
    );
  }

  /*
   * +1 and +10 are exact actions.
   * If the requested number of ranks cannot be fully afforded,
   * spend nothing. MAX is intentionally partial and stops at the
   * highest affordable rank.
   */
  if (
    amount !== "max" &&
    targetMasterwork !== requestedTarget
  ) {
    return c.json(
      {
        error:
          amount === 10
            ? "You do not have enough materials to Masterwork +10."
            : "You do not have enough materials to Masterwork +1.",
        masterwork: currentMasterwork,
        maxMasterwork: VAULT_MAX_MASTERWORK,
      },
      409,
    );
  }

  const statements = Object.entries(cumulativeCost).map(
    ([material, costAmount]) =>
      material === "Glimmer"
        ? c.env.DB
            .prepare(
              `UPDATE player_currencies
               SET amount = amount - ?
               WHERE user_id = ?
                 AND currency_name = ?
                 AND amount >= ?`,
            )
            .bind(
              costAmount,
              session.user_id,
              material,
              costAmount,
            )
        : c.env.DB
            .prepare(
              `UPDATE player_upgrade_materials
               SET amount = amount - ?
               WHERE user_id = ?
                 AND material_name = ?
                 AND amount >= ?`,
            )
            .bind(
              costAmount,
              session.user_id,
              material,
              costAmount,
            ),
  );

  statements.push(
    c.env.DB
      .prepare(
        `UPDATE player_weapons
         SET masterwork = ?
         WHERE user_id = ?
           AND lower(weapon_name) = lower(?)
           AND masterwork = ?
           AND masterwork < ?`,
      )
      .bind(
        targetMasterwork,
        session.user_id,
        weaponName,
        currentMasterwork,
        VAULT_MAX_MASTERWORK,
      ),
  );

  await c.env.DB.batch(statements);

  const updated = await c.env.DB
    .prepare(
      `SELECT masterwork
       FROM player_weapons
       WHERE user_id = ?
         AND lower(weapon_name) = lower(?)
       LIMIT 1`,
    )
    .bind(session.user_id, weaponName)
    .first<{ masterwork: number }>();

  if (!updated || updated.masterwork !== targetMasterwork) {
    return c.json(
      {
        error:
          "Masterwork state changed. Refresh and try again.",
      },
      409,
    );
  }

  return c.json({
    success: true,
    weaponName,
    previousMasterwork: currentMasterwork,
    masterwork: updated.masterwork,
    ranksGained,
    maxMasterwork: VAULT_MAX_MASTERWORK,
    cost: cumulativeCost,
    maxed:
      updated.masterwork >= VAULT_MAX_MASTERWORK,
  });
});

app.get("/api/game/weapons", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
        weapons: [],
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
        weapons: [],
      },
      401
    );
  }

  const source = c.req.query("source");

  if (!source) {
    return c.json(
      {
        authenticated: true,
        error: "Missing weapon source",
        weapons: [],
      },
      400
    );
  }

  /*
   * Load every weapon belonging to this
   * activity/source from the master catalog.
   */
  const catalog = await c.env.DB
    .prepare(
      `SELECT
         name,
         emoji_id,
         rarity,
         source,
         activity_type
       FROM weapons
       WHERE source = ?
       ORDER BY name ASC`
    )
    .bind(source)
    .all<{
      name: string;
      emoji_id: string | null;
      rarity: string | null;
      source: string | null;
      activity_type: string | null;
    }>();

  /*
   * Load the current player's owned weapons.
   */
  const owned = await c.env.DB
    .prepare(
      `SELECT
         weapon_name,
         masterwork
       FROM player_weapons
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      weapon_name: string;
      masterwork: number;
    }>();

  /*
   * Map owned weapon names for fast lookup.
   */
  const ownedMap = new Map<
    string,
    number
  >();

  for (const weapon of owned.results) {
    ownedMap.set(
      weapon.weapon_name.trim().toLowerCase(),
      weapon.masterwork
    );
  }

  /*
   * IMPORTANT:
   *
   * weapons is deliberately returned as an ARRAY.
   *
   * Even when no weapons exist for a source,
   * the response will be:
   *
   * weapons: []
   *
   * Never weapons: {}
   */
  /*
   * Canonicalize catalog rows into weapon families.
   *
   * Some catalog sources already contain explicit "(Adept)" rows.
   * Those rows belong to the same family as the normal weapon and must
   * not become a second card or receive another "(Adept)" suffix.
   */
  const catalogFamilies = new Map<
    string,
    {
      name: string;
      emoji_id: string | null;
      rarity: string | null;
      source: string | null;
      activity_type: string | null;
      variantSuffix: "Adept" | "Timelost" | "Harrowed";
    }
  >();

  for (const weapon of catalog.results) {
    const baseName =
      getVaultBaseWeaponName(weapon.name);
    const familyKey = baseName.toLowerCase();
    const existing = catalogFamilies.get(familyKey);
    const rowSuffix =
      getVaultVariantSuffix(weapon.name);

    if (!existing) {
      catalogFamilies.set(familyKey, {
        name: baseName,
        emoji_id: weapon.emoji_id,
        rarity: weapon.rarity,
        source: weapon.source,
        activity_type: weapon.activity_type,
        variantSuffix: rowSuffix ?? "Adept",
      });
      continue;
    }

    if (rowSuffix) {
      existing.variantSuffix = rowSuffix;
    }

    if (!rowSuffix) {
      existing.emoji_id = weapon.emoji_id;
      existing.rarity = weapon.rarity;
      existing.source = weapon.source;
      existing.activity_type = weapon.activity_type;
    }
  }

  const weapons = Array.from(catalogFamilies.values()).map(
    (weapon) => {
      const normalName = weapon.name;
      const specialName =
        `${weapon.name} (${weapon.variantSuffix})`;
      const normalKey =
        normalName.trim().toLowerCase();
      const specialKey =
        specialName.trim().toLowerCase();

      return {
        name: weapon.name,

        emojiId:
          weapon.emoji_id,

        rarity:
          weapon.rarity,

        source:
          weapon.source,

        activityType:
          weapon.activity_type,

        variantSuffix:
          weapon.variantSuffix,

        normal: {
          owned: ownedMap.has(normalKey),

          masterwork:
            ownedMap.get(normalKey) ?? 0,
        },

        adept: {
          owned: ownedMap.has(specialKey),

          masterwork:
            ownedMap.get(specialKey) ?? 0,
        },
      };
    }
  );

  return c.json({
    authenticated: true,
    source,
    weapons,
  });
});


/* =========================================================
   GAME - PROFILE
========================================================= */


app.get("/api/game/profile", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }


  /* =======================================================
     IMPORT GAME CALCULATIONS
  ======================================================= */

  const { getLevelProgress } =
    await import("./game/level");

  const {
    calculateWeaponPower,
    calculateArmorPower,
    calculateArtifactPower,
    calculateLevelPower,
  } = await import("./game/power");

  /* =======================================================
     PLAYER PROFILE
  ======================================================= */

  let profile =
    await c.env.DB
      .prepare(
        `SELECT
          level,
          exp,
          power,
          zone
         FROM player_profiles
         WHERE user_id = ?
         LIMIT 1`
      )
      .bind(session.user_id)
      .first<{
        level: number;
        exp: number;
        power: number;
        zone: string;
      }>();

  if (!profile) {
    await c.env.DB
      .prepare(
        `INSERT INTO player_profiles
          (
            user_id,
            level,
            exp,
            power,
            zone
          )
         VALUES (?, 0, 0, 0, 'Cosmodrome')`
      )
      .bind(session.user_id)
      .run();

    profile = {
      level: 0,
      exp: 0,
      power: 0,
      zone: "Cosmodrome",
    };
  }

  /* =======================================================
     DISCORD USER
  ======================================================= */

  const user =
    await c.env.DB
      .prepare(
        `SELECT
          id,
          discord_id,
          username,
          global_name,
          avatar
         FROM users
         WHERE id = ?
         LIMIT 1`
      )
      .bind(session.user_id)
      .first<{
        id: number;
        discord_id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
      }>();

  /* =======================================================
     LEVEL INFORMATION
  ======================================================= */

  const levelProgress =
    getLevelProgress(
      Number(profile.exp) || 0
    );

  /* =======================================================
     WEAPONS
  ======================================================= */

  const weapons =
    await c.env.DB
      .prepare(
        `SELECT
          player_weapons.weapon_name,
          player_weapons.masterwork,
          weapons.rarity
         FROM player_weapons
         LEFT JOIN weapons
           ON weapons.name =
              player_weapons.weapon_name
         WHERE player_weapons.user_id = ?`
      )
      .bind(session.user_id)
      .all<WeaponRow>();

  const weaponRows =
    weapons.results ?? [];

  const weaponPower =
    calculateWeaponPower(
      weaponRows
    );

  const totalWeapons =
    await c.env.DB
      .prepare(
        `SELECT COUNT(*) AS count
         FROM weapons`
      )
      .first<{
        count: number;
      }>();

  /* =======================================================
     ARMOR
  ======================================================= */

  const armor =
    await c.env.DB
      .prepare(
        `SELECT
          helmet,
          arms,
          chest,
          legs
         FROM player_armor
         WHERE user_id = ?
         LIMIT 1`
      )
      .bind(session.user_id)
      .first<ArmorRow>();

  const armorPower =
    calculateArmorPower(
      armor ?? null
    );

  /* =======================================================
     ARTIFACTS
  ======================================================= */

  const artifacts =
    await c.env.DB
      .prepare(
        `SELECT
          artifact_name,
          level
         FROM player_artifacts
         WHERE user_id = ?`
      )
      .bind(session.user_id)
      .all<ArtifactRow>();

  const artifactRows =
    artifacts.results ?? [];

  const artifactPower =
    calculateArtifactPower(
      artifactRows
    );

  /* =======================================================
     LEVEL POWER
  ======================================================= */

  const levelPower =
    calculateLevelPower(
      levelProgress.level
    );

  /* =======================================================
     POWER BREAKDOWN
  ======================================================= */

  const calculatedPower =
    weaponPower +
    armorPower +
    artifactPower +
    levelPower;

  /* =======================================================
     CURRENCIES
  ======================================================= */

  const currencies =
    await c.env.DB
      .prepare(
        `SELECT
          currency_name,
          amount
         FROM player_currencies
         WHERE user_id = ?
         ORDER BY currency_name`
      )
      .bind(session.user_id)
      .all<{
        currency_name: string;
        amount: number;
      }>();

  const currencyMap: Record<
    string,
    number
  > = {};

  for (const row of currencies.results ?? []) {
    currencyMap[row.currency_name] =
      row.amount;
  }

  /* =======================================================
     UPGRADE MATERIALS
  ======================================================= */

  const upgradeMaterials =
    await c.env.DB
      .prepare(
        `SELECT
          material_name,
          amount
         FROM player_upgrade_materials
         WHERE user_id = ?
         ORDER BY material_name`
      )
      .bind(session.user_id)
      .all<{
        material_name: string;
        amount: number;
      }>();

  const upgradeMaterialMap: Record<
    string,
    number
  > = {};

  for (
    const row of
      upgradeMaterials.results ?? []
  ) {
    upgradeMaterialMap[
      row.material_name
    ] = row.amount;
  }

  /* =======================================================
     RESPONSE
  ======================================================= */

  return c.json({
    authenticated: true,

    user,

    profile: {
      level: levelProgress.level,
      exp: levelProgress.totalXp,
      power: calculatedPower,
      zone: profile.zone,
    },

    level: {
      current: levelProgress.level,
      max: 100,
      totalXp: levelProgress.totalXp,
      currentXp: levelProgress.currentXp,
      nextXp: levelProgress.nextXp,
      percentage: levelProgress.percentage,
    },

    power: {
      total: calculatedPower,

      breakdown: {
        weapons: weaponPower,
        armor: armorPower,
        artifacts: artifactPower,
        level: levelPower,
      },
    },

    weapons: {
      owned: weaponRows.length,
      total: Number(
        totalWeapons?.count ?? 0
      ),
    },

    armor: armor ?? {
      helmet: "placeholder",
      arms: "placeholder",
      chest: "placeholder",
      legs: "placeholder",
    },

    artifacts: artifactRows,

    currencies: currencyMap,

    upgradeMaterials:
      upgradeMaterialMap,
  });
});

app.post("/api/game/travel", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host",
  );

  if (!sessionId) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  let body: {
    destination?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: "Invalid JSON body" },
      400,
    );
  }

  const destinations = [
    "Plaguelands",
    "Cosmodrome",
    "EDZ",
    "Nessus",
    "Dreaming City",
    "Moon",
    "Europa",
    "Throne World",
    "Neomuna",
    "Pale Heart",
  ];

  if (
    typeof body.destination !== "string" ||
    !destinations.includes(body.destination)
  ) {
    return c.json(
      { error: "Invalid destination" },
      400,
    );
  }

  await c.env.DB
    .prepare(
      `UPDATE player_profiles
       SET zone = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
    )
    .bind(
      body.destination,
      session.user_id,
    )
    .run();

  return c.json({
    success: true,
    zone: body.destination,
  });
});

/* =========================================================
   GAME - EXPLORATION CLAIM

   Legacy cogs/zone.py behavior, with intentionally removed
   systems left out:
   - no fishing
   - no SIVA event
   - no Acclaim

   The old Acclaim-gated destination material remains as a
   normal exploration reward, using its base 25-50 roll.
========================================================= */

app.post("/api/game/explore/test-max", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) return c.json({ authenticated: false }, 401);

  const session = await c.env.DB
    .prepare(`SELECT user_id FROM sessions WHERE id = ? LIMIT 1`)
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) return c.json({ authenticated: false }, 401);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const testLastClaim = nowSeconds - EXPLORE_MAX_SECONDS;

  await c.env.DB
    .prepare(
      `INSERT INTO player_cooldowns (user_id, activity, timestamp)
       VALUES (?, 'explore', ?)
       ON CONFLICT(user_id, activity)
       DO UPDATE SET timestamp = excluded.timestamp`,
    )
    .bind(session.user_id, testLastClaim)
    .run();

  return c.json({
    success: true,
    lastClaim: testLastClaim,
    elapsedSeconds: EXPLORE_MAX_SECONDS,
  });
});

app.post("/api/game/explore/claim", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");
  if (!sessionId) return c.json({ authenticated: false }, 401);

  const session = await c.env.DB
    .prepare(`SELECT user_id FROM sessions WHERE id = ? LIMIT 1`)
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) return c.json({ authenticated: false }, 401);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const profile = await c.env.DB
    .prepare(`SELECT exp, zone FROM player_profiles WHERE user_id = ? LIMIT 1`)
    .bind(session.user_id)
    .first<{ exp: number; zone: string }>();

  if (!profile) return c.json({ error: "Player profile not found." }, 404);

  const cooldown = await c.env.DB
    .prepare(
      `SELECT timestamp FROM player_cooldowns
       WHERE user_id = ? AND activity = 'explore' LIMIT 1`,
    )
    .bind(session.user_id)
    .first<{ timestamp: number }>();

  if (!cooldown) {
    await c.env.DB.prepare(
      `INSERT INTO player_cooldowns (user_id, activity, timestamp)
       VALUES (?, 'explore', ?) ON CONFLICT(user_id, activity) DO NOTHING`,
    ).bind(session.user_id, nowSeconds).run();
    return c.json({ error: "No exploration rewards are ready yet." }, 409);
  }

  const lastClaim = Number(cooldown.timestamp);
  if (!Number.isFinite(lastClaim) || lastClaim < 0 || lastClaim > nowSeconds) {
    await c.env.DB.prepare(
      `UPDATE player_cooldowns SET timestamp = ?
       WHERE user_id = ? AND activity = 'explore'`,
    ).bind(nowSeconds, session.user_id).run();
    return c.json({ error: "Exploration timer was reset. Try again after exploring." }, 409);
  }

  const elapsedSeconds = Math.min(
    EXPLORE_MAX_SECONDS,
    Math.max(0, nowSeconds - lastClaim),
  );

  if (elapsedSeconds < 25) {
    return c.json({ error: "No exploration rewards are ready yet." }, 409);
  }

  const claim = await c.env.DB.prepare(
    `UPDATE player_cooldowns SET timestamp = ?
     WHERE user_id = ? AND activity = 'explore' AND timestamp = ?`,
  ).bind(nowSeconds, session.user_id, lastClaim).run();

  if (claim.meta.changes !== 1) {
    return c.json({ error: "Exploration rewards were already claimed." }, 409);
  }

  /*
   * Use the same XP-derived level that the profile and activities UI use.
   * player_profiles.level can be stale and must not gate Exploration rewards.
   */
  const { getLevelProgress } =
    await import("./game/level");

  const levelProgress =
    getLevelProgress(
      Number(profile.exp) || 0,
    );

  const level =
    levelProgress.level;

  const scaleReward = (maximum: number): number =>
    Math.min(maximum, Math.floor(maximum * elapsedSeconds / EXPLORE_MAX_SECONDS));

  const glimmer = scaleReward(250000);
  const enhancementCores = scaleReward(1000);
  const enhancementPrisms = level >= 15 ? scaleReward(750) : 0;
  const ascendantShards = level >= 25 ? scaleReward(500) : 0;
  const ascendantAlloys = level >= 35 ? scaleReward(500) : 0;
  const xp = scaleReward(150000);

  const destinationMaterials: Record<string, string> = {
    Cosmodrome: "Spinmetal Leaf",
    EDZ: "Dusklight Shard",
    Nessus: "Microphasic Datalattice",
    "Dreaming City": "Baryon Bough",
    Moon: "Helium Filament",
    Europa: "Glacial Starwort",
    "Throne World": "Cunning Essence",
    Neomuna: "Cloudark Datachip",
    "Pale Heart": "Prismatic Fragment",
  };

  const destinationMaterial = destinationMaterials[profile.zone];
  const destinationMaterialAmount = destinationMaterial ? scaleReward(5000) : 0;

  const rewards: Record<string, number> = {};
  if (glimmer > 0) rewards.Glimmer = glimmer;
  if (enhancementCores > 0) rewards["Enhancement Core"] = enhancementCores;
  if (enhancementPrisms > 0) rewards["Enhancement Prism"] = enhancementPrisms;
  if (ascendantShards > 0) rewards["Ascendant Shard"] = ascendantShards;
  if (ascendantAlloys > 0) rewards["Ascendant Alloy"] = ascendantAlloys;
  if (destinationMaterial && destinationMaterialAmount > 0) {
    rewards[destinationMaterial] = destinationMaterialAmount;
  }

  const statsRow = await c.env.DB.prepare(
    `SELECT stats FROM player_stats WHERE user_id = ? LIMIT 1`,
  ).bind(session.user_id).first<{ stats: string }>();

  let exoticChance = 0;
  let legendaryChance = 0;
  if (statsRow?.stats) {
    try {
      const parsed = JSON.parse(statsRow.stats) as {
        weapons?: { exotic_chance?: number; legendary_chance?: number };
      };
      exoticChance = Math.max(0, Number(parsed.weapons?.exotic_chance ?? 0) || 0);
      legendaryChance = Math.max(0, Number(parsed.weapons?.legendary_chance ?? 0) || 0);
    } catch {
      exoticChance = 0;
      legendaryChance = 0;
    }
  }

  const weaponCatalog = await c.env.DB.prepare(
    `SELECT name, rarity FROM weapons WHERE lower(source) = lower(?) ORDER BY name`,
  ).bind(profile.zone).all<{ name: string; rarity: string | null }>();

  const ownedWeapons = await c.env.DB.prepare(
    `SELECT weapon_name FROM player_weapons WHERE user_id = ?`,
  ).bind(session.user_id).all<{ weapon_name: string }>();

  const ownedWeaponNames = new Set((ownedWeapons.results ?? []).map(w => w.weapon_name));
  const availableWeapons = (weaponCatalog.results ?? []).filter(w => !ownedWeaponNames.has(w.name));
  const exoticWeapons = availableWeapons.filter(w => w.rarity === "Exotic");
  const legendaryWeapons = availableWeapons.filter(w => w.rarity === "Legendary");
  const weaponRoll = Math.random();
  let droppedWeapon: { name: string; rarity: string | null } | null = null;

  if (exoticWeapons.length > 0 && weaponRoll < exoticChance) {
    droppedWeapon = exoticWeapons[Math.floor(Math.random() * exoticWeapons.length)];
  } else if (legendaryWeapons.length > 0 && weaponRoll < exoticChance + legendaryChance) {
    droppedWeapon = legendaryWeapons[Math.floor(Math.random() * legendaryWeapons.length)];
  }

  const writes: D1PreparedStatement[] = [];
  const addCurrency = (name: string, amount: number) => {
    if (amount <= 0) return;
    writes.push(c.env.DB.prepare(
      `INSERT INTO player_currencies (user_id, currency_name, amount) VALUES (?, ?, ?)
       ON CONFLICT(user_id, currency_name) DO UPDATE SET amount = player_currencies.amount + excluded.amount`,
    ).bind(session.user_id, name, amount));
  };
  const addUpgrade = (name: string, amount: number) => {
    if (amount <= 0) return;
    writes.push(c.env.DB.prepare(
      `INSERT INTO player_upgrade_materials (user_id, material_name, amount) VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_upgrade_materials.amount + excluded.amount`,
    ).bind(session.user_id, name, amount));
  };

  addCurrency("Glimmer", glimmer);
  addUpgrade("Enhancement Core", enhancementCores);
  addUpgrade("Enhancement Prism", enhancementPrisms);
  addUpgrade("Ascendant Shard", ascendantShards);
  addUpgrade("Ascendant Alloy", ascendantAlloys);

  if (destinationMaterial && destinationMaterialAmount > 0) {
    writes.push(c.env.DB.prepare(
      `INSERT INTO player_destination_materials (user_id, material_name, amount) VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_destination_materials.amount + excluded.amount`,
    ).bind(session.user_id, destinationMaterial, destinationMaterialAmount));
  }

  if (xp > 0) {
    writes.push(c.env.DB.prepare(
      `UPDATE player_profiles SET exp = exp + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
    ).bind(xp, session.user_id));
  }

  if (droppedWeapon) {
    writes.push(c.env.DB.prepare(
      `INSERT INTO player_weapons (user_id, weapon_name, masterwork) VALUES (?, ?, 0)
       ON CONFLICT(user_id, weapon_name) DO NOTHING`,
    ).bind(session.user_id, droppedWeapon.name));
  }

  if (writes.length > 0) await c.env.DB.batch(writes);

  return c.json({
    success: true,
    destination: profile.zone,
    elapsedSeconds,
    percentage: Math.min(100, elapsedSeconds / EXPLORE_MAX_SECONDS * 100),
    level,
    unlocks: {
      enhancementPrism: level >= 15,
      ascendantShard: level >= 25,
      ascendantAlloy: level >= 35,
    },
    xp,
    rewards,
    weapon: {
      dropped: Boolean(droppedWeapon),
      name: droppedWeapon?.name ?? null,
      rarity: droppedWeapon?.rarity ?? null,
    },
  });
});

app.get("/api/game/stats", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const stats = await c.env.DB
    .prepare(
      `SELECT
        stats
       FROM player_stats
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(session.user_id)
    .first<{
      stats: string;
    }>();

  if (!stats) {
    return c.json({
      authenticated: true,
      stats: {},
    });
  }

  let parsedStats: Record<string, unknown>;

  try {
    parsedStats = JSON.parse(stats.stats);
  } catch {
    parsedStats = {};
  }

  return c.json({
    authenticated: true,
    stats: parsedStats,
  });
});

app.post("/api/game/stats", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  let body: {
    stats?: Record<string, unknown>;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400
    );
  }

  if (!body.stats || typeof body.stats !== "object") {
    return c.json(
      {
        error: "Invalid stats data",
      },
      400
    );
  }

  const statsJson = JSON.stringify(body.stats);

  await c.env.DB
    .prepare(
      `INSERT INTO player_stats
        (
          user_id,
          stats
        )
       VALUES (?, ?)
       ON CONFLICT(user_id)
       DO UPDATE SET
         stats = excluded.stats,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      session.user_id,
      statsJson
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/cooldowns", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT
        activity,
        timestamp
       FROM player_cooldowns
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      activity: string;
      timestamp: number;
    }>();

  const cooldowns: Record<string, number> = {};

  for (const row of rows.results) {
    cooldowns[row.activity] = row.timestamp;
  }

  return c.json({
    authenticated: true,
    cooldowns,
  });
});

app.post("/api/game/cooldowns", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  let body: {
    activity?: string;
    timestamp?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400
    );
  }

  if (
    typeof body.activity !== "string" ||
    body.activity.trim() === ""
  ) {
    return c.json(
      {
        error: "Invalid activity",
      },
      400
    );
  }

  if (
    (
      body.activity.startsWith("__endgame_") ||
      body.activity.startsWith("__vanguard_") ||
      body.activity.startsWith("__infiltration") ||
      body.activity.startsWith("__showdown_") ||
      body.activity.startsWith("__crawl")
    )
  ) {
    return c.json(
      {
        error:
          "That cooldown is managed by the game server.",
      },
      403
    );
  }

  if (
    typeof body.timestamp !== "number" ||
    !Number.isFinite(body.timestamp)
  ) {
    return c.json(
      {
        error: "Invalid timestamp",
      },
      400
    );
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_cooldowns
        (
          user_id,
          activity,
          timestamp
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, activity)
       DO UPDATE SET
         timestamp = excluded.timestamp`
    )
    .bind(
      session.user_id,
      body.activity,
      body.timestamp
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/currencies", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT
        currency_name,
        amount
       FROM player_currencies
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      currency_name: string;
      amount: number;
    }>();

  const currencies: Record<string, number> = {};

  for (const row of rows.results) {
    currencies[row.currency_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    currencies,
  });
});

app.post("/api/game/currencies", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  let body: {
    currency_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400
    );
  }

  if (
    typeof body.currency_name !== "string" ||
    body.currency_name.trim() === ""
  ) {
    return c.json(
      {
        error: "Invalid currency name",
      },
      400
    );
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json(
      {
        error: "Invalid amount",
      },
      400
    );
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_currencies
        (
          user_id,
          currency_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, currency_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.currency_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/upgrade-materials", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT
        material_name,
        amount
       FROM player_upgrade_materials
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      material_name: string;
      amount: number;
    }>();

  const materials: Record<string, number> = {};

  for (const row of rows.results) {
    materials[row.material_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    materials,
  });
});

app.post("/api/game/upgrade-materials", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  let body: {
    material_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400
    );
  }

  if (
    typeof body.material_name !== "string" ||
    body.material_name.trim() === ""
  ) {
    return c.json(
      {
        error: "Invalid material name",
      },
      400
    );
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json(
      {
        error: "Invalid amount",
      },
      400
    );
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_upgrade_materials
        (
          user_id,
          material_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.material_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/destination-materials", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT
        material_name,
        amount
       FROM player_destination_materials
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      material_name: string;
      amount: number;
    }>();

  const materials: Record<string, number> = {};

  for (const row of rows.results) {
    materials[row.material_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    materials,
  });
});

app.post("/api/game/destination-materials", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host"
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
        user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{
      user_id: number;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
      },
      401
    );
  }

  let body: {
    material_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400
    );
  }

  if (
    typeof body.material_name !== "string" ||
    body.material_name.trim() === ""
  ) {
    return c.json(
      {
        error: "Invalid material name",
      },
      400
    );
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json(
      {
        error: "Invalid amount",
      },
      400
    );
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_destination_materials
        (
          user_id,
          material_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.material_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/dungeon-materials", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT material_name, amount
       FROM player_dungeon_materials
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      material_name: string;
      amount: number;
    }>();

  const materials: Record<string, number> = {};

  for (const row of rows.results) {
    materials[row.material_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    materials,
  });
});

app.post("/api/game/dungeon-materials", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    material_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.material_name !== "string" ||
    body.material_name.trim() === ""
  ) {
    return c.json({ error: "Invalid material name" }, 400);
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_dungeon_materials
        (
          user_id,
          material_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.material_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/raid-materials", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT material_name, amount
       FROM player_raid_materials
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      material_name: string;
      amount: number;
    }>();

  const materials: Record<string, number> = {};

  for (const row of rows.results) {
    materials[row.material_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    materials,
  });
});

app.post("/api/game/raid-materials", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    material_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.material_name !== "string" ||
    body.material_name.trim() === ""
  ) {
    return c.json({ error: "Invalid material name" }, 400);
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_raid_materials
        (
          user_id,
          material_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, material_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.material_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/fish", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT fish_name, amount
       FROM player_fish
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      fish_name: string;
      amount: number;
    }>();

  const fish: Record<string, number> = {};

  for (const row of rows.results) {
    fish[row.fish_name] = row.amount;
  }

  return c.json({
    authenticated: true,
    fish,
  });
});

app.post("/api/game/fish", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    fish_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.fish_name !== "string" ||
    body.fish_name.trim() === ""
  ) {
    return c.json({ error: "Invalid fish name" }, 400);
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_fish
        (
          user_id,
          fish_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, fish_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.fish_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.post("/api/game/fish", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    fish_name?: string;
    amount?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.fish_name !== "string" ||
    body.fish_name.trim() === ""
  ) {
    return c.json({ error: "Invalid fish name" }, 400);
  }

  if (
    typeof body.amount !== "number" ||
    !Number.isInteger(body.amount)
  ) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_fish
        (
          user_id,
          fish_name,
          amount
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, fish_name)
       DO UPDATE SET
         amount = excluded.amount`
    )
    .bind(
      session.user_id,
      body.fish_name,
      body.amount
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/weapons", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT weapon_name, masterwork
       FROM player_weapons
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      weapon_name: string;
      masterwork: number;
    }>();

  const weapons: Record<string, { mw: number }> = {};

  for (const row of rows.results) {
    weapons[row.weapon_name] = {
      mw: row.masterwork,
    };
  }

  return c.json({
    authenticated: true,
    weapons,
  });
});

app.post("/api/game/weapons", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    weapon_name?: string;
    masterwork?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.weapon_name !== "string" ||
    body.weapon_name.trim() === ""
  ) {
    return c.json({ error: "Invalid weapon name" }, 400);
  }

  if (
    typeof body.masterwork !== "number" ||
    !Number.isInteger(body.masterwork)
  ) {
    return c.json({ error: "Invalid masterwork value" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_weapons
        (
          user_id,
          weapon_name,
          masterwork
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, weapon_name)
       DO UPDATE SET
         masterwork = excluded.masterwork`
    )
    .bind(
      session.user_id,
      body.weapon_name,
      body.masterwork
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/artifacts", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const rows = await c.env.DB
    .prepare(
      `SELECT artifact_name, level
       FROM player_artifacts
       WHERE user_id = ?`
    )
    .bind(session.user_id)
    .all<{
      artifact_name: string;
      level: number;
    }>();

  const artifacts: Record<string, number> = {};

  for (const row of rows.results) {
    artifacts[row.artifact_name] = row.level;
  }

  return c.json({
    authenticated: true,
    artifacts,
  });
});

app.post("/api/game/artifacts", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    artifact_name?: string;
    level?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.artifact_name !== "string" ||
    body.artifact_name.trim() === ""
  ) {
    return c.json({ error: "Invalid artifact name" }, 400);
  }

  if (
    typeof body.level !== "number" ||
    !Number.isInteger(body.level)
  ) {
    return c.json({ error: "Invalid artifact level" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_artifacts
        (
          user_id,
          artifact_name,
          level
        )
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, artifact_name)
       DO UPDATE SET
         level = excluded.level`
    )
    .bind(
      session.user_id,
      body.artifact_name,
      body.level
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/armor", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  const armor = await c.env.DB
    .prepare(
      `SELECT helmet, arms, chest, legs
       FROM player_armor
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(session.user_id)
    .first<{
      helmet: string;
      arms: string;
      chest: string;
      legs: string;
    }>();

  if (!armor) {
    return c.json({
      authenticated: true,
      armor: {
        helmet: "placeholder",
        arms: "placeholder",
        chest: "placeholder",
        legs: "placeholder",
      },
    });
  }

  return c.json({
    authenticated: true,
    armor,
  });
});

app.post("/api/game/armor", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE, "host");

  if (!sessionId) {
    return c.json({ authenticated: false }, 401);
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json({ authenticated: false }, 401);
  }

  let body: {
    helmet?: string;
    arms?: string;
    chest?: string;
    legs?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.helmet !== "string" ||
    typeof body.arms !== "string" ||
    typeof body.chest !== "string" ||
    typeof body.legs !== "string"
  ) {
    return c.json({ error: "Invalid armor data" }, 400);
  }

  await c.env.DB
    .prepare(
      `INSERT INTO player_armor
        (
          user_id,
          helmet,
          arms,
          chest,
          legs
        )
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id)
       DO UPDATE SET
         helmet = excluded.helmet,
         arms = excluded.arms,
         chest = excluded.chest,
         legs = excluded.legs,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      session.user_id,
      body.helmet,
      body.arms,
      body.chest,
      body.legs
    )
    .run();

  return c.json({
    success: true,
  });
});

app.get("/api/game/weapons/catalog", async (c) => {
  const rows = await c.env.DB
    .prepare(
      `SELECT
         name,
         emoji_id,
         rarity,
         source,
         activity_type
       FROM weapons
       ORDER BY name`
    )
    .all<{
      name: string;
      emoji_id: string | null;
      rarity: string | null;
      source: string | null;
      activity_type: string | null;
    }>();

  return c.json({
    weapons: rows.results,
  });
});

/* =========================================================
   GAME - ACTIVITY ROTATIONS
========================================================= */

type ActivityEntry = {
  id: string;
  name: string;
  type: string;
  destination?: string;
  weapon_source?: string;
  reward_table?: string;
  unique_material?: string;
  encounters?: readonly string[];
};

type ActivityLike = {
  readonly name: string;
  readonly type: string;
  readonly destination?: string;
  readonly weapon_source?: string;
  readonly reward_table?: string;
  readonly unique_material?: string;
  readonly encounters?: readonly string[];
};

const EXPLORE_MAX_SECONDS = 60 * 60 * 24;
const NIGHTFALL_ROTATION_SECONDS = 60 * 10;
const GM_ROTATION_SECONDS = 60 * 30;
const DAILY_ROTATION_SECONDS = 60 * 60 * 24;
const SPECIAL_ACTIVITY_ROTATION_SECONDS = 60 * 5;

/*
 * Authoritative regular-activity cooldown policy.
 *
 * Keep these values here so both activity execution and
 * /api/game/activities expose the exact same cooldowns.
 */
const VANGUARD_COOLDOWNS = {
  strike: 15,
  nightfall: 25,
  gm: 120,
} as const;

const INFILTRATION_COOLDOWN_SECONDS = 20;
const SHOWDOWN_COOLDOWN_SECONDS = 30;
const CRAWL_COOLDOWN_SECONDS = 90;

const ENDGAME_DUNGEON_COOLDOWN_SECONDS = 45;
const ENDGAME_RAID_COOLDOWN_SECONDS = 90;
const ENDGAME_DAILY_MAX_CHARGES = 3;

const ENDGAME_DUNGEON_COOLDOWN_KEY =
  "__endgame_dungeon";
const ENDGAME_RAID_COOLDOWN_KEY =
  "__endgame_raid";

const VANGUARD_STRIKE_COOLDOWN_KEY = "__vanguard_strike";
const VANGUARD_NIGHTFALL_COOLDOWN_KEY = "__vanguard_nightfall";
const VANGUARD_GM_COOLDOWN_KEY = "__vanguard_gm";

const INFILTRATION_COOLDOWN_KEY = "__infiltration";

const SHOWDOWN_COOLDOWN_KEY = "__showdown_regular";

const CRAWL_COOLDOWN_KEY = "__crawl";

function getDailyEndgameChargeKey(
  type: "raid" | "dungeon",
  nowSeconds: number,
): string {
  const rotationNumber = Math.floor(
    nowSeconds / DAILY_ROTATION_SECONDS,
  );

  return `__endgame_daily_${type}_${rotationNumber}`;
}

function getDailyShowdownChargeKey(
  nowSeconds: number,
): string {
  const rotationNumber = Math.floor(
    nowSeconds / DAILY_ROTATION_SECONDS,
  );

  return `__showdown_daily_${rotationNumber}`;
}

function getDiscordAvatarUrl(
  discordId: string,
  avatar: string | null,
): string {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.webp?size=64`;
  }

  try {
    const defaultIndex = Number(
      (BigInt(discordId) >> 22n) % 6n,
    );

    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

function makeActivityEntry(
  id: string,
  activity: ActivityLike,
): ActivityEntry {
  return {
    id,
    name: activity.name,
    type: activity.type,
    ...(activity.destination
      ? { destination: activity.destination }
      : {}),
    ...(activity.weapon_source
      ? { weapon_source: activity.weapon_source }
      : {}),
    ...(activity.reward_table
      ? { reward_table: activity.reward_table }
      : {}),
    ...(activity.unique_material
      ? { unique_material: activity.unique_material }
      : {}),
    ...(activity.encounters
      ? { encounters: activity.encounters }
      : {}),
  };
}

function getRotatingActivity(
  pool: Readonly<Record<string, ActivityLike>>,
  intervalSeconds: number,
  nowSeconds: number,
): ActivityEntry | null {
  const entries = Object.entries(pool);

  if (entries.length === 0) {
    return null;
  }

  const rotationNumber = Math.floor(
    nowSeconds / intervalSeconds,
  );

  const index =
    rotationNumber % entries.length;

  const [id, activity] = entries[index];

  return makeActivityEntry(
    id,
    activity,
  );
}

function getRotationRemaining(
  intervalSeconds: number,
  nowSeconds: number,
): number {
  const elapsed =
    nowSeconds % intervalSeconds;

  return elapsed === 0
    ? intervalSeconds
    : intervalSeconds - elapsed;
}

function getDestinationActivity(
  pool: Readonly<Record<string, ActivityLike>>,
  destination: string,
  excludedIds: readonly string[] = [],
): ActivityEntry | null {
  for (const [id, activity] of Object.entries(pool)) {
    if (excludedIds.includes(id)) {
      continue;
    }

    if (activity.destination === destination) {
      return makeActivityEntry(
        id,
        activity,
      );
    }
  }

  return null;
}


/* =========================================================
   GAME - ACTIVITIES
========================================================= */

app.get("/api/game/activities", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host",
  );

  if (!sessionId) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT user_id
       FROM sessions
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  const nowSeconds =
    Math.floor(Date.now() / 1000);

  /* =======================================================
     PLAYER DESTINATION
  ======================================================= */

  let profile = await c.env.DB
    .prepare(
      `SELECT zone
       FROM player_profiles
       WHERE user_id = ?
       LIMIT 1`,
    )
    .bind(session.user_id)
    .first<{ zone: string }>();

  if (!profile) {
    await c.env.DB
      .prepare(
        `INSERT INTO player_profiles
          (
            user_id,
            level,
            exp,
            power,
            zone
          )
         VALUES (?, 0, 0, 0, 'Cosmodrome')`,
      )
      .bind(session.user_id)
      .run();

    profile = {
      zone: "Cosmodrome",
    };
  }

  const destination =
    profile.zone;

  /* =======================================================
     EXPLORE / CLAIM TIMER

     The first time this endpoint is loaded, create the
     Explore timestamp once. After that, elapsed time keeps
     accumulating until the future Explore claim endpoint
     resets it.

     Accumulation is capped at 24 hours.
  ======================================================= */

  let exploreCooldown = await c.env.DB
    .prepare(
      `SELECT timestamp
       FROM player_cooldowns
       WHERE user_id = ?
         AND activity = 'explore'
       LIMIT 1`,
    )
    .bind(session.user_id)
    .first<{ timestamp: number }>();

  if (!exploreCooldown) {
    await c.env.DB
      .prepare(
        `INSERT INTO player_cooldowns
          (
            user_id,
            activity,
            timestamp
          )
         VALUES (?, 'explore', ?)
         ON CONFLICT(user_id, activity)
         DO NOTHING`,
      )
      .bind(
        session.user_id,
        nowSeconds,
      )
      .run();

    exploreCooldown = {
      timestamp: nowSeconds,
    };
  }

  let exploreLastClaim =
    Number(exploreCooldown.timestamp);

  if (
    !Number.isFinite(exploreLastClaim) ||
    exploreLastClaim < 0 ||
    exploreLastClaim > nowSeconds
  ) {
    exploreLastClaim =
      nowSeconds;

    await c.env.DB
      .prepare(
        `UPDATE player_cooldowns
         SET timestamp = ?
         WHERE user_id = ?
           AND activity = 'explore'`,
      )
      .bind(
        nowSeconds,
        session.user_id,
      )
      .run();
  }

  const rawExploreElapsed =
    Math.max(
      0,
      nowSeconds - exploreLastClaim,
    );

  const exploreElapsed =
    Math.min(
      rawExploreElapsed,
      EXPLORE_MAX_SECONDS,
    );

  const explorePercentage =
    Math.min(
      100,
      Math.max(
        0,
        (exploreElapsed /
          EXPLORE_MAX_SECONDS) *
          100,
      ),
    );

  /* =======================================================
     SERVER ROTATIONS
  ======================================================= */

  const nightfall =
    getRotatingActivity(
      ACTIVITIES.nightfalls,
      NIGHTFALL_ROTATION_SECONDS,
      nowSeconds,
    );

  const grandmaster =
    getRotatingActivity(
      ACTIVITIES.gms,
      GM_ROTATION_SECONDS,
      nowSeconds,
    );

  const dailyShowdown =
    getRotatingActivity(
      ACTIVITIES.daily.showdowns,
      DAILY_ROTATION_SECONDS,
      nowSeconds,
    );

  const dailyDungeon =
    getRotatingActivity(
      ACTIVITIES.daily.dungeons,
      DAILY_ROTATION_SECONDS,
      nowSeconds,
    );

  const dailyRaid =
    getRotatingActivity(
      ACTIVITIES.daily.raids,
      DAILY_ROTATION_SECONDS,
      nowSeconds,
    );

  const infiltration =
    getRotatingActivity(
      ACTIVITIES.infiltrations,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  const showdown =
    getRotatingActivity(
      ACTIVITIES.showdowns,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  const crawl =
    getRotatingActivity(
      ACTIVITIES.crawls,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  /* =======================================================
     STRIKE

     Strike follows the current destination. If the current
     destination has no strike, use the first strike as a
     fallback so the button remains available.
  ======================================================= */

  let strike =
    getDestinationActivity(
      ACTIVITIES.strikes,
      destination,
    );

  if (!strike) {
    const firstStrike =
      Object.entries(
        ACTIVITIES.strikes,
      )[0];

    if (firstStrike) {
      strike =
        makeActivityEntry(
          firstStrike[0],
          firstStrike[1],
        );
    }
  }

  /* =======================================================
     CURRENT DESTINATION DUNGEON / RAID

     Plaguelands naturally returns null for both because no
     regular Dungeon or Raid is assigned to it.
  ======================================================= */

  const destinationDungeon =
    getDestinationActivity(
      ACTIVITIES.dungeons,
      destination,
    );

  const destinationRaid =
    getDestinationActivity(
      ACTIVITIES.raids,
      destination,
    );

  /* =======================================================
     ENDGAME COOLDOWNS / DAILY CHARGES

     Regular Dungeon:
       45 second cooldown

     Regular Raid:
       90 second cooldown

     Daily Dungeon:
       3 charges per daily rotation

     Daily Raid:
       3 charges per daily rotation
  ======================================================= */

  const dailyDungeonChargeKey =
    getDailyEndgameChargeKey(
      "dungeon",
      nowSeconds,
    );

  const dailyRaidChargeKey =
    getDailyEndgameChargeKey(
      "raid",
      nowSeconds,
    );

  const dailyShowdownChargeKey =
    getDailyShowdownChargeKey(
      nowSeconds,
    );

  const endgameCooldownRows =
    await c.env.DB
      .prepare(
        `SELECT
           activity,
           timestamp
         FROM player_cooldowns
         WHERE user_id = ?
           AND activity IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        session.user_id,
        ENDGAME_DUNGEON_COOLDOWN_KEY,
        ENDGAME_RAID_COOLDOWN_KEY,
        dailyDungeonChargeKey,
        dailyRaidChargeKey,
        VANGUARD_STRIKE_COOLDOWN_KEY,
        VANGUARD_NIGHTFALL_COOLDOWN_KEY,
        VANGUARD_GM_COOLDOWN_KEY,
        INFILTRATION_COOLDOWN_KEY,
        SHOWDOWN_COOLDOWN_KEY,
        CRAWL_COOLDOWN_KEY,
        dailyShowdownChargeKey,
      )
      .all<{
        activity: string;
        timestamp: number;
      }>();

  const endgameCooldownMap =
    new Map<string, number>();

  for (
    const row of
    endgameCooldownRows.results ?? []
  ) {
    endgameCooldownMap.set(
      row.activity,
      Number(row.timestamp) || 0,
    );
  }

  const dungeonReadyAt =
    endgameCooldownMap.get(
      ENDGAME_DUNGEON_COOLDOWN_KEY,
    ) ?? 0;

  const raidReadyAt =
    endgameCooldownMap.get(
      ENDGAME_RAID_COOLDOWN_KEY,
    ) ?? 0;

  const dailyDungeonUsed =
    Math.max(
      0,
      Math.min(
        ENDGAME_DAILY_MAX_CHARGES,
        endgameCooldownMap.get(
          dailyDungeonChargeKey,
        ) ?? 0,
      ),
    );

  const dailyRaidUsed =
    Math.max(
      0,
      Math.min(
        ENDGAME_DAILY_MAX_CHARGES,
        endgameCooldownMap.get(
          dailyRaidChargeKey,
        ) ?? 0,
      ),
    );

  const vanguardStrikeReadyAt = endgameCooldownMap.get(VANGUARD_STRIKE_COOLDOWN_KEY) ?? 0;
  const vanguardNightfallReadyAt = endgameCooldownMap.get(VANGUARD_NIGHTFALL_COOLDOWN_KEY) ?? 0;
  const vanguardGmReadyAt = endgameCooldownMap.get(VANGUARD_GM_COOLDOWN_KEY) ?? 0;
  const infiltrationReadyAt = endgameCooldownMap.get(INFILTRATION_COOLDOWN_KEY) ?? 0;

  const showdownReadyAt =
    endgameCooldownMap.get(
      SHOWDOWN_COOLDOWN_KEY,
    ) ?? 0;

  const crawlReadyAt =
    endgameCooldownMap.get(
      CRAWL_COOLDOWN_KEY,
    ) ?? 0;
  
  const dailyShowdownUsed =
    Math.max(
      0,
      Math.min(
        DAILY_SHOWDOWN_MAX_CHARGES,
        endgameCooldownMap.get(
          dailyShowdownChargeKey,
        ) ?? 0,
      ),
    );

  /* =======================================================
     RESPONSE
  ======================================================= */

  return c.json({
    authenticated: true,

    serverTime: nowSeconds,

    activities: ACTIVITIES,

    player: {
      destination,

      explore: {
        lastClaim:
          exploreLastClaim,

        elapsedSeconds:
          exploreElapsed,

        maxSeconds:
          EXPLORE_MAX_SECONDS,

        percentage:
          explorePercentage,

        capped:
          exploreElapsed >=
          EXPLORE_MAX_SECONDS,
      },

      vanguard: {
        strike: {
          cooldownSeconds: VANGUARD_COOLDOWNS.strike,
          remainingSeconds: Math.max(0, vanguardStrikeReadyAt - nowSeconds),
          readyAt: vanguardStrikeReadyAt,
        },
        nightfall: {
          cooldownSeconds: VANGUARD_COOLDOWNS.nightfall,
          remainingSeconds: Math.max(0, vanguardNightfallReadyAt - nowSeconds),
          readyAt: vanguardNightfallReadyAt,
        },
        gm: {
          cooldownSeconds: VANGUARD_COOLDOWNS.gm,
          remainingSeconds: Math.max(0, vanguardGmReadyAt - nowSeconds),
          readyAt: vanguardGmReadyAt,
          minLevel: GM_MIN_LEVEL,
        },
      },

      infiltration: {
        cooldownSeconds:
          INFILTRATION_COOLDOWN_SECONDS,
      
        remainingSeconds:
          Math.max(
            0,
            infiltrationReadyAt - nowSeconds,
          ),
      
        readyAt:
          infiltrationReadyAt,
      },

      showdown: {
        cooldownSeconds:
          SHOWDOWN_COOLDOWN_SECONDS,

        remainingSeconds:
          Math.max(
            0,
            showdownReadyAt - nowSeconds,
          ),

        readyAt:
          showdownReadyAt,

        daily: {
          maxCharges:
            DAILY_SHOWDOWN_MAX_CHARGES,

          usedCharges:
            dailyShowdownUsed,

          remainingCharges:
            DAILY_SHOWDOWN_MAX_CHARGES -
            dailyShowdownUsed,
        },
      },

      crawl: {
        cooldownSeconds:
          CRAWL_COOLDOWN_SECONDS,

        remainingSeconds:
          Math.max(
            0,
            crawlReadyAt - nowSeconds,
          ),

        readyAt:
          crawlReadyAt,
      },

      endgame: {
        dungeon: {
          cooldownSeconds:
            ENDGAME_DUNGEON_COOLDOWN_SECONDS,

          remainingSeconds:
            Math.max(
              0,
              dungeonReadyAt - nowSeconds,
            ),

          readyAt:
            dungeonReadyAt,
        },

        raid: {
          cooldownSeconds:
            ENDGAME_RAID_COOLDOWN_SECONDS,

          remainingSeconds:
            Math.max(
              0,
              raidReadyAt - nowSeconds,
            ),

          readyAt:
            raidReadyAt,
        },

        dailyDungeon: {
          maxCharges:
            ENDGAME_DAILY_MAX_CHARGES,

          usedCharges:
            dailyDungeonUsed,

          remainingCharges:
            ENDGAME_DAILY_MAX_CHARGES -
            dailyDungeonUsed,
        },

        dailyRaid: {
          maxCharges:
            ENDGAME_DAILY_MAX_CHARGES,

          usedCharges:
            dailyRaidUsed,

          remainingCharges:
            ENDGAME_DAILY_MAX_CHARGES -
            dailyRaidUsed,
        },
      },
    },

    rotation: {
      dailyShowdown: {
        activity:
          dailyShowdown,

        intervalSeconds:
          DAILY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            DAILY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      dailyDungeon: {
        activity:
          dailyDungeon,

        intervalSeconds:
          DAILY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            DAILY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      dailyRaid: {
        activity:
          dailyRaid,

        intervalSeconds:
          DAILY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            DAILY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      nightfall: {
        activity:
          nightfall,

        intervalSeconds:
          NIGHTFALL_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            NIGHTFALL_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      grandmaster: {
        activity:
          grandmaster,

        intervalSeconds:
          GM_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            GM_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      infiltration: {
        activity:
          infiltration,

        intervalSeconds:
          SPECIAL_ACTIVITY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            SPECIAL_ACTIVITY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      showdown: {
        activity:
          showdown,

        intervalSeconds:
          SPECIAL_ACTIVITY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            SPECIAL_ACTIVITY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },

      crawl: {
        activity:
          crawl,

        intervalSeconds:
          SPECIAL_ACTIVITY_ROTATION_SECONDS,

        remainingSeconds:
          getRotationRemaining(
            SPECIAL_ACTIVITY_ROTATION_SECONDS,
            nowSeconds,
          ),
      },
    },

    current: {
      strike,

      dungeon:
        destinationDungeon,

      raid:
        destinationRaid,
    },
  });
});

app.get("/api/game/weapons", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host",
  );

  if (!sessionId) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  const session = await c.env.DB
    .prepare(
      `
        SELECT user_id
        FROM sessions
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(sessionId)
    .first<{ user_id: number }>();

  if (!session) {
    return c.json(
      { authenticated: false },
      401,
    );
  }

  const source = c.req.query("source");

  if (!source) {
    return c.json(
      { error: "Missing weapon source" },
      400,
    );
  }

  const catalog = await c.env.DB
    .prepare(
      `
        SELECT
          name,
          emoji_id,
          rarity,
          source,
          activity_type
        FROM weapons
        WHERE source = ?
        ORDER BY name ASC
      `,
    )
    .bind(source)
    .all<{
      name: string;
      emoji_id: string | null;
      rarity: string | null;
      source: string | null;
      activity_type: string | null;
    }>();

  const owned = await c.env.DB
    .prepare(
      `
        SELECT
          weapon_name,
          masterwork
        FROM player_weapons
        WHERE user_id = ?
      `,
    )
    .bind(session.user_id)
    .all<{
      weapon_name: string;
      masterwork: number;
    }>();

  return c.json({
    authenticated: true,
    source,

    weapons: catalog.results.map(
      (weapon) => {
        const playerWeapon =
          owned.results.find(
            (ownedWeapon) =>
              ownedWeapon.weapon_name ===
              weapon.name,
          );

        return {
          name: weapon.name,
          rarity: weapon.rarity,
          source: weapon.source,
          activityType:
            weapon.activity_type,

          owned: Boolean(playerWeapon),

          masterwork:
            playerWeapon?.masterwork ?? 0,
        };
      },
    ),
  });
});


/* =========================================================
   CRAWL - FINAL RESULT PERSISTENCE
========================================================= */

function buildCrawlFinalWrites(
  db: D1Database,
  userId: number,
  result: CrawlRunResult,
): D1PreparedStatement[] {
  const writes: D1PreparedStatement[] = [];

  const crawlCurrencies =
    new Set([
      "Glimmer",
      "Lumia Leaves",
    ]);

  const crawlUpgradeMaterials =
    new Set([
      "Pinnacle Cipher",
      "Armor Plating",
      "Ascendant Shard",
      "Ascendant Alloy",
    ]);

  for (
    const [
      rewardName,
      rawAmount,
    ]
    of Object.entries(
      result.rewards,
    )
  ) {
    const amount =
      Math.trunc(
        rawAmount,
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      continue;
    }

    if (
      crawlCurrencies.has(
        rewardName,
      )
    ) {
      writes.push(
        db
          .prepare(
            `INSERT INTO player_currencies
              (
                user_id,
                currency_name,
                amount
              )
             VALUES (?, ?, ?)
             ON CONFLICT(
               user_id,
               currency_name
             )
             DO UPDATE SET
               amount =
                 player_currencies.amount
                 + excluded.amount`,
          )
          .bind(
            userId,
            rewardName,
            amount,
          ),
      );

      continue;
    }

    if (
      crawlUpgradeMaterials.has(
        rewardName,
      )
    ) {
      writes.push(
        db
          .prepare(
            `INSERT INTO player_upgrade_materials
              (
                user_id,
                material_name,
                amount
              )
             VALUES (?, ?, ?)
             ON CONFLICT(
               user_id,
               material_name
             )
             DO UPDATE SET
               amount =
                 player_upgrade_materials.amount
                 + excluded.amount`,
          )
          .bind(
            userId,
            rewardName,
            amount,
          ),
      );
    }
  }

  if (result.xp > 0) {
    writes.push(
      db
        .prepare(
          `UPDATE player_profiles
           SET
             exp = exp + ?,
             updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
        )
        .bind(
          result.xp,
          userId,
        ),
    );
  }

  for (
    const weapon of
    result.weapons
  ) {
    if (
      !weapon.dropped ||
      !weapon.name
    ) {
      continue;
    }

    writes.push(
      db
        .prepare(
          `INSERT INTO player_weapons
            (
              user_id,
              weapon_name,
              masterwork
            )
           VALUES (?, ?, 0)
           ON CONFLICT(
             user_id,
             weapon_name
           )
           DO NOTHING`,
        )
        .bind(
          userId,
          weapon.name,
        ),
    );
  }

  const feedWeapon =
    result.weapons[0] ?? null;

  writes.push(
    db
      .prepare(
        `INSERT INTO global_activity_feed
          (
            user_id,
            activity_name,
            activity_type,
            result,
            weapon_name,
            weapon_adept
          )
         VALUES (
           ?,
           ?,
           'crawl',
           'CLEAR',
           ?,
           ?
         )`,
      )
      .bind(
        userId,
        result.activityName,
        feedWeapon?.name ?? null,
        feedWeapon?.adept
          ? 1
          : 0,
      ),
  );

  return writes;
}


/* =========================================================
   GAME - RUN ENDGAME ACTIVITY
========================================================= */


/* =========================================================
   GAME - RESOLVE CRAWL SECRET
========================================================= */

app.post(
  "/api/game/activity/crawl/resolve",
  async (c) => {
    const sessionId = getCookie(
      c,
      SESSION_COOKIE,
      "host",
    );

    if (!sessionId) {
      return c.json(
        {
          authenticated: false,
          error: "Not authenticated",
        },
        401,
      );
    }

    const session =
      await c.env.DB
        .prepare(
          `SELECT
             sessions.user_id,
             users.username,
             users.global_name
           FROM sessions
           INNER JOIN users
             ON users.id = sessions.user_id
           WHERE sessions.id = ?
             AND sessions.expires_at > ?
           LIMIT 1`,
        )
        .bind(
          sessionId,
          new Date().toISOString(),
        )
        .first<{
          user_id: number;
          username: string;
          global_name: string | null;
        }>();

    if (!session) {
      return c.json(
        {
          authenticated: false,
          error: "Not authenticated",
        },
        401,
      );
    }

    let body: {
      runId?: string;
      submission?:
        string
        | number[];
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: "Invalid JSON body",
        },
        400,
      );
    }

    const runId =
      body.runId?.trim();

    if (!runId) {
      return c.json(
        {
          error: "Missing runId",
        },
        400,
      );
    }

    if (
      typeof body.submission !== "string" &&
      !Array.isArray(
        body.submission,
      )
    ) {
      return c.json(
        {
          error: "Invalid Crawl submission",
        },
        400,
      );
    }

    if (
      Array.isArray(
        body.submission,
      ) &&
      body.submission.some(
        (value) =>
          !Number.isInteger(
            value,
          ),
      )
    ) {
      return c.json(
        {
          error: "Invalid Crawl submission",
        },
        400,
      );
    }

    const pending =
      await c.env.DB
        .prepare(
          `SELECT
             run_id,
             user_id,
             activity_id,
             activity_name,
             weapon_source,
             run_data,
             created_at,
             expires_at,
             resolved
           FROM pending_crawl_runs
           WHERE run_id = ?
             AND user_id = ?
           LIMIT 1`,
        )
        .bind(
          runId,
          session.user_id,
        )
        .first<{
          run_id: string;
          user_id: number;
          activity_id: string;
          activity_name: string;
          weapon_source: string;
          run_data: string;
          created_at: number;
          expires_at: number;
          resolved: number;
        }>();

    if (!pending) {
      return c.json(
        {
          error:
            "Crawl run was not found.",
        },
        404,
      );
    }

    if (pending.resolved !== 0) {
      return c.json(
        {
          error:
            "Crawl run has already been resolved.",
        },
        409,
      );
    }

    let pendingRun:
      CrawlRunResult;

    try {
      pendingRun =
        JSON.parse(
          pending.run_data,
        ) as CrawlRunResult;
    } catch {
      return c.json(
        {
          error:
            "Stored Crawl run is invalid.",
        },
        500,
      );
    }

    if (
      !pendingRun.secret.triggered ||
      !pendingRun.secret.challenge ||
      pendingRun.secret.status !==
        "pending"
    ) {
      return c.json(
        {
          error:
            "Crawl run has no pending secret.",
        },
        409,
      );
    }

    const nowSeconds =
      Math.floor(
        Date.now() / 1000,
      );

    const expired =
      nowSeconds >
      pending.expires_at;

    const secretSuccess =
      !expired &&
      validateCrawlSecret(
        pendingRun.secret.challenge,
        body.submission,
      );

    /*
     * Claim the run before any rewards are written.
     *
     * The conditional UPDATE prevents two resolve
     * requests from paying the same Crawl twice.
     */
    const claim =
      await c.env.DB
        .prepare(
          `UPDATE pending_crawl_runs
           SET resolved = 1
           WHERE run_id = ?
             AND user_id = ?
             AND resolved = 0`,
        )
        .bind(
          runId,
          session.user_id,
        )
        .run();

    if (
      !claim.meta.changes ||
      claim.meta.changes !== 1
    ) {
      return c.json(
        {
          error:
            "Crawl run has already been resolved.",
        },
        409,
      );
    }

    const catalog =
      await c.env.DB
        .prepare(
          `SELECT
             name,
             emoji_id,
             rarity
           FROM weapons
           WHERE source = ?
           ORDER BY name`,
        )
        .bind(
          pending.weapon_source,
        )
        .all<CrawlWeaponCatalogEntry>();

    const owned =
      await c.env.DB
        .prepare(
          `SELECT weapon_name
           FROM player_weapons
           WHERE user_id = ?`,
        )
        .bind(
          session.user_id,
        )
        .all<{
          weapon_name: string;
        }>();

    const ownedWeaponNames =
      (owned.results ?? [])
        .map(
          (row) =>
            row.weapon_name,
        );

    const finalResult =
      secretSuccess
        ? finalizeSuccessfulCrawlSecret(
            pendingRun,
            catalog.results ?? [],
            ownedWeaponNames,
          )
        : finalizeFailedCrawlSecret(
            pendingRun,
            catalog.results ?? [],
            ownedWeaponNames,
            expired,
          );

    const writes =
      buildCrawlFinalWrites(
        c.env.DB,
        session.user_id,
        finalResult,
      );

    writes.push(
      c.env.DB
        .prepare(
          `DELETE FROM pending_crawl_runs
           WHERE run_id = ?
             AND user_id = ?`,
        )
        .bind(
          runId,
          session.user_id,
        ),
    );

    await c.env.DB.batch(
      writes,
    );

    return c.json({
      authenticated: true,
      success: true,

      player: {
        name:
          session.global_name ||
          session.username,
      },

      secret: {
        success:
          secretSuccess,

        expired,
      },

      result:
        getPublicCrawlRun(
          finalResult,
        ),
    });
  },
);


app.post("/api/game/activity/run", async (c) => {
  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host",
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
        error: "Not authenticated",
      },
      401,
    );
  }

  const session = await c.env.DB
    .prepare(
      `SELECT
         sessions.user_id,
         users.username,
         users.global_name
       FROM sessions
       INNER JOIN users
         ON users.id = sessions.user_id
       WHERE sessions.id = ?
         AND sessions.expires_at > ?
       LIMIT 1`,
    )
    .bind(
      sessionId,
      new Date().toISOString(),
    )
    .first<{
      user_id: number;
      username: string;
      global_name: string | null;
    }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
        error: "Not authenticated",
      },
      401,
    );
  }

  /* =======================================================
     REQUEST
  ======================================================= */

  let body: {
    activityId?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "Invalid JSON body",
      },
      400,
    );
  }

  const activityId =
    body.activityId?.trim();

  if (!activityId) {
    return c.json(
      {
        error: "Missing activityId",
      },
      400,
    );
  }

  /* =======================================================
     PLAYER PROFILE
  ======================================================= */

  let profile =
    await c.env.DB
      .prepare(
        `SELECT
           level,
           exp,
           zone
         FROM player_profiles
         WHERE user_id = ?
         LIMIT 1`,
      )
      .bind(session.user_id)
      .first<{
        level: number;
        exp: number;
        zone: string;
      }>();

  if (!profile) {
    await c.env.DB
      .prepare(
        `INSERT INTO player_profiles
          (
            user_id,
            level,
            exp,
            power,
            zone
          )
         VALUES (?, 0, 0, 0, 'Cosmodrome')`,
      )
      .bind(session.user_id)
      .run();

    profile = {
      level: 0,
      exp: 0,
      zone: "Cosmodrome",
    };
  }

  /* =======================================================
     RESOLVE AUTHORITATIVE ACTIVITY

     The browser only sends an ID.

     Regular raids/dungeons must belong to the player's
     current destination.

     Daily raids/dungeons must be the activity currently
     selected by the server rotation.
  ======================================================= */

  const nowSeconds =
    Math.floor(Date.now() / 1000);
  /* =======================================================
     INFILTRATION EXECUTION
  ======================================================= */

  const currentInfiltration =
    getRotatingActivity(
      ACTIVITIES.infiltrations,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  if (
    currentInfiltration?.id ===
    activityId
  ) {
    /* =====================================================
       COOLDOWN
    ===================================================== */

    const cooldownRow =
      await c.env.DB
        .prepare(
          `SELECT timestamp
           FROM player_cooldowns
           WHERE user_id = ?
             AND activity = ?
           LIMIT 1`,
        )
        .bind(
          session.user_id,
          INFILTRATION_COOLDOWN_KEY,
        )
        .first<{
          timestamp: number;
        }>();

    const readyAt =
      Math.max(
        0,
        Number(
          cooldownRow?.timestamp ?? 0,
        ) || 0,
      );

    const remainingSeconds =
      Math.max(
        0,
        readyAt - nowSeconds,
      );

    if (remainingSeconds > 0) {
      return c.json(
        {
          authenticated: true,
          success: false,

          error:
            "Infiltration is on cooldown.",

          limit: {
            kind:
              "cooldown" as const,

            cooldownSeconds:
              INFILTRATION_COOLDOWN_SECONDS,

            remainingSeconds,

            readyAt,
          },
        },
        429,
      );
    }


        /* =====================================================
       CURRENT INFILTRATION WEAPON SOURCE

       The current 5-minute rotation selects ONE activity:

       Battlegrounds -> bgs
       Empire Hunt   -> emph
       Nightmare Hunt -> nigh

       All three encounters in this run use that same source.
    ===================================================== */

    const infiltrationWeaponSource =
      currentInfiltration.weapon_source;

    if (
      infiltrationWeaponSource !== "bgs" &&
      infiltrationWeaponSource !== "emph" &&
      infiltrationWeaponSource !== "nigh"
    ) {
      return c.json(
        {
          authenticated: true,
          success: false,
          error:
            "Invalid Infiltration weapon source.",
        },
        500,
      );
    }


    /* =====================================================
       CURRENT INFILTRATION ENCOUNTERS

       The selected activity must contain its own three
       encounters.

       Examples:

       Battlegrounds:
         Delve
         Conduit
         Core

       Empire Hunt:
         Warrior
         Priest
         Technocrat

       Nightmare Hunt:
         Skolas
         Fikrul
         Dominus Ghaul
    ===================================================== */

    const infiltrationEncounters =
      currentInfiltration.encounters ?? [];

    if (
      infiltrationEncounters.length !== 3
    ) {
      return c.json(
        {
          authenticated: true,
          success: false,
          error:
            "Invalid Infiltration encounter configuration.",
        },
        500,
      );
    }


    /* =====================================================
       CURRENT ACTIVITY WEAPON POOL

       Only load weapons belonging to the ONE currently
       rotated Infiltration.

       We no longer load bgs + emph + nigh together.
    ===================================================== */

    const infiltrationCatalog =
      await c.env.DB
        .prepare(
          `SELECT
             name,
             emoji_id,
             rarity,
             source
           FROM weapons
           WHERE source = ?
           ORDER BY name`,
        )
        .bind(
          infiltrationWeaponSource,
        )
        .all<{
          name: string;
          emoji_id: string | null;
          rarity: string | null;
          source: string;
        }>();


    /* =====================================================
       OWNED WEAPONS
    ===================================================== */

    const ownedWeapons =
      await c.env.DB
        .prepare(
          `SELECT weapon_name
           FROM player_weapons
           WHERE user_id = ?`,
        )
        .bind(
          session.user_id,
        )
        .all<{
          weapon_name: string;
        }>();


    const ownedWeaponNames =
      (ownedWeapons.results ?? [])
        .map(
          (weapon) =>
            weapon.weapon_name,
        );


    /* =====================================================
       BUILD CURRENT INFILTRATION ACTIVITY

       This is the ONE activity selected by the server's
       global 5-minute rotation.

       Its three encounters are passed directly into the
       Infiltration engine.
    ===================================================== */

    const infiltrationActivity = {
      id:
        currentInfiltration.id,
    
      name:
        currentInfiltration.name,
    
      weaponSource:
        infiltrationWeaponSource as
          "bgs" | "emph" | "nigh",
    
      encounters:
        infiltrationEncounters,
    };


    /* =====================================================
       RUN INFILTRATION

       All RNG happens exactly once here.

       The engine will:

         - run all 3 encounters
         - use the SAME weapon pool for all 3
         - roll 25% weapon chance per encounter
         - roll 10% Adept on successful weapon drops
         - stop weapon rolls after 2 successful drops
    ===================================================== */

    const result =
      runInfiltration(
        infiltrationActivity,

        infiltrationCatalog.results ?? [],

        ownedWeaponNames,
      );


    /* =====================================================
       DATABASE WRITES
    ===================================================== */

    const writes:
      D1PreparedStatement[] = [];


    /* =====================================================
       START 10 SECOND COOLDOWN
    ===================================================== */

    const nextReadyAt =
      nowSeconds +
      INFILTRATION_COOLDOWN_SECONDS;

    writes.push(
      c.env.DB
        .prepare(
          `INSERT INTO player_cooldowns
            (
              user_id,
              activity,
              timestamp
            )
           VALUES (?, ?, ?)
           ON CONFLICT(
             user_id,
             activity
           )
           DO UPDATE SET
             timestamp =
               excluded.timestamp`,
        )
        .bind(
          session.user_id,
          INFILTRATION_COOLDOWN_KEY,
          nextReadyAt,
        ),
    );


    /* =====================================================
       REWARDS
    ===================================================== */

    const infiltrationCurrencies =
      new Set([
        "Glimmer",
        "Lumia Leaves",
      ]);

    const infiltrationUpgradeMaterials =
      new Set([
        "Pinnacle Cipher",
        "Ascendant Alloy",
      ]);

    for (
      const [
        rewardName,
        rawAmount,
      ]
      of Object.entries(
        result.rewards,
      )
    ) {
      const amount =
        Math.trunc(
          rawAmount,
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        continue;
      }


      /* -------------------------------
         CURRENCIES
      -------------------------------- */

      if (
        infiltrationCurrencies.has(
          rewardName,
        )
      ) {
        writes.push(
          c.env.DB
            .prepare(
              `INSERT INTO player_currencies
                (
                  user_id,
                  currency_name,
                  amount
                )
               VALUES (?, ?, ?)
               ON CONFLICT(
                 user_id,
                 currency_name
               )
               DO UPDATE SET
                 amount =
                   player_currencies.amount
                   + excluded.amount`,
            )
            .bind(
              session.user_id,
              rewardName,
              amount,
            ),
        );

        continue;
      }


      /* -------------------------------
         UPGRADE MATERIALS
      -------------------------------- */

      if (
        infiltrationUpgradeMaterials.has(
          rewardName,
        )
      ) {
        writes.push(
          c.env.DB
            .prepare(
              `INSERT INTO player_upgrade_materials
                (
                  user_id,
                  material_name,
                  amount
                )
               VALUES (?, ?, ?)
               ON CONFLICT(
                 user_id,
                 material_name
               )
               DO UPDATE SET
                 amount =
                   player_upgrade_materials.amount
                   + excluded.amount`,
            )
            .bind(
              session.user_id,
              rewardName,
              amount,
            ),
        );
      }
    }


    /* =====================================================
       XP
    ===================================================== */

    if (result.xp > 0) {
      writes.push(
        c.env.DB
          .prepare(
            `UPDATE player_profiles
             SET
               exp = exp + ?,
               updated_at =
                 CURRENT_TIMESTAMP
             WHERE user_id = ?`,
          )
          .bind(
            result.xp,
            session.user_id,
          ),
      );
    }


    /* =====================================================
       WEAPONS

       result.weapons contains actual drops only.
       infiltration.ts hard-caps this at 2.
    ===================================================== */

    for (
      const weapon of
      result.weapons
    ) {
      if (
        !weapon.dropped ||
        !weapon.name
      ) {
        continue;
      }

      writes.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_weapons
              (
                user_id,
                weapon_name,
                masterwork
              )
             VALUES (?, ?, 0)
             ON CONFLICT(
               user_id,
               weapon_name
             )
             DO NOTHING`,
          )
          .bind(
            session.user_id,
            weapon.name,
          ),
      );
    }


    /* =====================================================
       GLOBAL ACTIVITY FEED

       The existing feed schema supports one optional
       weapon. The complete private result still contains
       both drops when two weapons drop.
    ===================================================== */

    const feedWeapon =
      result.weapons[0] ?? null;

    writes.push(
      c.env.DB
        .prepare(
          `INSERT INTO global_activity_feed
            (
              user_id,
              activity_name,
              activity_type,
              result,
              weapon_name,
              weapon_adept
            )
           VALUES (
             ?,
             ?,
             ?,
             'CLEAR',
             ?,
             ?
           )`,
        )
        .bind(
          session.user_id,
          currentInfiltration.name,
          "infiltration",

          feedWeapon?.name ??
            null,

          feedWeapon?.adept
            ? 1
            : 0,
        ),
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    await c.env.DB.batch(
      writes,
    );


    /* =====================================================
       RESPONSE
    ===================================================== */

    return c.json({
      authenticated: true,
      success: true,

      player: {
        name:
          session.global_name ||
          session.username,

        level:
          profile.level,
      },

      limit: {
        kind:
          "cooldown" as const,

        cooldownSeconds:
          INFILTRATION_COOLDOWN_SECONDS,

        remainingSeconds:
          INFILTRATION_COOLDOWN_SECONDS,

        readyAt:
          nextReadyAt,
      },

      result: {
        ...result,

        activityId:
          currentInfiltration.id,

        activityName:
          currentInfiltration.name,
      },
    });
  }

  /* =======================================================
     VANGUARD EXECUTION
  ======================================================= */

  let vanguardActivity: VanguardActivity | null = null;

  const requestedStrike = ACTIVITIES.strikes[activityId as keyof typeof ACTIVITIES.strikes];
  if (requestedStrike && requestedStrike.destination === profile.zone) {
    vanguardActivity = {
      id: activityId,
      name: requestedStrike.name,
      type: "strike",
      destination: requestedStrike.destination,
      weapon_source: requestedStrike.weapon_source,
      reward_table: requestedStrike.reward_table,
    };
  }

  if (!vanguardActivity) {
    const currentNightfall = getRotatingActivity(ACTIVITIES.nightfalls, NIGHTFALL_ROTATION_SECONDS, nowSeconds);
    if (currentNightfall?.id === activityId) {
      vanguardActivity = {
        id: currentNightfall.id,
        name: currentNightfall.name,
        type: "nightfall",
        weapon_source: currentNightfall.weapon_source ?? "nf",
        reward_table: currentNightfall.reward_table ?? "nf",
      };
    }
  }

  if (!vanguardActivity) {
    const currentGm = getRotatingActivity(ACTIVITIES.gms, GM_ROTATION_SECONDS, nowSeconds);
    if (currentGm?.id === activityId) {
      vanguardActivity = {
        id: currentGm.id,
        name: currentGm.name,
        type: "gm",
        weapon_source: currentGm.weapon_source ?? "gm",
        reward_table: currentGm.reward_table ?? "gm",
      };
    }
  }

  if (vanguardActivity) {
    const { getLevelProgress } = await import("./game/level");
    const levelProgress = getLevelProgress(Number(profile.exp) || 0);

    if (vanguardActivity.type === "gm" && levelProgress.level < GM_MIN_LEVEL) {
      return c.json({ error: `Grandmaster Nightfalls require Level ${GM_MIN_LEVEL}.` }, 403);
    }

    const cooldownKey = vanguardActivity.type === "strike"
      ? VANGUARD_STRIKE_COOLDOWN_KEY
      : vanguardActivity.type === "nightfall"
        ? VANGUARD_NIGHTFALL_COOLDOWN_KEY
        : VANGUARD_GM_COOLDOWN_KEY;
    const cooldownSeconds = VANGUARD_COOLDOWNS[vanguardActivity.type];

    const cooldownRow = await c.env.DB.prepare(
      `SELECT timestamp FROM player_cooldowns WHERE user_id = ? AND activity = ? LIMIT 1`,
    ).bind(session.user_id, cooldownKey).first<{ timestamp: number }>();
    const readyAt = Math.max(0, Number(cooldownRow?.timestamp ?? 0));

    if (nowSeconds < readyAt) {
      return c.json({
        error: "Activity cooldown is still active.",
        limit: { kind: "cooldown", cooldownSeconds, remainingSeconds: readyAt - nowSeconds, readyAt },
      }, 429);
    }

    const statsRow = await c.env.DB.prepare(
      `SELECT stats FROM player_stats WHERE user_id = ? LIMIT 1`,
    ).bind(session.user_id).first<{ stats: string }>();
    let weaponStats: { exotic_chance?: number; legendary_chance?: number } = {};
    if (statsRow?.stats) {
      try {
        const parsed = JSON.parse(statsRow.stats) as { weapons?: typeof weaponStats };
        if (parsed.weapons && typeof parsed.weapons === "object") weaponStats = parsed.weapons;
      } catch { weaponStats = {}; }
    }

    const weaponCatalog = await c.env.DB.prepare(
      `SELECT name, rarity FROM weapons WHERE source = ? ORDER BY name`,
    ).bind(vanguardActivity.weapon_source).all<{ name: string; rarity: string | null }>();
    const ownedWeapons = await c.env.DB.prepare(
      `SELECT weapon_name FROM player_weapons WHERE user_id = ?`,
    ).bind(session.user_id).all<{ weapon_name: string }>();
    const ownedWeaponNames =
      (ownedWeapons.results ?? [])
        .map(
          (ownedWeapon) =>
            ownedWeapon.weapon_name,
        );

    const rewardRoll = rollVanguardRewards(vanguardActivity.type);
    const weapon = rollVanguardWeapon(
      weaponCatalog.results ?? [],
      ownedWeaponNames,
    );
    const result = makeVanguardResult(vanguardActivity, rewardRoll.rewards, rewardRoll.xp, weapon);
    const writes: D1PreparedStatement[] = [];

    writes.push(c.env.DB.prepare(
      `INSERT INTO player_cooldowns (user_id, activity, timestamp) VALUES (?, ?, ?)
       ON CONFLICT(user_id, activity) DO UPDATE SET timestamp = excluded.timestamp`,
    ).bind(session.user_id, cooldownKey, nowSeconds + cooldownSeconds));

    const currencies = new Set(["Glimmer", "Lumia Leaves", "Armor Plating", "Synthweave", "Spoils of Conquest"]);
    const upgrades = new Set(["Enhancement Core", "Enhancement Prism"]);
    const dungeonMaterials = new Set(["avaricious treasure", "ahamkara bone", "haunted vestige", "corrupted sliver", "scarlet shaving", "anomalous data", "remnant wormspore", "ghost remains", "curious tablet"]);
    const raidMaterials = new Set(["ebisu alloyment", "cabal gold", "wishing coin", "tethered radiolaria", "herealways piece", "resonant splinter", "shadow terminal", "dissipated entropy"]);

    for (const [name, rawAmount] of Object.entries(result.rewards)) {
      const amount = Math.trunc(rawAmount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (currencies.has(name)) {
        writes.push(c.env.DB.prepare(
          `INSERT INTO player_currencies (user_id, currency_name, amount) VALUES (?, ?, ?)
           ON CONFLICT(user_id, currency_name) DO UPDATE SET amount = player_currencies.amount + excluded.amount`,
        ).bind(session.user_id, name, amount));
      } else if (upgrades.has(name)) {
        writes.push(c.env.DB.prepare(
          `INSERT INTO player_upgrade_materials (user_id, material_name, amount) VALUES (?, ?, ?)
           ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_upgrade_materials.amount + excluded.amount`,
        ).bind(session.user_id, name, amount));
      } else if (dungeonMaterials.has(name)) {
        writes.push(c.env.DB.prepare(
          `INSERT INTO player_dungeon_materials (user_id, material_name, amount) VALUES (?, ?, ?)
           ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_dungeon_materials.amount + excluded.amount`,
        ).bind(session.user_id, name, amount));
      } else if (raidMaterials.has(name)) {
        writes.push(c.env.DB.prepare(
          `INSERT INTO player_raid_materials (user_id, material_name, amount) VALUES (?, ?, ?)
           ON CONFLICT(user_id, material_name) DO UPDATE SET amount = player_raid_materials.amount + excluded.amount`,
        ).bind(session.user_id, name, amount));
      }
    }

    writes.push(c.env.DB.prepare(
      `UPDATE player_profiles SET exp = exp + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
    ).bind(result.xp, session.user_id));

    if (result.weapon.dropped && result.weapon.name) {
      writes.push(c.env.DB.prepare(
        `INSERT INTO player_weapons (user_id, weapon_name, masterwork) VALUES (?, ?, 0)
         ON CONFLICT(user_id, weapon_name) DO NOTHING`,
      ).bind(session.user_id, result.weapon.name));
    }

    writes.push(c.env.DB.prepare(
      `INSERT INTO global_activity_feed
       (user_id, activity_name, activity_type, result, weapon_name, weapon_adept)
       VALUES (?, ?, ?, 'CLEAR', ?, 0)`,
    ).bind(
      session.user_id,
      vanguardActivity.name,
      vanguardActivity.type,
      result.weapon.dropped ? result.weapon.name : null,
    ));

    await c.env.DB.batch(writes);

    return c.json({
      authenticated: true,
      success: true,
      player: { name: session.global_name || session.username, power: 0, level: levelProgress.level },
      limit: { kind: "cooldown" as const, cooldownSeconds, remainingSeconds: cooldownSeconds, readyAt: nowSeconds + cooldownSeconds },
      result,
    });
  }

  /* =======================================================
     SHOWDOWN EXECUTION

     Only the server-selected regular 5-minute Showdown or
     current Daily Showdown may run. The browser only sends
     the activity ID.
  ======================================================= */

  const currentShowdown =
    getRotatingActivity(
      ACTIVITIES.showdowns,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  const currentDailyShowdown =
    getRotatingActivity(
      ACTIVITIES.daily.showdowns,
      DAILY_ROTATION_SECONDS,
      nowSeconds,
    );

  const selectedShowdown =
    currentDailyShowdown?.id === activityId
      ? currentDailyShowdown
      : currentShowdown?.id === activityId
        ? currentShowdown
        : null;

  const isDailyShowdown =
    currentDailyShowdown?.id === activityId;

  if (selectedShowdown) {
    const requestedWeaponSource =
      selectedShowdown.weapon_source;

    const validSource =
      isDailyShowdown
        ? DAILY_SHOWDOWN_SOURCES.has(
            requestedWeaponSource as ShowdownWeaponSource,
          )
        : REGULAR_SHOWDOWN_SOURCES.has(
            requestedWeaponSource as ShowdownWeaponSource,
          );

    if (!validSource) {
      return c.json(
        {
          authenticated: true,
          success: false,
          error:
            "Invalid Showdown weapon source.",
        },
        500,
      );
    }

    const encounters =
      selectedShowdown.encounters ?? [];

    if (encounters.length !== 3) {
      return c.json(
        {
          authenticated: true,
          success: false,
          error:
            "Invalid Showdown encounter configuration.",
        },
        500,
      );
    }

    const showdownActivity:
      ShowdownActivity = {
        id:
          selectedShowdown.id,

        name:
          selectedShowdown.name,

        type:
          isDailyShowdown
            ? "showdown"
            : "pinnacle",

        weapon_source:
          requestedWeaponSource as ShowdownWeaponSource,

        reward_table:
          isDailyShowdown
            ? "showdown"
            : "pinnacle",

        encounters,
      };


    /* =====================================================
       ENFORCE COOLDOWN / DAILY CHARGES
    ===================================================== */

    if (isDailyShowdown) {
      const chargeKey =
        getDailyShowdownChargeKey(
          nowSeconds,
        );

      const chargeRow =
        await c.env.DB
          .prepare(
            `SELECT timestamp
             FROM player_cooldowns
             WHERE user_id = ?
               AND activity = ?
             LIMIT 1`,
          )
          .bind(
            session.user_id,
            chargeKey,
          )
          .first<{
            timestamp: number;
          }>();

      const usedCharges =
        Math.max(
          0,
          Math.min(
            DAILY_SHOWDOWN_MAX_CHARGES,
            Number(
              chargeRow?.timestamp ?? 0,
            ) || 0,
          ),
        );

      if (
        usedCharges >=
        DAILY_SHOWDOWN_MAX_CHARGES
      ) {
        return c.json(
          {
            authenticated: true,
            success: false,

            error:
              "No Daily Showdown charges remain.",

            limit: {
              kind:
                "charges" as const,

              maxCharges:
                DAILY_SHOWDOWN_MAX_CHARGES,

              usedCharges,

              remainingCharges: 0,
            },
          },
          429,
        );
      }
    } else {
      const cooldownRow =
        await c.env.DB
          .prepare(
            `SELECT timestamp
             FROM player_cooldowns
             WHERE user_id = ?
               AND activity = ?
             LIMIT 1`,
          )
          .bind(
            session.user_id,
            SHOWDOWN_COOLDOWN_KEY,
          )
          .first<{
            timestamp: number;
          }>();

      const readyAt =
        Math.max(
          0,
          Number(
            cooldownRow?.timestamp ?? 0,
          ) || 0,
        );

      if (readyAt > nowSeconds) {
        return c.json(
          {
            authenticated: true,
            success: false,

            error:
              "Showdown is still on cooldown.",

            limit: {
              kind:
                "cooldown" as const,

              cooldownSeconds:
                SHOWDOWN_COOLDOWN_SECONDS,

              remainingSeconds:
                readyAt - nowSeconds,

              readyAt,
            },
          },
          429,
        );
      }
    }


    /* =====================================================
       CURRENT LEVEL + POWER
    ===================================================== */

    const {
      calculateWeaponPower,
      calculateArmorPower,
      calculateArtifactPower,
      calculateLevelPower,
    } = await import(
      "./game/power"
    );

    const {
      getLevelProgress,
    } = await import(
      "./game/level"
    );

    const showdownWeapons =
      await c.env.DB
        .prepare(
          `SELECT
             player_weapons.weapon_name,
             player_weapons.masterwork,
             weapons.rarity
           FROM player_weapons
           LEFT JOIN weapons
             ON weapons.name =
                player_weapons.weapon_name
           WHERE player_weapons.user_id = ?`,
        )
        .bind(
          session.user_id,
        )
        .all<WeaponRow>();

    const showdownWeaponRows =
      showdownWeapons.results ?? [];

    const showdownArmor =
      await c.env.DB
        .prepare(
          `SELECT
             helmet,
             arms,
             chest,
             legs
           FROM player_armor
           WHERE user_id = ?
           LIMIT 1`,
        )
        .bind(
          session.user_id,
        )
        .first<ArmorRow>();

    const showdownArtifacts =
      await c.env.DB
        .prepare(
          `SELECT
             artifact_name,
             level
           FROM player_artifacts
           WHERE user_id = ?`,
        )
        .bind(
          session.user_id,
        )
        .all<ArtifactRow>();

    const showdownArtifactRows =
      showdownArtifacts.results ?? [];

    const showdownLevelProgress =
      getLevelProgress(
        Number(profile.exp) || 0,
      );

    const showdownPower =
      calculateWeaponPower(
        showdownWeaponRows,
      ) +
      calculateArmorPower(
        showdownArmor ?? null,
      ) +
      calculateArtifactPower(
        showdownArtifactRows,
      ) +
      calculateLevelPower(
        showdownLevelProgress.level,
      );


    /* =====================================================
       WEAPON POOL
    ===================================================== */

    const showdownWeaponCatalog =
      await c.env.DB
        .prepare(
          `SELECT
             name,
             rarity
           FROM weapons
           WHERE source = ?
           ORDER BY name`,
        )
        .bind(
          showdownActivity.weapon_source,
        )
        .all<{
          name: string;
          rarity: string | null;
        }>();

    const showdownOwnedWeaponNames =
      showdownWeaponRows.map(
        (weapon) =>
          weapon.weapon_name,
      );


    /* =====================================================
       RUN SHOWDOWN

       showdown.ts takes exactly:
         activity
         player
         weaponPool
    ===================================================== */

    const showdownResult =
      runShowdownActivity(
        showdownActivity,

        {
          level:
            showdownLevelProgress.level,

          power:
            showdownPower,

          ownedWeapons:
            showdownOwnedWeaponNames,
        },

        showdownWeaponCatalog.results ?? [],
      );


    /* =====================================================
       DATABASE WRITES
    ===================================================== */

    const showdownWrites:
      D1PreparedStatement[] = [];


    /* =====================================================
       CONSUME LIMIT
    ===================================================== */

    if (isDailyShowdown) {
      const chargeKey =
        getDailyShowdownChargeKey(
          nowSeconds,
        );

      showdownWrites.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_cooldowns
              (
                user_id,
                activity,
                timestamp
              )
             VALUES (?, ?, 1)
             ON CONFLICT(user_id, activity)
             DO UPDATE SET
               timestamp =
                 player_cooldowns.timestamp + 1`,
          )
          .bind(
            session.user_id,
            chargeKey,
          ),
      );
    } else {
      showdownWrites.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_cooldowns
              (
                user_id,
                activity,
                timestamp
              )
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, activity)
             DO UPDATE SET
               timestamp =
                 excluded.timestamp`,
          )
          .bind(
            session.user_id,
            SHOWDOWN_COOLDOWN_KEY,

            nowSeconds +
              SHOWDOWN_COOLDOWN_SECONDS,
          ),
      );
    }


    /* =====================================================
       REWARDS
    ===================================================== */

    const showdownCurrencies =
      new Set([
        "Glimmer",
        "Lumia Leaves",
      ]);

    const showdownUpgradeMaterials =
      new Set([
        "Pinnacle Cipher",
        "Enhancement Prism",
        "Ascendant Shard",
      ]);

    for (
      const [
        rewardName,
        rawAmount,
      ] of Object.entries(
        showdownResult.rewards,
      )
    ) {
      const amount =
        Math.trunc(
          rawAmount,
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        continue;
      }

      if (
        showdownCurrencies.has(
          rewardName,
        )
      ) {
        showdownWrites.push(
          c.env.DB
            .prepare(
              `INSERT INTO player_currencies
                (
                  user_id,
                  currency_name,
                  amount
                )
               VALUES (?, ?, ?)
               ON CONFLICT(
                 user_id,
                 currency_name
               )
               DO UPDATE SET
                 amount =
                   player_currencies.amount +
                   excluded.amount`,
            )
            .bind(
              session.user_id,
              rewardName,
              amount,
            ),
        );

        continue;
      }

      if (
        showdownUpgradeMaterials.has(
          rewardName,
        )
      ) {
        showdownWrites.push(
          c.env.DB
            .prepare(
              `INSERT INTO player_upgrade_materials
                (
                  user_id,
                  material_name,
                  amount
                )
               VALUES (?, ?, ?)
               ON CONFLICT(
                 user_id,
                 material_name
               )
               DO UPDATE SET
                 amount =
                   player_upgrade_materials.amount +
                   excluded.amount`,
            )
            .bind(
              session.user_id,
              rewardName,
              amount,
            ),
        );
      }
    }


    /* =====================================================
       XP
    ===================================================== */

    if (
      showdownResult.xp > 0
    ) {
      showdownWrites.push(
        c.env.DB
          .prepare(
            `UPDATE player_profiles
             SET
               exp = exp + ?,
               updated_at =
                 CURRENT_TIMESTAMP
             WHERE user_id = ?`,
          )
          .bind(
            showdownResult.xp,
            session.user_id,
          ),
      );
    }


    /* =====================================================
       WEAPON
    ===================================================== */

    if (
      showdownResult.weapon.dropped &&
      showdownResult.weapon.name
    ) {
      showdownWrites.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_weapons
              (
                user_id,
                weapon_name,
                masterwork
              )
             VALUES (?, ?, 0)
             ON CONFLICT(
               user_id,
               weapon_name
             )
             DO NOTHING`,
          )
          .bind(
            session.user_id,
            showdownResult.weapon.name,
          ),
      );
    }


    /* =====================================================
       GLOBAL ACTIVITY FEED
    ===================================================== */

    showdownWrites.push(
      c.env.DB
        .prepare(
          `INSERT INTO global_activity_feed
            (
              user_id,
              activity_name,
              activity_type,
              result,
              weapon_name,
              weapon_adept
            )
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          session.user_id,

          showdownActivity.name,

          isDailyShowdown
            ? "daily_showdown"
            : "showdown",

          showdownResult.fullClear
            ? "CLEAR"
            : "WIPE",

          showdownResult.weapon.dropped
            ? showdownResult.weapon.name
            : null,

          showdownResult.weapon.dropped &&
          showdownResult.weapon.adept
            ? 1
            : 0,
        ),
    );


    /* =====================================================
       COMMIT
    ===================================================== */

    await c.env.DB.batch(
      showdownWrites,
    );


    /* =====================================================
       RESPONSE LIMIT
    ===================================================== */

    let showdownLimit:
      | {
          kind: "charges";
          maxCharges: number;
          usedCharges: number;
          remainingCharges: number;
        }
      | {
          kind: "cooldown";
          cooldownSeconds: number;
          remainingSeconds: number;
          readyAt: number;
        };

    if (isDailyShowdown) {
      const chargeKey =
        getDailyShowdownChargeKey(
          nowSeconds,
        );

      const chargeRow =
        await c.env.DB
          .prepare(
            `SELECT timestamp
             FROM player_cooldowns
             WHERE user_id = ?
               AND activity = ?
             LIMIT 1`,
          )
          .bind(
            session.user_id,
            chargeKey,
          )
          .first<{
            timestamp: number;
          }>();

      const usedCharges =
        Math.max(
          0,
          Math.min(
            DAILY_SHOWDOWN_MAX_CHARGES,

            Number(
              chargeRow?.timestamp ?? 0,
            ) || 0,
          ),
        );

      showdownLimit = {
        kind: "charges",

        maxCharges:
          DAILY_SHOWDOWN_MAX_CHARGES,

        usedCharges,

        remainingCharges:
          Math.max(
            0,

            DAILY_SHOWDOWN_MAX_CHARGES -
              usedCharges,
          ),
      };
    } else {
      const readyAt =
        nowSeconds +
        SHOWDOWN_COOLDOWN_SECONDS;

      showdownLimit = {
        kind: "cooldown",

        cooldownSeconds:
          SHOWDOWN_COOLDOWN_SECONDS,

        remainingSeconds:
          SHOWDOWN_COOLDOWN_SECONDS,

        readyAt,
      };
    }


    /* =====================================================
       RETURN
    ===================================================== */

    return c.json({
      authenticated: true,
      success: true,

      player: {
        name:
          session.global_name ||
          session.username,

        level:
          showdownLevelProgress.level,

        power:
          showdownPower,
      },

      limit:
        showdownLimit,

      result:
        showdownResult,
    });
  }



  /* =======================================================
     CRAWL EXECUTION
  ======================================================= */

  const currentCrawl =
    getRotatingActivity(
      ACTIVITIES.crawls,
      SPECIAL_ACTIVITY_ROTATION_SECONDS,
      nowSeconds,
    );

  if (
    currentCrawl?.id ===
    activityId
  ) {
    if (
      !currentCrawl.weapon_source ||
      !currentCrawl.encounters ||
      currentCrawl.encounters.length === 0
    ) {
      return c.json(
        {
          error:
            "Crawl configuration is incomplete.",
        },
        500,
      );
    }

    const crawlSource =
      currentCrawl.weapon_source as
        CrawlWeaponSource;

    if (
      crawlSource !== "coil" &&
      crawlSource !== "contest" &&
      crawlSource !== "nether"
    ) {
      return c.json(
        {
          error:
            "Crawl weapon source is invalid.",
        },
        500,
      );
    }

    /*
     * A player may not start another Crawl while an
     * unresolved secret from a previous run is still
     * active.
     */
    const activePending =
      await c.env.DB
        .prepare(
          `SELECT
             run_id,
             expires_at
           FROM pending_crawl_runs
           WHERE user_id = ?
             AND resolved = 0
             AND expires_at >= ?
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .bind(
          session.user_id,
          nowSeconds,
        )
        .first<{
          run_id: string;
          expires_at: number;
        }>();

    if (activePending) {
      return c.json(
        {
          error:
            "A Crawl secret is already waiting to be resolved.",

          pendingRunId:
            activePending.run_id,

          expiresAt:
            activePending.expires_at,
        },
        409,
      );
    }

    /*
     * Old resolved/expired rows are transient state
     * and can be discarded before a new run.
     */
    await c.env.DB
      .prepare(
        `DELETE FROM pending_crawl_runs
         WHERE user_id = ?
           AND (
             resolved <> 0
             OR expires_at < ?
           )`,
      )
      .bind(
        session.user_id,
        nowSeconds,
      )
      .run();

    const cooldown =
      await c.env.DB
        .prepare(
          `SELECT timestamp
           FROM player_cooldowns
           WHERE user_id = ?
             AND activity = ?
           LIMIT 1`,
        )
        .bind(
          session.user_id,
          CRAWL_COOLDOWN_KEY,
        )
        .first<{
          timestamp: number;
        }>();

    const readyAt =
      Number(
        cooldown?.timestamp ?? 0,
      );

    if (
      Number.isFinite(readyAt) &&
      readyAt > nowSeconds
    ) {
      return c.json(
        {
          error:
            "Crawl is on cooldown.",

          limit: {
            kind:
              "cooldown" as const,

            cooldownSeconds:
              CRAWL_COOLDOWN_SECONDS,

            remainingSeconds:
              Math.max(
                0,
                readyAt - nowSeconds,
              ),

            readyAt,
          },
        },
        429,
      );
    }

    const crawlActivity:
      CrawlActivity = {
        id:
          currentCrawl.id,

        name:
          currentCrawl.name,

        weaponSource:
          crawlSource,

        encounters:
          currentCrawl.encounters,
      };

    /*
     * All encounter reward RNG and secret RNG happen
     * once, on the Worker.
     */
    const initialRun =
      runCrawl(
        crawlActivity,
      );

    const nextReadyAt =
      nowSeconds +
      CRAWL_COOLDOWN_SECONDS;

    const cooldownWrite =
      c.env.DB
        .prepare(
          `INSERT INTO player_cooldowns
            (
              user_id,
              activity,
              timestamp
            )
           VALUES (?, ?, ?)
           ON CONFLICT(
             user_id,
             activity
           )
           DO UPDATE SET
             timestamp =
               excluded.timestamp`,
        )
        .bind(
          session.user_id,
          CRAWL_COOLDOWN_KEY,
          nextReadyAt,
        );

    /*
     * SECRET PROC
     *
     * Do not persist rewards yet. Store the private
     * run in D1 and return only the sanitized public
     * challenge.
     */
    if (
      initialRun.secret.triggered &&
      initialRun.secret.challenge
    ) {
      const runId =
        crypto.randomUUID();

      const expiresAt =
        nowSeconds +
        initialRun.secret.timeoutSeconds;

      await c.env.DB.batch([
        cooldownWrite,

        c.env.DB
          .prepare(
            `INSERT INTO pending_crawl_runs
              (
                run_id,
                user_id,
                activity_id,
                activity_name,
                weapon_source,
                run_data,
                created_at,
                expires_at,
                resolved
              )
             VALUES (
               ?,
               ?,
               ?,
               ?,
               ?,
               ?,
               ?,
               ?,
               0
             )`,
          )
          .bind(
            runId,
            session.user_id,
            currentCrawl.id,
            currentCrawl.name,
            crawlSource,
            JSON.stringify(
              initialRun,
            ),
            nowSeconds,
            expiresAt,
          ),
      ]);

      return c.json({
        authenticated: true,
        success: true,

        player: {
          name:
            session.global_name ||
            session.username,

          level:
            profile.level,
        },

        limit: {
          kind:
            "cooldown" as const,

          cooldownSeconds:
            CRAWL_COOLDOWN_SECONDS,

          remainingSeconds:
            CRAWL_COOLDOWN_SECONDS,

          readyAt:
            nextReadyAt,
        },

        pendingSecret: true,

        runId,

        expiresAt,

        result:
          getPublicCrawlRun(
            initialRun,
          ),
      });
    }

    /*
     * NO SECRET
     *
     * The run can be finalized immediately.
     */
    const catalog =
      await c.env.DB
        .prepare(
          `SELECT
             name,
             emoji_id,
             rarity
           FROM weapons
           WHERE source = ?
           ORDER BY name`,
        )
        .bind(
          crawlSource,
        )
        .all<CrawlWeaponCatalogEntry>();

    const owned =
      await c.env.DB
        .prepare(
          `SELECT weapon_name
           FROM player_weapons
           WHERE user_id = ?`,
        )
        .bind(
          session.user_id,
        )
        .all<{
          weapon_name: string;
        }>();

    const ownedWeaponNames =
      (owned.results ?? [])
        .map(
          (row) =>
            row.weapon_name,
        );

    const finalResult =
      finalizeCrawlWithoutSecret(
        initialRun,
        catalog.results ?? [],
        ownedWeaponNames,
      );

    const writes =
      buildCrawlFinalWrites(
        c.env.DB,
        session.user_id,
        finalResult,
      );

    writes.unshift(
      cooldownWrite,
    );

    await c.env.DB.batch(
      writes,
    );

    return c.json({
      authenticated: true,
      success: true,

      player: {
        name:
          session.global_name ||
          session.username,

        level:
          profile.level,
      },

      limit: {
        kind:
          "cooldown" as const,

        cooldownSeconds:
          CRAWL_COOLDOWN_SECONDS,

        remainingSeconds:
          CRAWL_COOLDOWN_SECONDS,

        readyAt:
          nextReadyAt,
      },

      pendingSecret: false,

      result:
        getPublicCrawlRun(
          finalResult,
        ),
    });
  }


  let activity:
    ActivityEntry | null = null;

  let activityScope:
    "regular" | "daily" | null = null;

  const regularRaid =
    ACTIVITIES.raids[
      activityId as keyof typeof ACTIVITIES.raids
    ];

  if (
    regularRaid &&
    regularRaid.destination === profile.zone
  ) {
    activity =
      makeActivityEntry(
        activityId,
        regularRaid,
      );

    activityScope = "regular";
  }

  if (!activity) {
    const regularDungeon =
      ACTIVITIES.dungeons[
        activityId as keyof typeof ACTIVITIES.dungeons
      ];

    if (
      regularDungeon &&
      regularDungeon.destination === profile.zone
    ) {
      activity =
        makeActivityEntry(
          activityId,
          regularDungeon,
        );

      activityScope = "regular";
    }
  }

  if (!activity) {
    const dailyRaid =
      getRotatingActivity(
        ACTIVITIES.daily.raids,
        DAILY_ROTATION_SECONDS,
        nowSeconds,
      );

    if (
      dailyRaid?.id === activityId
    ) {
      activity = dailyRaid;
      activityScope = "daily";
    }
  }

  if (!activity) {
    const dailyDungeon =
      getRotatingActivity(
        ACTIVITIES.daily.dungeons,
        DAILY_ROTATION_SECONDS,
        nowSeconds,
      );

    if (
      dailyDungeon?.id === activityId
    ) {
      activity = dailyDungeon;
      activityScope = "daily";
    }
  }

  if (!activity) {
    return c.json(
      {
        error:
          "That raid or dungeon is not currently available.",
      },
      400,
    );
  }

  if (
    activity.type !== "raid" &&
    activity.type !== "dungeon"
  ) {
    return c.json(
      {
        error:
          "Activity is not a raid or dungeon.",
      },
      400,
    );
  }

  if (
    !activity.weapon_source ||
    !activity.reward_table ||
    !activity.encounters ||
    activity.encounters.length === 0
  ) {
    return c.json(
      {
        error:
          "Activity configuration is incomplete.",
      },
      500,
    );
  }

  if (!activityScope) {
    return c.json(
      {
        error:
          "Activity scope could not be resolved.",
      },
      500,
    );
  }

  /* =======================================================
     ENDGAME LIMIT ENFORCEMENT

     This happens before RNG, rewards, XP, weapon rolls, or
     feed writes. React cannot bypass these limits by calling
     the run endpoint directly.
  ======================================================= */

  let endgameStateWrite:
    D1PreparedStatement | null = null;

  if (activityScope === "daily") {
    const chargeKey =
      getDailyEndgameChargeKey(
        activity.type as
          | "raid"
          | "dungeon",
        nowSeconds,
      );

    const chargeRow =
      await c.env.DB
        .prepare(
          `SELECT timestamp
           FROM player_cooldowns
           WHERE user_id = ?
             AND activity = ?
           LIMIT 1`,
        )
        .bind(
          session.user_id,
          chargeKey,
        )
        .first<{
          timestamp: number;
        }>();

    const usedCharges =
      Math.max(
        0,
        Number(
          chargeRow?.timestamp ?? 0,
        ) || 0,
      );

    if (
      usedCharges >=
      ENDGAME_DAILY_MAX_CHARGES
    ) {
      return c.json(
        {
          authenticated: true,
          success: false,

          error:
            `No Daily ${activity.type === "raid" ? "Raid" : "Dungeon"} charges remain.`,

          limit: {
            kind: "charges",
            maxCharges:
              ENDGAME_DAILY_MAX_CHARGES,
            remainingCharges: 0,
          },
        },
        429,
      );
    }

    endgameStateWrite =
      c.env.DB
        .prepare(
          `INSERT INTO player_cooldowns
            (
              user_id,
              activity,
              timestamp
            )
           VALUES (?, ?, 1)
           ON CONFLICT(user_id, activity)
           DO UPDATE SET
             timestamp =
               player_cooldowns.timestamp + 1`,
        )
        .bind(
          session.user_id,
          chargeKey,
        );
  } else {
    const cooldownSeconds =
      activity.type === "raid"
        ? ENDGAME_RAID_COOLDOWN_SECONDS
        : ENDGAME_DUNGEON_COOLDOWN_SECONDS;

    const cooldownKey =
      activity.type === "raid"
        ? ENDGAME_RAID_COOLDOWN_KEY
        : ENDGAME_DUNGEON_COOLDOWN_KEY;

    const cooldownRow =
      await c.env.DB
        .prepare(
          `SELECT timestamp
           FROM player_cooldowns
           WHERE user_id = ?
             AND activity = ?
           LIMIT 1`,
        )
        .bind(
          session.user_id,
          cooldownKey,
        )
        .first<{
          timestamp: number;
        }>();

    const readyAt =
      Number(
        cooldownRow?.timestamp ?? 0,
      ) || 0;

    const remainingSeconds =
      Math.max(
        0,
        readyAt - nowSeconds,
      );

    if (remainingSeconds > 0) {
      return c.json(
        {
          authenticated: true,
          success: false,

          error:
            `${activity.type === "raid" ? "Raid" : "Dungeon"} is on cooldown.`,

          limit: {
            kind: "cooldown",
            cooldownSeconds,
            remainingSeconds,
            readyAt,
          },
        },
        429,
      );
    }

    const nextReadyAt =
      nowSeconds + cooldownSeconds;

    endgameStateWrite =
      c.env.DB
        .prepare(
          `INSERT INTO player_cooldowns
            (
              user_id,
              activity,
              timestamp
            )
           VALUES (?, ?, ?)
           ON CONFLICT(user_id, activity)
           DO UPDATE SET
             timestamp = excluded.timestamp`,
        )
        .bind(
          session.user_id,
          cooldownKey,
          nextReadyAt,
        );
  }

  /* =======================================================
     CALCULATE CURRENT POWER

     Never trust Power sent by React.
  ======================================================= */

  const {
    calculateWeaponPower,
    calculateArmorPower,
    calculateArtifactPower,
    calculateLevelPower,
  } = await import("./game/power");

  const {
    getLevelProgress,
  } = await import("./game/level");

  const playerWeapons =
    await c.env.DB
      .prepare(
        `SELECT
           player_weapons.weapon_name,
           player_weapons.masterwork,
           weapons.rarity
         FROM player_weapons
         LEFT JOIN weapons
           ON weapons.name =
              player_weapons.weapon_name
         WHERE player_weapons.user_id = ?`,
      )
      .bind(session.user_id)
      .all<WeaponRow>();

  const weaponRows =
    playerWeapons.results ?? [];

  const armor =
    await c.env.DB
      .prepare(
        `SELECT
           helmet,
           arms,
           chest,
           legs
         FROM player_armor
         WHERE user_id = ?
         LIMIT 1`,
      )
      .bind(session.user_id)
      .first<ArmorRow>();

  const artifacts =
    await c.env.DB
      .prepare(
        `SELECT
           artifact_name,
           level
         FROM player_artifacts
         WHERE user_id = ?`,
      )
      .bind(session.user_id)
      .all<ArtifactRow>();

  const artifactRows =
    artifacts.results ?? [];

  const levelProgress =
    getLevelProgress(
      Number(profile.exp) || 0,
    );

  const calculatedPower =
    calculateWeaponPower(
      weaponRows,
    ) +
    calculateArmorPower(
      armor ?? null,
    ) +
    calculateArtifactPower(
      artifactRows,
    ) +
    calculateLevelPower(
      levelProgress.level,
    );

  /* =======================================================
     PLAYER WEAPON STATS
  ======================================================= */

  const statsRow =
    await c.env.DB
      .prepare(
        `SELECT stats
         FROM player_stats
         WHERE user_id = ?
         LIMIT 1`,
      )
      .bind(session.user_id)
      .first<{
        stats: string;
      }>();

  let weaponStats:
    WeaponStats = {};

  if (statsRow?.stats) {
    try {
      const parsed =
        JSON.parse(
          statsRow.stats,
        ) as {
          weapons?: WeaponStats;
        };

      if (
        parsed.weapons &&
        typeof parsed.weapons === "object"
      ) {
        weaponStats =
          parsed.weapons;
      }
    } catch {
      weaponStats = {};
    }
  }

  /* =======================================================
     WEAPON POOL
  ======================================================= */

  const weaponCatalog =
    await c.env.DB
      .prepare(
        `SELECT
           name,
           emoji_id,
           rarity
         FROM weapons
         WHERE source = ?
         ORDER BY name`,
      )
      .bind(
        activity.weapon_source,
      )
      .all<{
        name: string;
        emoji_id: string | null;
        rarity: string | null;
      }>();

  const ownedWeaponNames =
    weaponRows.map(
      (weapon) =>
        weapon.weapon_name,
    );

  /* =======================================================
     RUN ACTIVITY

     All RNG happens here, on the Worker.
  ======================================================= */

  const result =
    runEndgameActivity(
      {
        id: activity.id,
        name: activity.name,

        type:
          activity.type as
            | "raid"
            | "dungeon",

        destination:
          activity.destination,

        weapon_source:
          activity.weapon_source,

        reward_table:
          activity.reward_table as
            | "raid"
            | "dungeon",

        unique_material:
          activity.unique_material,

        encounters:
          activity.encounters,
      } satisfies EndgameActivity,

      {
        level:
          levelProgress.level,

        power:
          calculatedPower,

        weaponStats,

        ownedWeapons:
          ownedWeaponNames,
      },

      weaponCatalog.results ?? [],
    );

  /* =======================================================
     BUILD DATABASE WRITES
  ======================================================= */

  const writes:
    D1PreparedStatement[] = [];

  if (endgameStateWrite) {
    writes.push(
      endgameStateWrite,
    );
  }

  const currencyNames =
    new Set([
      "Glimmer",
      "Lumia Leaves",
      "Spoils of Conquest",
      "Synthweave",
    ]);

  const upgradeMaterialNames =
    new Set([
      "Enhancement Core",
      "Enhancement Prism",
      "Ascendant Shard",
    ]);

  for (
    const [rewardName, amount]
    of Object.entries(
      result.rewards,
    )
  ) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      continue;
    }

    if (
      currencyNames.has(
        rewardName,
      )
    ) {
      writes.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_currencies
              (
                user_id,
                currency_name,
                amount
              )
             VALUES (?, ?, ?)
             ON CONFLICT(
               user_id,
               currency_name
             )
             DO UPDATE SET
               amount =
                 player_currencies.amount
                 + excluded.amount`,
          )
          .bind(
            session.user_id,
            rewardName,
            Math.trunc(amount),
          ),
      );

      continue;
    }

    if (
      upgradeMaterialNames.has(
        rewardName,
      )
    ) {
      writes.push(
        c.env.DB
          .prepare(
            `INSERT INTO player_upgrade_materials
              (
                user_id,
                material_name,
                amount
              )
             VALUES (?, ?, ?)
             ON CONFLICT(
               user_id,
               material_name
             )
             DO UPDATE SET
               amount =
                 player_upgrade_materials.amount
                 + excluded.amount`,
          )
          .bind(
            session.user_id,
            rewardName,
            Math.trunc(amount),
          ),
      );

      continue;
    }

    /*
     * Anything remaining should be the activity's
     * unique raid/dungeon material.
     */
    if (
      rewardName ===
      activity.unique_material
    ) {
      const table =
        activity.type === "raid"
          ? "player_raid_materials"
          : "player_dungeon_materials";

      writes.push(
        c.env.DB
          .prepare(
            `INSERT INTO ${table}
              (
                user_id,
                material_name,
                amount
              )
             VALUES (?, ?, ?)
             ON CONFLICT(
               user_id,
               material_name
             )
             DO UPDATE SET
               amount =
                 ${table}.amount
                 + excluded.amount`,
          )
          .bind(
            session.user_id,
            rewardName,
            Math.trunc(amount),
          ),
      );
    }
  }

  /* =======================================================
     XP
  ======================================================= */

  if (result.xp > 0) {
    writes.push(
      c.env.DB
        .prepare(
          `UPDATE player_profiles
           SET
             exp = exp + ?,
             updated_at =
               CURRENT_TIMESTAMP
           WHERE user_id = ?`,
        )
        .bind(
          result.xp,
          session.user_id,
        ),
    );
  }

  /* =======================================================
     WEAPON DROP
  ======================================================= */

  if (
    result.weapon.dropped &&
    result.weapon.name
  ) {
    writes.push(
      c.env.DB
        .prepare(
          `INSERT INTO player_weapons
            (
              user_id,
              weapon_name,
              masterwork
            )
           VALUES (?, ?, 0)
           ON CONFLICT(
             user_id,
             weapon_name
           )
           DO NOTHING`,
        )
        .bind(
          session.user_id,
          result.weapon.name,
        ),
    );
  }

  /* =======================================================
     GLOBAL ACTIVITY FEED

     PUBLIC DATA:
       player
       activity
       CLEAR / WIPE
       optional weapon

     NO XP / currencies / materials.
  ======================================================= */

  writes.push(
    c.env.DB
      .prepare(
        `INSERT INTO global_activity_feed
          (
            user_id,
            activity_name,
            activity_type,
            result,
            weapon_name,
            weapon_adept
          )
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        session.user_id,
        activity.name,
        activity.type,
        result.fullClear
          ? "CLEAR"
          : "WIPE",
        result.weapon.dropped
          ? result.weapon.name
          : null,
        result.weapon.adept
          ? 1
          : 0,
      ),
  );

  /* =======================================================
     COMMIT

     D1 batch executes the activity's writes together.
  ======================================================= */

  if (writes.length > 0) {
    await c.env.DB.batch(
      writes,
    );
  }

  /* =======================================================
     RESPONSE

     This complete result is private to the player and is
     what our animated activity popup will play through.
  ======================================================= */

  return c.json({
    authenticated: true,
    success: true,

    player: {
      name:
        session.global_name ||
        session.username,

      power:
        calculatedPower,

      level:
        levelProgress.level,
    },

    limit:
      activityScope === "daily"
        ? {
            kind: "charges" as const,
            maxCharges:
              ENDGAME_DAILY_MAX_CHARGES,
          }
        : {
            kind: "cooldown" as const,
            cooldownSeconds:
              activity.type === "raid"
                ? ENDGAME_RAID_COOLDOWN_SECONDS
                : ENDGAME_DUNGEON_COOLDOWN_SECONDS,
          },

    result,
  });
});


/* =========================================================
   GAME - GLOBAL ACTIVITY FEED
========================================================= */

app.get("/api/game/activity/feed", async (c) => {
  const sessionId = getCookie(
    c,
    SESSION_COOKIE,
    "host",
  );

  if (!sessionId) {
    return c.json(
      {
        authenticated: false,
        events: [],
      },
      401,
    );
  }

  const session =
    await c.env.DB
      .prepare(
        `SELECT user_id
         FROM sessions
         WHERE id = ?
           AND expires_at > ?
         LIMIT 1`,
      )
      .bind(
        sessionId,
        new Date().toISOString(),
      )
      .first<{
        user_id: number;
      }>();

  if (!session) {
    return c.json(
      {
        authenticated: false,
        events: [],
      },
      401,
    );
  }

  const events =
    await c.env.DB
      .prepare(
        `SELECT
           global_activity_feed.id,
           global_activity_feed.activity_name,
           global_activity_feed.activity_type,
           global_activity_feed.result,
           global_activity_feed.weapon_name,
           global_activity_feed.weapon_adept,
           global_activity_feed.created_at,

           users.username,
           users.global_name,
           users.discord_id,
           users.avatar

         FROM global_activity_feed

         INNER JOIN users
           ON users.id =
              global_activity_feed.user_id

         ORDER BY
           global_activity_feed.id DESC

         LIMIT 30`,
      )
      .all<{
        id: number;
        activity_name: string;
        activity_type: string;
        result: string;
        weapon_name: string | null;
        weapon_adept: number;
        created_at: string;
        username: string;
        global_name: string | null;
        discord_id: string;
        avatar: string | null;
      }>();

  return c.json({
    authenticated: true,

    events:
      (events.results ?? []).map(
        (event) => ({
          id: event.id,

          player:
            event.global_name ||
            event.username,

          avatarUrl:
            getDiscordAvatarUrl(
              event.discord_id,
              event.avatar,
            ),

          activity:
            event.activity_name,

          activityType:
            event.activity_type,

          result:
            event.result,

          weapon:
            event.weapon_name
              ? {
                  name:
                    event.weapon_name,

                  adept:
                    Boolean(
                      event.weapon_adept,
                    ),
                }
              : null,

          createdAt:
            event.created_at,
        }),
      ),
  });
});

export default app;
