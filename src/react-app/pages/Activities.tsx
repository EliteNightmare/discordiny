import { useEffect, useState } from "react";
import "./Activities.css";

type Activity = {
  name: string;
  type: string;
  destination?: string;
  weapon_source?: string;
  reward_table?: string;
  unique_material?: string;
  encounters?: string[];
};

type ActivitiesData = Record<
  string,
  Record<string, Activity>
>;

type ActivitiesResponse = {
  activities: ActivitiesData;
};

const CATEGORY_LABELS: Record<string, string> = {
  raids: "Raids",
  dungeons: "Dungeons",
  infiltrations: "Infiltrations",
  showdowns: "Showdowns",
  crawls: "Crawls",
  strikes: "Strikes",
  nightfalls: "Nightfalls",
  gms: "Grandmasters",
  daily: "Daily Activities",
};

const CATEGORY_ORDER = [
  "raids",
  "dungeons",
  "infiltrations",
  "showdowns",
  "crawls",
  "strikes",
  "nightfalls",
  "gms",
  "daily",
];

export default function Activities() {
  const [activities, setActivities] =
    useState<ActivitiesData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadActivities() {
      try {
        const response = await fetch(
          "/api/game/activities"
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load activities (${response.status})`
          );
        }

        const data =
          await response.json<ActivitiesResponse>();

        setActivities(data.activities);
      } catch (err) {
        console.error(
          "Failed to load activities:",
          err
        );

        setError(
          "Unable to load activities."
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, []);

  if (loading) {
    return (
      <main className="activities-page">
        <div className="activities-loading">
          Loading activities...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="activities-page">
        <div className="activities-error">
          {error}
        </div>
      </main>
    );
  }

  if (!activities) {
    return (
      <main className="activities-page">
        <div className="activities-empty">
          No activities found.
        </div>
      </main>
    );
  }

  return (
    <main className="activities-page">
      <header className="activities-header">
        <h1>Activities</h1>

        <p>
          Choose an activity to begin.
        </p>
      </header>

      {CATEGORY_ORDER.map((category) => {
        const categoryActivities =
          activities[category];

        if (!categoryActivities) {
          return null;
        }

        return (
          <section
            className="activities-category"
            key={category}
          >
            <h2>
              {CATEGORY_LABELS[category] ??
                category}
            </h2>

            <div className="activities-grid">
              {Object.entries(
                categoryActivities
              ).map(
                ([activityId, activity]) => (
                  <article
                    className="activity-card"
                    key={activityId}
                  >
                    <h3>
                      {activity.name ||
                        activityId}
                    </h3>

                    <p>
                      Type:{" "}
                      {activity.type}
                    </p>

                    {activity.destination && (
                      <p>
                        Destination:{" "}
                        {
                          activity.destination
                        }
                      </p>
                    )}

                    {activity.encounters &&
                      activity.encounters
                        .length > 0 && (
                        <p>
                          Encounters:{" "}
                          {
                            activity
                              .encounters
                              .length
                          }
                        </p>
                      )}
                  </article>
                )
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
