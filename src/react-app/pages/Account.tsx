import { useEffect, useState } from "react";
import "./Account.css";
import TopBar from "../components/TopBar";
import background from "../assets/background.jpg";
import discordIcon from "../assets/discord_icon.png";

type User = {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          window.location.href = "/";
          return;
        }

        const data = await response.json();

        if (!data.authenticated) {
          window.location.href = "/";
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Failed to load account:", error);
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <>
        <TopBar />

        <main
          className="account-page"
          style={{
            backgroundImage: `url(${background})`,
          }}
        >
          <div className="account-loading">
            Loading account...
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    user.global_name ||
    user.username;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=256`
    : discordIcon;

  return (
    <>
      <TopBar />

      <main
        className="account-page"
        style={{
          backgroundImage: `url(${background})`,
        }}
      >
        <section className="account-card">
          <div className="account-header">
            <img
              className="account-avatar"
              src={avatarUrl}
              alt={`${displayName}'s Discord avatar`}
            />

            <div className="account-identity">
              <h1>{displayName}</h1>
              <p>Discord Account</p>
            </div>
          </div>

          <div className="account-divider" />

          <div className="account-information">
            <div className="account-information-item">
              <div className="account-information-text">
                <span>Bungie Account</span>
                <strong>Not linked</strong>
              </div>

              <button
                className="bungie-link-button"
                type="button"
              >
                Link
              </button>
            </div>

            <div className="account-information-item">
              <div className="account-information-text">
                <span>Patreon Account</span>
                <strong>Not linked</strong>
              </div>

              <button
                className="patreon-link-button"
                type="button"
              >
                Link
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
