import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import mapImage from "../assets/siva/opnb/map.png";
import "./NaniteBreak.css";

type EncounterKind = "normal" | "hidden";
type EncounterName =
  | "dresiks" | "monster" | "nanitecrew" | "perfectedsquad" | "rahndel"
  | "servitors" | "shankswarm" | "stealthswarm" | "walker"
  | "clear" | "cyclone" | "defense" | "infiltrate";

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

type ClearResponse = {
  success: boolean;
  error?: string;
  rewards?: Record<string, number>;
  xp?: number;
  weapon?: { dropped: boolean; name: string | null; rarity: string | null };
  cleanseProgress?: number;
  cleanseTarget?: number;
};

const encounterAssets = import.meta.glob(
  "../assets/siva/opnb/*.png",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const imageByName = Object.fromEntries(
  Object.entries(encounterAssets).map(([path, url]) => [
    path.split("/").pop()?.toLowerCase() ?? path,
    url,
  ]),
) as Record<string, string>;

const MAP_POLYGON: Array<[number, number]> = [
  [8, 18], [21, 9], [39, 7], [57, 10], [74, 8], [91, 18],
  [94, 36], [91, 57], [84, 77], [67, 91], [45, 94], [24, 88],
  [9, 72], [5, 51],
];

function insidePolygon(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = MAP_POLYGON.length - 1; i < MAP_POLYGON.length; j = i++) {
    const [xi, yi] = MAP_POLYGON[i];
    const [xj, yj] = MAP_POLYGON[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.00001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function encounterFilename(node: WorldNode) {
  return node.kind === "hidden"
    ? `nanitebreak_hidden_${node.encounter}.png`
    : `nanitebreak_encounter_${node.encounter}.png`;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`Empty response (${response.status})`);
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

function NormalMinigame({ onWin }: { onWin: () => void }) {
  const [hits, setHits] = useState(0);
  return (
    <div className="opnb-mini normal-mini">
      <p>Break the SIVA locks before the signal stabilizes.</p>
      <div className="opnb-lock-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i < hits ? "broken" : ""}
            disabled={i !== hits}
            onClick={() => {
              const next = hits + 1;
              setHits(next);
              if (next === 9) window.setTimeout(onWin, 250);
            }}
          >
            {i < hits ? "×" : "◆"}
          </button>
        ))}
      </div>
      <strong>{hits}/9 LOCKS BROKEN</strong>
    </div>
  );
}

function ClearMinigame({ onWin }: { onWin: () => void }) {
  const [clusters, setClusters] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 6 + Math.random() * 86,
      y: 8 + Math.random() * 80,
    })),
  );
  return (
    <div className="opnb-mini">
      <p>Remove every overgrown SIVA cluster.</p>
      <div className="opnb-mini-field">
        {clusters.map((c) => (
          <button
            key={c.id}
            type="button"
            className="siva-cluster"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            onClick={() => {
              const next = clusters.filter((x) => x.id !== c.id);
              setClusters(next);
              if (!next.length) window.setTimeout(onWin, 250);
            }}
          />
        ))}
      </div>
      <strong>{clusters.length} CLUSTERS REMAIN</strong>
    </div>
  );
}

function CycloneMinigame({ onWin }: { onWin: () => void }) {
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [missile, setMissile] = useState({ key: 0, x: 15 + Math.random() * 70, y: 4 });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMissile((m) => {
        if (m.y >= 82) {
          setMisses((v) => v + 1);
          return { key: m.key + 1, x: 15 + Math.random() * 70, y: 4 };
        }
        return { ...m, y: m.y + 9 };
      });
    }, 260);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hits >= 10) onWin();
  }, [hits, onWin]);

  return (
    <div className="opnb-mini">
      <p>Intercept incoming SIVA missiles before they hit your signal.</p>
      <div className="opnb-mini-field cyclone">
        <button
          key={missile.key}
          type="button"
          className="siva-missile"
          style={{ left: `${missile.x}%`, top: `${missile.y}%` }}
          onClick={() => {
            setHits((v) => v + 1);
            setMissile((m) => ({ key: m.key + 1, x: 15 + Math.random() * 70, y: 4 }));
          }}
        >
          ▼
        </button>
        <div className="player-base">PLAYER SIGNAL</div>
      </div>
      <strong>{hits}/10 INTERCEPTED // {misses} IMPACTS</strong>
    </div>
  );
}

function DefenseMinigame({ onWin }: { onWin: () => void }) {
  const [units, setUnits] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({ id: i, progress: -(i * 8) })),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUnits((current) =>
        current.map((u) => ({ ...u, progress: Math.min(100, u.progress + 3) })),
      );
    }, 220);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!units.length) onWin();
  }, [units.length, onWin]);

  return (
    <div className="opnb-mini">
      <p>Fend off the advancing units before they reach the defense line.</p>
      <div className="opnb-mini-field defense">
        <div className="defense-line" />
        {units.map((u, index) => (
          <button
            key={u.id}
            type="button"
            className="defense-unit"
            style={{
              left: `${10 + (index % 6) * 15}%`,
              top: `${Math.max(3, u.progress)}%`,
            }}
            onClick={() => setUnits((all) => all.filter((x) => x.id !== u.id))}
          >
            ◆
          </button>
        ))}
      </div>
      <strong>{units.length} HOSTILES REMAIN</strong>
    </div>
  );
}

