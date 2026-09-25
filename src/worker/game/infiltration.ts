/*
 * Discordiny Infiltration activity engine
 *
 * An Infiltration run executes all three operation types:
 *
 *   1. Battleground
 *   2. Empire Hunt
 *   3. Nightmare Hunt
 *
 * Each operation grants the existing Infiltration reward package.
 *
 * Weapon sources:
 *
 *   Battleground  -> bgs
 *   Empire Hunt   -> emph
 *   Nightmare Hunt -> nigh
 *
 * Universal activity weapon rule:
 *
 *   25% chance for a weapon
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

export type InfiltrationOperationType =
  | "battleground"
  | "empire_hunt"
  | "nightmare_hunt";


export type InfiltrationOperation = {
  type: InfiltrationOperationType;

  name: string;

  weaponSource:
    | "bgs"
    | "emph"
    | "nigh";
};


export type InfiltrationWeaponCatalogEntry = {
  name: string;
  rarity: string | null;
  emoji_id?: string | null;
};


export type InfiltrationWeaponPool = {
  source:
    | "bgs"
    | "emph"
    | "nigh";

  weapons:
    readonly InfiltrationWeaponCatalogEntry[];
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


export type InfiltrationOperationResult = {
  index: number;

  type: InfiltrationOperationType;

  name: string;

  weaponSource: string;

  cleared: true;

  rewards:
    InfiltrationRewardMap;

  weapon:
    InfiltrationWeaponResult;
};


export type InfiltrationRunResult = {
  activityId: string;

  activityName: string;

  activityType: "infiltration";

  encounters:
    InfiltrationOperationResult[];

  totalEncounters: 3;

  clearedEncounters: 3;

  fullClear: true;

  wiped: false;

  wipedAt: null;

  rewards:
    InfiltrationRewardMap;

  xp: number;

  /*
   * New multi-drop representation.
   *
   * This contains only actual weapon drops.
   * Maximum length = 2.
   */
  weapons:
    InfiltrationWeaponResult[];

  /*
   * Compatibility field for the current activity modal/feed.
   *
   * Until the frontend supports multiple weapon drops,
   * this exposes the first successful weapon.
   *
   * If no weapon dropped, it exposes the first performed
   * weapon roll instead.
   */
  weapon:
    InfiltrationWeaponResult;
};


/* =========================================================
   OPERATION POOLS
========================================================= */

/*
 * The run uses one operation from each category.
 *
 * These names are kept separate from the reward logic so
 * we can expand/adjust the rotation pools without touching
 * the rest of the engine.
 *
 * The existing server-side activity rotation can also pass
 * its selected names into runInfiltration() instead.
 */
export const BATTLEGROUNDS = [
  "Battleground",
] as const;


export const EMPIRE_HUNTS = [
  "Empire Hunt",
] as const;


export const NIGHTMARE_HUNTS = [
  "Nightmare Hunt",
] as const;


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
 * Existing Infiltration reward package PER OPERATION:
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
   OPERATION SELECTION
========================================================= */

export function createInfiltrationOperations(
  names?: {
    battleground?: string;
    empireHunt?: string;
    nightmareHunt?: string;
  },
): [
  InfiltrationOperation,
  InfiltrationOperation,
  InfiltrationOperation,
] {
  const battleground =
    names?.battleground
    ?? randomChoice(
      BATTLEGROUNDS,
    )
    ?? "Battleground";


  const empireHunt =
    names?.empireHunt
    ?? randomChoice(
      EMPIRE_HUNTS,
    )
    ?? "Empire Hunt";


  const nightmareHunt =
    names?.nightmareHunt
    ?? randomChoice(
      NIGHTMARE_HUNTS,
    )
    ?? "Nightmare Hunt";


  return [
    {
      type:
        "battleground",

      name:
        battleground,

      weaponSource:
        "bgs",
    },

    {
      type:
        "empire_hunt",

      name:
        empireHunt,

      weaponSource:
        "emph",
    },

    {
      type:
        "nightmare_hunt",

      name:
        nightmareHunt,

      weaponSource:
        "nigh",
    },
  ];
}


/* =========================================================
   COMPLETE INFILTRATION RUN
========================================================= */

export function runInfiltration(
  weaponPools:
    readonly InfiltrationWeaponPool[],

  ownedWeapons:
    readonly string[] = [],

  names?: {
    battleground?: string;
    empireHunt?: string;
    nightmareHunt?: string;
  },
): InfiltrationRunResult {
  const operations =
    createInfiltrationOperations(
      names,
    );


  const totalRewards:
    InfiltrationRewardMap = {};


  const encounterResults:
    InfiltrationOperationResult[] = [];


  const droppedWeapons:
    InfiltrationWeaponResult[] = [];


  const performedWeaponRolls:
    InfiltrationWeaponResult[] = [];


  /*
   * Keep a local ownership list for this run.
   *
   * If operation #1 awards a weapon, operation #2
   * must immediately consider it owned even though
   * D1 has not been updated yet.
   */
  const runOwnedWeapons =
    [...ownedWeapons];


  for (
    let index = 0;
    index < operations.length;
    index += 1
  ) {
    const operation =
      operations[index];


    const rewards =
      rollInfiltrationRewards();


    mergeRewards(
      totalRewards,
      rewards,
    );


    const pool =
      weaponPools.find(
        (entry) =>
          entry.source
          === operation.weaponSource,
      );


    let weapon:
      InfiltrationWeaponResult;


    /*
     * Hard cap:
     *
     * Once two actual weapons have dropped,
     * remaining operations do not perform another
     * weapon roll.
     */
    if (
      droppedWeapons.length
      >= INFILTRATION_MAX_WEAPON_DROPS
    ) {
      weapon = {
        rolled: false,

        dropped: false,

        source:
          operation.weaponSource,

        name: null,

        rarity: null,

        emojiId: null,

        adept: false,
      };
    } else {
      weapon =
        rollInfiltrationWeapon(
          operation.weaponSource,

          pool?.weapons
            ?? [],

          runOwnedWeapons,
        );


      performedWeaponRolls.push(
        weapon,
      );


      if (
        weapon.dropped
        && weapon.name
      ) {
        droppedWeapons.push(
          weapon,
        );

        runOwnedWeapons.push(
          weapon.name,
        );
      }
    }


    encounterResults.push({
      index,

      type:
        operation.type,

      name:
        operation.name,

      weaponSource:
        operation.weaponSource,

      cleared: true,

      rewards,

      weapon,
    });
  }


  /*
   * Compatibility weapon.
   *
   * Existing Raid/Dungeon/Vanguard result shapes expose
   * one `weapon` object.
   *
   * We retain that field while also exposing the new
   * `weapons` array for Infiltration.
   */
  const compatibilityWeapon =
    droppedWeapons[0]
    ?? performedWeaponRolls[0]
    ?? {
      rolled: false,

      dropped: false,

      source: "bgs",

      name: null,

      rarity: null,

      emojiId: null,

      adept: false,
    };


  return {
    activityId:
      "infiltration",

    activityName:
      "Infiltration",

    activityType:
      "infiltration",

    encounters:
      encounterResults,

    totalEncounters:
      3,

    clearedEncounters:
      3,

    fullClear:
      true,

    wiped:
      false,

    wipedAt:
      null,

    rewards:
      totalRewards,

    xp:
      INFILTRATION_XP,

    weapons:
      droppedWeapons,

    weapon:
      compatibilityWeapon,
  };
}
