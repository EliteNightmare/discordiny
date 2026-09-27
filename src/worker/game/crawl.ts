/*
 * Discordiny Crawl activity engine
 *
 * A Crawl run executes the FOUR encounters belonging
 * to the ONE currently rotated Pinnacle Crawl.
 *
 * Current Crawls:
 *
 * The Coil:
 *   Chiasmus
 *   Enthymeme
 *   Polysemy
 *   Synchysis
 *   Weapon source: coil
 *
 * Kells Contest:
 *   Shadow Legion
 *   Revenant Scorn
 *   Lucent Brood
 *   The Dread
 *   Weapon source: contest
 *
 * The Nether:
 *   Trenchway
 *   Founts
 *   Mausoleum
 *   Hullbreach
 *   Weapon source: nether
 *
 * Crawl behavior ported from the original Discord bot:
 *
 *   - 120 second cooldown
 *   - 4 encounters
 *   - Crawl encounters do not wipe
 *   - 10% chance for ONE secret encounter per run
 *   - Secret is assigned to one random encounter
 *   - Secret challenge lasts 15 seconds
 *   - Successful secret doubles encounter rewards
 *     from the secret encounter onward
 *   - Full clear awards 25,000 XP
 *   - Full clear performs one final weapon roll
 *   - Successful secret performs one additional
 *     final weapon roll
 *
 * IMPORTANT:
 *
 * Secret challenge success is NOT decided here when
 * the run is initially generated.
 *
 * The Worker must remain authoritative. The frontend
 * displays the generated challenge and sends the
 * player's interaction back to the Worker for
 * validation.
 *
 * Splicing, Acclaim, and Gather Materials are
 * intentionally excluded.
 *
 * This module does not access D1 directly.
 */


/* =========================================================
   CONSTANTS
========================================================= */

export const CRAWL_COOLDOWN_SECONDS =
  120;


export const CRAWL_SECRET_CHANCE =
  0.10;


export const CRAWL_SECRET_TIMEOUT_SECONDS =
  15;


export const CRAWL_XP =
  25000;


/*
 * Crawl weapon behavior from the original bot.
 *
 * A completed Crawl gets one weapon roll.
 *
 * A successfully completed secret encounter gets
 * one additional weapon roll.
 */

export const CRAWL_BASE_WEAPON_ROLLS =
  1;


export const CRAWL_SECRET_BONUS_WEAPON_ROLLS =
  1;


/*
 * The current web game's weapon roll convention.
 *
 * This matches the existing Pinnacle activity weapon
 * behavior used by the Worker.
 */

export const CRAWL_WEAPON_DROP_CHANCE =
  0.25;


export const CRAWL_ADEPT_CHANCE =
  0.10;


/* =========================================================
   COIL SECRET PROMPTS
========================================================= */

export const CRAWL_COIL_PROMPTS = [
  "VEX",
  "GLASS",
  "GLASSMAKER",
  "PARACAUSAL",
  "THE COIL",
  "ECHO",
  "WISH",
  "RIVEN",
  "AHAMKARA",
] as const;


/* =========================================================
   CONTEST SECRET PIECES
========================================================= */

/*
 * These correspond to:
 *
 * contest_1
 * contest_2
 * contest_3
 * contest_4
 *
 * in:
 *
 * src/react-app/assets/general/crawls/
 *
 * The frontend will display them in:
 *
 *   1  2
 *   3  4
 *
 * The server generates the order in which they must
 * be selected.
 */

export const CRAWL_CONTEST_PIECES = [
  {
    id: 1,
    label: "Skolas",
  },
  {
    id: 2,
    label: "Kell",
  },
  {
    id: 3,
    label: "Of",
  },
  {
    id: 4,
    label: "Wolves",
  },
] as const;


/* =========================================================
   NETHER SECRET
========================================================= */

export const CRAWL_NETHER_GRID_ROWS =
  5;


