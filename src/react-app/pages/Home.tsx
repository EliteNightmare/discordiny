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
        <div className="home-card-stack">
          <button
            className="home-event-banner home-feature-card"
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

          <button
            className="home-entry-card home-feature-card"
            type="button"
            onClick={startDiscordLogin}
            aria-label="Enter Discordiny"
          >
            <span className="home-entry-grid" aria-hidden="true" />

            <span className="home-entry-topline">
              <span>DISCORDINY NETWORK</span>
              <span>ONLINE</span>
            </span>

            <span className="home-entry-body">
              <span className="home-entry-copy">
                <span className="home-entry-eyebrow">WELCOME</span>
                <strong>Welcome to Discordiny</strong>
                <span className="home-entry-description">
                  Your adventure begins here.
                </span>
              </span>
            </span>

            <span className="home-entry-footer">
              <span>ENTER DISCORDINY</span>
              <b aria-hidden="true">→</b>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
