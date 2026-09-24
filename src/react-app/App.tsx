import {
  useCallback,
  useState,
} from "react";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Activities from "./pages/Activities";
import Vault from "./pages/Vault";
import VaultCategory from "./pages/VaultCategory";
import WeaponVault from "./pages/WeaponVault";
import Terminal from "./pages/Terminal";

import SiteGate, {
  shouldGateSite,
} from "./components/SiteGate";

import SivaBoot from "./components/SivaBoot";

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

  if (path === "/profile") {
    return <Profile />;
  }

  if (path === "/account") {
    return <Account />;
  }

  if (path === "/activities") {
    return <Activities />;
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
      /^\/vault\/([^/]+)\/?$/
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
