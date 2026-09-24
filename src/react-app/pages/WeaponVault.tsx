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

type WeaponTier = "normal" | "adept";

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
  source: string;
  weapons: WeaponData[];
};

type ProfileResponse = {
  authenticated: boolean;
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

/*
 * Vite imports every weapon PNG at build time.
 *
 * Example:
 *
 * ../assets/weapons/lw/Apex Predator.png
 * ../assets/weapons/lw/Apex Predator (Adept).png
 */
const weaponImages = import.meta.glob(
  "../assets/weapons/**/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

/*
 * Normalize names for matching D1 weapon names
 * against PNG filenames.
 */
function normalizeName(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ");
}

/*
 * Returns true when the D1 weapon itself
 * is an Adept weapon.
 *
 * Example:
 *
 * Apex Predator
 * -> false
 *
 * Apex Predator (Adept)
 * -> true
 */
function isAdeptWeapon(
  weaponName: string,
): boolean {
  return weaponName
    .trim()
    .toLowerCase()
    .endsWith("(adept)");
}

/*
 * Find the PNG that exactly matches the
 * D1 weapon name inside the weapon source.
 *
 * D1:
 * Apex Predator
 *
 * File:
 * weapons/lw/Apex Predator.png
 *
 *
 * D1:
 * Apex Predator (Adept)
 *
 * File:
 * weapons/lw/Apex Predator (Adept).png
 */
function findWeaponImage(
  source: string,
  weaponName: string,
): string | null {
  const normalizedDesired =
    normalizeName(weaponName);

  const sourceSegment =
    `/weapons/${source.toLowerCase()}/`;

  for (
    const [path, imageUrl]
    of Object.entries(weaponImages)
  ) {
    const normalizedPath =
      path.replace(/\\/g, "/");

    if (
      !normalizedPath
        .toLowerCase()
        .includes(sourceSegment)
    ) {
      continue;
    }

    const filename =
      normalizedPath
        .split("/")
        .pop()
        ?.replace(/\.png$/i, "") ?? "";

    if (
      normalizeName(filename) ===
      normalizedDesired
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
    getVaultCategory(categorySlug);

  const activity = activitySlug
    ? getVaultActivity(
        categorySlug,
        activitySlug,
      )
    : undefined;

  /*
   * Categories with activities:
   *
   * /vault/raids/last-wish
   * -> activity.weaponSource = "lw"
   *
   * Direct categories:
   *
   * Strikes
   * -> category.directSource = "strike"
   */
  const weaponSource =
    activity?.weaponSource ??
    category?.directSource ??
    null;

  const collectionName =
    activity?.name ??
    category?.name ??
    "Weapon Vault";

  const [tier, setTier] =
    useState<WeaponTier>("normal");

  const [weapons, setWeapons] =
    useState<WeaponData[]>([]);

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

  /*
   * Load weapon catalog + ownership
   * and Vault materials.
   */
  useEffect(() => {
    if (!weaponSource) {
      setLoading(false);
      return;
    }

    async function loadWeaponVault() {
      try {
        setLoading(true);
        setError("");

        const [
          weaponResponse,
          profileResponse,
        ] = await Promise.all([
          fetch(
            `/api/game/weapons?source=${encodeURIComponent(
              weaponSource!,
            )}`,
            {
              credentials: "include",
            },
          ),

          fetch(
            "/api/game/profile",
            {
              credentials: "include",
            },
          ),
        ]);

        const weaponResult =
          (await weaponResponse.json())
            as WeaponResponse;

        const profileResult =
          (await profileResponse.json())
            as ProfileResponse;

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
            "Failed to load inventory.",
          );
        }

        setWeapons(
          Array.isArray(
            weaponResult.weapons,
          )
            ? weaponResult.weapons
            : [],
        );

        setProfile(
          profileResult,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load weapon vault.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadWeaponVault();
  }, [weaponSource]);

  /*
   * NORMAL:
   *
   * Only show database rows that DO NOT
   * end in "(Adept)".
   *
   * ADEPT:
   *
   * Only show database rows that DO
   * end in "(Adept)".
   */
  const visibleWeapons =
    useMemo(() => {
      if (!weaponSource) {
        return [];
      }

      return weapons
        .filter((weapon) => {
          const adept =
            isAdeptWeapon(
              weapon.name,
            );

          if (tier === "adept") {
            return adept;
          }

          return !adept;
        })
        .map((weapon) => ({
          ...weapon,

          image:
            findWeaponImage(
              weaponSource,
              weapon.name,
            ),
        }));
    }, [
      weapons,
      weaponSource,
      tier,
    ]);

  function navigate(
    path: string,
  ) {
    window.location.href = path;
  }

  /*
   * Switch Normal / Adept.
   *
   * gridKey causes the weapon-grid
   * animation to replay whenever the
   * selected tier changes.
   */
  function changeTier(
    nextTier: WeaponTier,
  ) {
    if (
      nextTier === tier
    ) {
      return;
    }

    setTier(nextTier);

    setGridKey(
      (current) =>
        current + 1,
    );
  }

  /*
   * Invalid weapon collection.
   */
  if (
    !category ||
    !weaponSource
  ) {
    return (
      <div className="weapon-vault-screen">
        <TopBar />

        <div className="weapon-vault-page">
          <div className="weapon-vault-status weapon-vault-status-error">
            Weapon collection not found.
          </div>
        </div>
      </div>
    );
  }

  /*
   * Loading.
   */
  if (loading) {
    return (
      <div className="weapon-vault-screen">
        <TopBar />

        <div className="weapon-vault-page">
          <div className="weapon-vault-status">
            Loading weapon collection...
          </div>
        </div>
      </div>
    );
  }

  /*
   * Error.
   */
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
            <section className="weapon-vault-block">

              {/* BACK BUTTON */}

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

                {/* HEADER */}

                <span className="weapon-vault-eyebrow">
                  LEGENDARY VAULT
                </span>

                <div className="weapon-vault-heading">
                  <div>
                    <h1>
                      {collectionName}
                    </h1>

                    <p>
                      Weapon Collection
                    </p>
                  </div>

                  {/* NORMAL / ADEPT SWITCH */}

                  <div
                    className={`weapon-tier-switch ${
                      tier === "adept"
                        ? "weapon-tier-switch-adept"
                        : ""
                    }`}
                    role="group"
                    aria-label="Weapon tier"
                  >
                    <div
                      className="weapon-tier-slider"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      className={`weapon-tier-option ${
                        tier === "normal"
                          ? "active"
                          : ""
                      }`}
                      aria-pressed={
                        tier === "normal"
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
                      className={`weapon-tier-option ${
                        tier === "adept"
                          ? "active"
                          : ""
                      }`}
                      aria-pressed={
                        tier === "adept"
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

              {/* WEAPON GRID */}

              <div
                key={gridKey}
                className="weapon-vault-grid"
              >
                {visibleWeapons.length >
                0 ? (
                  visibleWeapons.map(
                    (weapon) => (
                      <div
                        key={
                          weapon.name
                        }
                        className={`weapon-vault-item ${
                          weapon.owned
                            ? "weapon-vault-item-owned"
                            : "weapon-vault-item-locked"
                        }`}
                      >
                        {/* WEAPON IMAGE */}

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

                          {/* DARKEN UNOWNED WEAPONS */}

                          {!weapon.owned && (
                            <div
                              className="weapon-vault-lock-overlay"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        {/* WEAPON INFORMATION */}

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
                    ),
                  )
                ) : (
                  <div className="weapon-vault-empty">
                    No{" "}
                    {tier ===
                    "adept"
                      ? "Adept"
                      : "Normal"}{" "}
                    weapons were found for
                    this collection.
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
