import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Activities from "./pages/Activities";
import Vault from "./pages/Vault";

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

  return <Home />;
}

export default App;
