import { describe, expect, it } from 'vitest';
import { RUN_CONFIG } from '../src/core/config';
import { generateMinion, generateRoom, getThemeForFloor } from '../src/systems/generation';
import { generateUpgradeChoices } from '../src/systems/progression';

describe('génération déterministe', () => {
  it('produit exactement la même salle pour une graine et un étage donnés', () => {
    const first = generateRoom('RATIO-2026', 4);
    const second = generateRoom('RATIO-2026', 4);
    expect(first).toEqual(second);
  });

  it('génère des salles différentes pour deux graines', () => {
    const first = generateRoom('RATIO-2026', 4);
    const second = generateRoom('AUTRE-GRAINE', 4);
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });

  it('génère les huit étages de combat puis le boss', () => {
    for (let floor = 1; floor <= RUN_CONFIG.combatFloors; floor++) {
      const room = generateRoom('SEED-DU-JOUR', floor);
      expect(room.isBoss).toBe(false);
      expect(room.enemies.length).toBeGreaterThan(0);
      expect(room.enemies.length).toBeLessThanOrEqual(3);
      expect(room.floor).toBe(floor);
      expect(room.totalFloors).toBe(RUN_CONFIG.totalFloors);
      expect(room.theme.className).toMatch(/^theme-/);
    }
    const bossRoom = generateRoom('SEED-DU-JOUR', RUN_CONFIG.bossFloor);
    expect(bossRoom.isBoss).toBe(true);
    expect(bossRoom.enemies).toHaveLength(0);
    expect(bossRoom.event).toBeNull();
  });

  it('donne des thèmes distincts aux huit étages normaux', () => {
    const themes = Array.from(
      { length: RUN_CONFIG.combatFloors },
      (_value, index) => getThemeForFloor('THEMES', index + 1).id,
    );
    expect(new Set(themes).size).toBe(RUN_CONFIG.combatFloors);
  });

  it('génère des ennemis viables et des pubs avec mèche', () => {
    for (let floor = 1; floor <= RUN_CONFIG.combatFloors; floor++) {
      const room = generateRoom('VALIDATION', floor);
      for (const enemy of room.enemies) {
        expect(enemy.hp).toBeGreaterThan(0);
        expect(enemy.damage).toBeGreaterThan(0);
        expect(enemy.attackInterval).toBeGreaterThan(0);
        if (enemy.kind === 'sponsored') {
          expect(enemy.sponsorFuse).toBeGreaterThan(0);
        } else {
          expect(enemy.sponsorFuse).toBe(0);
        }
      }
    }
  });

  it('génère des options d’amélioration déterministes sans doublon', () => {
    const first = generateUpgradeChoices('BUILD', 4, []);
    const second = generateUpgradeChoices('BUILD', 4, []);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(3);

    const afterPick = generateUpgradeChoices('BUILD', 4, [first[0]!]);
    expect(afterPick).not.toContain(first[0]);
  });

  it('génère des sbires de boss avec un identifiant unique', () => {
    const first = generateMinion('BOSS', 'ragebait', 1);
    const second = generateMinion('BOSS', 'sponsored', 2);
    expect(first.id).not.toBe(second.id);
    expect(first.minion).toBe(true);
    expect(second.minion).toBe(true);
    expect(second.sponsorFuse).toBeGreaterThan(0);
  });
});
