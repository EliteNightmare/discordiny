import "./Home.css";
import background from "../assets/background.jpg";
import TopBar from "../components/TopBar";

export default function Home() {
  function startDiscordLogin() {
    window.location.href = "/profile";
  }

  function openCleanseEvent() {
    window.location.href = "/events";
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
        <div className="home-intro">
          <h1>Welcome to Discordiny</h1>
          <p>Your adventure begins here.</p>
        </div>

        <button
          className="home-event-banner"
          type="button"
          onClick={openCleanseEvent}
          aria-label="View Operation: CLEANSE"
        >
          <span className="home-event-scan" aria-hidden="true" />
          <span className="home-event-grid" aria-hidden="true" />

          <span className="home-event-topline">
            <span>ACTIVE EVENT // PLAGUELANDS</span>
            <span className="home-event-live">
              <i aria-hidden="true" />
              LIVE
            </span>
          </span>

          <span className="home-event-body">
            <span className="home-event-copy">
              <span className="home-event-eyebrow">COMMUNITY OPERATION</span>
              <strong>Operation: CLEANSE</strong>
              <span className="home-event-description">
                The Plaguelands are active. Join the operation.
              </span>
            </span>

            <span className="home-event-siva" aria-hidden="true">
              <i />
              <b>SIVA</b>
            </span>
          </span>

          <span className="home-event-footer">
            <span>ENTER EVENT</span>
            <b aria-hidden="true">→</b>
          </span>
        </button>

        <div className="home-start-area">
          <span className="home-start-label">BEGIN YOUR JOURNEY</span>
          <button
            className="start-button"
            type="button"
            onClick={startDiscordLogin}
          >
            <span className="start-button-title">
              Enter the World
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
