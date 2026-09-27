/*
 * Discordiny Crawl activity engine
 *
 * Server-authoritative Crawl gameplay logic.
 *
 * Current Crawls:
 *
 * The Coil
 * Kells Contest
 * The Nether
 *
 * Legacy behavior:
 *
 * - 120 second cooldown
 * - Four encounters
 * - Crawl encounters do not wipe
 * - 10% chance for one secret encounter per run
 * - Secret is assigned to one random encounter
 * - Secret challenge lasts 15 seconds
 * - Successful secret doubles rewards from the secret
 *   encounter onward
 * - Full clear awards 25,000 XP
 * - Full clear performs one final weapon roll
 * - Successful secret performs one additional weapon roll
 *
 * IMPORTANT:
 *
 * Private challenge data must NEVER be returned directly
 * to the frontend.
 *
 * Persist CrawlRunResult in pending_crawl_runs.run_data.
 * Send getPublicCrawlSecret(run.secret) to React.
 *
 * React displays/interacts with the challenge.
 * The Worker validates the submitted answer.
 *
 * This module does not access D1 directly.
 */


/* =========================================================
   CONSTANTS
========================================================= */

export const CRAWL_COOLDOWN_SECONDS = 120;

export const CRAWL_SECRET_CHANCE = 0.10;

export const CRAWL_SECRET_TIMEOUT_SECONDS = 15;

export const CRAWL_XP = 25000;

export const CRAWL_BASE_WEAPON_ROLLS = 1;

export const CRAWL_SECRET_BONUS_WEAPON_ROLLS = 1;

export const CRAWL_WEAPON_DROP_CHANCE = 0.25;

export const CRAWL_ADEPT_CHANCE = 0.10;


/* =========================================================
   COIL SECRET
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
   CONTEST SECRET
========================================================= */

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

export const CRAWL_NETHER_GRID_ROWS = 5;

export const CRAWL_NETHER_GRID_COLUMNS = 5;

export const CRAWL_NETHER_EYE_COUNT = 5;


/* =========================================================
   GENERAL TYPES
========================================================= */

export type CrawlWeaponSource =
  | "coil"
  | "contest"
  | "nether";


export type CrawlActivity = {
  id: string;

  name: string;

  weaponSource: CrawlWeaponSource;

  encounters: readonly string[];
};


export type CrawlWeaponCatalogEntry = {
  name: string;

  rarity: string | null;

  emoji_id?: string | null;
};


export type CrawlWeaponResult = {
  rolled: boolean;

  dropped: boolean;

  source: string;

  name: string | null;

  rarity: string | null;

  emojiId: string | null;

  adept: boolean;
};


export type CrawlRewardMap =
  Record<string, number>;


/* =========================================================
   PRIVATE SECRET TYPES

   These are server-side types.

   They may be persisted in pending_crawl_runs.run_data.

   DO NOT send these objects directly to React.
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

  /*
   * Public by design.
   *
   * The player has to see this string in order to
   * type it.
   */
  prompt: string;
};


export type CrawlContestPiece = {
  id: number;

  label: string;
};


export type CrawlContestSecret = {
  type: "contest";

  pieces: CrawlContestPiece[];

  /*
   * PRIVATE.
   *
   * Required click order.
   *
   * Never expose this through the activity-start
   * response.
   */
  sequence: number[];
};


export type CrawlNetherCell = {
  index: number;

  row: number;

  column: number;

  /*
   * PRIVATE.
   *
   * Never expose this flag to React.
   */
  isEye: boolean;
};


export type CrawlNetherSecret = {
  type: "nether";

  rows: number;

  columns: number;

  eyeCount: number;

  cells: CrawlNetherCell[];
};


export type CrawlSecretChallenge =
  | CrawlCoilSecret
  | CrawlContestSecret
  | CrawlNetherSecret;


export type CrawlSecret = {
  triggered: boolean;

  encounterIndex: number | null;

  timeoutSeconds: number;

  status: CrawlSecretStatus | null;

  challenge: CrawlSecretChallenge | null;
};


/* =========================================================
   PUBLIC SECRET TYPES

   These are safe to return to React.
========================================================= */

export type PublicCrawlCoilSecret = {
  type: "coil";

  prompt: string;
};


export type PublicCrawlContestPiece = {
  id: number;

  label: string;
};


export type PublicCrawlContestSecret = {
  type: "contest";

  pieces: PublicCrawlContestPiece[];
};


export type PublicCrawlNetherCell = {
  index: number;

  row: number;

  column: number;
};


export type PublicCrawlNetherSecret = {
  type: "nether";

  rows: number;

  columns: number;

  eyeCount: number;

  /*
   * These are the positions in which React is allowed
   * to render clickable targets.
   *
   * No isEye property is exposed.
   */
  cells: PublicCrawlNetherCell[];
};


