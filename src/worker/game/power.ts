const MAX_LEVEL = 100;

const NORMAL_WEAPON_POWER = 100;
const ADEPT_WEAPON_POWER = 200;
const MASTERWORK_POWER = 50;

const ARMOR_POWER_PER_LEVEL = 250;
const ARTIFACT_POWER_PER_LEVEL = 1000;
const LEVEL_POWER_PER_LEVEL = 100;

const ARMOR_PROGRESSION = [
  "placeholder",
  "cosmodrome",
  "graspofavarice",
  "edz",
  "warlordsruin",
  "scourgeofthepast",
  "nessus",
  "duality",
  "leviathan",
  "dreamingcity",
  "shatteredthrone",
  "lastwish",
  "moon",
  "pitofheresy",
  "gardenofsalvation",
  "europa",
  "vespershost",
  "deepstonecrypt",
  "throneworld",
  "sundereddoctrine",
  "vowofthedisciple",
  "neomuna",
  "ghostsofthedeep",
  "rootofnightmares",
  "paleheart",
  "prophecy",
  "salvationsedge",
] as const;

type WeaponRow = {
  weapon_name: string;
  masterwork: number;
  rarity: string | null;
};

type ArmorRow = {
  helmet: string;
  arms: string;
  chest: string;
  legs: string;
};

type ArtifactRow = {
  artifact_name: string;
  level: number;
};

export function calculateWeaponPower(
  weapons: WeaponRow[]
): number {
  let total = 0;

  for (const weapon of weapons) {
    const rarity =
      String(weapon.rarity ?? "normal")
        .trim()
        .toLowerCase();

    total +=
      rarity === "adept"
        ? ADEPT_WEAPON_POWER
        : NORMAL_WEAPON_POWER;

    const masterwork = Math.max(
      0,
      Number(weapon.masterwork) || 0
    );

    total +=
      masterwork * MASTERWORK_POWER;
  }

  return total;
}

export function calculateArmorPower(
  armor: ArmorRow | null
): number {
  if (!armor) {
    return 0;
  }

  let total = 0;

  const slots = [
    armor.helmet,
    armor.arms,
    armor.chest,
    armor.legs,
  ];

  for (const value of slots) {
    if (!value) {
      continue;
    }

    const name = String(value)
      .trim()
      .toLowerCase();

    if (name === "placeholder") {
      continue;
    }

    const level =
      ARMOR_PROGRESSION.indexOf(
        name as (typeof ARMOR_PROGRESSION)[number]
      );

    if (level >= 0) {
      total +=
        level * ARMOR_POWER_PER_LEVEL;
    }
  }

  return total;
}

export function calculateArtifactPower(
  artifacts: ArtifactRow[]
): number {
  let totalLevels = 0;

  for (const artifact of artifacts) {
    totalLevels += Math.max(
      0,
      Number(artifact.level) || 0
    );
  }

  return (
    totalLevels *
    ARTIFACT_POWER_PER_LEVEL
  );
}

export function calculateLevelPower(
  level: number
): number {
  const clamped = Math.max(
    0,
    Math.min(
      Number(level) || 0,
      MAX_LEVEL
    )
  );

  return (
    clamped *
    LEVEL_POWER_PER_LEVEL
  );
}
