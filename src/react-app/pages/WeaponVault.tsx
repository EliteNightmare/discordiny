import { createPortal } from "react-dom";

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

import glimmerIcon from "../assets/icons/currencies/glimmer.png";
import lumiaLeavesIcon from "../assets/icons/currencies/lumia-leaves.png";
import enhancementCoreIcon from "../assets/icons/upgrade-materials/enhancement-core.png";
import enhancementPrismIcon from "../assets/icons/upgrade-materials/enhancement-prism.png";
import ascendantShardIcon from "../assets/icons/upgrade-materials/ascendant-shard.png";
import ascendantAlloyIcon from "../assets/icons/upgrade-materials/ascendant-alloy.png";

import "./WeaponVault.css";

export type WeaponTier =
  | "normal"
  | "adept";

type WeaponVaultProps = {
  categorySlug: string;
  activitySlug?: string;
  embedded?: boolean;
  selectedTier?: WeaponTier;
  onTierChange?: (tier: WeaponTier) => void;
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
  variantSuffix?: "Adept" | "Timelost" | "Harrowed";
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

const masterworkMaterialIcons: Record<string, string> = {
  glimmer: glimmerIcon,
  "lumia leaves": lumiaLeavesIcon,
  "enhancement core": enhancementCoreIcon,
  "enhancement prism": enhancementPrismIcon,
  "ascendant shard": ascendantShardIcon,
  "ascendant alloy": ascendantAlloyIcon,
};

function getMasterworkMaterialIcon(material: string): string | undefined {
  return masterworkMaterialIcons[material.trim().toLowerCase()];
}

const MAX_MASTERWORK = 77;

type MasterworkCostPreview = { cost: Record<string, number>; ranks: number; affordable: boolean };

// Mirrors getVaultMasterworkCost in the Worker. Keep both formulas in sync.
function costForMasterworkRank(weapon: VisibleWeapon, level: number): Record<string, number> {
  const special = /\s*\((Adept|Timelost|Harrowed)\)\s*$/i.test(weapon.name);
  const exotic = special || (weapon.rarity ?? "Legendary").trim().toLowerCase() === "exotic";
  const cost: Record<string, number> = { Glimmer: 2500 * (level + 1) };
  if (exotic) {
    cost["Enhancement Core"] = (level * 2 + 4) * 2;
    cost["Enhancement Prism"] = (level * 2 + 3) * 2;
  } else {
    cost["Enhancement Core"] = (level * 2 + 3) * 3;
    cost["Enhancement Prism"] = (level + 1) * 3;
  }
  cost["Ascendant Shard"] = (level + 1) * 2;
  if (level >= 3) cost["Ascendant Alloy"] = level - 2;
  return cost;
}

function getMasterworkPreview(
  weapon: VisibleWeapon,
  amount: 1 | 10 | "max",
  currencies: Record<string, number>,
  upgradeMaterials: Record<string, number>,
): MasterworkCostPreview {
  const available = { ...currencies, ...upgradeMaterials };
  const cost: Record<string, number> = {};
  const current = Math.min(MAX_MASTERWORK, Math.max(0, weapon.masterwork));
  const target = amount === "max" ? MAX_MASTERWORK : Math.min(MAX_MASTERWORK, current + amount);
  let ranks = 0;
  for (let level = current; level < target; level++) {
    const next = { ...cost };
    for (const [material, count] of Object.entries(costForMasterworkRank(weapon, level))) {
      next[material] = (next[material] ?? 0) + count;
    }
    const canAfford = Object.entries(next).every(([material, count]) =>
      (available[material] ?? 0) >= count,
    );
    if (amount === "max" && !canAfford) break;
    Object.assign(cost, next);
    ranks++;
  }
  const affordable = ranks > 0 && Object.entries(cost).every(([material, count]) =>
    (available[material] ?? 0) >= count,
  );
  return { cost, ranks, affordable };
}


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

export function WeaponTierControl({ tier, onChange }: { tier: WeaponTier; onChange: (tier: WeaponTier) => void }) {
  return (
    <div className={tier === "adept" ? "weapon-tier-switch weapon-tier-switch-adept" : "weapon-tier-switch"} role="group" aria-label="Weapon tier">
      <div className="weapon-tier-slider" aria-hidden="true" />
      <button type="button" className={tier === "normal" ? "weapon-tier-option active" : "weapon-tier-option"} aria-pressed={tier === "normal"} onClick={() => onChange("normal")}>NORMAL</button>
      <button type="button" className={tier === "adept" ? "weapon-tier-option active" : "weapon-tier-option"} aria-pressed={tier === "adept"} onClick={() => onChange("adept")}>ADEPT</button>
    </div>
  );
}

function WeaponVault({
  categorySlug,
  activitySlug,
  embedded = false,
  selectedTier,
  onTierChange,
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

  const [localTier, setTier] = useState<WeaponTier>("normal");
  const tier = selectedTier ?? localTier;

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

  const [hoverCosts, setHoverCosts] = useState<Record<string, Record<string, number>>>({});
  const [, setMasterworkCost] =
    useState<Record<string, number>>({});

  const masterworkPreviews = useMemo(() => {
    if (!selectedWeapon || !profile) return null;
    return {
      one: getMasterworkPreview(selectedWeapon, 1, profile.currencies ?? {}, profile.upgradeMaterials ?? {}),
      ten: getMasterworkPreview(selectedWeapon, 10, profile.currencies ?? {}, profile.upgradeMaterials ?? {}),
      max: getMasterworkPreview(selectedWeapon, "max", profile.currencies ?? {}, profile.upgradeMaterials ?? {}),
    };
  }, [selectedWeapon, profile]);

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

  useEffect(() => { setHoverCosts({}); setSelectedWeapon(null); }, [tier, weaponSource]);

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
              .replace(
                /\s*\((Adept|Timelost|Harrowed)\)\s*$/i,
                "",
              )
              .trim();

          const variantSuffix =
            weapon.variantSuffix ?? "Adept";

          const displayName =
            tier === "adept"
              ? `${baseName} (${variantSuffix})`
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

  async function readMasterworkResponse(response: Response): Promise<MasterworkResponse> {
    const body = await response.text();
    let parsed: MasterworkResponse | null = null;
    try {
      parsed = JSON.parse(body) as MasterworkResponse;
    } catch {
      // Cloudflare or the Worker may return plain text/HTML on a server error.
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        response.ok
          ? "Masterwork API returned an invalid response."
          : `Masterwork API error (${response.status}). Check the Cloudflare Worker logs.`,
      );
    }
    if (!response.ok) {
      throw new Error(parsed.error ?? `Masterwork API error (${response.status}).`);
    }
    return parsed;
  }

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
        (await readMasterworkResponse(response)) as MasterworkResponse;

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
      setHoverCosts({});
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
          (await readMasterworkResponse(previewResponse)) as MasterworkResponse;
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

  async function previewHoverCost(weapon: VisibleWeapon) {
    if (!weapon.owned || weapon.masterwork >= MAX_MASTERWORK || hoverCosts[weapon.name]) return;
    try {
      const response = await fetch(
        `/api/game/weapons/masterwork?weaponName=${encodeURIComponent(weapon.name)}`,
        { credentials: "include" },
      );
      if (!response.ok) return;
      const result = (await readMasterworkResponse(response)) as MasterworkResponse;
      setHoverCosts((previous) => ({ ...previous, [weapon.name]: result.cost ?? {} }));
    } catch { /* The main Masterwork dialog handles API errors. */ }
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
        (await readMasterworkResponse(response)) as MasterworkResponse;
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

    if (onTierChange) onTierChange(nextTier);
    else setTier(nextTier);

    setGridKey(
      (current) =>
        current + 1,
    );
  }

  if (
    !category ||
    !weaponSource
  ) {
    if (embedded) return <div className="weapon-vault-status">Weapon collection not found.</div>;
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
    if (embedded) return <div className="weapon-vault-status">Loading weapon collection...</div>;
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
    if (embedded) return <div className="weapon-vault-status weapon-vault-status-error">{error || "Failed to load weapon vault."}</div>;
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

  const collection = (
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

                  {!embedded && (
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
                  )}
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
                          onMouseEnter={() => { void previewHoverCost(weapon); }}
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

                          {weapon.owned && (
                            <div className="vault-hover-upgrade" onClick={(event) => event.stopPropagation()}>
                              <span>NEXT RANK COST</span>
                              {maxed ? <strong>MAXIMUM MASTERWORK</strong> : (
                                hoverCosts[weapon.name] ?
                                  Object.entries(hoverCosts[weapon.name]).map(([material, amount]) => (
                                    <span key={material} className="vault-hover-material">
                                      {getMasterworkMaterialIcon(material) && (
                                        <img src={getMasterworkMaterialIcon(material)} alt="" className="vault-masterwork-material-icon" />
                                      )}
                                      <span className="vault-hover-material-name">{material}</span>
                                      <b>{amount.toLocaleString()}</b>
                                    </span>
                                  )) : <span>Checking cost...</span>
                              )}
                              {!maxed && <button type="button" onClick={() => void selectWeaponForMasterwork(weapon)}>UPGRADE WEAPON</button>}
                            </div>
                          )}
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
                                  ? `${weapon.name.match(/\((Adept|Timelost|Harrowed)\)$/i)?.[1]?.toUpperCase() ?? "ADEPT"} · NOT OWNED`
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

              {selectedWeapon && createPortal(
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
                        <div className="weapon-masterwork-costs">
                          {([
                            { key: "one", title: "+1 RANK", action: "+1" },
                            { key: "ten", title: "+10 RANKS", action: "+10" },
                            { key: "max", title: "MAX AFFORDABLE", action: "MAX" },
                          ] as const).map(({ key, title, action }) => {
                            const preview = masterworkPreviews?.[key];
                            const insufficient = !preview?.affordable;
                            return (
                              <div className="weapon-masterwork-cost" key={key}>
                                <div className="weapon-masterwork-cost-heading">
                                  <span>{title}</span>
                                  <strong>{preview ? `${preview.ranks} ${preview.ranks === 1 ? "rank" : "ranks"}` : "Loading..."}</strong>
                                </div>
                                {preview && Object.entries(preview.cost).map(([name, amount]) => (
                                  <div key={name} className="weapon-masterwork-material-row">
                                    {getMasterworkMaterialIcon(name) && (
                                      <img src={getMasterworkMaterialIcon(name)} alt="" className="vault-masterwork-material-icon" />
                                    )}
                                    <strong>{name}</strong>
                                    <b className={(profile?.currencies?.[name] ?? profile?.upgradeMaterials?.[name] ?? 0) < amount ? "weapon-masterwork-insufficient" : ""}>
                                      {amount.toLocaleString()}
                                    </b>
                                  </div>
                                ))}
                                {preview && insufficient && <small className="weapon-masterwork-unaffordable">{key === "max" ? "Not enough materials for another rank" : "Not enough materials"}</small>}
                                <button
                                  type="button"
                                  className={`weapon-masterwork-upgrade ${key === "max" ? "weapon-masterwork-upgrade-max" : ""}`}
                                  disabled={masterworking || insufficient}
                                  onClick={() => void masterworkWeapon(key === "one" ? 1 : key === "ten" ? 10 : "max")}
                                >
                                  {masterworking ? "UPGRADING..." : action}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <p>
                          +1 and +10 show the full cumulative cost and require enough materials.
                          MAX shows only the ranks and materials you can currently afford.
                        </p>
                        {masterworkError && (
                          <div className="weapon-masterwork-error">
                            {masterworkError}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                </div>, document.body
              )}
            </section>
  );

  if (embedded) return <div className="vault-embedded-collection">{collection}</div>;

  return (
    <div className="weapon-vault-screen">
      <TopBar />
      <div className="weapon-vault-page">
        <ArsenalLayout left={<VaultMaterials currencies={profile.currencies} upgradeMaterials={profile.upgradeMaterials} />}>
          <VaultTransition>{collection}</VaultTransition>
        </ArsenalLayout>
      </div>
    </div>
  );
}

export default WeaponVault;
