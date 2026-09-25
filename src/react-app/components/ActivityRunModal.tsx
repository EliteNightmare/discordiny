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

type Phase = "ready" | "loading" | "encounters" | "weapon" | "complete" | "error";

const ENCOUNTER_MS = 2400;
const WEAPON_MS = 2200;

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.trunc(value));
}

export default function ActivityRunModal({ activity, backgroundImage, onClose, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [payload, setPayload] = useState<RunResponse | null>(null);
  const [visible, setVisible] = useState(0);
  const [error, setError] = useState("");
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const result = payload?.result;
  const active = result?.encounters[Math.max(0, visible - 1)] ?? null;
  const busy = phase === "loading" || phase === "encounters" || phase === "weapon";

  function clearTimers() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }

  function finish() {
    if (finished.current) return;
    finished.current = true;
    onFinished?.();
  }

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      clearTimers();
    };
  }, [busy]);

  function reveal(run: RunResult) {
    if (!run.encounters.length) {
      setPhase("complete");
      finish();
      return;
    }

    setVisible(1);
    run.encounters.slice(1).forEach((_, index) => {
      timers.current.push(window.setTimeout(() => setVisible(index + 2), ENCOUNTER_MS * (index + 1)));
    });

    timers.current.push(window.setTimeout(() => {
      if (run.fullClear && run.weapon.rolled) {
        setPhase("weapon");
        timers.current.push(window.setTimeout(() => {
          setPhase("complete");
          finish();
        }, WEAPON_MS));
      } else {
        setPhase("complete");
        finish();
      }
    }, ENCOUNTER_MS * run.encounters.length));
  }

  async function begin() {
    if (busy) return;
    clearTimers();
    finished.current = false;
    setError("");
    setPayload(null);
    setVisible(0);
    setPhase("loading");

    try {
      const response = await fetch("/api/game/activity/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id }),
      });
      const data = (await response.json()) as RunResponse;
      if (!response.ok || !data.success || !data.result) {
        throw new Error(data.error || "Unable to begin activity.");
      }
      setPayload(data);
      setPhase("encounters");
      reveal(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to begin activity.");
      setPhase("error");
    }
  }

  return (
    <div className="activity-run-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget && !busy) onClose();
    }}>
      <section
        className={`activity-run-modal phase-${phase}`}
        role="dialog"
        aria-modal="true"
        aria-label={activity.name}
        style={backgroundImage ? {
          backgroundImage: `linear-gradient(90deg,rgba(5,7,12,.98),rgba(5,7,12,.92) 46%,rgba(5,7,12,.55)),url("${backgroundImage}")`,
        } : undefined}
      >
        <div className="activity-run-scan" aria-hidden="true" />
        <header className="activity-run-header">
          <div>
            <span>{activity.type.toUpperCase()}{activity.destination ? ` • ${activity.destination.toUpperCase()}` : ""}</span>
            <h2>{activity.name}</h2>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close">×</button>
        </header>

        {phase === "ready" && (
          <div className="activity-run-ready">
            <span>FIRETEAM SIMULATION</span>
            <strong>{activity.encounters?.length ?? 0} ENCOUNTERS</strong>
            <p>The server decides the entire run when you begin. The sequence below only reveals those results.</p>
            <button type="button" onClick={() => void begin()}>BEGIN ACTIVITY</button>
          </div>
        )}

        {phase === "loading" && (
          <div className="activity-run-loading">
            <i aria-hidden="true" />
            <span>INITIALIZING ACTIVITY</span>
            <strong>CALCULATING FIRETEAM OUTCOME</strong>
          </div>
        )}

        {phase === "error" && (
          <div className="activity-run-error">
            <span>ACTIVITY INTERRUPTED</span>
            <strong>{error}</strong>
            <button type="button" onClick={() => void begin()}>TRY AGAIN</button>
          </div>
        )}

        {result && (phase === "encounters" || phase === "weapon" || phase === "complete") && (
          <div className="activity-run-body">
            <div className="activity-run-stats">
              <div><span>GUARDIAN</span><strong>{payload?.player?.name ?? "Guardian"}</strong></div>
              <div><span>POWER</span><strong>{number(result.power)}</strong></div>
              <div><span>CLEAR CHANCE</span><strong>{result.successChance.toFixed(1)}%</strong></div>
            </div>

            {phase === "encounters" && active && (
              <div className={`activity-run-encounter ${active.cleared ? "clear" : "wipe"}`} key={active.index}>
                <div className="activity-run-progress">
                  <span>ENCOUNTER {active.index + 1} / {result.totalEncounters}</span>
                  <div><i style={{ width: `${((active.index + 1) / result.totalEncounters) * 100}%` }} /></div>
                </div>
                <span className="activity-run-status">{active.cleared ? "ENCOUNTER CLEARED" : "FIRETEAM WIPED"}</span>
                <h3>{active.name}</h3>
                <b className="activity-run-stamp">{active.cleared ? "CLEAR" : "WIPE"}</b>
                <div className="activity-run-rewards">
                  <span>{active.partialRewards ? "PARTIAL REWARDS" : "REWARDS ACQUIRED"}</span>
                  <div>
                    {Object.entries(active.rewards).map(([name, amount]) => (
                      <article key={name}><small>{name.toUpperCase()}</small><strong>+{number(amount)}</strong></article>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phase === "weapon" && (
              <div className="activity-run-weapon">
                <span>FULL CLEAR</span>
                <h3>WEAPON ROLL</h3>
                <i aria-hidden="true" />
                <p>Resolving {result.weaponSource.toUpperCase()} weapon pool...</p>
              </div>
            )}

            {phase === "complete" && (
              <div className={`activity-run-summary ${result.fullClear ? "clear" : "wipe"}`}>
                <span>{result.fullClear ? "ACTIVITY COMPLETE" : "ACTIVITY ENDED"}</span>
                <h3>{result.fullClear ? "FULL CLEAR" : "FIRETEAM WIPE"}</h3>
                {!result.fullClear && result.wipedAt && <p>Wiped at <strong>{result.wipedAt}</strong></p>}
                {result.fullClear && (
                  <div className="activity-run-final">
                    <article><span>COMPLETION XP</span><strong>+{number(result.xp)}</strong></article>
                    <article className={result.weapon.dropped ? "weapon-drop" : ""}>
                      <span>WEAPON ROLL</span>
                      <strong>{result.weapon.dropped && result.weapon.name ? result.weapon.name : "NO WEAPON DROP"}</strong>
                      {result.weapon.dropped && <small>{result.weapon.adept ? "ADEPT" : result.weapon.rarity ?? "WEAPON"}</small>}
                    </article>
                  </div>
                )}
                <button type="button" onClick={onClose}>RETURN TO DIRECTOR</button>
              </div>
            )}

            <div className="activity-run-history">
              {result.encounters.slice(0, visible).map((encounter) => (
                <div key={encounter.index} className={encounter.cleared ? "clear" : "wipe"}>
                  <span>{encounter.index + 1}</span><strong>{encounter.name}</strong><small>{encounter.cleared ? "CLEAR" : "WIPE"}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
