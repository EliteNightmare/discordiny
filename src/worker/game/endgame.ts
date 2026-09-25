/*
 * Discordiny endgame activity engine
 *
 * Ported from the old Python raid.py reward/encounter logic.
 *
 * Intentional web-version changes:
 * - Splicing / SIVA event logic is excluded.
 * - Acclaim is removed.
 * - Power now also improves encounter clear chance:
 *     +1 percentage point per 5,000 Power.
 * - The final clear chance is still capped at 95%.
 * - A full clear always PERFORMS a weapon roll.
 * - Activity weapon rolls use the universal:
 *     25% weapon drop chance
 *     10% Adept chance after a successful drop
 *
 * This module is deliberately database-agnostic.
 * The Worker route should:
 *   1. load the player/activity/weapon pool from D1,
 *   2. call runEndgameActivity(),
 *   3. persist the returned rewards/XP/weapon,
 *   4. write the global CLEAR/WIPE announcement.
 */

export type EndgameActivityType =
  | "raid"
  | "dungeon";

export type EndgameActivity = {
  id: string;
  name: string;
  type: EndgameActivityType;
  destination?: string;
  weapon_source: string;
  reward_table:
    | "raid"
    | "dungeon";
  unique_material?: string;
  encounters: readonly string[];
};

export type WeaponCatalogEntry = {
  name: string;
  rarity: string | null;
  emoji_id?: string | null;
};

/*
 * Kept for compatibility with the existing Worker.
 *
 * These stats no longer control activity weapon drops.
 * Discordiny activities now use the universal
 * 25% weapon / 10% Adept rule.
 */
export type WeaponStats = {
  exotic_chance?: number;
  legendary_chance?: number;
  adept_chance?: number;
};

export type EndgamePlayer = {
  level: number;
  power: number;
  weaponStats?: WeaponStats;
  ownedWeapons?: readonly string[];
};

export type EndgameRewardMap =
  Record<string, number>;

export type EndgameEncounterResult = {
  index: number;
  name: string;
  cleared: boolean;
  roll: number;
  successChance: number;
  rewards: EndgameRewardMap;
  partialRewards: boolean;
};

export type EndgameWeaponResult = {
  rolled: boolean;
  dropped: boolean;
  name: string | null;
  rarity: string | null;
  emojiId: string | null;
  adept: boolean;
};

export type EndgameRunResult = {
  activityId: string;
  activityName: string;
  activityType: EndgameActivityType;
  destination: string | null;
  weaponSource: string;

  level: number;
  power: number;
  successChance: number;
  rewardMultiplier: number;

  encounters: EndgameEncounterResult[];
  clearedEncounters: number;
  totalEncounters: number;

  fullClear: boolean;
  wiped: boolean;
  wipedAt: string | null;

  rewards: EndgameRewardMap;
  xp: number;

  weapon: EndgameWeaponResult;
};

type RewardRange = readonly [
  number,
  number,
];

type RewardTable = {
  currencies: Record<
    string,
    RewardRange
  >;

  upgradeMaterials: Record<
    string,
    RewardRange
  >;

  exp: number;

  uniqueMaterialAmount: number;
};


/* =========================================================
   SOURCE REWARD TABLES
========================================================= */

/*
 * raid_rewards.py
 *
 * Glimmer              15,000–25,000
 * Lumia Leaves              1
 * Spoils of Conquest       10–25
 * Enhancement Core         15–30
 * Enhancement Prism        10–25
 * Ascendant Shard           3–7
 * XP                       25,000
 *
 * raid.py additionally granted 50 of the activity's
 * unique material on a cleared encounter when Acclaim >= 1.
 *
 * Acclaim no longer exists, so the unique material is now
 * granted on every cleared encounter.
 */
const RAID_REWARDS: RewardTable = {
  currencies: {
    Glimmer: [15000, 25000],
    "Lumia Leaves": [1, 1],
    "Spoils of Conquest": [10, 25],
  },

  upgradeMaterials: {
    "Enhancement Core": [15, 30],
    "Enhancement Prism": [10, 25],
    "Ascendant Shard": [3, 7],
  },

  exp: 25000,

  uniqueMaterialAmount: 50,
};


/*
 * dungeon_rewards.py
 *
 * Glimmer              15,000–25,000
 * Lumia Leaves              1
 * Synthweave               10–25
 * Enhancement Core         15–30
 * Enhancement Prism        10–25
 * Ascendant Shard           3–7
 * XP                       15,000
 *
 * raid.py additionally granted 75 of the activity's
 * unique material on a cleared encounter when Acclaim >= 1.
 *
 * Acclaim no longer exists, so the unique material is now
 * granted on every cleared encounter.
 */
