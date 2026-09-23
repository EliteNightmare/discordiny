import "./Home.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";

export default function Home() {
  function startDiscordLogin() {
    window.location.href = "/profile";
  }

  return (
    <main
      className="home-page"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <TopBar />

      <section className="home-content">
        <h1>Welcome to Discordiny</h1>

        <p>
          Your adventure begins here.
        </p>

        <button
          className="start-button"
          type="button"
          onClick={startDiscordLogin}
        >
          <span className="start-button-title">
            Enter the World
          </span>
        </button>
      </section>
    </main>
  );
}
