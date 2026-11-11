import { BASE_PLAYER } from '../core/config';
import type { BossRuntime, EnemyRuntime, Loadout } from '../core/types';

export function getComboDamageMultiplier(combo: number): number {
  const steps = Math.max(0, Math.min(BASE_PLAYER.maxComboDamageSteps, combo - 1));
  return 1 + steps * BASE_PLAYER.comboDamageStep;
}

export interface LikeDamageResult {
  damage: number;
  comboMultiplier: number;
  tauntPenalty: boolean;
}

export function computeLikeDamage(
  loadout: Loadout,
  combo: number,
  options: { taunting?: boolean; reduction?: number } = {},
): LikeDamageResult {
  const comboMultiplier = getComboDamageMultiplier(combo);
  const tauntPenalty = Boolean(options.taunting);
  const reduction = Math.max(0, Math.min(1, options.reduction ?? 0));
  const raw = loadout.likeDamage * comboMultiplier * (tauntPenalty ? 0.55 : 1) * (1 - reduction);
  return {
    damage: Math.max(1, Math.round(raw)),
    comboMultiplier,
    tauntPenalty,
  };
}

export interface IncomingDamageResult {
  hpLoss: number;
  avoided: number;
  blocked: number;
  dodged: boolean;
}

export function resolveIncomingDamage(
  rawDamage: number,
  options: { dodging: boolean; shieldReduction: number | null },
): IncomingDamageResult {
  const raw = Math.max(0, rawDamage);
  if (raw === 0) {
    return { hpLoss: 0, avoided: 0, blocked: 0, dodged: false };
  }
  if (options.dodging) {
    return { hpLoss: 0, avoided: raw, blocked: 0, dodged: true };
  }
  if (options.shieldReduction !== null && options.shieldReduction > 0) {
    const hpLoss = Math.max(1, Math.round(raw * (1 - options.shieldReduction)));
    return {
      hpLoss,
      avoided: raw - hpLoss,
      blocked: raw - hpLoss,
      dodged: false,
    };
  }
  return { hpLoss: raw, avoided: 0, blocked: 0, dodged: false };
}

export function isRoomCleared(
  enemies: readonly EnemyRuntime[],
  boss: BossRuntime | null,
): boolean {
  const enemiesDown = enemies.every((enemy) => !enemy.alive);
  return enemiesDown && (!boss || !boss.alive);
}

export function getHpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, hp / maxHp));
}

export function isLowHp(hp: number, maxHp: number): boolean {
  return getHpRatio(hp, maxHp) <= 0.25;
}

export function getTelegraphProgress(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - remaining / total));
}
