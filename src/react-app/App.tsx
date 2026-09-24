import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Activities from "./pages/Activities";
import Vault from "./pages/Vault";
import VaultCategory from "./pages/VaultCategory";
import WeaponVault from "./pages/WeaponVault";

import SiteGate, {
  shouldGateSite,
} from "./components/SiteGate";

function App() {
  /*
   * GLOBAL SITE OVERRIDE
   *
   * If Discordiny is in maintenance
   * or countdown mode, nothing below
   * this point gets rendered.
   */
  if (shouldGateSite()) {
    return <SiteGate />;
  }

  const path = window.location.pathname;

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
