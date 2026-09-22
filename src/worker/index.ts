declare global {
  interface Env {
    DISCORD_CLIENT_SECRET: string;
  }
}

import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

const DISCORD_CLIENT_ID = "1529513718176813166";
const DISCORD_REDIRECT_URI =
  "https://discordiny.com/api/auth/callback";

app.get("/api/", (c) => {
  return c.json({ name: "Cloudflare" });
});

app.get("/api/auth/login", (c) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: "identify",
  });

  const discordUrl =
    `https://discord.com/oauth2/authorize?${params.toString()}`;

  return c.redirect(discordUrl);
});

app.get("/api/auth/callback", async (c) => {
  const code = c.req.query("code");

  console.log(
    "Discord client secret present:",
    Boolean(c.env.DISCORD_CLIENT_SECRET)
  );

  if (!code) {
    return c.json(
      { error: "Missing authorization code" },
      400
    );
  }

  const basicAuth = btoa(
    `${DISCORD_CLIENT_ID}:${c.env.DISCORD_CLIENT_SECRET}`
  );

  console.log("OAuth diagnostic:", {
    clientId: DISCORD_CLIENT_ID,
    redirectUri: DISCORD_REDIRECT_URI,
    secretLength: c.env.DISCORD_CLIENT_SECRET.length,
    basicAuthLength: basicAuth.length,
    secretHashWhitespace:
      c.env.DISCORD_CLIENT_SECRET !==
      c.env.DISCORD_CLIENT_SECRET.trim(),
  });

  const tokenResponse = await fetch(
    "https://discord.com/api/v10/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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

    console.error("Discord token exchange failed:", error);

    return c.json(
      {
        error: "Discord token exchange failed",
        discord_error: error,
      },
      500
    );
  }

  const tokenData = await tokenResponse.json<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }>();

  const userResponse = await fetch(
    "https://discord.com/api/users/@me",
    {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      },
    }
  );

  if (!userResponse.ok) {
    return c.json(
      { error: "Could not retrieve Discord user" },
      500
    );
  }

  const user = await userResponse.json();

  console.log("Discord user authenticated:", user);

  return c.json({
    message: "Discord authentication successful",
    user,
  });
});

export default app;
