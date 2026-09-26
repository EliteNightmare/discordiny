/*
 * Discordiny Infiltration activity engine
 *
 * An Infiltration run executes the THREE encounters belonging
 * to the ONE currently rotated Pinnacle Infiltration.
 *
 * Examples:
 *
 * Battlegrounds:
 *   Battleground: Delve
 *   Battleground: Conduit
 *   Battleground: Core
 *   Weapon source: bgs
 *
 * Empire Hunt:
 *   Empire Hunt: The Warrior
 *   Empire Hunt: The Priest
 *   Empire Hunt: The Technocrat
 *   Weapon source: emph
 *
 * Nightmare Hunt:
 *   Nightmare Hunt: Skolas
 *   Nightmare Hunt: Fikrul
 *   Nightmare Hunt: Dominus Ghaul
 *   Weapon source: nigh
 *
 * Universal activity weapon rule:
 *
 *   25% chance for a weapon per encounter
 *   10% chance for that weapon to be Adept
 *
 * A complete Infiltration can award at most TWO weapons.
 *
 * Splicing, Acclaim, and Gather Materials are intentionally excluded.
 *
 * This module does not access D1 directly.
 */

export const INFILTRATION_COOLDOWN_SECONDS =
  10;

export const INFILTRATION_WEAPON_DROP_CHANCE =
  0.25;

export const INFILTRATION_ADEPT_CHANCE =
  0.10;

export const INFILTRATION_MAX_WEAPON_DROPS =
  2;

export const INFILTRATION_XP =
  5000;


/* =========================================================
   TYPES
========================================================= */

export type InfiltrationWeaponSource =
  | "bgs"
  | "emph"
  | "nigh";


export type InfiltrationActivity = {
  id: string;

  name: string;

  weaponSource:
    InfiltrationWeaponSource;

  encounters:
    readonly string[];
};


export type InfiltrationWeaponCatalogEntry = {
  name: string;
  rarity: string | null;
  emoji_id?: string | null;
};


export type InfiltrationWeaponResult = {
  rolled: boolean;
  dropped: boolean;

  source: string;

  name: string | null;
  rarity: string | null;
  emojiId: string | null;

  adept: boolean;
};


export type InfiltrationRewardMap =
  Record<string, number>;


export type InfiltrationEncounterResult = {
  index: number;

  name: string;

  weaponSource: string;

  cleared: true;

  rewards:
    InfiltrationRewardMap;

  partialRewards: false;

  weapon:
    InfiltrationWeaponResult;
};


export type InfiltrationRunResult = {
  activityId: string;

  activityName: string;

  activityType: "infiltration";

  weaponSource: string;

  encounters:
    InfiltrationEncounterResult[];

  totalEncounters: number;

  clearedEncounters: number;

  fullClear: true;

  wiped: false;

  wipedAt: null;

  rewards:
    InfiltrationRewardMap;

  xp: number;

  /*
   * Contains only actual weapon drops.
   *
   * Maximum length = 2.
   */
  weapons:
    InfiltrationWeaponResult[];

  /*
   * Compatibility field for the current modal/feed.
   *
   * Prefer the first successful weapon drop.
   *
   * If no weapon dropped, expose the first
   * performed weapon roll instead.
   */
  weapon:
    InfiltrationWeaponResult;
};


/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomIntInclusive(
  min: number,
  max: number,
): number {
  const lower =
    Math.ceil(min);

  const upper =
    Math.floor(max);

  return (
    Math.floor(
      Math.random()
      * (
        upper
        - lower
        + 1
      ),
    )
    + lower
  );
}


function randomChoice<T>(
  values: readonly T[],
): T | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values[
      randomIntInclusive(
        0,
        values.length - 1,
      )
    ]
    ?? null
  );
}


/* =========================================================
   WEAPON NAME HELPERS
========================================================= */

function normalizeWeaponName(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}


function isAdeptWeaponName(
  value: string,
): boolean {
  return (
    /\s*\(adept\)\s*$/i.test(
      value,
    )
  );
}


function getBaseWeaponName(
  value: string,
): string {
  return value
    .replace(
      /\s*\(adept\)\s*$/i,
      "",
    )
    .trim();
}


/* =========================================================
   REWARDS
========================================================= */

/*
 * Existing Infiltration reward package PER ENCOUNTER:
 *
 * Glimmer:
 *   5,000 - 8,000
 *
 * Lumia Leaves:
 *   1
 *
 * Pinnacle Cipher:
 *   3 - 5
 *
 * Ascendant Alloy:
 *   1
 */
