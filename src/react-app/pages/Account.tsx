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

type BungieAccount = {
  membership_id: string;
  membership_type: number;
  bungie_name: string;
};

export default function Account() {
  const [user, setUser] = useState<User | null>(null);

  const [betaCode, setBetaCode] = useState("");
  const [betaMessage, setBetaMessage] = useState("");
  const [betaStatus, setBetaStatus] = useState<{ active: boolean; hasAccess: boolean; isAdmin: boolean } | null>(null);
  const [betaBusy, setBetaBusy] = useState(false);
  useEffect(() => {
    fetch("/api/beta/status", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setBetaStatus)
      .catch(() => {});
  }, []);
  async function betaAction(path: string, body: object) {
    setBetaBusy(true);
    setBetaMessage("");
    try {
      const response = await fetch(path, { method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      if (path.endsWith("/redeem")) {
        setBetaCode("");
        setBetaMessage("Beta access activated.");
      }
      const status = await fetch("/api/beta/status", { credentials: "include" });
      if (status.ok) setBetaStatus(await status.json());
    } catch (error) {
      setBetaMessage(error instanceof Error ? error.message : "Request failed");
    } finally { setBetaBusy(false); }
  }



  const [bungieAccount, setBungieAccount] =
    useState<BungieAccount | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [bungieLoading, setBungieLoading] =
    useState(true);

  const [unlinking, setUnlinking] =
    useState(false);

  const [bungieError, setBungieError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        const [userResponse, bungieResponse] =
          await Promise.all([
            fetch("/api/auth/me", {
              credentials: "include",
            }),

            fetch("/api/bungie/me", {
              credentials: "include",
            }),
          ]);

        if (!userResponse.ok) {
          window.location.href = "/";
          return;
        }

        const userData =
          await userResponse.json();

        if (!userData.authenticated) {
          window.location.href = "/";
          return;
        }

        setUser(userData.user);

        if (bungieResponse.ok) {
          const bungieData =
            await bungieResponse.json();

          if (bungieData.linked) {
            setBungieAccount(
              bungieData.account
            );
          } else {
            setBungieAccount(null);
          }
        }
      } catch (error) {
        console.error(
          "Failed to load account:",
          error
        );

        window.location.href = "/";
      } finally {
        setLoading(false);
        setBungieLoading(false);
      }
    }

    /*
     * Check whether Bungie OAuth redirected
     * back with a linking error.
     */
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("bungie_error") ===
      "already_linked"
    ) {
      setBungieError(
        "This Bungie account is already linked to another Discordiny account."
      );

      /*
       * Remove the error query parameter from
       * the URL after reading it.
       *
       * This prevents the same message from
       * appearing again after a page refresh.
       */
      window.history.replaceState(
        {},
        "",
        "/account"
      );
    }

    loadAccount();
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
    user.global_name || user.username;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=256`
    : discordIcon;

  function linkBungieAccount() {
    /*
     * Clear any previous error before starting
     * a new Bungie linking attempt.
     */
    setBungieError(null);

    window.location.href =
      "/api/bungie/link";
  }

  async function unlinkBungieAccount() {
    if (unlinking) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to unlink your Bungie account?"
    );

    if (!confirmed) {
      return;
    }

    setUnlinking(true);
    setBungieError(null);

    try {
      const response = await fetch(
        "/api/bungie/unlink",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to unlink Bungie account"
        );
      }

      setBungieAccount(null);
    } catch (error) {
      console.error(
        "Failed to unlink Bungie account:",
        error
      );

      window.alert(
        "Failed to unlink Bungie account. Please try again."
      );
    } finally {
      setUnlinking(false);
    }
  }

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

          {bungieError && (
            <div className="account-bungie-error">
              <strong>
                Bungie account already linked
              </strong>

              <span>
                {bungieError}
              </span>
            </div>
          )}

          <div className="account-information">
            <div className="account-information-item">
              <div className="account-information-text">
                <span>
                  Bungie Account
                </span>

                {bungieLoading ? (
                  <strong>
                    Loading...
                  </strong>
                ) : bungieAccount ? (
                  <strong>
                    {
                      bungieAccount.bungie_name
                    }
                  </strong>
                ) : (
                  <strong>
                    Not linked
                  </strong>
                )}
              </div>

              {!bungieLoading &&
                (bungieAccount ? (
                  <button
                    className="account-link-button"
                    type="button"
                    onClick={
                      unlinkBungieAccount
                    }
                    disabled={unlinking}
                  >
                    {unlinking
                      ? "Unlinking..."
                      : "Unlink"}
                  </button>
                ) : (
                  <button
                    className="account-link-button"
                    type="button"
                    onClick={
                      linkBungieAccount
                    }
                  >
                    Link
                  </button>
                ))}
            </div>

            <div className="account-information-item">
              <div className="account-information-text">
                <span>
                  Patreon Account
                </span>

                <strong>
                  Not linked
                </strong>
              </div>

              <button
                className="account-link-button"
                type="button"
              >
                Link
              </button>
            </div>
          </div>
          <div className="account-divider" />
          <div className="account-beta-access">
            <h2>Beta Access</h2>
            <p>{betaStatus?.isAdmin ? "Administrator access is enabled for your Discord account." : betaStatus?.hasAccess ? "Your Discord account has beta access." : "Enter a 15-digit invitation code to join the beta."}</p>
            {(betaStatus?.isAdmin || (betaStatus?.hasAccess && betaStatus.active)) && <a href="https://beta.discordiny.com/">Enter Beta</a>}
            {!betaStatus?.isAdmin && !betaStatus?.hasAccess && <form onSubmit={e => { e.preventDefault(); void betaAction("/api/beta/redeem", { code: betaCode }); }}>
              <input aria-label="15-digit beta code" inputMode="numeric" maxLength={15} pattern="[0-9]{15}" placeholder="15-digit beta code" value={betaCode} onChange={e => setBetaCode(e.target.value.replace(/\D/g, "").slice(0, 15))} />
              <button type="submit" disabled={betaBusy || betaCode.length !== 15}>Redeem code</button>
            </form>}
            {betaMessage && <p role="status">{betaMessage}</p>}
          </div>
        </section>
      </main>
    </>
  );
}
