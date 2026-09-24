export const MAX_LEVEL = 100;

export function xpRequired(level: number): number {
  if (level >= MAX_LEVEL) {
    return 0;
  }

  return 1000 * (level + 1);
}

export function totalXpForLevel(level: number): number {
  let total = 0;

  for (let i = 0; i < level; i++) {
    total += xpRequired(i);
  }

  return total;
}

export function calculateLevel(xp: number): number {
  let level = 0;

  while (level < MAX_LEVEL) {
    const required = totalXpForLevel(level + 1);

    if (xp < required) {
      break;
    }

    level += 1;
  }

  return level;
}

export function getLevelProgress(xp: number) {
  const level = calculateLevel(xp);

  if (level >= MAX_LEVEL) {
    return {
      level,
      totalXp: xp,
      currentXp: xp,
      nextXp: 0,
      percentage: 100,
    };
  }

  const levelStart = totalXpForLevel(level);
  const nextXp = xpRequired(level);

  const currentXp = Math.max(
    0,
    xp - levelStart
  );

  const percentage =
    nextXp > 0
      ? Math.min(
          100,
          Math.floor(
            (currentXp / nextXp) * 100
          )
        )
      : 100;

  return {
    level,
    totalXp: xp,
    currentXp,
    nextXp,
    percentage,
  };
}
