export type SiteMode =
  | "live"
  | "maintenance"
  | "countdown";

export const SITE_MODE: SiteMode =
  "countdown";

/*
 * Only used when SITE_MODE is "countdown".
 *
 * IMPORTANT:
 * Include the timezone offset so there is no ambiguity.
 *
 * Examples:
 *
 * Belgium summer time:
 * "2026-10-01T20:00:00+02:00"
 *
 * Belgium winter time:
 * "2026-12-01T20:00:00+01:00"
 */
export const COUNTDOWN_TARGET =
  "2026-09-25T01:08:00+02:00";
