import {
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TopBar from "../components/TopBar";
import mapImage from "../assets/siva/opnb/map.png";
import "./NaniteBreak.css";

type EncounterKind = "normal" | "hidden";

type EncounterName =
  | "dresiks"
  | "monster"
  | "nanitecrew"
  | "perfectedsquad"
  | "rahndel"
  | "servitors"
  | "shankswarm"
  | "stealthswarm"
  | "walker"
  | "clear"
  | "cyclone"
  | "defense"
  | "infiltrate";

type WorldNode = {
  id: string;
  x: number;
  y: number;
  kind: EncounterKind;
  encounter: EncounterName;
  image: string;
};

type PlayerSignal = {
  userId: number;
  username: string;
  globalName: string | null;
  x: number;
  y: number;
  updatedAt: string;
};

type WorldResponse = {
  success: boolean;
  error?: string;
  self?: PlayerSignal;
  players?: PlayerSignal[];
  nodes?: WorldNode[];
};

type EncounterProof = {
  type: string;
  data?: Record<string, unknown>;
};

type ClearResponse = {
  success: boolean;
  error?: string;
  rewards?: Record<string, number>;
  xp?: number;
  weapon?: {
    dropped: boolean;
    name: string | null;
    rarity: string | null;
  };
  cleanseProgress?: number;
  cleanseTarget?: number;
};

type MiniProps = {
  onWin: (proof?: EncounterProof) => void;
};

type Point = {
  x: number;
  y: number;
};

const encounterAssets = import.meta.glob(
  "../assets/siva/opnb/*.png",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

const imageByName = Object.fromEntries(
  Object.entries(encounterAssets).map(([path, url]) => [
    path.split("/").pop()?.toLowerCase() ?? path,
    url,
  ]),
) as Record<string, string>;

/*
 * Temporary normalized Plaguelands boundary.
 *
 * User ID 1 gets an in-game boundary tracing
 * panel later in this file. That lets the real
 * gold perimeter be traced directly over the
 * map and exported as normalized coordinates.
 *
 * Once traced, the exported polygon should
 * replace this polygon AND the matching Worker
 * polygon so client and server use the exact
 * same hard boundary.
 */
const MAP_POLYGON: Array<[number, number]> = [
  [83.716, 53.837],
  [77.586, 46.704],
  [73.222, 44.415],
  [71.248, 37.013],
  [69.689, 30.822],
  [69.17, 26.515],
  [68.131, 21.669],
  [64.287, 20.323],
  [62.936, 14.132],
  [59.507, 10.633],
  [54.001, 9.556],
  [47.455, 9.96],
  [39.975, 9.287],
  [34.053, 9.691],
  [31.559, 12.248],
  [27.195, 13.325],
  [24.598, 13.998],
  [21.896, 12.113],
  [17.533, 11.844],
  [13.689, 14.267],
  [13.273, 18.439],
  [13.377, 24.765],
  [14.728, 30.014],
  [15.559, 36.609],
  [19.507, 39.166],
  [22.208, 42.127],
  [24.702, 45.492],
  [25.533, 50.741],
  [25.948, 56.529],
  [27.299, 63.258],
  [26.884, 68.238],
  [28.65, 71.872],
  [31.975, 76.179],
  [34.26, 81.563],
  [35.507, 88.293],
  [36.962, 93.138],
  [42.053, 93.945],
  [46.105, 96.099],
  [51.611, 97.31],
  [59.923, 94.618],
  [67.3, 90.984],
  [75.3, 86.947],
  [79.768, 78.737],
  [83.923, 71.199],
  [89.118, 63.797],
];

function insidePolygon(x: number, y: number) {
  let inside = false;

  for (
    let i = 0, j = MAP_POLYGON.length - 1;
    i < MAP_POLYGON.length;
    j = i++
  ) {
    const [xi, yi] = MAP_POLYGON[i];
    const [xj, yj] = MAP_POLYGON[j];

    const intersects =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) /
          ((yj - yi) || 0.00001) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/*
 * Checking only the final destination is not
 * enough for a concave perimeter.
 */
function routeInsidePolygon(
  from: Point,
  to: Point,
) {
  const length = Math.hypot(
    to.x - from.x,
    to.y - from.y,
  );

  const samples = Math.max(
    8,
    Math.ceil(length * 3),
  );

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;

    const x =
      from.x + (to.x - from.x) * t;

    const y =
      from.y + (to.y - from.y) * t;

    if (!insidePolygon(x, y)) {
      return false;
    }
  }

  return true;
}

function distance(
  a: Point,
  b: Point,
) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y,
  );
}

function shuffle<T>(values: T[]) {
  const copy = [...values];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(
      Math.random() * (i + 1),
    );

    [copy[i], copy[j]] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

function encounterFilename(
  node: WorldNode,
) {
  return node.kind === "hidden"
    ? `nanitebreak_hidden_${node.encounter}.png`
    : `nanitebreak_encounter_${node.encounter}.png`;
}

async function readJson<T>(
  response: Response,
): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `Empty response (${response.status})`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const message = response.ok
      ? "Nanite Break received a non-JSON response."
      : `Nanite Break API unavailable (${response.status}).`;

    throw new Error(message);
  }
}

/* ================================================================
   SHARED ENCOUNTER UI
   ================================================================ */

function EncounterActions({
  onCancel,
}: {
  onCancel: () => void;
}) {
  return (
    <div className="opnb-encounter-actions">
      <button
        type="button"
        className="opnb-cancel-encounter"
        onClick={onCancel}
      >
        CANCEL ENCOUNTER
      </button>
    </div>
  );
}

/* ================================================================
   DRESIKS
   Observe the shield sequence, then reproduce it.
   ================================================================ */

