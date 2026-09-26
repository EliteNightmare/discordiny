/*
 * Discordiny Showdown activity engine
 *
 * Based on the existing Endgame Raid/Dungeon engine,
 * using the original Python Pinnacle Showdown rewards.
 *
 * Web-version behavior:
 *
 * - Regular and Daily Showdowns use the same engine.
 * - Each Showdown runs all configured encounters.
 * - Encounter 0 cannot wipe.
 * - Later encounters use Level + Power clear chance.
 * - Power scales generated encounter rewards.
 * - A wipe receives 25% of that encounter's rewards.
 * - Full-clear XP only.
 * - A full clear performs exactly one weapon roll.
 * - Universal activity weapon rule:
 *     25% weapon drop chance
 *     10% Adept chance after successful drop
 * - Normal and Adept ownership are separate.
 * - No Acclaim.
 * - No Splicing/SIVA event logic.
 *
 * This module is database-agnostic.
 *
 * The Worker is responsible for:
 *
 *   1. loading the selected Showdown,
 *   2. loading player Level / Power,
 *   3. loading the Showdown weapon pool,
 *   4. enforcing regular cooldown or Daily charges,
 *   5. calling runShowdownActivity(),
 *   6. persisting rewards / XP / weapon,
 *   7. writing the global CLEAR/WIPE feed entry.
 */


/* =========================================================
   TYPES
========================================================= */

export type ShowdownWeaponSource =
  | "seraph"
  | "elivagar"
  | "lucent"
  | "cos"
  | "sos"
  | "eow";


export type ShowdownActivity = {
  id: string;

  name: string;

  type:
    | "pinnacle"
    | "showdown";

  weapon_source:
    ShowdownWeaponSource;

  reward_table:
    | "pinnacle"
    | "showdown";

  encounters:
    readonly string[];
};


export type ShowdownWeaponCatalogEntry = {
  name: string;

  rarity:
    string | null;

  emoji_id?:
    string | null;
};


export type ShowdownWeaponStats = {
  exotic_chance?: number;

  legendary_chance?: number;

  adept_chance?: number;
};


export type ShowdownPlayer = {
  level: number;

  power: number;

  weaponStats?:
    ShowdownWeaponStats;

  ownedWeapons?:
    readonly string[];
};


export type ShowdownRewardMap =
  Record<string, number>;


export type ShowdownEncounterResult = {
  index: number;

  name: string;

  cleared: boolean;

  roll: number;

  successChance: number;

  rewards:
    ShowdownRewardMap;

  partialRewards: boolean;
};


export type ShowdownWeaponResult = {
  rolled: boolean;

  dropped: boolean;

  name:
    string | null;

  rarity:
    string | null;

  emojiId:
    string | null;

  adept: boolean;
};


export type ShowdownRunResult = {
  activityId: string;

  activityName: string;

  activityType: "showdown";

  weaponSource:
    ShowdownWeaponSource;

  level: number;

  power: number;

  successChance: number;

  rewardMultiplier: number;

  encounters:
    ShowdownEncounterResult[];

  clearedEncounters: number;

  totalEncounters: number;

  fullClear: boolean;

  wiped: boolean;

  wipedAt:
    string | null;

  rewards:
    ShowdownRewardMap;

  xp: number;

  weapon:
    ShowdownWeaponResult;
};


type RewardRange =
  readonly [
    number,
    number,
  ];


type ShowdownRewardTable = {
  currencies:
    Record<
      string,
      RewardRange
    >;

  upgradeMaterials:
    Record<
      string,
      RewardRange
    >;

  exp: number;
};


/* =========================================================
   SHOWDOWN SETTINGS
========================================================= */

/*
 * Original pinnacle.py:
 *
 * SHOWDOWN_COOLDOWN_SECONDS = 30
 *
 * The Worker should enforce this for REGULAR Showdowns.
 *
 * Daily Showdowns should instead use the web game's
 * Daily 3-charge system.
 */

export const SHOWDOWN_COOLDOWN_SECONDS =
  30;


/*
 * Universal Discordiny activity weapon rule.
 */

export const SHOWDOWN_WEAPON_DROP_CHANCE =
  0.25;


export const SHOWDOWN_ADEPT_CHANCE =
  0.10;


/* =========================================================
   ORIGINAL PINNACLE SHOWDOWN REWARDS
========================================================= */

