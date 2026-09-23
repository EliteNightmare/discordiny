import Home from "./pages/Home";
import Profile from "./pages/Profile";

function App() {
  const path = window.location.pathname;

  if (path === "/profile") {
    return <Profile />;
  }

  return <Home />;
}

export default App;
