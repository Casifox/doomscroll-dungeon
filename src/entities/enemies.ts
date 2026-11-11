import type {
  EnemyKind,
  EnemyRuntime,
  FillerPost,
  GeneratedEnemy,
  RoomEvent,
  Theme,
} from '../core/types';
import { ENEMY_BASE } from '../core/config';
import { randomBetween } from '../core/rng';

export interface EnemyTemplate {
  name: string;
  handle: string;
  avatar: string;
  text: string;
}

export const ENEMY_TEMPLATES: Record<EnemyKind, EnemyTemplate[]> = {
  ragebait: [
    {
      name: 'Ragebait Certifié',
      handle: '@ratio_royal',
      avatar: '😡',
      text: "Unpopular opinion : les gens qui lisent les CGU méritent ce qui leur arrive. Ratio + tu pues.",
    },
    {
      name: 'Ragebait du Dimanche',
      handle: '@dimanche_haine',
      avatar: '😤',
      text: "Je préfère mon assistant virtuel à mes enfants. Change my mind. (Il ne changera pas d'avis.)",
    },
    {
      name: 'Ragebait Fiscal',
      handle: '@impot_emotionnel',
      avatar: '🤬',
      text: "Les pauvres devraient payer un impôt sur l'air qu'ils respirent. C'est juste de la logique, pas de la méchanceté.",
    },
    {
      name: 'Ragebait Bienveillant',
      handle: '@bienveillance_toxique',
      avatar: '🙄',
      text: "Je dis ça pour t'aider : ton existence est un mauvais take. Prends soin de toi quand même. ❤️",
    },
    {
      name: 'Ragebait Nocturne',
      handle: '@3h_du_matin',
      avatar: '😾',
      text: 'Vous dormez ? Moi je poste. Nous ne sommes pas pareils. Réveillez-vous et ratioez.',
    },
  ],
  sponsored: [
    {
      name: 'Publication Sponsorisée',
      handle: '@matelas_hypnotique',
      avatar: '💼',
      text: "SCANDALE : ce matelas à 1 299 € vous HYPNOTISE pendant votre sommeil. -90 % pendant 43 secondes.",
    },
    {
      name: 'Sponsorisé — Jus de Chargeur',
      handle: '@jus_de_chargeur',
      avatar: '🔋',
      text: "Les influenceurs le cachent : buvez du jus de chargeur pour 300 % d'énergie. Offre limitée. Vraiment.",
    },
    {
      name: 'Sponsorisé — Coach Quantique',
      handle: '@coach_quantique',
      avatar: '📈',
      text: "J'ai gagné 0 € en dormant 4 h. Rejoins ma masterclass à 499 € pour comprendre comment. Placements limités.",
    },
    {
      name: 'Sponsorisé — Parfum Mystère',
      handle: '@parfum_abime',
      avatar: '🧴',
      text: "Le parfum qui sent le wifi gratuit. Clique sur Liker pour tenter ta chance. (C'est une très mauvaise idée.)",
    },
    {
      name: 'Sponsorisé — Crypto Canapé',
      handle: '@crypto_canape',
      avatar: '🪙',
      text: 'Investis dans mon canapé tokenisé. Rendement garanti à 12 000 %. Pas un conseil financier, juste une menace.',
    },
  ],
  troll: [
    {
      name: 'Troll Bas de Plafond',
      handle: '@troll_du_3e',
      avatar: '🤡',
      text: 'JE SUIS DANS TON MUR. Ce commentaire a été supprimé par moi-même. Bonne journée.',
    },
    {
      name: 'Troll en Boucle',
      handle: '@commentaire_2011',
      avatar: '👹',
      text: 'Premier. Premier. Premier. Premier. Premier. Premier. Premier. Premier. Premier. Premier.',
    },
    {
      name: 'Troll Modérateur',
      handle: '@modo_absent',
      avatar: '🫠',
      text: 'Ton commentaire respecte les règles, donc je le supprime immédiatement. Cordialement.',
    },
    {
      name: 'Troll Multitâche',
      handle: '@pas_de_vie',
      avatar: '😈',
      text: 'Je peux bloquer tes commentaires, inverser tes boutons et poster de fausses victoires en même temps. Cest gratuit.',
    },
    {
      name: 'Troll Philosophique',
      handle: '@miroir_noir',
      avatar: '🪞',
      text: "Le vrai monstre, c'est le fil. Et aussi moi. Surtout moi.",
    },
  ],
};

