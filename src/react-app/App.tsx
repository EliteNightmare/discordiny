import { useState } from "react";
import Home from "./Home";
import AuthCallback from "./AuthCallback";

function App() {
  const [count, setCount] = useState(0);

  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  return <Home />;
}

export default App;
