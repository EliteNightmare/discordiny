import { useEffect, useState } from "react";
import "./Profile.css";
import TopBar from "../components/TopBar";

type User = {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export default function Profile() {
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
        console.error("Failed to load profile:", error);
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

        <main className="profile-page">
          <div className="profile-loading">
            Loading profile...
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
    : null;

  return (
    <>
      <TopBar />

      <main className="profile-page">
        <section className="profile-card">
          <div className="profile-header">
            {avatarUrl ? (
              <img
                className="profile-avatar"
                src={avatarUrl}
                alt={`${displayName}'s Discord avatar`}
              />
            ) : (
              <div className="profile-avatar profile-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="profile-identity">
              <h1>{displayName}</h1>
              <p>@{user.username}</p>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-information">
            <div className="profile-information-item">
              <span>Discord Username</span>
              <strong>@{user.username}</strong>
            </div>

            <div className="profile-information-item">
              <span>Discord ID</span>
              <strong>{user.discord_id}</strong>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
