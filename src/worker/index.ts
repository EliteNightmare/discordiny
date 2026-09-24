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

app.get("/api/game/activities", (c) => {
  return c.json({
    activities: ACTIVITIES,
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

export default app;