export function rollInfiltrationRewards():
  InfiltrationRewardMap {
  return {
    Glimmer:
      randomIntInclusive(
        5000,
        8000,
      ),

    "Lumia Leaves":
      1,

    "Pinnacle Cipher":
      randomIntInclusive(
        3,
        5,
      ),

    "Ascendant Alloy":
      1,
  };
}


/* =========================================================
   REWARD MERGING
========================================================= */

function addReward(
  rewards:
    InfiltrationRewardMap,

  name: string,

  amount: number,
): void {
  rewards[name] =
    (
      rewards[name]
      ?? 0
    )
    + amount;
}


function mergeRewards(
  target:
    InfiltrationRewardMap,

  source:
    InfiltrationRewardMap,
): void {
  for (
    const [
      name,
      amount,
    ]
    of Object.entries(
      source,
    )
  ) {
    addReward(
      target,
      name,
      amount,
    );
  }
}


/* =========================================================
   WEAPON ROLL
========================================================= */

export function rollInfiltrationWeapon(
  source: string,

  catalog:
    readonly InfiltrationWeaponCatalogEntry[],

  ownedWeapons:
    readonly string[],
): InfiltrationWeaponResult {
  const emptyResult:
    InfiltrationWeaponResult = {
      rolled: true,

      dropped: false,

      source,

      name: null,

      rarity: null,

      emojiId: null,

      adept: false,
    };


  /*
   * First roll:
   *
   * 25% chance for a weapon.
   */
  if (
    Math.random()
    >= INFILTRATION_WEAPON_DROP_CHANCE
  ) {
    return emptyResult;
  }


  /*
   * Successful weapon roll.
   *
   * Now determine whether the weapon is Adept.
   */
  const adept =
    Math.random()
    < INFILTRATION_ADEPT_CHANCE;


  const owned =
    new Set(
      ownedWeapons.map(
        normalizeWeaponName,
      ),
    );


  /*
   * Only base catalog rows participate in the
   * random weapon selection.
   *
   * Explicit "(Adept)" rows are metadata rows,
   * not additional weapons in the random pool.
   */
  const available =
    catalog.filter(
      (weapon) => {
        if (
          isAdeptWeaponName(
            weapon.name,
          )
        ) {
          return false;
        }

        const baseName =
          getBaseWeaponName(
            weapon.name,
          );

        const finalName =
          adept
            ? `${baseName} (Adept)`
            : baseName;

        /*
         * Normal and Adept ownership are checked
         * separately.
         */
        return !owned.has(
          normalizeWeaponName(
            finalName,
          ),
        );
      },
    );


  /*
   * The player already owns every possible weapon
   * for the rolled Normal/Adept variant.
   */
  if (
    available.length === 0
  ) {
    return emptyResult;
  }


  const selected =
    randomChoice(
      available,
    );


  if (!selected) {
    return emptyResult;
  }


  const baseName =
    getBaseWeaponName(
      selected.name,
    );


  const finalName =
    adept
      ? `${baseName} (Adept)`
      : baseName;


  /*
   * If an explicit Adept catalog row exists,
   * use its metadata.
   *
   * Otherwise the base weapon metadata is used.
   */
  const explicitAdept =
    adept
      ? catalog.find(
          (weapon) =>
            normalizeWeaponName(
              weapon.name,
            )
            ===
            normalizeWeaponName(
              finalName,
            ),
        )
      : undefined;


  const metadata =
    explicitAdept
    ?? selected;


  return {
    rolled: true,

    dropped: true,

    source,

    name:
      finalName,

    rarity:
      metadata.rarity
      ?? selected.rarity
      ?? null,

    emojiId:
      metadata.emoji_id
      ?? selected.emoji_id
      ?? null,

    adept,
  };
}
/* =========================================================
   COMPLETE INFILTRATION RUN
========================================================= */