function DresiksMinigame({
  onWin,
}: MiniProps) {
  const sequence = useMemo(
    () =>
      Array.from(
        { length: 6 },
        () => Math.floor(Math.random() * 6),
      ),
    [],
  );

  const [phase, setPhase] = useState<
    "observe" | "input"
  >("observe");

  const [flash, setFlash] = useState<
    number | null
  >(null);

  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] =
    useState(0);

  useEffect(() => {
    if (phase !== "observe") {
      return;
    }

    let cancelled = false;

    async function showSequence() {
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, 500),
      );

      for (
        let i = 0;
        i < sequence.length;
        i += 1
      ) {
        if (cancelled) {
          return;
        }

        setFlash(sequence[i]);

        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 430),
        );

        setFlash(null);

        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 170),
        );
      }

      if (!cancelled) {
        setStep(0);
        setPhase("input");
      }
    }

    void showSequence();

    return () => {
      cancelled = true;
    };
  }, [phase, sequence]);

  function hit(index: number) {
    if (phase !== "input") {
      return;
    }

    if (index !== sequence[step]) {
      setMistakes((value) => value + 1);
      setStep(0);
      setPhase("observe");
      return;
    }

    const next = step + 1;
    setStep(next);

    if (next >= sequence.length) {
      window.setTimeout(
        () =>
          onWin({
            type: "dresiks_sequence",
            data: {
              sequence,
              mistakes,
            },
          }),
        220,
      );
    }
  }

  return (
    <div className="opnb-mini opnb-dresiks">
      <p>
        Dresiks has split his shield across six
        SIVA conduits. Observe the shield pulse,
        then strike the conduits in the same
        order.
      </p>

      <div className="opnb-shield-grid">
        {Array.from(
          { length: 6 },
          (_, index) => (
            <button
              key={index}
              type="button"
              className={[
                flash === index
                  ? "active"
                  : "",
                phase === "input"
                  ? "armed"
                  : "",
              ].join(" ")}
              disabled={
                phase !== "input"
              }
              onClick={() => hit(index)}
            >
              <span>
                {index + 1}
              </span>
              <i />
            </button>
          ),
        )}
      </div>

      <strong>
        {phase === "observe"
          ? "OBSERVE SHIELD SEQUENCE"
          : `${step}/${sequence.length} CONDUITS MATCHED`}
        {mistakes > 0
          ? ` // ${mistakes} RESET${
              mistakes === 1
                ? ""
                : "S"
            }`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   MONSTER
   Stop spreading SIVA corruption by sealing sectors.
   ================================================================ */

type MonsterSector = {
  id: number;
  corruption: number;
  sealed: boolean;
};

function MonsterMinigame({
  onWin,
}: MiniProps) {
  const [sectors, setSectors] =
    useState<MonsterSector[]>(() =>
      Array.from(
        { length: 9 },
        (_, id) => ({
          id,
          corruption:
            18 +
            Math.floor(
              Math.random() * 30,
            ),
          sealed: false,
        }),
      ),
    );

  const [breaches, setBreaches] =
    useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSectors((current) => {
        if (
          current.every(
            (sector) => sector.sealed,
          )
        ) {
          return current;
        }

        let breached = false;

        const next = current.map(
          (sector) => {
            if (sector.sealed) {
              return sector;
            }

            const corruption =
              sector.corruption +
              2 +
              Math.floor(
                Math.random() * 4,
              );

            if (corruption >= 100) {
              breached = true;

              return {
                ...sector,
                corruption: 42,
              };
            }

            return {
              ...sector,
              corruption,
            };
          },
        );

        if (breached) {
          setBreaches(
            (value) => value + 1,
          );
        }

        return next;
      });
    }, 650);

    return () =>
      window.clearInterval(timer);
  }, []);

  function sealSector(id: number) {
    setSectors((current) => {
      const target = current.find(
        (sector) => sector.id === id,
      );

      if (
        !target ||
        target.sealed
      ) {
        return current;
      }

      if (target.corruption > 55) {
        return current.map(
          (sector) =>
            sector.id === id
              ? {
                  ...sector,
                  corruption:
                    sector.corruption -
                    38,
                }
              : sector,
        );
      }

      const next = current.map(
        (sector) =>
          sector.id === id
            ? {
                ...sector,
                sealed: true,
                corruption: 0,
              }
            : sector,
      );

      if (
        next.every(
          (sector) => sector.sealed,
        )
      ) {
        window.setTimeout(
          () =>
            onWin({
              type: "monster_containment",
              data: {
                breaches,
              },
            }),
          200,
        );
      }

      return next;
    });
  }

  const sealed = sectors.filter(
    (sector) => sector.sealed,
  ).length;

  return (
    <div className="opnb-mini opnb-monster">
      <p>
        The creature is feeding a spreading
        SIVA growth. Stabilize highly corrupted
        sectors, then seal all nine containment
        zones.
      </p>

      <div className="opnb-containment-grid">
        {sectors.map((sector) => (
          <button
            key={sector.id}
            type="button"
            className={
              sector.sealed
                ? "sealed"
                : sector.corruption > 55
                  ? "critical"
                  : ""
            }
            disabled={sector.sealed}
            onClick={() =>
              sealSector(sector.id)
            }
          >
            <span>
              {sector.sealed
                ? "SEALED"
                : `${sector.corruption}%`}
            </span>

            <i
              style={{
                height: `${
                  sector.sealed
                    ? 0
                    : sector.corruption
                }%`,
              }}
            />
          </button>
        ))}
      </div>

      <strong>
        {sealed}/9 SECTORS SEALED
        {breaches > 0
          ? ` // ${breaches} BREACH${
              breaches === 1
                ? ""
                : "ES"
            } CONTAINED`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   NANITE CREW
   Persuasion encounter.
   ================================================================ */

type CrewMember = {
  id: string;
  name: string;
  role: string;
  opening: string;
  preferred: "evidence" | "authority" | "mercy";
};

const CREW_MEMBERS: CrewMember[] = [
  {
    id: "engineer",
    name: "ENGINEER VEK",
    role: "SPLICER ENGINEER",
    opening:
      "The replication field is stable. You have no reason to interfere.",
    preferred: "evidence",
  },
  {
    id: "guard",
    name: "KELL'S GUARD",
    role: "SECURITY",
    opening:
      "Orders came from above. We hold this ground until recalled.",
    preferred: "authority",
  },
  {
    id: "runner",
    name: "NANITE RUNNER",
    role: "COURIER",
    opening:
      "I never agreed to die for this machine.",
    preferred: "mercy",
  },
];

const PERSUASION_OPTIONS = [
  {
    type: "evidence" as const,
    title: "PRESENT EVIDENCE",
    text:
      "Show them the replication instability and the projected cascade.",
  },
  {
    type: "authority" as const,
    title: "ASSERT AUTHORITY",
    text:
      "Invoke the intercepted command hierarchy and order them to disengage.",
  },
  {
    type: "mercy" as const,
    title: "OFFER SAFE WITHDRAWAL",
    text:
      "Give the crew a way out without forcing them to defend the node.",
  },
];

function NaniteCrewMinigame({
  onWin,
}: MiniProps) {
  const members = useMemo(
    () => shuffle(CREW_MEMBERS),
    [],
  );

  const [index, setIndex] =
    useState(0);

  const [convinced, setConvinced] =
    useState<string[]>([]);

  const [hostility, setHostility] =
    useState(0);

  const member = members[index];

  function answer(
    option: typeof PERSUASION_OPTIONS[number],
  ) {
    if (!member) {
      return;
    }

    if (
      option.type ===
      member.preferred
    ) {
      const nextConvinced = [
        ...convinced,
        member.id,
      ];

      setConvinced(nextConvinced);

      const nextIndex =
        index + 1;

      if (
        nextIndex >=
        members.length
      ) {
        window.setTimeout(
          () =>
            onWin({
              type: "nanitecrew_persuasion",
              data: {
                convinced:
                  nextConvinced,
                hostility,
              },
            }),
          220,
        );

        return;
      }

      setIndex(nextIndex);
      return;
    }

    const nextHostility =
      hostility + 1;

    setHostility(
      nextHostility,
    );
  }

  return (
    <div className="opnb-mini opnb-crew">
      <p>
        This crew does not need to be destroyed.
        Read what each member wants and convince
        them to abandon the SIVA node.
      </p>

      <div className="opnb-dialogue-terminal">
        <div className="opnb-dialogue-speaker">
          <span>
            {member.role}
          </span>
          <strong>
            {member.name}
          </strong>
        </div>

        <blockquote>
          “{member.opening}”
        </blockquote>

        <div className="opnb-dialogue-options">
          {PERSUASION_OPTIONS.map(
            (option) => (
              <button
                key={option.type}
                type="button"
                onClick={() =>
                  answer(option)
                }
              >
                <strong>
                  {option.title}
                </strong>
                <span>
                  {option.text}
                </span>
              </button>
            ),
          )}
        </div>
      </div>

      <strong>
        {convinced.length}/3 CREW CONVINCED
        {hostility > 0
          ? ` // HOSTILITY ${hostility}`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   PERFECTED SQUAD
   Determine the support dependency chain.
   ================================================================ */

type SquadUnit = {
  id: number;
  name: string;
  role: string;
  supports: number | null;
};

function PerfectedSquadMinigame({
  onWin,
}: MiniProps) {
  const units = useMemo<SquadUnit[]>(
    () => [
      {
        id: 0,
        name: "PERFECTED PRIME",
        role: "COMMAND",
        supports: null,
      },
      {
        id: 1,
        name: "SIVA MEDIC",
        role: "REPAIR",
        supports: 0,
      },
      {
        id: 2,
        name: "WARDEN",
        role: "SHIELD",
        supports: 1,
      },
      {
        id: 3,
        name: "RELAY",
        role: "POWER",
        supports: 2,
      },
    ],
    [],
  );

  const [alive, setAlive] =
    useState(() =>
      new Set(
        units.map(
          (unit) => unit.id,
        ),
      ),
    );

  const [errors, setErrors] =
    useState(0);

  function canEliminate(
    unit: SquadUnit,
  ) {
    return !units.some(
      (other) =>
        alive.has(other.id) &&
        other.supports === unit.id,
    );
  }

  function attack(
    unit: SquadUnit,
  ) {
    if (!alive.has(unit.id)) {
      return;
    }

    if (!canEliminate(unit)) {
      setErrors(
        (value) => value + 1,
      );
      return;
    }

    const next = new Set(alive);
    next.delete(unit.id);
    setAlive(next);

    if (!next.size) {
      window.setTimeout(
        () =>
          onWin({
            type: "perfectedsquad_chain",
            data: {
              errors,
            },
          }),
        220,
      );
    }
  }

  return (
    <div className="opnb-mini opnb-squad">
      <p>
        The Perfected Squad is sustaining itself
        through a support chain. Read the links
        and remove the units from the outside of
        the network inward.
      </p>

      <div className="opnb-squad-network">
        {units.map((unit) => {
          const active =
            alive.has(unit.id);

          const protectedUnit =
            active &&
            !canEliminate(unit);

          return (
            <button
              key={unit.id}
              type="button"
              className={[
                active
                  ? "alive"
                  : "down",
                protectedUnit
                  ? "protected"
                  : "",
              ].join(" ")}
              disabled={!active}
              onClick={() =>
                attack(unit)
              }
            >
              <span>
                {unit.role}
              </span>

              <strong>
                {unit.name}
              </strong>

              <small>
                {!active
                  ? "DISABLED"
                  : protectedUnit
                    ? "SUPPORTED"
                    : "EXPOSED"}
              </small>

              {unit.supports !==
                null && (
                <i>
                  SUPPORTS{" "}
                  {
                    units.find(
                      (candidate) =>
                        candidate.id ===
                        unit.supports,
                    )?.name
                  }
                </i>
              )}
            </button>
          );
        })}
      </div>

      <strong>
        {units.length - alive.size}/
        {units.length} TARGETS DISABLED
        {errors > 0
          ? ` // ${errors} BLOCKED SHOT${
              errors === 1
                ? ""
                : "S"
            }`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   RAHNDEL
   Identify the real target from changing diagnostic clues.
   ================================================================ */

type RahndelCopy = {
  id: number;
  pulse: number;
  stable: boolean;
  echo: boolean;
};

function makeRahndels() {
  const real =
    Math.floor(
      Math.random() * 6,
    );

  return {
    real,
    copies: Array.from(
      { length: 6 },
      (_, id): RahndelCopy => ({
        id,
        pulse:
          id === real
            ? 7
            : 2 +
              Math.floor(
                Math.random() * 8,
              ),
        stable:
          id === real,
        echo:
          id !== real &&
          Math.random() > 0.5,
      }),
    ),
  };
}

function RahndelMinigame({
  onWin,
}: MiniProps) {
  const initial = useMemo(
    makeRahndels,
    [],
  );

  const [real, setReal] =
    useState(initial.real);

  const [copies, setCopies] =
    useState(initial.copies);

  const [scan, setScan] =
    useState<
      "pulse" | "stability" | "echo"
    >("pulse");

  const [misses, setMisses] =
    useState(0);

  function reshuffle() {
    const next =
      makeRahndels();

    setReal(next.real);
    setCopies(next.copies);
  }

  function strike(
    id: number,
  ) {
    if (id === real) {
      onWin({
        type: "rahndel_identity",
        data: {
          misses,
          scan,
        },
      });

      return;
    }

    setMisses(
      (value) => value + 1,
    );

    reshuffle();
  }

  return (
    <div className="opnb-mini opnb-rahndel">
      <p>
        Rahndel is masking himself with SIVA
        duplicates. Change scanner modes and
        identify the only copy with the correct
        diagnostic profile.
      </p>

      <div className="opnb-scan-tabs">
        <button
          type="button"
          className={
            scan === "pulse"
              ? "active"
              : ""
          }
          onClick={() =>
            setScan("pulse")
          }
        >
          PULSE
        </button>

        <button
          type="button"
          className={
            scan === "stability"
              ? "active"
              : ""
          }
          onClick={() =>
            setScan("stability")
          }
        >
          STABILITY
        </button>

        <button
          type="button"
          className={
            scan === "echo"
              ? "active"
              : ""
          }
          onClick={() =>
            setScan("echo")
          }
        >
          ECHO
        </button>
      </div>

      <div className="opnb-rahndel-grid">
        {copies.map((copy) => (
          <button
            key={copy.id}
            type="button"
            onClick={() =>
              strike(copy.id)
            }
          >
            <span>
              RAHNDEL //
              {copy.id + 1}
            </span>

            <strong>
              {scan === "pulse" &&
                `PULSE ${copy.pulse}`}

              {scan ===
                "stability" &&
                (copy.stable
                  ? "STABLE"
                  : "FLUCTUATING")}

              {scan === "echo" &&
                (copy.echo
                  ? "ECHO DETECTED"
                  : "NO ECHO")}
            </strong>
          </button>
        ))}
      </div>

      <strong>
        PROFILE: PULSE 7 // STABLE // NO ECHO
        {misses > 0
          ? ` // ${misses} DECOY${
              misses === 1
                ? ""
                : "S"
            } STRUCK`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   SERVITORS
   Read the pulse values and hit the linked Servitors in ascending
   pulse order. Wrong input resets the network.
   ================================================================ */

type Servitor = {
  id: number;
  pulse: number;
};

function ServitorsMinigame({
  onWin,
}: MiniProps) {
  const servitors = useMemo<Servitor[]>(
    () => {
      const pulses = shuffle([
        11,
        23,
        37,
        49,
        62,
        78,
      ]);

      return pulses.map(
        (pulse, id) => ({
          id,
          pulse,
        }),
      );
    },
    [],
  );

  const correctOrder = useMemo(
    () =>
      [...servitors]
        .sort(
          (a, b) =>
            a.pulse - b.pulse,
        )
        .map(
          (servitor) =>
            servitor.id,
        ),
    [servitors],
  );

  const [step, setStep] =
    useState(0);

  const [resets, setResets] =
    useState(0);

  const [disabled, setDisabled] =
    useState<number[]>([]);

  function strike(id: number) {
    if (
      disabled.includes(id)
    ) {
      return;
    }

    if (
      id !==
      correctOrder[step]
    ) {
      setStep(0);
      setDisabled([]);
      setResets(
        (value) => value + 1,
      );

      return;
    }

    const nextDisabled = [
      ...disabled,
      id,
    ];

    const nextStep =
      step + 1;

    setDisabled(
      nextDisabled,
    );

    setStep(nextStep);

    if (
      nextStep >=
      correctOrder.length
    ) {
      window.setTimeout(
        () =>
          onWin({
            type: "servitors_network",
            data: {
              order:
                correctOrder,
              resets,
            },
          }),
        220,
      );
    }
  }

  return (
    <div className="opnb-mini opnb-servitors">
      <p>
        The Servitors are feeding one another
        through a synchronized SIVA network.
        Their pulse readings expose the firing
        order. Break the network from the lowest
        pulse to the highest.
      </p>

      <div className="opnb-servitor-network">
        {servitors.map(
          (servitor) => {
            const down =
              disabled.includes(
                servitor.id,
              );

            return (
              <button
                key={
                  servitor.id
                }
                type="button"
                className={
                  down
                    ? "disabled"
                    : ""
                }
                disabled={down}
                onClick={() =>
                  strike(
                    servitor.id,
                  )
                }
              >
                <i />

                <span>
                  SERVITOR{" "}
                  {servitor.id +
                    1}
                </span>

                <strong>
                  {down
                    ? "LINK BROKEN"
                    : `PULSE ${servitor.pulse}`}
                </strong>
              </button>
            );
          },
        )}
      </div>

      <strong>
        {step}/
        {correctOrder.length} LINKS
        BROKEN
        {resets > 0
          ? ` // ${resets} NETWORK RESET${
              resets === 1
                ? ""
                : "S"
            }`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   SHANK SWARM
   Destroy priority Shanks while avoiding volatile units.
   ================================================================ */

type ShankTarget = {
  id: number;
  x: number;
  y: number;
  priority: boolean;
  volatile: boolean;
};

function makeShankWave(
  wave: number,
): ShankTarget[] {
  const priorityIndex =
    Math.floor(
      Math.random() * 6,
    );

  let volatileIndex =
    Math.floor(
      Math.random() * 6,
    );

  if (
    volatileIndex ===
    priorityIndex
  ) {
    volatileIndex =
      (volatileIndex + 1) %
      6;
  }

  return Array.from(
    { length: 6 },
    (_, id) => ({
      id:
        wave * 10 +
        id,
      x:
        10 +
        (id % 3) * 34 +
        Math.random() * 8,
      y:
        18 +
        Math.floor(id / 3) *
          46 +
        Math.random() * 8,
      priority:
        id ===
        priorityIndex,
      volatile:
        id ===
        volatileIndex,
    }),
  );
}

function ShankSwarmMinigame({
  onWin,
}: MiniProps) {
  const [wave, setWave] =
    useState(1);

  const [targets, setTargets] =
    useState<ShankTarget[]>(
      () => makeShankWave(1),
    );

  const [priorityKills, setPriorityKills] =
    useState(0);

  const [volatileHits, setVolatileHits] =
    useState(0);

  function hit(
    target: ShankTarget,
  ) {
    if (target.volatile) {
      setVolatileHits(
        (value) => value + 1,
      );

      setTargets(
        makeShankWave(wave),
      );

      return;
    }

    if (!target.priority) {
      setTargets((current) =>
        current.filter(
          (candidate) =>
            candidate.id !==
            target.id,
        ),
      );

      return;
    }

    const nextKills =
      priorityKills + 1;

    setPriorityKills(
      nextKills,
    );

    if (nextKills >= 4) {
      window.setTimeout(
        () =>
          onWin({
            type: "shankswarm_priority",
            data: {
              priorityKills:
                nextKills,
              volatileHits,
            },
          }),
        200,
      );

      return;
    }

    const nextWave =
      wave + 1;

    setWave(nextWave);

    setTargets(
      makeShankWave(
        nextWave,
      ),
    );
  }

  return (
    <div className="opnb-mini opnb-shanks">
      <p>
        The swarm is masking command Shanks
        behind disposable units. Destroy the
        priority signal. Avoid volatile Shanks:
        striking one causes the formation to
        scatter and reform.
      </p>

      <div className="opnb-mini-field opnb-shank-field">
        {targets.map(
          (target) => (
            <button
              key={target.id}
              type="button"
              className={[
                "opnb-shank",
                target.priority
                  ? "priority"
                  : "",
                target.volatile
                  ? "volatile"
                  : "",
              ].join(" ")}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
              }}
              onClick={() =>
                hit(target)
              }
            >
              <i />

              <span>
                {target.priority
                  ? "PRIORITY"
                  : target.volatile
                    ? "UNSTABLE"
                    : "SHANK"}
              </span>
            </button>
          ),
        )}
      </div>

      <strong>
        {priorityKills}/4 PRIORITY
        SIGNALS DESTROYED
        {volatileHits > 0
          ? ` // ${volatileHits} VOLATILE HIT${
              volatileHits === 1
                ? ""
                : "S"
            }`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   STEALTH SWARM
   Scanner periodically exposes invisible targets.
   ================================================================ */

type StealthTarget = {
  y: number;
  vx: number;
  vy: number;
};

function makeStealthTargets() {
  return Array.from(
    { length: 7 },
    (_, id): StealthTarget => ({
      id,
      x:
        12 +
        Math.random() * 76,
      y:
        12 +
        Math.random() * 70,
      vx:
        (Math.random() -
          0.5) *
        2.8,
      vy:
        (Math.random() -
          0.5) *
        2.4,
    }),
  );
}

function StealthSwarmMinigame({
  onWin,
}: MiniProps) {
  const [targets, setTargets] =
    useState<StealthTarget[]>(
      makeStealthTargets,
    );

  const [scanner, setScanner] =
    useState(false);

  const [intercepts, setIntercepts] =
    useState(0);

  const [misses, setMisses] =
    useState(0);

  useEffect(() => {
    const movement =
      window.setInterval(() => {
        setTargets(
          (current) =>
            current.map(
              (target) => {
                let x =
                  target.x +
                  target.vx;

                let y =
                  target.y +
                  target.vy;

                let vx =
                  target.vx;

                let vy =
                  target.vy;

                if (
                  x <= 5 ||
                  x >= 95
                ) {
                  vx *= -1;

                  x = Math.max(
                    5,
                    Math.min(
                      95,
                      x,
                    ),
                  );
                }

                if (
                  y <= 5 ||
                  y >= 92
                ) {
                  vy *= -1;

                  y = Math.max(
                    5,
                    Math.min(
                      92,
                      y,
                    ),
                  );
                }

                return {
                  ...target,
                  x,
                  y,
                  vx,
                  vy,
                };
              },
            ),
        );
      }, 120);

    return () =>
      window.clearInterval(
        movement,
      );
  }, []);

  useEffect(() => {
    const scanTimer =
      window.setInterval(() => {
        setScanner(true);

        window.setTimeout(
          () =>
            setScanner(false),
          950,
        );
      }, 2300);

    return () =>
      window.clearInterval(
        scanTimer,
      );
  }, []);

  function intercept(
    target: StealthTarget,
  ) {
    if (!scanner) {
      setMisses(
        (value) => value + 1,
      );

      return;
    }

    const next =
      targets.filter(
        (candidate) =>
          candidate.id !==
          target.id,
      );

    const nextIntercepts =
      intercepts + 1;

    setTargets(next);

    setIntercepts(
      nextIntercepts,
    );

    if (!next.length) {
      window.setTimeout(
        () =>
          onWin({
            type: "stealthswarm_scan",
            data: {
              intercepts:
                nextIntercepts,
              misses,
            },
          }),
        200,
      );
    }
  }

  return (
    <div className="opnb-mini opnb-stealth">
      <p>
        The swarm is cloaked. Scanner sweeps
        briefly expose movement signatures.
        Track the traces and intercept every
        unit while the sweep is active.
      </p>

      <div
        className={[
          "opnb-mini-field",
          "opnb-stealth-field",
          scanner
            ? "scanner-active"
            : "",
        ].join(" ")}
      >
        <div className="opnb-scanner-line" />

        {targets.map(
          (target) => (
            <button
              key={target.id}
              type="button"
              className="opnb-stealth-target"
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
              }}
              onClick={() =>
                intercept(
                  target,
                )
              }
            >
              ◆
            </button>
          ),
        )}
      </div>

      <strong>
        {scanner
          ? "SCANNER ACTIVE"
          : "SIGNALS CLOAKED"}{" "}
        // {targets.length} HOSTILES
        REMAIN
      </strong>
    </div>
  );
}

/* ================================================================
   WALKER
   Break legs -> stagger -> damage core.
   ================================================================ */

function WalkerMinigame({
  onWin,
}: MiniProps) {
  const [legs, setLegs] =
    useState([
      3,
      3,
      3,
      3,
    ]);

  const [coreOpen, setCoreOpen] =
    useState(false);

  const [coreDamage, setCoreDamage] =
    useState(0);

  const [cycles, setCycles] =
    useState(0);

  const coreTimer =
    useRef<number | null>(
      null,
    );

  useEffect(
    () => () => {
      if (
        coreTimer.current !==
        null
      ) {
        window.clearTimeout(
          coreTimer.current,
        );
      }
    },
    [],
  );

  function exposeCore() {
    setCoreOpen(true);

    if (
      coreTimer.current !==
      null
    ) {
      window.clearTimeout(
        coreTimer.current,
      );
    }

    coreTimer.current =
      window.setTimeout(
        () => {
          setCoreOpen(false);

          setLegs([
            2,
            2,
            2,
            2,
          ]);

          setCycles(
            (value) =>
              value + 1,
          );
        },
        3500,
      );
  }

  function hitLeg(
    index: number,
  ) {
    if (coreOpen) {
      return;
    }

    setLegs((current) => {
      if (
        current[index] <= 0
      ) {
        return current;
      }

      const next = [
        ...current,
      ];

      next[index] -= 1;

      if (
        next.every(
          (health) =>
            health <= 0,
        )
      ) {
        window.setTimeout(
          exposeCore,
          150,
        );
      }

      return next;
    });
  }

  function hitCore() {
    if (!coreOpen) {
      return;
    }

    const nextDamage =
      coreDamage + 1;

    setCoreDamage(
      nextDamage,
    );

    if (
      nextDamage >= 5
    ) {
      if (
        coreTimer.current !==
        null
      ) {
        window.clearTimeout(
          coreTimer.current,
        );
      }

      onWin({
        type: "walker_break",
        data: {
          cycles,
          coreDamage:
            nextDamage,
        },
      });
    }
  }

  return (
    <div className="opnb-mini opnb-walker">
      <p>
        Break all four Walker legs to force a
        stagger. When the core opens, strike it
        before the Walker recovers.
      </p>

      <div className="opnb-walker-body">
        <button
          type="button"
          className={[
            "opnb-walker-core",
            coreOpen
              ? "exposed"
              : "",
          ].join(" ")}
          disabled={!coreOpen}
          onClick={hitCore}
        >
          <span>
            {coreOpen
              ? "CORE EXPOSED"
              : "CORE LOCKED"}
          </span>

          <strong>
            {coreDamage}/5
          </strong>
        </button>

        <div className="opnb-walker-legs">
          {legs.map(
            (health, index) => (
              <button
                key={index}
                type="button"
                disabled={
                  coreOpen ||
                  health <= 0
                }
                className={
                  health <= 0
                    ? "broken"
                    : ""
                }
                onClick={() =>
                  hitLeg(index)
                }
              >
                <span>
                  LEG {index + 1}
                </span>

                <strong>
                  {health <= 0
                    ? "BROKEN"
                    : "◆".repeat(
                        health,
                      )}
                </strong>
              </button>
            ),
          )}
        </div>
      </div>

      <strong>
        {coreOpen
          ? "STAGGERED // DAMAGE THE CORE"
          : "BREAK ALL WALKER LEGS"}
      </strong>
    </div>
  );
}

/* ================================================================
   HIDDEN // CLEAR
   ================================================================ */

function ClearMinigame({
  onWin,
}: MiniProps) {
  const [clusters, setClusters] =
    useState(() =>
      Array.from(
        { length: 14 },
        (_, id) => ({
          id,
          x:
            6 +
            Math.random() * 86,
          y:
            8 +
            Math.random() * 80,
        }),
      ),
    );

  return (
    <div className="opnb-mini">
      <p>
        Remove every overgrown SIVA cluster.
      </p>

      <div className="opnb-mini-field">
        {clusters.map(
          (cluster) => (
            <button
              key={cluster.id}
              type="button"
              className="siva-cluster"
              style={{
                left: `${cluster.x}%`,
                top: `${cluster.y}%`,
              }}
              onClick={() => {
                const next =
                  clusters.filter(
                    (candidate) =>
                      candidate.id !==
                      cluster.id,
                  );

                setClusters(next);

                if (!next.length) {
                  window.setTimeout(
                    () =>
                      onWin({
                        type: "hidden_clear",
                        data: {
                          clusters:
                            14,
                        },
                      }),
                    250,
                  );
                }
              }}
            />
          ),
        )}
      </div>

      <strong>
        {clusters.length} CLUSTERS
        REMAIN
      </strong>
    </div>
  );
}

/* ================================================================
   HIDDEN // CYCLONE
   ================================================================ */

function CycloneMinigame({
  onWin,
}: MiniProps) {
  const [hits, setHits] =
    useState(0);

  const [misses, setMisses] =
    useState(0);

  const [missile, setMissile] =
    useState({
      key: 0,
      x:
        15 +
        Math.random() * 70,
      y: 4,
    });

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setMissile((current) => {
          if (
            current.y >= 82
          ) {
            setMisses(
              (value) =>
                value + 1,
            );

            return {
              key:
                current.key +
                1,
              x:
                15 +
                Math.random() *
                  70,
              y: 4,
            };
          }

          return {
            ...current,
            y:
              current.y + 9,
          };
        });
      }, 260);

    return () =>
      window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hits < 10) {
      return;
    }

    onWin({
      type: "hidden_cyclone",
      data: {
        hits,
        misses,
      },
    });
  }, [
    hits,
    misses,
    onWin,
  ]);

  return (
    <div className="opnb-mini">
      <p>
        Intercept incoming SIVA missiles before
        they hit your signal.
      </p>

      <div className="opnb-mini-field cyclone">
        <button
          key={missile.key}
          type="button"
          className="siva-missile"
          style={{
            left: `${missile.x}%`,
            top: `${missile.y}%`,
          }}
          onClick={() => {
            setHits(
              (value) =>
                value + 1,
            );

            setMissile(
              (current) => ({
                key:
                  current.key +
                  1,
                x:
                  15 +
                  Math.random() *
                    70,
                y: 4,
              }),
            );
          }}
        >
          ▼
        </button>

        <div className="player-base">
          PLAYER SIGNAL
        </div>
      </div>

      <strong>
        {hits}/10 INTERCEPTED //{" "}
        {misses} IMPACTS
      </strong>
    </div>
  );
}

/* ================================================================
   HIDDEN // DEFENSE
   ================================================================ */

function DefenseMinigame({
  onWin,
}: MiniProps) {
  const [units, setUnits] =
    useState(() =>
      Array.from(
        { length: 12 },
        (_, id) => ({
          id,
          progress:
            -(id * 8),
        }),
      ),
    );

  const [breaches, setBreaches] =
    useState(0);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setUnits((current) => {
          const remaining:
            typeof current = [];

          let breachedNow = 0;

          for (
            const unit of current
          ) {
            const progress =
              unit.progress + 3;

            if (
              progress >= 94
            ) {
              breachedNow += 1;
              continue;
            }

            remaining.push({
              ...unit,
              progress,
            });
          }

          if (
            breachedNow > 0
          ) {
            setBreaches(
              (value) =>
                value +
                breachedNow,
            );
          }

          return remaining;
        });
      }, 220);

    return () =>
      window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      units.length === 0
    ) {
      onWin({
        type: "hidden_defense",
        data: {
          breaches,
        },
      });
    }
  }, [
    units.length,
    breaches,
    onWin,
  ]);

  return (
    <div className="opnb-mini">
      <p>
        Fend off the advancing units before they
        reach the defense line.
      </p>

      <div className="opnb-mini-field defense">
        <div className="defense-line" />

        {units.map(
          (unit, index) => (
            <button
              key={unit.id}
              type="button"
              className="defense-unit"
              style={{
                left: `${
                  10 +
                  (index % 6) *
                    15
                }%`,
                top: `${Math.max(
                  3,
                  unit.progress,
                )}%`,
              }}
              onClick={() =>
                setUnits(
                  (current) =>
                    current.filter(
                      (
                        candidate,
                      ) =>
                        candidate.id !==
                        unit.id,
                    ),
                )
              }
            >
              ◆
            </button>
          ),
        )}
      </div>

      <strong>
        {units.length} HOSTILES REMAIN
        {breaches > 0
          ? ` // ${breaches} BREACHED`
          : ""}
      </strong>
    </div>
  );
}

/* ================================================================
   HIDDEN // INFILTRATE

   Free-movement stealth arena.
   ================================================================ */

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type InfiltrationDrone = {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  fov: number;
  range: number;
};

const INFILTRATE_WALLS: Rect[] = [
  { x: 18, y: 0, w: 4, h: 58 },
  { x: 18, y: 70, w: 4, h: 30 },
  { x: 38, y: 22, w: 4, h: 78 },
  { x: 58, y: 0, w: 4, h: 62 },
  { x: 58, y: 75, w: 4, h: 25 },
  { x: 78, y: 18, w: 4, h: 82 },
  { x: 22, y: 56, w: 12, h: 4 },
  { x: 42, y: 20, w: 12, h: 4 },
  { x: 62, y: 62, w: 12, h: 4 },
];

const INFILTRATE_START: Point = {
  x: 7,
  y: 88,
};

const INFILTRATE_EXIT: Rect = {
  x: 87,
  y: 5,
  w: 9,
  h: 12,
};

const INFILTRATE_DRONES: InfiltrationDrone[] = [
  {
    id: 1,
    x: 29,
    y: 32,
    angle: 15,
    speed: 24,
    fov: 62,
    range: 28,
  },
  {
    id: 2,
    x: 49,
    y: 72,
    angle: 150,
    speed: -19,
    fov: 58,
    range: 26,
  },
  {
    id: 3,
    x: 69,
    y: 36,
    angle: 225,
    speed: 27,
    fov: 64,
    range: 27,
  },
  {
    id: 4,
    x: 88,
    y: 64,
    angle: 300,
    speed: -22,
    fov: 56,
    range: 25,
  },
];

function pointInRect(
  point: Point,
  rect: Rect,
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

function orientation(
  a: Point,
  b: Point,
  c: Point,
) {
  return (
    (b.y - a.y) *
      (c.x - b.x) -
    (b.x - a.x) *
      (c.y - b.y)
  );
}

function segmentsIntersect(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
) {
  const o1 =
    orientation(a, b, c);

  const o2 =
    orientation(a, b, d);

  const o3 =
    orientation(c, d, a);

  const o4 =
    orientation(c, d, b);

  return (
    ((o1 > 0 && o2 < 0) ||
      (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) ||
      (o3 < 0 && o4 > 0))
  );
}

function lineHitsRect(
  from: Point,
  to: Point,
  rect: Rect,
) {
  if (
    pointInRect(from, rect) ||
    pointInRect(to, rect)
  ) {
    return true;
  }

  const topLeft = {
    x: rect.x,
    y: rect.y,
  };

  const topRight = {
    x: rect.x + rect.w,
    y: rect.y,
  };

  const bottomLeft = {
    x: rect.x,
    y: rect.y + rect.h,
  };

  const bottomRight = {
    x: rect.x + rect.w,
    y: rect.y + rect.h,
  };

  return (
    segmentsIntersect(
      from,
      to,
      topLeft,
      topRight,
    ) ||
    segmentsIntersect(
      from,
      to,
      topRight,
      bottomRight,
    ) ||
    segmentsIntersect(
      from,
      to,
      bottomRight,
      bottomLeft,
    ) ||
    segmentsIntersect(
      from,
      to,
      bottomLeft,
      topLeft,
    )
  );
}

function pathHitsInfiltrationWall(
  from: Point,
  to: Point,
) {
  return INFILTRATE_WALLS.some(
    (wall) =>
      lineHitsRect(
        from,
        to,
        wall,
      ),
  );
}

function normalizeAngle(
  angle: number,
) {
  let value =
    angle % 360;

  if (value < 0) {
    value += 360;
  }

  return value;
}

function smallestAngleDifference(
  a: number,
  b: number,
) {
  let difference =
    normalizeAngle(a) -
    normalizeAngle(b);

  if (difference > 180) {
    difference -= 360;
  }

  if (difference < -180) {
    difference += 360;
  }

  return Math.abs(
    difference,
  );
}

function droneSeesPlayer(
  drone: InfiltrationDrone,
  angle: number,
  player: Point,
) {
  const dx =
    player.x - drone.x;

  const dy =
    player.y - drone.y;

  const range =
    Math.hypot(dx, dy);

  if (range > drone.range) {
    return false;
  }

  const targetAngle =
    normalizeAngle(
      Math.atan2(
        dy,
        dx,
      ) *
        (180 / Math.PI),
    );

  if (
    smallestAngleDifference(
      targetAngle,
      angle,
    ) >
    drone.fov / 2
  ) {
    return false;
  }

  const blocked =
    INFILTRATE_WALLS.some(
      (wall) =>
        lineHitsRect(
          {
            x: drone.x,
            y: drone.y,
          },
          player,
          wall,
        ),
    );

  return !blocked;
}

/*
 * Builds the actual visual FOV triangle using
 * the SAME angle/range/FOV values used by the
 * detection calculation above.
 *
 * The SVG uses the arena's normalized 0..100
 * coordinate system, so the visible cone and
 * detection math remain aligned.
 */
function infiltrationFovPoints(
  drone: InfiltrationDrone,
  angle: number,
) {
  const half =
    drone.fov / 2;

  function endpoint(
    degrees: number,
  ) {
    const radians =
      (degrees * Math.PI) /
      180;

    return {
      x:
        drone.x +
        Math.cos(radians) *
          drone.range,
      y:
        drone.y +
        Math.sin(radians) *
          drone.range,
    };
  }

  const left =
    endpoint(
      angle - half,
    );

  const right =
    endpoint(
      angle + half,
    );

  return [
    `${drone.x},${drone.y}`,
    `${left.x},${left.y}`,
    `${right.x},${right.y}`,
  ].join(" ");
}

function InfiltrateMinigame({
  onWin,
}: MiniProps) {
  const arenaRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [player, setPlayer] =
    useState<Point>(
      INFILTRATE_START,
    );

  const playerRef =
    useRef<Point>(
      INFILTRATE_START,
    );

  const [angles, setAngles] =
    useState<
      Record<number, number>
    >(() =>
      Object.fromEntries(
        INFILTRATE_DRONES.map(
          (drone) => [
            drone.id,
            drone.angle,
          ],
        ),
      ),
    );

  const anglesRef =
    useRef(angles);

  const [detections, setDetections] =
    useState(0);

  const [detected, setDetected] =
    useState(false);

  const movementRef =
    useRef<number | null>(
      null,
    );

  useEffect(() => {
    playerRef.current =
      player;
  }, [player]);

  useEffect(() => {
    anglesRef.current =
      angles;
  }, [angles]);

  useEffect(() => {
    let previous =
      performance.now();

    let animation = 0;

    const frame = (
      now: number,
    ) => {
      const seconds =
        Math.min(
          0.05,
          (now - previous) /
            1000,
        );

      previous = now;

      setAngles(
        (current) => {
          const next = {
            ...current,
          };

          for (
            const drone of
            INFILTRATE_DRONES
          ) {
            next[drone.id] =
              normalizeAngle(
                (current[
                  drone.id
                ] ??
                  drone.angle) +
                  drone.speed *
                    seconds,
              );
          }

          anglesRef.current =
            next;

          return next;
        },
      );

      animation =
        requestAnimationFrame(
          frame,
        );
    };

    animation =
      requestAnimationFrame(
        frame,
      );

    return () =>
      cancelAnimationFrame(
        animation,
      );
  }, []);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        if (detected) {
          return;
        }

        const seen =
          INFILTRATE_DRONES.some(
            (drone) =>
              droneSeesPlayer(
                drone,
                anglesRef.current[
                  drone.id
                ] ??
                  drone.angle,
                playerRef.current,
              ),
          );

        if (!seen) {
          return;
        }

        setDetected(true);

        setDetections(
          (value) =>
            value + 1,
        );

        if (
          movementRef.current !==
          null
        ) {
          cancelAnimationFrame(
            movementRef.current,
          );

          movementRef.current =
            null;
        }

        window.setTimeout(
          () => {
            playerRef.current =
              INFILTRATE_START;

            setPlayer(
              INFILTRATE_START,
            );

            setDetected(false);
          },
          650,
        );
      }, 70);

    return () =>
      window.clearInterval(
        timer,
      );
  }, [detected]);

  useEffect(
    () => () => {
      if (
        movementRef.current !==
        null
      ) {
        cancelAnimationFrame(
          movementRef.current,
        );
      }
    },
    [],
  );

  function movePlayerTo(
    destination: Point,
  ) {
    if (detected) {
      return;
    }

    if (
      destination.x < 2 ||
      destination.x > 98 ||
      destination.y < 2 ||
      destination.y > 98
    ) {
      return;
    }

    const start = {
      ...playerRef.current,
    };

    if (
      pathHitsInfiltrationWall(
        start,
        destination,
      )
    ) {
      return;
    }

    if (
      movementRef.current !==
      null
    ) {
      cancelAnimationFrame(
        movementRef.current,
      );
    }

    const length =
      distance(
        start,
        destination,
      );

    const duration =
      Math.max(
        180,
        length * 45,
      );

    const started =
      performance.now();

    const frame = (
      now: number,
    ) => {
      const t =
        Math.min(
          1,
          (now - started) /
            duration,
        );

      const next = {
        x:
          start.x +
          (destination.x -
            start.x) *
            t,
        y:
          start.y +
          (destination.y -
            start.y) *
            t,
      };

      if (
        pathHitsInfiltrationWall(
          playerRef.current,
          next,
        )
      ) {
        movementRef.current =
          null;

        return;
      }

      playerRef.current =
        next;

      setPlayer(next);

      if (
        pointInRect(
          next,
          INFILTRATE_EXIT,
        )
      ) {
        movementRef.current =
          null;

        onWin({
          type: "hidden_infiltrate",
          data: {
            detections,
          },
        });

        return;
      }

      if (t < 1) {
        movementRef.current =
          requestAnimationFrame(
            frame,
          );
      } else {
        movementRef.current =
          null;
      }
    };

    movementRef.current =
      requestAnimationFrame(
        frame,
      );
  }

  function handleArenaPointer(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const arena =
      arenaRef.current;

    if (!arena) {
      return;
    }

    const rect =
      arena.getBoundingClientRect();

    const destination = {
      x:
        ((event.clientX -
          rect.left) /
          rect.width) *
        100,
      y:
        ((event.clientY -
          rect.top) /
          rect.height) *
        100,
    };

    movePlayerTo(
      destination,
    );
  }

  return (
    <div className="opnb-mini opnb-infiltrate">
      <p>
        Reach extraction without entering a
        drone's field of view. Gold walls block
        movement and drone vision. Click or tap
        open ground to move.
      </p>

      <div
        ref={arenaRef}
        className={[
          "opnb-infiltration-arena",
          detected
            ? "detected"
            : "",
        ].join(" ")}
        onPointerDown={
          handleArenaPointer
        }
      >
        <div
          className="opnb-infiltration-start"
          style={{
            left: `${INFILTRATE_START.x}%`,
            top: `${INFILTRATE_START.y}%`,
          }}
        >
          INSERTION
        </div>

        <div
          className="opnb-infiltration-exit"
          style={{
            left: `${INFILTRATE_EXIT.x}%`,
            top: `${INFILTRATE_EXIT.y}%`,
            width: `${INFILTRATE_EXIT.w}%`,
            height: `${INFILTRATE_EXIT.h}%`,
          }}
        >
          EXTRACTION
        </div>

        {/*
         * The FOV is one arena-sized SVG.
         *
         * This avoids percentage sizing relative
         * to a zero-sized drone wrapper, which is
         * why the old triangular FOV could exist
         * in the DOM but render at effectively
         * zero dimensions.
         */}
        <svg
          className="opnb-infiltration-fov-layer"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient
              id="opnb-fov-gradient"
              cx="0%"
              cy="50%"
              r="100%"
              fx="0%"
              fy="50%"
            >
              <stop
                offset="0%"
                stopColor="#ff5360"
                stopOpacity="0.62"
              />

              <stop
                offset="55%"
                stopColor="#df3445"
                stopOpacity="0.30"
              />

              <stop
                offset="100%"
                stopColor="#a51f31"
                stopOpacity="0.06"
              />
            </radialGradient>
          </defs>

          {INFILTRATE_DRONES.map(
            (drone) => {
              const angle =
                angles[
                  drone.id
                ] ??
                drone.angle;

              return (
                <polygon
                  key={
                    drone.id
                  }
                  className="opnb-drone-fov"
                  points={infiltrationFovPoints(
                    drone,
                    angle,
                  )}
                  fill="url(#opnb-fov-gradient)"
                  stroke="rgba(255, 91, 105, .72)"
                  strokeWidth="0.28"
                  vectorEffect="non-scaling-stroke"
                />
              );
            },
          )}
        </svg>

        {/*
         * Walls render ABOVE the cones. Visually
         * this makes the wall cut the FOV off,
         * matching the existing detection logic
         * where walls block line of sight.
         */}
        {INFILTRATE_WALLS.map(
          (wall, index) => (
            <div
              key={index}
              className="opnb-infiltration-wall"
              style={{
                left: `${wall.x}%`,
                top: `${wall.y}%`,
                width: `${wall.w}%`,
                height: `${wall.h}%`,
              }}
            />
          ),
        )}

        {INFILTRATE_DRONES.map(
          (drone) => {
            const angle =
              angles[
                drone.id
              ] ??
              drone.angle;

            return (
              <div
                key={
                  drone.id
                }
                className="opnb-drone"
                style={{
                  left: `${drone.x}%`,
                  top: `${drone.y}%`,
                }}
              >
                <i
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  }}
                >
                  ◆
                </i>
              </div>
            );
          },
        )}

        <div
          className="opnb-infiltration-player"
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
          }}
        >
          <i />

          <span>
            YOU
          </span>
        </div>

        {detected && (
          <div className="opnb-infiltration-alert">
            DETECTED // SIGNAL RESET
          </div>
        )}
      </div>

      <strong>
        {detections} DETECTION
        {detections === 1
          ? ""
          : "S"}{" "}
        // REACH EXTRACTION
      </strong>
    </div>
  );
}

