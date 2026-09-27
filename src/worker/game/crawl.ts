/*
 * Discordiny Crawl activity engine
 *
 * Server-authoritative Crawl gameplay logic.
 *
 * Current Crawls:
 *
 * The Coil
 * Contest of Elders
 * The Nether
 *
 * Crawl behavior:
 *
 * - 120 second cooldown
 * - Four encounters
 * - Crawl encounters do not wipe
 * - 10% chance for one secret encounter per run
 * - Secret is assigned to one random encounter
 * - Coil / Contest secrets last 15 seconds
 * - Nether secret lasts 20 seconds
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

export const CRAWL_SECRET_CHANCE = 1.00;

export const CRAWL_SECRET_TIMEOUT_SECONDS = 15;

export const CRAWL_NETHER_TIMEOUT_SECONDS = 20;

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

export const CRAWL_NETHER_MIN_EYES = 12;

export const CRAWL_NETHER_MAX_EYES = 15;

/*
 * Eye positions are percentages of the playable
 * Nether challenge area.
 *
 * Keeping the range away from 0 / 100 prevents an
 * eye from spawning partly outside the modal.
 */
export const CRAWL_NETHER_MIN_POSITION = 8;

export const CRAWL_NETHER_MAX_POSITION = 92;

export const CRAWL_NETHER_MIN_ROTATION = -180;

export const CRAWL_NETHER_MAX_ROTATION = 180;


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
   * The player must see the string in order to type it.
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


export type CrawlNetherEye = {
  /*
   * The ID is used by the server to verify that every
   * generated eye was clicked.
   */
  id: number;

  /*
   * Percentage coordinates used by React.
   *
   * These are presentation data and are intentionally
   * public because the player has to see the eye.
   */
  x: number;

  y: number;

  /*
   * Degrees.
   */
  rotation: number;
};


export type CrawlNetherSecret = {
  type: "nether";

  eyeCount: number;

  /*
   * The generated eyes are authoritative.
   *
   * React may receive their visual information, but
   * success is determined by the Worker comparing the
   * submitted IDs against this stored list.
   */
  eyes: CrawlNetherEye[];
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


export type PublicCrawlNetherEye = {
  id: number;

  x: number;

  y: number;

  rotation: number;
};


export type PublicCrawlNetherSecret = {
  type: "nether";

  eyeCount: number;

  /*
   * Eye positions and rotations are intentionally
   * public presentation data.
   *
   * The server still owns the authoritative expected
   * set of IDs and validates the submission.
   */
  eyes: PublicCrawlNetherEye[];
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

  weapons: CrawlWeaponResult[];

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

  if (
    Math.random()
    >= CRAWL_WEAPON_DROP_CHANCE
  ) {
    return emptyResult;
  }

  const adept =
    Math.random()
    < CRAWL_ADEPT_CHANCE;

  const owned =
    new Set(
      ownedWeapons.map(
        normalizeWeaponName,
      ),
    );

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
   * Randomize only the visual grid positions.
   *
   * The required click order always remains
   * contest_1 -> contest_2 -> contest_3 -> contest_4.
   */
  const shuffledPieces =
    shuffle(pieces);

  const sequence =
    CRAWL_CONTEST_PIECES.map(
      (piece) =>
        piece.id,
    );

  return {
    type:
      "contest",

    pieces:
      shuffledPieces,

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
  const eyeCount =
    randomIntInclusive(
      CRAWL_NETHER_MIN_EYES,
      CRAWL_NETHER_MAX_EYES,
    );

  const eyes:
    CrawlNetherEye[] = [];

  for (
    let index = 0;
    index < eyeCount;
    index += 1
  ) {
    eyes.push({
      /*
       * IDs are stable for this generated challenge.
       *
       * They do not reveal anything useful beyond
       * identifying the clicked eye.
       */
      id:
        index + 1,

      /*
       * Percentage positions allow the modal to remain
       * responsive across screen sizes.
       */
      x:
        randomIntInclusive(
          CRAWL_NETHER_MIN_POSITION,
          CRAWL_NETHER_MAX_POSITION,
        ),

      y:
        randomIntInclusive(
          CRAWL_NETHER_MIN_POSITION,
          CRAWL_NETHER_MAX_POSITION,
        ),

      rotation:
        randomIntInclusive(
          CRAWL_NETHER_MIN_ROTATION,
          CRAWL_NETHER_MAX_ROTATION,
        ),
    });
  }

  return {
    type:
      "nether",

    eyeCount,

    eyes,
  };
}


export function validateNetherSecret(
  challenge: CrawlNetherSecret,
  selectedEyes: readonly number[],
): boolean {
  /*
   * The player has to click every generated eye.
   */
  if (
    selectedEyes.length
    !== challenge.eyeCount
  ) {
    return false;
  }

  const submitted =
    new Set(
      selectedEyes,
    );

  /*
   * Duplicate IDs are invalid.
   */
  if (
    submitted.size
    !== selectedEyes.length
  ) {
    return false;
  }

  /*
   * Defensive validation of the persisted challenge.
   */
  if (
    challenge.eyes.length
    !== challenge.eyeCount
  ) {
    return false;
  }

  const expected =
    new Set(
      challenge.eyes.map(
        (eye) =>
          eye.id,
      ),
    );

  if (
    expected.size
    !== challenge.eyeCount
  ) {
    return false;
  }

  /*
   * Every expected eye must have been clicked.
   */
  for (
    const eyeId
    of expected
  ) {
    if (
      !submitted.has(
        eyeId,
      )
    ) {
      return false;
    }
  }

  /*
   * Reject unknown IDs as well.
   */
  for (
    const eyeId
    of submitted
  ) {
    if (
      !expected.has(
        eyeId,
      )
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
   SECRET TIMEOUT
========================================================= */

export function getCrawlSecretTimeoutSeconds(
  challenge:
    CrawlSecretChallenge
    | null,
): number {
  if (
    challenge?.type
    === "nether"
  ) {
    return CRAWL_NETHER_TIMEOUT_SECONDS;
  }

  return CRAWL_SECRET_TIMEOUT_SECONDS;
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
      return {
        type:
          "coil",

        prompt:
          challenge.prompt,
      };

    case "contest":
      /*
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
       * Unlike the old 5x5 implementation, every item
       * in this array is a real visible eye.
       *
       * Position and rotation are presentation data and
       * therefore safe/necessary for React to receive.
       *
       * The Worker still validates the complete set of
       * clicked IDs against its persisted private run.
       */
      return {
        type:
          "nether",

        eyeCount:
          challenge.eyeCount,

        eyes:
          challenge.eyes.map(
            (eye) => ({
              id:
                eye.id,

              x:
                eye.x,

              y:
                eye.y,

              rotation:
                eye.rotation,
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
   * Nether receives 20 seconds.
   *
   * Coil and Contest remain at 15 seconds.
   */
  const secretTimeoutSeconds =
    getCrawlSecretTimeoutSeconds(
      secretChallenge,
    );

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
        secretTimeoutSeconds,

      status:
        secretEncounterIndex
        !== null
          ? "pending"
          : null,

      challenge:
        secretChallenge,
    },

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
