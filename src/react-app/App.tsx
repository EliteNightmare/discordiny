import "./App.css";

import TopBar from "./components/TopBar";
import Home from "./pages/Home";

import background from "./assets/discordinybackground.jpg";

function App() {
  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <TopBar />

      <Home />
    </div>
  );
}

export default App;