export const FILLER_POSTS: Omit<FillerPost, 'id'>[] = [
  {
    author: "Le fil de l'eau",
    handle: '@calme_absolu',
    avatar: '🐢',
    text: "Rappel : le bouton « ignorer » existe. C'est le seul geste qui répare internet.",
    time: '1 min',
    likes: 8421,
    comments: 12,
  },
  {
    author: 'Gaëlle, 27',
    handle: '@gaelle_du_coin',
    avatar: '🌿',
    text: "J'ai arrêté de scroller pendant 40 secondes. Je me sens comme un moine tibétain.",
    time: '3 min',
    likes: 12400,
    comments: 430,
  },
  {
    author: 'Coach Hustle',
    handle: '@5h_du_matin',
    avatar: '🏋️',
    text: "5 h du matin. Déjà en train de perdre 4 h de sommeil. Suis-moi pour réussir.",
    time: '5 min',
    likes: 231,
    comments: 999,
    tag: 'Motivation',
  },
  {
    author: 'Doom Bot',
    handle: '@bot_doom',
    avatar: '🤖',
    text: "Ce post n'est sponsorisé par personne. Ce que vous voyez est une preuve de concept. Ne cherchez pas plus loin.",
    time: '7 min',
    likes: 6606,
    comments: 66,
  },
  {
    author: 'Ratio Académie',
    handle: '@ratio_academie',
    avatar: '📚',
    text: "Le ratio n'est pas une fin en soi. C'est un mode de vie. Et un donjon. Et une cryptomonnaie.",
    time: '9 min',
    likes: 4040,
    comments: 404,
    tag: 'Savoir',
  },
  {
    author: 'Anonyme',
    handle: '@ancien_scrolleur',
    avatar: '🕯️',
    text: "Vous pouvez fermer l'application. Je l'ai fait une fois. Il y a un ciel dehors. Ne le dites à personne.",
    time: '12 min',
    likes: 88000,
    comments: 3,
  },
  {
    author: 'Maman Ratio',
    handle: '@maman_du_fil',
    avatar: '🥣',
    text: 'As-tu mangé ? As-tu liké ? As-tu pensé à ton algorithme aujourd’hui ?',
    time: '14 min',
    likes: 12001,
    comments: 122,
  },
  {
    author: 'Influence Négative',
    handle: '@influence_neg',
    avatar: '📉',
    text: "Je donne des conseils de productivité depuis six ans. Je n'ai jamais rien produit. Mon taux d'engagement est excellent.",
    time: '18 min',
    likes: 3300,
    comments: 87,
    tag: 'Productivité',
  },
  {
    author: 'Témoin du Scroll',
    handle: '@temoins_du_fil',
    avatar: '👁️',
    text: "Ce post est apparu ici pour une raison. Tu n'as pas besoin de la connaître. Continue.",
    time: '21 min',
    likes: 1312,
    comments: 13,
  },
  {
    author: 'Ancien de 2012',
    handle: '@c_etait_mieux_avant',
    avatar: '🦖',
    text: "J'aimais ce site avant qu'il ne devienne un donjon. Maintenant je suis un ennemi. C'est ironique.",
    time: '25 min',
    likes: 987,
    comments: 2012,
  },
  {
    author: 'Deep Fake Café',
    handle: '@cafe_etrange',
    avatar: '☕',
    text: 'Je crois que mon café me regarde. Il dit que tu vas encore scroller dans 10 minutes.',
    time: '28 min',
    likes: 5600,
    comments: 42,
  },
  {
    author: 'Chronofil Officiel',
    handle: '@chronofil_officiel',
    avatar: '📢',
    text: "Fonctionnalité : le bouton Commentaire vous protège. Le bouton Partager soigne. Le bouton Like tue (littéralement).",
    time: '30 min',
    likes: 1000000,
    comments: 0,
    tag: 'Officiel',
  },
  {
    author: 'Sylvain, 41',
    handle: '@sylvain_du_forum',
    avatar: '🧔',
    text: "Je suis venu pour un tutoriel de jardinage. Je suis dans un donjon. Le basilic est en colère.",
    time: '34 min',
    likes: 740,
    comments: 58,
  },
  {
    author: 'Le Compte Personnel',
    handle: '@toi_dans_10_ans',
    avatar: '🫥',
    text: "Tu as encore ouvert l'application. Je suis déçu, mais pas surpris.",
    time: '42 min',
    likes: 0,
    comments: 1,
  },
  {
    author: 'Pub de la Pub',
    handle: '@meta_publicite',
    avatar: '📺',
    text: 'Cette publicité parle de publicité. Elle est financée par votre attention. Merci de rester jusqu’à la fin.',
    time: '45 min',
    likes: 666,
    comments: 666,
    tag: 'Sponsorisé',
  },
];

