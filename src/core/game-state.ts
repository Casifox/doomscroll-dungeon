import { BASE_PLAYER } from '../core/config';
import type { Profile, RunState, Settings } from '../core/types';

export const RUN_VERSION = 1;

export function createRun(seed: string): RunState {
  return {
    version: RUN_VERSION,
    seed,
    floor: 1,
    mode: 'combat',
    hp: BASE_PLAYER.maxHp,
    maxHp: BASE_PLAYER.maxHp,
    shares: BASE_PLAYER.maxShares,
    maxShares: BASE_PLAYER.maxShares,
    upgrades: [],
    score: 0,
    breakdown: {
      kills: 0,
      rooms: 0,
      combos: 0,
      dodges: 0,
      boss: 0,
      bonuses: 0,
      survival: 0,
    },
    stats: {
      kills: 0,
      roomsCleared: 0,
      dodges: 0,
      damageDealt: 0,
      damageAvoided: 0,
      maxCombo: 0,
      sharesUsed: 0,
      sponsoredIgnored: 0,
      bossDefeated: false,
    },
    elapsed: 0,
    startedAt: Date.now(),
  };
}

export function createDefaultProfile(): Profile {
  return {
    bestScore: 0,
    gamesPlayed: 0,
    bestFloor: 0,
    victories: 0,
    tutorialSeen: false,
    lastSeed: '',
    totalKills: 0,
    totalDodges: 0,
  };
}

export function createDefaultSettings(): Settings {
  return {
    sfxVolume: 0.65,
    musicVolume: 0.35,
    reducedMotion: false,
  };
}

export function sanitizeSeedOrRandom(input: string, fallback: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
  return cleaned || fallback;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('fr-FR');
}

export function formatHp(value: number): string {
  return `${Math.max(0, Math.round(value))}`;
}
