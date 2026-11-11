/** Équilibrage central du jeu. Modifier ici pour ajuster l'expérience. */

export const RUN_CONFIG = {
  totalFloors: 9,
  combatFloors: 8,
  bossFloor: 9,
  upgradeFloors: [2, 4, 6, 8] as readonly number[],
} as const;

export const BASE_PLAYER = {
  maxHp: 100,
  likeDamage: 16,
  attackCooldown: 0.38,
  comboWindow: 2.2,
  comboDamageStep: 0.06,
  maxComboDamageSteps: 12,
  shieldDuration: 3,
  shieldReduction: 0.72,
  shieldCooldown: 8,
  maxShares: 3,
  shareHeal: 20,
  shareCooldown: 3.5,
  dodgeWindow: 0.8,
  dodgeCooldown: 3.4,
} as const;

export const ENEMY_BASE = {
  ragebait: {
    hp: 56,
    hpPerFloor: 8,
    damage: 8,
    damagePerFloor: 0.7,
    interval: 3.7,
    telegraph: 1.15,
    sponsorFuse: 0,
  },
  sponsored: {
    hp: 1,
    hpPerFloor: 0,
    damage: 13,
    damagePerFloor: 0.8,
    interval: 99,
    telegraph: 0,
    sponsorFuse: 13,
  },
  troll: {
    hp: 48,
    hpPerFloor: 7,
    damage: 5,
    damagePerFloor: 0.55,
    interval: 2.8,
    telegraph: 0.95,
    sponsorFuse: 0,
  },
} as const;

export const BOSS_CONFIG = {
  hp: 820,
  surgeDamage: 15,
  rainDamage: 21,
  finalDamage: 38,
  phase2Threshold: 0.66,
  phase3Threshold: 0.33,
  transitionDuration: 1.6,
} as const;

export const SCORE = {
  hit: 2,
  killBase: 55,
  killPerFloor: 15,
  eliteKillMul: 1.35,
  roomBase: 130,
  roomPerFloor: 25,
  dodgeBase: 22,
  dodgePerDamage: 2,
  sponsoredIgnoreBase: 80,
  sponsoredIgnorePerFloor: 20,
  bossKill: 3000,
  survivalPerSecond: 2,
  comboScoreFactor: 2,
} as const;

export const SHARE_RECHARGE_FLOORS = 2;