const MAZE = [
  "###########",
  "#S#.......#",
  "#.#.#####.#",
  "#.#.....#.#",
  "#.#####.#.#",
  "#.....#.#.#",
  "#####.#.#.#",
  "#.....#...#",
  "#.#######.#",
  "#........E#",
  "###########",
];

function InfiltrateMinigame({ onWin }: { onWin: () => void }) {
  const [pos, setPos] = useState<[number, number]>([1, 1]);
  const drones = useMemo(() => new Set(["1,7", "3,5", "7,7"]), []);

  function move(dx: number, dy: number) {
    const next: [number, number] = [pos[0] + dx, pos[1] + dy];
    const cell = MAZE[next[1]]?.[next[0]];
    if (!cell || cell === "#") return;
    if (drones.has(`${next[0]},${next[1]}`)) {
      setPos([1, 1]);
      return;
    }
    setPos(next);
    if (cell === "E") window.setTimeout(onWin, 200);
  }

  return (
    <div className="opnb-mini infiltrate-mini">
      <p>Reach the exit without crossing a drone's scan cell.</p>
      <div className="maze">
        {MAZE.flatMap((row, y) =>
          [...row].map((cell, x) => (
            <i
              key={`${x}-${y}`}
              className={[
                cell === "#" ? "wall" : "floor",
                drones.has(`${x},${y}`) ? "drone" : "",
                pos[0] === x && pos[1] === y ? "you" : "",
                cell === "E" ? "exit" : "",
              ].join(" ")}
            />
          )),
        )}
      </div>
      <div className="maze-controls">
        <button type="button" onClick={() => move(0, -1)}>↑</button>
        <button type="button" onClick={() => move(-1, 0)}>←</button>
        <button type="button" onClick={() => move(0, 1)}>↓</button>
        <button type="button" onClick={() => move(1, 0)}>→</button>
      </div>
    </div>
  );
}

