export type VaultActivity = {
  name: string;
  slug: string;
  weaponSource: string;
};

export type VaultCategory = {
  name: string;
  slug: string;
  description: string;

  // Goes directly to a weapon pool instead of
  // showing another activity selection screen.
  directSource?: string;

  // Activities/sources shown inside this category.
  activities?: VaultActivity[];
};

export const VAULT_CATEGORIES: VaultCategory[] = [
  {
    name: "Destinations",
    slug: "destinations",
    description: "Destination weapon collections",
    activities: [],
  },

  {
    name: "Fishing",
    slug: "fishing",
    description: "Fishing weapon collection",
    directSource: "fishing",
  },

  {
    name: "Dungeons",
    slug: "dungeons",
    description: "Dungeon weapon collections",
    activities: [
      {
        name: "Grasp of Avarice",
        slug: "grasp-of-avarice",
        weaponSource: "goa",
      },
      {
        name: "Warlord's Ruin",
        slug: "warlords-ruin",
        weaponSource: "wr",
      },
      {
        name: "Duality",
        slug: "duality",
        weaponSource: "dual",
      },
      {
        name: "Shattered Throne",
        slug: "shattered-throne",
        weaponSource: "st",
      },
      {
        name: "Pit of Heresy",
        slug: "pit-of-heresy",
        weaponSource: "poh",
      },
      {
        name: "Vesper's Host",
        slug: "vespers-host",
        weaponSource: "vh",
      },
      {
        name: "Sundered Doctrine",
        slug: "sundered-doctrine",
        weaponSource: "sd",
      },
      {
        name: "Ghosts of the Deep",
        slug: "ghosts-of-the-deep",
        weaponSource: "gotd",
      },
      {
        name: "Prophecy",
        slug: "prophecy",
        weaponSource: "proph",
      },

      // Daily dungeons
      {
        name: "Spire of the Watcher",
        slug: "spire-of-the-watcher",
        weaponSource: "sotw",
      },
      {
        name: "Equilibrium",
        slug: "equilibrium",
        weaponSource: "eq",
      },
    ],
  },

  {
    name: "Raids",
    slug: "raids",
    description: "Raid weapon collections",
    activities: [
      {
        name: "Scourge of the Past",
        slug: "scourge-of-the-past",
        weaponSource: "scourge",
      },
      {
        name: "Leviathan",
        slug: "leviathan",
        weaponSource: "levi",
      },
      {
        name: "Last Wish",
        slug: "last-wish",
        weaponSource: "lw",
      },
      {
        name: "Garden of Salvation",
        slug: "garden-of-salvation",
        weaponSource: "gos",
      },
      {
        name: "Deepstone Crypt",
        slug: "deepstone-crypt",
        weaponSource: "dsc",
      },
      {
        name: "Vow of the Disciple",
        slug: "vow-of-the-disciple",
        weaponSource: "vow",
      },
      {
        name: "Root of Nightmares",
        slug: "root-of-nightmares",
        weaponSource: "ron",
      },
      {
        name: "Salvation's Edge",
        slug: "salvations-edge",
        weaponSource: "se",
      },

      // Daily raids
      {
        name: "Vault of Glass",
        slug: "vault-of-glass",
        weaponSource: "vog",
      },
      {
        name: "King's Fall",
        slug: "kings-fall",
        weaponSource: "kf",
      },
      {
        name: "Crota's End",
        slug: "crotas-end",
        weaponSource: "ce",
      },
      {
        name: "Ultimate Desert Perpetual",
        slug: "ultimate-desert-perpetual",
        weaponSource: "udp",
      },
    ],
  },

  {
    name: "Strikes",
    slug: "strikes",
    description: "Strike weapon collection",
    directSource: "strike",
  },

  {
    name: "Nightfalls",
    slug: "nightfalls",
    description: "Nightfall weapon collection",
    directSource: "nf",
  },

  {
    name: "Grandmasters",
    slug: "grandmasters",
    description: "Grandmaster weapon collection",
    directSource: "gm",
  },

  {
    name: "Infiltrations",
    slug: "infiltrations",
    description: "Infiltration weapon collections",
    activities: [
      {
        name: "Battlegrounds",
        slug: "battlegrounds",
        weaponSource: "bgs",
      },
      {
        name: "Empire Hunt",
        slug: "empire-hunt",
        weaponSource: "emph",
      },
      {
        name: "Nightmare Hunt",
        slug: "nightmare-hunt",
        weaponSource: "nigh",
      },
    ],
  },

  {
    name: "Showdowns",
    slug: "showdowns",
    description: "Showdown weapon collections",
    activities: [
      {
        name: "Exo Challenge",
        slug: "exo-challenge",
        weaponSource: "seraph",
      },
      {
        name: "Great Hunt",
        slug: "great-hunt",
        weaponSource: "elivagar",
      },
      {
        name: "Lucent Fireteam",
        slug: "lucent-fireteam",
        weaponSource: "lucent",
      },

      // Daily showdowns
      {
        name: "Crown of Sorrow",
        slug: "crown-of-sorrow",
        weaponSource: "cos",
      },
      {
        name: "Spire of Stars",
        slug: "spire-of-stars",
        weaponSource: "sos",
      },
      {
        name: "Eater of Worlds",
        slug: "eater-of-worlds",
        weaponSource: "eow",
      },
    ],
  },

  {
    name: "Crawls",
    slug: "crawls",
    description: "Crawl weapon collections",
    activities: [
      {
        name: "The Coil",
        slug: "the-coil",
        weaponSource: "coil",
      },
      {
        name: "Kells Contest",
        slug: "kells-contest",
        weaponSource: "contest",
      },
      {
        name: "The Nether",
        slug: "the-nether",
        weaponSource: "nether",
      },
    ],
  },

  {
    name: "Events",
    slug: "events",
    description: "Event weapon collections",
    activities: [],
  },
];

export function getVaultCategory(
  slug: string,
): VaultCategory | undefined {
  return VAULT_CATEGORIES.find(
    (category) => category.slug === slug,
  );
}

export function getVaultActivity(
  categorySlug: string,
  activitySlug: string,
): VaultActivity | undefined {
  const category = getVaultCategory(categorySlug);

  return category?.activities?.find(
    (activity) => activity.slug === activitySlug,
  );
}