/* ================================================================
   NORMAL ENCOUNTER ROUTER
   ================================================================ */

function NormalEncounter({
  encounter,
  onWin,
}: {
  encounter: EncounterName;
  onWin: MiniProps["onWin"];
}) {
  switch (encounter) {
    case "dresiks":
      return (
        <DresiksMinigame
          onWin={onWin}
        />
      );

    case "monster":
      return (
        <MonsterMinigame
          onWin={onWin}
        />
      );

    case "nanitecrew":
      return (
        <NaniteCrewMinigame
          onWin={onWin}
        />
      );

    case "perfectedsquad":
      return (
        <PerfectedSquadMinigame
          onWin={onWin}
        />
      );

    case "rahndel":
      return (
        <RahndelMinigame
          onWin={onWin}
        />
      );

    case "servitors":
      return (
        <ServitorsMinigame
          onWin={onWin}
        />
      );

    case "shankswarm":
      return (
        <ShankSwarmMinigame
          onWin={onWin}
        />
      );

    case "stealthswarm":
      return (
        <StealthSwarmMinigame
          onWin={onWin}
        />
      );

    case "walker":
      return (
        <WalkerMinigame
          onWin={onWin}
        />
      );

    default:
      return null;
  }
}

/* ================================================================
   HIDDEN ENCOUNTER ROUTER
   ================================================================ */