export default function NaniteBreak() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [self, setSelf] = useState<PlayerSignal | null>(null);
  const [displayPos, setDisplayPos] = useState({ x: 50, y: 55 });
  const displayPosRef = useRef(displayPos);
  const [players, setPlayers] = useState<PlayerSignal[]>([]);
  const [nodes, setNodes] = useState<WorldNode[]>([]);
  const [activeNode, setActiveNode] = useState<WorldNode | null>(null);
  const [clearing, setClearing] = useState(false);
  const [reward, setReward] = useState<ClearResponse | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    displayPosRef.current = displayPos;
  }, [displayPos]);

  async function loadWorld(silent = false) {
    try {
      const response = await fetch("/api/events/operation-cleanse/nanite-break/world", {
        credentials: "include",
      });
      const data = await readJson<WorldResponse>(response);
      if (!response.ok || !data.success) throw new Error(data.error || "World uplink failed.");

      if (data.self) {
        setSelf(data.self);
        if (!connected) {
          const initial = { x: data.self.x, y: data.self.y };
          setDisplayPos(initial);
          displayPosRef.current = initial;
        }
      }
      setPlayers(data.players ?? []);
      setNodes(data.nodes ?? []);
      setConnected(true);
      if (!silent) setError("");
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "World uplink failed.");
    }
  }

  useEffect(() => {
    void loadWorld();
    const timer = window.setInterval(() => void loadWorld(true), 2500);
    return () => {
      window.clearInterval(timer);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) return;
    const left = (displayPos.x / 100) * world.offsetWidth - viewport.clientWidth / 2;
    const top = (displayPos.y / 100) * world.offsetHeight - viewport.clientHeight / 2;
    viewport.scrollTo({ left, top, behavior: "auto" });
  }, [displayPos]);

  useEffect(() => {
    if (activeNode) return;
    const nearby = nodes.find((node) => distance(displayPos, node) <= 2.3);
    if (nearby) setActiveNode(nearby);
  }, [displayPos, nodes, activeNode]);

  async function persistPosition(x: number, y: number) {
    const response = await fetch("/api/events/operation-cleanse/nanite-break/position", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    });
    const data = await readJson<WorldResponse>(response);
    if (!response.ok || !data.success) throw new Error(data.error || "Signal movement rejected.");
    if (data.self) setSelf(data.self);
  }

  function travelTo(x: number, y: number) {
    if (!insidePolygon(x, y) || activeNode || clearing) return;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const start = { ...displayPosRef.current };
    const dist = distance(start, { x, y });
    const duration = Math.max(450, Math.min(4200, dist * 62));
    const started = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = {
        x: start.x + (x - start.x) * eased,
        y: start.y + (y - start.y) * eased,
      };
      displayPosRef.current = next;
      setDisplayPos(next);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(frame);
      } else {
        animationRef.current = null;
        void persistPosition(x, y).catch((err) =>
          setError(err instanceof Error ? err.message : "Signal movement rejected."),
        );
      }
    };

    animationRef.current = requestAnimationFrame(frame);
  }

  function handleMapPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const world = worldRef.current;
    if (!world) return;
    const rect = world.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    travelTo(x, y);
  }

  async function finishEncounter() {
    if (!activeNode || clearing) return;
    setClearing(true);
    setError("");
    try {
      const response = await fetch(
        `/api/events/operation-cleanse/nanite-break/encounters/${encodeURIComponent(activeNode.id)}/clear`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await readJson<ClearResponse>(response);
      if (!response.ok || !data.success) throw new Error(data.error || "Encounter clear rejected.");
      setReward(data);
      setActiveNode(null);
      await loadWorld(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encounter clear rejected.");
    } finally {
      setClearing(false);
    }
  }

  const activeImage = activeNode ? imageByName[encounterFilename(activeNode)] : null;

  return (
    <main className="opnb-page">
      <TopBar />

      <header className="opnb-hud">
        <div>
          <span>OPERATION: CLEANSE // PUBLIC ACTIVITY</span>
          <h1>Operation: Nanite Break</h1>
        </div>
        <div className="opnb-hud-status">
          <span>WEAPON SOURCE // OPNB</span>
          <strong>{nodes.length} / 7 ACTIVE SIGNALS</strong>
        </div>
      </header>

      <section className="opnb-viewport" ref={viewportRef}>
        <div
          className="opnb-map-world"
          ref={worldRef}
          onPointerDown={handleMapPointer}
          role="application"
          aria-label="Plaguelands traversal map. Click or tap inside the gold perimeter to move."
        >
          <img className="opnb-map-image" src={mapImage} alt="" draggable={false} />
          <div className="opnb-map-vignette" />

          {nodes.map((node) => (
            <div
              key={node.id}
              className={`opnb-encounter-signal ${node.kind}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <i />
              <span>{node.kind === "hidden" ? "UNKNOWN" : "ENCOUNTER"}</span>
            </div>
          ))}

          {players
            .filter((p) => p.userId !== self?.userId)
            .map((player) => (
              <div
                key={player.userId}
                className="opnb-player-signal other"
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
              >
                <i />
                <span>{player.globalName || player.username}</span>
              </div>
            ))}

          <div
            className="opnb-player-signal self"
            style={{ left: `${displayPos.x}%`, top: `${displayPos.y}%` }}
          >
            <i />
            <span>PLAYER SIGNAL</span>
          </div>
        </div>
      </section>

      <footer className="opnb-footer">
        <div>
          <span className={connected ? "online" : ""}>● {connected ? "PUBLIC UPLINK" : "CONNECTING"}</span>
          <span>CLICK / TAP MAP TO MOVE</span>
        </div>
        <strong>THE CAMERA FOLLOWS YOUR SIGNAL</strong>
      </footer>

      {error && <div className="opnb-toast error">{error}</div>}

      {activeNode && (
        <div className="opnb-encounter-overlay">
          <section className="opnb-encounter-card">
            {activeImage && <img src={activeImage} alt="" />}
            <div className="opnb-encounter-content">
              <span>
                {activeNode.kind === "hidden"
                  ? "HIDDEN SIGNAL // TRIPLE REWARDS"
                  : "SIVA ENCOUNTER"}
              </span>
              <h2>{activeNode.encounter.replaceAll("_", " ").toUpperCase()}</h2>

              {activeNode.kind === "normal" && <NormalMinigame onWin={finishEncounter} />}
              {activeNode.encounter === "clear" && <ClearMinigame onWin={finishEncounter} />}
              {activeNode.encounter === "cyclone" && <CycloneMinigame onWin={finishEncounter} />}
              {activeNode.encounter === "defense" && <DefenseMinigame onWin={finishEncounter} />}
              {activeNode.encounter === "infiltrate" && <InfiltrateMinigame onWin={finishEncounter} />}

              {clearing && <div className="opnb-resolving">RESOLVING ENCOUNTER...</div>}
            </div>
          </section>
        </div>
      )}

      {reward && (
        <div className="opnb-reward-overlay" onClick={() => setReward(null)}>
          <section onClick={(e) => e.stopPropagation()}>
            <span>ENCOUNTER CLEARED</span>
            <h2>REWARDS ACQUIRED</h2>
            <div className="opnb-reward-list">
              {Object.entries(reward.rewards ?? {}).map(([name, amount]) => (
                <div key={name}><span>{name}</span><strong>+{amount.toLocaleString()}</strong></div>
              ))}
              <div><span>XP</span><strong>+{(reward.xp ?? 0).toLocaleString()}</strong></div>
              {reward.weapon?.dropped && reward.weapon.name && (
                <div className="weapon"><span>WEAPON // OPNB</span><strong>{reward.weapon.name}</strong></div>
              )}
            </div>
            <button type="button" onClick={() => setReward(null)}>RETURN TO PLAGUELANDS</button>
          </section>
        </div>
      )}
    </main>
  );
}