const DUNGEON_REWARDS: RewardTable = {
  currencies: {
    Glimmer: [15000, 25000],
    "Lumia Leaves": [1, 1],
    Synthweave: [10, 25],
  },

  upgradeMaterials: {
    "Enhancement Core": [15, 30],
    "Enhancement Prism": [10, 25],
    "Ascendant Shard": [3, 7],
  },

  exp: 15000,

  uniqueMaterialAmount: 75,
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
    Math.ceil(min);

  const upper =
    Math.floor(max);

  return Math.floor(
    Math.random()
      * (upper - lower + 1),
  ) + lower;
}


function randomChoice<T>(
  values: readonly T[],
): T | null {
  if (values.length === 0) {
    return null;
  }

  return values[
    randomIntInclusive(
      0,
      values.length - 1,
    )
  ] ?? null;
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
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return value;
}


/* =========================================================
   GAME CALCULATIONS
========================================================= */

/*
 * Old raid.py:
 *
 * min(
 *   95,
 *   60 + (level * 0.3)
 * )
 *
 * Web addition:
 *
 * +1 percentage point for every 5,000 Power.
 *
 * The original 95% ceiling remains.
 */
export function getEndgameSuccessChance(
  level: number,
  power: number,
): number {
  const safeLevel =
    Math.max(
      0,
      safeNumber(level),
    );

  const safePower =
    Math.max(
      0,
      safeNumber(power),
    );

  const levelChance =
    60
    + safeLevel * 0.3;

  const powerBonus =
    safePower / 5000;

  return clamp(
    levelChance + powerBonus,
    0,
    95,
  );
}


/*
 * Direct port of raid.py:
 *
 * 1 + (min(power, 100000) / 10000)
 *
 * Power scales generated encounter rewards
 * up to an 11x multiplier at 100,000 Power.
 */