export function runInfiltration(
  activity:
    InfiltrationActivity,

  weaponCatalog:
    readonly InfiltrationWeaponCatalogEntry[],

  ownedWeapons:
    readonly string[] = [],
): InfiltrationRunResult {
  /*
   * The Worker passes the ONE currently rotated
   * Infiltration activity.
   *
   * We run that activity's encounters only.
   *
   * We NEVER mix Battlegrounds, Empire Hunt and
   * Nightmare Hunt together in one run.
   */
  const encounters =
    [...activity.encounters];


  const totalRewards:
    InfiltrationRewardMap = {};


  const encounterResults:
    InfiltrationEncounterResult[] = [];


  const droppedWeapons:
    InfiltrationWeaponResult[] = [];


  const performedWeaponRolls:
    InfiltrationWeaponResult[] = [];


  /*
   * Keep a local ownership list for this run.
   *
   * If encounter #1 awards a weapon, encounter #2
   * immediately considers that exact Normal/Adept
   * variant owned even though D1 has not been
   * updated yet.
   */
  const runOwnedWeapons =
    [...ownedWeapons];


  for (
    let index = 0;
    index < encounters.length;
    index += 1
  ) {
    const encounterName =
      encounters[index];


    /*
     * Every encounter receives the existing
     * Infiltration reward package.
     */
    const rewards =
      rollInfiltrationRewards();


    mergeRewards(
      totalRewards,
      rewards,
    );


    let weapon:
      InfiltrationWeaponResult;


    /*
     * HARD CAP:
     *
     * Once TWO actual weapons have dropped,
     * remaining encounters do not perform
     * another weapon roll.
     */
    if (
      droppedWeapons.length
      >= INFILTRATION_MAX_WEAPON_DROPS
    ) {
      weapon = {
        rolled: false,

        dropped: false,

        source:
          activity.weaponSource,

        name: null,

        rarity: null,

        emojiId: null,

        adept: false,
      };
    } else {
      /*
       * Every encounter uses the SAME weapon
       * source and SAME weapon catalog.
       *
       * That source belongs to the ONE currently
       * rotated Infiltration activity.
       *
       * Battlegrounds:
       *   bgs
       *
       * Empire Hunt:
       *   emph
       *
       * Nightmare Hunt:
       *   nigh
       *
       * Each eligible encounter independently:
       *
       *   25% chance for weapon
       *
       * If successful:
       *
       *   10% chance for Adept
       */
      weapon =
        rollInfiltrationWeapon(
          activity.weaponSource,

          weaponCatalog,

          runOwnedWeapons,
        );


      performedWeaponRolls.push(
        weapon,
      );


      /*
       * Only successful drops count toward
       * the maximum of two.
       */
      if (
        weapon.dropped
        && weapon.name
      ) {
        droppedWeapons.push(
          weapon,
        );


        /*
         * Immediately mark the weapon as owned
         * for subsequent rolls in this run.
         */
        runOwnedWeapons.push(
          weapon.name,
        );
      }
    }


    /*
     * Build the encounter result expected by
     * ActivityRunModal.
     */
    encounterResults.push({
      index,

      name:
        encounterName,

      weaponSource:
        activity.weaponSource,

      cleared: true,

      rewards,

      partialRewards:
        false,

      weapon,
    });
  }


  /*
   * Compatibility weapon.
   *
   * Raid/Dungeon/Vanguard currently expose one
   * `weapon` object.
   *
   * Infiltration additionally exposes `weapons`
   * because it can drop up to TWO.
   *
   * Prefer the first successful drop for the
   * compatibility field.
   *
   * If no weapon dropped, expose the first roll.
   */
  const compatibilityWeapon =
    droppedWeapons[0]
    ?? performedWeaponRolls[0]
    ?? {
      rolled: false,

      dropped: false,

      source:
        activity.weaponSource,

      name: null,

      rarity: null,

      emojiId: null,

      adept: false,
    };


  return {
    /*
     * Unlike the old implementation, these now
     * identify the ACTUAL rotated activity.
     */
    activityId:
      activity.id,

    activityName:
      activity.name,

    activityType:
      "infiltration",

    weaponSource:
      activity.weaponSource,


    /*
     * These are the three encounters belonging
     * to the currently rotated activity.
     */
    encounters:
      encounterResults,

    totalEncounters:
      encounterResults.length,

    clearedEncounters:
      encounterResults.length,


    /*
     * Current Infiltration behavior always
     * completes all three encounters.
     */
    fullClear:
      true,

    wiped:
      false,

    wipedAt:
      null,


    /*
     * Combined rewards from all three encounters.
     */
    rewards:
      totalRewards,


    /*
     * Existing full-run Infiltration XP.
     */
    xp:
      INFILTRATION_XP,


    /*
     * Actual successful drops only.
     *
     * Maximum length = 2.
     */
    weapons:
      droppedWeapons,


    /*
     * Compatibility with existing frontend/feed.
     */
    weapon:
      compatibilityWeapon,
  };
}
