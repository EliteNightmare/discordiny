import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Activities from "./pages/Activities";
import Vault from "./pages/Vault";
import VaultCategory from "./pages/VaultCategory";

function App() {
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

  const vaultCategoryMatch =
    path.match(/^\/vault\/([^/]+)\/?$/);
  
  if (vaultCategoryMatch) {
    return (
      <VaultCategory
        categorySlug={vaultCategoryMatch[1]}
      />
    );
  }

  return <Home />;
}

export default App;
