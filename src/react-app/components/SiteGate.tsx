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
    /*
     * If the countdown has already
     * finished by the time this page
     * mounts, immediately reload.
     */
    const initial =
      getTimeRemaining();

    if (initial.finished) {
      window.location.reload();
      return;
    }

    /*
     * Update the countdown every second.
     *
     * Once the target time is reached,
     * reload the page. App.tsx will then
     * call shouldGateSite() again.
     *
     * Because the countdown target has
     * passed, shouldGateSite() returns
     * false and normal Discordiny loads.
     */
    const timer =
      window.setInterval(() => {
        const next =
          getTimeRemaining();

        setRemaining(next);

        if (next.finished) {
          window.clearInterval(timer);

          window.location.reload();
        }
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
      </section>
    </main>
  );
}

/*
 * Determines whether App.tsx should
 * replace Discordiny with SiteGate.
 */
export function shouldGateSite() {
  /*
   * Normal site.
   */
  if (SITE_MODE === "live") {
    return false;
  }

  /*
   * Maintenance remains active until
   * SITE_MODE is manually changed.
   */
  if (
    SITE_MODE ===
    "maintenance"
  ) {
    return true;
  }

  /*
   * Countdown only blocks Discordiny
   * while the target is still in the
   * future.
   *
   * Once the target passes, the site
   * automatically becomes accessible.
   */
  if (
    SITE_MODE ===
    "countdown"
  ) {
    const target =
      new Date(
        COUNTDOWN_TARGET,
      ).getTime();

    /*
     * Invalid target:
     * keep the site gated rather than
     * accidentally opening Discordiny.
     */
    if (
      !Number.isFinite(target)
    ) {
      return true;
    }

    return Date.now() < target;
  }

  /*
   * Safety fallback.
   */
  return false;
}

export default function SiteGate() {
  if (
    SITE_MODE ===
    "maintenance"
  ) {
    return <MaintenancePage />;
  }

  if (
    SITE_MODE ===
    "countdown"
  ) {
    return <CountdownPage />;
  }

  return null;
}
