import { AudioManager } from '../audio/audio-manager';
import { RUN_CONFIG, SCORE, SHARE_RECHARGE_FLOORS } from './config';
import { createDefaultProfile, createRun, formatNumber } from './game-state';
import { createRng, randomSeed, sanitizeSeed } from './rng';
import type {
  BossAbility,
  BossRuntime,
  EnemyRuntime,
  GeneratedRoom,
  Profile,
  RunState,
  Settings,
} from './types';
import {
  addScore,
  applyResultsToProfile,
  createResults,
  recordDodge,
  recordHit,
  recordIgnore,
  recordKill,
  recordRoomClear,
} from '../systems/scoring';
import {
  applyUpgrade,
  generateUpgradeChoices,
  getLoadout,
  getUpgrade,
} from '../systems/progression';
import { computeLikeDamage, resolveIncomingDamage } from '../systems/combat';
import { generateMinion, generateRoom } from '../systems/generation';
import { SPAWN_QUIPS, toRuntimeEnemy } from '../entities/enemies';
import {
  BOSS_ABILITY_INFO,
  bossAbilityDamage,
  bossAbilityDelay,
  bossAbilityTelegraph,
  bossArmorReduction,
  chooseBossAbility,
  createBoss,
  getBossPhase,
} from '../entities/bosses';
import { bindKeyboard } from '../input/keyboard';
import { bindFastScroll } from '../input/scroll';
import { bindFastSwipe } from '../input/touch';
import { SaveStore, saveStore } from '../storage/save';
import { renderMenu } from '../ui/menu';
import {
  GameView,
  type GameViewCallbacks,
  type TargetSnapshot as ViewTargetSnapshot,
  type ThreatSnapshot as ViewThreatSnapshot,
  type HudSnapshot,
} from '../ui/hud';
import { updateEnemyCard } from '../ui/feed';
import { renderResults } from '../ui/results';
import {
  closeAllOverlays,
  isOverlayOpen,
  openBossIntro,
  openConfirm,
  openCredits,
  openPause,
  openRunSetup,
  openSettings,
  openTutorial,
  openUpgrade,
} from '../ui/overlays';
import { showToast } from '../ui/toast';
import {
  burstAt,
  confetti,
  flashDamage,
  glitchScreen,
  popElement,
  shakeScreen,
  spawnFloat,
} from '../ui/fx';
import { prefersReducedMotion } from '../ui/dom';

type Screen = 'menu' | 'game' | 'results';
type FakeLike = { id: string; remaining: number };
type DebuffType = 'comments' | 'shuffle';
type Debuff = { type: DebuffType; remaining: number; source: 'troll' | 'boss' };

const TOTAL_FLOORS = RUN_CONFIG.totalFloors;

export class GameController {
  private readonly root: HTMLElement;
  private readonly store: SaveStore;
  private readonly audio: AudioManager;
  private readonly cleanupKeyboard: () => void;
  private profile: Profile;
  private settings: Settings;
  private screen: Screen = 'menu';
  private run: RunState | null = null;
  private room: GeneratedRoom | null = null;
  private enemies: EnemyRuntime[] = [];
  private boss: BossRuntime | null = null;
  private targetId: string | null = null;
  private view: GameView | null = null;
  private cleanupInputs: Array<() => void> = [];
  private rafId: number | null = null;
  private lastFrame = 0;
  private ending = false;
  private finished = false;
  private clearHandled = false;
  private roomCleared = false;
  private combo = 0;
  private comboTimer = 0;
  private shieldRemaining = 0;
  private shieldCooldownRemaining = 0;
  private likeCooldown = 0;
  private dodgeRemaining = 0;
  private dodgeCooldown = 0;
  private shareCooldown = 0;
  private debuff: Debuff | null = null;
  private nextTrollDebuff: DebuffType = 'comments';
  private fakeLikes: FakeLike[] = [];
  private combatRng: () => number = Math.random;
  private minionCounter = 0;
  private lastBossAbility: BossAbility | null = null;
  private lastHintKey = '';
  private initialSeedFromUrl = '';
  private storageWarningShown = false;
  private pendingFinishTimer: number | null = null;
  private victoryPending = false;

  constructor(root: HTMLElement, store: SaveStore = saveStore) {
    this.root = root;
    this.store = store;
    this.profile = store.loadProfile();
    this.settings = store.loadSettings();
    this.applyMotionPreference();

    try {
      const seedParam = new URLSearchParams(window.location.search).get('seed');
      this.initialSeedFromUrl = seedParam ? sanitizeSeed(seedParam) : '';
    } catch {
      this.initialSeedFromUrl = '';
    }

    this.audio = new AudioManager(this.settings);
    this.audio.setTrack('menu');

    this.cleanupKeyboard = bindKeyboard({
      onLike: () => this.actionLike(),
      onComment: () => this.actionComment(),
      onShare: () => this.actionShare(),
      onIgnore: () => this.actionIgnore(),
      onDodge: () => this.actionDodge(),
      onPause: () => this.openPauseOverlay(),
      isBlocked: () => this.inputBlocked(),
    });

    const unlock = () => this.audio.unlock();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.showMenu();
  }

  /* ------------------------------------------------------------------ */
  /* Navigation et cycle de vie                                         */
  /* ------------------------------------------------------------------ */

  showMenu(): void {
    this.screen = 'menu';
    this.stopLoop();
    this.clearPendingFinish();
    this.ending = false;
    this.finished = false;
    this.run = null;
    this.room = null;
    this.enemies = [];
    this.boss = null;
    this.targetId = null;
    this.view?.destroy();
    this.view = null;
    this.cleanupInputs.forEach((cleanup) => cleanup());
    this.cleanupInputs = [];
    this.audio.duck(false);
    this.audio.setTrack('menu');
    closeAllOverlays();
    this.applyScreenMood('menu');

    const saved = this.store.loadRun();
    renderMenu(this.root, this.profile, saved, {
      onNew: () => this.openNewRunSetup(),
      onContinue: () => this.continueSavedRun(),
      onTutorial: () => {
        this.openTutorialOverlay(() => this.markTutorialSeen());
      },
      onSettings: () => this.openSettingsOverlay(),
      onCredits: () => openCredits(this.profile),
    });

    if (!this.store.persistent && !this.storageWarningShown) {
      this.storageWarningShown = true;
      window.setTimeout(() => {
        showToast(
          'Stockage local indisponible : la partie restera en mémoire jusqu’à la fermeture.',
          'danger',
          '⚠️',
          4600,
        );
      }, 500);
    }
  }

  private openNewRunSetup(): void {
    const saved = this.store.loadRun();
    openRunSetup({
      initialSeed: this.initialSeedFromUrl,
      savedRunFloor: saved ? saved.run.floor : null,
      onLaunch: (seed) => this.startNewRun(seed),
    });
  }

  private continueSavedRun(): void {
    const saved = this.store.loadRun();
    if (!saved) {
      showToast('Aucune sauvegarde valide. Lance une nouvelle descente.', 'danger', '💾');
      return;
    }
    closeAllOverlays();
    this.beginRun(saved.run, true);
  }

  private startNewRun(seedInput: string): void {
    const seed = sanitizeSeed(seedInput) || randomSeed();
    const run = createRun(seed);
    this.profile.lastSeed = seed;
    this.store.saveProfile(this.profile);
    this.initialSeedFromUrl = '';
    this.setUrlSeed(seed);
    closeAllOverlays();

    if (!this.profile.tutorialSeen) {
      this.openTutorialOverlay(() => {
        this.markTutorialSeen();
        this.beginRun(run, false);
      }, 'Commencer la descente');
      return;
    }
    this.beginRun(run, false);
  }

