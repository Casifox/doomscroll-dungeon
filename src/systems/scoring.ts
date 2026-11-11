import { RUN_CONFIG, SCORE } from '../core/config';
import type {
  Profile,
  ResultsData,
  RunState,
  ScoreBreakdown,
} from '../core/types';

export type ScoreCategory = keyof ScoreBreakdown;

export function addScore(
  run: RunState,
  category: ScoreCategory,
  base: number,
  multiplier = 1,
): number {
  const points = Math.max(0, Math.round(base * multiplier));
  if (points === 0) return 0;
  run.breakdown[category] += points;
  run.score += points;
  return points;
}

export function recordHit(run: RunState, combo: number, multiplier: number, comboScoreMultiplier: number): number {
  return addScore(
    run,
    'combos',
    SCORE.hit + Math.max(0, combo - 1) * SCORE.comboScoreFactor,
    multiplier * comboScoreMultiplier,
  );
}

export function recordKill(
  run: RunState,
  floor: number,
  elite: boolean,
  multiplier: number,
): number {
  run.stats.kills += 1;
  const base = (SCORE.killBase + SCORE.killPerFloor * floor) * (elite ? SCORE.eliteKillMul : 1);
  return addScore(run, 'kills', base, multiplier);
}

export function recordRoomClear(run: RunState, floor: number, multiplier: number): number {
  run.stats.roomsCleared += 1;
  return addScore(run, 'rooms', SCORE.roomBase + SCORE.roomPerFloor * floor, multiplier);
}

export function recordDodge(run: RunState, avoidedDamage: number, multiplier: number): number {
  run.stats.dodges += 1;
  run.stats.damageAvoided += Math.max(0, avoidedDamage);
  return addScore(
    run,
    'dodges',
    SCORE.dodgeBase + avoidedDamage * SCORE.dodgePerDamage,
    multiplier,
  );
}

export function recordIgnore(run: RunState, floor: number, multiplier: number): number {
  run.stats.sponsoredIgnored += 1;
  return addScore(
    run,
    'bonuses',
    SCORE.sponsoredIgnoreBase + SCORE.sponsoredIgnorePerFloor * floor,
    multiplier,
  );
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function buildShareText(
  victory: boolean,
  score: number,
  roomsCleared: number,
  floor: number,
  seed: string,
): string {
  const formattedScore = score.toLocaleString('fr-FR');
  if (victory) {
    return `J’ai désinstallé L’Algorithme dans Doomscroll Dungeon ! 🏆 Score : ${formattedScore} · ${roomsCleared} étages nettoyés · Graine ${seed}. Le fil m’a dévoré, mais j’ai mordu plus fort. 📵`;
  }
  if (roomsCleared <= 0) {
    return `Je suis entré dans Doomscroll Dungeon. Je n’ai même pas survécu à un étage. Score : ${formattedScore}. L’Algorithme m’a eu. 😵‍💫 Graine : ${seed}`;
  }
  return `J’ai survécu à ${roomsCleared} étages dans Doomscroll Dungeon ! Score : ${formattedScore} · Étage ${floor}/9 · Graine ${seed}. L’Algorithme ne m’aura pas… cette fois. 😤`;
}

export function createResults(
  run: RunState,
  victory: boolean,
  oldBestScore: number,
): ResultsData {
  const survivalBonus = Math.round(Math.max(0, run.elapsed) * SCORE.survivalPerSecond);
  const breakdown: ScoreBreakdown = {
    ...run.breakdown,
    survival: survivalBonus,
  };
  const score = run.score + survivalBonus;
  const newBest = score > oldBestScore;
  return {
    victory,
    score,
    baseScore: run.score,
    survivalBonus,
    breakdown,
    stats: { ...run.stats },
    elapsed: run.elapsed,
    floor: run.floor,
    totalFloors: RUN_CONFIG.totalFloors,
    seed: run.seed,
    bestScore: Math.max(oldBestScore, score),
    newBest,
    shareText: buildShareText(victory, score, run.stats.roomsCleared, run.floor, run.seed),
  };
}

export function applyResultsToProfile(profile: Profile, result: ResultsData): Profile {
  return {
    ...profile,
    bestScore: Math.max(profile.bestScore, result.score),
    bestFloor: Math.max(profile.bestFloor, Math.min(result.floor, RUN_CONFIG.totalFloors)),
    gamesPlayed: profile.gamesPlayed + 1,
    victories: profile.victories + (result.victory ? 1 : 0),
    lastSeed: result.seed,
    totalKills: profile.totalKills + result.stats.kills,
    totalDodges: profile.totalDodges + result.stats.dodges,
  };
}
