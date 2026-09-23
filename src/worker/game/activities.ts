export type ActivityDefinition = {
  name: string;
  type: string;
  destination?: string;
  weapon_source?: string;
  reward_table?: string;
  unique_material?: string;
  encounters?: string[];
};

export type ActivityCategory = Record<string, ActivityDefinition>;

export const ACTIVITIES = {
  "raids": {
    "scourge": {
      "name": "Scourge of the Past",
      "type": "raid",
      "destination": "EDZ",
      "weapon_source": "scourge",
      "reward_table": "raid",
      "unique_material": "ebisu alloyment",
      "encounters": [
        "Berserker",
        "Ablazed Glory",
        "Vault Access",
        "INSURRECTION: PRIME"
      ]
    },
    "leviathan": {
      "name": "The Leviathan",
      "type": "raid",
      "destination": "Nessus",
      "weapon_source": "levi",
      "reward_table": "raid",
      "unique_material": "cabal gold",
      "encounters": [
        "Royal Pools",
        "Gauntlet",
        "Pleasure Gardens",
        "Emperor Calus"
      ]
    },
    "lastwish": {
      "name": "Last Wish",
      "type": "raid",
      "destination": "Dreaming City",
      "weapon_source": "lw",
      "reward_table": "raid",
      "unique_material": "wishing coin",
      "encounters": [
        "Kalli",
        "Shuro-Chi",
        "Morgeth",
        "The Vault",
        "Riven of a Thousand Voices",
        "The Queenswalk"
      ]
    },
    "garden": {
      "name": "Garden of Salvation",
      "type": "raid",
      "destination": "Moon",
      "weapon_source": "gos",
      "reward_table": "raid",
      "unique_material": "tethered radiolaria",
      "encounters": [
        "Evade the Mind",
        "Awaken the Mind",
        "Consecrated Mind",
        "Sanctified Mind"
      ]
    },
    "deepstone": {
      "name": "Deepstone Crypt",
      "type": "raid",
      "destination": "Europa",
      "weapon_source": "dsc",
      "reward_table": "raid",
      "unique_material": "herealways piece",
      "encounters": [
        "Security Breach",
        "Atraks-1, Fallen Exo",
        "Nuclear Descent",
        "Taniks, the Abomination"
      ]
    },
    "vowdisciple": {
      "name": "Vow of the Disciple",
      "type": "raid",
      "destination": "Throne World",
      "weapon_source": "vow",
      "reward_table": "raid",
      "unique_material": "resonant splinter",
      "encounters": [
        "Acquisition",
        "The Caretaker",
        "Exhibition",
        "Rhulk, Disciple of the Witness"
      ]
    },
    "root": {
      "name": "Root of Nightmares",
      "type": "raid",
      "destination": "Neomuna",
      "weapon_source": "ron",
      "reward_table": "raid",
      "unique_material": "shadow terminal",
      "encounters": [
        "Cataclysm",
        "Scission",
        "Zo'aurc, Explicator of Planets",
        "Nezarec, Final God of Pain"
      ]
    },
    "sedge": {
      "name": "Salvation's Edge",
      "type": "raid",
      "destination": "Pale Heart",
      "weapon_source": "se",
      "reward_table": "raid",
      "unique_material": "dissipated entropy",
      "encounters": [
        "Substratum",
        "Herald of Finality",
        "Repository",
        "Verity",
        "The Witness"
      ]
    }
  },
  "dungeons": {
    "grasp": {
      "name": "Grasp of Avarice",
      "type": "dungeon",
      "destination": "Cosmodrome",
      "weapon_source": "goa",
      "reward_table": "dungeon",
      "unique_material": "avaricious treasure",
      "encounters": [
        "Phry'zhia The Insatiable",
        "Fallen Shield Shutdown",
        "Captain Avarokk, the Covetous"
      ]
    },
    "warlord": {
      "name": "Warlord's Ruin",
      "type": "dungeon",
      "destination": "EDZ",
      "weapon_source": "wr",
      "reward_table": "dungeon",
      "unique_material": "ahamkara bone",
      "encounters": [
        "Rathil, First Broken Knight of Fikrul",
        "Locus of Wailing Grief",
        "Hefnd's Vengeance, Blighted Chimaera"
      ]
    },
    "duality": {
      "name": "Duality",
      "type": "dungeon",
      "destination": "Nessus",
      "weapon_source": "dual",
      "reward_table": "dungeon",
      "unique_material": "haunted vestige",
      "encounters": [
        "Nightmare of Gahlran, Sorrow Bearer",
        "Calus' Vault of Nightmares",
        "Nightmare of Caiatl, Princess-Imperial"
      ]
    },
    "shathrone": {
      "name": "Shattered Throne",
      "type": "dungeon",
      "destination": "Dreaming City",
      "weapon_source": "st",
      "reward_table": "dungeon",
      "unique_material": "corrupted sliver",
      "encounters": [
        "Erebus, Eleusinia",
        "Vorgeth, Boundless Hunger",
        "Dûl Incaru, the Eternal Return"
      ]
    },
    "ptoh": {
      "name": "Pit of Heresy",
      "type": "dungeon",
      "destination": "Moon",
      "weapon_source": "poh",
      "reward_table": "dungeon",
      "unique_material": "scarlet shaving",
      "encounters": [
        "The Necropolis",
        "Chamber of Suffering",
        "Zulmak, Instrument of Torment"
      ]
    },
    "vespers": {
      "name": "Vesper's Host",
      "type": "dungeon",
      "destination": "Europa",
      "weapon_source": "vh",
      "reward_table": "dungeon",
      "unique_material": "anomalous data",
      "encounters": [
        "Security Reactivation",
        "Raneiks, Unified",
        "The Corrupted Puppeteer"
      ]
    },
    "sundered": {
      "name": "Sundered Doctrine",
      "type": "dungeon",
      "destination": "Throne World",
      "weapon_source": "sd",
      "reward_table": "dungeon",
      "unique_material": "remnant wormspore",
      "encounters": [
        "Solve the Riddle",
        "Zoetic Lockset",
        "Kerrev, the Erased"
      ]
    },
    "gotd": {
      "name": "Ghosts of the Deep",
      "type": "dungeon",
      "destination": "Neomuna",
      "weapon_source": "gotd",
      "reward_table": "dungeon",
      "unique_material": "ghost remains",
      "encounters": [
        "Disrupt the Ritual",
        "Ecthar, the Shield of Savathûn",
        "Šimmumah ur-Nokru, Lucent Necromancer"
      ]
    },
    "proph": {
      "name": "Prophecy",
      "type": "dungeon",
      "destination": "Pale Heart",
      "weapon_source": "proph",
      "reward_table": "dungeon",
      "unique_material": "curious tablet",
      "encounters": [
        "Phalanx Echo",
        "The Hexahedron",
        "Kell Echo"
      ]
    }
  },
  "infiltrations": {
    "battlegrounds": {
      "name": "Battlegrounds",
      "type": "pinnacle",
      "weapon_source": "bgs",
      "reward_table": "pinnacle",
      "encounters": [
        "Battleground: Delve",
        "Battleground: Conduit",
        "Battleground: Core"
      ]
    },
    "empirehunts": {
      "name": "Empire Hunt",
      "type": "pinnacle",
      "weapon_source": "emph",
      "reward_table": "pinnacle",
      "encounters": [
        "Empire Hunt: The Warrior",
        "Empire Hunt: The Priest",
        "Empire Hunt: The Technocrat"
      ]
    },
    "nightmarehunts": {
      "name": "Nightmare Hunt",
      "type": "pinnacle",
      "weapon_source": "nigh",
      "reward_table": "pinnacle",
      "encounters": [
        "Nightmare Hunt: Skolas",
        "Nightmare Hunt: Fikrul",
        "Nightmare Hunt: Dominus Ghaul"
      ]
    }
  },
  "showdowns": {
    "exochallenge": {
      "name": "Exo Challenge",
      "type": "pinnacle",
      "weapon_source": "seraph",
      "reward_table": "pinnacle",
      "encounters": [
        "Exo Challenge: Agility",
        "Exo Challenge: Safeguard",
        "Exo Challenge: Survival"
      ]
    },
    "greathunt": {
      "name": "Great Hunt",
      "type": "pinnacle",
      "weapon_source": "elivagar",
      "reward_table": "pinnacle",
      "encounters": [
        "Ginunaga",
        "Gladsheim",
        "Hvergelmir"
      ]
    },
    "lucentbrood": {
      "name": "Lucent Fireteam",
      "type": "pinnacle",
      "weapon_source": "lucent",
      "reward_table": "pinnacle",
      "encounters": [
        "Arak-Thul, Lightbearer Acolyte",
        "Kish-Agesor, Lightbearer Knight",
        "Dûl Alai, Lightbearer Wizard"
      ]
    }
  },
  "crawls": {
    "coil": {
      "name": "The Coil",
      "type": "pinnacle",
      "weapon_source": "coil",
      "reward_table": "pinnacle",
      "encounters": [
        "Chiasmus",
        "Enthymeme",
        "Polysemy",
        "Synchysis"
      ]
    },
    "contest": {
      "name": "Kells Contest",
      "type": "pinnacle",
      "weapon_source": "contest",
      "reward_table": "pinnacle",
      "encounters": [
        "Shadow Legion",
        "Revenant Scorn",
        "Lucent Brood",
        "The Dread"
      ]
    },
    "nether": {
      "name": "The Nether",
      "type": "pinnacle",
      "weapon_source": "nether",
      "reward_table": "pinnacle",
      "encounters": [
        "Trenchway",
        "Founts",
        "Mausoleum",
        "Hullbreach"
      ]
    }
  },
  "strikes": {
    "disgraced": {
      "name": "The Disgraced",
      "type": "strike",
      "destination": "Cosmodrome",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "lake": {
      "name": "Lake of Shadows",
      "type": "strike",
      "destination": "EDZ",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "inverted": {
      "name": "The Inverted Spire",
      "type": "strike",
      "destination": "Nessus",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "corrupted": {
      "name": "The Corrupted",
      "type": "strike",
      "destination": "Dreaming City",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "scarlet": {
      "name": "The Scarlet Keep",
      "type": "strike",
      "destination": "Moon",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "glassway": {
      "name": "The Glassway",
      "type": "strike",
      "destination": "Europa",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "lightblade": {
      "name": "The Lightblade",
      "type": "strike",
      "destination": "Throne World",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "hypernet": {
      "name": "HyperNet Current",
      "type": "strike",
      "destination": "Neomuna",
      "weapon_source": "strike",
      "reward_table": "strike"
    },
    "liminality": {
      "name": "Liminality",
      "type": "strike",
      "destination": "Pale Heart",
      "weapon_source": "strike",
      "reward_table": "strike"
    }
  },
  "nightfalls": {
    "gardworld": {
      "name": "A Garden World",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "devilsperf": {
      "name": "Devil Splicer's Lair",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "sunless": {
      "name": "Sunless Cell",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "shieldbr": {
      "name": "The Shield Brothers",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "pyramidion": {
      "name": "The Pyramidion",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "strangeterr": {
      "name": "Strange Terrain",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    },
    "willofth": {
      "name": "Will of the Thousands",
      "type": "nightfall",
      "weapon_source": "nf",
      "reward_table": "nf"
    }
  },
  "gms": {
    "wretched": {
      "name": "Wretched Eye",
      "type": "gm",
      "weapon_source": "gm",
      "reward_table": "gm"
    },
    "savasong": {
      "name": "Savathun's Song",
      "type": "gm",
      "weapon_source": "gm",
      "reward_table": "gm"
    },
    "willcrota": {
      "name": "Will of Crota",
      "type": "gm",
      "weapon_source": "gm",
      "reward_table": "gm"
    },
    "abomination": {
      "name": "The Abomination Heist",
      "type": "gm",
      "weapon_source": "gm",
      "reward_table": "gm"
    },
    "sivathief": {
      "name": "The Shadow Thief (SIVA Remixed)",
      "type": "gm",
      "weapon_source": "gm",
      "reward_table": "gm"
    }
  },
  "daily": {
    "raids": {
      "vog": {
        "name": "Vault of Glass",
        "type": "raid",
        "weapon_source": "vog",
        "reward_table": "raid",
        "encounters": [
          "Waking Ruins",
          "Confluxes",
          "Oracles",
          "The Templar",
          "Gorgon's Labyrinth",
          "Gatekeepers",
          "Atheon, Time's Conflux"
        ]
      },
      "kf": {
        "name": "King's Fall",
        "type": "raid",
        "weapon_source": "kf",
        "reward_table": "raid",
        "encounters": [
          "Hall of Souls",
          "Totems",
          "Warpriest",
          "Golgoroth",
          "Daughters of Oryx",
          "Oryx, The Taken King"
        ]
      },
      "ce": {
        "name": "Crota's End",
        "type": "raid",
        "weapon_source": "ce",
        "reward_table": "raid",
        "encounters": [
          "Hellmouth",
          "The Abyss",
          "Throne Bridge",
          "Ir Yût, The Deathsinger",
          "Crota, Son of Oryx"
        ]
      },
      "udp": {
        "name": "Ultimate Desert Perpetual",
        "type": "raid",
        "weapon_source": "udp",
        "reward_table": "raid",
        "encounters": [
          "Epoptes, Lord of Quanta",
          "Iatros, Inward-Turned",
          "Agraios, Inherent",
          "Koregos, The Worldline",
          "Koregos, Fractured in Time"
        ]
      }
    },
    "dungeons": {
      "sotw": {
        "name": "Spire of the Watcher",
        "type": "dungeon",
        "weapon_source": "sotw",
        "reward_table": "dungeon",
        "encounters": [
          "The Spire Ascent",
          "Akelous, the Siren's Current",
          "Persys, Primordial Ruin"
        ]
      },
      "eq": {
        "name": "Equilibrium",
        "type": "dungeon",
        "weapon_source": "eq",
        "reward_table": "dungeon",
        "encounters": [
          "Board the Harvester",
          "Harrow, Dredgen-Apprentice",
          "Dredgen Sere"
        ]
      }
    },
    "showdowns": {
      "cos": {
        "name": "Crown of Sorrow",
        "type": "showdown",
        "weapon_source": "cos",
        "reward_table": "showdown",
        "encounters": [
          "Kingdom of Sorrow",
          "Gahlran's Deception",
          "Gahlran, the Sorrow-Bearer"
        ]
      },
      "sos": {
        "name": "Spire of Stars",
        "type": "showdown",
        "weapon_source": "sos",
        "reward_table": "showdown",
        "encounters": [
          "Statue Garden",
          "Repel the Assault",
          "Val Ca'uor"
        ]
      },
      "eow": {
        "name": "Eater of Worlds",
        "type": "showdown",
        "weapon_source": "eow",
        "reward_table": "showdown",
        "encounters": [
          "Reactor Room",
          "Break the Barrier",
          "Argos, Planetary Core"
        ]
      }
    }
  }
} as const;

export type Activities = typeof ACTIVITIES;
