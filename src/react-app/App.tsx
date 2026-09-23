import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Account from "./pages/Account";

function App() {
  const path = window.location.pathname;

  if (path === "/profile") {
    return <Profile />;
  }

  if (path === "/account") {
    return <Account />;
  }

  return <Home />;
}

export default App;
