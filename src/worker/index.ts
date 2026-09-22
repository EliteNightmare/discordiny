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

export default app;
