import AuthCallback from "./AuthCallback";

function App() {
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  return null;
}

export default App;