export const THEMES: Theme[] = [
  {
    id: 'ratios',
    name: 'Couloir des ratios',
    feedLabel: 'Pour toi (surtout le pire)',
    description: 'Des takes tièdes, des avis tranchants et des gens très sûrs d’eux.',
    accent: '#ff4d8d',
    className: 'theme-pink',
  },
  {
    id: 'notifications',
    name: 'Puits de notifications',
    feedLabel: 'Notifications — 9 999+',
    description: 'Chaque vibration est un cri. Chaque badge rouge est une promesse vide.',
    accent: '#48e5ff',
    className: 'theme-cyan',
  },
  {
    id: 'sponsors',
    name: 'Marché aux sponsors',
    feedLabel: 'Pour toi mais payant',
    description: 'Tout est en promo, surtout ton attention. Cette description est elle-même sponsorisée.',
    accent: '#ffd166',
    className: 'theme-gold',
  },
  {
    id: 'trolls',
    name: 'Cave des trolls',
    feedLabel: 'Commentaires non modérés',
    description: 'Ils sont dans les murs, les commentaires et ton routeur. Ils ont aussi piraté le bouton Commenter.',
    accent: '#b6ff3c',
    className: 'theme-lime',
  },
  {
    id: 'miroirs',
    name: 'Salle des miroirs',
    feedLabel: 'Suggestions pour toi',
    description: 'Tu ressembles de plus en plus à ton avatar. Ton avatar n’a pas l’air d’aller bien.',
    accent: '#b18cff',
    className: 'theme-violet',
  },
  {
    id: 'moulin',
    name: 'Moulin à commentaires',
    feedLabel: 'Débats en cours',
    description: 'Chaque réponse crée deux nouveaux ennemis. Chaque ennemi crée trois nouveaux débats.',
    accent: '#ffa45b',
    className: 'theme-orange',
  },
  {
    id: 'antichambre',
    name: 'Antichambre de L’Algorithme',
    feedLabel: 'Recommandé par LUI',
    description: 'L’odeur du cache chaud et des promesses. Les murs clignotent en 120 Hz.',
    accent: '#ff5c73',
    className: 'theme-red',
  },
  {
    id: 'abime',
    name: 'L’Abîme du scroll',
    feedLabel: 'Chargement infini',
    description: 'Il n’y a pas de fond. Juste une barre de chargement et un doigt qui continue.',
    accent: '#2ee6c5',
    className: 'theme-mint',
  },
];

export const BOSS_THEME: Theme = {
  id: 'noyau',
  name: 'Le Noyau',
  feedLabel: 'CLASSEMENT FINAL',
  description: 'Le cœur du système. Il connaît ton temps d’écran, tes peurs et ton panier moyen.',
  accent: '#ff3d7f',
  className: 'theme-boss',
};

export const ROOM_EVENTS: RoomEvent[] = [
  {
    id: 'ratio_toxique',
    name: 'Ratio toxique',
    icon: '📈',
    description: 'Les ennemis frappent plus fort, mais leur ratio rapporte plus de points.',
    enemyDamageBonus: 2,
    enemySpeedMultiplier: 1,
    telegraphBonus: 0,
    dodgeCooldownMultiplier: 1,
    shareHealBonus: 0,
    scoreMultiplier: 1.1,
  },
  {
    id: 'fibre_optique',
    name: 'Fibre optique',
    icon: '⚡',
    description: 'L’esquive recharge 20 % plus vite. Le scroll est un sport de compétition.',
    enemyDamageBonus: 0,
    enemySpeedMultiplier: 1,
    telegraphBonus: 0,
    dodgeCooldownMultiplier: 0.8,
    shareHealBonus: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'cafe_froid',
    name: 'Café froid',
    icon: '☕',
    description: 'Les partages soignent 6 PV de plus. Le réconfort est tiède, mais il compte.',
    enemyDamageBonus: 0,
    enemySpeedMultiplier: 1,
    telegraphBonus: 0,
    dodgeCooldownMultiplier: 1,
    shareHealBonus: 6,
    scoreMultiplier: 1,
  },
  {
    id: 'mode_avion',
    name: 'Mode avion',
    icon: '✈️',
    description: 'Les attaques mettent 0,25 s de plus à arriver. Profite de l’absence de réseau.',
    enemyDamageBonus: 0,
    enemySpeedMultiplier: 1,
    telegraphBonus: 0.25,
    dodgeCooldownMultiplier: 1,
    shareHealBonus: 0,
    scoreMultiplier: 1,
  },
  {
    id: 'tempete_notifs',
    name: 'Tempête de notifications',
    icon: '🔔',
    description: 'Les ennemis attaquent 12 % plus vite. Les points montent aussi plus vite.',
    enemyDamageBonus: 0,
    enemySpeedMultiplier: 0.88,
    telegraphBonus: 0,
    dodgeCooldownMultiplier: 1,
    shareHealBonus: 0,
    scoreMultiplier: 1.2,
  },
];

