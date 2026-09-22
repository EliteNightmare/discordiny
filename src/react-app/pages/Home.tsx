import "./Home.css";

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-content">
        <h1>Welcome to Discordiny</h1>

        <p>
          Your adventure begins here.
        </p>

        <button
          className="start-button"
          type="button"
          onClick={() => {
            window.location.href = "/api/auth/login";
          }}
        >
          <span className="start-button-title">
            Enter the World
          </span>
        </button>
      </section>
    </main>
  );
}
