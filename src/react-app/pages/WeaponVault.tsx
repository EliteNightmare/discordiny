import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";
import VaultMaterials from "../components/arsenal/VaultMaterials";
import VaultTransition from "../components/arsenal/VaultTransition";

import {
  getVaultActivity,
  getVaultCategory,
} from "../data/vaultCategories";

import "./WeaponVault.css";

type WeaponTier =
  | "normal"
  | "adept";

type WeaponVaultProps = {
  categorySlug: string;
  activitySlug?: string;
};

type WeaponData = {
  name: string;
  rarity: string | null;
  source: string | null;
  activityType: string | null;
  owned: boolean;
  masterwork: number;
};

type WeaponResponse = {
  authenticated: boolean;
  source?: string;
  weapons: WeaponData[];
};

type ProfileResponse = {
  authenticated: boolean;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

type VisibleWeapon =
  WeaponData & {
    image: string | null;
  };

/*
 * Weapon icons.
 */
const weaponImages =
  import.meta.glob(
    "../assets/icons/weapons/**/*.png",
    {
      eager: true,
      import: "default",
      query: "?url",
    },
  ) as Record<string, string>;

/*
 * Activity banners.
 *
 * Examples:
 *
 * ../assets/activitybanners/lw.png
 * ../assets/activitybanners/dsc.png
 * ../assets/activitybanners/vog.png
 */
const activityBanners =
  import.meta.glob(
    "../assets/activitybanners/*.png",
    {
      eager: true,
      import: "default",
      query: "?url",
    },
  ) as Record<string, string>;

function normalizeName(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ");
}

function isAdeptWeapon(
  weaponName: string,
): boolean {
  return weaponName
    .trim()
    .toLowerCase()
    .endsWith("(adept)");
}

function findWeaponImage(
  source: string,
  weaponName: string,
): string | null {
  const normalizedDesired =
    normalizeName(
      weaponName,
    );

  const sourceSegment =
    `/icons/weapons/${source.toLowerCase()}/`;

  for (
    const [path, imageUrl]
    of Object.entries(
      weaponImages,
    )
  ) {
    const normalizedPath =
      path.replace(
        /\\/g,
        "/",
      );

    const lowerPath =
      normalizedPath.toLowerCase();

    if (
      !lowerPath.includes(
        sourceSegment,
      )
    ) {
      continue;
    }

    const filenameWithExtension =
      normalizedPath
        .split("/")
        .pop();

    if (
      !filenameWithExtension
    ) {
      continue;
    }

    const filename =
      filenameWithExtension.replace(
        /\.png$/i,
        "",
      );

    if (
      normalizeName(
        filename,
      ) ===
      normalizedDesired
    ) {
      return imageUrl;
    }
  }

  return null;
}

function findActivityBanner(
  source: string,
): string | null {
  const desiredFilename =
    `${source.toLowerCase()}.png`;

  for (
    const [path, imageUrl]
    of Object.entries(
      activityBanners,
    )
  ) {
    const normalizedPath =
      path.replace(
        /\\/g,
        "/",
      );

    const filename =
      normalizedPath
        .split("/")
        .pop()
        ?.toLowerCase();

    if (
      filename ===
      desiredFilename
    ) {
      return imageUrl;
    }
  }

  return null;
}

function WeaponVault({
  categorySlug,
  activitySlug,
}: WeaponVaultProps) {
  const category =
    getVaultCategory(
      categorySlug,
    );

  const activity =
    activitySlug
      ? getVaultActivity(
          categorySlug,
          activitySlug,
        )
      : undefined;

  const weaponSource =
    activity?.weaponSource ??
    category?.directSource ??
    null;

  const collectionName =
    activity?.name ??
    category?.name ??
    "Weapon Vault";

  const activityBanner =
    weaponSource
      ? findActivityBanner(
          weaponSource,
        )
      : null;

  const [tier, setTier] =
    useState<WeaponTier>(
      "normal",
    );

  const [weapons, setWeapons] =
    useState<WeaponData[]>(
      [],
    );

  const [profile, setProfile] =
    useState<ProfileResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [gridKey, setGridKey] =
    useState(0);

  useEffect(() => {
    if (!weaponSource) {
      setLoading(false);
      return;
    }

    async function loadWeaponVault() {
      try {
        setLoading(true);
        setError("");

        const weaponUrl =
          `/api/game/weapons?source=${encodeURIComponent(
            weaponSource as string,
          )}`;

        const [
          weaponResponse,
          profileResponse,
        ] = await Promise.all([
          fetch(
            weaponUrl,
            {
              credentials:
                "include",
            },
          ),

          fetch(
            "/api/game/profile",
            {
              credentials:
                "include",
            },
          ),
        ]);

        const weaponResult =
          (await weaponResponse.json()) as WeaponResponse;

        const profileResult =
          (await profileResponse.json()) as ProfileResponse;

        if (
          !weaponResponse.ok ||
          !weaponResult.authenticated
        ) {
          throw new Error(
            "Failed to load weapon collection.",
          );
        }

        if (
          !profileResponse.ok ||
          !profileResult.authenticated
        ) {
          throw new Error(
            "Failed to load Vault materials.",
          );
        }

        if (
          Array.isArray(
            weaponResult.weapons,
          )
        ) {
          setWeapons(
            weaponResult.weapons,
          );
        } else {
          setWeapons([]);
        }

        setProfile(
          profileResult,
        );
      } catch (err) {
        if (
          err instanceof Error
        ) {
          setError(
            err.message,
          );
        } else {
          setError(
            "Failed to load weapon vault.",
          );
        }
      } finally {
        setLoading(false);
      }
    }

    void loadWeaponVault();
  }, [weaponSource]);

  const visibleWeapons =
    useMemo<VisibleWeapon[]>(
      () => {
        if (!weaponSource) {
          return [];
        }

        const filteredWeapons =
          weapons.filter(
            (weapon) => {
              const adept =
                isAdeptWeapon(
                  weapon.name,
                );

              if (
                tier ===
                "adept"
              ) {
                return adept;
              }

              return !adept;
            },
          );

        return filteredWeapons.map(
          (weapon) => {
            const image =
              findWeaponImage(
                weaponSource,
                weapon.name,
              );

            return {
              ...weapon,
              image,
            };
          },
        );
      },
      [
        weapons,
        weaponSource,
        tier,
      ],
    );

  function navigate(
    path: string,
  ) {
    window.location.href =
      path;
  }

  function changeTier(
    nextTier: WeaponTier,
  ) {
    if (
      nextTier === tier
    ) {
      return;
    }

    setTier(
      nextTier,
    );

    setGridKey(
      (current) =>
        current + 1,
    );
  }

  if (
    !category ||
    !weaponSource
  ) {
    return (
      <div className="weapon-vault-screen">
        <TopBar />

        <div className="weapon-vault-page">
          <div className="weapon-vault-status weapon-vault-status-error">
            Weapon collection not
            found.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="weapon-vault-screen">
        <TopBar />

        <div className="weapon-vault-page">
          <div className="weapon-vault-status">
            Loading weapon
            collection...
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
      <div className="weapon-vault-screen">
        <TopBar />

        <div className="weapon-vault-page">
          <div className="weapon-vault-status weapon-vault-status-error">
            {error ||
              "Failed to load weapon vault."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="weapon-vault-screen">
      <TopBar />

      <div className="weapon-vault-page">
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
            <section
              className={
                activityBanner
                  ? "weapon-vault-block weapon-vault-block-banner"
                  : "weapon-vault-block"
              }
              style={
                activityBanner
                  ? {
                      backgroundImage:
                        `linear-gradient(
                          180deg,
                          rgba(7, 9, 14, 0.58) 0%,
                          rgba(7, 9, 14, 0.78) 38%,
                          rgba(7, 9, 14, 0.95) 100%
                        ),
                        url("${activityBanner}")`,
                    }
                  : undefined
              }
            >
              <div className="weapon-vault-top">
                <button
                  type="button"
                  className="weapon-vault-back"
                  onClick={() =>
                    navigate(
                      `/vault/${category.slug}`,
                    )
                  }
                >
                  ‹ {category.name}
                </button>

                <span className="weapon-vault-eyebrow">
                  LEGENDARY VAULT
                </span>

                <div className="weapon-vault-heading">
                  <div>
                    <h1>
                      {
                        collectionName
                      }
                    </h1>

                    <p>
                      Weapon Collection
                    </p>
                  </div>

                  <div
                    className={
                      tier ===
                      "adept"
                        ? "weapon-tier-switch weapon-tier-switch-adept"
                        : "weapon-tier-switch"
                    }
                    role="group"
                    aria-label="Weapon tier"
                  >
                    <div
                      className="weapon-tier-slider"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      className={
                        tier ===
                        "normal"
                          ? "weapon-tier-option active"
                          : "weapon-tier-option"
                      }
                      aria-pressed={
                        tier ===
                        "normal"
                      }
                      onClick={() =>
                        changeTier(
                          "normal",
                        )
                      }
                    >
                      NORMAL
                    </button>

                    <button
                      type="button"
                      className={
                        tier ===
                        "adept"
                          ? "weapon-tier-option active"
                          : "weapon-tier-option"
                      }
                      aria-pressed={
                        tier ===
                        "adept"
                      }
                      onClick={() =>
                        changeTier(
                          "adept",
                        )
                      }
                    >
                      ADEPT
                    </button>
                  </div>
                </div>
              </div>

              <div
                key={
                  gridKey
                }
                className="weapon-vault-grid"
              >
                {visibleWeapons.length >
                0 ? (
                  visibleWeapons.map(
                    (weapon) => {
                      const itemClass =
                        weapon.owned
                          ? "weapon-vault-item weapon-vault-item-owned"
                          : "weapon-vault-item weapon-vault-item-locked";

                      return (
                        <div
                          key={
                            weapon.name
                          }
                          className={
                            itemClass
                          }
                        >
                          <div className="weapon-vault-image-frame">
                            {weapon.image ? (
                              <img
                                src={
                                  weapon.image
                                }
                                alt={
                                  weapon.name
                                }
                                className="weapon-vault-image"
                              />
                            ) : (
                              <div className="weapon-vault-image-missing">
                                ?
                              </div>
                            )}

                            {!weapon.owned && (
                              <div
                                className="weapon-vault-lock-overlay"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <div className="weapon-vault-item-info">
                            <strong>
                              {
                                weapon.name
                              }
                            </strong>

                            <span>
                              {tier ===
                              "adept"
                                ? "Adept"
                                : "Normal"}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )
                ) : (
                  <div className="weapon-vault-empty">
                    No{" "}
                    {tier ===
                    "adept"
                      ? "Adept"
                      : "Normal"}{" "}
                    weapons were found
                    for this collection.
                  </div>
                )}
              </div>
            </section>
          </VaultTransition>
        </ArsenalLayout>
      </div>
    </div>
  );
}

export default WeaponVault;