export type PublicCrawlSecretChallenge =
  | PublicCrawlCoilSecret
  | PublicCrawlContestSecret
  | PublicCrawlNetherSecret;


export type PublicCrawlSecret = {
  triggered: boolean;

  encounterIndex: number | null;

  timeoutSeconds: number;

  status: CrawlSecretStatus | null;

  challenge: PublicCrawlSecretChallenge | null;
};


/* =========================================================
   ENCOUNTER / RUN TYPES
========================================================= */

export type CrawlEncounterResult = {
  index: number;

  name: string;

  weaponSource: string;

  cleared: true;

  rewards: CrawlRewardMap;

  partialRewards: false;

  weapon: CrawlWeaponResult;

  secretEncounter: boolean;
};


export type CrawlRunResult = {
  activityId: string;

  activityName: string;

  activityType: "crawl";

  weaponSource: CrawlWeaponSource;

  encounters: CrawlEncounterResult[];

  totalEncounters: number;

  clearedEncounters: number;

  fullClear: true;

  wiped: false;

  wipedAt: null;

  rewards: CrawlRewardMap;

  xp: number;

  secret: CrawlSecret;

  /*
   * Successful weapon drops.
   *
   * Normal clear:
   *   up to one
   *
   * Successful secret:
   *   up to two
   */
  weapons: CrawlWeaponResult[];

  /*
   * Compatibility field for the existing activity UI
   * and activity feed.
   */
  weapon: CrawlWeaponResult;
};


