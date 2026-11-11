import { describe, expect, it } from 'vitest';
import { createRun } from '../src/core/game-state';
import {
  ALL_UPGRADE_IDS,
  applyUpgrade,
  generateUpgradeChoices,
  getLoadout,
  UPGRADES,
} from '../src/systems/progression';
import type { UpgradeId } from '../src/core/types';

describe('progression', () => {
  it('propose dix améliorations uniques', () => {
    expect(UPGRADES).toHaveLength(10);
    expect(new Set(ALL_UPGRADE_IDS).size).toBe(10);
  });

  it('améliore les dégâts avec Super Like et Doigts d’Acier', () => {
    const run = createRun('BUILD');
    const base = getLoadout(run);
    applyUpgrade(run, 'super_like');
    applyUpgrade(run, 'doigts_acier');
    const boosted = getLoadout(run);
    expect(boosted.likeDamage).toBe(base.likeDamage + 11);
    expect(boosted.attackCooldown).toBeLessThan(base.attackCooldown);
  });

  it('ajoute des PV et des charges de partage immédiatement', () => {
    const run = createRun('BUILD');
    run.hp = 40;
    applyUpgrade(run, 'pouce_fer');
    expect(run.maxHp).toBe(125);
    expect(run.hp).toBe(65);
    const sharesBefore = run.shares;
    applyUpgrade(run, 'viral_share');
    expect(run.maxShares).toBe(4);
    expect(run.shares).toBe(Math.min(4, sharesBefore + 1));
    expect(getLoadout(run).shareHeal).toBe(28);
  });

  it('renforce le bouclier et l’esquive', () => {
    const run = createRun('BUILD');
    applyUpgrade(run, 'shield_premium');
    applyUpgrade(run, 'comment_epique');
    applyUpgrade(run, 'scroll_turbo');
    const loadout = getLoadout(run);
    expect(loadout.shieldReduction).toBeGreaterThan(0.8);
    expect(loadout.shieldDuration).toBeGreaterThan(4);
    expect(loadout.dodgeCooldown).toBeLessThan(2.5);
  });

  it('applique les multiplicateurs de score et de combo', () => {
    const run = createRun('BUILD');
    applyUpgrade(run, 'algo_fou');
    applyUpgrade(run, 'influenceur');
    const loadout = getLoadout(run);
    expect(loadout.scoreMultiplier).toBeCloseTo(1.2);
    expect(loadout.comboScoreMultiplier).toBe(1.5);
    expect(loadout.comboWindow).toBeGreaterThan(2.2);
  });

  it('ne duplique pas une amélioration déjà possédée', () => {
    const run = createRun('BUILD');
    applyUpgrade(run, 'super_like');
    applyUpgrade(run, 'super_like');
    expect(run.upgrades.filter((id) => id === 'super_like')).toHaveLength(1);
  });

  it('propose des choix parmi les améliorations restantes', () => {
    const owned: UpgradeId[] = ['super_like', 'algo_fou', 'scroll_turbo'];
    const choices = generateUpgradeChoices('CHOIX', 6, owned);
    expect(choices).toHaveLength(3);
    for (const choice of choices) {
      expect(owned).not.toContain(choice);
    }
  });
});
