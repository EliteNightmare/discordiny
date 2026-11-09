import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import ActivityRunModal from "../components/ActivityRunModal";
import ActivityLootOverlay, { type ActivityLootPayload, type LevelProgress } from "../components/ActivityLootOverlay";
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
  canSetExplorationTimer?: boolean;

  player: {
    destination: string;

    explore: {
      lastClaim: number;
      elapsedSeconds: number;
      maxSeconds: number;
      percentage: number;
      capped: boolean;
    };

    vanguard: {
      strike: {
        cooldownSeconds: number;
        remainingSeconds: number;
        readyAt: number;
      };

      nightfall: {
        cooldownSeconds: number;
        remainingSeconds: number;
        readyAt: number;
      };

      gm: {
        cooldownSeconds: number;
        remainingSeconds: number;
        readyAt: number;
        minLevel: number;
      };
    };

    infiltration: {
      cooldownSeconds: number;
      remainingSeconds: number;
      readyAt: number;
    };

    showdown: {
      cooldownSeconds: number;
      remainingSeconds: number;
      readyAt: number;

      daily: {
        maxCharges: number;
        usedCharges: number;
        remainingCharges: number;
      };
    };

    crawl: {
      cooldownSeconds: number;
      remainingSeconds: number;
      readyAt: number;
    };

    endgame: {
      dungeon: {
        cooldownSeconds: number;
        remainingSeconds: number;
        readyAt: number;
      };

      raid: {
        cooldownSeconds: number;
        remainingSeconds: number;
        readyAt: number;
      };

      dailyDungeon: {
        maxCharges: number;
        usedCharges: number;
        remainingCharges: number;
      };

      dailyRaid: {
        maxCharges: number;
        usedCharges: number;
        remainingCharges: number;
      };
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

type GlobalActivityFeedEvent = {
  id: number;
  player: string;
  avatarUrl?: string;
  activity: string;
  activityType: string;
  result: "CLEAR" | "WIPE" | string;

  weapon: {
    name: string;
    adept: boolean;
  } | null;

  createdAt: string;
};

type GlobalActivityFeedResponse = {
  authenticated: boolean;
  events: GlobalActivityFeedEvent[];
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
  disabled?: boolean;
  status?: string;

  charges?: {
    remaining: number;
    max: number;
  };

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

const weaponImages = import.meta.glob(
  "../assets/icons/weapons/**/*.png",
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

function normalizeAssetName(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findDestinationImage(
  destination: string,
): string {
  return `/destinations/${normalizeAssetName(
    destination,
  )}.png`;
}

function findGeneralImage(
  filename: string,
): string | undefined {
  return Object.entries(
    generalImages,
  ).find(([path]) =>
    path
      .toLowerCase()
      .endsWith(
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
    `${activity.id
      .trim()
      .toLowerCase()}.png`;

  return Object.entries(
    banners,
  ).find(([path]) =>
    path
      .toLowerCase()
      .endsWith(
        `/${filename}`,
      ),
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
    `${activity.weapon_source
      .toLowerCase()}.png`;

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

function getWeaponImage(
  weaponName: string | null,
): string | undefined {
  if (!weaponName) return undefined;

  // Do not use normalizeAssetName here: it removes "(Adept)" and
  // would cause Normal and Adept filenames to compare as identical.
  const normalizeWeaponFilename = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const requested = normalizeWeaponFilename(weaponName.trim());
  const normal = normalizeWeaponFilename(
    weaponName.replace(/\s*\(Adept\)\s*$/i, "").trim(),
  );
  const entries = Object.entries(weaponImages);

  const findExact = (name: string) =>
    entries.find(([path]) => {
      const filename = (path.split("/").pop() ?? "").replace(/\.png$/i, "");
      return normalizeWeaponFilename(filename) === name;
    })?.[1];

  // Exact variant first; only fall back for a missing Adept asset.
  return findExact(requested) ?? (requested !== normal ? findExact(normal) : undefined);
}

function formatCooldownTime(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.ceil(seconds),
    );

  return `0:${safeSeconds
    .toString()
    .padStart(2, "0")}`;
}

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
      (safeSeconds % 3600) /
        60,
    );

  const secs =
    safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes
      .toString()
      .padStart(
        2,
        "0",
      )}m ${secs
      .toString()
      .padStart(
        2,
        "0",
      )}s`;
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
      Math.floor(seconds),
    );

  const hours =
    Math.floor(
      safeSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) /
        60,
    );

  return `${hours}h ${minutes
    .toString()
    .padStart(2, "0")}m`;
}

function formatFeedTime(
  createdAt: string,
  now: number,
): string {
  const parsed =
    Date.parse(
      createdAt.includes("T")
        ? createdAt
        : `${createdAt.replace(
            " ",
            "T",
          )}Z`,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return "";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (now - parsed) /
          1000,
      ),
    );

  if (seconds < 60) {
    return "JUST NOW";
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  if (minutes < 60) {
    return `${minutes}M AGO`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (hours < 24) {
    return `${hours}H AGO`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (days < 7) {
    return `${days}D AGO`;
  }

  return new Date(parsed)
    .toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
      },
    )
    .toUpperCase();
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
  unavailableText =
    "Unavailable",
  backgroundImage,
  icon,
  backgroundPosition,
  backgroundSize,
  daily = false,
  disabled = false,
  status,
  charges,
  onClick,
}: ActivityCardProps) {
  const className = [
    "activity-dashboard-card",

    activity &&
    !disabled
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
      className={
        className
      }
      disabled={
        !activity ||
        disabled
      }
      onClick={
        activity &&
        !disabled
          ? onClick
          : undefined
      }
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
                backgroundPosition ??
                "center",

              backgroundSize:
                backgroundSize ??
                "cover",
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
            {
              activity.destination
            }
          </span>
        )}

        {charges && (
          <div className="activity-dashboard-charges">
            <span
              className="activity-charge-pips"
              aria-hidden="true"
            >
              {Array.from(
                {
                  length:
                    charges.max,
                },
                (
                  _,
                  index,
                ) => (
                  <i
                    key={
                      index
                    }
                    className={
                      index <
                      charges.remaining
                        ? "filled"
                        : ""
                    }
                  />
                ),
              )}
            </span>

            <strong>
              {
                charges.remaining
              }{" "}
              /{" "}
              {
                charges.max
              }{" "}
              CHARGES
            </strong>
          </div>
        )}

        {status && (
          <span className="activity-dashboard-status">
            {status}
          </span>
        )}
      </div>
    </button>
  );
}

/** Raid/dungeon runs use a lightweight top HUD rather than the encounter modal. */
function EndgameProgressBar({ activity, onFinished, onClose }: {
  activity: Activity;
  onFinished: (loot: ActivityLootPayload | null) => void;
  onClose: () => void;
}) {
  const duration = activity.type === "raid" ? 180 : 90;
  const [remaining, setRemaining] = useState(duration);
  const [status, setStatus] = useState("PREPARING ACTIVITY");
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    const run = async () => {
      try {
        const startResponse = await fetch("/api/game/activity/run", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: activity.id, phase: "start" }),
        });
        const start = await startResponse.json() as { success?: boolean; error?: string; durationSeconds?: number; remainingSeconds?: number };
        if (!startResponse.ok || !start.success) throw new Error(start.error ?? "Unable to start activity");
        if (cancelled) return;
        const seconds = start.remainingSeconds ?? start.durationSeconds ?? duration;
        // The server uses integer seconds. Add a small grace period so a
        // browser clock cannot attempt to finish before the Worker permits it.
        const finishAt = Date.now() + (seconds + 1.25) * 1000;
        setRemaining(seconds);
        setStatus("ACTIVITY IN PROGRESS");
        await new Promise<void>(resolve => {
          interval = window.setInterval(() => {
            if (cancelled) { window.clearInterval(interval); resolve(); return; }
            const left = Math.max(0, Math.ceil((finishAt - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0) { window.clearInterval(interval); resolve(); }
          }, 200);
        });
        if (cancelled) return;
        setStatus("RESOLVING REWARDS");
        let data: {
          success?: boolean; error?: string; remainingSeconds?: number;
          result?: { fullClear: boolean; rewards?: Record<string, number>; xp: number;
            weapon?: { dropped: boolean; name: string | null; rarity: string | null; adept: boolean } };
        } = {};
        // A 409 is a timing signal, not a failed run. Wait out the server's
        // remaining time and retry without restarting the activity.
        for (let attempt = 0; attempt < 8; attempt++) {
          const response = await fetch("/api/game/activity/run", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityId: activity.id, phase: "finish" }),
          });
          data = await response.json();
          if (cancelled) return;
          if (response.status === 409 && data.remainingSeconds !== undefined) {
            const waitSeconds = Math.max(1, data.remainingSeconds + 1);
            setRemaining(Math.ceil(waitSeconds));
            setStatus("FINALIZING ACTIVITY");
            await new Promise(resolve => window.setTimeout(resolve, waitSeconds * 1000));
            if (cancelled) return;
            continue;
          }
          if (!response.ok || !data.success || !data.result) {
            throw new Error(data.error ?? "Activity failed");
          }
          break;
        }
        if (!data.success || !data.result) throw new Error("Could not finalize activity. Please retry.");
        if (cancelled) return;
        const result = data.result;
        if (!result.fullClear) {
          setStatus("ACTIVITY FAILED — NO CLEAR REWARDS");
          await new Promise(resolve => window.setTimeout(resolve, 2200));
          if (cancelled) return;
        }
        onFinished(result.fullClear ? {
          weapons: result.weapon?.dropped && result.weapon.name ? [result.weapon] : [],
          materials: result.rewards ?? {}, xp: result.xp ?? 0,
        } : null);
      } catch (error) {
        if (!cancelled) setFailure(error instanceof Error ? error.message : "Activity failed");
      }
    };
    void run();
    return () => { cancelled = true; if (interval !== undefined) window.clearInterval(interval); };
  }, [activity.id]);
  const percentage = Math.max(0, Math.min(100, (1 - remaining / duration) * 100));
  const activityBanner = getActivityBanner(activity) ?? getGeneralActivityBanner(activity);
  return (
    <div className="endgame-progress-hud" role="status" aria-live="polite" style={activityBanner ? { backgroundImage: `linear-gradient(90deg, rgba(12, 13, 18, .92), rgba(12, 13, 18, .70)), url("${activityBanner}")` } : undefined}>
      <div className="endgame-progress-header">
        <div><span>{activity.type.toUpperCase()} // {status}</span><strong>{activity.name}</strong></div>
        <button type="button" onClick={onClose} aria-label="Dismiss activity progress">×</button>
      </div>
      {failure ? <p className="endgame-progress-error">{failure}</p> : <>
        <div className="endgame-progress-track"><div style={{ width: `${percentage}%` }} /></div>
        <small>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} REMAINING</small>
      </>}
    </div>
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
    claimingExploration,
    setClaimingExploration,
  ] = useState(false);


  const [settingExploreTimer, setSettingExploreTimer] = useState(false);
  const [encounterDrops, setEncounterDrops] = useState<Array<{ id: number; loot: ActivityLootPayload }>>([]);
  const [lootDrop, setLootDrop] = useState<{ id: number; loot: ActivityLootPayload; before: LevelProgress | null } | null>(null);
  const beforeLevelRef = useRef<LevelProgress | null>(null);
  const lootDropCounter = useRef(0);

  const [
    selectedEndgameActivity,
    setSelectedEndgameActivity,
  ] = useState<Activity | null>(
    null,
  );

  const [timedActivities, setTimedActivities] = useState<Activity[]>([]);
  const [timedDropdownOpen, setTimedDropdownOpen] = useState(true);

  function startTimedActivity(activity: Activity) {
    setTimedActivities(current => current.some(item => item.id === activity.id)
      ? current : [...current, activity]);
    setTimedDropdownOpen(true);
    void fetch("/api/game/profile", { credentials: "include" })
      .then(response => response.ok ? response.json() : null)
      .then(profile => { if (profile?.level) beforeLevelRef.current = profile.level as LevelProgress; })
      .catch(() => {});
  }

  useEffect(() => {
    if (!selectedEndgameActivity) return;
    let cancelled = false;
    beforeLevelRef.current = null;
    void fetch("/api/game/profile", { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data?.level) beforeLevelRef.current = data.level as LevelProgress; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedEndgameActivity]);

  const [
    globalActivityEvents,
    setGlobalActivityEvents,
  ] = useState<
    GlobalActivityFeedEvent[]
  >([]);

  const [
    globalFeedLoading,
    setGlobalFeedLoading,
  ] = useState(true);

  const [
    feedClock,
    setFeedClock,
  ] = useState(
    Date.now(),
  );

  const [
    isMobileFeed,
    setIsMobileFeed,
  ] = useState(
    () =>
      typeof window !==
        "undefined" &&
      window.matchMedia(
        "(max-width: 650px)",
      ).matches,
  );

  const feedRefreshingRef =
    useRef(false);

  const activitiesMainRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const globalFeedRef =
    useRef<HTMLElement | null>(
      null,
    );

  const loadedAtRef =
    useRef(
      Date.now(),
    );

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

          setData(
            result,
          );

          setExploreElapsed(
            Math.min(
              result.player
                .explore
                .elapsedSeconds,

              result.player
                .explore
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

  const loadGlobalActivityFeed =
    useCallback(
      async () => {
        if (
          feedRefreshingRef.current
        ) {
          return;
        }

        feedRefreshingRef.current =
          true;

        try {
          const response =
            await fetch(
              "/api/game/activity/feed",
              {
                credentials:
                  "include",
              },
            );

          const result =
            (await response.json()) as
              GlobalActivityFeedResponse;

          if (
            !response.ok ||
            !result.authenticated
          ) {
            return;
          }

          setGlobalActivityEvents(
            Array.isArray(
              result.events,
            )
              ? result.events
              : [],
          );
        } catch {
          /*
           * The feed is supplemental UI, so a temporary
           * refresh failure should not replace the Director
           * page with an error state.
           */
        } finally {
          feedRefreshingRef.current =
            false;

          setGlobalFeedLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadActivities(
      true,
    );
  }, [loadActivities]);

  useEffect(() => {
    void loadGlobalActivityFeed();

    const refreshInterval =
      window.setInterval(
        () => {
          void loadGlobalActivityFeed();
        },
        15000,
      );

    const clockInterval =
      window.setInterval(
        () => {
          setFeedClock(
            Date.now(),
          );
        },
        30000,
      );

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      window.clearInterval(
        clockInterval,
      );
    };
  }, [
    loadGlobalActivityFeed,
  ]);

  useEffect(() => {
    const main =
      activitiesMainRef.current;

    const feed =
      globalFeedRef.current;

    if (
      !main ||
      !feed
    ) {
      return;
    }

    const syncFeedHeight =
      () => {
        const height =
          Math.max(
            0,
            Math.floor(
              main
                .getBoundingClientRect()
                .height,
            ),
          );

        feed.style.setProperty(
          "--global-feed-max-height",
          `${height}px`,
        );
      };

    syncFeedHeight();

    const observer =
      new ResizeObserver(
        syncFeedHeight,
      );

    observer.observe(
      main,
    );

    window.addEventListener(
      "resize",
      syncFeedHeight,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        syncFeedHeight,
      );
    };
  }, [data]);

  useEffect(() => {
    const media =
      window.matchMedia(
        "(max-width: 650px)",
      );

    const updateMobileFeed =
      () => {
        setIsMobileFeed(
          media.matches,
        );
      };

    updateMobileFeed();

    media.addEventListener(
      "change",
      updateMobileFeed,
    );

    return () => {
      media.removeEventListener(
        "change",
        updateMobileFeed,
      );
    };
  }, []);

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
        setTravelOpen(
          false,
        );
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
      window.setInterval(
        () => {
          setClock(
            Math.floor(
              (
                Date.now() -
                loadedAtRef.current
              ) /
                1000,
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

  useEffect(() => {
    if (!data) {
      return;
    }

    setExploreElapsed(
      Math.min(
        data.player
          .explore
          .elapsedSeconds +
          clock,

        data.player
          .explore
          .maxSeconds,
      ),
    );
  }, [
    clock,
    data,
  ]);

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

      data.rotation
        .infiltration
        .remainingSeconds,

      data.rotation
        .showdown
        .remainingSeconds,

      data.rotation
        .crawl
        .remainingSeconds,
    ];

    const rotationExpired =
      globalTimers.some(
        (
          remaining,
        ) =>
          remaining -
            clock <=
          0,
      );

    if (
      rotationExpired
    ) {
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
        data.player
          .destination
    ) {
      setTravelOpen(
        false,
      );

      return;
    }

    setTraveling(
      true,
    );

    setTravelOpen(
      false,
    );

    setError("");

    try {
      const response =
        await fetch(
          "/api/game/travel",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
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
      setTraveling(
        false,
      );
    }
  }

  function rotationTimer(
    rotation: Rotation,
  ): string {
    return formatRotationTime(
      Math.max(
        0,

        rotation
          .remainingSeconds -
          clock,
      ),
    );
  }

  async function claimExplorationRewards() {
    if (
      claimingExploration ||
      exploreElapsed < 25
    ) {
      return;
    }

    setClaimingExploration(true);
    let explorationBefore: LevelProgress | null = null;
    try {
      const profileResponse = await fetch("/api/game/profile", { credentials: "include" });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        explorationBefore = profileData?.level ?? null;
      }
    } catch { /* XP popup still works without a starting level snapshot. */ }
    setError("");

    try {
      const response = await fetch(
        "/api/game/explore/claim",
        {
          method: "POST",
          credentials: "include",
        },
      );

      const result =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          destination?: string;
          elapsedSeconds?: number;
          xp?: number;
          rewards?: Record<string, number>;
          weapon?: {
            dropped: boolean;
            name: string | null;
          };
          weapons?: Array<{ name: string; rarity: string | null; adept: boolean }>;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Failed to claim exploration rewards.",
        );
      }

      const weapons = result.weapons ?? (result.weapon?.dropped && result.weapon.name
        ? [{ name: result.weapon.name, rarity: null, adept: /\(Adept\)$/i.test(result.weapon.name) }]
        : []);
      setLootDrop({
        id: ++lootDropCounter.current,
        before: explorationBefore,
        loot: {
          weapons: weapons.map((weapon) => ({
            dropped: true,
            name: weapon.name,
            rarity: weapon.rarity,
            adept: weapon.adept,
          })),
          materials: result.rewards ?? {},
          xp: result.xp ?? 0,
        },
      });

      await loadActivities();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to claim exploration rewards.",
      );
    } finally {
      setClaimingExploration(false);
    }
  }

  function openEndgameActivity(
    activity: Activity | null,
  ) {
    if (!activity) {
      return;
    }

    if (
      ![
        "raid",
        "dungeon",
        "strike",
        "nightfall",
        "gm",
      ].includes(
        activity.type,
      )
    ) {
      return;
    }

    if (activity.type === "raid" || activity.type === "dungeon") {
      startTimedActivity(activity);
      return;
    }
    setSelectedEndgameActivity(activity);
  }

  function openInfiltrationActivity(
    activity: Activity | null,
  ) {
    if (!activity) {
      return;
    }

    setSelectedEndgameActivity(
      activity,
    );
  }

  function openShowdownActivity(
    activity: Activity | null,
  ) {
    if (!activity) {
      return;
    }

    const source =
      activity.weapon_source
        ?.trim()
        .toLowerCase();

    const validShowdownSource =
      source === "seraph" ||
      source === "elivagar" ||
      source === "lucent" ||
      source === "cos" ||
      source === "sos" ||
      source === "eow";

    if (
      !validShowdownSource
    ) {
      return;
    }

    setSelectedEndgameActivity(
      activity,
    );
  }

  function openCrawlActivity(
    activity: Activity | null,
  ) {
    if (!activity) {
      return;
    }

    const source =
      activity.weapon_source
        ?.trim()
        .toLowerCase();

    if (
      source !== "coil" &&
      source !== "contest" &&
      source !== "nether"
    ) {
      return;
    }

    setSelectedEndgameActivity(
      activity,
    );
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

  if (
    error &&
    !data
  ) {
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
      data.player
        .destination,
    );

  const exploreMax =
    data.player
      .explore
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

  const dungeonCooldownRemaining =
    Math.max(
      0,

      data.player
        .endgame
        .dungeon
        .remainingSeconds -
        clock,
    );

  const raidCooldownRemaining =
    Math.max(
      0,

      data.player
        .endgame
        .raid
        .remainingSeconds -
        clock,
    );

  const dailyDungeonCharges =
    data.player
      .endgame
      .dailyDungeon;

  const dailyRaidCharges =
    data.player
      .endgame
      .dailyRaid;

  const dailyShowdownCharges =
    data.player
      .showdown
      .daily;

  const strikeCooldownRemaining =
    Math.max(
      0,

      data.player
        .vanguard
        .strike
        .remainingSeconds -
        clock,
    );

  const nightfallCooldownRemaining =
    Math.max(
      0,

      data.player
        .vanguard
        .nightfall
        .remainingSeconds -
        clock,
    );

  const gmCooldownRemaining =
    Math.max(
      0,

      data.player
        .vanguard
        .gm
        .remainingSeconds -
        clock,
    );

  const infiltrationCooldownRemaining =
    Math.max(
      0,

      data.player
        .infiltration
        .remainingSeconds -
        clock,
    );

  const showdownCooldownRemaining =
    Math.max(
      0,

      data.player
        .showdown
        .remainingSeconds -
        clock,
    );

  const crawlCooldownRemaining =
    Math.max(
      0,

      data.player
        .crawl
        .remainingSeconds -
        clock,
    );

  const weaponDropEvents = globalActivityEvents.filter(
    (event) => Boolean(event.weapon?.name?.trim()),
  );

  const visibleGlobalActivityEvents =
    isMobileFeed
      ? weaponDropEvents.slice(0, 5)
      : weaponDropEvents;

  return (
    <div className="activities-screen">
      <TopBar />

      <main className="activities-page">
        <div className="activities-container">
          <div className="activities-layout">
            <div
              className="activities-main"
              ref={
                activitiesMainRef
              }
            >
              <header className="activities-header">
                <span className="activities-eyebrow">
                  ACTIVITIES
                </span>

                <h1>
                  Director
                </h1>

                <p>
                  Click an activity to engage.
                </p>
              </header>


              {/* DAILY ROTATION */}

              <section className="activities-section activities-daily-section">
                <div className="activities-section-heading">
                  <div>
                    <span>
                      DAILY ROTATION
                    </span>

                    <div className="activities-heading-title-row">
                      <h2>
                      Daily Activities
                      </h2>
                      <p className="activities-heading-timer">
                        <AnimatedClock />

                        {rotationTimer(
                      data.rotation
                        .dailyRaid,
                    )}
                      </p>
                    </div>
                  </div>
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
                    charges={{
                      remaining:
                        dailyShowdownCharges
                          .remainingCharges,

                      max:
                        dailyShowdownCharges
                          .maxCharges,
                    }}
                    disabled={
                      dailyShowdownCharges
                        .remainingCharges <=
                      0
                    }
                    status={
                      dailyShowdownCharges
                        .remainingCharges <=
                      0
                        ? "DAILY LIMIT REACHED"
                        : undefined
                    }
                    onClick={() =>
                      openShowdownActivity(
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
                    charges={{
                      remaining:
                        dailyDungeonCharges
                          .remainingCharges,

                      max:
                        dailyDungeonCharges
                          .maxCharges,
                    }}
                    disabled={
                      dailyDungeonCharges
                        .remainingCharges <=
                      0
                    }
                    status={
                      dailyDungeonCharges
                        .remainingCharges <=
                      0
                        ? "DAILY LIMIT REACHED"
                        : undefined
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.rotation
                          .dailyDungeon
                          .activity,
                      )
                    }
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
                    charges={{
                      remaining:
                        dailyRaidCharges
                          .remainingCharges,

                      max:
                        dailyRaidCharges
                          .maxCharges,
                    }}
                    disabled={
                      dailyRaidCharges
                        .remainingCharges <=
                      0
                    }
                    status={
                      dailyRaidCharges
                        .remainingCharges <=
                      0
                        ? "DAILY LIMIT REACHED"
                        : undefined
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.rotation
                          .dailyRaid
                          .activity,
                      )
                    }
                    daily
                  />
                </div>
              </section>


              {/* EXPLORATION REWARDS + FISHING */}

              <div className="exploration-activity-row">
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
                  .filter(
                    Boolean,
                  )
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
                      EXPLORATION
                      REWARDS
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
                        ref={
                          travelRef
                        }
                      >
                        <button
                          type="button"
                          className="activity-travel-button"
                          disabled={
                            traveling
                          }
                          aria-expanded={
                            travelOpen
                          }
                          onClick={() =>
                            setTravelOpen(
                              (
                                open,
                              ) =>
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
                                  data
                                    .player
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
                                      .filter(
                                        Boolean,
                                      )
                                      .join(
                                        " ",
                                      )}
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
                      Rewards accumulate
                      while exploring your
                      current destination,
                      up to 24 hours.
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

                  <div className="exploration-claim-actions">
                  <button
                    type="button"
                    className="exploration-claim-button"
                    disabled={
                      claimingExploration ||
                      exploreElapsed < 25
                    }
                    onClick={() =>
                      void claimExplorationRewards()
                    }
                  >
                    {claimingExploration
                      ? "CLAIMING..."
                      : "CLAIM"}
                  </button>
                  {data?.canSetExplorationTimer && (
                    <button
                      type="button"
                      className="exploration-claim-button exploration-timer-admin-button"
                      disabled={claimingExploration || settingExploreTimer}
                      onClick={async () => {
                        setSettingExploreTimer(true);
                        setError("");
                        try {
                          const response = await fetch("/api/game/explore/set-max-timer", {
                            method: "POST",
                            credentials: "include",
                          });
                          const result = await response.json() as { success?: boolean; error?: string };
                          if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to set exploration timer.");
                          setExploreElapsed(86400);
                          await loadActivities();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Unable to set exploration timer.");
                        } finally {
                          setSettingExploreTimer(false);
                        }
                      }}
                    >
                      {settingExploreTimer ? "SETTING..." : "SET 24H"}
                    </button>
                  )}
                  </div>
                </div>

                </section>

                <button
                  type="button"
                  className="fishing-activity-card"
                  style={{
                    backgroundImage: `
                      linear-gradient(
                        180deg,
                        rgba(4, 8, 14, 0.18) 0%,
                        rgba(4, 8, 14, 0.48) 58%,
                        rgba(4, 8, 14, 0.9) 100%
                      ),
                      url("${findGeneralImage("fishbg.png") ?? ""}")
                    `,
                  }}
                  aria-label="Fishing activity"
                >
                  <span className="fishing-bubbles" aria-hidden="true">
                    {Array.from({ length: 14 }, (_, index) => (
                      <i key={index} />
                    ))}
                  </span>
                  <div className="fishing-activity-card-content">
                    <span className="fishing-activity-eyebrow">
                      PLAY CATCH
                    </span>

                    <strong>
                      FISHING
                    </strong>

                    <small>
                      Cast your line
                    </small>
                  </div>

                  <span className="fishing-activity-status">
                    READY
                  </span>
                </button>
              </div>

              {/* VANGUARD */}

              <section className="activities-section">
                <div className="activities-section-heading">
                  <div>
                    <span>
                      PLAYLIST
                    </span>

                    <div className="activities-heading-title-row">
                      <h2>Vanguard Operations</h2>
                      <div className="activities-vanguard-rotations" aria-label="Nightfall and Grandmaster rotation countdowns">
                        <p className="activities-heading-timer">
                          <strong className="activities-rotation-label">NF</strong>
                          <AnimatedClock />
                          {rotationTimer(data.rotation.nightfall)}
                        </p>
                        <span className="activities-rotation-separator" aria-hidden="true" />
                        <p className="activities-heading-timer">
                          <strong className="activities-rotation-label">GM</strong>
                          <AnimatedClock />
                          {rotationTimer(data.rotation.grandmaster)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="activities-grid activities-grid-three">
                  <ActivityCard
                    label="STRIKE"
                    activity={
                      data.current
                        .strike
                    }
                    backgroundImage={
                      getStrikeBanner(
                        data.current
                          .strike,
                      )
                    }
                    icon={
                      findGeneralImage(
                        "strike.png",
                      )
                    }
                    disabled={
                      strikeCooldownRemaining >
                      0
                    }
                    status={
                      strikeCooldownRemaining >
                      0
                        ? `◷ ${formatRotationTime(
                            strikeCooldownRemaining,
                          )}`
                        : "READY"
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.current
                          .strike,
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
                    disabled={
                      nightfallCooldownRemaining >
                      0
                    }
                    status={
                      nightfallCooldownRemaining >
                      0
                        ? `◷ ${formatRotationTime(
                            nightfallCooldownRemaining,
                          )}`
                        : "READY"
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.rotation
                          .nightfall
                          .activity,
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
                    disabled={
                      gmCooldownRemaining >
                      0
                    }
                    status={
                      gmCooldownRemaining >
                      0
                        ? `◷ ${formatRotationTime(
                            gmCooldownRemaining,
                          )}`
                        : `READY · LVL ${
                            data.player
                              .vanguard
                              .gm
                              .minLevel
                          }+`
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.rotation
                          .grandmaster
                          .activity,
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
                      PLAYLIST
                    </span>

                    <div className="activities-heading-title-row">
                      <h2>
                      Pinnacle Operations
                      </h2>
                      <p className="activities-heading-timer">
                        <AnimatedClock />

                        {rotationTimer(
                      data.rotation
                        .infiltration,
                    )}
                      </p>
                    </div>
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
                    backgroundImage={
                      getGeneralActivityBanner(
                        data.rotation
                          .infiltration
                          .activity,
                      )
                    }
                    disabled={
                      infiltrationCooldownRemaining >
                      0
                    }
                    status={
                      infiltrationCooldownRemaining >
                      0
                        ? `COOLDOWN ${formatCooldownTime(
                            infiltrationCooldownRemaining,
                          )}`
                        : "READY"
                    }
                    onClick={() =>
                      openInfiltrationActivity(
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
                    disabled={
                      showdownCooldownRemaining >
                      0
                    }
                    status={
                      showdownCooldownRemaining >
                      0
                        ? `COOLDOWN ${formatCooldownTime(
                            showdownCooldownRemaining,
                          )}`
                        : "READY"
                    }
                    onClick={() =>
                      openShowdownActivity(
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
                    disabled={
                      crawlCooldownRemaining >
                      0
                    }
                    status={
                      crawlCooldownRemaining >
                      0
                        ? `COOLDOWN ${formatCooldownTime(
                            crawlCooldownRemaining,
                          )}`
                        : "READY"
                    }
                    onClick={() =>
                      openCrawlActivity(
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
                      ENDGAME ACTIVITIES
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
                      data.current
                        .dungeon
                    }
                    unavailableText={
                      `No Dungeon on ${data.player.destination}`
                    }
                    backgroundImage={
                      getActivityBanner(
                        data.current
                          .dungeon,
                      )
                    }
                    disabled={
                      dungeonCooldownRemaining >
                      0
                    }
                    status={
                      dungeonCooldownRemaining >
                      0
                        ? `COOLDOWN ${formatCooldownTime(
                            dungeonCooldownRemaining,
                          )}`
                        : data.current
                              .dungeon
                          ? "READY"
                          : undefined
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.current
                          .dungeon,
                      )
                    }
                  />

                  <ActivityCard
                    label="RAID"
                    activity={
                      data.current
                        .raid
                    }
                    unavailableText={
                      `No Raid on ${data.player.destination}`
                    }
                    backgroundImage={
                      getActivityBanner(
                        data.current
                          .raid,
                      )
                    }
                    disabled={
                      raidCooldownRemaining >
                      0
                    }
                    status={
                      raidCooldownRemaining >
                      0
                        ? `COOLDOWN ${formatCooldownTime(
                            raidCooldownRemaining,
                          )}`
                        : data.current
                              .raid
                          ? "READY"
                          : undefined
                    }
                    onClick={() =>
                      openEndgameActivity(
                        data.current
                          .raid,
                      )
                    }
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
              ref={
                globalFeedRef
              }
              className="global-activity-feed"
              aria-label="Global weapon drops"
            >
              <div className="global-activity-feed-inner">
                <div className="global-activity-feed-heading">
                  <span>
                    WEAPON DROP FEED
                  </span>

                  <h2>
                    Global Weapon Drops
                  </h2>
                </div>

                {visibleGlobalActivityEvents
                  .length >
                0 ? (
                  <div className="global-activity-feed-events">
                    {visibleGlobalActivityEvents.map(
                      (
                        event,
                      ) => (
                        <article
                          className="global-activity-event"
                          key={
                            event.id
                          }
                        >
                          <div className="global-activity-event-top">
                            <div className="global-activity-event-player-row">
                              {event.avatarUrl && (
                                <img
                                  className="global-activity-event-avatar"
                                  src={
                                    event.avatarUrl
                                  }
                                  alt=""
                                  aria-hidden="true"
                                />
                              )}

                              <strong className="global-activity-event-player">
                                {
                                  event.player
                                }
                              </strong>
                            </div>

                            <span className="global-activity-event-time">
                              {formatFeedTime(
                                event.createdAt,
                                feedClock,
                              )}
                            </span>
                          </div>

                          <span className="global-activity-event-activity">
                            {
                              event.activity
                            }
                          </span>

                          <span
                            className={[
                              "global-activity-event-result",

                              event.result
                                .toLowerCase(),
                            ].join(
                              " ",
                            )}
                          >
                            {
                              event.result
                            }
                          </span>

                          {event.weapon && (
                            <div className={`global-activity-event-weapon${event.weapon.adept ? " global-activity-event-weapon-adept" : ""}`}>
                              {getWeaponImage(
                                event.weapon
                                  .name,
                              ) && (
                                <img
                                  className="global-activity-event-weapon-icon"
                                  src={
                                    getWeaponImage(
                                      event.weapon
                                        .name,
                                    )
                                  }
                                  alt=""
                                  aria-hidden="true"
                                />
                              )}

                              <div>
                                <span>
                                  WEAPON DROP
                                </span>

                                <strong>
                                  {
                                    event.weapon
                                      .name
                                  }

                                  {event.weapon
                                    .adept &&
                                  !event.weapon
                                    .name
                                    .toLowerCase()
                                    .includes(
                                      "(adept)",
                                    )
                                    ? " (Adept)"
                                    : ""}
                                </strong>
                              </div>
                            </div>
                          )}
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="global-activity-feed-empty">
                    <span
                      className="global-activity-feed-pulse"
                      aria-hidden="true"
                    />

                    <strong>
                      {globalFeedLoading
                        ? "CONNECTING TO FEED"
                        : "WAITING FOR WEAPON DROPS"}
                    </strong>

                    <p>
                      Weapon drops from all
                      players will appear
                      here.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {encounterDrops.map(drop => (
        <ActivityLootOverlay
          key={`encounter-${drop.id}`}
          loot={drop.loot}
          before={null}
          durationMs={2400}
          onDone={() => setEncounterDrops(current => current.filter(item => item.id !== drop.id))}
        />
      ))}

      {lootDrop && (
        <ActivityLootOverlay
          key={lootDrop.id}
          loot={lootDrop.loot}
          before={lootDrop.before}
          onDone={() => setLootDrop(null)}
        />
      )}

      {timedActivities.length > 0 && (
        <section className="timed-activity-dropdown" aria-label="Timed activities in progress">
          <button type="button" className="timed-activity-dropdown-toggle"
            aria-expanded={timedDropdownOpen}
            onClick={() => setTimedDropdownOpen(open => !open)}>
            <span>TIMED ACTIVITIES <strong>({timedActivities.length})</strong></span>
            <span aria-hidden="true">{timedDropdownOpen ? "▴" : "▾"}</span>
          </button>
          <div className={timedDropdownOpen ? "timed-activity-dropdown-content" : "timed-activity-dropdown-content is-collapsed"}>
            {timedActivities.map(activity => (
              <EndgameProgressBar
                key={activity.id}
                activity={activity}
                onClose={() => setTimedActivities(current => current.filter(item => item.id !== activity.id))}
                onFinished={(loot) => {
                  setTimedActivities(current => current.filter(item => item.id !== activity.id));
                  if (loot) setLootDrop({ id: ++lootDropCounter.current, loot, before: beforeLevelRef.current });
                  void loadActivities();
                  void loadGlobalActivityFeed();
                }}
              />
            ))}
          </div>
        </section>
      )}
      {selectedEndgameActivity && !["raid", "dungeon"].includes(selectedEndgameActivity.type) && (
        <ActivityRunModal
          activity={
            selectedEndgameActivity
          }
          backgroundImage={
            selectedEndgameActivity
              .weapon_source ===
              "cos" ||
            selectedEndgameActivity
              .weapon_source ===
              "sos" ||
            selectedEndgameActivity
              .weapon_source ===
              "eow"
              ? getDailyShowdownBanner(
                  selectedEndgameActivity,
                )
              : ["coil", "contest", "nether"].includes(
                    selectedEndgameActivity
                      .weapon_source
                      ?.trim()
                      .toLowerCase() ?? "",
                  )
                ? getGeneralActivityBanner(
                    selectedEndgameActivity,
                  )
              : selectedEndgameActivity
                    .reward_table ===
                  "pinnacle"
                ? getGeneralActivityBanner(
                    selectedEndgameActivity,
                  )
                : getActivityBanner(
                    selectedEndgameActivity,
                  )
          }
          onClose={() =>
            setSelectedEndgameActivity(
              null,
            )
          }
          onEncounterLoot={(materials) => {
            const id = ++lootDropCounter.current;
            setEncounterDrops(current => [...current, { id, loot: { weapons: [], materials, xp: 0 } }]);
          }}
          onFinished={(loot) => {
            setLootDrop({ id: ++lootDropCounter.current, loot, before: beforeLevelRef.current });
            void loadActivities();
            void loadGlobalActivityFeed();
          }}
        />
      )}
    </div>
  );
}
