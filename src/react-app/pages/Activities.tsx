import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import "./Activities.css";

type Activity = {
  id: string;
  name: string;
  type: string;
  destination?: string;
  weapon_source?: string;
  reward_table?: string;
  unique_material?: string;
  encounters?: readonly string[];
};

type Rotation = {
  activity: Activity | null;
  intervalSeconds: number;
  remainingSeconds: number;
};

type ActivitiesResponse = {
  authenticated: boolean;
  serverTime: number;

  player: {
    destination: string;

    explore: {
      lastClaim: number;
      elapsedSeconds: number;
      maxSeconds: number;
      percentage: number;
      capped: boolean;
    };
  };

  rotation: {
    dailyShowdown: Rotation;
    dailyDungeon: Rotation;
    dailyRaid: Rotation;

    nightfall: Rotation;
    grandmaster: Rotation;

    infiltration: Rotation;
    showdown: Rotation;
    crawl: Rotation;
  };

  current: {
    strike: Activity | null;
    dungeon: Activity | null;
    raid: Activity | null;
  };
};

type ActivityCardProps = {
  label: string;
  activity: Activity | null;
  timer?: string;
  unavailableText?: string;
  className?: string;
};

const EXPLORE_MAX_SECONDS =
  24 * 60 * 60;


/* =========================================================
   TIME HELPERS
========================================================= */

