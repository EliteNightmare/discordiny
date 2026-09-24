import {
  useEffect,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import VaultMaterials from "../components/arsenal/VaultMaterials";
import VaultTransition from "../components/arsenal/VaultTransition";

import {
  getVaultCategory,
} from "../data/vaultCategories";

import "./VaultCategory.css";

type VaultCategoryProps = {
  categorySlug: string;
};

type VaultProfileResponse = {
  authenticated: boolean;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

/*
 * Activity banners:
 *
 * src/react-app/assets/activitybanners/lw.png
 * src/react-app/assets/activitybanners/dsc.png
 * src/react-app/assets/activitybanners/vog.png
 * etc.
 */
const activityBanners = import.meta.glob(
  "../assets/activitybanners/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

function findActivityBanner(
  source: string,
): string | null {
  const desiredFilename =
    `${source.toLowerCase()}.png`;

  for (
    const [path, imageUrl]
    of Object.entries(activityBanners)
  ) {
    const normalizedPath =
      path.replace(/\\/g, "/");

    const filename =
      normalizedPath
        .split("/")
        .pop()
        ?.toLowerCase();

    if (
      filename === desiredFilename
    ) {
      return imageUrl;
    }
  }

  return null;
}

function getActivityLabel(
  categorySlug: string,
  weaponSource: string,
): string {
  if (
    categorySlug === "raids"
  ) {
    const dailyRaidSources =
      new Set([
        "vog",
        "kf",
        "ce",
        "udp",
      ]);

    return dailyRaidSources.has(
      weaponSource.toLowerCase(),
    )
      ? "DAILY RAID"
      : "RAID";
  }

  return "WEAPON SOURCE";
}

function VaultCategory({
  categorySlug,
}: VaultCategoryProps) {
  const category =
    getVaultCategory(
      categorySlug,
    );

  const [profile, setProfile] =
    useState<VaultProfileResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadVaultData() {
      try {
        const response =
          await fetch(
            "/api/game/profile",
            {
              credentials:
                "include",
            },
          );

        const result =
          (await response.json()) as VaultProfileResponse;

        if (
          !response.ok ||
          !result.authenticated
        ) {
          throw new Error(
            "You must be logged in to view your Vault.",
          );
        }

        setProfile(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Vault.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadVaultData();
  }, []);

  function navigate(
    path: string,
  ) {
    window.location.href =
      path;
  }

  if (!category) {
    return (
      <div className="vault-category-screen">
        <TopBar />

        <div className="vault-category-page">
          <div className="vault-category-error">
            Vault category not found.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="vault-category-screen">
        <TopBar />

        <div className="vault-category-page">
          <div className="vault-category-error">
            Loading Vault...
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !profile
  ) {
    return (
      <div className="vault-category-screen">
        <TopBar />

        <div className="vault-category-page">
          <div className="vault-category-error">
            {error ||
              "Failed to load Vault."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-category-screen">
      <TopBar />

      <div className="vault-category-page">
        <ArsenalLayout
          left={
            <VaultMaterials
              currencies={
                profile.currencies
              }
              upgradeMaterials={
                profile.upgradeMaterials
              }
            />
          }
        >
          <VaultTransition>
            <section className="vault-category-block">
              <button
                type="button"
                className="vault-category-back"
                onClick={() =>
                  navigate(
                    "/vault",
                  )
                }
              >
                ‹ Vault
              </button>

              <span className="vault-category-eyebrow">
                LEGENDARY VAULT
              </span>

              <h1>
                {category.name}
              </h1>

              <p>
                {category.description}
              </p>

              {category.directSource ? (
                <div className="vault-category-direct">
                  <span>
                    WEAPON SOURCE
                  </span>

                  <strong>
                    {category.name}
                  </strong>

                  <small>
                    Weapon vault coming next.
                  </small>
                </div>
              ) : category.activities &&
                category.activities.length >
                  0 ? (
                <div className="vault-activity-grid">
                  {category.activities.map(
                    (activity) => {
                      const banner =
                        findActivityBanner(
                          activity.weaponSource,
                        );

                      const activityLabel =
                        getActivityLabel(
                          category.slug,
                          activity.weaponSource,
                        );

                      return (
                        <button
                          key={
                            activity.slug
                          }
                          type="button"
                          className={
                            "vault-activity-card"
                          }
                          style={
                            banner
                              ? {
                                  backgroundImage:
                                    `linear-gradient(
                                      90deg,
                                      rgba(4, 6, 10, 0.86) 0%,
                                      rgba(4, 6, 10, 0.66) 48%,
                                      rgba(4, 6, 10, 0.46) 100%
                                    ),
                                    url("${banner}")`,
                                }
                              : undefined
                          }
                          onClick={() =>
                            navigate(
                              `/vault/${category.slug}/${activity.slug}`,
                            )
                          }
                        >
                          <span className="vault-activity-label">
                            {
                              activityLabel
                            }
                          </span>

                          <strong>
                            {
                              activity.name
                            }
                          </strong>

                          <span className="vault-activity-arrow">
                            ›
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="vault-category-empty">
                  No weapon sources have
                  been configured for this
                  category yet.
                </div>
              )}
            </section>
          </VaultTransition>
        </ArsenalLayout>
      </div>
    </div>
  );
}

export default VaultCategory;