  private beginRun(run: RunState, fromSave: boolean): void {
    this.clearPendingFinish();
    this.finished = false;
    this.ending = false;
    this.screen = 'game';
    this.applyScreenMood('game');
    this.run = run;
    this.room = null;
    this.enemies = [];
    this.boss = null;
    this.targetId = null;
    this.roomCleared = false;
    this.clearHandled = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.shieldRemaining = 0;
    this.shieldCooldownRemaining = 0;
    this.likeCooldown = 0;
    this.dodgeRemaining = 0;
    this.dodgeCooldown = 0;
    this.shareCooldown = 0;
    this.debuff = null;
    this.fakeLikes = [];
    this.lastHintKey = '';
    this.minionCounter = 0;

    this.createGameView();
    this.startLoop();
    this.enterFloor(run.floor, { fromSave, announce: !fromSave });
  }

  private createGameView(): void {
    this.cleanupInputs.forEach((cleanup) => cleanup());
    this.cleanupInputs = [];
    this.view?.destroy();

    const callbacks: GameViewCallbacks = {
      onLike: () => this.actionLike(),
      onComment: () => this.actionComment(),
      onShare: () => this.actionShare(),
      onIgnore: () => this.actionIgnore(),
      onDodge: () => this.actionDodge(),
      onPause: () => this.openPauseOverlay(),
      onTutorial: () => this.openHelpTutorial(),
    };
    const view = new GameView(callbacks);
    this.view = view;
    view.mount(this.root);
    view.advanceButton.addEventListener('click', () => this.advance());
    this.cleanupInputs.push(
      bindFastScroll(view.feedScroll, {
        isBlocked: () => this.inputBlocked(),
        onFastScroll: () => this.actionDodge(),
      }),
      bindFastSwipe(view.feedScroll, {
        isBlocked: () => this.inputBlocked(),
        onFastSwipe: () => this.actionDodge(),
      }),
    );
  }

  /**
   * Charge un étage. Le point de reprise est enregistré ici, au début de
   * chaque étage : une fermeture accidentelle ne fait perdre que l'étage courant.
   */
  private enterFloor(floor: number, options: { fromSave: boolean; announce: boolean }): void {
    if (!this.run || !this.view) return;
    this.roomCleared = false;
    this.clearHandled = false;
    this.ending = false;
    this.finished = false;
    this.victoryPending = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.shieldRemaining = 0;
    this.shieldCooldownRemaining = 0;
    this.likeCooldown = 0;
    this.dodgeRemaining = 0;
    this.dodgeCooldown = 0;
    this.shareCooldown = 0;
    this.debuff = null;
    this.fakeLikes = [];
    this.lastHintKey = '';
    this.lastBossAbility = null;

    const room = generateRoom(this.run.seed, floor);
    this.room = room;
    this.run.floor = floor;
    this.run.mode = room.isBoss ? 'boss' : 'combat';
    this.combatRng = createRng(`${this.run.seed}:combat:${floor}:${this.run.stats.kills}`);
    this.enemies = room.enemies.map((enemy, index) => toRuntimeEnemy(enemy, room.event, index));
    this.boss = room.isBoss ? createBoss() : null;
    this.targetId = this.boss ? this.boss.id : this.pickPreferredTarget();
    this.minionCounter = 0;
    this.view.hideFakeLikes();
    this.view.setRunStatic(this.run);
    this.view.mountFeed(room, this.boss, {
      onSelectEnemy: (id) => this.selectTarget(id),
      onAdvance: () => this.advance(),
    });
    this.view.updateExitProgress(this.enemies.length);
    this.updateView();
    this.store.saveRun(this.run);
    if (!this.store.persistent) this.warnStorageOnce();

    this.audio.setTrack(room.isBoss ? 'boss' : 'dungeon');
    this.audio.playSfx('scroll', { volume: 0.5 });

    if (options.announce) {
      showToast(
        room.isBoss
          ? 'ÉTAGE 9 — LE NOYAU. L’Algorithme t’attend.'
          : `Étage ${floor} — ${room.theme.name}`,
        room.isBoss ? 'danger' : 'lore',
        room.isBoss ? '🧠' : '↓',
        2800,
      );
    } else if (options.fromSave) {
      showToast(`Reprise à l’étage ${floor}. La sauvegarde date de l’entrée dans l’étage.`, 'info', '💾', 3800);
    }

    if (room.isBoss && !options.fromSave) {
      this.showBossIntro();
    }
  }

  private showBossIntro(): void {
    this.audio.setTrack('boss');
    openBossIntro({
      onFight: () => {
        this.lastFrame = performance.now();
        this.updateView();
      },
    });
  }

  private advance(): void {
    if (!this.canAct() || !this.run || !this.room || !this.roomCleared || this.victoryPending) {
      return;
    }
    if (this.room.isBoss) return;

    const floor = this.run.floor;
    this.view?.hideAdvance();
    if (RUN_CONFIG.upgradeFloors.includes(floor)) {
      this.presentUpgrades(floor);
      return;
    }
    this.enterFloor(floor + 1, { fromSave: false, announce: true });
  }

