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
          Enter the World
        </button>
      </section>
    </main>
  );
}
