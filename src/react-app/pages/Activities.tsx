import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import ActivityRunModal from "../components/ActivityRunModal";
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
  backgroundImage?: string;
  icon?: string;
  backgroundPosition?: string;
  backgroundSize?: string;
  daily?: boolean;
  onClick?: () => void;
};

const DESTINATIONS = [
  "Cosmodrome",
  "EDZ",
  "Nessus",
  "Dreaming City",
  "Moon",
  "Europa",
  "Throne World",
  "Neomuna",
  "Pale Heart",
  "Plaguelands",
] as const;

const generalImages = import.meta.glob(
  "../assets/general/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const activityBanners = import.meta.glob(
  "../assets/activitybanners/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const strikeBanners = import.meta.glob(
  "../assets/general/strikes/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const nightfallBanners = import.meta.glob(
  "../assets/general/nightfalls/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const grandmasterBanners = import.meta.glob(
  "../assets/general/gms/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

function normalizeAssetName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findDestinationImage(
  destination: string,
): string {
  return `/destinations/${normalizeAssetName(destination)}.png`;
}

function findGeneralImage(
  filename: string,
): string | undefined {
  return Object.entries(
    generalImages,
  ).find(([path]) =>
    path.toLowerCase().endsWith(
      `/general/${filename.toLowerCase()}`,
    ),
  )?.[1];
}

function getGeneralActivityBanner(
  activity: Activity | null,
): string | undefined {
  if (!activity) {
    return undefined;
  }

  const normalizedName =
    activity.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  let filename:
    | string
    | undefined;

  // Infiltrations
  if (
    normalizedName.includes(
      "battleground",
    )
  ) {
    filename =
      "battlegrounds.png";
  } else if (
    normalizedName.includes(
      "empirehunt",
    )
  ) {
    filename =
      "empirehunt.png";
  } else if (
    normalizedName.includes(
      "nightmarehunt",
    )
  ) {
    filename =
      "nightmarehunt.png";

  // Showdowns
  } else if (
    normalizedName.includes(
      "greathunt",
    )
  ) {
    filename =
      "greathunt.png";
  } else if (
    normalizedName.includes(
      "lucentfireteam",
    )
  ) {
    filename =
      "lucentfireteam.png";
  } else if (
    normalizedName.includes(
      "exochallenge",
    )
  ) {
    filename =
      "exochallenge.png";

  // Crawls
  } else if (
    normalizedName.includes(
      "nether",
    )
  ) {
    filename =
      "nether.png";
  } else if (
    normalizedName.includes(
      "contest",
    )
  ) {
    filename =
      "contest.png";
  } else if (
    normalizedName.includes(
      "coil",
    )
  ) {
    filename =
      "coil.png";
  }

  if (!filename) {
    return undefined;
  }

  return findGeneralImage(
    filename,
  );
}

function getDailyShowdownBanner(
  activity: Activity | null,
): string | undefined {
  if (!activity?.weapon_source) {
    return undefined;
  }

  const source =
    activity.weapon_source
      .trim()
      .toLowerCase();

  if (
    source !== "cos" &&
    source !== "sos" &&
    source !== "eow"
  ) {
    return undefined;
  }

  return findGeneralImage(
    `${source}.png`,
  );
}

function findPlaylistBanner(
  banners: Record<string, string>,
  activity: Activity | null,
): string | undefined {
  if (!activity?.id) {
    return undefined;
  }

  const filename =
    `${activity.id.trim().toLowerCase()}.png`;

  return Object.entries(
    banners,
  ).find(([path]) =>
    path
      .toLowerCase()
      .endsWith(`/${filename}`),
  )?.[1];
}

function getStrikeBanner(
  activity: Activity | null,
): string | undefined {
  return findPlaylistBanner(
    strikeBanners,
    activity,
  );
}

function getNightfallBanner(
  activity: Activity | null,
): string | undefined {
  return findPlaylistBanner(
    nightfallBanners,
    activity,
  );
}

function getGrandmasterBanner(
  activity: Activity | null,
): string | undefined {
  return findPlaylistBanner(
    grandmasterBanners,
    activity,
  );
}

function getActivityBanner(
  activity: Activity | null,
): string | undefined {
  if (
    !activity?.weapon_source
  ) {
    return undefined;
  }

  const filename =
    `${activity.weapon_source.toLowerCase()}.png`;

  return Object.entries(
    activityBanners,
  ).find(([path]) =>
    path
      .toLowerCase()
      .endsWith(
        `/activitybanners/${filename}`,
      ),
  )?.[1];
}

function formatRotationTime(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(0, Math.floor(seconds));

  const hours =
    Math.floor(safeSeconds / 3600);

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
    Math.max(0, Math.floor(seconds));

  const hours =
    Math.floor(safeSeconds / 3600);

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60,
    );

  return `${hours}h ${minutes
    .toString()
    .padStart(2, "0")}m`;
}

