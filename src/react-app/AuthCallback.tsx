import { useEffect, useState } from "react";

export default function AuthCallback() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    async function completeLogin() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          throw new Error("Discord did not return an authorization code.");
        }

        const verifier = sessionStorage.getItem(
          "discordiny_pkce_verifier"
        );

        if (!verifier) {
          throw new Error("Missing PKCE verifier.");
        }

        const tokenResponse = await fetch(
          "https://discord.com/api/v10/oauth2/token",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: "1529513718176813166",
              grant_type: "authorization_code",
              code,
              redirect_uri:
                "https://discordiny.com/auth/callback",
              code_verifier: verifier,
            }),
          }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          console.error("Discord token error:", tokenData);
          throw new Error("Discord token exchange failed.");
        }

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
          throw new Error(
            "Could not retrieve Discord profile."
          );
        }

        const user = await userResponse.json();

        console.log("Discord user:", user);

        sessionStorage.removeItem(
          "discordiny_pkce_verifier"
        );

        window.location.href = "/";
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Discord login failed."
        );
      }
    }

    completeLogin();
  }, []);

  return (
    <main className="home-page">
      <section className="home-content">
        <h1>{message}</h1>
      </section>
    </main>
  );
}
