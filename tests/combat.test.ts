import { describe, expect, it } from 'vitest';
import { BASE_PLAYER } from '../src/core/config';
import type { BossRuntime, EnemyRuntime } from '../src/core/types';
import {
  computeLikeDamage,
  getComboDamageMultiplier,
  getHpRatio,
  isLowHp,
  isRoomCleared,
  resolveIncomingDamage,
} from '../src/systems/combat';
import { getLoadout } from '../src/systems/progression';
import { createRun } from '../src/core/game-state';
import { createBoss } from '../src/entities/bosses';

function makeEnemy(overrides: Partial<EnemyRuntime> = {}): EnemyRuntime {
  return {
    id: 'enemy-1',
    kind: 'ragebait',
    name: 'Ragebait',
    handle: '@ragebait',
    avatar: '😡',
    text: 'Ratio',
    hp: 40,
    maxHp: 60,
    damage: 8,
    attackInterval: 3.5,
    attackTimer: 2,
    telegraph: 1.1,
    telegraphRemaining: 0,
    telegraphTotal: 0,
    alive: true,
    taunting: false,
    tauntTimer: 5,
    tauntRemaining: 0,
    enrage: 0,
    specialTimer: 7,
    sponsorFuse: 0,
    sponsorFuseTotal: 0,
    elite: false,
    minion: false,
    ...overrides,
  };
}

describe('combat — dégâts du joueur', () => {
  it('augmente les dégâts avec le combo puis plafonne', () => {
    expect(getComboDamageMultiplier(1)).toBe(1);
    expect(getComboDamageMultiplier(5)).toBeCloseTo(1.24);
    expect(getComboDamageMultiplier(50)).toBeCloseTo(
      1 + BASE_PLAYER.maxComboDamageSteps * BASE_PLAYER.comboDamageStep,
    );
  });

  it('applique la pénalité de provocation', () => {
    const run = createRun('TEST');
    const loadout = getLoadout(run);
    const normal = computeLikeDamage(loadout, 1);
    const taunt = computeLikeDamage(loadout, 1, { taunting: true });
    expect(taunt.tauntPenalty).toBe(true);
    expect(taunt.damage).toBeLessThan(normal.damage);
  });

  it('réduit les dégâts contre une cible blindée', () => {
    const loadout = getLoadout(createRun('TEST'));
    const normal = computeLikeDamage(loadout, 1);
    const armored = computeLikeDamage(loadout, 1, { reduction: 0.88 });
    expect(armored.damage).toBeLessThan(normal.damage);
    expect(armored.damage).toBeGreaterThanOrEqual(1);
  });
});

describe('combat — dégâts reçus', () => {
  it('encaisse tous les dégâts sans défense', () => {
    const result = resolveIncomingDamage(20, { dodging: false, shieldReduction: null });
    expect(result.hpLoss).toBe(20);
    expect(result.avoided).toBe(0);
    expect(result.dodged).toBe(false);
  });

  it('réduit les dégâts avec un bouclier', () => {
    const result = resolveIncomingDamage(20, { dodging: false, shieldReduction: 0.75 });
    expect(result.hpLoss).toBe(5);
    expect(result.avoided).toBe(15);
    expect(result.hpLoss).toBeGreaterThan(0);
  });

  it('annule entièrement les dégâts avec une esquive', () => {
    const result = resolveIncomingDamage(38, { dodging: true, shieldReduction: 0.75 });
    expect(result.hpLoss).toBe(0);
    expect(result.avoided).toBe(38);
    expect(result.dodged).toBe(true);
  });
});

describe('combat — fin de salle et vitalité', () => {
  it('détecte une salle vide', () => {
    const boss = createBoss();
    expect(isRoomCleared([makeEnemy({ alive: false })], null)).toBe(true);
    expect(isRoomCleared([makeEnemy({ alive: true })], null)).toBe(false);
    expect(isRoomCleared([], boss)).toBe(false);
    boss.alive = false;
    expect(isRoomCleared([], boss)).toBe(true);
  });

  it('calcule le ratio de vie et le seuil de danger', () => {
    expect(getHpRatio(25, 100)).toBe(0.25);
    expect(isLowHp(25, 100)).toBe(true);
    expect(isLowHp(26, 100)).toBe(false);
    expect(getHpRatio(50, 0)).toBe(0);
  });

  it('garde un boss actif séparé des sbires morts', () => {
    const boss: BossRuntime = createBoss();
    const minion = makeEnemy({ alive: false, minion: true });
    expect(isRoomCleared([minion], boss)).toBe(false);
    boss.alive = false;
    expect(isRoomCleared([minion], boss)).toBe(true);
  });
});
