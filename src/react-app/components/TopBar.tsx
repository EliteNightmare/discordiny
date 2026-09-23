import { useEffect, useState } from "react";

import "./TopBar.css";

import logo from "../assets/discordinylogo.png";
import discordIcon from "../assets/discord_icon.png";

type User = {
  id: number;
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export default function TopBar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();

        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to load authenticated user:", error);
        setUser(null);
      }
    }

    loadUser();
  }, []);

  function handleAccountClick() {
    if (user) {
      window.location.href = "/api/auth/logout";
      return;
    }

    window.location.href = "/api/auth/login";
  }

  function getAvatarUrl() {
    if (!user?.avatar) {
      return discordIcon;
    }

    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
  }

  const displayName =
    user?.global_name ||
    user?.username ||
    "Account";

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button
          className="logo-button"
          type="button"
        >
          <img
            src={logo}
            alt="Discordiny"
            className="discordiny-logo"
          />
        </button>

        <nav className="main-navigation">
          <button type="button">Profile</button>
          <button type="button">Inventories</button>
          <button type="button">Activities</button>
          <button type="button">Triumphs</button>
          <button type="button">Events</button>
          <button type="button">About</button>
        </nav>
      </div>

      <button
        className="account-button"
        type="button"
        onClick={handleAccountClick}
      >
        <img
          src={getAvatarUrl()}
          alt={
            user
              ? `${displayName}'s Discord avatar`
              : "Discord account"
          }
        />

        <span>
          {user ? displayName : "Account"}
        </span>
      </button>
    </header>
  );
}
