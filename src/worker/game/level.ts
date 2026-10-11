/** Unlimited player progression. Level n starts at 500*n*(n+1) total XP. */
export const MAX_LEVEL = Number.MAX_SAFE_INTEGER; // Legacy compatibility; not a gameplay cap.
const normalizedXp = (xp: number) => Math.max(0, Number.isFinite(xp) ? xp : 0);
export function xpRequired(level: number): number {
  return 1000 * (Math.max(0, Math.floor(level)) + 1);
}
export function totalXpForLevel(level: number): number {
  const n = Math.max(0, Math.floor(level));
  return 500 * n * (n + 1);
}
export function calculateLevel(xp: number): number {
  const value = normalizedXp(xp);
  let level = Math.floor((Math.sqrt(1 + 8 * (value / 1000)) - 1) / 2);
  // Guard against floating-point rounding at exact level boundaries.
  while (level > 0 && totalXpForLevel(level) > value) level--;
  while (totalXpForLevel(level + 1) <= value) level++;
  return level;
}
export function getLevelProgress(xp: number) {
  const totalXp = normalizedXp(xp);
  const level = calculateLevel(totalXp);
  const nextXp = xpRequired(level);
  const currentXp = Math.max(0, totalXp - totalXpForLevel(level));
  return { level, totalXp, currentXp, nextXp, percentage: Math.min(100, Math.floor(currentXp / nextXp * 100)) };
}
