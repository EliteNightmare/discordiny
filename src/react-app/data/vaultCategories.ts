export type VaultActivity = { name: string; slug: string; weaponSource: string; group?: string };
export type VaultCategory = { name: string; slug: string; description: string; directSource?: string; activities?: VaultActivity[] };

// Each activity retains its original weaponSource: no backend loot-pool changes.
export const VAULT_CATEGORIES: VaultCategory[] = [
  { name: "Destinations", slug: "destinations", description: "", activities: [
    { name: "Cosmodrome", slug: "cosmodrome", weaponSource: "cosmodrome" },
    { name: "European Dead Zone", slug: "european-dead-zone", weaponSource: "edz" },
    { name: "Nessus", slug: "nessus", weaponSource: "nessus" },
    { name: "Dreaming City", slug: "dreaming-city", weaponSource: "dreaming city" },
    { name: "Moon", slug: "moon", weaponSource: "moon" },
    { name: "Europa", slug: "europa", weaponSource: "europa" },
    { name: "Throne World", slug: "throne-world", weaponSource: "throne world" },
    { name: "Neomuna", slug: "neomuna", weaponSource: "neomuna" },
    { name: "The Pale Heart", slug: "the-pale-heart", weaponSource: "pale heart" },
    { name: "Plaguelands", slug: "plaguelands", weaponSource: "plaguelands" },
  ] },
  { name: "Daily", slug: "daily", description: "", activities: [
    { name: "Crown of Sorrow", slug: "crown-of-sorrow", weaponSource: "cos", group: "Daily Showdowns" },
    { name: "Spire of Stars", slug: "spire-of-stars", weaponSource: "sos", group: "Daily Showdowns" },
    { name: "Eater of Worlds", slug: "eater-of-worlds", weaponSource: "eow", group: "Daily Showdowns" },
    { name: "Spire of the Watcher", slug: "spire-of-the-watcher", weaponSource: "sotw", group: "Daily Dungeons" },
    { name: "Equilibrium", slug: "equilibrium", weaponSource: "eq", group: "Daily Dungeons" },
    { name: "Vault of Glass", slug: "vault-of-glass", weaponSource: "vog", group: "Daily Raids" },
    { name: "King's Fall", slug: "kings-fall", weaponSource: "kf", group: "Daily Raids" },
    { name: "Crota's End", slug: "crotas-end", weaponSource: "ce", group: "Daily Raids" },
    { name: "Ultimate DP", slug: "ultimate-desert-perpetual", weaponSource: "udp", group: "Daily Raids" },
  ] },
  { name: "Vanguard", slug: "vanguard", description: "", activities: [
    { name: "Strikes", slug: "strikes", weaponSource: "strike" },
    { name: "Nightfalls", slug: "nightfalls", weaponSource: "nf" },
    { name: "Grandmasters", slug: "grandmasters", weaponSource: "gm" },
  ] },
  { name: "Pinnacle", slug: "pinnacle", description: "", activities: [
    { name: "Battlegrounds", slug: "battlegrounds", weaponSource: "bgs", group: "Infiltrations" },
    { name: "Empire Hunt", slug: "empire-hunt", weaponSource: "emph", group: "Infiltrations" },
    { name: "Nightmare Hunt", slug: "nightmare-hunt", weaponSource: "nigh", group: "Infiltrations" },
    { name: "Exo Challenge", slug: "exo-challenge", weaponSource: "seraph", group: "Pinnacle Showdowns" },
    { name: "Great Hunt", slug: "great-hunt", weaponSource: "elivagar", group: "Pinnacle Showdowns" },
    { name: "Lucent Fireteam", slug: "lucent-fireteam", weaponSource: "lucent", group: "Pinnacle Showdowns" },
    { name: "The Coil", slug: "the-coil", weaponSource: "coil", group: "Crawls" },
    { name: "Kells Contest", slug: "kells-contest", weaponSource: "contest", group: "Crawls" },
    { name: "The Nether", slug: "the-nether", weaponSource: "nether", group: "Crawls" },
  ] },
  { name: "Endgame", slug: "endgame", description: "", activities: [
    { name: "Grasp of Avarice", slug: "grasp-of-avarice", weaponSource: "goa", group: "Dungeons" },
    { name: "Warlord's Ruin", slug: "warlords-ruin", weaponSource: "wr", group: "Dungeons" },
    { name: "Duality", slug: "duality", weaponSource: "dual", group: "Dungeons" },
    { name: "Shattered Throne", slug: "shattered-throne", weaponSource: "st", group: "Dungeons" },
    { name: "Pit of Heresy", slug: "pit-of-heresy", weaponSource: "poh", group: "Dungeons" },
    { name: "Vesper's Host", slug: "vespers-host", weaponSource: "vh", group: "Dungeons" },
    { name: "Sundered Doctrine", slug: "sundered-doctrine", weaponSource: "sd", group: "Dungeons" },
    { name: "Ghosts of the Deep", slug: "ghosts-of-the-deep", weaponSource: "gotd", group: "Dungeons" },
    { name: "Prophecy", slug: "prophecy", weaponSource: "proph", group: "Dungeons" },
    { name: "Scourge of the Past", slug: "scourge-of-the-past", weaponSource: "scourge", group: "Raids" },
    { name: "Leviathan", slug: "leviathan", weaponSource: "levi", group: "Raids" },
    { name: "Last Wish", slug: "last-wish", weaponSource: "lw", group: "Raids" },
    { name: "Garden of Salvation", slug: "garden-of-salvation", weaponSource: "gos", group: "Raids" },
    { name: "Deepstone Crypt", slug: "deepstone-crypt", weaponSource: "dsc", group: "Raids" },
    { name: "Vow of the Disciple", slug: "vow-of-the-disciple", weaponSource: "vow", group: "Raids" },
    { name: "Root of Nightmares", slug: "root-of-nightmares", weaponSource: "ron", group: "Raids" },
    { name: "Salvation's Edge", slug: "salvations-edge", weaponSource: "se", group: "Raids" },
  ] },
  { name: "Events", slug: "events", description: "", activities: [
  ] },
  { name: "Fishing", slug: "fishing", description: "", activities: [
    { name: "Fishing", slug: "fishing", weaponSource: "fishing" },
  ] },
];

// Legacy URLs continue to resolve after moving the collections into new groups.
const LEGACY_GROUPS: Record<string, string> = {
  strikes: "vanguard", nightfalls: "vanguard", grandmasters: "vanguard",
  infiltrations: "pinnacle", showdowns: "pinnacle", crawls: "pinnacle",
  raids: "endgame", dungeons: "endgame",
};
export function getVaultCategory(slug: string): VaultCategory | undefined {
  return VAULT_CATEGORIES.find(category => category.slug === (LEGACY_GROUPS[slug] ?? slug));
}
export function getVaultActivity(categorySlug: string, activitySlug: string): VaultActivity | undefined {
  return getVaultCategory(categorySlug)?.activities?.find(activity => activity.slug === activitySlug)
    ?? VAULT_CATEGORIES.flatMap(category => category.activities ?? []).find(activity => activity.slug === activitySlug);
}
