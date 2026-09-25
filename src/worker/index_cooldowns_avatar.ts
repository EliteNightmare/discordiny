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
   TERMINAL - CREATE INSTANCE
========================================================= */

const TERMINAL_INSTANCE_LIFETIME_SECONDS =
  30;

const TERMINAL_SESSION_LIFETIME_SECONDS =
  60 * 60;

app.post(
  "/api/terminal/create",
  async (c) => {
    /*
     * Generate the instance key on the
     * server. The browser never chooses it.
     *
     * Two UUIDs are combined so the key is
     * long and impractical to guess.
     */
    const instanceKey =
      `${crypto.randomUUID()}${crypto.randomUUID()}`
        .replaceAll("-", "");

    /*
     * The generated URL only has a short
     * window in which it may establish a
     * terminal connection.
     */
    const expiresAt =
      new Date(
        Date.now() +
          TERMINAL_INSTANCE_LIFETIME_SECONDS *
            1000,
      ).toISOString();

    /*
     * Clean up old terminal instances.
     *
     * These are temporary records, so there
     * is no reason to keep expired ones.
     */
    await c.env.DB
      .prepare(
        `DELETE FROM terminal_instances
         WHERE expires_at <= ?`,
      )
      .bind(
        new Date().toISOString(),
      )
      .run();

    /*
     * Store the new instance.
     */
    await c.env.DB
      .prepare(
        `INSERT INTO terminal_instances
         (
           instance_key,
           expires_at,
           consumed
         )
         VALUES (?, ?, 0)`,
      )
      .bind(
        instanceKey,
        expiresAt,
      )
      .run();

    /*
     * Return only the generated key.
     *
     * React will eventually use this to
     * redirect to:
     *
     * terminal.discordiny.com/INSTANCEKEY
     */
    return c.json({
      success: true,
      instanceKey,
      expiresAt,
    });
  },
);

/* =========================================================
   TERMINAL - CONNECT TO INSTANCE
========================================================= */

