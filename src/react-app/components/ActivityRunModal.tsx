import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./ActivityRunModal.css";

type Activity = {
  id: string;
  name: string;
  type: string;
  destination?: string;
  weapon_source?: string;
  reward_table?: string;
  encounters?: readonly string[];
};

type EncounterResult = {
  index: number;
  name: string;
  cleared: boolean;
  rewards: Record<string, number>;
  partialRewards: boolean;
};

type WeaponResult = {
  rolled: boolean;
  dropped: boolean;
  name: string | null;
  rarity: string | null;
  adept: boolean;
  source?: string;
  emojiId?: string | null;
};

type RunResult = {
  power: number;
  successChance: number;
  weaponSource: string;

  encounters: EncounterResult[];
  totalEncounters: number;

  fullClear: boolean;
  wipedAt: string | null;

  xp: number;

  /*
   * Existing activities still use the singular
   * weapon result.
   *
   * Infiltration keeps this for backwards
   * compatibility while also returning weapons[].
   */
  weapon: WeaponResult;

  /*
   * Infiltration can award up to two weapons.
   */
  weapons?: WeaponResult[];

  /*
   * Optional fields used by newer activity
   * engines without breaking the existing
   * Raid/Dungeon/Vanguard response.
   */
  rewards?: Record<string, number>;
  activityId?: string;
  activityName?: string;
  activityType?: string;
  secret?: CrawlSecret;
};

type CrawlNetherEye = {
  id: number;
  x: number;
  y: number;
  rotation: number;
};

type CrawlContestPiece = {
  id: number;
  label: string;
};

type CrawlSecretChallenge =
  | {
      type: "coil";
      prompt: string;
    }
  | {
      type: "contest";
      pieces: CrawlContestPiece[];
    }
  | {
      type: "nether";
      eyeCount: number;
      eyes: CrawlNetherEye[];
    };

type CrawlSecret = {
  triggered: boolean;
  encounterIndex: number | null;
  timeoutSeconds: number;
  status: "pending" | "success" | "failed" | "expired" | null;
  challenge: CrawlSecretChallenge | null;
};

type RunResponse = {
  success?: boolean;
  error?: string;

  player?: {
    name: string;
    power: number;
    level: number;
  };

  result?: RunResult;
  pendingSecret?: boolean;
  runId?: string;
  expiresAt?: number;
  secret?: {
    success: boolean;
    expired: boolean;
  };
};

type Props = {
  activity: Activity;
  backgroundImage?: string;
  onClose: () => void;
  onFinished?: () => void;
};

type Phase =
  | "ready"
  | "loading"
  | "encounters"
  | "secret"
  | "weapon"
  | "complete"
  | "error";

const ENCOUNTER_MS = 2400;


/* -------------------------------------------------------------------------- */
/*                                ASSET IMPORTS                               */
/* -------------------------------------------------------------------------- */

const weaponImages = import.meta.glob(
  "../assets/icons/weapons/**/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const currencyImages = import.meta.glob(
  "../assets/icons/currencies/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const upgradeMaterialImages = import.meta.glob(
  "../assets/icons/upgrade-materials/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const destinationMaterialImages = import.meta.glob(
  "../assets/icons/destination-materials/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const dungeonMaterialImages = import.meta.glob(
  "../assets/icons/dungeon-materials/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const raidMaterialImages = import.meta.glob(
  "../assets/icons/raid-materials/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const materialImages = {
  ...currencyImages,
  ...upgradeMaterialImages,
  ...destinationMaterialImages,
  ...dungeonMaterialImages,
  ...raidMaterialImages,
};