/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomIntInclusive(
  min: number,
  max: number,
): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);

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
  if (values.length === 0) {
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
  values: readonly T[],
): T[] {
  const result = [...values];

  for (
    let index = result.length - 1;
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
 * Legacy Crawl rewards PER ENCOUNTER:
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
  rewards: CrawlRewardMap,
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
  target: CrawlRewardMap,
  source: CrawlRewardMap,
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
  rewards: CrawlRewardMap,
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
  catalog: readonly CrawlWeaponCatalogEntry[],
  ownedWeapons: readonly string[],
): CrawlWeaponResult {
  const emptyResult =
    emptyCrawlWeaponResult(
      source,
      true,
    );


  /*
   * 25% chance for a weapon.
   */
  if (
    Math.random()
    >= CRAWL_WEAPON_DROP_CHANCE
  ) {
    return emptyResult;
  }


  /*
   * 10% of successful weapon rolls are Adept.
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
   * Explicit "(Adept)" rows are metadata rows rather
   * than separate random selections.
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
         * Normal and Adept variants are separate
         * ownership entries.
         */
        return !owned.has(
          normalizeWeaponName(
            finalName,
          ),
        );
      },
    );


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
   * If the weapon catalog contains an explicit Adept
   * row, use its metadata.
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
   * One 10% roll for the entire Crawl.
   *
   * If successful, exactly one encounter receives
   * the secret.
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
  challenge: CrawlCoilSecret,
  answer: string,
): boolean {
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


  /*
   * PRIVATE server-generated required click order.
   */
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
  challenge: CrawlContestSecret,
  submittedSequence: readonly number[],
): boolean {
  if (
    submittedSequence.length
    !== challenge.sequence.length
  ) {
    return false;
  }


  for (
    let index = 0;
    index < challenge.sequence.length;
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
   * Legacy behavior:
   *
   * 5 rows
   * 5 positions per row
   * exactly one eye in every row
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
      column < CRAWL_NETHER_GRID_COLUMNS;
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
  challenge: CrawlNetherSecret,
  selectedCells: readonly number[],
): boolean {
  /*
   * The player must submit exactly five cells.
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
   * Duplicate selections are invalid.
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


  /*
   * Every actual eye must have been selected.
   */
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
   * No non-eye position may have been submitted.
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
   PRIVATE CHALLENGE CREATION
========================================================= */

export function createCrawlSecretChallenge(
  weaponSource: CrawlWeaponSource,
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
   PUBLIC CHALLENGE SANITIZATION
========================================================= */

export function getPublicCrawlSecretChallenge(
  challenge: CrawlSecretChallenge,
): PublicCrawlSecretChallenge {
  switch (
    challenge.type
  ) {
    case "coil":
      /*
       * The prompt is intentionally visible.
       */
      return {
        type:
          "coil",

        prompt:
          challenge.prompt,
      };


    case "contest":
      /*
       * IMPORTANT:
       *
       * sequence is deliberately omitted.
       */
      return {
        type:
          "contest",

        pieces:
          challenge.pieces.map(
            (piece) => ({
              id:
                piece.id,

              label:
                piece.label,
            }),
          ),
      };


    case "nether":
      /*
       * IMPORTANT:
       *
       * isEye is deliberately omitted.
       *
       * React receives positions only.
       */
      return {
        type:
          "nether",

        rows:
          challenge.rows,

        columns:
          challenge.columns,

        eyeCount:
          challenge.eyeCount,

        cells:
          challenge.cells.map(
            (cell) => ({
              index:
                cell.index,

              row:
                cell.row,

              column:
                cell.column,
            }),
          ),
      };
  }
}


export function getPublicCrawlSecret(
  secret: CrawlSecret,
): PublicCrawlSecret {
  return {
    triggered:
      secret.triggered,

    encounterIndex:
      secret.encounterIndex,

    timeoutSeconds:
      secret.timeoutSeconds,

    status:
      secret.status,

    challenge:
      secret.challenge
        ? getPublicCrawlSecretChallenge(
            secret.challenge,
          )
        : null,
  };
}


/* =========================================================
   PUBLIC RUN SANITIZATION
========================================================= */

/*
 * This helper is intentionally useful for index.ts.
 *
 * It creates a frontend-safe version of a Crawl run
 * without leaking private challenge answers.
 */

export type PublicCrawlRunResult =
  Omit<
    CrawlRunResult,
    "secret"
  >
  & {
    secret: PublicCrawlSecret;
  };


export function getPublicCrawlRun(
  run: CrawlRunResult,
): PublicCrawlRunResult {
  return {
    ...run,

    secret:
      getPublicCrawlSecret(
        run.secret,
      ),
  };
}


/* =========================================================
   INITIAL CRAWL RUN
========================================================= */

/*
 * Creates the authoritative initial Crawl state.
 *
 * If a secret procs:
 *
 * - the private CrawlRunResult should be persisted
 *   in pending_crawl_runs.run_data
 *
 * - getPublicCrawlRun() should be used for the
 *   frontend response
 *
 * - rewards should not yet be persisted
 *
 * If no secret procs, the Worker can immediately
 * finalize the run.
 */

export function runCrawl(
  activity: CrawlActivity,
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
   * Generate all reward RNG server-side before
   * anything is sent to the frontend.
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
     * Crawl encounters do not wipe.
     *
     * Failing a secret does not fail the Crawl.
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
     * Completion weapon rolls happen when the Worker
     * finalizes the run.
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
   SUCCESSFUL SECRET REWARDS
========================================================= */

/*
 * Legacy behavior:
 *
 * Once secret_success becomes true in the old Crawl
 * loop, it remains true for every remaining encounter.
 *
 * Therefore:
 *
 * - encounters before the secret keep normal rewards
 * - the secret encounter is doubled
 * - every encounter after the secret is doubled
 */

export function applySuccessfulCrawlSecretRewards(
  run: CrawlRunResult,
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
   FAILED / EXPIRED SECRET
========================================================= */

export function applyFailedCrawlSecret(
  run: CrawlRunResult,
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
   SECRET VALIDATION
========================================================= */

export function validateCrawlSecret(
  challenge: CrawlSecretChallenge,
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


/* =========================================================
   FINAL WEAPON ROLLS
========================================================= */

export function rollCrawlCompletionWeapons(
  run: CrawlRunResult,
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
       * Do not let the second roll award the exact
       * same Normal/Adept weapon obtained by the
       * first roll.
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
   FINALIZATION HELPERS
========================================================= */

/*
 * No secret:
 *
 * Finalize normally.
 */

export function finalizeCrawlWithoutSecret(
  run: CrawlRunResult,
  weaponCatalog:
    readonly CrawlWeaponCatalogEntry[],
  ownedWeapons:
    readonly string[] = [],
): CrawlRunResult {
  return rollCrawlCompletionWeapons(
    run,
    weaponCatalog,
    ownedWeapons,
  );
}


/*
 * Successful secret:
 *
 * 1. Apply doubled rewards from the secret encounter
 *    onward.
 *
 * 2. Perform the normal weapon roll plus the bonus
 *    secret weapon roll.
 */

export function finalizeSuccessfulCrawlSecret(
  run: CrawlRunResult,
  weaponCatalog:
    readonly CrawlWeaponCatalogEntry[],
  ownedWeapons:
    readonly string[] = [],
): CrawlRunResult {
  const rewardedRun =
    applySuccessfulCrawlSecretRewards(
      run,
    );


  return rollCrawlCompletionWeapons(
    rewardedRun,
    weaponCatalog,
    ownedWeapons,
  );
}


/*
 * Failed secret:
 *
 * Crawl still completes.
 *
 * Rewards remain normal and only the standard
 * completion weapon roll occurs.
 */

export function finalizeFailedCrawlSecret(
  run: CrawlRunResult,
  weaponCatalog:
    readonly CrawlWeaponCatalogEntry[],
  ownedWeapons:
    readonly string[] = [],
  expired = false,
): CrawlRunResult {
  const failedRun =
    applyFailedCrawlSecret(
      run,
      expired,
    );


  return rollCrawlCompletionWeapons(
    failedRun,
    weaponCatalog,
    ownedWeapons,
  );
}