export const CRAWL_NETHER_GRID_COLUMNS =
  5;


export const CRAWL_NETHER_EYE_COUNT =
  5;


/* =========================================================
   TYPES
========================================================= */

export type CrawlWeaponSource =
  | "coil"
  | "contest"
  | "nether";


export type CrawlActivity = {
  id: string;

  name: string;

  weaponSource:
    CrawlWeaponSource;

  encounters:
    readonly string[];
};


export type CrawlWeaponCatalogEntry = {
  name: string;

  rarity:
    string | null;

  emoji_id?:
    string | null;
};


export type CrawlWeaponResult = {
  rolled: boolean;

  dropped: boolean;

  source: string;

  name:
    string | null;

  rarity:
    string | null;

  emojiId:
    string | null;

  adept: boolean;
};


export type CrawlRewardMap =
  Record<string, number>;


/* =========================================================
   SECRET TYPES
========================================================= */

export type CrawlSecretType =
  | "coil"
  | "contest"
  | "nether";


export type CrawlSecretStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired";


export type CrawlCoilSecret = {
  type: "coil";

  prompt: string;
};


export type CrawlContestPiece = {
  id: number;

  label: string;
};


export type CrawlContestSecret = {
  type: "contest";

  /*
   * Pieces are always displayed by the frontend in
   * their fixed visual positions:
   *
   *   1  2
   *   3  4
   */
  pieces:
    CrawlContestPiece[];

  /*
   * Server-generated required click order.
   *
   * Contains piece IDs, not labels.
   *
   * Example:
   *
   * [3, 1, 4, 2]
   */
  sequence:
    number[];
};


export type CrawlNetherCell = {
  index: number;

  row: number;

  column: number;

  isEye: boolean;
};


export type CrawlNetherSecret = {
  type: "nether";

  rows: number;

  columns: number;

  eyeCount: number;

  cells:
    CrawlNetherCell[];
};


export type CrawlSecretChallenge =
  | CrawlCoilSecret
  | CrawlContestSecret
  | CrawlNetherSecret;


export type CrawlSecret = {
  triggered: boolean;

  encounterIndex:
    number | null;

  timeoutSeconds: number;

  status:
    CrawlSecretStatus | null;

  challenge:
    CrawlSecretChallenge | null;
};


/* =========================================================
   ENCOUNTER / RUN TYPES
========================================================= */

export type CrawlEncounterResult = {
  index: number;

  name: string;

  weaponSource: string;

  cleared: true;

  /*
   * Rewards are populated when the encounter is
   * resolved.
   *
   * Before a pending secret has been resolved,
   * downstream Worker logic may defer persistence
   * of affected encounter rewards.
   */
  rewards:
    CrawlRewardMap;

  partialRewards: false;

  /*
   * Crawl weapons are awarded at the end of the
   * activity rather than once per encounter.
   */
  weapon:
    CrawlWeaponResult;

  secretEncounter: boolean;
};


