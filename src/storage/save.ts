import { RUN_CONFIG } from '../core/config';
import { sanitizeSeed } from '../core/rng';
import {
  createDefaultProfile,
  createDefaultSettings,
  RUN_VERSION,
} from '../core/game-state';
import type {
  Profile,
  RunState,
  SavedRun,
  Settings,
  UpgradeId,
} from '../core/types';
import { ALL_UPGRADE_IDS } from '../systems/progression';

export const STORAGE_KEYS = {
  profile: 'doomscroll.v1.profile',
  settings: 'doomscroll.v1.settings',
  run: 'doomscroll.v1.run',
} as const;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function detectStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__doomscroll_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function integerOr(value: unknown, fallback: number, min = 0): number {
  const num = asNumber(value, fallback);
  return Math.max(min, Math.round(num));
}

export class SaveStore {
  private storage: StorageLike | null;
  private memory = new Map<string, string>();

  constructor(storage?: StorageLike | null) {
    this.storage = storage === undefined ? detectStorage() : storage;
  }

  get persistent(): boolean {
    return this.storage !== null;
  }

  private readRaw(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? this.memory.get(key) ?? null;
    } catch {
      return this.memory.get(key) ?? null;
    }
  }

  private writeRaw(key: string, value: string): boolean {
    this.memory.set(key, value);
    try {
      this.storage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  private removeRaw(key: string): void {
    this.memory.delete(key);
    try {
      this.storage?.removeItem(key);
    } catch {
      // Stockage indisponible : le fallback mémoire reste cohérent.
    }
  }

  private readJson(key: string): unknown {
    const raw = this.readRaw(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  loadProfile(): Profile {
    const value = this.readJson(STORAGE_KEYS.profile);
    const defaults = createDefaultProfile();
    if (!value || typeof value !== 'object') return defaults;
    const obj = value as Record<string, unknown>;
    return {
      bestScore: integerOr(obj.bestScore, defaults.bestScore),
      gamesPlayed: integerOr(obj.gamesPlayed, defaults.gamesPlayed),
      bestFloor: clamp(integerOr(obj.bestFloor, defaults.bestFloor), 0, RUN_CONFIG.totalFloors),
      victories: integerOr(obj.victories, defaults.victories),
      tutorialSeen: obj.tutorialSeen === true,
      lastSeed: typeof obj.lastSeed === 'string' ? obj.lastSeed.slice(0, 16) : defaults.lastSeed,
      totalKills: integerOr(obj.totalKills, defaults.totalKills),
      totalDodges: integerOr(obj.totalDodges, defaults.totalDodges),
    };
  }

  saveProfile(profile: Profile): boolean {
    return this.writeRaw(STORAGE_KEYS.profile, JSON.stringify(profile));
  }

  loadSettings(): Settings {
    const value = this.readJson(STORAGE_KEYS.settings);
    const defaults = createDefaultSettings();
    if (!value || typeof value !== 'object') return defaults;
    const obj = value as Record<string, unknown>;
    return {
      sfxVolume: clamp(asNumber(obj.sfxVolume, defaults.sfxVolume), 0, 1),
      musicVolume: clamp(asNumber(obj.musicVolume, defaults.musicVolume), 0, 1),
      reducedMotion: obj.reducedMotion === true,
    };
  }

  saveSettings(settings: Settings): boolean {
    return this.writeRaw(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  saveRun(run: RunState): boolean {
    const payload: SavedRun = {
      version: RUN_VERSION,
      savedAt: Date.now(),
      run,
    };
    return this.writeRaw(STORAGE_KEYS.run, JSON.stringify(payload));
  }

  loadRun(): SavedRun | null {
    const value = this.readJson(STORAGE_KEYS.run);
    if (!value || typeof value !== 'object') return null;
    const obj = value as Record<string, unknown>;
    if (obj.version !== RUN_VERSION) return null;
    const run = validateRun(obj.run);
    if (!run) return null;
    return {
      version: RUN_VERSION,
      savedAt: asNumber(obj.savedAt, Date.now()),
      run,
    };
  }

  hasRun(): boolean {
    return this.loadRun() !== null;
  }

  clearRun(): void {
    this.removeRaw(STORAGE_KEYS.run);
  }

  resetAll(): void {
    this.removeRaw(STORAGE_KEYS.profile);
    this.removeRaw(STORAGE_KEYS.settings);
    this.removeRaw(STORAGE_KEYS.run);
    this.memory.clear();
  }
}

function validateRun(value: unknown): RunState | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (obj.version !== RUN_VERSION) return null;
  if (typeof obj.seed !== 'string' || obj.seed.length === 0 || obj.seed.length > 24) return null;
  const seed = sanitizeSeed(obj.seed);
  if (!seed) return null;
  const floor = integerOr(obj.floor, 1);
  if (floor < 1 || floor > RUN_CONFIG.totalFloors) return null;
  const maxHp = integerOr(obj.maxHp, 100, 1);
  const hp = clamp(integerOr(obj.hp, maxHp), 1, maxHp);
  const maxShares = integerOr(obj.maxShares, 3, 1);
  const shares = clamp(integerOr(obj.shares, maxShares), 0, maxShares);
  const upgradesRaw = Array.isArray(obj.upgrades) ? obj.upgrades : [];
  const upgrades = [...new Set(upgradesRaw)].filter(
    (id): id is UpgradeId => typeof id === 'string' && ALL_UPGRADE_IDS.includes(id as UpgradeId),
  );
  const statsObj = obj.stats && typeof obj.stats === 'object' ? (obj.stats as Record<string, unknown>) : {};
  const breakdownObj =
    obj.breakdown && typeof obj.breakdown === 'object'
      ? (obj.breakdown as Record<string, unknown>)
      : {};
  const stats = {
    kills: integerOr(statsObj.kills, 0),
    roomsCleared: integerOr(statsObj.roomsCleared, 0),
    dodges: integerOr(statsObj.dodges, 0),
    damageDealt: integerOr(statsObj.damageDealt, 0),
    damageAvoided: integerOr(statsObj.damageAvoided, 0),
    maxCombo: integerOr(statsObj.maxCombo, 0),
    sharesUsed: integerOr(statsObj.sharesUsed, 0),
    sponsoredIgnored: integerOr(statsObj.sponsoredIgnored, 0),
    bossDefeated: statsObj.bossDefeated === true,
  };
  const breakdown = {
    kills: integerOr(breakdownObj.kills, 0),
    rooms: integerOr(breakdownObj.rooms, 0),
    combos: integerOr(breakdownObj.combos, 0),
    dodges: integerOr(breakdownObj.dodges, 0),
    boss: integerOr(breakdownObj.boss, 0),
    bonuses: integerOr(breakdownObj.bonuses, 0),
    survival: integerOr(breakdownObj.survival, 0),
  };
  return {
    version: RUN_VERSION,
    seed,
    floor,
    mode: obj.mode === 'boss' || floor === RUN_CONFIG.bossFloor ? 'boss' : 'combat',
    hp,
    maxHp,
    shares,
    maxShares,
    upgrades,
    score: integerOr(obj.score, 0),
    breakdown,
    stats,
    elapsed: Math.max(0, asNumber(obj.elapsed, 0)),
    startedAt: integerOr(obj.startedAt, Date.now()),
  };
}

export const saveStore = new SaveStore();