function HiddenEncounter({
  encounter,
  onWin,
}: {
  encounter: EncounterName;
  onWin: MiniProps["onWin"];
}) {
  switch (encounter) {
    case "clear":
      return (
        <ClearMinigame
          onWin={onWin}
        />
      );

    case "cyclone":
      return (
        <CycloneMinigame
          onWin={onWin}
        />
      );

    case "defense":
      return (
        <DefenseMinigame
          onWin={onWin}
        />
      );

    case "infiltrate":
      return (
        <InfiltrateMinigame
          onWin={onWin}
        />
      );

    default:
      return null;
  }
}

/* ================================================================
   PAGE
   ================================================================ */
export default function NaniteBreak() {
  const viewportRef =
    useRef<HTMLDivElement>(
      null,
    );

  const worldRef =
    useRef<HTMLDivElement>(
      null,
    );

  const animationRef =
    useRef<number | null>(
      null,
    );

  const [self, setSelf] =
    useState<PlayerSignal | null>(
      null,
    );

  const [displayPos, setDisplayPos] =
    useState<Point>({
      x: 50,
      y: 55,
    });

  const displayPosRef =
    useRef<Point>(
      displayPos,
    );

  const [players, setPlayers] =
    useState<PlayerSignal[]>(
      [],
    );

  const [nodes, setNodes] =
    useState<WorldNode[]>(
      [],
    );

  const [activeNode, setActiveNode] =
    useState<WorldNode | null>(
      null,
    );

  const [clearing, setClearing] =
    useState(false);

  const [reward, setReward] =
    useState<ClearResponse | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  /* ==============================================================
     MAP BOUNDARY ADMIN

     Discordiny user_id 1 only.
     ============================================================== */

  const [showMapAdmin, setShowMapAdmin] =
    useState(false);

  const [mapTraceMode, setMapTraceMode] =
    useState(false);

  const [mapTracePoints, setMapTracePoints] =
    useState<Point[]>([]);

  const [mapTraceMessage, setMapTraceMessage] =
    useState("");

  const isMapAdmin =
    Number(self?.userId) === 1;

  useEffect(() => {
    displayPosRef.current =
      displayPos;
  }, [displayPos]);

  async function loadWorld(
    silent = false,
  ) {
    try {
      const response =
        await fetch(
          "/api/events/operation-cleanse/nanite-break/world",
          {
            credentials:
              "include",
          },
        );

      const data =
        await readJson<WorldResponse>(
          response,
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "World uplink failed.",
        );
      }

      if (data.self) {
        setSelf(
          data.self,
        );

        if (!connected) {
          const initial = {
            x: data.self.x,
            y: data.self.y,
          };

          setDisplayPos(
            initial,
          );

          displayPosRef.current =
            initial;
        }
      }

      setPlayers(
        data.players ?? [],
      );

      setNodes(
        data.nodes ?? [],
      );

      setConnected(true);

      if (!silent) {
        setError("");
      }
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error
            ? err.message
            : "World uplink failed.",
        );
      }
    }
  }

  useEffect(() => {
    void loadWorld();

    const timer =
      window.setInterval(
        () =>
          void loadWorld(
            true,
          ),
        2500,
      );

    return () => {
      window.clearInterval(
        timer,
      );

      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current,
        );
      }
    };
  }, []);

  /*
   * Camera follows the player's displayed
   * position.
   */
  useEffect(() => {
    const viewport =
      viewportRef.current;

    const world =
      worldRef.current;

    if (
      !viewport ||
      !world
    ) {
      return;
    }

    const left =
      (displayPos.x /
        100) *
        world.offsetWidth -
      viewport.clientWidth /
        2;

    const top =
      (displayPos.y /
        100) *
        world.offsetHeight -
      viewport.clientHeight /
        2;

    viewport.scrollTo({
      left,
      top,
      behavior: "auto",
    });
  }, [displayPos]);

  /*
   * Enter encounter on proximity.
   *
   * Tracing disables this so the admin can
   * click directly over encounter signals
   * without opening encounters.
   */
  useEffect(() => {
    if (
      activeNode ||
      clearing ||
      reward ||
      mapTraceMode
    ) {
      return;
    }

    const nearby =
      nodes.find(
        (node) =>
          distance(
            displayPos,
            node,
          ) <= 2.3,
      );

    if (nearby) {
      setActiveNode(
        nearby,
      );
    }
  }, [
    displayPos,
    nodes,
    activeNode,
    clearing,
    reward,
    mapTraceMode,
  ]);

  async function persistPosition(
    x: number,
    y: number,
  ) {
    const response =
      await fetch(
        "/api/events/operation-cleanse/nanite-break/position",
        {
          method: "POST",
          credentials:
            "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            x,
            y,
          }),
        },
      );

    const data =
      await readJson<WorldResponse>(
        response,
      );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.error ||
          "Signal movement rejected.",
      );
    }

    if (data.self) {
      setSelf(
        data.self,
      );
    }
  }

  function travelTo(
    x: number,
    y: number,
  ) {
    if (
      activeNode ||
      clearing ||
      reward ||
      mapTraceMode
    ) {
      return;
    }

    const start = {
      ...displayPosRef.current,
    };

    const destination = {
      x,
      y,
    };

    if (
      !insidePolygon(
        x,
        y,
      ) ||
      !routeInsidePolygon(
        start,
        destination,
      )
    ) {
      setError(
        "PLAGUELANDS PERIMETER LOCKED // ROUTE CROSSES THE GOLD WALL",
      );

      return;
    }

    setError("");

    if (
      animationRef.current !==
      null
    ) {
      cancelAnimationFrame(
        animationRef.current,
      );
    }

    const dist =
      distance(
        start,
        destination,
      );

    const duration =
      Math.max(
        450,
        Math.min(
          4200,
          dist * 62,
        ),
      );

    const started =
      performance.now();

    const frame = (
      now: number,
    ) => {
      const t =
        Math.min(
          1,
          (now - started) /
            duration,
        );

      const eased =
        1 -
        Math.pow(
          1 - t,
          3,
        );

      const next = {
        x:
          start.x +
          (x - start.x) *
            eased,
        y:
          start.y +
          (y - start.y) *
            eased,
      };

      if (
        !insidePolygon(
          next.x,
          next.y,
        )
      ) {
        animationRef.current =
          null;

        setDisplayPos(
          start,
        );

        displayPosRef.current =
          start;

        setError(
          "PLAGUELANDS PERIMETER LOCKED",
        );

        return;
      }

      displayPosRef.current =
        next;

      setDisplayPos(
        next,
      );

      if (t < 1) {
        animationRef.current =
          requestAnimationFrame(
            frame,
          );

        return;
      }

      animationRef.current =
        null;

      void persistPosition(
        x,
        y,
      ).catch((err) => {
        if (self) {
          const authoritative = {
            x: self.x,
            y: self.y,
          };

          displayPosRef.current =
            authoritative;

          setDisplayPos(
            authoritative,
          );
        }

        setError(
          err instanceof Error
            ? err.message
            : "Signal movement rejected.",
        );
      });
    };

    animationRef.current =
      requestAnimationFrame(
        frame,
      );
  }

  /*
   * Convert a click on the giant map world
   * directly to normalized map coordinates.
   *
   * These are the same 0..100 coordinates used
   * by player movement, nodes and MAP_POLYGON.
   */
  function addMapTracePoint(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      !isMapAdmin ||
      !mapTraceMode
    ) {
      return;
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const world =
      worldRef.current;

    if (!world) {
      return;
    }

    const rect =
      world.getBoundingClientRect();

    const x =
      ((event.clientX -
        rect.left) /
        rect.width) *
      100;

    const y =
      ((event.clientY -
        rect.top) /
        rect.height) *
      100;

    if (
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    ) {
      return;
    }

    setMapTracePoints(
      (current) => [
        ...current,
        {
          x: Number(
            x.toFixed(3),
          ),
          y: Number(
            y.toFixed(3),
          ),
        },
      ],
    );

    setMapTraceMessage("");
  }

  async function copyMapTrace() {
    if (
      mapTracePoints.length <
      3
    ) {
      return;
    }

    /*
     * Export both names so the result can be
     * dropped directly into the React and
     * Worker implementations.
     */
    const frontend = [
      "const MAP_POLYGON: Array<[number, number]> = [",
      ...mapTracePoints.map(
        (point) =>
          `  [${point.x}, ${point.y}],`,
      ),
      "];",
    ].join("\n");

    const worker = [
      "const OPNB_MAP_POLYGON: Array<[number, number]> = [",
      ...mapTracePoints.map(
        (point) =>
          `  [${point.x}, ${point.y}],`,
      ),
      "];",
    ].join("\n");

    const output = [
      "/* FRONTEND */",
      frontend,
      "",
      "/* WORKER */",
      worker,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        output,
      );

      setMapTraceMessage(
        "POLYGON COPIED",
      );
    } catch {
      setMapTraceMessage(
        "COPY FAILED",
      );
    }
  }

  function handleMapPointer(
    event: PointerEvent<HTMLDivElement>,
  ) {
    /*
     * Admin tracing completely replaces normal
     * map movement while active.
     */
    if (
      isMapAdmin &&
      mapTraceMode
    ) {
      addMapTracePoint(
        event,
      );

      return;
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const world =
      worldRef.current;

    if (!world) {
      return;
    }

    const rect =
      world.getBoundingClientRect();

    const x =
      ((event.clientX -
        rect.left) /
        rect.width) *
      100;

    const y =
      ((event.clientY -
        rect.top) /
        rect.height) *
      100;

    travelTo(
      x,
      y,
    );
  }

  function cancelEncounter() {
    if (clearing) {
      return;
    }

    setActiveNode(
      null,
    );

    setError("");

    const current =
      displayPosRef.current;

    const nearby =
      nodes.find(
        (node) =>
          distance(
            current,
            node,
          ) <= 2.3,
      );

    if (nearby) {
      const dx =
        current.x -
        nearby.x;

      const dy =
        current.y -
        nearby.y;

      const length =
        Math.max(
          0.001,
          Math.hypot(
            dx,
            dy,
          ),
        );

      const candidate = {
        x:
          current.x +
          (dx / length) *
            2.6,
        y:
          current.y +
          (dy / length) *
            2.6,
      };

      if (
        insidePolygon(
          candidate.x,
          candidate.y,
        )
      ) {
        displayPosRef.current =
          candidate;

        setDisplayPos(
          candidate,
        );
      }
    }
  }

  async function finishEncounter(
    proof?: EncounterProof,
  ) {
    if (
      !activeNode ||
      clearing
    ) {
      return;
    }

    const completedNode =
      activeNode;

    setActiveNode(
      null,
    );

    setClearing(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/events/operation-cleanse/nanite-break/encounters/${encodeURIComponent(
            completedNode.id,
          )}/clear`,
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              proof:
                proof ?? {
                  type:
                    completedNode.encounter,
                },
            }),
          },
        );

      const data =
        await readJson<ClearResponse>(
          response,
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Encounter clear rejected.",
        );
      }

      setReward(data);

      await loadWorld(
        true,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Encounter clear rejected.",
      );

      await loadWorld(
        true,
      );
    } finally {
      setClearing(false);
    }
  }

  const activeImage =
    activeNode
      ? imageByName[
          encounterFilename(
            activeNode,
          )
        ]
      : null;

  return (
    <main className="opnb-page">
      <TopBar />

      <header className="opnb-hud">
        <div>
          <span>
            OPERATION: CLEANSE // PUBLIC ACTIVITY
          </span>

          <h1>
            Operation: Nanite Break
          </h1>
        </div>

        <div className="opnb-hud-status">
          <span>
            WEAPON SOURCE // OPNB
          </span>

          <strong>
            {nodes.length} / 15 ACTIVE SIGNALS
          </strong>
        </div>
      </header>

      <section
        className="opnb-viewport"
        ref={viewportRef}
      >
        <div
          className={[
            "opnb-map-world",
            mapTraceMode
              ? "tracing"
              : "",
          ].join(" ")}
          ref={worldRef}
          onPointerDown={
            handleMapPointer
          }
          role="application"
          aria-label={
            mapTraceMode
              ? "Map boundary tracing mode"
              : "Plaguelands traversal map. Click or tap inside the gold perimeter to move."
          }
        >
          <img
            className="opnb-map-image"
            src={mapImage}
            alt=""
            draggable={false}
          />

          <div className="opnb-map-vignette" />

          {/*
           * ADMIN BOUNDARY OVERLAY
           *
           * Because the SVG uses 0..100 for both
           * axes, every clicked point corresponds
           * directly to the exported polygon.
           */}
          {isMapAdmin &&
            mapTraceMode && (
              <svg
                className="opnb-map-tracer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {mapTracePoints.length >
                  1 && (
                  <polyline
                    points={mapTracePoints
                      .map(
                        (point) =>
                          `${point.x},${point.y}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke="#73ff99"
                    strokeWidth="0.24"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {mapTracePoints.length >=
                  3 && (
                  <line
                    x1={
                      mapTracePoints[
                        mapTracePoints.length -
                          1
                      ].x
                    }
                    y1={
                      mapTracePoints[
                        mapTracePoints.length -
                          1
                      ].y
                    }
                    x2={
                      mapTracePoints[0].x
                    }
                    y2={
                      mapTracePoints[0].y
                    }
                    stroke="rgba(115,255,153,.58)"
                    strokeWidth="0.18"
                    strokeDasharray="0.8 0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {mapTracePoints.map(
                  (
                    point,
                    index,
                  ) => (
                    <g
                      key={`${point.x}-${point.y}-${index}`}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="0.48"
                        fill="#ffffff"
                        stroke="#73ff99"
                        strokeWidth="0.16"
                        vectorEffect="non-scaling-stroke"
                      />

                      <text
                        x={
                          point.x +
                          0.65
                        }
                        y={
                          point.y -
                          0.65
                        }
                        fill="#ffffff"
                        fontSize="1.1"
                      >
                        {index + 1}
                      </text>
                    </g>
                  ),
                )}
              </svg>
            )}

          {nodes.map(
            (node) => (
              <div
                key={node.id}
                className={`opnb-encounter-signal ${node.kind}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                }}
              >
                <i />

                <span>
                  {node.kind ===
                  "hidden"
                    ? "UNKNOWN"
                    : "ENCOUNTER"}
                </span>
              </div>
            ),
          )}

          {players
            .filter(
              (player) =>
                player.userId !==
                self?.userId,
            )
            .map(
              (player) => (
                <div
                  key={
                    player.userId
                  }
                  className="opnb-player-signal other"
                  style={{
                    left: `${player.x}%`,
                    top: `${player.y}%`,
                  }}
                >
                  <i />

                  <span>
                    {player.globalName ||
                      player.username}
                  </span>
                </div>
              ),
            )}

          <div
            className="opnb-player-signal self"
            style={{
              left: `${displayPos.x}%`,
              top: `${displayPos.y}%`,
            }}
          >
            <i />

            <span>
              PLAYER SIGNAL
            </span>
          </div>
        </div>
      </section>

      {/*
       * MAP ADMIN exists only for Discordiny
       * user_id 1.
       */}
      {isMapAdmin && (
        <>
          <button
            type="button"
            className="opnb-map-admin-toggle"
            onClick={() =>
              setShowMapAdmin(
                (current) =>
                  !current,
              )
            }
          >
            MAP ADMIN
          </button>

          {showMapAdmin && (
            <aside className="opnb-map-admin">
              <div className="opnb-map-admin-heading">
                <div>
                  <span>
                    ADMIN // USER 1
                  </span>

                  <strong>
                    MAP BOUNDARY TRACER
                  </strong>
                </div>

                <button
                  type="button"
                  aria-label="Close map admin"
                  onClick={() =>
                    setShowMapAdmin(
                      false,
                    )
                  }
                >
                  ×
                </button>
              </div>

              <p>
                Start tracing and click directly
                along the center of the gold
                perimeter. Add a point whenever
                the wall changes direction.
              </p>

              <div className="opnb-map-admin-status">
                <span>
                  TRACE
                </span>

                <strong>
                  {mapTraceMode
                    ? "ACTIVE"
                    : "OFF"}
                </strong>

                <span>
                  POINTS
                </span>

                <strong>
                  {mapTracePoints.length}
                </strong>
              </div>

              <button
                type="button"
                className={
                  mapTraceMode
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setMapTraceMode(
                    (current) =>
                      !current,
                  );

                  setMapTraceMessage("");
                }}
              >
                {mapTraceMode
                  ? "STOP TRACING"
                  : "START TRACING"}
              </button>

              <button
                type="button"
                disabled={
                  !mapTracePoints.length
                }
                onClick={() => {
                  setMapTracePoints(
                    (current) =>
                      current.slice(
                        0,
                        -1,
                      ),
                  );

                  setMapTraceMessage("");
                }}
              >
                UNDO LAST POINT
              </button>

              <button
                type="button"
                disabled={
                  !mapTracePoints.length
                }
                onClick={() => {
                  setMapTracePoints(
                    [],
                  );

                  setMapTraceMessage("");
                }}
              >
                CLEAR TRACE
              </button>

              <button
                type="button"
                disabled={
                  mapTracePoints.length <
                  3
                }
                onClick={() =>
                  void copyMapTrace()
                }
              >
                COPY POLYGON
              </button>

              {mapTraceMessage && (
                <div className="opnb-map-admin-message">
                  {mapTraceMessage}
                </div>
              )}

              {mapTracePoints.length >=
                3 && (
                <div className="opnb-map-admin-preview">
                  <span>
                    FIRST
                  </span>

                  <code>
                    {mapTracePoints[0].x},{" "}
                    {mapTracePoints[0].y}
                  </code>

                  <span>
                    LAST
                  </span>

                  <code>
                    {
                      mapTracePoints[
                        mapTracePoints.length -
                          1
                      ].x
                    }
                    ,{" "}
                    {
                      mapTracePoints[
                        mapTracePoints.length -
                          1
                      ].y
                    }
                  </code>
                </div>
              )}
            </aside>
          )}
        </>
      )}

      <footer className="opnb-footer">
        <div>
          <span
            className={
              connected
                ? "online"
                : ""
            }
          >
            ●{" "}
            {connected
              ? "PUBLIC UPLINK"
              : "CONNECTING"}
          </span>

          <span>
            {mapTraceMode
              ? "ADMIN // CLICK GOLD WALL TO TRACE"
              : "CLICK / TAP MAP TO MOVE"}
          </span>
        </div>

        <strong>
          {mapTraceMode
            ? `${mapTracePoints.length} BOUNDARY POINTS`
            : "GOLD WALL // HARD PERIMETER"}
        </strong>
      </footer>

      {error && (
        <div className="opnb-toast error">
          {error}
        </div>
      )}

      {clearing &&
        !activeNode && (
          <div className="opnb-toast opnb-resolving-toast">
            RESOLVING ENCOUNTER...
          </div>
        )}

      {activeNode && (
        <div className="opnb-encounter-overlay">
          <section className="opnb-encounter-card">
            {activeImage && (
              <img
                src={activeImage}
                alt=""
              />
            )}

            <div className="opnb-encounter-content">
              <span>
                {activeNode.kind ===
                "hidden"
                  ? "HIDDEN SIGNAL // TRIPLE REWARDS"
                  : "SIVA ENCOUNTER"}
              </span>

              <h2>
                {activeNode.encounter
                  .replace(
                    /_/g,
                    " ",
                  )
                  .toUpperCase()}
              </h2>

              {activeNode.kind ===
                "normal" && (
                <NormalEncounter
                  key={
                    activeNode.id
                  }
                  encounter={
                    activeNode.encounter
                  }
                  onWin={
                    finishEncounter
                  }
                />
              )}

              {activeNode.kind ===
                "hidden" && (
                <HiddenEncounter
                  key={
                    activeNode.id
                  }
                  encounter={
                    activeNode.encounter
                  }
                  onWin={
                    finishEncounter
                  }
                />
              )}

              <EncounterActions
                onCancel={
                  cancelEncounter
                }
              />

              {clearing && (
                <div className="opnb-resolving">
                  RESOLVING ENCOUNTER...
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {reward && (
        <div
          className="opnb-reward-overlay"
          onClick={() =>
            setReward(null)
          }
        >
          <section
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <span>
              ENCOUNTER CLEARED
            </span>

            <h2>
              REWARDS ACQUIRED
            </h2>

            <div className="opnb-reward-list">
              {Object.entries(
                reward.rewards ??
                  {},
              ).map(
                ([
                  name,
                  amount,
                ]) => (
                  <div key={name}>
                    <span>
                      {name}
                    </span>

                    <strong>
                      +
                      {amount.toLocaleString()}
                    </strong>
                  </div>
                ),
              )}

              <div>
                <span>
                  XP
                </span>

                <strong>
                  +
                  {(
                    reward.xp ??
                    0
                  ).toLocaleString()}
                </strong>
              </div>

              {reward.weapon
                ?.dropped &&
                reward.weapon
                  .name && (
                  <div className="weapon">
                    <span>
                      WEAPON // OPNB
                    </span>

                    <strong>
                      {
                        reward.weapon
                          .name
                      }
                    </strong>
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={() =>
                setReward(null)
              }
            >
              RETURN TO PLAGUELANDS
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