function AnimatedClock() {
  return (
    <span
      className="activity-clock"
      aria-hidden="true"
    >
      <span className="activity-clock-center" />
      <span className="activity-clock-hour" />
      <span className="activity-clock-minute" />
    </span>
  );
}

function ActivityCard({
  label,
  activity,
  timer,
  unavailableText = "Unavailable",
  backgroundImage,
  icon,
  backgroundPosition,
  backgroundSize,
  daily = false,
  onClick,
}: ActivityCardProps) {
  const className = [
    "activity-dashboard-card",
    activity
      ? "activity-dashboard-card-active"
      : "activity-dashboard-card-disabled",
    backgroundImage
      ? "activity-dashboard-card-image"
      : "",
    daily
      ? "activity-dashboard-card-daily"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      disabled={!activity}
      onClick={activity ? onClick : undefined}
      style={
        backgroundImage
          ? {
              backgroundImage: `
                linear-gradient(
                  90deg,
                  rgba(5, 7, 12, 0.9) 0%,
                  rgba(5, 7, 12, 0.7) 54%,
                  rgba(5, 7, 12, 0.42) 100%
                ),
                url("${backgroundImage}")
              `,
              backgroundPosition:
                backgroundPosition ?? "center",
              backgroundSize:
                backgroundSize ?? "cover",
            }
          : undefined
      }
    >
      <div className="activity-dashboard-card-top">
        <span className="activity-dashboard-label">
          {icon && (
            <img
              className="activity-dashboard-label-icon"
              src={icon}
              alt=""
              aria-hidden="true"
            />
          )}

          {daily && (
            <span
              className="daily-rotation-icon"
              aria-hidden="true"
            >
              <span className="daily-rotation-core" />
            </span>
          )}

          {label}
        </span>

        {timer && (
          <span className="activity-dashboard-timer">
            <AnimatedClock />
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

export default function Activities() {
  const [data, setData] =
    useState<ActivitiesResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [clock, setClock] =
    useState(0);

  const [
    exploreElapsed,
    setExploreElapsed,
  ] = useState(0);

  const [
    travelOpen,
    setTravelOpen,
  ] = useState(false);

  const [
    traveling,
    setTraveling,
  ] = useState(false);

  const [
    selectedEndgameActivity,
    setSelectedEndgameActivity,
  ] = useState<Activity | null>(null);

  const loadedAtRef =
    useRef(Date.now());

  const refreshingRef =
    useRef(false);

  const travelRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const loadActivities =
    useCallback(
      async (
        showLoading = false,
      ) => {
        if (refreshingRef.current) {
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

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        travelRef.current &&
        !travelRef.current.contains(
          event.target as Node,
        )
      ) {
        setTravelOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setClock(
          Math.floor(
            (
              Date.now() -
              loadedAtRef.current
            ) / 1000,
          ),
        );
      }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    setExploreElapsed(
      Math.min(
        data.player.explore
          .elapsedSeconds +
          clock,
        data.player.explore
          .maxSeconds,
      ),
    );
  }, [clock, data]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const globalTimers = [
      data.rotation.dailyShowdown
        .remainingSeconds,
      data.rotation.dailyDungeon
        .remainingSeconds,
      data.rotation.dailyRaid
        .remainingSeconds,
      data.rotation.nightfall
        .remainingSeconds,
      data.rotation.grandmaster
        .remainingSeconds,
      data.rotation.infiltration
        .remainingSeconds,
      data.rotation.showdown
        .remainingSeconds,
      data.rotation.crawl
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

  async function travel(
    destination: string,
  ) {
    if (
      !data ||
      traveling ||
      destination ===
        data.player.destination
    ) {
      setTravelOpen(false);
      return;
    }

    setTraveling(true);
    setTravelOpen(false);
    setError("");

    try {
      const response =
        await fetch(
          "/api/game/travel",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              destination,
            }),
          },
        );

      const result =
        (await response.json()) as {
          success?: boolean;
          zone?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to travel.",
        );
      }

      await loadActivities();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to travel.",
      );
    } finally {
      setTraveling(false);
    }
  }

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

  function claimExplorationRewards() {
    /*
     * The Claim button is intentionally visual for now.
     * The next backend step should grant the old /claim
     * rewards and reset the exploration timestamp in one
     * server-side action.
     */
  }

  function openEndgameActivity(activity: Activity | null) {
    if (!activity) return;
    if (activity.type !== "raid" && activity.type !== "dungeon") return;
    setSelectedEndgameActivity(activity);
  }

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

  const destinationBanner =
    findDestinationImage(
      data.player.destination,
    );

  const exploreMax =
    data.player.explore
      .maxSeconds;

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

  return (
    <div className="activities-screen">
      <TopBar />

      <main className="activities-page">
        <div className="activities-container">
          <div className="activities-layout">
            <div className="activities-main">

          <header className="activities-header">
            <span className="activities-eyebrow">
              DIRECTOR
            </span>

            <h1>Activities</h1>

            <p>
              Choose an activity to begin.
            </p>
          </header>


          {/* DAILY ROTATION */}

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

              <p className="activities-heading-timer">
                <AnimatedClock />
                {rotationTimer(
                  data.rotation.dailyRaid,
                )}
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
                backgroundImage={
                  getDailyShowdownBanner(
                    data.rotation
                      .dailyShowdown
                      .activity,
                  )
                }
                daily
              />

              <ActivityCard
                label="DAILY DUNGEON"
                activity={
                  data.rotation
                    .dailyDungeon
                    .activity
                }
                backgroundImage={
                  getActivityBanner(
                    data.rotation
                      .dailyDungeon
                      .activity,
                  )
                }
                backgroundPosition="center"
                backgroundSize="85% auto"
                onClick={() => openEndgameActivity(data.rotation.dailyDungeon.activity)}
                daily
              />

              <ActivityCard
                label="DAILY RAID"
                activity={
                  data.rotation
                    .dailyRaid
                    .activity
                }
                backgroundImage={
                  getActivityBanner(
                    data.rotation
                      .dailyRaid
                      .activity,
                  )
                }
                backgroundPosition="center"
                backgroundSize="85% auto"
                onClick={() => openEndgameActivity(data.rotation.dailyRaid.activity)}
                daily
              />
            </div>
          </section>


          {/* EXPLORATION REWARDS */}

          <section
            className={[
              "exploration-rewards",
              destinationBanner
                ? "exploration-rewards-banner"
                : "",
              travelOpen
                ? "travel-menu-open"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              destinationBanner
                ? {
                    backgroundImage: `
                      linear-gradient(
                        90deg,
                        rgba(5, 8, 14, 0.92) 0%,
                        rgba(5, 8, 14, 0.7) 52%,
                        rgba(5, 8, 14, 0.48) 100%
                      ),
                      url("${destinationBanner}")
                    `,
                  }
                : undefined
            }
          >
            <div
              className="exploration-scan"
              aria-hidden="true"
            />

            <div
              className="exploration-particles"
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>

            <div className="exploration-rewards-main">
              <div className="exploration-rewards-heading">
                <span className="exploration-rewards-eyebrow">
                  EXPLORATION REWARDS
                </span>

                <div className="exploration-title-row">
                  <h2>
                    {
                      data.player
                        .destination
                    }
                  </h2>

                  <div
                    className="activity-travel"
                    ref={travelRef}
                  >
                    <button
                      type="button"
                      className="activity-travel-button"
                      disabled={traveling}
                      aria-expanded={
                        travelOpen
                      }
                      onClick={() =>
                        setTravelOpen(
                          (open) =>
                            !open,
                        )
                      }
                    >
                      {traveling
                        ? "TRAVELING..."
                        : "TRAVEL"}

                      {!traveling && (
                        <span
                          className={`activity-travel-arrow ${
                            travelOpen
                              ? "open"
                              : ""
                          }`}
                        >
                          ▼
                        </span>
                      )}
                    </button>

                    {travelOpen && (
                      <div className="activity-travel-menu">
                        {DESTINATIONS.map(
                          (
                            destination,
                          ) => {
                            const active =
                              destination ===
                              data.player
                                .destination;

                            return (
                              <button
                                key={
                                  destination
                                }
                                type="button"
                                className={[
                                  "activity-travel-option",
                                  active
                                    ? "active"
                                    : "",
                                  destination ===
                                  "Plaguelands"
                                    ? "plaguelands"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={() =>
                                  void travel(
                                    destination,
                                  )
                                }
                              >
                                <span>
                                  {
                                    destination
                                  }
                                </span>

                                {active && (
                                  <small>
                                    CURRENT
                                  </small>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p>
                  Rewards accumulate while
                  exploring your current
                  destination, up to 24
                  hours.
                </p>
              </div>

              <div className="exploration-rewards-time">
                <AnimatedClock />

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
              >
                <span />
              </div>
            </div>

            <div className="exploration-rewards-footer">
              <div className="exploration-rewards-status">
                <div>
                  <span>
                    {exploreCapped
                      ? "MAXIMUM REWARDS READY"
                      : "EXPLORING"}
                  </span>

                  {!exploreCapped && (
                    <span
                      className="exploring-dots"
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </div>

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


          {/* VANGUARD */}

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
                backgroundImage={
                  getStrikeBanner(
                    data.current.strike,
                  )
                }
                icon={
                  findGeneralImage(
                    "strike.png",
                  )
                }
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
                backgroundImage={
                  getNightfallBanner(
                    data.rotation
                      .nightfall
                      .activity,
                  )
                }
                icon={
                  findGeneralImage(
                    "nightfall.png",
                  )
                }
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
                backgroundImage={
                  getGrandmasterBanner(
                    data.rotation
                      .grandmaster
                      .activity,
                  )
                }
                icon={
                  findGeneralImage(
                    "grandmaster.png",
                  )
                }
              />
            </div>
          </section>


          {/* SPECIAL ACTIVITIES */}

          <section className="activities-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  5 MINUTE ROTATION
                </span>

                <h2>
                  Special Activities
                </h2>
              </div>

              <p className="activities-heading-timer">
                <AnimatedClock />
                {rotationTimer(
                  data.rotation.infiltration,
                )}
              </p>
            </div>

            <div className="activities-grid activities-grid-three">
              <ActivityCard
                label="INFILTRATE"
                activity={
                  data.rotation
                    .infiltration
                    .activity
                }
                backgroundImage={
                  getGeneralActivityBanner(
                    data.rotation
                      .infiltration
                      .activity,
                  )
                }
              />

              <ActivityCard
                label="SHOWDOWN"
                activity={
                  data.rotation
                    .showdown
                    .activity
                }
                backgroundImage={
                  getGeneralActivityBanner(
                    data.rotation
                      .showdown
                      .activity,
                  )
                }
              />

              <ActivityCard
                label="CRAWL"
                activity={
                  data.rotation
                    .crawl
                    .activity
                }
                backgroundImage={
                  getGeneralActivityBanner(
                    data.rotation
                      .crawl
                      .activity,
                  )
                }
              />
            </div>
          </section>


          {/* DESTINATION DUNGEON / RAID */}

          <section className="activities-section activities-destination-section">
            <div className="activities-section-heading">
              <div>
                <span>
                  DESTINATION ACTIVITIES
                </span>

                <h2>
                  {
                    data.player
                      .destination
                  }
                </h2>
              </div>
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
                backgroundImage={
                  getActivityBanner(
                    data.current.dungeon,
                  )
                }
                onClick={() => openEndgameActivity(data.current.dungeon)}
              />

              <ActivityCard
                label="RAID"
                activity={
                  data.current.raid
                }
                unavailableText={
                  `No Raid on ${data.player.destination}`
                }
                backgroundImage={
                  getActivityBanner(
                    data.current.raid,
                  )
                }
                onClick={() => openEndgameActivity(data.current.raid)}
              />
            </div>
          </section>

          {error && (
            <div className="activities-inline-error">
              {error}
            </div>
          )}
            </div>

            <aside
              className="global-activity-feed"
              aria-label="Global activity feed"
            >
              <div className="global-activity-feed-inner">
                <div className="global-activity-feed-heading">
                  <span>LIVE FEED</span>
                  <h2>Global Activity</h2>
                </div>

                <div className="global-activity-feed-empty">
                  <span
                    className="global-activity-feed-pulse"
                    aria-hidden="true"
                  />

                  <strong>
                    WAITING FOR ACTIVITY
                  </strong>

                  <p>
                    Clears, wipes and weapon
                    drops from all players
                    will appear here.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {selectedEndgameActivity && (
        <ActivityRunModal
          activity={selectedEndgameActivity}
          backgroundImage={getActivityBanner(selectedEndgameActivity)}
          onClose={() => setSelectedEndgameActivity(null)}
          onFinished={() => void loadActivities()}
        />
      )}
    </div>
  );
}
