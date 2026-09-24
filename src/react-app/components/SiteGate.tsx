import {
  useEffect,
  useState,
} from "react";

import {
  COUNTDOWN_TARGET,
  SITE_MODE,
} from "../config/siteMode";

import "./SiteGate.css";

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
};

function getTimeRemaining(): TimeRemaining {
  const target =
    new Date(COUNTDOWN_TARGET).getTime();

  const now =
    Date.now();

  const difference =
    target - now;

  if (
    !Number.isFinite(target) ||
    difference <= 0
  ) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      finished: true,
    };
  }

  return {
    days: Math.floor(
      difference /
        (1000 * 60 * 60 * 24),
    ),

    hours: Math.floor(
      (difference /
        (1000 * 60 * 60)) %
        24,
    ),

    minutes: Math.floor(
      (difference /
        (1000 * 60)) %
        60,
    ),

    seconds: Math.floor(
      (difference / 1000) %
        60,
    ),

    finished: false,
  };
}

function pad(value: number) {
  return String(value).padStart(
    2,
    "0",
  );
}

function MaintenancePage() {
  return (
    <main className="site-gate">
      <div className="site-gate-background" />

      <section className="site-gate-content">
        <img
          className="site-gate-logo"
          src="/discordinylogo.png"
          alt="Discordiny"
        />

        <h1 className="site-gate-title">
          Discordiny
        </h1>

        <div className="site-gate-divider" />

        <p className="site-gate-message">
          Discordiny is undergoing
          maintenance. Check back later.
        </p>
      </section>
    </main>
  );
}

function CountdownPage() {
  const [
    remaining,
    setRemaining,
  ] = useState<TimeRemaining>(
    getTimeRemaining,
  );

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setRemaining(
          getTimeRemaining(),
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="site-gate">
      <div className="site-gate-background" />

      <section className="site-gate-content">
        <img
          className="site-gate-logo"
          src="/discordinylogo.png"
          alt="Discordiny"
        />

        <h1 className="site-gate-title">
          Discordiny
        </h1>

        <div className="site-gate-divider" />

        <p className="site-gate-countdown-heading">
          {remaining.finished
            ? "The wait is over."
            : "Something is coming."}
        </p>

        <div className="site-countdown">
          <div className="site-countdown-unit">
            <span className="site-countdown-number">
              {pad(
                remaining.days,
              )}
            </span>

            <span className="site-countdown-label">
              Days
            </span>
          </div>

          <span className="site-countdown-separator">
            :
          </span>

          <div className="site-countdown-unit">
            <span className="site-countdown-number">
              {pad(
                remaining.hours,
              )}
            </span>

            <span className="site-countdown-label">
              Hours
            </span>
          </div>

          <span className="site-countdown-separator">
            :
          </span>

          <div className="site-countdown-unit">
            <span className="site-countdown-number">
              {pad(
                remaining.minutes,
              )}
            </span>

            <span className="site-countdown-label">
              Minutes
            </span>
          </div>

          <span className="site-countdown-separator">
            :
          </span>

          <div className="site-countdown-unit">
            <span className="site-countdown-number">
              {pad(
                remaining.seconds,
              )}
            </span>

            <span className="site-countdown-label">
              Seconds
            </span>
          </div>
        </div>

        <p className="site-gate-date">
          {new Date(
            COUNTDOWN_TARGET,
          ).toLocaleString(
            undefined,
            {
              dateStyle: "long",
              timeStyle: "short",
            },
          )}
        </p>
      </section>
    </main>
  );
}

export function shouldGateSite() {
  return SITE_MODE !== "live";
}

export default function SiteGate() {
  if (
    SITE_MODE === "maintenance"
  ) {
    return <MaintenancePage />;
  }

  if (
    SITE_MODE === "countdown"
  ) {
    return <CountdownPage />;
  }

  return null;
}