const crawlImages = import.meta.glob(
  "../assets/general/crawls/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

function getCrawlImage(
  filename: string,
): string | undefined {
  return Object.entries(
    crawlImages,
  ).find(([path]) =>
    path
      .toLowerCase()
      .endsWith(
        `/crawls/${filename.toLowerCase()}`,
      ),
  )?.[1];
}

const CRAWL_REWARD_PREVIEW = [
  "Glimmer",
  "Lumia Leaves",
  "Pinnacle Cipher",
  "Armor Plating",
  "Ascendant Shard",
  "Ascendant Alloy",
];

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function normalizeAssetName(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(/\s*\(adept\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

function getMaterialImage(
  materialName: string,
): string | undefined {
  const normalizedMaterial =
    normalizeAssetName(materialName);

  return Object.entries(
    materialImages,
  ).find(([path]) => {
    const filename =
      path.split("/").pop() ?? "";

    const filenameWithoutExtension =
      filename.replace(/\.png$/i, "");

    return (
      normalizeAssetName(
        filenameWithoutExtension,
      ) === normalizedMaterial
    );
  })?.[1];
}

function number(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
  ).format(
    Math.trunc(value),
  );
}

function shuffleContestPieces(
  pieces: CrawlContestPiece[],
): CrawlContestPiece[] {
  const shuffled = [...pieces];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      shuffled[index],
      shuffled[swapIndex],
    ] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  const unchanged =
    shuffled.length > 1 &&
    shuffled.every(
      (piece, index) =>
        piece.id === pieces[index]?.id,
    );

  if (unchanged) {
    [
      shuffled[0],
      shuffled[1],
    ] = [
      shuffled[1],
      shuffled[0],
    ];
  }

  return shuffled;
}

/* -------------------------------------------------------------------------- */
/*                              REWARD PREVIEWS                               */
/* -------------------------------------------------------------------------- */

function getVanguardRewardPreview(
  type: string,
): string[] {
  if (type === "strike") {
    return [
      "Glimmer",
      "Lumia Leaves",
      "Enhancement Core",
      "Enhancement Prism",
    ];
  }

  if (type === "nightfall") {
    return [
      "Glimmer",
      "Lumia Leaves",
      "Armor Plating",
      "Enhancement Core",
      "Enhancement Prism",
    ];
  }

  if (type === "gm") {
    return [
      "Synthweave",
      "Spoils of Conquest",
      "Dungeon Materials",
      "Raid Materials",
    ];
  }

  return [];
}

function getEndgameRewardPreview(
  type: string,
): string[] {
  if (type === "raid") {
    return [
      "Glimmer",
      "Lumia Leaves",
      "Spoils of Conquest",
      "Enhancement Core",
      "Enhancement Prism",
      "Ascendant Shard",
    ];
  }

  if (type === "dungeon") {
    return [
      "Glimmer",
      "Lumia Leaves",
      "Synthweave",
      "Enhancement Core",
      "Enhancement Prism",
      "Ascendant Shard",
    ];
  }

  return [];
}

const INFILTRATION_REWARD_PREVIEW = [
  "Glimmer",
  "Lumia Leaves",
  "Pinnacle Cipher",
  "Ascendant Alloy",
];

const SHOWDOWN_REWARD_PREVIEW = [
  "Glimmer",
  "Lumia Leaves",
  "Pinnacle Cipher",
  "Enhancement Prism",
  "Ascendant Shard",
];

/* -------------------------------------------------------------------------- */
/*                              MODAL COMPONENT                               */
/* -------------------------------------------------------------------------- */

export default function ActivityRunModal({
  activity,
  backgroundImage,
  onClose,
  onFinished,
}: Props) {
  const [phase, setPhase] =
    useState<Phase>("ready");

  const [payload, setPayload] =
    useState<RunResponse | null>(
      null,
    );

  const [visible, setVisible] =
    useState(0);

  const [error, setError] =
    useState("");

  const [crawlRunId, setCrawlRunId] =
    useState<string | null>(null);

  const [crawlExpiresAt, setCrawlExpiresAt] =
    useState<number | null>(null);

  const [crawlSecondsLeft, setCrawlSecondsLeft] =
    useState(0);

  const [coilAnswer, setCoilAnswer] =
    useState("");

  const [contestDragIndex, setContestDragIndex] =
    useState<number | null>(null);

  const [contestPieces, setContestPieces] =
    useState<CrawlContestPiece[]>([]);

  const [clickedEyes, setClickedEyes] =
    useState<number[]>([]);

  const [resolvingSecret, setResolvingSecret] =
    useState(false);

  const timers =
    useRef<number[]>([]);

  const [showMaterialToast, setShowMaterialToast] = useState(false);

  const finished =
    useRef(false);

  const result =
    payload?.result;

  // Prefer the server's run-wide totals; otherwise add encounter rewards once.
  const materialTotals = result
    ? result.rewards && Object.keys(result.rewards).length > 0
      ? result.rewards
      : result.encounters.reduce<Record<string, number>>((totals, encounter) => {
          for (const [name, amount] of Object.entries(encounter.rewards ?? {})) {
            totals[name] = (totals[name] ?? 0) + amount;
          }
          return totals;
        }, {})
    : {};

  useEffect(() => {
    if (phase !== "complete" || !result) {
      setShowMaterialToast(false);
      return;
    }
    setShowMaterialToast(true);
    const timeout = window.setTimeout(() => setShowMaterialToast(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [phase, result]);

  const isVanguard =
    activity.type === "strike" ||
    activity.type === "nightfall" ||
    activity.type === "gm";

  const isInfiltration =
    activity.reward_table === "pinnacle" &&
    ["bgs", "emph", "nigh"].includes(
      activity.weapon_source
        ?.trim()
        .toLowerCase() ?? "",
    );

  const isCrawl =
    ["coil", "contest", "nether"].includes(
      activity.weapon_source
        ?.trim()
        .toLowerCase() ?? "",
    );

  const isShowdown =
  [
    "seraph",
    "elivagar",
    "lucent",
    "cos",
    "sos",
    "eow",
  ].includes(
    activity.weapon_source
      ?.trim()
      .toLowerCase() ?? "",
  );

  const vanguardRewardPreview =
    getVanguardRewardPreview(
      activity.type,
    );

  const endgameRewardPreview =
    isShowdown
      ? SHOWDOWN_REWARD_PREVIEW
      : getEndgameRewardPreview(
          activity.type,
        );

  const active =
    result?.encounters[
      Math.max(
        0,
        visible - 1,
      )
    ] ?? null;

  const busy =
    phase === "loading" ||
    phase === "encounters" ||
    phase === "secret" ||
    resolvingSecret;

  const infiltrationWeapons =
    result?.weapons ?? [];

  const crawlSource =
    activity.weapon_source
      ?.trim()
      .toLowerCase() ?? "";

  const crawlSpecialBackground =
    isCrawl
      ? getCrawlImage(
          crawlSource === "coil"
            ? "coil_special.png"
            : crawlSource === "contest"
              ? "contest_special.png"
              : "nether_special.png",
        )
      : undefined;

  const coilGoblin =
    getCrawlImage("coil_goblin.png");

  const netherEye =
    getCrawlImage("nether_eye.png");

  const contestImages = [
    getCrawlImage("contest_1.png"),
    getCrawlImage("contest_2.png"),
    getCrawlImage("contest_3.png"),
    getCrawlImage("contest_4.png"),
  ];

  /* ------------------------------------------------------------------------ */
  /*                              TIMER HANDLING                              */
  /* ------------------------------------------------------------------------ */

  function clearTimers() {
    timers.current.forEach(
      window.clearTimeout,
    );

    timers.current = [];
  }

  function finish() {
    if (finished.current) {
      return;
    }

    finished.current = true;

    onFinished?.();
  }

  useEffect(() => {
    const key = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !busy
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      key,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        key,
      );

      clearTimers();
    };
  }, [busy]);


  useEffect(() => {
    if (
      phase !== "secret" ||
      !crawlExpiresAt
    ) {
      return;
    }

    const update = () => {
      const remaining =
        Math.max(
          0,
          crawlExpiresAt -
            Math.floor(Date.now() / 1000),
        );

      setCrawlSecondsLeft(
        remaining,
      );
    };

    update();

    const interval =
      window.setInterval(
        update,
        200,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    phase,
    crawlExpiresAt,
  ]);

  /* ------------------------------------------------------------------------ */
  /*                              RESULT REVEAL                               */
  /* ------------------------------------------------------------------------ */

  function reveal(
    run: RunResult,
  ) {
    /*
     * CRAWL
     *
     * Crawl encounter RNG is already complete on the
     * server. If no secret is pending, reveal the four
     * encounters and then the final weapon roll.
     */
    if (isCrawl) {
      if (!run.encounters.length) {
        setPhase("complete");
        finish();
        return;
      }

      setVisible(1);

      run.encounters
        .slice(1)
        .forEach((_, index) => {
          timers.current.push(
            window.setTimeout(
              () =>
                setVisible(
                  index + 2,
                ),
              ENCOUNTER_MS *
                (index + 1),
            ),
          );
        });

      const duration =
        ENCOUNTER_MS *
        run.encounters.length;

      timers.current.push(
        window.setTimeout(
          () => {
            setPhase("complete");
            finish();
          },
          duration,
        ),
      );

      return;
    }

    /*
     * INFILTRATION
     *
     * Reveal all three operations one after
     * another, then resolve the weapon rolls.
     */
    if (isInfiltration) {
      if (!run.encounters.length) {
        setPhase("complete");
        finish();
        return;
      }

      setVisible(1);

      run.encounters
        .slice(1)
        .forEach(
          (_, index) => {
            timers.current.push(
              window.setTimeout(
                () => {
                  setVisible(
                    index + 2,
                  );
                },
                ENCOUNTER_MS *
                  (index + 1),
              ),
            );
          },
        );

      const operationDuration =
        ENCOUNTER_MS *
        run.encounters.length;

      timers.current.push(
        window.setTimeout(
          () => {
            // Weapon results are already resolved server-side.
            setPhase("complete");
              finish();
          },
          operationDuration,
        ),
      );

      return;
    }

    /*
     * VANGUARD
     */
    if (isVanguard) {
      setVisible(
        run.encounters.length,
      );

      timers.current.push(
        window.setTimeout(
          () => {
            if (
              run.weapon?.rolled
            ) {
              setPhase("complete");
              finish();
            } else {
              setPhase(
                "complete",
              );

              finish();
            }
          },
          ENCOUNTER_MS,
        ),
      );

      return;
    }

    /*
     * RAID / DUNGEON
     */
    if (!run.encounters.length) {
      setPhase("complete");
      finish();
      return;
    }

    setVisible(1);

    run.encounters
      .slice(1)
      .forEach(
        (_, index) => {
          timers.current.push(
            window.setTimeout(
              () => {
                setVisible(
                  index + 2,
                );
              },
              ENCOUNTER_MS *
                (index + 1),
            ),
          );
        },
      );

    timers.current.push(
      window.setTimeout(
        () => {
          if (
            run.fullClear &&
            run.weapon?.rolled
          ) {
            setPhase("complete");
              finish();
          } else {
            setPhase(
              "complete",
            );

            finish();
          }
        },
        ENCOUNTER_MS *
          run.encounters.length,
      ),
    );
  }

  /* ------------------------------------------------------------------------ */
  /*                              BEGIN ACTIVITY                              */
  /* ------------------------------------------------------------------------ */

  async function begin() {
    if (busy) {
      return;
    }

    clearTimers();

    finished.current = false;

    setError("");
    setPayload(null);
    setVisible(0);
    setCrawlRunId(null);
    setCrawlExpiresAt(null);
    setCrawlSecondsLeft(0);
    setCoilAnswer("");
    setContestDragIndex(null);
    setContestPieces([]);
    setClickedEyes([]);
    setResolvingSecret(false);
    setPhase("loading");

    try {
      const response =
        await fetch(
          "/api/game/activity/run",
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              activityId:
                activity.id,
            }),
          },
        );

      const data =
        (await response.json()) as
          RunResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.result
      ) {
        throw new Error(
          data.error ||
            "Unable to begin activity.",
        );
      }

      setPayload(data);

      if (
        isCrawl &&
        data.pendingSecret &&
        data.runId &&
        data.expiresAt &&
        data.result.secret?.challenge
      ) {
        setCrawlRunId(
          data.runId,
        );
        setCrawlExpiresAt(
          data.expiresAt,
        );
        setCrawlSecondsLeft(
          Math.max(
            0,
            data.expiresAt -
              Math.floor(Date.now() / 1000),
          ),
        );

        if (
          data.result.secret.challenge.type ===
          "contest"
        ) {
          setContestPieces(
            shuffleContestPieces(
              data.result.secret.challenge.pieces,
            ),
          );
        }

        setPhase("secret");
        return;
      }

      setPhase(
        "encounters",
      );

      reveal(
        data.result,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to begin activity.",
      );

      setPhase("error");
    }
  }


  async function resolveCrawlSecret(
    submission: string | number[],
  ) {
    if (
      !crawlRunId ||
      resolvingSecret
    ) {
      return;
    }

    setResolvingSecret(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/game/activity/crawl/resolve",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              runId: crawlRunId,
              submission,
            }),
          },
        );

      const data =
        (await response.json()) as
          RunResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.result
      ) {
        throw new Error(
          data.error ||
            "Unable to resolve Crawl secret.",
        );
      }

      clearTimers();
      setPayload(data);
      setCrawlRunId(null);
      setCrawlExpiresAt(null);
      setResolvingSecret(false);
      setPhase("encounters");
      reveal(data.result);
    } catch (err) {
      setResolvingSecret(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resolve Crawl secret.",
      );
      setPhase("error");
    }
  }

  useEffect(() => {
    if (
      phase !== "secret" ||
      crawlSecondsLeft > 0 ||
      !crawlRunId ||
      resolvingSecret
    ) {
      return;
    }

    const challenge =
      result?.secret?.challenge;

    if (!challenge) {
      return;
    }

    if (challenge.type === "coil") {
      void resolveCrawlSecret(
        coilAnswer,
      );
      return;
    }

    if (challenge.type === "contest") {
      void resolveCrawlSecret(
        contestPieces.map((piece) => piece.id),
      );
      return;
    }

    void resolveCrawlSecret(
      clickedEyes,
    );
  }, [
    phase,
    crawlSecondsLeft,
    crawlRunId,
    resolvingSecret,
  ]);

  /* ------------------------------------------------------------------------ */
  /*                                  RENDER                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      className="activity-run-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      {phase === "complete" && showMaterialToast && Object.entries(materialTotals).some(([, amount]) => amount > 0) && (
        <div className="activity-run-material-toast" role="status" aria-live="polite">
          {Object.entries(materialTotals)
            .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
            .map(([name, amount], index) => (
              <div className="activity-run-material-toast-row" key={name} style={{ animationDelay: `${index * 100}ms` }}>
                {getMaterialImage(name) && <img src={getMaterialImage(name)} alt="" aria-hidden="true" />}
                <div><strong>{name}</strong><span>+{amount.toLocaleString()} earned</span></div>
              </div>
            ))}
        </div>
      )}
      <section
        className={`activity-run-modal phase-${phase}`}
        role="dialog"
        aria-modal="true"
        aria-label={
          activity.name
        }
        style={
          phase === "secret" &&
          crawlSpecialBackground
            ? {
                backgroundImage: `
                  linear-gradient(
                    90deg,
                    rgba(3,4,8,.72),
                    rgba(3,4,8,.48)
                  ),
                  url("${crawlSpecialBackground}")
                `,
              }
            : backgroundImage
            ? {
                backgroundImage: `
                  linear-gradient(
                    90deg,
                    rgba(5,7,12,.98),
                    rgba(5,7,12,.92) 46%,
                    rgba(5,7,12,.55)
                  ),
                  url("${backgroundImage}")
                `,
              }
            : undefined
        }
      >
        <div
          className="activity-run-scan"
          aria-hidden="true"
        />

        {/* -------------------------------------------------------------- */}
        {/* HEADER                                                         */}
        {/* -------------------------------------------------------------- */}

        <header className="activity-run-header">
          <div>
            <span>
              {activity.type.toUpperCase()}

              {activity.destination
                ? ` • ${activity.destination.toUpperCase()}`
                : ""}
            </span>

            <h2>
              {activity.name}
            </h2>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* -------------------------------------------------------------- */}
        {/* READY                                                          */}
        {/* -------------------------------------------------------------- */}

        {phase === "ready" && (
          isCrawl ? (
            <div className="activity-run-vanguard-ready activity-run-crawl-ready">
              <div className="activity-run-vanguard-intro">
                <span>
                  CRAWL
                </span>

                <strong>
                  {activity.name}
                </strong>

                <p>
                  Clear four encounters. A hidden challenge
                  may interrupt the run. Complete it before
                  the timer expires to empower this encounter
                  and every encounter that follows.
                </p>
              </div>

              <div className="activity-run-vanguard-preview">
                <span>
                  ENCOUNTER REWARDS
                </span>

                <div className="activity-run-vanguard-reward-grid">
                  {CRAWL_REWARD_PREVIEW.map(
                    (name) => {
                      const icon =
                        getMaterialImage(name);

                      return (
                        <article key={name}>
                          {icon && (
                            <img
                              src={icon}
                              alt=""
                              aria-hidden="true"
                            />
                          )}

                          <small>
                            {name.toUpperCase()}
                          </small>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="activity-run-vanguard-weapon-preview">
                <span>
                  FULL CLEAR
                </span>

                <strong>
                  25,000 XP + WEAPON ROLL
                </strong>

                <small>
                  Successful secret adds a second weapon roll
                </small>
              </div>

              <button
                type="button"
                className="activity-run-ready-button"
                onClick={() =>
                  void begin()
                }
              >
                BEGIN CRAWL
              </button>
            </div>
          ) : isInfiltration ? (
            <div className="activity-run-vanguard-ready">
              <div className="activity-run-vanguard-intro">
                <span>
                  PINNACLE INFILTRATION
                </span>

                <strong>
                  {activity.name}
                </strong>

                <p>
                  Deploy across three operations:
                  Battleground, Empire Hunt and
                  Nightmare Hunt.
                </p>
              </div>

              <div className="activity-run-vanguard-preview">
                <span>
                  POSSIBLE REWARDS
                </span>

                <div className="activity-run-vanguard-reward-grid">
                  {INFILTRATION_REWARD_PREVIEW.map(
                    (name) => {
                      const icon =
                        getMaterialImage(
                          name,
                        );

                      return (
                        <article
                          key={name}
                        >
                          {icon && (
                            <img
                              src={icon}
                              alt=""
                              aria-hidden="true"
                            />
                          )}

                          <small>
                            {name.toUpperCase()}
                          </small>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="activity-run-vanguard-weapon-preview">
                <span>
                  WEAPON REWARDS
                </span>

                <strong>
                  UP TO 2 WEAPONS
                </strong>

                <small>
                  25% drop chance • 10% Adept
                </small>
              </div>

              <button
                type="button"
                className="activity-run-ready-button"
                onClick={() =>
                  void begin()
                }
              >
                BEGIN ACTIVITY
              </button>
            </div>
          ) : isVanguard ? (
            <div className="activity-run-vanguard-ready">
              <div className="activity-run-vanguard-intro">
                <span>
                  VANGUARD OPERATION
                </span>

                <strong>
                  {activity.name}
                </strong>

                <p>
                  Complete the activity to earn
                  its reward package and roll
                  for a{" "}
                  {activity.type === "strike"
                    ? "Strike"
                    : activity.type ===
                        "nightfall"
                      ? "Nightfall"
                      : "Grandmaster"}{" "}
                  weapon.
                </p>
              </div>

              <div className="activity-run-vanguard-preview">
                <span>
                  POSSIBLE REWARDS
                </span>

                <div className="activity-run-vanguard-reward-grid">
                  {vanguardRewardPreview.map(
                    (name) => {
                      const icon =
                        getMaterialImage(
                          name,
                        );

                      return (
                        <article
                          key={name}
                        >
                          {icon && (
                            <img
                              src={icon}
                              alt=""
                              aria-hidden="true"
                            />
                          )}

                          <small>
                            {name.toUpperCase()}
                          </small>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="activity-run-vanguard-weapon-preview">
                <span>
                  WEAPON REWARD
                </span>

                <strong>
                  {activity.type === "strike"
                    ? "STRIKE WEAPON"
                    : activity.type ===
                        "nightfall"
                      ? "NIGHTFALL WEAPON"
                      : "GRANDMASTER WEAPON"}
                </strong>

                <small>
                  Chance on completion
                </small>
              </div>

              <button
                type="button"
                className="activity-run-ready-button"
                onClick={() =>
                  void begin()
                }
              >
                BEGIN ACTIVITY
              </button>
            </div>
          ) : (
            <div className="activity-run-ready">
              <span>
                FIRETEAM SIMULATION
              </span>

              <strong>
                {activity.encounters
                  ?.length ?? 0}{" "}
                ENCOUNTERS
              </strong>

              <div className="activity-run-endgame-preview">
                <span>
                  POSSIBLE REWARDS
                </span>

                <div className="activity-run-endgame-reward-icons">
                  {endgameRewardPreview.map(
                    (name) => {
                      const icon =
                        getMaterialImage(
                          name,
                        );

                      return (
                        <article
                          key={name}
                        >
                          {icon && (
                            <img
                              src={icon}
                              alt=""
                              aria-hidden="true"
                            />
                          )}

                          <small>
                            {name.toUpperCase()}
                          </small>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>

              <p>
                The server decides the entire
                run when you begin. The sequence
                below only reveals those results.
              </p>

              <button
                type="button"
                className="activity-run-ready-button"
                onClick={() =>
                  void begin()
                }
              >
                BEGIN ACTIVITY
              </button>
            </div>
          )
        )}

        {/* -------------------------------------------------------------- */}
        {/* LOADING                                                        */}
        {/* -------------------------------------------------------------- */}

        {phase === "loading" && (
          <div className="activity-run-loading">
            <i aria-hidden="true" />

            <span>
              {isCrawl
                ? "ENTERING CRAWL"
                : isInfiltration
                ? "LAUNCHING INFILTRATION"
                : isVanguard
                  ? "LAUNCHING VANGUARD OPERATION"
                  : "INITIALIZING ACTIVITY"}
            </span>

            <strong>
              {isCrawl
                ? "GENERATING ENCOUNTER PATH"
                : isInfiltration
                ? "DEPLOYING ACROSS THREE OPERATIONS"
                : isVanguard
                  ? "DEPLOYING FIRETEAM"
                  : "CALCULATING FIRETEAM OUTCOME"}
            </strong>
          </div>
        )}


        {/* -------------------------------------------------------------- */}
        {/* CRAWL SECRET                                                   */}
        {/* -------------------------------------------------------------- */}

        {phase === "secret" &&
          result?.secret?.challenge && (
            <div className="activity-run-crawl-secret">
              <div className="activity-run-crawl-secret-top">
                <div>
                  <span>
                    SECRET ENCOUNTER
                  </span>

                  <strong>
                    {result.secret.challenge.type === "coil"
                      ? "GLASSMAKER SIGNAL"
                      : result.secret.challenge.type === "contest"
                        ? "KELL'S SEQUENCE"
                        : "EYES IN THE DARK"}
                  </strong>
                </div>

                <div
                  className={`activity-run-crawl-timer ${
                    crawlSecondsLeft <= 5
                      ? "danger"
                      : ""
                  }`}
                >
                  <span>TIME</span>
                  <strong>
                    {crawlSecondsLeft}
                  </strong>
                </div>
              </div>

              {result.secret.challenge.type === "coil" && (
                <div className="activity-run-coil-secret">
                  <div className="activity-run-coil-goblin">
                    {coilGoblin && (
                      <img
                        src={coilGoblin}
                        alt=""
                        aria-hidden="true"
                      />
                    )}

                    <div className="activity-run-coil-bubble">
                      {result.secret.challenge.prompt}
                    </div>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void resolveCrawlSecret(
                        coilAnswer,
                      );
                    }}
                  >
                    <label htmlFor="crawl-coil-answer">
                      REPEAT THE SIGNAL
                    </label>

                    <input
                      id="crawl-coil-answer"
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      value={coilAnswer}
                      disabled={resolvingSecret}
                      onChange={(event) =>
                        setCoilAnswer(
                          event.target.value,
                        )
                      }
                    />

                    <button
                      type="submit"
                      disabled={
                        resolvingSecret ||
                        !coilAnswer.trim()
                      }
                    >
                      SUBMIT
                    </button>
                  </form>
                </div>
              )}

              {result.secret.challenge.type === "contest" && (
                <div className="activity-run-contest-secret">
                  <p>
                    Drag the fragments into reading order: 1 2 on top, 3 4 below.
                  </p>

                  <div className="activity-run-contest-grid">
                    {contestPieces.map((piece, index) => (
                      <button
                        key={piece.id}
                        type="button"
                        className={contestDragIndex === index ? "dragging" : ""}
                        draggable={!resolvingSecret}
                        disabled={resolvingSecret}
                        aria-label={`Position ${index + 1}: fragment ${piece.label}. Drag to reorder.`}
                        onDragStart={(event) => {
                          setContestDragIndex(index);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from = Number(event.dataTransfer.getData("text/plain"));
                          if (!Number.isInteger(from) || from < 0 || from >= contestPieces.length || from === index) return;
                          setContestPieces((current) => {
                            const next = [...current];
                            const [moved] = next.splice(from, 1);
                            next.splice(index, 0, moved);
                            return next;
                          });
                          setContestDragIndex(null);
                        }}
                        onDragEnd={() => setContestDragIndex(null)}
                        onKeyDown={(event) => {
                          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                          event.preventDefault();
                          const offset = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -2 : 2;
                          const target = index + offset;
                          if (target < 0 || target >= contestPieces.length) return;
                          setContestPieces((current) => {
                            const next = [...current];
                            [next[index], next[target]] = [next[target], next[index]];
                            return next;
                          });
                        }}
                      >
                        {contestImages[piece.id - 1] && (
                          <img src={contestImages[piece.id - 1]} alt={`Fragment ${piece.id}`} draggable={false} />
                        )}
                        <span>POSITION {index + 1}</span>
                      </button>
                    ))}
                  </div>
                  <div className="activity-run-contest-actions">
                    <button type="button" className="activity-run-contest-reset" disabled={resolvingSecret} onClick={() => setContestPieces((current) => shuffleContestPieces(current))}>
                      SHUFFLE
                    </button>
                    <button type="button" className="activity-run-contest-reset" disabled={resolvingSecret || contestPieces.length !== 4} onClick={() => void resolveCrawlSecret(contestPieces.map((piece) => piece.id))}>
                      CONFIRM ORDER
                    </button>
                  </div>
                </div>
              )}

              {result.secret.challenge.type === "nether" && (
                <div className="activity-run-nether-secret">
                  <div className="activity-run-nether-counter">
                    <span>EYES REMAINING</span>
                    <strong>
                      {Math.max(
                        0,
                        result.secret.challenge.eyeCount -
                          clickedEyes.length,
                      )}
                    </strong>
                  </div>

                  <div className="activity-run-nether-field">
                    {result.secret.challenge.eyes.map(
                      (eye) => {
                        const clicked =
                          clickedEyes.includes(
                            eye.id,
                          );

                        if (clicked) {
                          return null;
                        }

                        return (
                          <button
                            key={eye.id}
                            type="button"
                            className="activity-run-nether-eye"
                            disabled={resolvingSecret}
                            aria-label="Destroy eye"
                            style={{
                              left: `${eye.x}%`,
                              top: `${eye.y}%`,
                              transform:
                                `translate(-50%, -50%) rotate(${eye.rotation}deg)`,
                            }}
                            onClick={() => {
                              const next = [
                                ...clickedEyes,
                                eye.id,
                              ];

                              setClickedEyes(
                                next,
                              );

                              if (
                                result.secret
                                  ?.challenge?.type ===
                                  "nether" &&
                                next.length ===
                                  result.secret
                                    .challenge
                                    .eyeCount
                              ) {
                                void resolveCrawlSecret(
                                  next,
                                );
                              }
                            }}
                          >
                            {netherEye && (
                              <img
                                src={netherEye}
                                alt=""
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {resolvingSecret && (
                <div className="activity-run-crawl-resolving">
                  RESOLVING SECRET...
                </div>
              )}
            </div>
          )}

        {/* -------------------------------------------------------------- */}
        {/* ERROR                                                          */}
        {/* -------------------------------------------------------------- */}

        {phase === "error" && (
          <div className="activity-run-error">
            <span>
              ACTIVITY INTERRUPTED
            </span>

            <strong>
              {error}
            </strong>

            <button
              type="button"
              onClick={() =>
                void begin()
              }
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* ACTIVE RESULT                                                  */}
        {/* -------------------------------------------------------------- */}

        {result &&
          (
            phase === "encounters" ||
                    phase === "complete"
          ) && (
            <div className="activity-run-body">

              {/* -------------------------------------------------------- */}
              {/* PLAYER STATS                                             */}
              {/* -------------------------------------------------------- */}

              <div className="activity-run-stats">
                <div>
                  <span>
                    GUARDIAN
                  </span>

                  <strong>
                    {payload?.player
                      ?.name ??
                      "Guardian"}
                  </strong>
                </div>

                {isCrawl && (
                  <>
                    <div>
                      <span>
                        ENCOUNTERS
                      </span>

                      <strong>
                        {result.totalEncounters}
                      </strong>
                    </div>

                    <div>
                      <span>
                        SECRET
                      </span>

                      <strong>
                        {result.secret?.status
                          ? result.secret.status.toUpperCase()
                          : "NONE"}
                      </strong>
                    </div>
                  </>
                )}

                {!isVanguard &&
                  !isInfiltration &&
                  !isCrawl && (
                  <>
                    <div>
                      <span>
                        POWER
                      </span>

                      <strong>
                        {number(
                          result.power,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        CLEAR CHANCE
                      </span>

                      <strong>
                        {result.successChance.toFixed(
                          1,
                        )}
                        %
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* -------------------------------------------------------- */}
              {/* RAID / DUNGEON / INFILTRATION OPERATION                 */}
              {/* -------------------------------------------------------- */}

              {phase ===
                "encounters" &&
                active &&
                !isVanguard && (
                  <div
                    className={`activity-run-encounter ${
                      active.cleared
                        ? "clear"
                        : "wipe"
                    }`}
                    key={
                      active.index
                    }
                  >
                    <div className="activity-run-progress">
                      <span>
                        {isInfiltration
                          ? "OPERATION"
                          : "ENCOUNTER"}{" "}

                        {active.index +
                          1}{" "}
                        /{" "}
                        {
                          result.totalEncounters
                        }
                      </span>

                      <div>
                        <i
                          style={{
                            width: `${
                              ((active.index +
                                1) /
                                result.totalEncounters) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <span className="activity-run-status">
                      {active.cleared
                        ? isInfiltration
                          ? "OPERATION COMPLETE"
                          : "ENCOUNTER CLEARED"
                        : "FIRETEAM WIPED"}
                    </span>

                    <h3>
                      {active.name}
                    </h3>

                    <b className="activity-run-stamp">
                      {active.cleared
                        ? "CLEAR"
                        : "WIPE"}
                    </b>

                    <div className="activity-run-rewards">
                      <span>
                        {active.partialRewards
                          ? "PARTIAL REWARDS"
                          : "REWARDS ACQUIRED"}
                      </span>

                      <div>
                        {Object.entries(
                          active.rewards,
                        ).map(
                          ([
                            name,
                            amount,
                          ]) => {
                            const icon =
                              getMaterialImage(
                                name,
                              );

                            return (
                              <article
                                key={
                                  name
                                }
                                className={
                                  icon
                                    ? "has-icon"
                                    : undefined
                                }
                              >
                                {icon && (
                                  <img
                                    className="activity-run-reward-icon"
                                    src={
                                      icon
                                    }
                                    alt=""
                                    aria-hidden="true"
                                  />
                                )}

                                <div className="activity-run-reward-copy">
                                  <small>
                                    {name.toUpperCase()}
                                  </small>

                                  <strong>
                                    +
                                    {number(
                                      amount,
                                    )}
                                  </strong>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* -------------------------------------------------------- */}
              {/* VANGUARD RESULT                                         */}
              {/* -------------------------------------------------------- */}

              {phase ===
                "encounters" &&
                isVanguard &&
                active && (
                  <div className="activity-run-vanguard-result">
                    <span>
                      ACTIVITY COMPLETE
                    </span>

                    <h3>
                      {activity.name}
                    </h3>

                    <b className="activity-run-stamp">
                      CLEAR
                    </b>

                    <div className="activity-run-rewards">
                      <span>
                        REWARDS ACQUIRED
                      </span>

                      <div>
                        {Object.entries(
                          active.rewards,
                        ).map(
                          ([
                            name,
                            amount,
                          ]) => {
                            const icon =
                              getMaterialImage(
                                name,
                              );

                            return (
                              <article
                                key={
                                  name
                                }
                                className={
                                  icon
                                    ? "has-icon"
                                    : undefined
                                }
                              >
                                {icon && (
                                  <img
                                    className="activity-run-reward-icon"
                                    src={
                                      icon
                                    }
                                    alt=""
                                    aria-hidden="true"
                                  />
                                )}

                                <div className="activity-run-reward-copy">
                                  <small>
                                    {name.toUpperCase()}
                                  </small>

                                  <strong>
                                    +
                                    {number(
                                      amount,
                                    )}
                                  </strong>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* -------------------------------------------------------- */}
              {/* COMPLETE                                                 */}
              {/* -------------------------------------------------------- */}

              {phase ===
                "complete" && (
                  <div
                    className={`activity-run-summary ${
                      result.fullClear
                        ? "clear"
                        : "wipe"
                    }`}
                  >
                    <span>
                      {result.fullClear
                        ? "ACTIVITY COMPLETE"
                        : "ACTIVITY ENDED"}
                    </span>

                    <h3>
                      {result.fullClear
                        ? isInfiltration
                          ? "INFILTRATION COMPLETE"
                          : "FULL CLEAR"
                        : "FIRETEAM WIPE"}
                    </h3>

                    {!result.fullClear &&
                      result.wipedAt && (
                        <p>
                          Wiped at{" "}

                          <strong>
                            {
                              result.wipedAt
                            }
                          </strong>
                        </p>
                      )}

                    {result.fullClear && (
                      <div className="activity-run-final">

                        {/* XP */}

                        <article>
                          <span>
                            COMPLETION XP
                          </span>

                          <strong>
                            +
                            {number(
                              result.xp,
                            )}
                          </strong>
                        </article>

                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        onClose
                      }
                    >
                      RETURN TO DIRECTOR
                    </button>
                  </div>
                )}

              {/* -------------------------------------------------------- */}
              {/* ENCOUNTER / OPERATION HISTORY                           */}
              {/* -------------------------------------------------------- */}

              {!isVanguard && (
                <div className="activity-run-history">
                  {result.encounters
                    .slice(
                      0,
                      visible,
                    )
                    .map(
                      (
                        encounter,
                      ) => (
                        <div
                          key={
                            encounter.index
                          }
                          className={
                            encounter.cleared
                              ? "clear"
                              : "wipe"
                          }
                        >
                          <span>
                            {encounter.index +
                              1}
                          </span>

                          <strong>
                            {
                              encounter.name
                            }
                          </strong>

                          <small>
                            {encounter.cleared
                              ? isInfiltration
                                ? "COMPLETE"
                                : "CLEAR"
                              : "WIPE"}
                          </small>
                        </div>
                      ),
                    )}
                </div>
              )}

              {phase === "complete" && (
                <aside className="activity-run-loot-panel" aria-label="Activity loot summary">
                  <div className="activity-run-loot-heading">
                    <span>ACTIVITY REWARDS</span>
                    <strong>LOOT ACQUIRED</strong>
                    <small>{result.fullClear ? "Activity complete" : "Activity ended"}</small>
                  </div>
                  {(
                    isInfiltration
                      ? infiltrationWeapons.filter((weapon) => weapon.dropped && weapon.name)
                      : result.weapon?.dropped && result.weapon.name
                        ? [result.weapon]
                        : []
                  ).length > 0 ? (
                    <div className="activity-run-loot-list">
                      {(isInfiltration
                        ? infiltrationWeapons.filter((weapon) => weapon.dropped && weapon.name)
                        : result.weapon?.dropped && result.weapon.name
                          ? [result.weapon]
                          : []
                      ).map((weapon, index) => (
                        <div className="activity-run-loot-item" key={`${weapon.name}-${index}`}>
                          {getWeaponImage(weapon.name) ? (
                            <img src={getWeaponImage(weapon.name)} alt="" aria-hidden="true" />
                          ) : (
                            <div className="activity-run-loot-icon-fallback" aria-hidden="true">✦</div>
                          )}
                          <div className="activity-run-loot-info">
                            <span>{weapon.adept ? "ADEPT WEAPON" : "LEGENDARY WEAPON"}</span>
                            <strong>{weapon.name}</strong>
                            <small>{weapon.source ?? result.weaponSource}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="activity-run-loot-empty">No weapon dropped this run.</p>
                  )}
                </aside>
              )}
            </div>
          )}
      </section>
    </div>
  );
}