  private presentUpgrades(floor: number): void {
    if (!this.run) return;
    this.audio.playSfx('upgrade');
    const choices = generateUpgradeChoices(this.run.seed, floor, this.run.upgrades);
    openUpgrade({
      choices,
      floor,
      onChoose: (id) => {
        if (!this.run) return;
        applyUpgrade(this.run, id);
        const upgrade = getUpgrade(id);
        this.audio.playSfx('select');
        showToast(`${upgrade.icon} ${upgrade.name} — ${upgrade.description}`, 'success', undefined, 4200);
        this.view?.setRunStatic(this.run);
        const nextFloor = floor + 1;
        if (nextFloor > TOTAL_FLOORS) {
          this.finishRun(true);
        } else {
          this.enterFloor(nextFloor, { fromSave: false, announce: true });
        }
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boucle de jeu                                                      */
  /* ------------------------------------------------------------------ */

  private startLoop(): void {
    if (this.rafId !== null) return;
    this.lastFrame = performance.now();
    const frame = (now: number) => {
      this.rafId = window.requestAnimationFrame(frame);
      if (this.screen !== 'game' || !this.run || this.ending || this.finished) {
        this.lastFrame = now;
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      if (isOverlayOpen()) return;
      this.tick(dt);
    };
    this.rafId = window.requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(dt: number): void {
    if (!this.run || !this.room || this.ending) return;

    if (!this.roomCleared) {
      this.run.elapsed += dt;
    }

    this.likeCooldown = Math.max(0, this.likeCooldown - dt);
    this.shareCooldown = Math.max(0, this.shareCooldown - dt);
    this.shieldCooldownRemaining = Math.max(0, this.shieldCooldownRemaining - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.shieldRemaining = Math.max(0, this.shieldRemaining - dt);
    this.dodgeRemaining = Math.max(0, this.dodgeRemaining - dt);
    if (this.combo > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
    this.tickDebuff(dt);

    if (!this.roomCleared) {
      this.tickEnemies(dt);
      if (!this.ending) this.tickBoss(dt);
      if (!this.ending) this.tickFakeLikes(dt);
    }

    if (this.ending) return;

    this.ensureTarget();
    this.updateEnemyViews();
    this.updateView();
  }

  private tickEnemies(dt: number): void {
    if (!this.run) return;
    const bossCasting = Boolean(this.boss?.ability && this.boss.telegraphRemaining > 0);
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) continue;

      if (enemy.kind === 'sponsored') {
        enemy.sponsorFuse = Math.max(0, enemy.sponsorFuse - dt);
        if (enemy.sponsorFuse <= 0) {
          this.detonateSponsored(enemy, 'expired');
          if (this.ending) return;
        }
        continue;
      }

      if (enemy.kind === 'troll') {
        enemy.specialTimer -= dt;
        if (enemy.specialTimer <= 0 && !this.debuff) {
          this.triggerTrollDebuff();
          enemy.specialTimer = 9.5;
        }
      }

      if (enemy.kind === 'ragebait') {
        if (enemy.taunting) {
          enemy.tauntRemaining = Math.max(0, enemy.tauntRemaining - dt);
          if (enemy.tauntRemaining <= 0) {
            enemy.taunting = false;
          }
        } else if (!enemy.telegraphRemaining && enemy.attackTimer > 1.1) {
          enemy.tauntTimer -= dt;
          if (enemy.tauntTimer <= 0) {
            enemy.taunting = true;
            enemy.tauntRemaining = 1.9;
            enemy.tauntTimer = 6.2;
          }
        }
      }

      if (enemy.telegraphRemaining > 0) {
        enemy.telegraphRemaining = Math.max(0, enemy.telegraphRemaining - dt);
        if (enemy.telegraphRemaining <= 0) {
          enemy.telegraphTotal = 0;
          this.resolveEnemyAttack(enemy);
          if (this.ending) return;
          enemy.attackTimer = enemy.attackInterval * (0.92 + this.combatRng() * 0.22);
        }
        continue;
      }

      if (enemy.taunting) continue;
      if (bossCasting && enemy.minion) continue;

      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        this.startEnemyAttack(enemy);
      }
    }
  }

  private startEnemyAttack(enemy: EnemyRuntime): void {
    const duration = Math.max(0.7, enemy.telegraph);
    enemy.telegraphTotal = duration;
    enemy.telegraphRemaining = duration;
    this.audio.playSfx('warning', { volume: 0.7 });
    this.updateView();
  }

  private resolveEnemyAttack(enemy: EnemyRuntime): void {
    if (!enemy.alive || !this.run || this.ending) return;
    const raw = enemy.damage + enemy.enrage * 2;
    this.applyPlayerDamage(raw, { allowDodge: true, source: enemy.name });
  }

  private tickBoss(dt: number): void {
    const boss = this.boss;
    if (!boss || !boss.alive || !this.run || this.roomCleared) return;

    if (boss.status === 'transition') {
      boss.statusRemaining = Math.max(0, boss.statusRemaining - dt);
      if (boss.statusRemaining <= 0) {
        boss.status = 'vulnerable';
        boss.statusRemaining = boss.phase === 3 ? 4.2 : 5;
        boss.abilityTimer = Math.max(1.2, boss.abilityTimer);
        this.audio.playSfx('shield', { volume: 0.5 });
      }
      return;
    }

    boss.statusRemaining -= dt;
    if (boss.statusRemaining <= 0) {
      if (boss.status === 'vulnerable') {
        boss.status = 'armored';
        boss.statusRemaining = boss.phase === 3 ? 2.2 : 3.1;
      } else {
        boss.status = 'vulnerable';
        boss.statusRemaining = boss.phase === 3 ? 4.4 : 5.4;
        this.audio.playSfx('select', { volume: 0.4 });
      }
    }

    if (boss.ability) {
      boss.telegraphRemaining = Math.max(0, boss.telegraphRemaining - dt);
      if (boss.telegraphRemaining <= 0) {
        const ability = boss.ability;
        boss.ability = null;
        boss.telegraphRemaining = 0;
        boss.telegraphTotal = 0;
        this.resolveBossAbility(ability);
        if (!this.ending && boss.alive) {
          boss.abilityTimer = bossAbilityDelay(boss.phase, this.combatRng);
        }
      }
      return;
    }

    boss.abilityTimer -= dt;
    if (boss.abilityTimer > 0) return;

    const aliveMinions = this.enemies.filter((enemy) => enemy.alive && enemy.minion).length;
    const chosen = chooseBossAbility(boss.phase, this.combatRng, {
      finalReady:
        boss.phase === 3 && boss.hp / boss.maxHp <= 0.18 && !boss.finalUploadUsed,
      canSummon: aliveMinions < 2,
      debuffActive: this.debuff !== null,
      previous: this.lastBossAbility,
    });
    this.lastBossAbility = chosen;
    const duration = bossAbilityTelegraph(chosen);
    boss.ability = chosen;
    boss.telegraphTotal = duration;
    boss.telegraphRemaining = duration;
    this.audio.playSfx('warning');
    if (chosen === 'final_upload') {
      glitchScreen(this.view?.element ?? this.root, 650, this.reducedMotion());
      showToast('UPLOAD FINAL — esquive ou bouclier, maintenant !', 'danger', '💾', 3000);
    }
    this.updateView();
  }

  private resolveBossAbility(ability: BossAbility): void {
    if (!this.run || !this.boss || this.ending) return;
    const boss = this.boss;
    if (ability === 'summon') {
      this.spawnBossMinions(boss.phase === 1 ? 1 : 2);
      return;
    }
    if (ability === 'fake_like') {
      this.spawnFakeLikes(boss.phase === 3 ? 3 : 2);
      return;
    }
    if (ability === 'glitch') {
      this.applyDebuff('shuffle', 'boss', 4.2);
      this.audio.playSfx('fake');
      showToast('L’Algorithme mélange les boutons. Les raccourcis clavier restent stables.', 'danger', '🧩');
      return;
    }

    if (ability === 'final_upload') {
      boss.finalUploadUsed = true;
    }
    const raw = bossAbilityDamage(ability, boss.phase);
    this.applyPlayerDamage(raw, { allowDodge: true, source: BOSS_ABILITY_INFO[ability].title });
    if (!this.ending) {
      this.lastBossAbility = ability;
    }
  }

  private spawnBossMinions(count: number): void {
    if (!this.run || !this.boss) return;
    const aliveMinions = this.enemies.filter((enemy) => enemy.alive && enemy.minion).length;
    const available = Math.max(0, 2 - aliveMinions);
    const actual = Math.min(count, available);
    for (let i = 0; i < actual; i++) {
      const kind = this.combatRng() < 0.6 ? 'ragebait' : 'sponsored';
      const generated = generateMinion(this.run.seed, kind, this.minionCounter++);
      const enemy = toRuntimeEnemy(generated, null, this.enemies.length);
      enemy.attackTimer = 2.8 + i * 0.8;
      this.enemies.push(enemy);
      this.view?.addMinion(enemy);
    }
    if (actual > 0) {
      this.audio.playSfx('select');
      const quip = SPAWN_QUIPS[Math.floor(this.combatRng() * SPAWN_QUIPS.length)] ?? 'Un post apparaît.';
      showToast(quip, 'lore', '👥', 2600);
    }
  }

  private spawnFakeLikes(count: number): void {
    if (!this.view) return;
    if (this.fakeLikes.length > 0) {
      this.clearFakeLikes(false);
    }
    this.view.showFakeLikes();
    for (let i = 0; i < count; i++) {
      const x = 20 + this.combatRng() * 58;
      const y = 28 + this.combatRng() * 44;
      const id = this.view.spawnFakeLike(x, y, () => this.handleFakeLikeClicked(id));
      this.fakeLikes.push({ id, remaining: 7.5 });
    }
    showToast('Faux likes détectés. Si c’est trop beau, c’est piégé.', 'danger', '💎', 3000);
  }

  private handleFakeLikeClicked(id: string): void {
    if (!this.canAct()) return;
    const index = this.fakeLikes.findIndex((fake) => fake.id === id);
    if (index < 0) return;
    this.fakeLikes.splice(index, 1);
    this.view?.removeFakeLike(id);
    this.audio.playSfx('fake');
    showToast('Ce like était faux. Il t’a mordu.', 'danger', '💎', 2200);
    this.applyPlayerDamage(7, { allowDodge: false, source: 'Faux like' });
    if (this.fakeLikes.length === 0) this.view?.hideFakeLikes();
    this.updateView();
  }

  private tickFakeLikes(dt: number): void {
    if (this.fakeLikes.length === 0) return;
    for (let i = this.fakeLikes.length - 1; i >= 0; i--) {
      const fake = this.fakeLikes[i];
      if (!fake) continue;
      fake.remaining -= dt;
      if (fake.remaining <= 0) {
        this.fakeLikes.splice(i, 1);
        this.view?.removeFakeLike(fake.id);
        if (this.run) {
          const points = addScore(this.run, 'bonuses', 35, this.scoreMultiplier());
          if (points > 0) {
            showToast(`Faux like évité. +${formatNumber(points)} pts.`, 'success', '✓', 1800);
          }
        }
      }
    }
    if (this.fakeLikes.length === 0) this.view?.hideFakeLikes();
  }

  private clearFakeLikes(award: boolean): void {
    for (const fake of this.fakeLikes) {
      this.view?.removeFakeLike(fake.id);
      if (award && this.run) {
        addScore(this.run, 'bonuses', 20, this.scoreMultiplier());
      }
    }
    this.fakeLikes = [];
    this.view?.hideFakeLikes();
  }

  private tickDebuff(dt: number): void {
    if (!this.debuff) return;
    this.debuff.remaining -= dt;
    if (this.debuff.remaining <= 0) {
      const wasComments = this.debuff.type === 'comments';
      this.debuff = null;
      showToast(
        wasComments ? 'Commentaires réactivés. Le troll est parti bouder.' : 'Interface restaurée.',
        'info',
        wasComments ? '💬' : '✓',
        1800,
      );
    }
  }

  private triggerTrollDebuff(): void {
    if (this.debuff) return;
    const type = this.nextTrollDebuff;
    this.nextTrollDebuff = type === 'comments' ? 'shuffle' : 'comments';
    this.applyDebuff(type, 'troll', type === 'comments' ? 3.8 : 4.4);
    this.audio.playSfx('fake');
    if (type === 'comments') {
      showToast('Un troll a désactivé les commentaires. Esquive ou encaisse.', 'danger', '💬', 3000);
    } else {
      showToast('Interface piratée : les boutons changent de place !', 'danger', '🧩', 3000);
      glitchScreen(this.view?.element ?? this.root, 500, this.reducedMotion());
    }
  }

  private applyDebuff(type: DebuffType, source: 'troll' | 'boss', remaining: number): void {
    this.debuff = { type, remaining, source };
    this.updateView();
  }

  private clearDebuffIfFrom(source: 'troll' | 'boss'): void {
    if (this.debuff?.source === source) {
      this.debuff = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Attaques et actions du joueur                                      */
  /* ------------------------------------------------------------------ */

  private actionLike(): void {
    if (!this.canAct() || !this.run || !this.room || this.roomCleared || !this.view) return;
    if (this.likeCooldown > 0) return;
    const loadout = getLoadout(this.run);
    this.likeCooldown = loadout.attackCooldown;
    popElement(this.view.likeButton, 'is-attacking');
    this.audio.unlock();

    const target = this.getTargetCombatant();
    if (!target) {
      this.audio.playSfx('click');
      showToast('Aucune cible. Scrolle dans le fil ou touche un post hostile.', 'info', '◎', 2200);
      return;
    }

    const isBossTarget = Boolean(this.boss && target.id === 'boss');
    const enemyTarget = isBossTarget ? null : (target as EnemyRuntime);
    const refs = isBossTarget
      ? this.view.getFeedRefs()?.bossNode
      : this.view.getFeedRefs()?.enemyNodes.get(target.id);

    if (enemyTarget?.kind === 'sponsored') {
      this.audio.playSfx('like', { pitch: this.combo });
      this.detonateSponsored(enemyTarget, 'like');
      return;
    }

    if (isBossTarget && this.boss) {
      if (this.boss.status === 'transition') {
        this.audio.playSfx('fake', { volume: 0.5 });
        if (refs) spawnFloat(refs.card, 'MUTATION', 'muted', this.reducedMotion());
        this.updateView();
        return;
      }
    }

    const isTaunt = Boolean(enemyTarget && enemyTarget.kind === 'ragebait' && enemyTarget.taunting);
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = loadout.comboWindow;
    this.run.stats.maxCombo = Math.max(this.run.stats.maxCombo, this.combo);
    const reduction =
      isBossTarget && this.boss && this.boss.status === 'armored'
        ? 1 - bossArmorReduction(this.boss.phase)
        : 0;
    const result = computeLikeDamage(loadout, this.combo, {
      taunting: isTaunt,
      reduction,
    });
    target.hp = Math.max(0, target.hp - result.damage);
    this.run.stats.damageDealt += result.damage;
    const scoreGain = recordHit(
      this.run,
      this.combo,
      this.scoreMultiplier(),
      loadout.comboScoreMultiplier,
    );

    this.audio.playSfx('like', { pitch: this.combo });
    if (this.combo > 1 && this.combo % 5 === 0) {
      this.audio.playSfx('combo', { pitch: this.combo });
    }
    if (refs) {
      popElement(refs.card, 'is-hit');
      burstAt(refs.card, ['♥', '⚡', '✦'], this.combo >= 5 ? 9 : 5, this.reducedMotion());
      spawnFloat(refs.card, `-${result.damage}`, 'damage', this.reducedMotion());
      if (scoreGain > 0) {
        spawnFloat(refs.card, `+${formatNumber(scoreGain)}`, 'score', this.reducedMotion());
      }
      if (reduction > 0.5) {
        spawnFloat(refs.card, 'PAREFEU', 'muted', this.reducedMotion());
      }
    }

    if (isTaunt && enemyTarget) {
      if (enemyTarget.enrage < 3) {
        enemyTarget.enrage += 1;
        enemyTarget.damage += 2;
        enemyTarget.attackInterval = Math.max(1.4, enemyTarget.attackInterval * 0.9);
      }
      if (enemyTarget.enrage === 1) {
        showToast('Tu as liké pendant la provocation. Le Ragebait s’enrage !', 'danger', '😡', 3000);
      }
      this.combo = 0;
      this.comboTimer = 0;
    }

    if (target.hp <= 0) {
      if (isBossTarget) {
        this.killBoss();
      } else if (enemyTarget) {
        this.killEnemy(enemyTarget);
      }
    } else if (isBossTarget) {
      this.checkBossPhase();
    }

    this.refreshTargetAfterAction();
    this.updateView();
  }

  private actionComment(): void {
    if (!this.canAct() || !this.run) return;
    if (this.debuff?.type === 'comments') {
      this.audio.playSfx('fake');
      showToast('Commentaires désactivés par un troll. Esquive à la place.', 'danger', '💬', 2200);
      return;
    }
    const loadout = getLoadout(this.run);
    if (this.shieldRemaining > 0) {
      showToast('Ton bouclier est déjà actif.', 'info', '🛡', 1500);
      return;
    }
    if (this.shieldCooldownRemaining > 0) {
      showToast(
        `Bouclier en recharge : ${this.shieldCooldownRemaining.toFixed(1)} s.`,
        'info',
        '🛡',
        1600,
      );
      return;
    }
    this.shieldRemaining = loadout.shieldDuration;
    this.shieldCooldownRemaining = loadout.shieldCooldown;
    this.audio.playSfx('shield');
    popElement(this.commentButtonSafe(), 'is-activating');
    showToast('Bouclier de commentaires activé.', 'success', '🛡', 1600);
    this.updateView();
  }

  private actionShare(): void {
    if (!this.canAct() || !this.run) return;
    if (this.shareCooldown > 0) return;
    if (this.run.shares <= 0) {
      this.audio.playSfx('click');
      showToast('Plus de partages. Le viral ne se recycle pas.', 'danger', '🔁', 2200);
      return;
    }
    if (this.run.hp >= this.run.maxHp) {
      showToast('Tu es déjà à fond. Garde ce partage pour plus tard.', 'info', '❤️', 2000);
      return;
    }
    const loadout = getLoadout(this.run);
    const heal = loadout.shareHeal + (this.room?.event?.shareHealBonus ?? 0);
    const before = this.run.hp;
    this.run.hp = Math.min(this.run.maxHp, this.run.hp + heal);
    const healed = Math.round(this.run.hp - before);
    this.run.shares -= 1;
    this.run.stats.sharesUsed += 1;
    this.shareCooldown = loadout.shareCooldown;
    this.audio.playSfx('heal');
    const anchor = this.view?.element.querySelector<HTMLElement>('.action-dock');
    if (anchor) {
      spawnFloat(anchor, `+${healed} PV`, 'heal', this.reducedMotion());
      burstAt(anchor, ['💚', '♥', '✚'], 6, this.reducedMotion());
    }
    showToast(`Partage viral : +${healed} PV.`, 'success', '🔁', 1500);
    this.updateView();
  }

  private actionIgnore(): void {
    if (!this.canAct() || !this.run || !this.room) return;
    const target = this.getTargetCombatant();
    if (!target || target.id === 'boss' || (target as EnemyRuntime).kind !== 'sponsored') {
      this.audio.playSfx('click');
      showToast('Rien à ignorer ici. Vise une pub sponsorisée (badge « SPONSORISÉ »).', 'info', '🙈', 2600);
      return;
    }
    this.detonateSponsored(target as EnemyRuntime, 'ignored');
  }

  private actionDodge(): void {
    if (!this.canAct() || !this.run || !this.room) return;
    if (this.dodgeCooldown > 0) return;
    const loadout = getLoadout(this.run);
    this.dodgeRemaining = loadout.dodgeWindow;
    const cooldownMultiplier = this.room.event?.dodgeCooldownMultiplier ?? 1;
    this.dodgeCooldown = loadout.dodgeCooldown * cooldownMultiplier;
    this.audio.playSfx('dodge');
    if (this.view) {
      popElement(this.view.element, 'is-dodging');
      const anchor = this.view.element.querySelector<HTMLElement>('.action-dock');
      if (anchor) spawnFloat(anchor, 'ESQUIVE', 'shield', this.reducedMotion());
    }
    this.updateView();
  }

  private detonateSponsored(target: EnemyRuntime, via: 'like' | 'expired' | 'ignored'): void {
    if (!this.run || !target.alive) return;
    target.alive = false;
    target.telegraphRemaining = 0;
    target.telegraphTotal = 0;
    if (via === 'ignored') {
      target.resolution = 'ignored';
      const points = recordIgnore(
        this.run,
        this.run.floor,
        this.scoreMultiplier() * getLoadout(this.run).ignoreScoreMultiplier,
      );
      this.audio.playSfx('ignore');
      const refs = this.view?.getFeedRefs()?.enemyNodes.get(target.id);
      if (refs) {
        burstAt(refs.card, ['🙈', '✓', '🚫'], 7, this.reducedMotion());
        spawnFloat(refs.card, `+${formatNumber(points)}`, 'score', this.reducedMotion());
      }
      showToast('Publication ignorée sans explosion. Ton attention est sauve.', 'success', '🙈', 2400);
    } else {
      target.resolution = via === 'like' ? 'exploded' : 'expired';
      this.run.stats.kills += 1;
      this.audio.playSfx('explode');
      const refs = this.view?.getFeedRefs()?.enemyNodes.get(target.id);
      if (refs) {
        burstAt(refs.card, ['💥', '🧨', '🔥'], 11, this.reducedMotion());
      }
      flashDamage(this.view?.element ?? this.root, this.reducedMotion());
      shakeScreen(this.view?.element ?? this.root, true, this.reducedMotion());
      showToast('La pub a explosé. Il fallait l’ignorer.', 'danger', '🧨', 2400);
      const loadout = getLoadout(this.run);
      const raw = target.damage * loadout.sponsoredDamageMultiplier;
      this.applyPlayerDamage(raw, { allowDodge: true, source: 'Publication sponsorisée' });
      if (this.ending) return;
    }
    this.refreshTargetAfterAction();
    this.checkRoomClear();
    this.updateView();
  }

  private killEnemy(enemy: EnemyRuntime): void {
    if (!this.run || !this.room || !enemy.alive) return;
    enemy.alive = false;
    enemy.telegraphRemaining = 0;
    enemy.telegraphTotal = 0;
    enemy.taunting = false;
    enemy.resolution = 'defeated';
    const points = recordKill(this.run, this.room.floor, enemy.elite, this.scoreMultiplier());
    this.audio.playSfx('combo', { pitch: Math.min(8, this.combo) });
    const refs = this.view?.getFeedRefs()?.enemyNodes.get(enemy.id);
    if (refs) {
      burstAt(refs.card, ['💀', '✦', '⚡'], 10, this.reducedMotion());
      spawnFloat(refs.card, `+${formatNumber(points)}`, 'score', this.reducedMotion());
    }
    if (enemy.kind === 'troll') {
      const anotherTroll = this.enemies.some((other) => other.alive && other.kind === 'troll');
      if (!anotherTroll) this.clearDebuffIfFrom('troll');
    }
    this.refreshTargetAfterAction();
    this.checkRoomClear();
    this.updateView();
  }

  private killBoss(): void {
    if (!this.boss || !this.run) return;
    this.boss.hp = 0;
    this.boss.alive = false;
    this.boss.resolution = 'defeated';
    this.boss.ability = null;
    this.boss.telegraphRemaining = 0;
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        enemy.alive = false;
        enemy.resolution = 'blocked';
      }
    }
    this.clearFakeLikes(false);
    this.clearDebuffIfFrom('boss');
    const refs = this.view?.getFeedRefs()?.bossNode;
    if (refs) {
      burstAt(refs.card, ['💥', '💀', '🧠', '✦', '📵'], 22, this.reducedMotion());
      spawnFloat(refs.card, 'HORS LIGNE', 'shield', this.reducedMotion());
    }
    this.audio.playSfx('explode');
    this.updateEnemyViews();
    this.checkRoomClear();
    this.updateView();
  }

  private checkBossPhase(): void {
    const boss = this.boss;
    if (!boss || !boss.alive) return;
    const nextPhase = getBossPhase(boss.hp, boss.maxHp);
    if (nextPhase <= boss.phase) return;
    boss.phase = nextPhase;
    boss.status = 'transition';
    boss.statusRemaining = 1.6;
    boss.ability = null;
    boss.telegraphRemaining = 0;
    boss.telegraphTotal = 0;
    boss.abilityTimer = 2.4;
    this.lastBossAbility = null;
    this.clearFakeLikes(false);
    this.audio.playSfx('warning');
    glitchScreen(this.view?.element ?? this.root, 800, this.reducedMotion());
    showToast(
      `PHASE ${nextPhase} — L’ALGORITHME ACCÉLÈRE.`,
      'danger',
      '🧠',
      3200,
    );
    this.lastHintKey = '';
    this.updateView();
  }

  private selectTarget(id: string): void {
    if (!this.canAct()) return;
    const target =
      this.boss?.id === id
        ? this.boss
        : this.enemies.find((enemy) => enemy.id === id && enemy.alive);
    if (!target || !('alive' in target && target.alive)) return;
    this.targetId = id;
    this.audio.playSfx('select', { volume: 0.45 });
    const card =
      id === 'boss'
        ? this.view?.getFeedRefs()?.bossNode?.card
        : this.view?.getFeedRefs()?.enemyNodes.get(id)?.card;
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.updateView();
  }

  /* ------------------------------------------------------------------ */
  /* Combat : dégâts, ciblage, fin de salle                              */
  /* ------------------------------------------------------------------ */

  private applyPlayerDamage(
    rawDamage: number,
    options: { allowDodge: boolean; source?: string },
  ): void {
    if (!this.run || this.ending || rawDamage <= 0) return;
    const loadout = getLoadout(this.run);
    const result = resolveIncomingDamage(rawDamage, {
      dodging: options.allowDodge && this.dodgeRemaining > 0,
      shieldReduction: this.shieldRemaining > 0 ? loadout.shieldReduction : null,
    });
    if (!result.dodged) {
      this.run.stats.damageAvoided += result.avoided;
    }

    if (result.dodged) {
      recordDodge(this.run, result.avoided, this.scoreMultiplier());
      this.audio.playSfx('dodge');
      const anchor = this.view?.element.querySelector<HTMLElement>('.action-dock');
      if (anchor) spawnFloat(anchor, 'ESQUIVE !', 'shield', this.reducedMotion());
      showToast('Attaque esquivée. Le scroll est une arme.', 'success', '💨', 1600);
      this.updateView();
      return;
    }

    this.run.hp = Math.max(0, this.run.hp - result.hpLoss);
    this.combo = 0;
    this.comboTimer = 0;

    const anchor = this.view?.element.querySelector<HTMLElement>('.action-dock');
    if (anchor) spawnFloat(anchor, `-${result.hpLoss} PV`, 'damage', this.reducedMotion());
    if (this.view) {
      flashDamage(this.view.element, this.reducedMotion());
      shakeScreen(this.view.element, result.hpLoss >= 15, this.reducedMotion());
      this.view.element.classList.add('is-hurt');
      window.setTimeout(() => this.view?.element.classList.remove('is-hurt'), 220);
    }
    if (result.blocked > 0) {
      this.audio.playSfx('shield', { volume: 0.7 });
      showToast(`Bouclier : ${Math.round(result.blocked)} dégâts absorbés.`, 'info', '🛡', 1300);
    } else {
      this.audio.playSfx('hurt');
    }

    if (this.run.hp <= 0) {
      this.beginDefeat();
      return;
    }
    this.updateView();
  }

  private refreshTargetAfterAction(): void {
    const current = this.getTargetCombatant();
    if (current) return;
    if (this.boss?.alive) {
      this.targetId = this.boss.id;
      return;
    }
    this.targetId = this.pickPreferredTarget();
  }

  private pickPreferredTarget(): string | null {
    const alive = this.enemies.filter((enemy) => enemy.alive);
    return alive.find((enemy) => enemy.kind !== 'sponsored')?.id ?? alive[0]?.id ?? null;
  }

  private ensureTarget(): void {
    const current = this.getTargetCombatant();
    if (current) return;
    if (this.boss?.alive) {
      this.targetId = this.boss.id;
      return;
    }
    this.targetId = this.pickPreferredTarget();
  }

  private getTargetCombatant(): EnemyRuntime | BossRuntime | null {
    if (!this.targetId) return null;
    if (this.boss && this.targetId === this.boss.id) {
      return this.boss.alive ? this.boss : null;
    }
    const enemy = this.enemies.find((item) => item.id === this.targetId && item.alive);
    return enemy ?? null;
  }

  private checkRoomClear(): void {
    if (!this.run || !this.room || this.clearHandled || this.ending) return;
    const enemiesAlive = this.enemies.some((enemy) => enemy.alive);
    const bossAlive = this.boss?.alive ?? false;
    if (enemiesAlive || bossAlive) {
      const remaining = this.enemies.filter((enemy) => enemy.alive).length + (bossAlive ? 1 : 0);
      this.view?.updateExitProgress(remaining);
      return;
    }
    this.clearHandled = true;
    if (this.boss) {
      this.handleBossVictory();
    } else {
      this.handleRoomCleared();
    }
  }

  private handleRoomCleared(): void {
    if (!this.run) return;
    this.roomCleared = true;
    this.audio.duck(false);
    const roomPoints = recordRoomClear(this.run, this.run.floor, this.scoreMultiplier());
    let recharged = false;
    if (
      this.run.floor % SHARE_RECHARGE_FLOORS === 0 &&
      this.run.shares < this.run.maxShares
    ) {
      this.run.shares += 1;
      recharged = true;
    }
    this.clearFakeLikes(false);
    this.debuff = null;
    this.audio.playSfx('upgrade', { volume: 0.6 });

    this.view?.markRoomCleared(false);
    const isUpgrade = RUN_CONFIG.upgradeFloors.includes(this.run.floor);
    const label = isUpgrade
      ? 'Choisir une amélioration'
      : `Descendre à l’étage ${this.run.floor + 1}`;
    this.view?.setAdvance(label);
    window.setTimeout(() => this.view?.scrollToExit(), 520);
    this.view?.setHint(
      '🚪',
      'Salle nettoyée',
      isUpgrade
        ? 'Choisis une amélioration pour continuer ta descente.'
        : 'Descends quand tu es prêt. Tu peux encore partager un soin.',
    );
    showToast(
      `Salle nettoyée · +${formatNumber(roomPoints)} pts${recharged ? ' · +1 partage' : ''}`,
      'success',
      '🚪',
      3000,
    );
    this.updateView();
  }

  private handleBossVictory(): void {
    if (!this.run || !this.boss) return;
    this.victoryPending = true;
    this.roomCleared = true;
    this.ending = true;
    this.clearFakeLikes(false);
    this.debuff = null;
    this.run.stats.bossDefeated = true;
    this.run.stats.roomsCleared += 1;
    const bossPoints = addScore(this.run, 'boss', SCORE.bossKill, this.scoreMultiplier());
    this.audio.playSfx('victory');
    this.view?.markRoomCleared(true);
    this.view?.element.classList.add('is-victory');
    if (this.view) confetti(this.view.element, this.reducedMotion());
    glitchScreen(this.view?.element ?? this.root, 900, this.reducedMotion());
    showToast(
      `L’ALGORITHME EST HORS LIGNE · +${formatNumber(bossPoints)} pts`,
      'success',
      '🏆',
      3600,
    );
    this.updateView();
    this.clearPendingFinish();
    this.pendingFinishTimer = window.setTimeout(() => {
      if (this.screen === 'game') this.finishRun(true);
    }, 2300);
  }

  private beginDefeat(): void {
    if (this.ending || !this.run) return;
    this.ending = true;
    this.combo = 0;
    this.debuff = null;
    this.clearFakeLikes(false);
    this.audio.playSfx('defeat');
    this.audio.duck(true);
    glitchScreen(this.view?.element ?? this.root, 700, this.reducedMotion());
    if (this.view) {
      this.view.element.classList.add('is-defeated');
      this.view.setFeedStatus('CONNEXION PERDUE — L’ALGORITHME A GAGNÉ');
      this.view.setHint('💀', 'Signal perdu', 'Ton temps d’écran est maintenant une statistique.');
    }
    showToast('Ton fil s’est éteint. L’Algorithme garde ton siège.', 'danger', '💀', 3200);
    this.updateEnemyViews();
    this.updateView();
    this.clearPendingFinish();
    this.pendingFinishTimer = window.setTimeout(() => {
      if (this.screen === 'game') this.finishRun(false);
    }, 1500);
  }

  private finishRun(victory: boolean): void {
    if (!this.run || this.finished) return;
    this.finished = true;
    this.ending = true;
    this.clearPendingFinish();
    this.stopLoop();
    closeAllOverlays();
    this.cleanupInputs.forEach((cleanup) => cleanup());
    this.cleanupInputs = [];
    this.view?.destroy();

    const result = createResults(this.run, victory, this.profile.bestScore);
    this.profile = applyResultsToProfile(this.profile, result);
    this.store.saveProfile(this.profile);
    this.store.clearRun();
    this.audio.duck(false);
    this.audio.setTrack('results');
    this.run = null;
    this.room = null;
    this.enemies = [];
    this.boss = null;
    this.view = null;
    this.screen = 'results';
    this.applyScreenMood('results');
    this.removeUrlSeed();

    renderResults(this.root, result, this.reducedMotion(), {
      onReplaySame: () => this.startNewRun(result.seed),
      onReplayNew: () => this.startNewRun(randomSeed()),
      onMenu: () => this.showMenu(),
    });
  }

  private clearPendingFinish(): void {
    if (this.pendingFinishTimer !== null) {
      window.clearTimeout(this.pendingFinishTimer);
      this.pendingFinishTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Overlays                                                           */
  /* ------------------------------------------------------------------ */

  private openPauseOverlay(): void {
    if (this.screen !== 'game' || !this.run || this.ending || isOverlayOpen()) return;
    this.audio.duck(true);
    openPause({
      run: this.run,
      onResume: () => {
        this.audio.duck(false);
        this.lastFrame = performance.now();
      },
      onSettings: () => this.openSettingsOverlay(),
      onTutorial: () => {
        openTutorial({ onClose: () => this.markTutorialSeen() });
      },
      onAbandon: () => {
        openConfirm({
          title: 'Abandonner la descente ?',
          message:
            'La partie en cours sera perdue. Le meilleur score et les statistiques déjà enregistrés sont conservés.',
          confirmLabel: 'Abandonner',
          danger: true,
          onConfirm: () => this.abandonRun(),
        });
      },
    });
  }

  private openHelpTutorial(): void {
    if (this.screen !== 'game' || this.ending) return;
    openTutorial({ onClose: () => this.markTutorialSeen() });
  }

  private openTutorialOverlay(onClose: () => void, startLabel?: string): void {
    openTutorial({
      startLabel,
      onClose,
    });
  }

  private openSettingsOverlay(): void {
    openSettings({
      settings: this.settings,
      onChange: (next) => {
        this.settings = next;
        this.store.saveSettings(next);
        this.applyMotionPreference();
        this.audio.setSettings(next);
      },
      onResetProgress: () => {
        const tutorialSeen = this.profile.tutorialSeen;
        this.profile = createDefaultProfile();
        this.profile.tutorialSeen = tutorialSeen;
        this.store.saveProfile(this.profile);
        this.store.clearRun();
        if (this.screen === 'menu') {
          const best = document.querySelector<HTMLElement>('[data-best-score]');
          const games = document.querySelector<HTMLElement>('[data-games-played]');
          const victories = document.querySelector<HTMLElement>('[data-victories]');
          if (best) best.textContent = '0';
          if (games) games.textContent = '0';
          if (victories) victories.textContent = '0';
          const continueButton = document.querySelector<HTMLButtonElement>('[data-menu="continue"]');
          if (continueButton) continueButton.hidden = true;
        }
        showToast('Scores et progression locale réinitialisés.', 'success', '🧹', 2800);
      },
      onTutorial: () => this.openTutorialOverlay(() => this.markTutorialSeen()),
      onClose: () => {
        this.applyMotionPreference();
      },
    });
  }

  private markTutorialSeen(): void {
    if (this.profile.tutorialSeen) return;
    this.profile.tutorialSeen = true;
    this.store.saveProfile(this.profile);
  }

  private abandonRun(): void {
    if (!this.run) {
      closeAllOverlays();
      this.showMenu();
      return;
    }
    this.ending = true;
    this.clearPendingFinish();
    this.stopLoop();
    this.store.clearRun();
    this.run = null;
    this.room = null;
    this.enemies = [];
    this.boss = null;
    this.targetId = null;
    this.view?.destroy();
    this.view = null;
    this.cleanupInputs.forEach((cleanup) => cleanup());
    this.cleanupInputs = [];
    closeAllOverlays();
    this.audio.duck(false);
    this.audio.setTrack('menu');
    this.screen = 'menu';
    showToast('Descente abandonnée. Le fil s’en souviendra.', 'info', '🚪', 2400);
    this.showMenu();
  }

  /* ------------------------------------------------------------------ */
  /* Rendu HUD                                                          */
  /* ------------------------------------------------------------------ */

  private updateView(): void {
    if (!this.view || !this.run) return;
    const run = this.run;
    const loadout = getLoadout(run);
    const target = this.getTargetCombatant();

    const targetSnapshot: ViewTargetSnapshot | null = target
      ? {
          id: target.id,
          name: target.id === 'boss' ? 'L’Algorithme' : (target as EnemyRuntime).name,
          handle: target.handle,
          avatar: target.avatar,
          hp: target.hp,
          maxHp: target.maxHp,
          kind: target.id === 'boss' ? 'boss' : (target as EnemyRuntime).kind,
          sponsored: target.id !== 'boss' && (target as EnemyRuntime).kind === 'sponsored',
        }
      : null;

    const threat = this.getCurrentThreat();
    const snapshot: HudSnapshot = {
      run,
      loadout,
      combo: this.combo,
      comboRatio: loadout.comboWindow > 0 ? this.comboTimer / loadout.comboWindow : 0,
      shieldRemaining: this.shieldRemaining,
      commentCooldown:
        loadout.shieldCooldown > 0 ? this.shieldCooldownRemaining / loadout.shieldCooldown : 0,
      likeCooldown: loadout.attackCooldown > 0 ? this.likeCooldown / loadout.attackCooldown : 0,
      dodgeCooldown: loadout.dodgeCooldown > 0 ? this.dodgeCooldown / loadout.dodgeCooldown : 0,
      dodgeRemaining: this.dodgeRemaining,
      shareCooldown: loadout.shareCooldown > 0 ? this.shareCooldown / loadout.shareCooldown : 0,
      target: targetSnapshot,
      threat,
      debuff: this.debuff?.type ?? null,
      roomCleared: this.roomCleared,
      fakeLikesActive: this.fakeLikes.length > 0,
      boss: this.boss,
    };
    this.view.update(snapshot);
    this.view.setRunStatic(run);
    this.updateEnemyViews();
    this.refreshHint();
  }

  private updateEnemyViews(): void {
    if (!this.view || !this.room) return;
    const feed = this.view.getFeedRefs();
    if (!feed) return;
    for (const enemy of this.enemies) {
      const refs = feed.enemyNodes.get(enemy.id);
      if (refs) {
        updateEnemyCard(refs, enemy, this.targetId === enemy.id, false);
      }
    }
    if (this.boss && feed.bossNode) {
      updateEnemyCard(feed.bossNode, this.boss, this.targetId === this.boss.id, true);
    }
  }

  private getCurrentThreat(): ViewThreatSnapshot | null {
    const threats: ViewThreatSnapshot[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.telegraphRemaining <= 0) continue;
      const source =
        enemy.kind === 'ragebait'
          ? 'Ragebait en approche'
          : enemy.kind === 'troll'
            ? 'Troll en approche'
            : enemy.name;
      const text =
        enemy.kind === 'troll'
          ? 'Attaque rapide — le troll peut bloquer tes commentaires.'
          : enemy.kind === 'ragebait'
            ? 'Une attaque de ratio se prépare.'
            : 'Une attaque arrive.';
      threats.push({
        source,
        text,
        remaining: enemy.telegraphRemaining,
        total: Math.max(0.01, enemy.telegraphTotal),
        action: 'ESQUIVE / BOUCLIER',
      });
    }
    if (this.boss?.alive && this.boss.ability && this.boss.telegraphRemaining > 0) {
      const info = BOSS_ABILITY_INFO[this.boss.ability];
      const damaging =
        this.boss.ability === 'surge' ||
        this.boss.ability === 'rain' ||
        this.boss.ability === 'final_upload';
      threats.push({
        source: 'L’ALGORITHME',
        text: `${info.title} — ${info.hint}`,
        remaining: this.boss.telegraphRemaining,
        total: Math.max(0.01, this.boss.telegraphTotal),
        action: damaging ? 'ESQUIVE / BOUCLIER' : 'PRÉPARE-TOI',
      });
    }
    if (threats.length === 0) return null;
    threats.sort((a, b) => a.remaining - b.remaining);
    return threats[0] ?? null;
  }

  private refreshHint(): void {
    if (!this.view || !this.room) return;
    const target = this.getTargetCombatant();
    const enemyTarget =
      target && target.id !== 'boss' ? (target as EnemyRuntime) : null;
    let key = 'default';
    let iconText = '💡';
    let title = 'Le label du pouce';
    let text = 'Cible un post puis like-le jusqu’à ce qu’il arrête de poster.';

    if (this.roomCleared) {
      key = 'cleared';
      iconText = '🚪';
      title = 'Salle nettoyée';
      text = 'Utilise « Descendre » pour continuer ta descente.';
    } else if (this.debuff?.type === 'comments') {
      key = 'comments-lock';
      iconText = '💬';
      title = 'Commentaires bloqués';
      text = 'Un troll t’empêche de te protéger. Esquive avec le scroll ou le bouton.';
    } else if (this.boss?.alive && this.boss.status === 'transition') {
      key = 'boss-transition';
      iconText = '🧠';
      title = 'Mutation en cours';
      text = 'L’Algorithme est invulnérable pendant sa transition. Prépare ton prochain move.';
    } else if (this.boss?.alive && this.boss.status === 'armored') {
      key = 'boss-armored';
      iconText = '🛡';
      title = 'Pare-feu actif';
      text = 'Tes likes font très peu de dégâts. Attends la fenêtre VULNÉRABLE.';
    } else if (target && target.id === 'boss') {
      key = 'boss-vulnerable';
      iconText = '🧠';
      title = 'Fenêtre vulnérable';
      text = 'L’Algorithme est exposé. Enchaîne les likes, mais garde une esquive pour ses attaques.';
    } else if (enemyTarget?.kind === 'sponsored') {
      key = 'sponsored';
      iconText = '🙈';
      title = 'Pub piégée';
      text = 'Appuie sur Ignorer (X) pour la désamorcer. Un like la fait exploser.';
    } else if (enemyTarget?.kind === 'ragebait' && enemyTarget.taunting) {
      key = 'taunt';
      iconText = '😡';
      title = 'Provocation active';
      text = 'Ne like pas maintenant. Attends la fin de la provocation ou protège-toi.';
    } else if (enemyTarget?.kind === 'troll') {
      key = 'troll';
      iconText = '🤡';
      title = 'Troll dans le fil';
      text = 'Il peut bloquer tes commentaires et mélanger les boutons. L’esquive reste fiable.';
    } else if (enemyTarget?.kind === 'ragebait') {
      key = 'ragebait';
      iconText = '♥';
      title = 'Ragebait à portée';
      text = 'Enchaîne les likes pour monter ton combo. Méfie-toi de ses provocations.';
    } else if (this.getCurrentThreat()) {
      key = 'threat';
      iconText = '⚠️';
      title = 'Attaque imminente';
      text = 'Esquive avec Maj + ↓, la molette rapide ou le bouton, sinon lève ton bouclier.';
    }

    if (key !== this.lastHintKey) {
      this.lastHintKey = key;
      this.view.setHint(iconText, title, text);
    }
  }

  private commentButtonSafe(): HTMLButtonElement {
    return this.view?.commentButton ?? document.createElement('button');
  }

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                        */
  /* ------------------------------------------------------------------ */

  private inputBlocked(): boolean {
    return (
      this.screen !== 'game' ||
      !this.run ||
      this.ending ||
      this.finished ||
      isOverlayOpen()
    );
  }

  private canAct(): boolean {
    return !this.inputBlocked() && Boolean(this.run && this.room && this.view);
  }

  private scoreMultiplier(): number {
    if (!this.run) return 1;
    return getLoadout(this.run).scoreMultiplier * (this.room?.event?.scoreMultiplier ?? 1);
  }

  private reducedMotion(): boolean {
    return this.settings.reducedMotion || prefersReducedMotion();
  }

  private applyMotionPreference(): void {
    document.documentElement.classList.toggle('reduce-motion', this.reducedMotion());
  }

  private applyScreenMood(screen: Screen): void {
    document.body.dataset.screen = screen;
    document.body.classList.toggle('is-in-game', screen === 'game');
    document.body.classList.toggle('is-in-menu', screen === 'menu');
    document.body.classList.toggle('is-in-results', screen === 'results');
  }

  private warnStorageOnce(): void {
    if (this.storageWarningShown) return;
    this.storageWarningShown = true;
    showToast(
      'Sauvegarde locale indisponible. La descente restera en mémoire.',
      'danger',
      '⚠️',
      3600,
    );
  }

  private setUrlSeed(seed: string): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('seed', seed);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Pas critique.
    }
  }

  private removeUrlSeed(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('seed');
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Pas critique.
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.audio.suspend();
      if (this.screen === 'game' && this.run && !this.ending && !isOverlayOpen()) {
        this.openPauseOverlay();
      }
    } else {
      this.audio.resume();
    }
  };

  destroy(): void {
    this.stopLoop();
    this.clearPendingFinish();
    this.cleanupKeyboard();
    this.cleanupInputs.forEach((cleanup) => cleanup());
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
