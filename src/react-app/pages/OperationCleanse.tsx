import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import "./OperationCleanse.css";

const CLEANSE_TARGET = 777_777;

type CleanseProgress = {
  progress: number;
  target?: number;
  completed?: boolean;
};

export default function OperationCleanse() {
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/events/operation-cleanse", {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as CleanseProgress;
      })
      .then((data) => {
        if (!cancelled && data && Number.isFinite(data.progress)) {
          setProgress(Math.max(0, Math.min(CLEANSE_TARGET, data.progress)));
        }
      })
      .catch(() => {
        // Keep the page usable while the community-progress endpoint is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const percentage =
    progress === null
      ? 0
      : Math.min(100, (progress / CLEANSE_TARGET) * 100);

  function openActivity(activity: "nanite-break" | "archons-forge") {
    window.location.href = `/events/operation-cleanse/${activity}`;
  }

  return (
    <main className="cleanse-screen">
      <TopBar />

      <div className="cleanse-page">
        <section className="cleanse-hero">
          <div className="cleanse-hero-grid" aria-hidden="true" />
          <div className="cleanse-hero-scan" aria-hidden="true" />

          <div className="cleanse-hero-copy">
            <span className="cleanse-kicker">PLAGUELANDS // COMMUNITY OPERATION</span>
            <h1>Operation: CLEANSE</h1>
            <p>
              Enter the Plaguelands. Break the infestation, survive the Forge,
              and push the community toward a complete cleanse.
            </p>
          </div>

          <div className="cleanse-status">
            <span><i /> OPERATION ACTIVE</span>
            <strong>THE PLAGUELANDS</strong>
          </div>
        </section>

        <section className="cleanse-progress-panel">
          <div className="cleanse-progress-heading">
            <div>
              <span>COMMUNITY OBJECTIVE</span>
              <h2>Cleanse the Plaguelands</h2>
            </div>

            <div className="cleanse-progress-value">
              {progress === null ? (
                <strong>SYNCING...</strong>
              ) : (
                <>
                  <strong>{progress.toLocaleString()}</strong>
                  <span>/ {CLEANSE_TARGET.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>

          <div
            className="cleanse-progress-track"
            role="progressbar"
            aria-label="Operation CLEANSE community progress"
            aria-valuemin={0}
            aria-valuemax={CLEANSE_TARGET}
            aria-valuenow={progress ?? 0}
          >
            <div
              className="cleanse-progress-fill"
              style={{ width: `${percentage}%` }}
            />
            <div className="cleanse-progress-glow" style={{ left: `${percentage}%` }} />
          </div>

          <div className="cleanse-progress-meta">
            <span>{progress === null ? "COMMUNITY NETWORK // CONNECTING" : `${percentage.toFixed(2)}% CLEANSED`}</span>
            <span>TARGET // 777,777</span>
          </div>
        </section>

        <section className="cleanse-activities">
          <div className="cleanse-section-heading">
            <div>
              <span>PLAGUELANDS OPERATIONS</span>
              <h2>Choose an activity</h2>
            </div>
            <p>Every successful run contributes to the community cleanse.</p>
          </div>

          <div className="cleanse-activity-grid">
            <button
              className="cleanse-activity-card nanite"
              type="button"
              onClick={() => openActivity("nanite-break")}
            >
              <span className="cleanse-card-index">01 // EXPLORATION</span>

              <span className="cleanse-card-body">
                <span className="cleanse-card-eyebrow">PLAGUELANDS FIELD OPERATION</span>
                <strong>Operation: Nanite Break</strong>
                <span className="cleanse-card-description">
                  Explore the Plaguelands through a branching field run. Discover
                  new nodes, confront encounters, recover materials, and hunt for
                  hidden rewards.
                </span>
              </span>

              <span className="cleanse-card-stats">
                <span><small>MAX MOVES</small><b>12</b></span>
                <span><small>ROLE</small><b>EXPLORE</b></span>
              </span>

              <span className="cleanse-card-enter">
                <span>ENTER NANITE BREAK</span><b>→</b>
              </span>
            </button>

            <button
              className="cleanse-activity-card forge"
              type="button"
              onClick={() => openActivity("archons-forge")}
            >
              <span className="cleanse-card-index">02 // SURVIVAL</span>

              <span className="cleanse-card-body">
                <span className="cleanse-card-eyebrow">SIVA COMBAT ARENA</span>
                <strong>Archon's Forge</strong>
                <span className="cleanse-card-description">
                  Survive three escalating waves. Enemies relocate as the Forge
                  shifts around you, forcing rapid target acquisition until the
                  final wave is cleared.
                </span>
              </span>

              <span className="cleanse-card-stats">
                <span><small>WAVES</small><b>3</b></span>
                <span><small>ROLE</small><b>SURVIVE</b></span>
              </span>

              <span className="cleanse-card-enter">
                <span>ENTER ARCHON'S FORGE</span><b>→</b>
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
