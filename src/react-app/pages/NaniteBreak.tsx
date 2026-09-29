import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import mapImage from "../assets/siva/opnb/map.png";
import "./NaniteBreak.css";

type NodeKind = "start" | "path" | "encounter" | "cache" | "exit";

type MapNode = {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  discovered: boolean;
  cleared: boolean;
  adjacent: string[];
  encounterImage?: string | null;
};

type RunState = {
  runId: string;
  moves: number;
  maxMoves: number;
  currentNodeId: string;
  nodes: MapNode[];
  status: "active" | "complete" | "failed";
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  run?: RunState;
};

const encounterAssets = import.meta.glob(
  "../assets/siva/opnb/*.png",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

const NORMAL_ENCOUNTERS = [
  "nanitebreak_encounter_dresiks.png",
  "nanitebreak_encounter_monster.png",
  "nanitebreak_encounter_nanitecrew.png",
  "nanitebreak_encounter_perfectedsquad.png",
  "nanitebreak_encounter_rahndel.png",
  "nanitebreak_encounter_servitors.png",
  "nanitebreak_encounter_shankswarm.png",
  "nanitebreak_encounter_stealthswarm.png",
  "nanitebreak_encounter_walker.png",
] as const;

const HIDDEN_ENCOUNTERS = [
  "nanitebreak_hidden_clear.png",
  "nanitebreak_hidden_cyclone.png",
  "nanitebreak_hidden_defense.png",
  "nanitebreak_hidden_infiltrate.png",
] as const;

const encounterImageByName = Object.fromEntries(
  Object.entries(encounterAssets).map(([path, url]) => [
    path.split("/").pop()?.toLowerCase() ?? path,
    url,
  ]),
) as Record<string, string>;

function encounterImage(node: MapNode) {
  if (node.encounterImage) {
    const direct = encounterImageByName[
      node.encounterImage.split("/").pop()?.toLowerCase() ?? ""
    ];
    if (direct) return direct;
  }

  const pool =
    node.kind === "encounter"
      ? NORMAL_ENCOUNTERS
      : HIDDEN_ENCOUNTERS;

  const hash = Math.abs(
    node.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
  );

  return encounterImageByName[pool[hash % pool.length]] ?? null;
}

export default function NaniteBreak() {
  const [run, setRun] = useState<RunState | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");
  const [encounter, setEncounter] = useState<MapNode | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const currentNode = useMemo(
    () => run?.nodes.find((node) => node.id === run.currentNodeId) ?? null,
    [run],
  );

  useEffect(() => {
    void loadRun();
  }, []);

  useEffect(() => {
    if (!currentNode || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const map = viewport.querySelector<HTMLElement>(".opnb-map-world");
    if (!map) return;

    const x = (currentNode.x / 100) * map.offsetWidth;
    const y = (currentNode.y / 100) * map.offsetHeight;

    viewport.scrollTo({
      left: Math.max(0, x - viewport.clientWidth / 2),
      top: Math.max(0, y - viewport.clientHeight / 2),
      behavior: "smooth",
    });
  }, [currentNode?.id]);

  async function loadRun() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/events/operation_cleanse/nanite-break", {
        credentials: "include",
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success || !data.run) {
        throw new Error(data.error || "Unable to establish Plaguelands uplink.");
      }

      setRun(data.run);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to establish Plaguelands uplink.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startRun() {
    setMoving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/events/operation_cleanse/nanite-break/start",
        {
          method: "POST",
          credentials: "include",
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success || !data.run) {
        throw new Error(data.error || "Unable to begin Nanite Break.");
      }

      setRun(data.run);
      setEncounter(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to begin Nanite Break.");
    } finally {
      setMoving(false);
    }
  }

  async function moveTo(node: MapNode) {
    if (!run || moving || run.status !== "active") return;
    if (!currentNode?.adjacent.includes(node.id)) return;

    setMoving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/events/operation_cleanse/nanite-break/move",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: run.runId,
            nodeId: node.id,
          }),
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success || !data.run) {
        throw new Error(data.error || "Traversal failed.");
      }

      setRun(data.run);

      const landed = data.run.nodes.find(
        (candidate) => candidate.id === data.run?.currentNodeId,
      );

      if (landed?.kind === "encounter" && !landed.cleared) {
        setEncounter(landed);
      } else {
        setEncounter(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Traversal failed.");
    } finally {
      setMoving(false);
    }
  }

  const remaining = run ? Math.max(0, run.maxMoves - run.moves) : 12;

  return (
    <main className="opnb-page">
      <TopBar />

      <header className="opnb-hud">
        <div>
          <span>OPERATION: CLEANSE // FIELD ACTIVITY</span>
          <h1>Operation: Nanite Break</h1>
        </div>

        <div className="opnb-hud-status">
          <span>PUBLIC ACTIVITY // WEAPON SOURCE OPNB</span>
          <strong>{run?.nodes.length ?? 0} / 7 ACTIVE NODES</strong>
        </div>
      </header>

      <section className="opnb-viewport" ref={viewportRef}>
        <div className="opnb-map-world">
          <img className="opnb-map-image" src={mapImage} alt="Plaguelands tactical map" />

          <div className="opnb-map-vignette" aria-hidden="true" />

          {run?.nodes.map((node) => {
            const reachable =
              run.status === "active" &&
              currentNode?.adjacent.includes(node.id);

            const current = node.id === run.currentNodeId;

            return (
              <button
                key={node.id}
                type="button"
                className={[
                  "opnb-node",
                  `kind-${node.kind}`,
                  current ? "current" : "",
                  reachable ? "reachable" : "",
                  node.discovered ? "discovered" : "unknown",
                  node.cleared ? "cleared" : "",
                ].join(" ")}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                }}
                disabled={!reachable || moving}
                onClick={() => void moveTo(node)}
                aria-label={
                  current
                    ? "Current position"
                    : reachable
                      ? `Travel to ${node.kind} node`
                      : "Unreachable node"
                }
              >
                <i />
                {current && <b>YOU</b>}
              </button>
            );
          })}
        </div>
      </section>

      <footer className="opnb-footer">
        <div className="opnb-legend">
          <span><i className="path" /> ROUTE</span>
          <span><i className="encounter" /> ENCOUNTER</span>
          <span><i className="cache" /> CACHE</span>
        </div>

        <div className="opnb-orders">
          Public activity uplink active. Other Guardians can occupy the Plaguelands while encounters rotate across the map.
        </div>
      </footer>

      {(loading || !run || run.status !== "active") && (
        <div className="opnb-start-overlay">
          <section>
            <span>PLAGUELANDS // NANITE BREAK</span>
            <h2>
              {loading
                ? "ESTABLISHING UPLINK"
                : run?.status === "complete"
                  ? "OPERATION COMPLETE"
                  : "TRAVERSAL READY"}
            </h2>

            <p>
              Up to seven encounter nodes can be active across the Plaguelands. Clear a node and the network replaces it elsewhere on the map. Hidden signals are rare and considerably more valuable.
            </p>

            {error && <div className="opnb-error">{error}</div>}

            {!loading && (
              <button type="button" onClick={() => void startRun()} disabled={moving}>
                {run?.status === "complete" ? "BEGIN NEW RUN" : "BEGIN NANITE BREAK"}
              </button>
            )}
          </section>
        </div>
      )}

      {encounter && (
        <div className="opnb-encounter-overlay">
          <section className="opnb-encounter-card">
            {encounterImage(encounter) && (
              <img src={encounterImage(encounter) ?? ""} alt="" />
            )}

            <div>
              <span>SIVA CONTACT // NODE {encounter.id.toUpperCase()}</span>
              <h2>ENCOUNTER DETECTED</h2>
              <p>
                Hostile activity has surfaced at this node. Clear its minigame to claim the shifting reward package and force a replacement node to spawn elsewhere in the Plaguelands.
              </p>
              <button type="button" onClick={() => setEncounter(null)}>
                ACKNOWLEDGE
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
