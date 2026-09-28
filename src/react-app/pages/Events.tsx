import TopBar from "../components/TopBar";
import "./Events.css";

type EventStatus = "ACTIVE" | "UPCOMING" | "CONCLUDED";

type EventDefinition = {
  id: string;
  eyebrow: string;
  title: string;
  status: EventStatus;
  description: string;
  destination: string;
  objective: string;
  accent: "siva" | "neutral";
};

const events: EventDefinition[] = [
  {
    id: "operation-cleanse",
    eyebrow: "PLAGUELANDS // COMMUNITY OPERATION",
    title: "Operation: CLEANSE",
    status: "ACTIVE",
    description:
      "Enter the Plaguelands. Push back the SIVA infestation and contribute to the community cleanse.",
    destination: "THE PLAGUELANDS",
    objective: "COMMUNITY TARGET // 777,777",
    accent: "siva",
  },
];

function EventStatusPill({ status }: { status: EventStatus }) {
  return (
    <span className={`event-status event-status-${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}

export default function Events() {
  const featured = events.find((event) => event.status === "ACTIVE") ?? events[0];

  return (
    <div className="events-screen">
      <TopBar />

      <main className="events-page">
        <div className="events-shell">
          <header className="events-header">
            <div>
              <span className="events-kicker">LIVE OPERATIONS</span>
              <h1>Events</h1>
              <p>
                Limited operations, community objectives, and evolving
                activities across Discordiny.
              </p>
            </div>

            <div className="events-header-mark" aria-hidden="true">
              <span>EVENT</span>
              <strong>01</strong>
            </div>
          </header>

          {featured ? (
            <section
              className={`event-feature event-feature-${featured.accent}`}
              aria-labelledby="featured-event-title"
            >
              <div className="event-feature-noise" aria-hidden="true" />
              <div className="event-feature-grid" aria-hidden="true" />
              <div className="event-feature-scan" aria-hidden="true" />

              <div className="event-feature-topline">
                <span>{featured.eyebrow}</span>
                <EventStatusPill status={featured.status} />
              </div>

              <div className="event-feature-body">
                <div className="event-feature-copy">
                  <span className="event-overline">CURRENT EVENT</span>
                  <h2 id="featured-event-title">{featured.title}</h2>
                  <p>{featured.description}</p>

                  <div className="event-feature-meta">
                    <div>
                      <span>LOCATION</span>
                      <strong>{featured.destination}</strong>
                    </div>
                    <div>
                      <span>OBJECTIVE</span>
                      <strong>{featured.objective}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="event-enter-button"
                    onClick={() =>
                      window.location.assign(`/events/${featured.id}`)
                    }
                  >
                    <span>ENTER EVENT</span>
                    <b aria-hidden="true">→</b>
                  </button>
                </div>

                <div className="event-feature-art" aria-hidden="true">
                  <div className="event-siva-orbit event-siva-orbit-a" />
                  <div className="event-siva-orbit event-siva-orbit-b" />
                  <div className="event-siva-diamond">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="event-siva-label">
                    <small>CONTAMINATION VECTOR</small>
                    <strong>SIVA</strong>
                    <em>ACTIVE</em>
                  </div>
                </div>
              </div>

              <div className="event-feature-footer">
                <span>COMMUNITY OPERATION</span>
                <span>///</span>
                <span>PLAGUELANDS NETWORK</span>
                <span>///</span>
                <span>LIVE</span>
              </div>
            </section>
          ) : null}

          <section className="events-index">
            <div className="events-section-heading">
              <div>
                <span>EVENT DIRECTORY</span>
                <h2>Operations</h2>
              </div>
              <p>{events.length.toString().padStart(2, "0")} REGISTERED</p>
            </div>

            <div className="events-card-grid">
              {events.map((event, index) => (
                <button
                  type="button"
                  className={`event-card event-card-${event.accent}`}
                  key={event.id}
                  onClick={() => window.location.assign(`/events/${event.id}`)}
                >
                  <div className="event-card-index">
                    {(index + 1).toString().padStart(2, "0")}
                  </div>

                  <div className="event-card-content">
                    <EventStatusPill status={event.status} />
                    <span className="event-card-eyebrow">{event.eyebrow}</span>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                  </div>

                  <div className="event-card-arrow" aria-hidden="true">
                    ↗
                  </div>
                </button>
              ))}

              <div className="event-card event-card-placeholder" aria-hidden="true">
                <div className="event-card-index">--</div>
                <div className="event-card-content">
                  <span className="event-card-eyebrow">RESERVED EVENT SLOT</span>
                  <h3>Future Operation</h3>
                  <p>
                    Additional events can be registered here without changing
                    the Events hub layout.
                  </p>
                </div>
                <div className="event-placeholder-bars">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </section>

          <footer className="events-footer">
            <span>DISCORDINY EVENT NETWORK</span>
            <span>ACTIVE CHANNEL // 01</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
