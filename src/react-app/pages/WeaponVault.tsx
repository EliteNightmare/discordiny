import { createPortal } from "react-dom";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TopBar from "../components/TopBar";
import { fetchProfileSnapshot, invalidateProfileSnapshot } from "../lib/profileRequest";
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
  focusWeapon?: string;
  favorites?: string[];
  onToggleFavorite?: (name: string) => Promise<void>;
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
  amount: number | "max",
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
  focusWeapon,
  favorites = [],
  onToggleFavorite,
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


  const [selectedWeapon, setSelectedWeapon] =
    useState<VisibleWeapon | null>(null);

  const [masterworking, setMasterworking] =
    useState(false);

  const [masterworkError, setMasterworkError] =
    useState("");


  const [requestedRanks, setRequestedRanks] = useState(1);
  const affordablePreview = useMemo(() => selectedWeapon && profile
    ? getMasterworkPreview(selectedWeapon, "max", profile.currencies ?? {}, profile.upgradeMaterials ?? {})
    : null, [selectedWeapon, profile]);
  const maxAffordableRanks = affordablePreview?.ranks ?? 0;
  const safeRanks = Math.min(Math.max(1, requestedRanks), Math.max(1, maxAffordableRanks));
  const selectedPreview = useMemo(() => selectedWeapon && profile && maxAffordableRanks > 0
    ? getMasterworkPreview(selectedWeapon, safeRanks, profile.currencies ?? {}, profile.upgradeMaterials ?? {})
    : null, [selectedWeapon, profile, safeRanks, maxAffordableRanks]);

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

        const [weaponResponse, profileResult] = await Promise.all([
          fetch(weaponUrl, { credentials: "include" }),
          fetchProfileSnapshot<ProfileResponse>(),
        ]);

        const weaponResult =
          (await weaponResponse.json()) as WeaponResponse;

        if (
          !weaponResponse.ok ||
          !weaponResult.authenticated
        ) {
          throw new Error(
            "Failed to load weapon collection.",
          );
        }

        if (
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

  useEffect(() => { setSelectedWeapon(null); }, [weaponSource]);

  const visibleWeapons =
    useMemo<VisibleWeapon[]>(
      () => {
        if (!weaponSource) {
          return [];
        }

        return weapons.flatMap((weapon) => {
          const baseName = weapon.name.replace(/\s*\((Adept|Timelost|Harrowed)\)\s*$/i, "").trim();
          const suffix = weapon.variantSuffix ?? "Adept";
          const toVisible = (variant: "normal" | "adept"): VisibleWeapon => {
            const displayName = variant === "adept" ? `${baseName} (${suffix})` : baseName;
            const ownership = weapon[variant];
            return {
              name: displayName, catalogName: baseName, rarity: weapon.rarity,
              source: weapon.source, activityType: weapon.activityType,
              owned: ownership.owned, masterwork: ownership.masterwork,
              image: findWeaponImage(weaponSource, displayName) ?? findWeaponImage(weaponSource, weapon.name),
            };
          };
          // Show the Adept slot alongside its Normal counterpart only when the catalog supports it.
          // The API's adept ownership entry is the source of truth for the variant.
          return [toVisible("normal"), toVisible("adept")];
        });
      },
      [weapons, weaponSource],
    );

  useEffect(() => {
    if (!focusWeapon || loading || !visibleWeapons.length) return;
    const id = window.requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('.weapon-vault-item[data-weapon-name]'))
        .find(element => element.dataset.weaponName?.toLowerCase() === focusWeapon.toLowerCase());
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.classList.add('weapon-vault-focused');
    });
    return () => window.cancelAnimationFrame(id);
  }, [focusWeapon, loading, visibleWeapons]);

  const collectionOwned =
    visibleWeapons.filter(
      (weapon) => weapon.owned,
    ).length;

  const collectionTotal =
    visibleWeapons.length;
  const collectionMaxed = visibleWeapons.filter(weapon => weapon.owned && weapon.masterwork >= MAX_MASTERWORK).length;

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

  async function masterworkWeapon(amount: number) {
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

      // Masterworking changes power and currencies: refresh the profile.
      invalidateProfileSnapshot();
      const [weaponResponse, profileResult] = await Promise.all([
        fetch(
          `/api/game/weapons?source=${encodeURIComponent(weaponSource as string)}`,
          { credentials: "include" },
        ),
        fetchProfileSnapshot<ProfileResponse>(0),
      ]);

      const weaponResult =
        (await weaponResponse.json()) as WeaponResponse;

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

      setRequestedRanks(1);
      window.dispatchEvent(new Event('discordiny:weapon-masterworked'));
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
    setRequestedRanks(1);
    setMasterworkError("");

    // Cost preview uses the already-loaded profile snapshot; no extra GET request.

  }

  function navigate(
    path: string,
  ) {
    window.location.href =
      path;
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
                      Weapon Collection · {collectionOwned}/{collectionTotal} UNLOCKED · {collectionMaxed}/{collectionTotal} MAXED
                    </p>
                  </div>


                </div>
              </div>

              <div
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
                          className={itemClass}
                          style={{ "--collection-mw-progress": `${weapon.owned ? Math.min(100, Math.max(0, weapon.masterwork / MAX_MASTERWORK * 100)) : 0}%` } as React.CSSProperties}
                          data-weapon-name={weapon.name}
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
                          {weapon.owned && onToggleFavorite && <button type="button" className={favorites.includes(weapon.name) ? 'vault-favorite-star active' : 'vault-favorite-star'}
                            aria-label={favorites.includes(weapon.name) ? `Remove ${weapon.name} from favorites` : `Favorite ${weapon.name}`}
                            title={favorites.includes(weapon.name) ? 'Remove favorite' : favorites.filter(name => /\((Adept|Timelost|Harrowed)\)\s*$/i.test(name) === /\((Adept|Timelost|Harrowed)\)\s*$/i.test(weapon.name)).length >= 4 ? 'Maximum 4 favorites in this tier' : 'Favorite weapon'}
                            disabled={!favorites.includes(weapon.name) && favorites.filter(name => /\((Adept|Timelost|Harrowed)\)\s*$/i.test(name) === /\((Adept|Timelost|Harrowed)\)\s*$/i.test(weapon.name)).length >= 4}
                            onClick={event => { event.stopPropagation(); void onToggleFavorite(weapon.name); }}>{favorites.includes(weapon.name) ? "★" : "☆"}</button>}
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
                                : /\((Adept|Timelost|Harrowed)\)$/i.test(weapon.name) ? "ADEPT · NOT OWNED" : "NORMAL · NOT OWNED"}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )
                ) : (
                  <div className="weapon-vault-empty">
                    No weapons were found
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
                        <div className="vault-rank-picker">
                          <label htmlFor="vault-rank-input">Ranks to masterwork</label>
                          <div className="vault-rank-picker-row">
                            <input aria-label="Masterwork ranks slider" type="range" min={1} max={Math.max(1, maxAffordableRanks)}
                              value={safeRanks} disabled={masterworking || maxAffordableRanks === 0}
                              onChange={event => setRequestedRanks(Number(event.target.value))} />
                            <input id="vault-rank-input" aria-label="Masterwork ranks amount" type="number" inputMode="numeric"
                              min={1} max={Math.max(1, maxAffordableRanks)} value={safeRanks}
                              disabled={masterworking || maxAffordableRanks === 0}
                              onChange={event => setRequestedRanks(Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, maxAffordableRanks)))} />
                          </div>
                          <p>Maximum affordable: <strong>{maxAffordableRanks}</strong> ranks · Target: <strong>{Math.min(MAX_MASTERWORK, selectedWeapon.masterwork + safeRanks)}/{MAX_MASTERWORK}</strong></p>
                        </div>
                        <div className="vault-rank-cost-list">
                          {Object.entries(selectedPreview?.cost ?? {}).map(([name, amount]) => {
                            const available = profile?.currencies?.[name] ?? profile?.upgradeMaterials?.[name] ?? 0;
                            return <div key={name} className="vault-rank-cost-row">
                              {getMasterworkMaterialIcon(name) && <img src={getMasterworkMaterialIcon(name)} alt="" />}
                              <span>{name}</span><strong>{amount.toLocaleString()} / {available.toLocaleString()}</strong>
                            </div>;
                          })}
                          {maxAffordableRanks === 0 && <p className="weapon-masterwork-unaffordable">Not enough materials for another rank.</p>}
                        </div>
                        <button type="button" className="weapon-masterwork-upgrade vault-rank-confirm"
                          disabled={masterworking || maxAffordableRanks === 0 || !selectedPreview?.affordable}
                          onClick={() => void masterworkWeapon(safeRanks)}>
                          {masterworking ? "UPGRADING..." : `MASTERWORK +${safeRanks}`}
                        </button>
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