export function getEndgamePowerMultiplier(
  power: number,
): number {
  const safePower =
    Math.max(
      0,
      safeNumber(power),
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

function getRewardTable(
  type: EndgameActivityType,
): RewardTable {
  return type === "raid"
    ? RAID_REWARDS
    : DUNGEON_REWARDS;
}


function generateEncounterRewards(
  table: RewardTable,
  multiplier: number,
): EndgameRewardMap {
  const rewards:
    EndgameRewardMap = {};

  for (
    const [name, range]
    of Object.entries(
      table.currencies,
    )
  ) {
    const base =
      randomIntInclusive(
        range[0],
        range[1],
      );

    rewards[name] =
      Math.trunc(
        base * multiplier,
      );
  }

  for (
    const [name, range]
    of Object.entries(
      table.upgradeMaterials,
    )
  ) {
    const base =
      randomIntInclusive(
        range[0],
        range[1],
      );

    rewards[name] =
      Math.trunc(
        base * multiplier,
      );
  }

  return rewards;
}


function addReward(
  rewards: EndgameRewardMap,
  name: string,
  amount: number,
): void {
  rewards[name] =
    (rewards[name] ?? 0)
    + amount;
}


function mergeRewards(
  target: EndgameRewardMap,
  source: EndgameRewardMap,
): void {
  for (
    const [name, amount]
    of Object.entries(source)
  ) {
    addReward(
      target,
      name,
      amount,
    );
  }
}


function getWipeRewards(
  rewards: EndgameRewardMap,
): EndgameRewardMap {
  const partial:
    EndgameRewardMap = {};

  for (
    const [name, amount]
    of Object.entries(rewards)
  ) {
    /*
     * Direct port:
     *
     * int(amount * 0.25)
     */
    partial[name] =
      Math.trunc(
        amount * 0.25,
      );
  }

  return partial;
}


/* =========================================================
   WEAPON HELPERS
========================================================= */

export const ACTIVITY_WEAPON_DROP_CHANCE =
  0.25;

export const ACTIVITY_ADEPT_CHANCE =
  0.10;


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
  owned: Set<string>,
  weaponName: string,
): boolean {
  return owned.has(
    normalizeOwnedName(
      weaponName,
    ),
  );
}


/*
 * Universal Discordiny activity weapon rule.
 *
 * Every time an activity performs a weapon roll:
 *
 *   25% chance to receive a weapon.
 *
 * If that succeeds:
 *
 *   10% chance for that weapon to be Adept.
 *
 * Normal and Adept ownership are separate:
 *
 *   Weapon Name
 *   Weapon Name (Adept)
 *
 * The old exotic_chance / legendary_chance stats
 * no longer control activity weapon drops.
 */
export function rollEndgameWeapon(
  weaponPool:
    readonly WeaponCatalogEntry[],

  ownedWeapons:
    readonly string[] = [],

  /*
   * Retained only so existing Worker calls that still
   * pass player.weaponStats remain source-compatible.
   *
   * These values are intentionally ignored.
   */
  _stats:
    WeaponStats = {},
): EndgameWeaponResult {
  const result:
    EndgameWeaponResult = {
      rolled: true,
      dropped: false,
      name: null,
      rarity: null,
      emojiId: null,
      adept: false,
    };

  /*
   * First roll:
   *
   * Does any weapon drop?
   */
  if (
    Math.random()
    >= ACTIVITY_WEAPON_DROP_CHANCE
  ) {
    return result;
  }

  /*
   * Second roll:
   *
   * If a weapon drops, is it Adept?
   */
  const adept =
    Math.random()
    < ACTIVITY_ADEPT_CHANCE;

  const owned =
    new Set(
      ownedWeapons.map(
        normalizeOwnedName,
      ),
    );

  /*
   * Build the available base-weapon pool.
   *
   * Explicit "(Adept)" rows are not treated as
   * separate base weapons.
   *
   * Ownership is checked against whichever variant
   * was rolled.
   */
  const availablePool =
    weaponPool.filter(
      (weapon) => {
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
   * If the master weapon catalog happens to contain
   * an explicit Adept entry, use its metadata.
   *
   * If not, use the base weapon's rarity / emoji
   * while storing the weapon as:
   *
   * Weapon Name (Adept)
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
    rolled: true,
    dropped: true,

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
   ENDGAME RUN
========================================================= */

export function runEndgameActivity(
  activity: EndgameActivity,
  player: EndgamePlayer,
  weaponPool:
    readonly WeaponCatalogEntry[],
): EndgameRunResult {
  if (
    activity.type !== "raid"
    && activity.type !== "dungeon"
  ) {
    throw new Error(
      "Endgame engine only supports raids and dungeons.",
    );
  }

  if (
    activity.encounters.length
    === 0
  ) {
    throw new Error(
      "Activity has no encounters.",
    );
  }

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

  const successChance =
    getEndgameSuccessChance(
      level,
      power,
    );

  const rewardMultiplier =
    getEndgamePowerMultiplier(
      power,
    );

  const table =
    getRewardTable(
      activity.type,
    );

  const encounterResults:
    EndgameEncounterResult[] = [];

  const totalRewards:
    EndgameRewardMap = {};

  let clearedEncounters = 0;

  let wipedAt:
    string | null = null;

  for (
    let index = 0;
    index
      < activity.encounters.length;
    index += 1
  ) {
    const encounter =
      activity.encounters[index];

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
        table,
        rewardMultiplier,
      );

    /*
     * Direct old raid.py behavior:
     *
     * index > 0
     *
     * means encounter zero cannot wipe.
     */
    const wiped =
      index > 0
      && roll > successChance;

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

        cleared: false,

        roll,

        successChance,

        rewards:
          partialRewards,

        partialRewards: true,
      });

      wipedAt =
        encounter;

      break;
    }

    clearedEncounters += 1;

    /*
     * Old raid.py:
     *
     * Raid unique material:
     *   +50
     *
     * Dungeon unique material:
     *   +75
     *
     * It was previously gated by Acclaim >= 1.
     *
     * Acclaim was removed from the web game, so the
     * unique material is granted directly.
     *
     * Unique materials are not multiplied by Power.
     */
    if (
      activity.unique_material
    ) {
      addReward(
        generatedRewards,

        activity.unique_material,

        table.uniqueMaterialAmount,
      );
    }

    mergeRewards(
      totalRewards,
      generatedRewards,
    );

    encounterResults.push({
      index,

      name:
        encounter,

      cleared: true,

      roll,

      successChance,

      rewards:
        generatedRewards,

      partialRewards: false,
    });
  }

  const fullClear =
    clearedEncounters
    === activity.encounters.length;

  /*
   * Every full Raid/Dungeon clear performs exactly
   * one weapon roll.
   *
   * The weapon roll itself now has:
   *
   * 25% weapon chance
   * 10% Adept chance if the weapon roll succeeds
   *
   * A wipe does not perform the weapon roll.
   */
  const weapon:
    EndgameWeaponResult =
    fullClear
      ? rollEndgameWeapon(
          weaponPool,

          player.ownedWeapons
            ?? [],

          player.weaponStats
            ?? {},
        )
      : {
          rolled: false,
          dropped: false,
          name: null,
          rarity: null,
          emojiId: null,
          adept: false,
        };

  /*
   * Full-clear XP.
   *
   * Dungeon raid.py already awarded this only on a
   * complete run.
   *
   * The old raid.py placed raid XP outside its
   * `if complete` weapon block, which meant a raid
   * wipe could still receive 25,000 XP.
   *
   * The web activity system uses the intended
   * full-clear behavior for both activity types.
   */
  const xp =
    fullClear
      ? table.exp
      : 0;

  return {
    activityId:
      activity.id,

    activityName:
      activity.name,

    activityType:
      activity.type,

    destination:
      activity.destination
      ?? null,

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
