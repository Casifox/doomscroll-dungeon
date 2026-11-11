import { BOSS_CONFIG } from '../core/config';
import type { BossAbility, BossPhase, BossRuntime } from '../core/types';

export const BOSS_PRESET = {
  name: 'L’Algorithme',
  handle: '@algo_souverain',
  avatar: '🧠',
  text: 'J’ai vu tes 4 312 derniers scrolls. Tu es mon contenu préféré. Reste encore un peu.',
} as const;

export interface BossAbilityInfo {
  title: string;
  hint: string;
  icon: string;
  damage: number;
}

export const BOSS_ABILITY_INFO: Record<BossAbility, BossAbilityInfo> = {
  surge: {
    title: 'Surcharge de ratio',
    hint: 'Une vague de rage remonte le fil. Esquive ou bouclier.',
    icon: '📈',
    damage: BOSS_CONFIG.surgeDamage,
  },
  rain: {
    title: 'Déluge de notifications',
    hint: 'Trop de badges rouges. Esquive la vague entière.',
    icon: '🔔',
    damage: BOSS_CONFIG.rainDamage,
  },
  summon: {
    title: 'Recommandations ciblées',
    hint: 'Il génère de nouvelles publications ennemies.',
    icon: '👥',
    damage: 0,
  },
  fake_like: {
    title: 'Faux boutons',
    hint: 'Des likes piégés apparaissent. Ne clique pas dessus.',
    icon: '💎',
    damage: 0,
  },
  glitch: {
    title: 'Mise à jour forcée',
    hint: 'L’interface va se mélanger. Garde le contrôle.',
    icon: '🧩',
    damage: 0,
  },
  final_upload: {
    title: 'UPLOAD FINAL',
    hint: 'Tout ton temps d’écran dans un seul impact. ESQUIVE !',
    icon: '💾',
    damage: BOSS_CONFIG.finalDamage,
  },
};

export function createBoss(): BossRuntime {
  return {
    id: 'boss',
    name: BOSS_PRESET.name,
    handle: BOSS_PRESET.handle,
    avatar: BOSS_PRESET.avatar,
    text: BOSS_PRESET.text,
    hp: BOSS_CONFIG.hp,
    maxHp: BOSS_CONFIG.hp,
    phase: 1,
    status: 'vulnerable',
    statusRemaining: 5.5,
    abilityTimer: 2.8,
    ability: null,
    telegraphRemaining: 0,
    telegraphTotal: 0,
    alive: true,
    finalUploadUsed: false,
  };
}

export function getBossPhase(hp: number, maxHp: number): BossPhase {
  const ratio = hp / maxHp;
  if (ratio <= BOSS_CONFIG.phase3Threshold) return 3;
  if (ratio <= BOSS_CONFIG.phase2Threshold) return 2;
  return 1;
}

export interface BossAbilityContext {
  finalReady: boolean;
  canSummon: boolean;
  debuffActive: boolean;
  previous: BossAbility | null;
}

/** Choisit une capacité de boss de façon lisible et sans trop de répétitions. */
export function chooseBossAbility(
  phase: BossPhase,
  rng: () => number,
  context: BossAbilityContext,
): BossAbility {
  if (context.finalReady) return 'final_upload';

  const weighted: BossAbility[] = [];
  const add = (ability: BossAbility, weight: number) => {
    if (ability === 'summon' && !context.canSummon) return;
    if (ability === 'glitch' && context.debuffActive) return;
    for (let i = 0; i < weight; i++) weighted.push(ability);
  };

  if (phase === 1) {
    add('surge', 3);
    add('summon', 1);
    add('glitch', 1);
  } else if (phase === 2) {
    add('surge', 2);
    add('rain', 2);
    add('summon', 1);
    add('fake_like', 2);
    add('glitch', 1);
  } else {
    add('surge', 2);
    add('rain', 3);
    add('fake_like', 2);
    add('summon', 1);
  }

  const filtered = weighted.filter((ability) => ability !== context.previous);
  const pool = filtered.length > 0 ? filtered : weighted;
  if (pool.length === 0) return 'surge';
  return pool[Math.floor(rng() * pool.length)] as BossAbility;
}

export function bossAbilityTelegraph(ability: BossAbility): number {
  switch (ability) {
    case 'surge':
      return 1.35;
    case 'rain':
      return 1.8;
    case 'final_upload':
      return 2.9;
    case 'summon':
      return 1.1;
    case 'fake_like':
      return 1.2;
    case 'glitch':
      return 1;
    default:
      return 1.2;
  }
}

export function bossAbilityDamage(ability: BossAbility, phase: BossPhase): number {
  if (ability === 'final_upload') return BOSS_CONFIG.finalDamage;
  if (ability === 'rain') return BOSS_CONFIG.rainDamage + (phase - 1) * 2;
  if (ability === 'surge') return BOSS_CONFIG.surgeDamage + (phase - 1) * 2;
  return 0;
}

export function bossArmorReduction(phase: BossPhase): number {
  return phase === 3 ? 0.35 : 0.12;
}

export function bossAbilityDelay(phase: BossPhase, rng: () => number): number {
  const base = phase === 1 ? 3.5 : phase === 2 ? 3 : 2.35;
  return base + rng() * 0.9;
}
