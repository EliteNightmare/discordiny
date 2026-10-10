import {
  useCallback,
  useState,
} from "react";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Activities from "./pages/Activities";
import Events from "./pages/Events";
import OperationCleanse from "./pages/OperationCleanse";
import NaniteBreak from "./pages/NaniteBreak";
import Vault from "./pages/Vault";
import VaultCategory from "./pages/VaultCategory";
import WeaponVault from "./pages/WeaponVault";
import Terminal from "./pages/Terminal";
import Root from "./pages/Root";
import Articles from "./pages/Articles";
import AdminPanel from "./pages/AdminPanel";

import SiteGate, {
  shouldGateSite,
} from "./components/SiteGate";

import SivaBoot from "./components/SivaBoot";

function RootUnauthorized() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#050000",
        color: "#b97a6e",
        fontFamily:
          '"Courier New", Courier, monospace',
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "25px",
          borderBottom:
            "1px solid #2b1715",
          background: "#160d0c",
          color: "#817168",
          fontSize: "9px",
          letterSpacing: "0.04em",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "9px",
            display: "flex",
            gap: "5px",
            transform:
              "translateY(-50%)",
          }}
        >
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "#e56845",
            }}
          />
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "#d99739",
            }}
          />
          <i
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "#69925b",
            }}
          />
        </div>

        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform:
              "translate(-50%, -50%)",
            opacity: 0.85,
            whiteSpace: "nowrap",
          }}
        >
          *@3t@mainframe
        </span>
      </div>

      <section
        style={{
          minHeight:
            "calc(100dvh - 25px)",
          padding: "12vh 9vw",
          background:
            "radial-gradient(ellipse at 45% 30%, rgba(52, 0, 0, 0.18), #050000 68%)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            borderLeft:
              "2px solid #5d211d",
            paddingLeft: "20px",
          }}
        >
          <div
            style={{
              color: "#ff5548",
              fontSize: "18px",
              letterSpacing: "0.06em",
              marginBottom: "28px",
              textShadow:
                "0 0 7px #7a0c06",
            }}
          >
            ERROR // INVALID ROOT ENDPOINT
          </div>

          <div
            style={{
              color: "#d4473c",
              fontSize: "14px",
              lineHeight: 1.9,
              letterSpacing: "0.05em",
            }}
          >
            UNAUTHORIZED ACCESS DETECTED
            <br />
            REQUEST ORIGIN FLAGGED
            <br />
            ACCESS PURGED
            <br />
            ROUTE INVALIDATED
            <br />
            <br />
            <span
              style={{
                color: "#71322d",
              }}
            >
              CONNECTION TERMINATED
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const hostname =
    window.location.hostname;

  const path =
    window.location.pathname;

  /*
   * Only the homepage gets the
   * five-second SIVA boot.
   */
  const isHomepage =
    path === "/" ||
    path === "";

  const [
    homepageBootComplete,
    setHomepageBootComplete,
  ] = useState(
    !isHomepage,
  );

  const completeHomepageBoot =
    useCallback(() => {
      setHomepageBootComplete(
        true,
      );
    }, []);

  /*
   * TERMINAL SUBDOMAIN
   */
  if (
    hostname ===
    "terminal.discordiny.com"
  ) {
    return <Terminal />;
  }

  /*
   * ROOT SUBDOMAIN
   *
   * Only the designated ROOT access
   * path renders the ROOT terminal.
   * Every other ROOT path is treated
   * as an unauthorized endpoint.
   */
  if (
    hostname ===
    "root.discordiny.com"
  ) {
    if (
      path ===
      "/5dfg46df4gs4gs6"
    ) {
      return <Root />;
    }

    return <RootUnauthorized />;
  }

  /*
   * MAINTENANCE / COUNTDOWN
   *
   * This stays ABOVE the homepage boot.
   * So maintenance/countdown doesn't
   * show the SIVA animation.
   */
  if (shouldGateSite()) {
    return <SiteGate />;
  }

  /*
   * HOMEPAGE SIVA BOOT
   */
  if (
    isHomepage &&
    !homepageBootComplete
  ) {
    return (
      <SivaBoot
        onComplete={
          completeHomepageBoot
        }
      />
    );
  }

  if (path === "/updates") {
    window.location.replace("/articles");
    return null;
  }

  if (path === "/command/8b6f9e2c4a71d05f3b8c92a6e14d7f0c") {
    return <AdminPanel />;
  }

  if (path === "/articles" || path.startsWith("/articles/")) {
    return <Articles />;
  }

  if (path === "/profile") {
    return <Profile />;
  }

  if (path === "/account") {
    return <Account />;
  }

  if (path === "/activities") {
    return <Activities />;
  }

  if (path === "/events/operation-cleanse/nanite-break") {
    return <NaniteBreak />;
  }

  if (path === "/events/operation-cleanse") {
    return <OperationCleanse />;
  }

  if (path === "/events") {
    return <Events />;
  }

  if (path === "/vault") {
    return <Vault />;
  }

  const weaponVaultMatch =
    path.match(
      /^\/vault\/([^/]+)\/([^/]+)\/?$/,
    );

  if (weaponVaultMatch) {
    return (
      <WeaponVault
        categorySlug={
          weaponVaultMatch[1]
        }
        activitySlug={
          weaponVaultMatch[2]
        }
      />
    );
  }

  const vaultCategoryMatch =
    path.match(
      /^\/vault\/([^/]+)\/?$/,
    );

  if (vaultCategoryMatch) {
    return (
      <VaultCategory
        categorySlug={
          vaultCategoryMatch[1]
        }
      />
    );
  }

  return <Home />;
}

export default App;
