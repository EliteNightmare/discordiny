import { useEffect, useState } from "react";
import "./Profile.css";

type ProfileResponse = {
  authenticated: boolean;
  user: {
    id: number;
    discord_id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  profile: {
    level: number;
    exp: number;
    power: number;
    zone: string;
  };
  level: {
    current: number;
    max: number;
    totalXp: number;
    currentXp: number;
    nextXp: number;
    percentage: number;
  };
  power: {
    total: number;
    breakdown: {
      weapons: number;
      armor: number;
      artifacts: number;
      level: number;
    };
  };
  weapons: {
    owned: number;
    total: number;
  };
  armor: {
    helmet: string;
    arms: string;
    chest: string;
    legs: string;
  };
  artifacts: Array<{
    artifact_name: string;
    level: number;
  }>;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

function getAvatarUrl(
  discordId: string,
  avatar: string | null,
): string | null {
  if (!avatar) {
    return null;
  }

  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function Profile() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/game/profile", {
          credentials: "include",
        });

        const result = (await response.json()) as ProfileResponse;

        if (!response.ok || !result.authenticated) {
          throw new Error("You must be logged in to view your profile.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-loading">
          Loading profile...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="profile-page">
        <div className="profile-error">
          {error || "Failed to load profile."}
        </div>
      </main>
    );
  }

  const displayName =
    data.user.global_name || data.user.username;

  const avatarUrl = getAvatarUrl(
    data.user.discord_id,
    data.user.avatar,
  );

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <section className="profile-header">
          <div className="profile-identity">
            {avatarUrl ? (
              <img
                className="profile-avatar"
                src={avatarUrl}
                alt={`${displayName}'s avatar`}
              />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="profile-name-section">
              <h1>{displayName}</h1>

              <div className="profile-title">
                Title: <span>Coming Soon</span>
              </div>

              <div className="profile-destination">
                <span className="profile-label">
                  Current Destination
                </span>
                <strong>{data.profile.zone}</strong>
              </div>
            </div>
          </div>

          <div className="profile-weapons">
            <span className="profile-label">Weapons</span>
            <strong>
              {data.weapons.owned} / {data.weapons.total}
            </strong>
          </div>
        </section>

        {/* Currencies */}
        <section className="profile-block">
          <div className="profile-block-header">
            <h2>Currencies</h2>
          </div>

          <div className="currency-grid">
            <div className="currency-card">
              <span className="currency-name">
                Glimmer
              </span>
              <strong>
                {formatNumber(
                  data.currencies["Glimmer"] ?? 0,
                )}
              </strong>
            </div>

            <div className="currency-card">
              <span className="currency-name">
                Lumia Leaves
              </span>
              <strong>
                {formatNumber(
                  data.currencies["Lumia Leaves"] ?? 0,
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* Level Progress */}
        <section className="profile-block level-block">
          <div className="profile-block-header">
            <div>
              <h2>Level Progress</h2>
              <p>
                Fireteam Level {data.level.current}
              </p>
            </div>

            <div className="level-number">
              <span>Level</span>
              <strong>
                {data.level.current}
                <small> / {data.level.max}</small>
              </strong>
            </div>
          </div>

          <div className="xp-section">
            <div className="xp-header">
              <span>XP Progress</span>
              <span>
                {formatNumber(data.level.currentXp)} /{" "}
                {formatNumber(data.level.nextXp)} XP
              </span>
            </div>

            <div className="xp-bar">
              <div
                className="xp-bar-fill"
                style={{
                  width: `${data.level.percentage}%`,
                }}
              />
            </div>

            <div className="xp-footer">
              <span>
                {formatNumber(data.level.currentXp)} XP
              </span>
              <span>
                {data.level.percentage}%
              </span>
            </div>
          </div>

          <div className="level-stats">
            <div className="level-stat">
              <span>Total XP</span>
              <strong>
                {formatNumber(data.level.totalXp)}
              </strong>
            </div>

            <div className="level-stat">
              <span>Next Level</span>
              <strong>
                {data.level.current >= data.level.max
                  ? "MAX"
                  : formatNumber(data.level.nextXp)}
              </strong>
            </div>
          </div>
        </section>

        {/* Power Breakdown */}
        <section className="profile-block power-block">
          <div className="profile-block-header">
            <div>
              <h2>Power Breakdown</h2>
              <p>Your total character Power</p>
            </div>

            <div className="total-power">
              <span>Total Power</span>
              <strong>
                {formatNumber(data.power.total)}
              </strong>
            </div>
          </div>

          <div className="power-grid">
            <div className="power-card">
              <span>Weapons Power</span>
              <strong>
                {formatNumber(data.power.breakdown.weapons)}
              </strong>
            </div>

            <div className="power-card">
              <span>Armor Power</span>
              <strong>
                {formatNumber(data.power.breakdown.armor)}
              </strong>
            </div>

            <div className="power-card">
              <span>Artifact Power</span>
              <strong>
                {formatNumber(
                  data.power.breakdown.artifacts,
                )}
              </strong>
            </div>

            <div className="power-card">
              <span>Level Power</span>
              <strong>
                {formatNumber(data.power.breakdown.level)}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Profile;
