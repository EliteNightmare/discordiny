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

export type WeaponStats = {
  exotic_chance?: number;
  legendary_chance?: number;

  /*
   * The old raid.py / weapon_drops.py source does not
   * contain an Adept probability.
   *
   * Keep this optional so the web game can add the
   * real stat later without inventing an old formula.
   */
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
 * Web addition agreed for the new game:
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
 * Power therefore scales generated encounter rewards
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
  return normalizeOwnedName(
    value,
  ).endsWith(
    "(adept)",
  );
}


function getNormalWeaponName(
  value: string,
): string {
  return value.replace(
    /\s*\(adept\)\s*$/i,
    "",
  );
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
 * Port of weapon_drops.py.
 *
 * Defaults from stats_defaults.py:
 *
 * exotic_chance    = 0.05
 * legendary_chance = 0.15
 *
 * One random roll is used:
 *
 * Exotic:
 *   roll < exoticChance
 *
 * Legendary:
 *   roll < exoticChance + legendaryChance
 *
 * Otherwise:
 *   no weapon
 *
 * Already-owned weapons cannot drop.
 *
 * IMPORTANT:
 * The Python source has no Adept probability.
 * We therefore do NOT invent one here.
 *
 * If the caller later provides a real adept_chance stat,
 * it is applied only after a normal weapon drop succeeds.
 */
export function rollEndgameWeapon(
  weaponPool:
    readonly WeaponCatalogEntry[],
  ownedWeapons:
    readonly string[] = [],
  stats:
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

  const owned =
    new Set(
      ownedWeapons.map(
        normalizeOwnedName,
      ),
    );

  /*
   * Work from normal catalog entries.
   *
   * The current web catalog may also contain explicit
   * "Weapon Name (Adept)" rows. Those are not part of
   * the old Python drop pool, so they are excluded from
   * the initial rarity roll.
   */
  const normalPool =
    weaponPool.filter(
      (weapon) =>
        !isAdeptName(
          weapon.name,
        )
        && !hasOwnedWeapon(
          owned,
          weapon.name,
        ),
    );

  if (
    normalPool.length === 0
  ) {
    return result;
  }

  const exoticChance =
    clamp(
      stats.exotic_chance
        ?? 0.05,
      0,
      1,
    );

  const legendaryChance =
    clamp(
      stats.legendary_chance
        ?? 0.15,
      0,
      1,
    );

  const exoticPool =
    normalPool.filter(
      (weapon) =>
        weapon.rarity
        === "Exotic",
    );

  const legendaryPool =
    normalPool.filter(
      (weapon) =>
        weapon.rarity
        === "Legendary",
    );

  const roll =
    Math.random();

  let drop:
    WeaponCatalogEntry
    | null = null;

  if (
    exoticPool.length > 0
    && roll < exoticChance
  ) {
    drop =
      randomChoice(
        exoticPool,
      );
  } else if (
    legendaryPool.length > 0
    && roll
      < exoticChance
        + legendaryChance
  ) {
    drop =
      randomChoice(
        legendaryPool,
      );
  }

  if (!drop) {
    return result;
  }

  let finalName =
    drop.name;

  let adept = false;

  /*
   * There is NO adept_chance in the supplied Python
   * raid/weapon source.
   *
   * This branch exists only for when Discordiny's web
   * stats later contains a real adept_chance value.
   * Undefined means 0%, so current behavior remains a
   * faithful port instead of inventing a percentage.
   */
  const adeptChance =
    clamp(
      stats.adept_chance
        ?? 0,
      0,
      1,
    );

  if (
    adeptChance > 0
    && Math.random()
      < adeptChance
  ) {
    const baseName =
      getNormalWeaponName(
        drop.name,
      );

    const adeptName =
      `${baseName} (Adept)`;

    const adeptEntry =
      weaponPool.find(
        (weapon) =>
          normalizeOwnedName(
            weapon.name,
          )
          === normalizeOwnedName(
            adeptName,
          ),
      );

    if (
      adeptEntry
      && !hasOwnedWeapon(
        owned,
        adeptEntry.name,
      )
    ) {
      finalName =
        adeptEntry.name;

      drop =
        adeptEntry;

      adept = true;
    }
  }

  return {
    rolled: true,
    dropped: true,
    name: finalName,
    rarity:
      drop.rarity ?? null,
    emojiId:
      drop.emoji_id ?? null,
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
        name: encounter,
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
     *   raid unique material    +50
     *   dungeon unique material +75
     *
     * It was gated by Acclaim >= 1.
     * Acclaim was removed from the web game, so the
     * material is now granted directly on a clear.
     *
     * Unique materials are NOT multiplied by Power in
     * the Python source because they are added after
     * reward multiplication.
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
      name: encounter,
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
   * Web rule:
   *
   * Every full clear ALWAYS performs the weapon roll.
   * The roll can still return no weapon.
   */
  const weapon =
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
   * `if complete` weapon block, which meant a raid wipe
   * could still receive 25,000 XP. For the web activity
   * system we use the intended full-clear behavior for
   * both activity types.
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
