import { useEffect, useRef, useState } from "react";
import "./ActivityRunModal.css";

type Activity = {
  id: string;
  name: string;
  type: string;
  destination?: string;
  encounters?: readonly string[];
};

type EncounterResult = {
  index: number;
  name: string;
  cleared: boolean;
  rewards: Record<string, number>;
  partialRewards: boolean;
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
  weapon: {
    rolled: boolean;
    dropped: boolean;
    name: string | null;
    rarity: string | null;
    adept: boolean;
  };
};

type RunResponse = {
  success?: boolean;
  error?: string;
  player?: { name: string; power: number; level: number };
  result?: RunResult;
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
  | "weapon"
  | "complete"
  | "error";

const ENCOUNTER_MS = 2400;
const WEAPON_MS = 2200;

const weaponImages = import.meta.glob(
  "../assets/weapons/**/*.png",
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
  { eager: true, import: "default", query: "?url" },
) as Record<string, string>;

const dungeonMaterialImages = import.meta.glob(
  "../assets/icons/dungeon-materials/*.png",
  { eager: true, import: "default", query: "?url" },
) as Record<string, string>;

const raidMaterialImages = import.meta.glob(
  "../assets/icons/raid-materials/*.png",
  { eager: true, import: "default", query: "?url" },
) as Record<string, string>;

const materialImages = {
  ...currencyImages,
  ...upgradeMaterialImages,
  ...destinationMaterialImages,
  ...dungeonMaterialImages,
  ...raidMaterialImages,
};

function normalizeAssetName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s*\(adept\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getWeaponImage(
  weaponName: string | null,
): string | undefined {
  if (!weaponName) {
    return undefined;
  }

  const normalizedWeapon =
    normalizeAssetName(weaponName);

  return Object.entries(
    weaponImages,
  ).find(([path]) => {
    const filename =
      path.split("/").pop() ?? "";

    const filenameWithoutExtension =
      filename.replace(/\.png$/i, "");

    return (
      normalizeAssetName(
        filenameWithoutExtension,
      ) === normalizedWeapon
    );
  })?.[1];
}

function getMaterialImage(materialName: string): string | undefined {
  const normalizedMaterial = normalizeAssetName(materialName);

  return Object.entries(materialImages).find(([path]) => {
    const filename = path.split("/").pop() ?? "";
    const filenameWithoutExtension = filename.replace(/\.png$/i, "");
    return normalizeAssetName(filenameWithoutExtension) === normalizedMaterial;
  })?.[1];
}

function number(value: number) {
  return new Intl.NumberFormat(
    "en-US",
  ).format(Math.trunc(value));
}

type VanguardRewardPreview = {
  name: string;
  amount: string;
  note?: string;
};

function getVanguardRewardPreview(
  type: string,
): VanguardRewardPreview[] {
  if (type === "strike") {
    return [
      { name: "Glimmer", amount: "5,000 – 15,000" },
      { name: "Lumia Leaves", amount: "1" },
      { name: "Enhancement Core", amount: "10 – 25" },
      { name: "Enhancement Prism", amount: "5 – 10" },
      { name: "XP", amount: "10,000" },
    ];
  }

  if (type === "nightfall") {
    return [
      { name: "Glimmer", amount: "5,000 – 15,000" },
      { name: "Lumia Leaves", amount: "1" },
      { name: "Armor Plating", amount: "250 – 500" },
      { name: "Enhancement Core", amount: "10 – 25" },
      { name: "Enhancement Prism", amount: "5 – 10" },
      { name: "XP", amount: "10,000" },
    ];
  }

  if (type === "gm") {
    return [
      { name: "Dungeon Materials", amount: "3 RANDOM × 250", note: "Three different dungeon materials" },
      { name: "Raid Materials", amount: "3 RANDOM × 150", note: "Three different raid materials" },
      { name: "Synthweave", amount: "1,500" },
      { name: "Spoils of Conquest", amount: "1,250" },
      { name: "XP", amount: "50,000" },
    ];
  }

  return [];
}

export default function ActivityRunModal({
  activity,
  backgroundImage,
  onClose,
  onFinished,
}: Props) {
  const [phase, setPhase] =
    useState<Phase>("ready");

  const [payload, setPayload] =
    useState<RunResponse | null>(null);

  const [visible, setVisible] =
    useState(0);

  const [error, setError] =
    useState("");

  const timers =
    useRef<number[]>([]);

  const finished =
    useRef(false);

  const result =
    payload?.result;

  const isVanguard =
    activity.type === "strike" ||
    activity.type === "nightfall" ||
    activity.type === "gm";

  const vanguardRewardPreview =
    getVanguardRewardPreview(
      activity.type,
    );

  const active =
    result?.encounters[
      Math.max(0, visible - 1)
    ] ?? null;

  const busy =
    phase === "loading" ||
    phase === "encounters" ||
    phase === "weapon";

  const droppedWeaponImage =
    result?.weapon.dropped
      ? getWeaponImage(
          result.weapon.name,
        )
      : undefined;

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

  function reveal(run: RunResult) {
    if (isVanguard) {
      setVisible(run.encounters.length);

      timers.current.push(
        window.setTimeout(() => {
          if (run.weapon.rolled) {
            setPhase("weapon");

            timers.current.push(
              window.setTimeout(
                () => {
                  setPhase("complete");
                  finish();
                },
                WEAPON_MS,
              ),
            );
          } else {
            setPhase("complete");
            finish();
          }
        }, ENCOUNTER_MS),
      );

      return;
    }

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

    timers.current.push(
      window.setTimeout(() => {
        if (
          run.fullClear &&
          run.weapon.rolled
        ) {
          setPhase("weapon");

          timers.current.push(
            window.setTimeout(
              () => {
                setPhase(
                  "complete",
                );

                finish();
              },
              WEAPON_MS,
            ),
          );
        } else {
          setPhase("complete");
          finish();
        }
      }, ENCOUNTER_MS * run.encounters.length),
    );
  }

  async function begin() {
    if (busy) {
      return;
    }

    clearTimers();
    finished.current = false;
    setError("");
    setPayload(null);
    setVisible(0);
    setPhase("loading");

    try {
      const response =
        await fetch(
          "/api/game/activity/run",
          {
            method: "POST",
            credentials: "include",
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
      setPhase("encounters");
      reveal(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to begin activity.",
      );

      setPhase("error");
    }
  }

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
        aria-label={activity.name}
        style={
          backgroundImage
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

        <header className="activity-run-header">
          <div>
            <span>
              {activity.type.toUpperCase()}
              {activity.destination
                ? ` • ${activity.destination.toUpperCase()}`
                : ""}
            </span>

            <h2>{activity.name}</h2>
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

        {phase === "ready" && (
          isVanguard ? (
            <div className="activity-run-vanguard-ready">
              <div className="activity-run-vanguard-intro">
                <span>VANGUARD OPERATION</span>
                <strong>{activity.name}</strong>
                <p>
                  Complete the activity to earn its reward package
                  and roll for a {activity.type === "strike"
                    ? "Strike"
                    : activity.type === "nightfall"
                      ? "Nightfall"
                      : "Grandmaster"} weapon.
                </p>
              </div>

              <div className="activity-run-vanguard-preview">
                <span>POSSIBLE REWARDS</span>

                <div className="activity-run-vanguard-reward-grid">
                  {vanguardRewardPreview.map((reward) => {
                    const icon =
                      getMaterialImage(reward.name);

                    return (
                      <article
                        key={reward.name}
                        className={icon ? "has-icon" : undefined}
                      >
                        {icon && (
                          <img
                            src={icon}
                            alt=""
                            aria-hidden="true"
                          />
                        )}

                        <div>
                          <small>{reward.name.toUpperCase()}</small>
                          <strong>{reward.amount}</strong>
                          {reward.note && <em>{reward.note}</em>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="activity-run-vanguard-weapon-preview">
                <span>WEAPON REWARD</span>
                <strong>
                  {activity.type === "strike"
                    ? "STRIKE WEAPON"
                    : activity.type === "nightfall"
                      ? "NIGHTFALL WEAPON"
                      : "GRANDMASTER WEAPON"}
                </strong>
                <small>Chance on completion</small>
              </div>

              <button
                type="button"
                onClick={() => void begin()}
              >
                BEGIN ACTIVITY
              </button>
            </div>
          ) : (
            <div className="activity-run-ready">
              <span>FIRETEAM SIMULATION</span>

              <strong>
                {activity.encounters?.length ?? 0} ENCOUNTERS
              </strong>

              <p>
                The server decides the entire run when you begin.
                The sequence below only reveals those results.
              </p>

              <button
                type="button"
                onClick={() => void begin()}
              >
                BEGIN ACTIVITY
              </button>
            </div>
          )
        )}

        {phase === "loading" && (
          <div className="activity-run-loading">
            <i aria-hidden="true" />

            <span>
              {isVanguard
                ? "LAUNCHING VANGUARD OPERATION"
                : "INITIALIZING ACTIVITY"}
            </span>

            <strong>
              {isVanguard
                ? "DEPLOYING FIRETEAM"
                : "CALCULATING FIRETEAM OUTCOME"}
            </strong>
          </div>
        )}

        {phase === "error" && (
          <div className="activity-run-error">
            <span>
              ACTIVITY INTERRUPTED
            </span>

            <strong>{error}</strong>

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

        {result &&
          (phase === "encounters" ||
            phase === "weapon" ||
            phase === "complete") && (
            <div className="activity-run-body">
              <div className="activity-run-stats">
                <div>
                  <span>GUARDIAN</span>
                  <strong>
                    {payload?.player
                      ?.name ??
                      "Guardian"}
                  </strong>
                </div>

                {!['strike', 'nightfall', 'gm'].includes(activity.type) && (
                  <>
                    <div>
                      <span>POWER</span>
                      <strong>{number(result.power)}</strong>
                    </div>

                    <div>
                      <span>CLEAR CHANCE</span>
                      <strong>{result.successChance.toFixed(1)}%</strong>
                    </div>
                  </>
                )}
              </div>

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
                        ENCOUNTER{" "}
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
                        ? "ENCOUNTER CLEARED"
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
                          ]) => (
                            <article
                              key={name}
                              className={getMaterialImage(name) ? "has-icon" : undefined}
                            >
                              {getMaterialImage(name) && (
                                <img
                                  className="activity-run-reward-icon"
                                  src={getMaterialImage(name)}
                                  alt=""
                                  aria-hidden="true"
                                />
                              )}

                              <div className="activity-run-reward-copy">
                                <small>{name.toUpperCase()}</small>
                                <strong>+{number(amount)}</strong>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {phase === "encounters" &&
                isVanguard &&
                active && (
                  <div className="activity-run-vanguard-result">
                    <span>ACTIVITY COMPLETE</span>
                    <h3>{activity.name}</h3>
                    <b className="activity-run-stamp">CLEAR</b>

                    <div className="activity-run-rewards">
                      <span>REWARDS ACQUIRED</span>

                      <div>
                        {Object.entries(active.rewards).map(
                          ([name, amount]) => {
                            const icon =
                              getMaterialImage(name);

                            return (
                              <article
                                key={name}
                                className={icon ? "has-icon" : undefined}
                              >
                                {icon && (
                                  <img
                                    className="activity-run-reward-icon"
                                    src={icon}
                                    alt=""
                                    aria-hidden="true"
                                  />
                                )}

                                <div className="activity-run-reward-copy">
                                  <small>{name.toUpperCase()}</small>
                                  <strong>+{number(amount)}</strong>
                                </div>
                              </article>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {phase === "weapon" && (
                <div className="activity-run-weapon">
                  <span>
                    FULL CLEAR
                  </span>

                  <h3>
                    WEAPON ROLL
                  </h3>

                  <i
                    aria-hidden="true"
                  />

                  <p>
                    Resolving{" "}
                    {result.weaponSource.toUpperCase()}{" "}
                    weapon pool...
                  </p>
                </div>
              )}

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
                      ? "FULL CLEAR"
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

                      <article
                        className={
                          result.weapon
                            .dropped
                            ? "weapon-drop"
                            : ""
                        }
                      >
                        {result.weapon
                          .dropped &&
                          droppedWeaponImage && (
                            <img
                              className="activity-run-final-weapon-icon"
                              src={
                                droppedWeaponImage
                              }
                              alt=""
                              aria-hidden="true"
                            />
                          )}

                        <div className="activity-run-final-weapon-copy">
                          <span>
                            WEAPON ROLL
                          </span>

                          <strong>
                            {result.weapon
                              .dropped &&
                            result.weapon
                              .name
                              ? result
                                  .weapon
                                  .name
                              : "NO WEAPON DROP"}
                          </strong>

                          {result.weapon
                            .dropped && (
                            <small>
                              {result.weapon
                                .adept
                                ? "ADEPT"
                                : result
                                    .weapon
                                    .rarity ??
                                  "WEAPON"}
                            </small>
                          )}
                        </div>
                      </article>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                  >
                    RETURN TO DIRECTOR
                  </button>
                </div>
              )}

              {!isVanguard && (
              <div className="activity-run-history">
                {result.encounters
                  .slice(0, visible)
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
                            ? "CLEAR"
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