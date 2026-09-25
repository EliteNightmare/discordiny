export type VanguardActivityType =
  | "strike"
  | "nightfall"
  | "gm";

export type VanguardActivity = {
  id: string;
  name: string;
  type: VanguardActivityType;
  destination?: string;
  weapon_source: string;
  reward_table: string;
};

export const VANGUARD_COOLDOWNS = {
  strike: 20,
  nightfall: 30,
  gm: 600,
} as const;

export const GM_MIN_LEVEL = 50;

/*
 * Universal Discordiny activity weapon odds.
 *
 * These now apply to activity weapon rolls instead
 * of the old exotic_chance / legendary_chance stats.
 */
export const ACTIVITY_WEAPON_DROP_CHANCE =
  0.25;

export const ACTIVITY_ADEPT_CHANCE =
  0.10;

const STRIKE_REWARDS = {
  currencies: {
    Glimmer: [5000, 15000],
    "Lumia Leaves": [1, 1],
  },

  upgrades: {
    "Enhancement Core": [10, 25],
    "Enhancement Prism": [5, 10],
  },

  xp: 10000,
} as const;

const NIGHTFALL_REWARDS = {
  currencies: {
    Glimmer: [5000, 15000],
    "Lumia Leaves": [1, 1],
    "Armor Plating": [250, 500],
  },

  upgrades: {
    "Enhancement Core": [10, 25],
    "Enhancement Prism": [5, 10],
  },

  xp: 10000,
} as const;

/*
 * Retired Splicing materials are intentionally
 * excluded from the GM reward pool.
 */
const GM_DUNGEON_MATERIALS = [
  "avaricious treasure",
  "ahamkara bone",
  "haunted vestige",
  "corrupted sliver",
  "scarlet shaving",
  "anomalous data",
  "remnant wormspore",
  "ghost remains",
  "curious tablet",
] as const;

const GM_RAID_MATERIALS = [
  "ebisu alloyment",
  "cabal gold",
  "wishing coin",
  "tethered radiolaria",
  "herealways piece",
  "resonant splinter",
  "shadow terminal",
  "dissipated entropy",
] as const;


/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomInt(
  min: number,
  max: number,
) {
  return (
    Math.floor(
      Math.random()
      * (max - min + 1),
    )
    + min
  );
}


function sample<T>(
  values: readonly T[],
  count: number,
): T[] {
  const copy =
    [...values];

  for (
    let i = copy.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random()
        * (i + 1),
      );

    [
      copy[i],
      copy[j],
    ] = [
      copy[j],
      copy[i],
    ];
  }

  return copy.slice(
    0,
    count,
  );
}


/* =========================================================
   WEAPON NAME HELPERS
========================================================= */

function normalizeWeaponName(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}


function isAdeptWeaponName(
  value: string,
) {
  return (
    /\s*\(adept\)\s*$/i.test(
      value,
    )
  );
}


function getBaseWeaponName(
  value: string,
) {
  return value
    .replace(
      /\s*\(adept\)\s*$/i,
      "",
    )
    .trim();
}


/* =========================================================
   VANGUARD REWARDS
========================================================= */

export function rollVanguardRewards(
  type: VanguardActivityType,
) {
  if (type === "gm") {
    const rewards:
      Record<string, number> = {};

    /*
     * Acclaim was removed.
     *
     * The old acclaim multiplier therefore remains
     * at its base 1x value.
     */
    for (
      const name
      of sample(
        GM_DUNGEON_MATERIALS,
        3,
      )
    ) {
      rewards[name] = 250;
    }

    for (
      const name
      of sample(
        GM_RAID_MATERIALS,
        3,
      )
    ) {
      rewards[name] = 150;
    }

    rewards.Synthweave =
      1500;

    rewards[
      "Spoils of Conquest"
    ] = 1250;

    return {
      rewards,
      xp: 50000,
    };
  }

  const table =
    type === "strike"
      ? STRIKE_REWARDS
      : NIGHTFALL_REWARDS;

  const rewards:
    Record<string, number> = {};

  for (
    const [name, range]
    of Object.entries(
      table.currencies,
    )
  ) {
    rewards[name] =
      randomInt(
        range[0],
        range[1],
      );
  }

  for (
    const [name, range]
    of Object.entries(
      table.upgrades,
    )
  ) {
    rewards[name] =
      randomInt(
        range[0],
        range[1],
      );
  }

  return {
    rewards,
    xp: table.xp,
  };
}


/* =========================================================
   VANGUARD WEAPON ROLL
========================================================= */

/*
 * Universal activity weapon rule:
 *
 * 25% chance to receive a weapon.
 *
 * If that weapon roll succeeds:
 *
 * 10% chance for the dropped weapon to be Adept.
 *
 * Normal and Adept versions are treated as separate
 * ownership entries:
 *
 *   Weapon Name
 *   Weapon Name (Adept)
 *
 * The old exotic_chance / legendary_chance player
 * stats are intentionally no longer used here.
 */
export function rollVanguardWeapon(
  catalog: Array<{
    name: string;
    rarity: string | null;
  }>,
  ownedWeapons: string[],
) {
  /*
   * First roll:
   *
   * Does a weapon drop?
   */
  if (
    Math.random()
    >= ACTIVITY_WEAPON_DROP_CHANCE
  ) {
    return {
      rolled: true,
      dropped: false,
      name: null,
      rarity: null,
      adept: false,
    };
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
        normalizeWeaponName,
      ),
    );

  /*
   * Work from the base weapon catalog.
   *
   * Explicit "(Adept)" rows are not treated as
   * separate base weapons.
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
   * The player already owns every weapon available
   * for the variant that was rolled.
   */
  if (
    available.length === 0
  ) {
    return {
      rolled: true,
      dropped: false,
      name: null,
      rarity: null,
      adept: false,
    };
  }

  const weapon =
    available[
      Math.floor(
        Math.random()
        * available.length,
      )
    ];

  const baseName =
    getBaseWeaponName(
      weapon.name,
    );

  return {
    rolled: true,
    dropped: true,

    name:
      adept
        ? `${baseName} (Adept)`
        : baseName,

    rarity:
      weapon.rarity,

    adept,
  };
}


/* =========================================================
   VANGUARD RESULT
========================================================= */

export function makeVanguardResult(
  activity: VanguardActivity,

  rewards:
    Record<string, number>,

  xp: number,

  weapon:
    ReturnType<
      typeof rollVanguardWeapon
    >,
) {
  return {
    power: 0,

    successChance: 100,

    weaponSource:
      activity.weapon_source,

    encounters: [
      {
        index: 0,

        name:
          activity.name,

        cleared: true,

        rewards,

        partialRewards: false,
      },
    ],

    totalEncounters: 1,

    fullClear: true,

    wipedAt: null,

    xp,

    rewards,

    weapon,
  };
}