export type CrawlRunResult = {
  activityId: string;

  activityName: string;

  activityType: "crawl";

  weaponSource: string;

  encounters:
    CrawlEncounterResult[];

  totalEncounters: number;

  clearedEncounters: number;

  fullClear: true;

  wiped: false;

  wipedAt: null;

  rewards:
    CrawlRewardMap;

  xp: number;

  secret:
    CrawlSecret;

  /*
   * Actual successful weapon drops.
   *
   * Normally:
   *
   *   0 - 1 weapon
   *
   * Successful secret:
   *
   *   0 - 2 weapons
   */
  weapons:
    CrawlWeaponResult[];

  /*
   * Compatibility field used by the current
   * activity result UI/feed.
   */
  weapon:
    CrawlWeaponResult;
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


function shuffle<T>(
  values:
    readonly T[],
): T[] {
  const result =
    [...values];

  for (
    let index =
      result.length - 1;

    index > 0;

    index -= 1
  ) {
    const swapIndex =
      randomIntInclusive(
        0,
        index,
      );

    const current =
      result[index];

    result[index] =
      result[swapIndex];

    result[swapIndex] =
      current;
  }

  return result;
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
 * Original Crawl reward package PER ENCOUNTER:
 *
 * Glimmer:
 *   7,500 - 12,500
 *
 * Lumia Leaves:
 *   1
 *
 * Pinnacle Cipher:
 *   10 - 15
 *
 * Armor Plating:
 *   150 - 250
 *
 * Ascendant Shard:
 *   2 - 4
 *
 * Ascendant Alloy:
 *   1 - 3
 */

export function rollCrawlRewards():
  CrawlRewardMap {
  return {
    Glimmer:
      randomIntInclusive(
        7500,
        12500,
      ),

    "Lumia Leaves":
      1,

    "Pinnacle Cipher":
      randomIntInclusive(
        10,
        15,
      ),

    "Armor Plating":
      randomIntInclusive(
        150,
        250,
      ),

    "Ascendant Shard":
      randomIntInclusive(
        2,
        4,
      ),

    "Ascendant Alloy":
      randomIntInclusive(
        1,
        3,
      ),
  };
}


/* =========================================================
   REWARD HELPERS
========================================================= */

function addReward(
  rewards:
    CrawlRewardMap,

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
    CrawlRewardMap,

  source:
    CrawlRewardMap,
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


export function multiplyCrawlRewards(
  rewards:
    CrawlRewardMap,

  multiplier: number,
): CrawlRewardMap {
  const multiplied:
    CrawlRewardMap = {};

  for (
    const [
      name,
      amount,
    ]
    of Object.entries(
      rewards,
    )
  ) {
    multiplied[name] =
      amount * multiplier;
  }

  return multiplied;
}


/* =========================================================
   EMPTY WEAPON RESULT
========================================================= */

export function emptyCrawlWeaponResult(
  source: string,

  rolled = false,
): CrawlWeaponResult {
  return {
    rolled,

    dropped: false,

    source,

    name: null,

    rarity: null,

    emojiId: null,

    adept: false,
  };
}


/* =========================================================
   WEAPON ROLL
========================================================= */

export function rollCrawlWeapon(
  source: string,

  catalog:
    readonly CrawlWeaponCatalogEntry[],

  ownedWeapons:
    readonly string[],
): CrawlWeaponResult {
  const emptyResult =
    emptyCrawlWeaponResult(
      source,
      true,
    );


  /*
   * First roll:
   *
   * 25% chance for a weapon.
   */
  if (
    Math.random()
    >= CRAWL_WEAPON_DROP_CHANCE
  ) {
    return emptyResult;
  }


  /*
   * Successful weapon roll.
   *
   * Determine whether the weapon is Adept.
   */
  const adept =
    Math.random()
    < CRAWL_ADEPT_CHANCE;


  const owned =
    new Set(
      ownedWeapons.map(
        normalizeWeaponName,
      ),
    );


  /*
   * Explicit "(Adept)" rows are metadata rows and
   * do not participate as additional random
   * selections.
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
         * Normal and Adept variants are considered
         * separate ownership entries.
         */
        return !owned.has(
          normalizeWeaponName(
            finalName,
          ),
        );
      },
    );


  /*
   * Player already owns every possible weapon for
   * the rolled Normal/Adept variant.
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
   * If an explicit Adept catalog row exists, use
   * its metadata.
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
   SECRET ROLL
========================================================= */

export function rollCrawlSecretEncounter(
  totalEncounters: number,
): number | null {
  if (
    totalEncounters <= 0
  ) {
    return null;
  }


  /*
   * Exactly one 10% roll is made for the entire
   * Crawl.
   *
   * On success, choose one of the four encounters.
   */
  if (
    Math.random()
    >= CRAWL_SECRET_CHANCE
  ) {
    return null;
  }


  return randomIntInclusive(
    0,
    totalEncounters - 1,
  );
}


/* =========================================================
   COIL SECRET
========================================================= */

export function createCoilSecret():
  CrawlCoilSecret {
  const prompt =
    randomChoice(
      CRAWL_COIL_PROMPTS,
    );


  return {
    type: "coil",

    prompt:
      prompt
      ?? "VEX",
  };
}


export function validateCoilSecret(
  challenge:
    CrawlCoilSecret,

  answer: string,
): boolean {
  /*
   * Original bot behavior:
   *
   * whitespace around the submitted value is
   * ignored, but the prompt itself is otherwise
   * case-sensitive and must match exactly.
   */
  return (
    answer.trim()
    === challenge.prompt
  );
}


/* =========================================================
   CONTEST SECRET
========================================================= */

export function createContestSecret():
  CrawlContestSecret {
  const pieces:
    CrawlContestPiece[] =
      CRAWL_CONTEST_PIECES.map(
        (piece) => ({
          id:
            piece.id,

          label:
            piece.label,
        }),
      );


  const sequence =
    shuffle(
      pieces.map(
        (piece) =>
          piece.id,
      ),
    );


  return {
    type:
      "contest",

    pieces,

    sequence,
  };
}


export function validateContestSecret(
  challenge:
    CrawlContestSecret,

  submittedSequence:
    readonly number[],
): boolean {
  if (
    submittedSequence.length
    !== challenge.sequence.length
  ) {
    return false;
  }


  for (
    let index = 0;

    index
    < challenge.sequence.length;

    index += 1
  ) {
    if (
      submittedSequence[index]
      !== challenge.sequence[index]
    ) {
      return false;
    }
  }


  return true;
}


/* =========================================================
   NETHER SECRET
========================================================= */

export function createNetherSecret():
  CrawlNetherSecret {
  const cells:
    CrawlNetherCell[] = [];


  /*
   * Original behavior:
   *
   * 5 rows
   * 5 positions per row
   * exactly ONE eye in every row
   *
   * Therefore there are exactly five eyes.
   */
  for (
    let row = 0;

    row < CRAWL_NETHER_GRID_ROWS;

    row += 1
  ) {
    const eyeColumn =
      randomIntInclusive(
        0,
        CRAWL_NETHER_GRID_COLUMNS - 1,
      );


    for (
      let column = 0;

      column
      < CRAWL_NETHER_GRID_COLUMNS;

      column += 1
    ) {
      const index =
        (
          row
          * CRAWL_NETHER_GRID_COLUMNS
        )
        + column;


      cells.push({
        index,

        row,

        column,

        isEye:
          column
          === eyeColumn,
      });
    }
  }


  return {
    type:
      "nether",

    rows:
      CRAWL_NETHER_GRID_ROWS,

    columns:
      CRAWL_NETHER_GRID_COLUMNS,

    eyeCount:
      CRAWL_NETHER_EYE_COUNT,

    cells,
  };
}


export function validateNetherSecret(
  challenge:
    CrawlNetherSecret,

  selectedCells:
    readonly number[],
): boolean {
  /*
   * Wrong buttons immediately failed the original
   * encounter.
   *
   * For server validation, require exactly the five
   * eye cells and nothing else.
   */
  if (
    selectedCells.length
    !== challenge.eyeCount
  ) {
    return false;
  }


  const selected =
    new Set(
      selectedCells,
    );


  /*
   * Duplicate submissions are invalid.
   */
  if (
    selected.size
    !== selectedCells.length
  ) {
    return false;
  }


  const eyeCells =
    challenge.cells.filter(
      (cell) =>
        cell.isEye,
    );


  if (
    eyeCells.length
    !== challenge.eyeCount
  ) {
    return false;
  }


  for (
    const cell
    of eyeCells
  ) {
    if (
      !selected.has(
        cell.index,
      )
    ) {
      return false;
    }
  }


  /*
   * Explicitly ensure no non-eye cell was selected.
   */
  for (
    const cellIndex
    of selected
  ) {
    const cell =
      challenge.cells.find(
        (candidate) =>
          candidate.index
          === cellIndex,
      );


    if (
      !cell
      || !cell.isEye
    ) {
      return false;
    }
  }


  return true;
}


/* =========================================================
   SECRET CREATION
========================================================= */

export function createCrawlSecretChallenge(
  weaponSource:
    CrawlWeaponSource,
): CrawlSecretChallenge {
  switch (
    weaponSource
  ) {
    case "coil":
      return createCoilSecret();


    case "contest":
      return createContestSecret();


    case "nether":
      return createNetherSecret();
  }
}


/* =========================================================
   INITIAL CRAWL RUN
========================================================= */

/*
 * This creates the initial authoritative Crawl state.
 *
 * It DOES NOT resolve the interactive secret.
 *
 * The next Worker integration will persist enough
 * state to validate the player's secret response
 * before final rewards / bonus weapon roll are
 * committed.
 */

export function runCrawl(
  activity:
    CrawlActivity,
): CrawlRunResult {
  const encounters =
    [...activity.encounters];


  const totalRewards:
    CrawlRewardMap = {};


  const encounterResults:
    CrawlEncounterResult[] = [];


  const secretEncounterIndex =
    rollCrawlSecretEncounter(
      encounters.length,
    );


  const secretChallenge =
    secretEncounterIndex !== null
      ? createCrawlSecretChallenge(
          activity.weaponSource,
        )
      : null;


  /*
   * IMPORTANT:
   *
   * The old bot rolled encounter rewards only after
   * the secret interaction had been completed.
   *
   * We still generate the ordinary encounter reward
   * packages here so all RNG remains server-side.
   *
   * The Worker integration decides when these are
   * persisted and whether rewards at/after the
   * successful secret receive the x2 multiplier.
   */
  for (
    let index = 0;

    index < encounters.length;

    index += 1
  ) {
    const encounterName =
      encounters[index];


    const rewards =
      rollCrawlRewards();


    mergeRewards(
      totalRewards,
      rewards,
    );


    encounterResults.push({
      index,

      name:
        encounterName,

      weaponSource:
        activity.weaponSource,

      cleared:
        true,

      rewards,

      partialRewards:
        false,

      weapon:
        emptyCrawlWeaponResult(
          activity.weaponSource,
          false,
        ),

      secretEncounter:
        index
        === secretEncounterIndex,
    });
  }


  return {
    activityId:
      activity.id,

    activityName:
      activity.name,

    activityType:
      "crawl",

    weaponSource:
      activity.weaponSource,

    encounters:
      encounterResults,

    totalEncounters:
      encounterResults.length,

    clearedEncounters:
      encounterResults.length,

    /*
     * Crawl encounters themselves do not wipe.
     *
     * Failing the optional secret does not fail the
     * Crawl.
     */
    fullClear:
      true,

    wiped:
      false,

    wipedAt:
      null,

    rewards:
      totalRewards,

    xp:
      CRAWL_XP,

    secret: {
      triggered:
        secretEncounterIndex
        !== null,

      encounterIndex:
        secretEncounterIndex,

      timeoutSeconds:
        CRAWL_SECRET_TIMEOUT_SECONDS,

      status:
        secretEncounterIndex
        !== null
          ? "pending"
          : null,

      challenge:
        secretChallenge,
    },

    /*
     * Weapon rolls happen only after the Crawl can
     * be finalized.
     */
    weapons:
      [],

    weapon:
      emptyCrawlWeaponResult(
        activity.weaponSource,
        false,
      ),
  };
}


/* =========================================================
   SECRET REWARD APPLICATION
========================================================= */

/*
 * The original Crawl code applies the x2 multiplier
 * after secret_success becomes true.
 *
 * Because secret_success remains true for the rest
 * of the loop, the secret encounter AND every
 * encounter after it receive doubled rewards.
 *
 * This helper deliberately preserves that behavior.
 */

export function applySuccessfulCrawlSecretRewards(
  run:
    CrawlRunResult,
): CrawlRunResult {
  const secretIndex =
    run.secret.encounterIndex;


  if (
    secretIndex === null
  ) {
    return run;
  }


  const encounters =
    run.encounters.map(
      (encounter) => {
        if (
          encounter.index
          < secretIndex
        ) {
          return {
            ...encounter,

            rewards: {
              ...encounter.rewards,
            },
          };
        }


        return {
          ...encounter,

          rewards:
            multiplyCrawlRewards(
              encounter.rewards,
              2,
            ),
        };
      },
    );


  const rewards:
    CrawlRewardMap = {};


  for (
    const encounter
    of encounters
  ) {
    mergeRewards(
      rewards,
      encounter.rewards,
    );
  }


  return {
    ...run,

    encounters,

    rewards,

    secret: {
      ...run.secret,

      status:
        "success",
    },
  };
}


/* =========================================================
   FAILED SECRET
========================================================= */

export function applyFailedCrawlSecret(
  run:
    CrawlRunResult,

  expired = false,
): CrawlRunResult {
  return {
    ...run,

    secret: {
      ...run.secret,

      status:
        expired
          ? "expired"
          : "failed",
    },
  };
}


/* =========================================================
   FINAL WEAPON ROLLS
========================================================= */

export function rollCrawlCompletionWeapons(
  run:
    CrawlRunResult,

  weaponCatalog:
    readonly CrawlWeaponCatalogEntry[],

  ownedWeapons:
    readonly string[] = [],
): CrawlRunResult {
  const runOwnedWeapons =
    [...ownedWeapons];


  const performedRolls:
    CrawlWeaponResult[] = [];


  const droppedWeapons:
    CrawlWeaponResult[] = [];


  const weaponRollCount =
    CRAWL_BASE_WEAPON_ROLLS
    + (
      run.secret.status
      === "success"
        ? CRAWL_SECRET_BONUS_WEAPON_ROLLS
        : 0
    );


  for (
    let index = 0;

    index < weaponRollCount;

    index += 1
  ) {
    const weapon =
      rollCrawlWeapon(
        run.weaponSource,
        weaponCatalog,

        runOwnedWeapons,
      );


    performedRolls.push(
      weapon,
    );


    if (
      weapon.dropped
      && weapon.name
    ) {
      droppedWeapons.push(
        weapon,
      );


      /*
       * Prevent the second roll from awarding the
       * exact same Normal/Adept weapon obtained by
       * the first roll.
       */
      runOwnedWeapons.push(
        weapon.name,
      );
    }
  }


  const compatibilityWeapon =
    droppedWeapons[0]
    ?? performedRolls[0]
    ?? emptyCrawlWeaponResult(
      run.weaponSource,
      false,
    );


  return {
    ...run,

    weapons:
      droppedWeapons,

    weapon:
      compatibilityWeapon,
  };
}


/* =========================================================
   SECRET VALIDATION HELPERS
========================================================= */

export function validateCrawlSecret(
  challenge:
    CrawlSecretChallenge,

  submission:
    string
    | readonly number[],
): boolean {
  switch (
    challenge.type
  ) {
    case "coil": {
      if (
        typeof submission
        !== "string"
      ) {
        return false;
      }


      return validateCoilSecret(
        challenge,
        submission,
      );
    }


    case "contest": {
      if (
        typeof submission
        === "string"
      ) {
        return false;
      }


      return validateContestSecret(
        challenge,
        submission,
      );
    }


    case "nether": {
      if (
        typeof submission
        === "string"
      ) {
        return false;
      }


      return validateNetherSecret(
        challenge,
        submission,
      );
    }
  }
}