function formatRotationTime(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(seconds),
    );

  const hours =
    Math.floor(
      safeSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60,
    );

  const secs =
    safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes
      .toString()
      .padStart(2, "0")}m ${secs
      .toString()
      .padStart(2, "0")}s`;
  }

  return `${minutes}:${secs
    .toString()
    .padStart(2, "0")}`;
}


function formatExploreTime(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.min(
        EXPLORE_MAX_SECONDS,
        Math.floor(seconds),
      ),
    );

  const hours =
    Math.floor(
      safeSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60,
    );

  return `${hours}h ${minutes
    .toString()
    .padStart(2, "0")}m`;
}


/* =========================================================
   ACTIVITY CARD
========================================================= */

function ActivityCard({
  label,
  activity,
  timer,
  unavailableText = "Unavailable",
  className = "",
}: ActivityCardProps) {
  const classes = [
    "activity-dashboard-card",
    activity
      ? "activity-dashboard-card-active"
      : "activity-dashboard-card-disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={!activity}
    >
      <div className="activity-dashboard-card-top">
        <span className="activity-dashboard-label">
          {label}
        </span>

        {timer && (
          <span className="activity-dashboard-timer">
            {timer}
          </span>
        )}
      </div>

      <div className="activity-dashboard-card-content">
        <h3>
          {activity?.name ??
            unavailableText}
        </h3>

        {activity?.destination && (
          <span className="activity-dashboard-destination">
            {activity.destination}
          </span>
        )}
      </div>
    </button>
  );
}


/* =========================================================
   PAGE
========================================================= */

export default function Activities() {
  const [data, setData] =
    useState<ActivitiesResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Local clock used to animate timers.
   *
   * Global rotations still come from the server.
   * This clock only visually counts them down between
   * server refreshes.
   */
  const [clock, setClock] =
    useState(0);

  /*
   * Exploration Rewards is a player/client timer.
   * We start with the elapsed value returned by the
   * backend and increment it locally.
   */
  const [exploreElapsed, setExploreElapsed] =
    useState(0);

  const loadedAtRef =
    useRef(Date.now());

  const refreshingRef =
    useRef(false);


  /* =======================================================
     LOAD ACTIVITIES
  ======================================================= */

  const loadActivities =
    useCallback(
      async (
        showLoading = false,
      ) => {
        if (
          refreshingRef.current
        ) {
          return;
        }

        refreshingRef.current =
          true;

        if (showLoading) {
          setLoading(true);
        }

        try {
          const response =
            await fetch(
              "/api/game/activities",
              {
                credentials:
                  "include",
              },
            );

          const result =
            (await response.json()) as
              ActivitiesResponse;

          if (
            !response.ok ||
            !result.authenticated
          ) {
            throw new Error(
              "Unable to load activities.",
            );
          }

          loadedAtRef.current =
            Date.now();

          setData(result);

          setExploreElapsed(
            Math.min(
              result.player.explore
                .elapsedSeconds,
              result.player.explore
                .maxSeconds,
            ),
          );

          setClock(0);

          setError("");
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load activities.",
          );
        } finally {
          refreshingRef.current =
            false;

          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [],
    );


  useEffect(() => {
    void loadActivities(true);
  }, [loadActivities]);


  /* =======================================================
     LOCAL DISPLAY CLOCK

     This DOES NOT choose global rotations.

     It only lets the UI count down from the server-provided
     remainingSeconds values.
  ======================================================= */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          setClock(
            Math.floor(
              (
                Date.now() -
                loadedAtRef.current
              ) / 1000,
            ),
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);


  /* =======================================================
     EXPLORATION REWARDS TIMER
  ======================================================= */

  useEffect(() => {
    if (!data) {
      return;
    }

    const baseElapsed =
      data.player.explore
        .elapsedSeconds;

    const maxElapsed =
      data.player.explore
        .maxSeconds;

    setExploreElapsed(
      Math.min(
        baseElapsed + clock,
        maxElapsed,
      ),
    );
  }, [
    clock,
    data,
  ]);


  /* =======================================================
     GLOBAL ROTATION EXPIRATION

     When NF / GM / Daily reaches zero, reload the server
     state so the browser receives the NEW global activity.

     The browser never decides which activity comes next.
  ======================================================= */

  useEffect(() => {
    if (!data) {
      return;
    }

    const globalTimers = [
      data.rotation
        .dailyShowdown
        .remainingSeconds,

      data.rotation
        .dailyDungeon
        .remainingSeconds,

      data.rotation
        .dailyRaid
        .remainingSeconds,

      data.rotation
        .nightfall
        .remainingSeconds,

      data.rotation
        .grandmaster
        .remainingSeconds,
    ];

    const rotationExpired =
      globalTimers.some(
        (remaining) =>
          remaining - clock <= 0,
      );

    if (rotationExpired) {
      void loadActivities();
    }
  }, [
    clock,
    data,
    loadActivities,
  ]);


  /* =======================================================
     ROTATION TIMER
  ======================================================= */

  function rotationTimer(
    rotation: Rotation,
  ): string {
    return formatRotationTime(
      Math.max(
        0,
        rotation.remainingSeconds -
          clock,
      ),
    );
  }


  /* =======================================================
     CLAIM

     Reward execution comes next.

     For now the button exists in the correct UI but we do
     not fake rewards or reset the player's timer from the
     browser.
  ======================================================= */

  function claimExplorationRewards() {
    /*
     * The actual /claim replacement will be a server POST.
     *
     * We deliberately do not reset the timer here yet,
     * because rewards and the cooldown reset need to happen
     * atomically on the server.
     */
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="activities-screen">
        <TopBar />

        <main className="activities-page">
          <div className="activities-loading">
            Loading activities...
          </div>
        </main>
      </div>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (error && !data) {
    return (
      <div className="activities-screen">
        <TopBar />

        <main className="activities-page">
          <div className="activities-error">
            {error}
          </div>
        </main>
      </div>
    );
  }


  if (!data) {
    return null;
  }


  /* =======================================================
     EXPLORATION DISPLAY
  ======================================================= */

  const exploreMax =
    data.player.explore
      .maxSeconds ||
    EXPLORE_MAX_SECONDS;

  const explorePercentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          exploreElapsed /
          exploreMax
        ) * 100,
      ),
    );

  const exploreCapped =
    exploreElapsed >=
    exploreMax;


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="activities-screen">
      <TopBar />

      <main className="activities-page">
        <div className="activities-container">

          {/* HEADER */}

          <header className="activities-header">
            <div>
              <span className="activities-eyebrow">
                DIRECTOR
              </span>

              <h1>Activities</h1>

              <p>
                Choose an activity to
                begin.
              </p>
            </div>

            <div className="activities-current-destination">
              <span>
                Current Destination
              </span>

              <strong>
                {
                  data.player
                    .destination
                }
              </strong>
            </div>
          </header>


          {/* ===============================
              DAILY ROTATION
          =============================== */}

          <section className="activities-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  GLOBAL ROTATION
                </span>

                <h2>
                  Daily Activities
                </h2>
              </div>

              <p>
                Rotates globally every
                24 hours
              </p>
            </div>

            <div className="activities-grid activities-grid-three">
              <ActivityCard
                label="DAILY SHOWDOWN"
                activity={
                  data.rotation
                    .dailyShowdown
                    .activity
                }
                timer={rotationTimer(
                  data.rotation
                    .dailyShowdown,
                )}
                className="activity-card-daily"
              />

              <ActivityCard
                label="DAILY DUNGEON"
                activity={
                  data.rotation
                    .dailyDungeon
                    .activity
                }
                timer={rotationTimer(
                  data.rotation
                    .dailyDungeon,
                )}
                className="activity-card-daily"
              />

              <ActivityCard
                label="DAILY RAID"
                activity={
                  data.rotation
                    .dailyRaid
                    .activity
                }
                timer={rotationTimer(
                  data.rotation
                    .dailyRaid,
                )}
                className="activity-card-daily"
              />
            </div>
          </section>


          {/* ===============================
              EXPLORATION REWARDS
          =============================== */}

          <section className="exploration-rewards">
            <div className="exploration-rewards-main">
              <div className="exploration-rewards-heading">
                <span className="exploration-rewards-eyebrow">
                  EXPLORATION REWARDS
                </span>

                <h2>
                  {
                    data.player
                      .destination
                  }
                </h2>

                <p>
                  Rewards accumulate while
                  exploring your current
                  destination, up to 24
                  hours.
                </p>
              </div>

              <div className="exploration-rewards-time">
                <strong>
                  {formatExploreTime(
                    exploreElapsed,
                  )}
                </strong>

                <span>
                  / 24h
                </span>
              </div>
            </div>

            <div className="exploration-progress">
              <div
                className="exploration-progress-fill"
                style={{
                  width:
                    `${explorePercentage}%`,
                }}
              />
            </div>

            <div className="exploration-rewards-footer">
              <div className="exploration-rewards-status">
                <span>
                  {exploreCapped
                    ? "MAXIMUM REWARDS READY"
                    : "REWARDS ACCUMULATING"}
                </span>

                <strong>
                  {Math.floor(
                    explorePercentage,
                  )}
                  %
                </strong>
              </div>

              <button
                type="button"
                className="exploration-claim-button"
                onClick={
                  claimExplorationRewards
                }
              >
                CLAIM
              </button>
            </div>
          </section>


          {/* ===============================
              CORE PLAYLIST
          =============================== */}

          <section className="activities-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  PLAYLIST
                </span>

                <h2>
                  Vanguard Operations
                </h2>
              </div>
            </div>

            <div className="activities-grid activities-grid-three">
              <ActivityCard
                label="STRIKE"
                activity={
                  data.current.strike
                }
                className="activity-card-strike"
              />

              <ActivityCard
                label="NIGHTFALL"
                activity={
                  data.rotation
                    .nightfall
                    .activity
                }
                timer={rotationTimer(
                  data.rotation
                    .nightfall,
                )}
                className="activity-card-nightfall"
              />

              <ActivityCard
                label="GRANDMASTER NIGHTFALL"
                activity={
                  data.rotation
                    .grandmaster
                    .activity
                }
                timer={rotationTimer(
                  data.rotation
                    .grandmaster,
                )}
                className="activity-card-grandmaster"
              />
            </div>
          </section>


          {/* ===============================
              SPECIAL OPERATIONS
          =============================== */}

          <section className="activities-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  OPERATIONS
                </span>

                <h2>
                  Special Activities
                </h2>
              </div>
            </div>

            <div className="activities-grid activities-grid-three">
              <ActivityCard
                label="INFILTRATE"
                activity={
                  data.rotation
                    .infiltration
                    .activity
                }
                className="activity-card-infiltrate"
              />

              <ActivityCard
                label="SHOWDOWN"
                activity={
                  data.rotation
                    .showdown
                    .activity
                }
                className="activity-card-showdown"
              />

              <ActivityCard
                label="CRAWL"
                activity={
                  data.rotation
                    .crawl
                    .activity
                }
                className="activity-card-crawl"
              />
            </div>
          </section>


          {/* ===============================
              DESTINATION
          =============================== */}

          <section className="activities-section activities-destination-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  CURRENT DESTINATION
                </span>

                <h2>
                  {
                    data.player
                      .destination
                  }
                </h2>
              </div>

              <p>
                Activities available at
                your current destination
              </p>
            </div>

            <div className="activities-grid activities-grid-two">
              <ActivityCard
                label="DUNGEON"
                activity={
                  data.current.dungeon
                }
                unavailableText={
                  `No Dungeon on ${data.player.destination}`
                }
                className="activity-card-dungeon"
              />

              <ActivityCard
                label="RAID"
                activity={
                  data.current.raid
                }
                unavailableText={
                  `No Raid on ${data.player.destination}`
                }
                className="activity-card-raid"
              />
            </div>
          </section>


          {error && (
            <div className="activities-inline-error">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
