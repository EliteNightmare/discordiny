import "./Home.css";

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-content">
        <h1>Welcome to Discordiny</h1>

        <p>
          Your adventure begins here.
        </p>

        <button className="start-button" type="button">
          <span className="start-button-title">
            Enter the World
          </span>
        
          <span className="start-button-subtitle">
            Login with Discord
          </span>
        </button>
      </section>
    </main>
  );
}
