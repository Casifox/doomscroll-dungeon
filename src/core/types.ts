/** Types partagés par tout le jeu. */

export type EnemyKind = 'ragebait' | 'sponsored' | 'troll';
export type CombatantKind = EnemyKind | 'boss';

export type UpgradeId =
  | 'super_like'
  | 'shield_premium'
  | 'viral_share'
  | 'algo_fou'
  | 'comment_epique'
  | 'scroll_turbo'
  | 'anti_pub'
  | 'influenceur'
  | 'pouce_fer'
  | 'doigts_acier';

export type UpgradeTag = 'ATK' | 'DEF' | 'UTIL' | 'SCORE';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  tag: UpgradeTag;
  description: string;
  flavor: string;
  /** Applique les effets permanents au moment du choix. */
  applyOneTime?: (run: RunState) => void;
}

export interface ScoreBreakdown {
  kills: number;
  rooms: number;
  combos: number;
  dodges: number;
  boss: number;
  bonuses: number;
  survival: number;
}

export interface RunStats {
  kills: number;
  roomsCleared: number;
  dodges: number;
  damageDealt: number;
  damageAvoided: number;
  maxCombo: number;
  sharesUsed: number;
  sponsoredIgnored: number;
  bossDefeated: boolean;
}

export interface RunState {
  version: number;
  seed: string;
  floor: number;
  mode: 'combat' | 'boss';
  hp: number;
  maxHp: number;
  shares: number;
  maxShares: number;
  upgrades: UpgradeId[];
  score: number;
  breakdown: ScoreBreakdown;
  stats: RunStats;
  elapsed: number;
  startedAt: number;
}

export interface Profile {
  bestScore: number;
  gamesPlayed: number;
  bestFloor: number;
  victories: number;
  tutorialSeen: boolean;
  lastSeed: string;
  totalKills: number;
  totalDodges: number;
}

export interface Settings {
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
}

export interface RoomEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  enemyDamageBonus: number;
  enemySpeedMultiplier: number;
  telegraphBonus: number;
  dodgeCooldownMultiplier: number;
  shareHealBonus: number;
  scoreMultiplier: number;
}

export interface Theme {
  id: string;
  name: string;
  feedLabel: string;
  description: string;
  accent: string;
  className: string;
}

export interface FillerPost {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  comments: number;
  tag?: string;
}

export interface GeneratedEnemy {
  id: string;
  kind: EnemyKind;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  hp: number;
  damage: number;
  attackInterval: number;
  telegraph: number;
  sponsorFuse: number;
  elite: boolean;
  minion: boolean;
}

export interface GeneratedRoom {
  floor: number;
  totalFloors: number;
  isBoss: boolean;
  theme: Theme;
  event: RoomEvent | null;
  enemies: GeneratedEnemy[];
  filler: FillerPost[];
  objective: string;
}

export type EnemyResolution = 'defeated' | 'ignored' | 'exploded' | 'expired' | 'blocked';

export interface EnemyRuntime {
  id: string;
  kind: EnemyKind;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  hp: number;
  maxHp: number;
  damage: number;
  attackInterval: number;
  attackTimer: number;
  telegraph: number;
  telegraphRemaining: number;
  telegraphTotal: number;
  alive: boolean;
  taunting: boolean;
  tauntTimer: number;
  tauntRemaining: number;
  enrage: number;
  specialTimer: number;
  sponsorFuse: number;
  sponsorFuseTotal: number;
  resolution?: EnemyResolution;
  elite: boolean;
  minion: boolean;
}

export type BossPhase = 1 | 2 | 3;
export type BossStatus = 'vulnerable' | 'armored' | 'transition';
export type BossAbility = 'surge' | 'rain' | 'summon' | 'fake_like' | 'glitch' | 'final_upload';

export interface BossRuntime {
  id: 'boss';
  name: string;
  handle: string;
  avatar: string;
  text: string;
  hp: number;
  maxHp: number;
  phase: BossPhase;
  status: BossStatus;
  statusRemaining: number;
  abilityTimer: number;
  ability: BossAbility | null;
  telegraphRemaining: number;
  telegraphTotal: number;
  alive: boolean;
  finalUploadUsed: boolean;
  resolution?: 'defeated';
}

export interface Loadout {
  maxHp: number;
  likeDamage: number;
  attackCooldown: number;
  comboWindow: number;
  shieldDuration: number;
  shieldReduction: number;
  shieldCooldown: number;
  maxShares: number;
  shareHeal: number;
  shareCooldown: number;
  dodgeWindow: number;
  dodgeCooldown: number;
  scoreMultiplier: number;
  comboScoreMultiplier: number;
  sponsoredDamageMultiplier: number;
  ignoreScoreMultiplier: number;
}

export interface ResultsData {
  victory: boolean;
  score: number;
  baseScore: number;
  survivalBonus: number;
  breakdown: ScoreBreakdown;
  stats: RunStats;
  elapsed: number;
  floor: number;
  totalFloors: number;
  seed: string;
  bestScore: number;
  newBest: boolean;
  shareText: string;
}

export interface SavedRun {
  version: number;
  savedAt: number;
  run: RunState;
}

export type ScreenId = 'menu' | 'game' | 'results';

export type SfxName =
  | 'click'
  | 'like'
  | 'combo'
  | 'hurt'
  | 'shield'
  | 'heal'
  | 'ignore'
  | 'explode'
  | 'warning'
  | 'dodge'
  | 'upgrade'
  | 'select'
  | 'victory'
  | 'defeat'
  | 'fake'
  | 'scroll';

export type MusicTrack = 'menu' | 'dungeon' | 'boss' | 'results';