/*
 * pinnacle_rewards.py
 *
 * Showdown:
 *
 * Glimmer:
 *   10,000 - 15,000
 *
 * Lumia Leaves:
 *   1
 *
 * Pinnacle Cipher:
 *   3 - 4
 *
 * Enhancement Prism:
 *   5 - 10
 *
 * Ascendant Shard:
 *   0 - 1
 *
 * XP:
 *   17,500
 *
 * These rewards are generated PER ENCOUNTER.
 *
 * XP is granted only on a full Showdown clear.
 */

const SHOWDOWN_REWARDS:
  ShowdownRewardTable = {

  currencies: {

    Glimmer:
      [
        10000,
        15000,
      ],

    "Lumia Leaves":
      [
        1,
        1,
      ],

    "Pinnacle Cipher":
      [
        3,
        4,
      ],
  },


  upgradeMaterials: {

    "Enhancement Prism":
      [
        5,
        10,
      ],

    "Ascendant Shard":
      [
        0,
        1,
      ],
  },


  exp:
    17500,
};


/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomFloat(
  min: number,
  max: number,
): number {

  return (
    min
    + Math.random()
      * (max - min)
  );
}


function randomIntInclusive(
  min: number,
  max: number,
): number {

  const lower =
    Math.ceil(
      min,
    );

  const upper =
    Math.floor(
      max,
    );

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
  values:
    readonly T[],
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
   NUMBER HELPERS
========================================================= */

function clamp(
  value: number,
  min: number,
  max: number,
): number {

  return Math.min(
    max,

    Math.max(
      min,
      value,
    ),
  );
}


function safeNumber(
  value: number,
  fallback = 0,
): number {

  if (
    !Number.isFinite(
      value,
    )
  ) {
    return fallback;
  }

  return value;
}


/* =========================================================
   SHOWDOWN GAME CALCULATIONS
========================================================= */

/*
 * Same encounter success formula as the working
 * Raid / Dungeon engine:
 *
 * Base:
 *
 *   60 + (level * 0.3)
 *
 * Web Power bonus:
 *
 *   +1 percentage point per 5,000 Power
 *
 * Maximum:
 *
 *   95%
 */

export function getShowdownSuccessChance(
  level: number,
  power: number,
): number {

  const safeLevel =
    Math.max(
      0,

      safeNumber(
        level,
      ),
    );


  const safePower =
    Math.max(
      0,

      safeNumber(
        power,
      ),
    );


  const levelChance =
    60
    + safeLevel * 0.3;


  const powerBonus =
    safePower / 5000;


  return clamp(
    levelChance
      + powerBonus,

    0,

    95,
  );
}


/*
 * Same Power reward multiplier as Raid / Dungeon:
 *
 *   1 + (min(power, 100000) / 10000)
 *
 * Maximum multiplier:
 *
 *   11x
 */

export function getShowdownPowerMultiplier(
  power: number,
): number {

  const safePower =
    Math.max(
      0,

      safeNumber(
        power,
      ),
    );


  return (
    1
    + (
      Math.min(
        safePower,
        100000,
      )
      / 10000
    )
  );
}


/* =========================================================
   REWARD HELPERS
========================================================= */

function generateEncounterRewards(
  multiplier: number,
): ShowdownRewardMap {

  const rewards:
    ShowdownRewardMap = {};


  for (
    const [
      name,
      range,
    ]
    of Object.entries(
      SHOWDOWN_REWARDS
        .currencies,
    )
  ) {

    const base =
      randomIntInclusive(
        range[0],
        range[1],
      );


    rewards[name] =
      Math.trunc(
        base
        * multiplier,
      );
  }


  for (
    const [
      name,
      range,
    ]
    of Object.entries(
      SHOWDOWN_REWARDS
        .upgradeMaterials,
    )
  ) {

    const base =
      randomIntInclusive(
        range[0],
        range[1],
      );


    rewards[name] =
      Math.trunc(
        base
        * multiplier,
      );
  }


  return rewards;
}


function addReward(
  rewards:
    ShowdownRewardMap,

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
    ShowdownRewardMap,

  source:
    ShowdownRewardMap,
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


/*
 * Same wipe behavior as Raid / Dungeon.
 *
 * A failed encounter keeps 25% of the rewards
 * generated for that encounter.
 */

function getWipeRewards(
  rewards:
    ShowdownRewardMap,
): ShowdownRewardMap {

  const partial:
    ShowdownRewardMap = {};


  for (
    const [
      name,
      amount,
    ]
    of Object.entries(
      rewards,
    )
  ) {

    partial[name] =
      Math.trunc(
        amount
        * 0.25,
      );
  }


  return partial;
}


/* =========================================================
   WEAPON HELPERS
========================================================= */

function normalizeOwnedName(
  value: string,
): string {

  return value
    .trim()
    .toLowerCase();
}


function isAdeptName(
  value: string,
): boolean {

  return (
    /\s*\(adept\)\s*$/i.test(
      value,
    )
  );
}


function getNormalWeaponName(
  value: string,
): string {

  return value
    .replace(
      /\s*\(adept\)\s*$/i,
      "",
    )
    .trim();
}


function hasOwnedWeapon(
  owned:
    Set<string>,

  weaponName:
    string,
): boolean {

  return owned.has(
    normalizeOwnedName(
      weaponName,
    ),
  );
}


/*
 * Universal Discordiny weapon roll:
 *
 * Step 1:
 *
 *   25% chance for a weapon.
 *
 * Step 2:
 *
 *   If successful, 10% chance for Adept.
 *
 * Normal and Adept variants are owned separately.
 *
 * Explicit "(Adept)" rows in the catalog are ignored
 * when selecting the base weapon, but may provide
 * rarity / emoji metadata for the Adept result.
 */

export function rollShowdownWeapon(
  weaponPool:
    readonly ShowdownWeaponCatalogEntry[],

  ownedWeapons:
    readonly string[] = [],

  /*
   * Retained for compatibility with the existing
   * player weapon-stat shape.
   *
   * These stats intentionally do NOT affect the
   * universal activity weapon odds.
   */
  _stats:
    ShowdownWeaponStats = {},
): ShowdownWeaponResult {

  const result:
    ShowdownWeaponResult = {

    rolled:
      true,

    dropped:
      false,

    name:
      null,

    rarity:
      null,

    emojiId:
      null,

    adept:
      false,
  };


  /* -----------------------------------------------------
     WEAPON DROP ROLL
  ----------------------------------------------------- */

  if (
    Math.random()
    >= SHOWDOWN_WEAPON_DROP_CHANCE
  ) {
    return result;
  }


  /* -----------------------------------------------------
     ADEPT ROLL
  ----------------------------------------------------- */

  const adept =
    Math.random()
    < SHOWDOWN_ADEPT_CHANCE;


  const owned =
    new Set(
      ownedWeapons.map(
        normalizeOwnedName,
      ),
    );


  /* -----------------------------------------------------
     AVAILABLE BASE WEAPONS
  ----------------------------------------------------- */

  const availablePool =
    weaponPool.filter(
      (weapon) => {

        /*
         * Explicit Adept rows are not separate
         * base weapon choices.
         */

        if (
          isAdeptName(
            weapon.name,
          )
        ) {
          return false;
        }


        const baseName =
          getNormalWeaponName(
            weapon.name,
          );


        const finalName =
          adept
            ? `${baseName} (Adept)`
            : baseName;


        /*
         * Ownership is variant-specific.
         */

        return !hasOwnedWeapon(
          owned,
          finalName,
        );
      },
    );


  /*
   * Player owns every available weapon for the
   * variant that was rolled.
   */

  if (
    availablePool.length === 0
  ) {
    return result;
  }


  const drop =
    randomChoice(
      availablePool,
    );


  if (!drop) {
    return result;
  }


  const baseName =
    getNormalWeaponName(
      drop.name,
    );


  const finalName =
    adept
      ? `${baseName} (Adept)`
      : baseName;


  /*
   * If an explicit Adept catalog row exists,
   * use its metadata.
   */

  const explicitAdeptEntry =
    adept
      ? weaponPool.find(
          (weapon) =>
            normalizeOwnedName(
              weapon.name,
            )
            === normalizeOwnedName(
              finalName,
            ),
        )
      : undefined;


  const finalEntry =
    explicitAdeptEntry
    ?? drop;


  return {

    rolled:
      true,

    dropped:
      true,

    name:
      finalName,

    rarity:
      finalEntry.rarity
      ?? drop.rarity
      ?? null,

    emojiId:
      finalEntry.emoji_id
      ?? drop.emoji_id
      ?? null,

    adept,
  };
}


/* =========================================================
   SHOWDOWN RUN
========================================================= */

export function runShowdownActivity(
  activity:
    ShowdownActivity,

  player:
    ShowdownPlayer,

  weaponPool:
    readonly ShowdownWeaponCatalogEntry[],
): ShowdownRunResult {


  /* -----------------------------------------------------
     VALIDATE ACTIVITY
  ----------------------------------------------------- */

  if (
    activity.encounters.length
    === 0
  ) {

    throw new Error(
      "Showdown has no encounters.",
    );
  }


  if (
    activity.weapon_source
      !== "seraph"
    &&
    activity.weapon_source
      !== "elivagar"
    &&
    activity.weapon_source
      !== "lucent"
    &&
    activity.weapon_source
      !== "cos"
    &&
    activity.weapon_source
      !== "sos"
    &&
    activity.weapon_source
      !== "eow"
  ) {

    throw new Error(
      "Invalid Showdown weapon source.",
    );
  }


  /* -----------------------------------------------------
     PLAYER VALUES
  ----------------------------------------------------- */

  const level =
    Math.max(
      0,

      Math.trunc(
        safeNumber(
          player.level,
        ),
      ),
    );


  const power =
    Math.max(
      0,

      safeNumber(
        player.power,
      ),
    );


  /* -----------------------------------------------------
     RUN VALUES
  ----------------------------------------------------- */

  const successChance =
    getShowdownSuccessChance(
      level,
      power,
    );


  const rewardMultiplier =
    getShowdownPowerMultiplier(
      power,
    );


  const encounterResults:
    ShowdownEncounterResult[] = [];


  const totalRewards:
    ShowdownRewardMap = {};


  let clearedEncounters =
    0;


  let wipedAt:
    string | null = null;


  /* =====================================================
     ENCOUNTERS
  ===================================================== */

  for (
    let index = 0;

    index
      < activity.encounters.length;

    index += 1
  ) {

    const encounter =
      activity.encounters[
        index
      ];


    if (!encounter) {
      continue;
    }


    const roll =
      randomFloat(
        0,
        100,
      );


    const generatedRewards =
      generateEncounterRewards(
        rewardMultiplier,
      );


    /*
     * Match Raid / Dungeon behavior:
     *
     * Encounter index 0 is guaranteed.
     *
     * Every later encounter may wipe.
     */

    const wiped =
      index > 0
      && roll > successChance;


    /* ---------------------------------------------------
       WIPE
    --------------------------------------------------- */

    if (wiped) {

      const partialRewards =
        getWipeRewards(
          generatedRewards,
        );


      mergeRewards(
        totalRewards,
        partialRewards,
      );


      encounterResults.push({

        index,

        name:
          encounter,

        cleared:
          false,

        roll,

        successChance,

        rewards:
          partialRewards,

        partialRewards:
          true,
      });


      wipedAt =
        encounter;


      break;
    }


    /* ---------------------------------------------------
       CLEAR
    --------------------------------------------------- */

    clearedEncounters += 1;


    mergeRewards(
      totalRewards,
      generatedRewards,
    );


    encounterResults.push({

      index,

      name:
        encounter,

      cleared:
        true,

      roll,

      successChance,

      rewards:
        generatedRewards,

      partialRewards:
        false,
    });
  }


  /* =====================================================
     FULL CLEAR
  ===================================================== */

  const fullClear =
    clearedEncounters
    === activity.encounters.length;


  /* =====================================================
     WEAPON
  ===================================================== */

  /*
   * Exactly like Raid / Dungeon:
   *
   * A full clear performs one weapon roll.
   *
   * A wipe does not perform a weapon roll.
   */

  const weapon:
    ShowdownWeaponResult =

    fullClear

      ? rollShowdownWeapon(

          weaponPool,

          player.ownedWeapons
            ?? [],

          player.weaponStats
            ?? {},
        )

      : {

          rolled:
            false,

          dropped:
            false,

          name:
            null,

          rarity:
            null,

          emojiId:
            null,

          adept:
            false,
        };


  /* =====================================================
     XP
  ===================================================== */

  /*
   * Full-clear XP only.
   */

  const xp =
    fullClear
      ? SHOWDOWN_REWARDS.exp
      : 0;


  /* =====================================================
     RESULT
  ===================================================== */

  return {

    activityId:
      activity.id,

    activityName:
      activity.name,

    activityType:
      "showdown",

    weaponSource:
      activity.weapon_source,

    level,

    power,

    successChance,

    rewardMultiplier,

    encounters:
      encounterResults,

    clearedEncounters,

    totalEncounters:
      activity.encounters.length,

    fullClear,

    wiped:
      !fullClear,

    wipedAt,

    rewards:
      totalRewards,

    xp,

    weapon,
  };
}
