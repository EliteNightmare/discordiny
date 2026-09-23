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
  60 * 60 * 24 * 30; // 30 days

const BUNGIE_STATE_DURATION_SECONDS =
  60 * 10; // 10 minutes


/* =========================================================
   API ROOT
========================================================= */

app.get("/api/", (c) => {
  return c.json({
    name: "Discordiny",
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

  /* -------------------------------------------------------
     Exchange Discord authorization code for access token
  ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Retrieve Discord user
  ------------------------------------------------------- */

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


  /* =======================================================
     SEND USER BACK TO THE GAME
  ======================================================= */

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


  /* -------------------------------------------------------
     Check expiration
  ------------------------------------------------------- */

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

  /*
     Generate a unique OAuth state value.

     This is returned by Bungie during the callback
     and allows us to verify that the callback belongs
     to the authorization request started by this browser.
  */

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
     Make sure Bungie returned an authorization code
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
     Find the logged-in Discordiny user
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
     Exchange Bungie authorization code for access token
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
     Temporary response

     We will replace this with the Bungie account lookup
     and D1 database save in the next step.
  ------------------------------------------------------- */

  return c.json({
    success: true,
    message:
      "Bungie authorization successful",
    has_access_token:
      Boolean(tokenData.access_token),
  });
});


export default app;
