export type VanguardActivityType = "strike" | "nightfall" | "gm";

export type VanguardActivity = {
  id: string;
  name: string;
  type: VanguardActivityType;
  destination?: string;
  weapon_source: string;
  reward_table: string;
};

export const VANGUARD_COOLDOWNS = { strike: 20, nightfall: 30, gm: 600 } as const;
export const GM_MIN_LEVEL = 50;

const STRIKE_REWARDS = {
  currencies: { Glimmer: [5000, 15000], "Lumia Leaves": [1, 1] },
  upgrades: { "Enhancement Core": [10, 25], "Enhancement Prism": [5, 10] },
  xp: 10000,
} as const;

const NIGHTFALL_REWARDS = {
  currencies: { Glimmer: [5000, 15000], "Lumia Leaves": [1, 1], "Armor Plating": [250, 500] },
  upgrades: { "Enhancement Core": [10, 25], "Enhancement Prism": [5, 10] },
  xp: 10000,
} as const;

// Retired Splicing materials are intentionally excluded.
const GM_DUNGEON_MATERIALS = [
  "avaricious treasure", "ahamkara bone", "haunted vestige", "corrupted sliver",
  "scarlet shaving", "anomalous data", "remnant wormspore", "ghost remains", "curious tablet",
] as const;
const GM_RAID_MATERIALS = [
  "ebisu alloyment", "cabal gold", "wishing coin", "tethered radiolaria",
  "herealways piece", "resonant splinter", "shadow terminal", "dissipated entropy",
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(values: readonly T[], count: number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function rollVanguardRewards(type: VanguardActivityType) {
  if (type === "gm") {
    const rewards: Record<string, number> = {};
    // Acclaim was removed, so the old acclaim multiplier is the base 1x.
    for (const name of sample(GM_DUNGEON_MATERIALS, 3)) rewards[name] = 250;
    for (const name of sample(GM_RAID_MATERIALS, 3)) rewards[name] = 150;
    rewards.Synthweave = 1500;
    rewards["Spoils of Conquest"] = 1250;
    return { rewards, xp: 50000 };
  }

  const table = type === "strike" ? STRIKE_REWARDS : NIGHTFALL_REWARDS;
  const rewards: Record<string, number> = {};
  for (const [name, range] of Object.entries(table.currencies)) rewards[name] = randomInt(range[0], range[1]);
  for (const [name, range] of Object.entries(table.upgrades)) rewards[name] = randomInt(range[0], range[1]);
  return { rewards, xp: table.xp };
}

export function rollVanguardWeapon(
  catalog: Array<{ name: string; rarity: string | null }>,
  ownedWeapons: string[],
  stats: { exotic_chance?: number; legendary_chance?: number },
) {
  const owned = new Set(ownedWeapons);
  const available = catalog.filter((w) => !owned.has(w.name));
  const exotic = available.filter((w) => w.rarity === "Exotic");
  const legendary = available.filter((w) => w.rarity === "Legendary");
  const exoticChance = Number.isFinite(stats.exotic_chance) ? Math.max(0, Number(stats.exotic_chance)) : 0.05;
  const legendaryChance = Number.isFinite(stats.legendary_chance) ? Math.max(0, Number(stats.legendary_chance)) : 0.15;
  const roll = Math.random();
  const pool = exotic.length && roll < exoticChance
    ? exotic
    : legendary.length && roll < exoticChance + legendaryChance
      ? legendary
      : [];
  if (!pool.length) return { rolled: true, dropped: false, name: null, rarity: null, adept: false };
  const weapon = pool[Math.floor(Math.random() * pool.length)];
  return { rolled: true, dropped: true, name: weapon.name, rarity: weapon.rarity, adept: false };
}

export function makeVanguardResult(
  activity: VanguardActivity,
  rewards: Record<string, number>,
  xp: number,
  weapon: ReturnType<typeof rollVanguardWeapon>,
) {
  return {
    power: 0,
    successChance: 100,
    weaponSource: activity.weapon_source,
    encounters: [{ index: 0, name: activity.name, cleared: true, rewards, partialRewards: false }],
    totalEncounters: 1,
    fullClear: true,
    wipedAt: null,
    xp,
    rewards,
    weapon,
  };
}
