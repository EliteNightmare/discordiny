import { useEffect, useRef, useState } from "react";
import "./TopBar.css";

type AuthResponse = {
  authenticated: boolean;
  user?: {
    id: number;
    discord_id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
};

function getAvatarUrl(
  discordId: string,
  avatar: string | null,
): string | null {
  if (!avatar) {
    return null;
  }

  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=64`;
}

function navigate(path: string) {
  window.location.href = path;
}

function TopBar() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [arsenalOpen, setArsenalOpen] = useState(false);

  const arsenalRef = useRef<HTMLDivElement | null>(null);

  const currentPath = window.location.pathname;

  useEffect(() => {
    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        const data = (await response.json()) as AuthResponse;

        setAuth(data);
      } catch {
        setAuth({
          authenticated: false,
        });
      }
    }

    void loadAuth();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        arsenalRef.current &&
        !arsenalRef.current.contains(event.target as Node)
      ) {
        setArsenalOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  function goTo(path: string) {
    setMobileOpen(false);
    setArsenalOpen(false);
    navigate(path);
  }

  const arsenalActive =
    currentPath === "/vault" ||
    currentPath === "/armory" ||
    currentPath === "/artifacts";

  const displayName =
    auth?.user?.global_name ||
    auth?.user?.username ||
    "Account";

  const avatarUrl =
    auth?.user
      ? getAvatarUrl(
          auth.user.discord_id,
          auth.user.avatar,
        )
      : null;

  return (
    <header className="top-bar">
      {/* =========================
          LEFT / LOGO
          ========================= */}

      <div className="top-bar-left">
        <button
          type="button"
          className="top-bar-logo"
          onClick={() => goTo("/")}
          aria-label="Discordiny Home"
        >
          DISCORDINY
        </button>
      </div>

      {/* =========================
          DESKTOP NAVIGATION
          ========================= */}

      <nav className="main-navigation">
        <button
          type="button"
          className={
            currentPath === "/"
              ? "nav-button nav-button-active"
              : "nav-button"
          }
          onClick={() => goTo("/")}
        >
          Home
        </button>

        <button
          type="button"
          className={
            currentPath === "/profile"
              ? "nav-button nav-button-active"
              : "nav-button"
          }
          onClick={() => goTo("/profile")}
        >
          Profile
        </button>

        <button
          type="button"
          className={
            currentPath === "/activities"
              ? "nav-button nav-button-active"
              : "nav-button"
          }
          onClick={() => goTo("/activities")}
        >
          Activities
        </button>

        {/* =========================
            ARSENAL
            ========================= */}

        <div
          ref={arsenalRef}
          className="arsenal-nav"
          onMouseEnter={() => setArsenalOpen(true)}
          onMouseLeave={() => setArsenalOpen(false)}
        >
          <button
            type="button"
            className={
              arsenalActive
                ? "nav-button arsenal-trigger nav-button-active"
                : "nav-button arsenal-trigger"
            }
            aria-expanded={arsenalOpen}
            aria-haspopup="menu"
            onClick={() => {
              setArsenalOpen((open) => !open);
            }}
          >
            <span>Arsenal</span>

            <span
              className={
                arsenalOpen
                  ? "arsenal-chevron arsenal-chevron-open"
                  : "arsenal-chevron"
              }
            >
              ▼
            </span>
          </button>

          {arsenalOpen && (
            <div
              className="arsenal-dropdown"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className={
                  currentPath === "/vault"
                    ? "arsenal-dropdown-item arsenal-dropdown-item-active"
                    : "arsenal-dropdown-item"
                }
                onClick={() => goTo("/vault")}
              >
                <span className="arsenal-item-title">
                  Vault
                </span>

                <span className="arsenal-item-description">
                  Weapons & equipment
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className={
                  currentPath === "/armory"
                    ? "arsenal-dropdown-item arsenal-dropdown-item-active"
                    : "arsenal-dropdown-item"
                }
                onClick={() => goTo("/armory")}
              >
                <span className="arsenal-item-title">
                  Armory
                </span>

                <span className="arsenal-item-description">
                  Armor collection
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className={
                  currentPath === "/artifacts"
                    ? "arsenal-dropdown-item arsenal-dropdown-item-active"
                    : "arsenal-dropdown-item"
                }
                onClick={() => goTo("/artifacts")}
              >
                <span className="arsenal-item-title">
                  Artifacts
                </span>

                <span className="arsenal-item-description">
                  Artifact collection
                </span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* =========================
          RIGHT / ACCOUNT
          ========================= */}

      <div className="top-bar-right">
        {auth?.authenticated && auth.user ? (
          <button
            type="button"
            className="account-button"
            onClick={() => goTo("/account")}
          >
            {avatarUrl ? (
              <img
                className="account-avatar"
                src={avatarUrl}
                alt=""
              />
            ) : (
              <span className="account-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}

            <span className="account-name">
              {displayName}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="login-button"
            onClick={() => {
              window.location.href =
                "/api/auth/login";
            }}
          >
            Login
          </button>
        )}

        <button
          type="button"
          className={
            mobileOpen
              ? "mobile-menu-button mobile-menu-button-open"
              : "mobile-menu-button"
          }
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen((open) => !open);
            setArsenalOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* =========================
          MOBILE MENU
          ========================= */}

      {mobileOpen && (
        <div className="mobile-navigation">
          <button
            type="button"
            className={
              currentPath === "/"
                ? "mobile-nav-item mobile-nav-item-active"
                : "mobile-nav-item"
            }
            onClick={() => goTo("/")}
          >
            Home
          </button>

          <button
            type="button"
            className={
              currentPath === "/profile"
                ? "mobile-nav-item mobile-nav-item-active"
                : "mobile-nav-item"
            }
            onClick={() => goTo("/profile")}
          >
            Profile
          </button>

          <button
            type="button"
            className={
              currentPath === "/activities"
                ? "mobile-nav-item mobile-nav-item-active"
                : "mobile-nav-item"
            }
            onClick={() => goTo("/activities")}
          >
            Activities
          </button>

          <div className="mobile-arsenal">
            <button
              type="button"
              className={
                arsenalActive
                  ? "mobile-nav-item mobile-arsenal-trigger mobile-nav-item-active"
                  : "mobile-nav-item mobile-arsenal-trigger"
              }
              onClick={() => {
                setArsenalOpen((open) => !open);
              }}
            >
              <span>Arsenal</span>

              <span
                className={
                  arsenalOpen
                    ? "arsenal-chevron arsenal-chevron-open"
                    : "arsenal-chevron"
                }
              >
                ▼
              </span>
            </button>

            {arsenalOpen && (
              <div className="mobile-arsenal-menu">
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
                  onClick={() => goTo("/artifacts")}
                >
                  Artifacts
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={
              currentPath === "/account"
                ? "mobile-nav-item mobile-nav-item-active"
                : "mobile-nav-item"
            }
            onClick={() => goTo("/account")}
          >
            Account
          </button>
        </div>
      )}
    </header>
  );
}

export default TopBar;
