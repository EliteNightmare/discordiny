import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
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
  onFinished?: (loot: { weapons: WeaponResult[]; materials: Record<string, number>; xp: number }) => void;
  onEncounterLoot?: (materials: Record<string, number>) => void;
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

function scrambleContestSlider(pieces: CrawlContestPiece[]): CrawlContestPiece[] {
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.every((piece, index) => piece.id === index + 1)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}
function ContestSlidePuzzle({ pieces, onChange, images, disabled }: {
  pieces: CrawlContestPiece[];
  onChange: (next: CrawlContestPiece[]) => void;
  images: (string | undefined)[];
  disabled: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ index: number; dx: number; dy: number } | null>(null);
  function start(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (disabled) return;
    dragRef.current = { index, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ index, dx: 0, dy: 0 });
  }
  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active) return;
    setDrag({ index: active.index, dx: event.clientX - active.x, dy: event.clientY - active.y });
  }
  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = dragRef.current;
    if (!active) return;
    dragRef.current = null;
    setDrag(null);
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const x = event.clientX - board.left;
    const y = event.clientY - board.top;
    if (x < 0 || y < 0 || x >= board.width || y >= board.height) return;
    const col = Math.min(1, Math.floor(x / (board.width / 2)));
    const row = Math.min(1, Math.floor(y / (board.height / 2)));
    const target = row * 2 + col;
    if (target === active.index) return;
    const next = [...pieces];
    [next[active.index], next[target]] = [next[target], next[active.index]];
    onChange(next);
  }
  return (
    <div className="activity-run-contest-slide-board" ref={boardRef} aria-label="Reassemble the four image fragments">
      {pieces.map((piece, index) => (
        <button key={piece.id} type="button"
          className={"activity-run-contest-slide-tile" + (drag?.index === index ? " dragging" : "")}
          aria-label="Drag image fragment to another position"
          disabled={disabled}
          onPointerDown={(event) => start(event, index)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
          style={{
            transform: drag?.index === index ? "translate(" + drag.dx + "px, " + drag.dy + "px) scale(1.045)" : undefined,
            zIndex: drag?.index === index ? 2 : 1,
          }}>
          {images[piece.id - 1] && <img src={images[piece.id - 1]} alt="" draggable={false} />}
        </button>
      ))}
    </div>
  );
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
  onEncounterLoot,
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

  const [contestPieces, setContestPieces] =
    useState<CrawlContestPiece[]>([]);
  const [contestSpawned, setContestSpawned] = useState(0);
  const [contestCollected, setContestCollected] = useState<number[]>([]);
  const contestCollectedRef = useRef<Set<number>>(new Set());

  const [clickedEyes, setClickedEyes] =
    useState<number[]>([]);
  const [netherExpired, setNetherExpired] = useState(false);
  const [netherSpawned, setNetherSpawned] = useState(0);
  const netherResolvingRef = useRef(false);

  const [resolvingSecret, setResolvingSecret] =
    useState(false);

  const timers =
    useRef<number[]>([]);


  const finished =
    useRef(false);
  const completedResultRef = useRef<RunResult | null>(null);
  const lastRewardedEncounterRef = useRef(-1);
  const delayedCrawlSecret = useRef(false);
  const crawlRevealDone = useRef(false);
  const crawlPending = useRef(false);

  const result =
    payload?.result;

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

    const completed = completedResultRef.current;
    if (completed) {
      const totals = completed.rewards && Object.keys(completed.rewards).length > 0
        ? completed.rewards
        : completed.encounters.reduce<Record<string, number>>((acc, encounter) => {
            for (const [name, amount] of Object.entries(encounter.rewards ?? {})) acc[name] = (acc[name] ?? 0) + amount;
            return acc;
          }, {});
      onFinished?.({
        weapons: (completed.weapons?.length ? completed.weapons : [completed.weapon]).filter((weapon) => weapon?.dropped && Boolean(weapon.name)),
        // Encounter materials were already announced as they dropped. Do not
        // replay the run totals as a second notification at completion.
        materials: lastRewardedEncounterRef.current >= 0 ? {} : totals,
        xp: completed.xp ?? 0,
      });
    }
    onClose();
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
      (phase !== "secret" && phase !== "encounters") ||
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

  // One Contest fragment appears during each encounter.
  useEffect(() => {
    if (phase !== "encounters" || !crawlRunId || result?.secret?.challenge?.type !== "contest") return;
    const timeouts = [1, 2, 3, 4].map((count, index) =>
      window.setTimeout(() => setContestSpawned(count), index * ENCOUNTER_MS)
    );
    return () => timeouts.forEach(window.clearTimeout);
  }, [phase, crawlRunId, result?.secret?.challenge?.type]);

  // Spawn seven total eyes in waves of one or two during encounters.
  useEffect(() => {
    if (phase !== "encounters" || !crawlRunId || result?.secret?.challenge?.type !== "nether") return;
    const timeouts = [1, 3, 5, 7].map((count, index) =>
      window.setTimeout(() => setNetherSpawned(count), index * ENCOUNTER_MS)
    );
    return () => timeouts.forEach(window.clearTimeout);
  }, [phase, crawlRunId, result?.secret?.challenge?.type]);

  useEffect(() => {
    if (phase !== "encounters" || visible <= 0 || !result || !onEncounterLoot) return;
    const index = Math.min(visible - 1, result.encounters.length - 1);
    if (index <= lastRewardedEncounterRef.current || index < 0) return;
    lastRewardedEncounterRef.current = index;
    const materials = result.encounters[index]?.rewards ?? {};
    if (Object.values(materials).some((amount) => amount > 0)) onEncounterLoot(materials);
  }, [phase, visible, result, onEncounterLoot]);

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
      crawlRevealDone.current = false;
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
            crawlRevealDone.current = true;
            if (!crawlPending.current) { setPhase("complete"); finish(); }
            else if (run.secret?.challenge?.type === "contest") {
              if (contestCollectedRef.current.size === 4) setPhase("secret");
              else void resolveCrawlSecret([]); // Missing fragments: no puzzle.
            } else if (delayedCrawlSecret.current) setPhase("secret");
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
    completedResultRef.current = null;
    lastRewardedEncounterRef.current = -1;

    setError("");
    setPayload(null);
    setVisible(0);
    setCrawlRunId(null);
    setCrawlExpiresAt(null);
    setCrawlSecondsLeft(0);
    setCoilAnswer("");
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

      completedResultRef.current = data.result;
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
            scrambleContestSlider(
              [...data.result.secret.challenge.pieces],
            ),
          );
        }

        setContestSpawned(0);
        setContestCollected([]);
        contestCollectedRef.current = new Set();
        setNetherExpired(false);
        setClickedEyes([]);
        setNetherSpawned(0);
        netherResolvingRef.current = false;
        crawlPending.current = true;
        delayedCrawlSecret.current = data.result.secret.challenge.type === "coil";
        setPhase("encounters");
        reveal(data.result);
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

      // Preserve encounter animation on inline secret resolution.
      if (delayedCrawlSecret.current || crawlRevealDone.current) clearTimers();
      completedResultRef.current = data.result;
      setPayload(data);
      setCrawlRunId(null);
      setCrawlExpiresAt(null);
      setResolvingSecret(false);
      crawlPending.current = false;
      if (crawlRevealDone.current) {
        delayedCrawlSecret.current = false;
        setPhase("complete");
        finish();
      }
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
      (phase !== "secret" && phase !== "encounters") ||
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

    setNetherExpired(true);
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


        {phase === "encounters" && delayedCrawlSecret.current && result?.secret?.challenge?.type === "coil" && (
          <div className="activity-run-secret-clues" aria-label="Hidden Coil signal">
            {[0,1,2,3,4].map((i) => <span key={i} style={{position:"absolute",left:`${10+(i*19)%75}%`,top:`${19+(i*17)%65}%`,opacity:0.18,fontSize:i%2?"0.7rem":"1rem",transform:`rotate(${i*11-20}deg)`,pointerEvents:"none",letterSpacing:".25em"}}>{result.secret?.challenge?.type === "coil" ? result.secret.challenge.prompt : ""}</span>)}
          </div>
        )}

        {/* Secret objects are interactive during the activity itself. */}
        {phase === "encounters" && crawlRunId && result?.secret?.challenge?.type === "contest" && (
          <div className="activity-run-contest-clue-layer" aria-label="Contest fragments appearing during the activity">
            {result.secret.challenge.pieces.slice(0, contestSpawned).filter(piece => !contestCollected.includes(piece.id)).map((piece) => {
              const index = result.secret!.challenge!.type === "contest"
                ? result.secret!.challenge!.pieces.findIndex(item => item.id === piece.id) : 0;
              return (
                <button type="button" className="activity-run-contest-clue" key={piece.id}
                  aria-label="Collect hidden fragment"
                  onClick={() => {
                    if (contestCollectedRef.current.has(piece.id)) return;
                    contestCollectedRef.current.add(piece.id);
                    setContestCollected([...contestCollectedRef.current]);
                  }}
                  style={{
                    left: [12, 67, 24, 73][index] + "%",
                    top: [14, 27, 64, 72][index] + "%",
                    transform: "rotate(" + [-12, 9, 7, -8][index] + "deg)",
                  }}>
                  {contestImages[piece.id - 1] && <img src={contestImages[piece.id - 1]} alt="" />}
                </button>
              );
            })}
          </div>
        )}
        {phase === "encounters" && crawlRunId && result?.secret?.challenge?.type === "nether" && (
          <div className="activity-run-inline-nether" style={{position:"absolute",inset:0,zIndex:12,pointerEvents:"none"}}>
              {true && (
                <div className="activity-run-nether-secret">

                  <div className="activity-run-nether-field" style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none" }}>
                    {result.secret.challenge.eyes.slice(0, netherSpawned).map(
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
                            disabled={resolvingSecret || netherResolvingRef.current || netherExpired || crawlSecondsLeft <= 0}
                            aria-label="Destroy eye"
                            style={{
                              pointerEvents: "auto",
                              left: `${eye.x}%`,
                              top: `${eye.y}%`,
                              transform:
                                `translate(-50%, -50%) rotate(${eye.rotation}deg)`,
                            }}
                            onClick={() => {
                              if (netherResolvingRef.current || clickedEyes.includes(eye.id)) return;
                              const next = [...clickedEyes, eye.id];
                              setClickedEyes(next);
                              if (next.length >= 5) {
                                netherResolvingRef.current = true;
                                void resolveCrawlSecret(next.slice(0, 5));
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
                      Recall the hidden signal from your encounters.
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
                  <p>Reassemble the image. Drag a fragment onto another to slide them into place.</p>
                  <ContestSlidePuzzle pieces={contestPieces} onChange={setContestPieces}
                    images={contestImages} disabled={resolvingSecret} />
                  <div className="activity-run-contest-actions">
                    <button type="button" className="activity-run-contest-reset" disabled={resolvingSecret}
                      onClick={() => setContestPieces(scrambleContestSlider([...contestPieces]))}>SHUFFLE</button>
                    <button type="button" className="activity-run-contest-reset"
                      disabled={resolvingSecret || contestPieces.length !== 4}
                      onClick={() => void resolveCrawlSecret(contestPieces.map(piece => piece.id))}>CONFIRM IMAGE</button>
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

                    <p className="activity-run-reward-hint">Rewards acquired — see loot notifications →</p>
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

                    <p className="activity-run-reward-hint">Rewards acquired — see loot notifications →</p>
                  </div>
                )}

              {/* -------------------------------------------------------- */}
              {/* COMPLETE                                                 */}
              {/* -------------------------------------------------------- */}

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

            </div>
          )}
      </section>
    </div>
  );
}
