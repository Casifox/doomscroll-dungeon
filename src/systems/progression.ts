import { BASE_PLAYER } from '../core/config';
import { createRng, shuffle } from '../core/rng';
import type { Loadout, RunState, UpgradeDef, UpgradeId } from '../core/types';

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'super_like',
    name: 'Super Like',
    icon: '♥',
    tag: 'ATK',
    description: '+9 dégâts par like.',
    flavor: 'Le pouce le plus lourd de l’Ouest.',
  },
  {
    id: 'shield_premium',
    name: 'Bouclier Premium',
    icon: '🛡',
    tag: 'DEF',
    description: 'Le bouclier absorbe 87 % des dégâts et recharge plus vite.',
    flavor: 'La modération est incluse dans l’abonnement.',
  },
  {
    id: 'viral_share',
    name: 'Partage Viral',
    icon: '🔁',
    tag: 'UTIL',
    description: '+1 partage maximum et +8 PV par soin.',
    flavor: 'Ton trauma est un contenu très engageant.',
    applyOneTime: (run) => {
      run.maxShares += 1;
      run.shares = Math.min(run.maxShares, run.shares + 1);
    },
  },
  {
    id: 'algo_fou',
    name: 'Algorithme Fou',
    icon: '🌀',
    tag: 'SCORE',
    description: '+20 % sur tous les points gagnés.',
    flavor: 'Tu deviens ce que tu likes.',
  },
  {
    id: 'comment_epique',
    name: 'Commentaire Épique',
    icon: '💬',
    tag: 'DEF',
    description: 'Ton bouclier dure 1,5 s de plus.',
    flavor: 'Un pavé de 500 mots. Mais un pavé utile.',
  },
  {
    id: 'scroll_turbo',
    name: 'Scroll Turbo',
    icon: '💨',
    tag: 'UTIL',
    description: 'Esquive : recharge −35 % et fenêtre +0,2 s.',
    flavor: 'Ton pouce a atteint la vitesse de libération.',
  },
  {
    id: 'anti_pub',
    name: 'Anti-Publicité',
    icon: '🚫',
    tag: 'UTIL',
    description: 'Explosions de pubs −60 % et ignorer rapporte ×2.',
    flavor: 'Le meilleur bloqueur, c’est encore le destin.',
  },
  {
    id: 'influenceur',
    name: 'Influenceur',
    icon: '📣',
    tag: 'SCORE',
    description: 'Les combos rapportent +50 % et durent 0,7 s de plus.',
    flavor: 'Monétise ton attention avant qu’elle ne s’épuise.',
  },
  {
    id: 'pouce_fer',
    name: 'Pouce de Fer',
    icon: '💪',
    tag: 'DEF',
    description: '+25 PV maximum et +25 PV immédiatement.',
    flavor: 'Trois heures de scroll par jour, sans échauffement.',
    applyOneTime: (run) => {
      run.maxHp += 25;
      run.hp = Math.min(run.maxHp, run.hp + 25);
    },
  },
  {
    id: 'doigts_acier',
    name: 'Doigts d’Acier',
    icon: '⚡',
    tag: 'ATK',
    description: 'Likes 18 % plus rapides et +2 dégâts.',
    flavor: 'Le clavier a rendu l’âme. Les doigts, non.',
  },
];

export const ALL_UPGRADE_IDS: UpgradeId[] = UPGRADES.map((upgrade) => upgrade.id);

export function getUpgrade(id: UpgradeId): UpgradeDef {
  const upgrade = UPGRADES.find((item) => item.id === id);
  if (!upgrade) throw new Error(`Amélioration inconnue : ${id}`);
  return upgrade;
}

export function getLoadout(run: RunState): Loadout {
  const has = (id: UpgradeId) => run.upgrades.includes(id);
  return {
    maxHp: run.maxHp,
    likeDamage:
      BASE_PLAYER.likeDamage + (has('super_like') ? 9 : 0) + (has('doigts_acier') ? 2 : 0),
    attackCooldown: BASE_PLAYER.attackCooldown * (has('doigts_acier') ? 0.82 : 1),
    comboWindow: BASE_PLAYER.comboWindow + (has('influenceur') ? 0.7 : 0),
    shieldDuration: BASE_PLAYER.shieldDuration + (has('comment_epique') ? 1.5 : 0),
    shieldReduction: Math.min(0.92, BASE_PLAYER.shieldReduction + (has('shield_premium') ? 0.15 : 0)),
    shieldCooldown: Math.max(4, BASE_PLAYER.shieldCooldown - (has('shield_premium') ? 1.5 : 0)),
    maxShares: run.maxShares,
    shareHeal: BASE_PLAYER.shareHeal + (has('viral_share') ? 8 : 0),
    shareCooldown: BASE_PLAYER.shareCooldown,
    dodgeWindow: BASE_PLAYER.dodgeWindow + (has('scroll_turbo') ? 0.2 : 0),
    dodgeCooldown: Math.max(1.6, BASE_PLAYER.dodgeCooldown * (has('scroll_turbo') ? 0.65 : 1)),
    scoreMultiplier: 1 + (has('algo_fou') ? 0.2 : 0),
    comboScoreMultiplier: has('influenceur') ? 1.5 : 1,
    sponsoredDamageMultiplier: has('anti_pub') ? 0.4 : 1,
    ignoreScoreMultiplier: has('anti_pub') ? 2 : 1,
  };
}

export function generateUpgradeChoices(
  seed: string,
  floor: number,
  owned: readonly UpgradeId[],
): UpgradeId[] {
  const rng = createRng(`${seed}:upgrade:${floor}`);
  const available = UPGRADES.filter((upgrade) => !owned.includes(upgrade.id));
  return shuffle(rng, available)
    .slice(0, 3)
    .map((upgrade) => upgrade.id);
}

export function applyUpgrade(run: RunState, id: UpgradeId): void {
  if (run.upgrades.includes(id)) return;
  const upgrade = getUpgrade(id);
  upgrade.applyOneTime?.(run);
  run.upgrades.push(id);
}
