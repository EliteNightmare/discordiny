import "./Home.css";

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(new Uint8Array(digest));
}

export default function Home() {
  async function startDiscordLogin() {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    sessionStorage.setItem(
      "discordiny_pkce_verifier",
      verifier
    );

    const params = new URLSearchParams({
      client_id: "1529513718176813166",
      response_type: "code",
      redirect_uri:
        "https://discordiny.com/api/auth/callback",
      scope: "identify",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    window.location.href =
      `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  return (
    <main className="home-page">
      <section className="home-content">
        <h1>Welcome to Discordiny</h1>

        <p>
          Your adventure begins here.
        </p>

        <button
          className="start-button"
          type="button"
          onClick={startDiscordLogin}
        >
          <span className="start-button-title">
            Enter the World
          </span>
        </button>
      </section>
    </main>
  );
}