app.post("/api/terminal/connect", async (c) => {
  let body: {
    instanceKey?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: "Invalid request.",
      },
      400,
    );
  }

  const instanceKey =
    body.instanceKey?.trim();

  if (!instanceKey) {
    return c.json(
      {
        success: false,
        error: "Missing instance key.",
      },
      400,
    );
  }

  const now =
    new Date().toISOString();

  /*
   * Consume the one-time instance key.
   */
  const result =
    await c.env.DB
      .prepare(
        `UPDATE terminal_instances
         SET
           consumed = 1,
           consumed_at = ?
         WHERE instance_key = ?
           AND consumed = 0
           AND expires_at > ?`,
      )
      .bind(
        now,
        instanceKey,
        now,
      )
      .run();

  /*
   * Nothing changed:
   * invalid, expired, or already consumed.
   */
  if (
    !result.meta.changes ||
    result.meta.changes !== 1
  ) {
    return c.json(
      {
        success: false,
        error:
          "Terminal instance invalid or expired.",
      },
      403,
    );
  }

  /*
   * The instance was successfully consumed.
   *
   * Now create a separate terminal session.
   */
  const sessionId =
    `${crypto.randomUUID()}${crypto.randomUUID()}`
      .replaceAll("-", "");

  const sessionExpiresAt =
    new Date(
      Date.now() +
        TERMINAL_SESSION_LIFETIME_SECONDS *
          1000,
    ).toISOString();

  /*
   * Clean expired terminal sessions.
   */
  await c.env.DB
    .prepare(
      `DELETE FROM terminal_sessions
       WHERE expires_at <= ?`,
    )
    .bind(now)
    .run();

  /*
   * Store the new terminal session.
   */
  await c.env.DB
    .prepare(
      `INSERT INTO terminal_sessions
       (
         session_id,
         expires_at
       )
       VALUES (?, ?)`,
    )
    .bind(
      sessionId,
      sessionExpiresAt,
    )
    .run();

  /*
   * Give the browser an HttpOnly terminal
   * session cookie.
   *
   * IMPORTANT:
   * Domain=.discordiny.com allows the
   * cookie created by the API to also be
   * available on terminal.discordiny.com.
   */
  c.header(
    "Set-Cookie",
    [
      `discordiny_terminal_session=${sessionId}`,
      "Path=/",
      "Domain=.discordiny.com",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${TERMINAL_SESSION_LIFETIME_SECONDS}`,
    ].join("; "),
  );

  return c.json({
    success: true,
    expiresAt:
      sessionExpiresAt,
  });
});

/* =========================================================
   TERMINAL - CHECK SESSION
========================================================= */

app.get("/api/terminal/session", async (c) => {
  /*
   * Read the terminal session cookie.
   */
  const cookieHeader =
    c.req.header("Cookie") ?? "";

  const cookies =
    cookieHeader
      .split(";")
      .map((cookie) =>
        cookie.trim(),
      );

  const sessionCookie =
    cookies.find((cookie) =>
      cookie.startsWith(
        "discordiny_terminal_session=",
      ),
    );

  if (!sessionCookie) {
    return c.json({
      authenticated: false,
    });
  }

  const sessionId =
    sessionCookie
      .slice(
        "discordiny_terminal_session="
          .length,
      )
      .trim();

  if (!sessionId) {
    return c.json({
      authenticated: false,
    });
  }

  const now =
    new Date().toISOString();

  /*
   * Find an active terminal session.
   */
  const session =
    await c.env.DB
      .prepare(
        `SELECT
           session_id,
           expires_at
         FROM terminal_sessions
         WHERE session_id = ?
           AND expires_at > ?
         LIMIT 1`,
      )
      .bind(
        sessionId,
        now,
      )
      .first<{
        session_id: string;
        expires_at: string;
      }>();

  /*
   * Cookie exists, but its session doesn't.
   *
   * It may have expired or otherwise be
   * invalid.
   */
  if (!session) {
    /*
     * Remove the invalid cookie from the
     * browser as well.
     */
    c.header(
      "Set-Cookie",
      [
        "discordiny_terminal_session=",
        "Path=/",
        "Domain=.discordiny.com",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=0",
      ].join("; "),
    );

    return c.json({
      authenticated: false,
    });
  }

  return c.json({
    authenticated: true,
    expiresAt:
      session.expires_at,
  });
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
      weapon.weapon_name,
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
  const weapons = catalog.results.map(
    (weapon) => {
      const ownedNormal =
        ownedMap.has(weapon.name);

      const adeptName =
        `${weapon.name} (Adept)`;

      const ownedAdept =
        ownedMap.has(adeptName);

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

        normal: {
          owned: ownedNormal,

          masterwork:
            ownedMap.get(
              weapon.name
            ) ?? 0,
        },

        adept: {
          owned: ownedAdept,

          masterwork:
            ownedMap.get(
              adeptName
            ) ?? 0,
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
    body.activity.startsWith(
      "__endgame_",
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

const ENDGAME_DUNGEON_COOLDOWN_SECONDS = 15;
const ENDGAME_RAID_COOLDOWN_SECONDS = 30;
const ENDGAME_DAILY_MAX_CHARGES = 3;

const ENDGAME_DUNGEON_COOLDOWN_KEY =
  "__endgame_dungeon";
const ENDGAME_RAID_COOLDOWN_KEY =
  "__endgame_raid";

function getDailyEndgameChargeKey(
  type: "raid" | "dungeon",
  nowSeconds: number,
): string {
  const rotationNumber = Math.floor(
    nowSeconds / DAILY_ROTATION_SECONDS,
  );

  return `__endgame_daily_${type}_${rotationNumber}`;
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
       15 second cooldown

     Regular Raid:
       30 second cooldown

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

  const endgameCooldownRows =
    await c.env.DB
      .prepare(
        `SELECT
           activity,
           timestamp
         FROM player_cooldowns
         WHERE user_id = ?
           AND activity IN (?, ?, ?, ?)`,
      )
      .bind(
        session.user_id,
        ENDGAME_DUNGEON_COOLDOWN_KEY,
        ENDGAME_RAID_COOLDOWN_KEY,
        dailyDungeonChargeKey,
        dailyRaidChargeKey,
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
   GAME - RUN ENDGAME ACTIVITY
========================================================= */

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