export function toRuntimeEnemy(
  enemy: GeneratedEnemy,
  roomEvent: RoomEvent | null,
  index: number,
): EnemyRuntime {
  const damageBonus = roomEvent?.enemyDamageBonus ?? 0;
  const speedMultiplier = roomEvent?.enemySpeedMultiplier ?? 1;
  const telegraphBonus = roomEvent?.telegraphBonus ?? 0;
  return {
    id: enemy.id,
    kind: enemy.kind,
    name: enemy.name,
    handle: enemy.handle,
    avatar: enemy.avatar,
    text: enemy.text,
    hp: enemy.hp,
    maxHp: enemy.hp,
    damage: enemy.damage + damageBonus,
    attackInterval: enemy.attackInterval * speedMultiplier,
    attackTimer: enemy.kind === 'sponsored' ? 99 : 3.4 + index * 0.9,
    telegraph: enemy.telegraph + telegraphBonus,
    telegraphRemaining: 0,
    telegraphTotal: 0,
    alive: true,
    taunting: false,
    tauntTimer: 5.5 + index * 1.1,
    tauntRemaining: 0,
    enrage: 0,
    specialTimer: 6.5 + index * 1.7,
    sponsorFuse: enemy.sponsorFuse,
    sponsorFuseTotal: enemy.sponsorFuse,
    elite: enemy.elite,
    minion: enemy.minion,
  };
}

export const SPAWN_QUIPS = [
  'Une nouvelle notification !',
  'L’algorithme a trouvé un ami pour toi.',
  'Ce contenu pourrait t’intéresser. Ou te mordre.',
  'Tu n’as pas encore tout vu. Continue.',
  'Un post a franchi le pare-feu.',
  'La modération est en pause déjeuner.',
];

/** Compose les PV/dégâts d'un ennemi selon l'étage. */
export function scaledEnemyStats(kind: EnemyKind, floor: number) {
  const base = ENEMY_BASE[kind];
  const hp = Math.round(base.hp + base.hpPerFloor * (floor - 1));
  const damage = Math.round((base.damage + base.damagePerFloor * (floor - 1)) * 10) / 10;
  const interval = Math.max(1.8, base.interval - (floor - 1) * 0.04);
  const telegraph = Math.max(0.75, base.telegraph - (floor - 1) * 0.02);
  return { hp, damage, interval, telegraph };
}

/** Construit un ennemi généré (également utilisé pour les sbires du boss). */
export function makeGeneratedEnemy(
  kind: EnemyKind,
  floor: number,
  index: number,
  template: EnemyTemplate,
  rng: () => number,
  minion = false,
): GeneratedEnemy {
  const s = scaledEnemyStats(kind, floor);
  const elite = !minion && floor >= 5 && rng() < 0.22;
  const eliteMul = elite ? 1.35 : 1;
  const minionMul = minion ? 0.55 : 1;
  return {
    id: `${floor}-${index}-${kind}-${Math.floor(rng() * 9999)}`,
    kind,
    name: `${elite ? '★ ' : ''}${template.name}`,
    handle: template.handle,
    avatar: template.avatar,
    text: template.text,
    hp: Math.max(1, Math.round(s.hp * eliteMul * minionMul)),
    damage: Math.max(2, Math.round((s.damage + (elite ? 2 : 0)) * (minion ? 0.8 : 1))),
    attackInterval: Math.max(1.6, s.interval * (minion ? 1.1 : 1)),
    telegraph: Math.max(0.7, s.telegraph - (minion ? 0.1 : 0) + randomBetween(rng, -0.08, 0.12)),
    sponsorFuse: kind === 'sponsored' ? ENEMY_BASE.sponsored.sponsorFuse + floor : 0,
    elite,
    minion,
  };
}
