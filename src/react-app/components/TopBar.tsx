import { useEffect, useRef, useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [arsenalMenuOpen, setArsenalMenuOpen] = useState(false);
  const [newsMenuOpen, setNewsMenuOpen] = useState(false);

  const arsenalRef = useRef<HTMLDivElement | null>(null);
  const newsRef = useRef<HTMLDivElement | null>(null);

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
        console.error(
          "Failed to load authenticated user:",
          error
        );

        setUser(null);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        arsenalRef.current &&
        !arsenalRef.current.contains(target)
      ) {
        setArsenalMenuOpen(false);
      }

      if (
        newsRef.current &&
        !newsRef.current.contains(target)
      ) {
        setNewsMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  function goTo(path: string) {
    setArsenalMenuOpen(false);
    setNewsMenuOpen(false);
    setMobileMenuOpen(false);

    window.location.href = path;
  }

  function goToProfile() {
    goTo("/profile");
  }

  function handleAccountClick() {
    if (!user) {
      window.location.href = "/api/auth/login";
      return;
    }

    setAccountMenuOpen(!accountMenuOpen);
    setMobileMenuOpen(false);
    setArsenalMenuOpen(false);
    setNewsMenuOpen(false);
  }

  function handleLogout() {
    window.location.href = "/api/auth/logout";
  }

  function getAvatarUrl() {
    if (!user?.avatar) {
      return discordIcon;
    }

    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    setArsenalMenuOpen(false);
    setNewsMenuOpen(false);
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
          aria-label="Go to homepage"
          onClick={() => goTo("/")}
        >
          <img
            src={logo}
            alt="Discordiny"
            className="discordiny-logo"
          />
        </button>

        {/* Desktop navigation */}
        <nav className="main-navigation">
          <button
            type="button"
            onClick={goToProfile}
          >
            Profile
          </button>

          {/* Arsenal */}
          <div
            ref={arsenalRef}
            className="topbar-dropdown"
            onMouseEnter={() => {
              setArsenalMenuOpen(true);
              setNewsMenuOpen(false);
            }}
            onMouseLeave={() => {
              setArsenalMenuOpen(false);
            }}
          >
            <button
              type="button"
              className="topbar-dropdown-trigger"
              aria-haspopup="menu"
              aria-expanded={arsenalMenuOpen}
              onClick={() => {
                setArsenalMenuOpen(
                  !arsenalMenuOpen
                );
                setNewsMenuOpen(false);
              }}
            >
              <span>Arsenal</span>

              <span
                className={`topbar-dropdown-arrow ${
                  arsenalMenuOpen ? "open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {arsenalMenuOpen && (
              <div
                className="topbar-dropdown-menu"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/vault")}
                >
                  Vault
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/armory")}
                >
                  Armory
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    goTo("/artifacts")
                  }
                >
                  Artifacts
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => goTo("/activities")}
          >
            Activities
          </button>

          <button type="button">
            Triumphs
          </button>

          <button type="button">
            Events
          </button>

          {/* NEWS */}
          <div
            ref={newsRef}
            className="topbar-dropdown"
            onMouseEnter={() => {
              setNewsMenuOpen(true);
              setArsenalMenuOpen(false);
            }}
            onMouseLeave={() => {
              setNewsMenuOpen(false);
            }}
          >
            <button
              type="button"
              className="topbar-dropdown-trigger"
              aria-haspopup="menu"
              aria-expanded={newsMenuOpen}
              onClick={() => {
                setNewsMenuOpen(
                  !newsMenuOpen
                );
                setArsenalMenuOpen(false);
              }}
            >
              <span>NEWS</span>

              <span
                className={`topbar-dropdown-arrow ${
                  newsMenuOpen ? "open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {newsMenuOpen && (
              <div
                className="topbar-dropdown-menu"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    goTo("/updates")
                  }
                >
                  Updates
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    goTo("/patchnotes")
                  }
                >
                  Patchnotes
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/about")}
                >
                  About
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile navigation */}
      <div className="mobile-navigation">
        <button
          className="mobile-navigation-button"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => {
            setMobileMenuOpen(
              !mobileMenuOpen
            );
            setAccountMenuOpen(false);
            setArsenalMenuOpen(false);
            setNewsMenuOpen(false);
          }}
        >
          <span>Menu</span>

          <span
            className={`mobile-navigation-arrow ${
              mobileMenuOpen ? "open" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {mobileMenuOpen && (
          <nav className="mobile-navigation-menu">
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                goToProfile();
              }}
            >
              Profile
            </button>

            {/* Mobile Arsenal */}
            <button
              type="button"
              className="mobile-submenu-trigger"
              onClick={() => {
                setArsenalMenuOpen(
                  !arsenalMenuOpen
                );
                setNewsMenuOpen(false);
              }}
            >
              <span>Arsenal</span>

              <span
                className={`mobile-submenu-arrow ${
                  arsenalMenuOpen ? "open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {arsenalMenuOpen && (
              <div className="mobile-submenu">
                <button
                  type="button"
                  onClick={() => goTo("/vault")}
                >
                  Vault
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/armory")}
                >
                  Armory
                </button>

                <button
                  type="button"
                  onClick={() =>
                    goTo("/artifacts")
                  }
                >
                  Artifacts
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => goTo("/activities")}
            >
              Activities
            </button>

            <button
              type="button"
              onClick={closeMobileMenu}
            >
              Triumphs
            </button>

            <button
              type="button"
              onClick={closeMobileMenu}
            >
              Events
            </button>

            {/* Mobile NEWS */}
            <button
              type="button"
              className="mobile-submenu-trigger"
              onClick={() => {
                setNewsMenuOpen(
                  !newsMenuOpen
                );
                setArsenalMenuOpen(false);
              }}
            >
              <span>NEWS</span>

              <span
                className={`mobile-submenu-arrow ${
                  newsMenuOpen ? "open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {newsMenuOpen && (
              <div className="mobile-submenu">
                <button
                  type="button"
                  onClick={() =>
                    goTo("/updates")
                  }
                >
                  Updates
                </button>

                <button
                  type="button"
                  onClick={() =>
                    goTo("/patchnotes")
                  }
                >
                  Patchnotes
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/about")}
                >
                  About
                </button>
              </div>
            )}
          </nav>
        )}
      </div>

      {/* Account */}
      <div className="account-container">
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

        {user && accountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-user">
              <img
                src={getAvatarUrl()}
                alt=""
              />

              <div>
                <strong>
                  {displayName}
                </strong>

                <span>
                  @{user.username}
                </span>
              </div>
            </div>

            <div className="account-menu-divider" />

            <button
              type="button"
              className="account-menu-profile"
              onClick={() => {
                setAccountMenuOpen(false);
                goToProfile();
              }}
            >
              Profile
            </button>

            <button
              type="button"
              className="account-menu-logout"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
