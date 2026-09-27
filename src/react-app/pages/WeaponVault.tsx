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

type WeaponOwnership = {
  owned: boolean;
  masterwork: number;
};

type WeaponData = {
  name: string;
  rarity: string | null;
  source: string | null;
  activityType: string | null;
  normal: WeaponOwnership;
  adept: WeaponOwnership;
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

type VisibleWeapon = {
  name: string;
  catalogName: string;
  rarity: string | null;
  source: string | null;
  activityType: string | null;
  owned: boolean;
  masterwork: number;
  image: string | null;
};

type MasterworkResponse = {
  success?: boolean;
  error?: string;
  weaponName?: string;
  previousMasterwork?: number;
  masterwork?: number;
  ranksGained?: number;
  maxMasterwork?: number;
  cost?: Record<string, number>;
};

const MAX_MASTERWORK = 77;

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

  const [selectedWeapon, setSelectedWeapon] =
    useState<VisibleWeapon | null>(null);

  const [masterworking, setMasterworking] =
    useState(false);

  const [masterworkError, setMasterworkError] =
    useState("");

  const [masterworkCost, setMasterworkCost] =
    useState<Record<string, number>>({});

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

        return weapons.map((weapon) => {
          const ownership =
            tier === "adept"
              ? weapon.adept
              : weapon.normal;

          const baseName =
            weapon.name
              .replace(/\s*\(Adept\)\s*$/i, "")
              .trim();

          const displayName =
            tier === "adept"
              ? `${baseName} (Adept)`
              : baseName;

          return {
            name: displayName,
            catalogName: baseName,
            rarity: weapon.rarity,
            source: weapon.source,
            activityType: weapon.activityType,
            owned: ownership.owned,
            masterwork: ownership.masterwork,
            image: findWeaponImage(
              weaponSource,
              displayName,
            ) ?? findWeaponImage(
              weaponSource,
              weapon.name,
            ),
          };
        });
      },
      [weapons, weaponSource, tier],
    );

  const collectionOwned =
    visibleWeapons.filter(
      (weapon) => weapon.owned,
    ).length;

  const collectionTotal =
    visibleWeapons.length;

  async function masterworkWeapon(amount: 1 | 10 | "max") {
    if (
      !selectedWeapon ||
      !selectedWeapon.owned ||
      selectedWeapon.masterwork >= MAX_MASTERWORK
    ) {
      return;
    }

    try {
      setMasterworking(true);
      setMasterworkError("");

      const response = await fetch(
        "/api/game/weapons/masterwork",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weaponName: selectedWeapon.name,
            amount,
          }),
        },
      );

      const result =
        (await response.json()) as MasterworkResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Masterwork failed.",
        );
      }

      const [weaponResponse, profileResponse] =
        await Promise.all([
          fetch(
            `/api/game/weapons?source=${encodeURIComponent(
              weaponSource as string,
            )}`,
            { credentials: "include" },
          ),
          fetch("/api/game/profile", {
            credentials: "include",
          }),
        ]);

      const weaponResult =
        (await weaponResponse.json()) as WeaponResponse;
      const profileResult =
        (await profileResponse.json()) as ProfileResponse;

      setWeapons(weaponResult.weapons ?? []);
      setProfile(profileResult);

      setSelectedWeapon((current) =>
        current
          ? {
              ...current,
              masterwork: result.masterwork ?? current.masterwork,
            }
          : current,
      );

      const nextMasterwork = result.masterwork ?? selectedWeapon.masterwork;
      if (nextMasterwork < MAX_MASTERWORK) {
        const previewResponse = await fetch(
          `/api/game/weapons/masterwork?weaponName=${encodeURIComponent(selectedWeapon.name)}`,
          { credentials: "include" },
        );
        const previewResult =
          (await previewResponse.json()) as MasterworkResponse;
        setMasterworkCost(previewResult.cost ?? {});
      } else {
        setMasterworkCost({});
      }
    } catch (err) {
      setMasterworkError(
        err instanceof Error
          ? err.message
          : "Masterwork failed.",
      );
    } finally {
      setMasterworking(false);
    }
  }

  async function selectWeaponForMasterwork(weapon: VisibleWeapon) {
    if (!weapon.owned) return;

    setSelectedWeapon(weapon);
    setMasterworkError("");
    setMasterworkCost({});

    if (weapon.masterwork >= MAX_MASTERWORK) return;

    try {
      const response = await fetch(
        `/api/game/weapons/masterwork?weaponName=${encodeURIComponent(weapon.name)}`,
        { credentials: "include" },
      );
      const result =
        (await response.json()) as MasterworkResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load Masterwork cost.");
      }
      setMasterworkCost(result.cost ?? {});
    } catch (err) {
      setMasterworkError(
        err instanceof Error ? err.message : "Failed to load Masterwork cost.",
      );
    }
  }

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
                      Weapon Collection · {collectionOwned}/{collectionTotal} OWNED
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
                      const maxed =
                        weapon.owned &&
                        weapon.masterwork >= MAX_MASTERWORK;

                      const itemClass = maxed
                        ? "weapon-vault-item weapon-vault-item-owned weapon-vault-item-maxed"
                        : weapon.owned
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
                          role={weapon.owned ? "button" : undefined}
                          tabIndex={weapon.owned ? 0 : -1}
                          onClick={() => {
                            if (weapon.owned) {
                              void selectWeaponForMasterwork(weapon);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (
                              weapon.owned &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              void selectWeaponForMasterwork(weapon);
                            }
                          }}
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
                              {weapon.owned
                                ? `MASTERWORK ${weapon.masterwork}/${MAX_MASTERWORK}`
                                : tier === "adept"
                                  ? "ADEPT · NOT OWNED"
                                  : "NORMAL · NOT OWNED"}
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

              {selectedWeapon && (
                <div
                  className="weapon-masterwork-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedWeapon(null);
                    }
                  }}
                >
                  <section
                    className={
                      selectedWeapon.masterwork >= MAX_MASTERWORK
                        ? "weapon-masterwork-modal weapon-masterwork-modal-maxed"
                        : "weapon-masterwork-modal"
                    }
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedWeapon.name} masterwork`}
                  >
                    <button
                      type="button"
                      className="weapon-masterwork-close"
                      onClick={() => setSelectedWeapon(null)}
                    >
                      ×
                    </button>

                    {selectedWeapon.image && (
                      <img
                        src={selectedWeapon.image}
                        alt=""
                        className="weapon-masterwork-image"
                      />
                    )}

                    <span className="weapon-masterwork-eyebrow">
                      WEAPON MASTERWORK
                    </span>
                    <h2>{selectedWeapon.name}</h2>
                    <strong className="weapon-masterwork-rank">
                      {selectedWeapon.masterwork} / {MAX_MASTERWORK}
                    </strong>

                    <div className="weapon-masterwork-track">
                      <i
                        style={{
                          width: `${Math.min(100, selectedWeapon.masterwork / MAX_MASTERWORK * 100)}%`,
                        }}
                      />
                    </div>

                    {selectedWeapon.masterwork >= MAX_MASTERWORK ? (
                      <div className="weapon-masterwork-complete">
                        MAXIMUM MASTERWORK ACHIEVED
                      </div>
                    ) : (
                      <>
                        <div className="weapon-masterwork-cost">
                          <span>NEXT RANK COST</span>
                          {Object.entries(masterworkCost).map(([name, amount]) => (
                            <div key={name}>
                              <strong>{name}</strong>
                              <b>{amount.toLocaleString()}</b>
                            </div>
                          ))}
                        </div>
                        <p>
                          Choose how far to Masterwork this weapon.
                          +1 and +10 require the full cumulative cost.
                          MAX spends only enough to reach the highest rank
                          your current materials can afford.
                        </p>
                        {masterworkError && (
                          <div className="weapon-masterwork-error">
                            {masterworkError}
                          </div>
                        )}
                        <div className="weapon-masterwork-actions">
                          <button
                            type="button"
                            className="weapon-masterwork-upgrade"
                            disabled={masterworking}
                            onClick={() => void masterworkWeapon(1)}
                          >
                            {masterworking ? "..." : "+1"}
                          </button>

                          <button
                            type="button"
                            className="weapon-masterwork-upgrade"
                            disabled={
                              masterworking ||
                              selectedWeapon.masterwork >= MAX_MASTERWORK
                            }
                            onClick={() => void masterworkWeapon(10)}
                          >
                            {masterworking ? "..." : "+10"}
                          </button>

                          <button
                            type="button"
                            className="weapon-masterwork-upgrade weapon-masterwork-upgrade-max"
                            disabled={masterworking}
                            onClick={() => void masterworkWeapon("max")}
                          >
                            {masterworking ? "UPGRADING..." : "MAX"}
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              )}
            </section>
          </VaultTransition>
        </ArsenalLayout>
      </div>
    </div>
  );
}

export default WeaponVault;
