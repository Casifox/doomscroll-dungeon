import type {
  BossRuntime,
  CombatantKind,
  EnemyRuntime,
  GeneratedRoom,
  Loadout,
  RunState,
  UpgradeId,
} from '../core/types';
import { formatNumber } from '../core/game-state';
import { icon, LOGO_MARK } from './icons';
import { qs, qsa, setHidden } from './dom';
import {
  appendEnemyCard,
  buildFeed,
  setExitProgress,
  setFeedCleared,
  type FeedHandlers,
  type FeedRefs,
  type EnemyCardRefs,
} from './feed';
import { getUpgrade } from '../systems/progression';
import { BOSS_ABILITY_INFO } from '../entities/bosses';

export interface GameViewCallbacks {
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onIgnore: () => void;
  onDodge: () => void;
  onPause: () => void;
  onTutorial: () => void;
}

export interface TargetSnapshot {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  hp: number;
  maxHp: number;
  kind: CombatantKind;
  sponsored: boolean;
}

export interface ThreatSnapshot {
  source: string;
  text: string;
  remaining: number;
  total: number;
  action: string;
}

export interface HudSnapshot {
  run: RunState;
  loadout: Loadout;
  combo: number;
  comboRatio: number;
  shieldRemaining: number;
  commentCooldown: number;
  likeCooldown: number;
  dodgeCooldown: number;
  dodgeRemaining: number;
  shareCooldown: number;
  target: TargetSnapshot | null;
  threat: ThreatSnapshot | null;
  debuff: 'comments' | 'shuffle' | null;
  roomCleared: boolean;
  fakeLikesActive: boolean;
  boss: BossRuntime | null;
}

export class GameView {
  readonly element: HTMLElement;
  readonly feedScroll: HTMLElement;
  readonly feedContent: HTMLElement;
  readonly fakeLikeLayer: HTMLElement;
  readonly actionDock: HTMLElement;
  readonly likeButton: HTMLButtonElement;
  readonly commentButton: HTMLButtonElement;
  readonly shareButton: HTMLButtonElement;
  readonly ignoreButton: HTMLButtonElement;
  readonly dodgeButton: HTMLButtonElement;
  readonly advanceButton: HTMLButtonElement;

  private readonly callbacks: GameViewCallbacks;
  private readonly actionContainer: HTMLElement;
  private readonly actionButtons: HTMLButtonElement[];
  private readonly hpFills: HTMLElement[];
  private readonly hpTexts: HTMLElement[];
  private readonly mobileHpFill: HTMLElement;
  private readonly mobileHpText: HTMLElement;
  private readonly scoreEls: HTMLElement[];
  private readonly depthEls: HTMLElement[];
  private readonly pips: HTMLElement[];
  private readonly comboEl: HTMLElement;
  private readonly comboBigEl: HTMLElement;
  private readonly mobileComboEl: HTMLElement;
  private readonly comboFill: HTMLElement;
  private readonly comboPill: HTMLElement;
  private readonly comboPillValue: HTMLElement;
  private readonly dodgesEl: HTMLElement;
  private readonly sharesEls: HTMLElement[];
  private readonly sharesBadge: HTMLElement;
  private readonly multiplierEl: HTMLElement;
  private readonly hpHint: HTMLElement;
  private readonly targetCard: HTMLElement;
  private readonly targetAvatar: HTMLElement;
  private readonly targetName: HTMLElement;
  private readonly targetHandle: HTMLElement;
  private readonly targetHp: HTMLElement;
  private readonly targetHpText: HTMLElement;
  private readonly targetWarning: HTMLElement;
  private readonly dockTarget: HTMLElement;
  private readonly feedStatus: HTMLElement;
  private readonly threatBanner: HTMLElement;
  private readonly threatTitle: HTMLElement;
  private readonly threatSource: HTMLElement;
  private readonly threatTime: HTMLElement;
  private readonly threatFill: HTMLElement;
  private readonly threatAction: HTMLElement;
  private readonly scrollHint: HTMLElement;
  private readonly bossStrip: HTMLElement;
  private readonly bossPhaseEl: HTMLElement;
  private readonly bossHpFill: HTMLElement;
  private readonly bossHpText: HTMLElement;
  private readonly bossStatus: HTMLElement;
  private readonly bossAbility: HTMLElement;
  private readonly debuffBanner: HTMLElement;
  private readonly debuffIcon: HTMLElement;
  private readonly debuffTitle: HTMLElement;
  private readonly debuffDesc: HTMLElement;
  private readonly hintCardIcon: HTMLElement;
  private readonly hintCardTitle: HTMLElement;
  private readonly hintCardText: HTMLElement;
  private readonly eventIcon: HTMLElement;
  private readonly eventName: HTMLElement;
  private readonly eventDesc: HTMLElement;
  private readonly eventCard: HTMLElement;
  private readonly upgradeChips: HTMLElement;
  private readonly upgradeCount: HTMLElement;
  private readonly feedTabLabel: HTMLElement;
  private readonly commentExtra: HTMLElement;
  private readonly fakeLikes: Map<string, HTMLButtonElement> = new Map();

  private feedRefs: FeedRefs | null = null;
  private feedHandlers: FeedHandlers | null = null;
  private cachedUpgradeSignature = '';
  private cachedTheme = '';
  private cachedHpText = '';
  private cachedScore = '';
  private cachedDepth = '';
  private cachedTargetSignature = '';
  private cachedThreatSignature = '';
  private cachedDebuff: string | null = null;
  private cachedBossSignature = '';
  private lastShuffled = false;
  private scrollConsumed = false;

  constructor(callbacks: GameViewCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'screen game-screen';
    this.element.innerHTML = `
      <div class="game-ambient" aria-hidden="true">
        <div class="game-ambient__glow"></div>
        <div class="game-ambient__grid"></div>
      </div>
      <header class="game-topbar">
        <div class="game-topbar__left">
          <button class="icon-btn game-pause" type="button" data-pause aria-label="Mettre en pause">
            ${icon('pause')}
          </button>
          <div class="game-brand">
            <span class="game-brand__mark">${LOGO_MARK}</span>
            <span class="game-brand__text">DOOMSCROLL<small>DUNGEON</small></span>
          </div>
        </div>
        <div class="run-progress">
          <span class="run-progress__label">PROFONDEUR <b data-depth>ÉTAGE 1 / 9</b></span>
          <div class="run-pips" data-pips aria-hidden="true"></div>
        </div>
        <div class="game-topbar__right">
          <div class="score-chip"><span>SCORE</span><strong data-score>0</strong></div>
          <button class="icon-btn game-help" type="button" data-help aria-label="Revoir le tutoriel">
            ${icon('info')}
          </button>
        </div>
      </header>

      <div class="boss-strip" data-boss-strip hidden>
        <div class="boss-strip__id">
          <span class="boss-strip__avatar">🧠</span>
          <span class="boss-strip__copy"><small>BOSS FINAL</small><strong>L’ALGORITHME</strong></span>
        </div>
        <div class="boss-strip__track">
          <div class="boss-strip__bar"><i data-boss-hp-fill></i></div>
          <div class="boss-strip__meta">
            <span data-boss-phase>PHASE 1 / 3</span>
            <span data-boss-status>VULNÉRABLE</span>
            <span data-boss-ability></span>
          </div>
        </div>
        <div class="boss-strip__hp"><small>INTÉGRITÉ</small><b data-boss-hp>820</b></div>
      </div>

      <div class="mobile-status">
        <div class="mobile-hp">
          <span>VIE <b data-mobile-hp-text>100</b></span>
          <div class="bar bar--player bar--mobile"><i data-hp-fill></i></div>
        </div>
        <div class="mobile-stat"><span>COMBO</span><strong data-combo-mobile>×0</strong></div>
        <div class="mobile-stat"><span>PARTAGES</span><strong data-mobile-shares>3</strong></div>
      </div>

      <div class="game-body">
        <aside class="side-panel profile-panel">
          <div class="profile-card">
            <div class="profile-card__avatar">🫥<span class="profile-card__ring" aria-hidden="true"></span></div>
            <div class="profile-card__copy">
              <span class="profile-card__handle">@toi</span>
              <span class="profile-card__status"><i></i> En ligne contre ton gré</span>
            </div>
            <span class="profile-card__verified" title="Compte vérifié par personne">✓</span>
          </div>

          <div class="hp-panel">
            <div class="hp-panel__head"><span>VIE</span><strong data-hp-text>100 / 100</strong></div>
            <div class="bar bar--player"><i data-hp-fill></i></div>
            <p class="hp-panel__hint" data-hp-hint>Reste au-dessus de zéro.</p>
          </div>

          <div class="side-stats">
            <div><span>COMBO</span><strong data-combo>×0</strong></div>
            <div><span>ESQUIVES</span><strong data-dodges>0</strong></div>
            <div><span>PARTAGES</span><strong data-shares>3</strong></div>
            <div><span>SCORE</span><strong data-mult>×1.0</strong></div>
          </div>

          <div class="target-panel">
            <div class="panel-label"><span>CIBLE ACTUELLE</span><span class="target-live"><i></i> LIVE</span></div>
            <div class="target-card is-empty" data-target-card>
              <div class="target-card__avatar" data-target-avatar>◎</div>
              <div class="target-card__copy">
                <strong data-target-name>Aucune cible</strong>
                <span data-target-handle>Scrolle dans le fil</span>
                <div class="bar bar--target"><i data-target-hp></i></div>
              </div>
              <span class="target-card__hp" data-target-hp-text>—</span>
            </div>
            <p class="target-warning" data-target-warning hidden></p>
          </div>

          <div class="upgrades-panel">
            <div class="panel-label"><span>AMÉLIORATIONS</span><span data-upgrade-count>0 / 10</span></div>
            <div class="upgrade-chips" data-upgrade-chips>
              <span class="upgrade-empty">Aucun buff. Pour l’instant.</span>
            </div>
          </div>

          <div class="event-panel" data-event-card>
            <div class="panel-label">ÉVÉNEMENT DE SALLE</div>
            <div class="event-panel__row">
              <span class="event-panel__icon" data-event-icon>🫥</span>
              <div><strong data-event-name>Fil calme</strong><p data-event-desc>Aucun événement. Ça ne va pas durer.</p></div>
            </div>
          </div>
        </aside>

        <section class="feed-shell">
          <header class="feed-header">
            <div class="feed-tabs">
              <span class="feed-tab is-active" data-feed-tab>Pour toi</span>
              <span class="feed-tab">Abonnements</span>
              <span class="feed-tab">Abîme</span>
            </div>
            <span class="feed-live"><i></i> FIL EN DIRECT</span>
          </header>

          <div class="threat-banner" data-threat hidden role="status" aria-live="assertive">
            <span class="threat-banner__icon">⚠️</span>
            <span class="threat-banner__copy">
              <strong data-threat-title>Attaque imminente</strong>
              <small data-threat-source>Esquive ou bouclier</small>
            </span>
            <span class="threat-banner__time" data-threat-time>1.2 s</span>
            <span class="threat-banner__bar"><i data-threat-fill></i></span>
            <span class="threat-banner__hint" data-threat-action>ESQUIVE / BOUCLIER</span>
          </div>

          <div class="feed-scroll" data-feed-scroll tabindex="0" aria-label="Fil d’actualité du donjon">
            <div class="feed-content" data-feed-content></div>
          </div>

          <div class="feed-scroll-hint" data-scroll-hint>
            ${icon('arrowDown')} <span>SCROLLE POUR EXPLORER</span>
          </div>

          <div class="fake-like-layer" data-fake-like aria-hidden="true"></div>

          <div class="feed-bottom-bar">
            <span class="feed-bottom-bar__status" data-feed-status>La salle est en cours de chargement…</span>
            <button class="btn btn-primary feed-advance" type="button" data-advance hidden>
              Descendre ${icon('arrowDown')}
            </button>
          </div>
        </section>

        <aside class="side-panel combat-panel">
          <div class="panel-label">SIGNAL EN DIRECT</div>
          <div class="combo-card">
            <div class="combo-card__head"><span>COMBO</span><strong data-combo-big>×0</strong></div>
            <div class="combo-card__bar"><i data-combo-fill></i></div>
            <p>Enchaîne les likes pour faire grimper les dégâts.</p>
          </div>

          <div class="tip-card">
            <span class="tip-card__icon" data-hint-icon>💡</span>
            <div><strong data-hint-title>Le label du pouce</strong><p data-hint-text>Cible un post, puis like-le jusqu’à ce qu’il arrête de poster.</p></div>
          </div>

          <div class="keymap-card">
            <div class="panel-label">CLAVIER</div>
            <div class="keymap-row"><span>Liker</span><kbd>Espace</kbd></div>
            <div class="keymap-row"><span>Commenter</span><kbd>C</kbd></div>
            <div class="keymap-row"><span>Partager</span><kbd>S</kbd></div>
            <div class="keymap-row"><span>Ignorer</span><kbd>X</kbd></div>
            <div class="keymap-row"><span>Esquiver</span><kbd>Maj + ↓</kbd></div>
            <div class="keymap-row"><span>Pause</span><kbd>Échap</kbd></div>
          </div>

          <div class="lore-card">
            <span>«</span>
            <p>Ce n’est pas un réseau social. C’est un donjon avec des notifications.</p>
            <small>— panneau d’accueil de Chronofil</small>
          </div>
        </aside>
      </div>

      <div class="debuff-banner" data-debuff hidden role="status">
        <span class="debuff-banner__icon" data-debuff-icon>🧩</span>
        <div><strong data-debuff-title>INTERFACE PIRATÉE</strong><small data-debuff-desc>Les boutons ont changé de place.</small></div>
      </div>

      <div class="action-dock" data-action-dock>
        <div class="action-dock__target" data-dock-target>
          <span class="action-dock__target-dot" aria-hidden="true"></span>
          <span data-dock-target-text>Aucune cible — scrolle dans le fil</span>
        </div>
        <div class="combo-pill" data-combo-pill hidden>
          <span>COMBO</span><strong>×<b data-combo-pill-value>2</b></strong>
        </div>
        <div class="action-dock__actions" data-action-container>
          <button class="action-btn action-btn--comment" type="button" data-action="comment" title="Commenter : bouclier temporaire">
            <span class="action-btn__cd" data-cd></span>
            <span class="action-btn__icon">${icon('comment')}</span>
            <span class="action-btn__label">Commenter</span>
            <span class="action-btn__extra" data-comment-extra></span>
            <kbd>C</kbd>
          </button>
          <button class="action-btn action-btn--share" type="button" data-action="share" title="Partager : soigne, charges limitées">
            <span class="action-btn__cd" data-cd></span>
            <span class="action-btn__icon">${icon('share')}</span>
            <span class="action-btn__label">Partager</span>
            <span class="action-btn__badge" data-share-badge>3</span>
            <kbd>S</kbd>
          </button>
          <button class="action-btn action-btn--like" type="button" data-action="like" title="Liker : attaque la cible">
            <span class="action-btn__cd" data-cd></span>
            <span class="action-btn__icon">${icon('heart')}</span>
            <span class="action-btn__label">Liker</span>
            <kbd>Espace</kbd>
          </button>
          <button class="action-btn action-btn--ignore" type="button" data-action="ignore" title="Ignorer : désamorce une pub piégée">
            <span class="action-btn__cd" data-cd></span>
            <span class="action-btn__icon">${icon('eyeOff')}</span>
            <span class="action-btn__label">Ignorer</span>
            <kbd>X</kbd>
          </button>
          <button class="action-btn action-btn--dodge" type="button" data-action="dodge" title="Esquiver : annule la prochaine attaque">
            <span class="action-btn__cd" data-cd></span>
            <span class="action-btn__icon">${icon('wind')}</span>
            <span class="action-btn__label">Esquiver</span>
            <kbd>Maj ↓</kbd>
          </button>
        </div>
      </div>
    `;

    this.feedScroll = qs<HTMLElement>('[data-feed-scroll]', this.element);
    this.feedContent = qs<HTMLElement>('[data-feed-content]', this.element);
    this.fakeLikeLayer = qs<HTMLElement>('[data-fake-like]', this.element);
    this.actionDock = qs<HTMLElement>('[data-action-dock]', this.element);
    this.actionContainer = qs<HTMLElement>('[data-action-container]', this.element);
    this.likeButton = qs<HTMLButtonElement>('[data-action="like"]', this.element);
    this.commentButton = qs<HTMLButtonElement>('[data-action="comment"]', this.element);
    this.shareButton = qs<HTMLButtonElement>('[data-action="share"]', this.element);
    this.ignoreButton = qs<HTMLButtonElement>('[data-action="ignore"]', this.element);
    this.dodgeButton = qs<HTMLButtonElement>('[data-action="dodge"]', this.element);
    this.advanceButton = qs<HTMLButtonElement>('[data-advance]', this.element);
    this.actionButtons = [
      this.commentButton,
      this.shareButton,
      this.likeButton,
      this.ignoreButton,
      this.dodgeButton,
    ];

    this.hpFills = qsa<HTMLElement>('[data-hp-fill]', this.element);
    this.hpTexts = qsa<HTMLElement>('[data-hp-text]', this.element);
    this.mobileHpFill = qs<HTMLElement>('.bar--mobile [data-hp-fill]', this.element);
    this.mobileHpText = qs<HTMLElement>('[data-mobile-hp-text]', this.element);
    this.scoreEls = qsa<HTMLElement>('[data-score]', this.element);
    this.depthEls = qsa<HTMLElement>('[data-depth]', this.element);
    this.comboEl = qs<HTMLElement>('[data-combo]', this.element);
    this.comboBigEl = qs<HTMLElement>('[data-combo-big]', this.element);
    this.mobileComboEl = qs<HTMLElement>('[data-combo-mobile]', this.element);
    this.comboFill = qs<HTMLElement>('[data-combo-fill]', this.element);
    this.comboPill = qs<HTMLElement>('[data-combo-pill]', this.element);
    this.comboPillValue = qs<HTMLElement>('[data-combo-pill-value]', this.element);
    this.dodgesEl = qs<HTMLElement>('[data-dodges]', this.element);
    this.sharesEls = qsa<HTMLElement>('[data-shares], [data-mobile-shares]', this.element);
    this.sharesBadge = qs<HTMLElement>('[data-share-badge]', this.element);
    this.multiplierEl = qs<HTMLElement>('[data-mult]', this.element);
    this.hpHint = qs<HTMLElement>('[data-hp-hint]', this.element);
    this.targetCard = qs<HTMLElement>('[data-target-card]', this.element);
    this.targetAvatar = qs<HTMLElement>('[data-target-avatar]', this.element);
    this.targetName = qs<HTMLElement>('[data-target-name]', this.element);
    this.targetHandle = qs<HTMLElement>('[data-target-handle]', this.element);
    this.targetHp = qs<HTMLElement>('[data-target-hp]', this.element);
    this.targetHpText = qs<HTMLElement>('[data-target-hp-text]', this.element);
    this.targetWarning = qs<HTMLElement>('[data-target-warning]', this.element);
    this.dockTarget = qs<HTMLElement>('[data-dock-target]', this.element);
    this.feedStatus = qs<HTMLElement>('[data-feed-status]', this.element);
    this.threatBanner = qs<HTMLElement>('[data-threat]', this.element);
    this.threatTitle = qs<HTMLElement>('[data-threat-title]', this.element);
    this.threatSource = qs<HTMLElement>('[data-threat-source]', this.element);
    this.threatTime = qs<HTMLElement>('[data-threat-time]', this.element);
    this.threatFill = qs<HTMLElement>('[data-threat-fill]', this.element);
    this.threatAction = qs<HTMLElement>('[data-threat-action]', this.element);
    this.scrollHint = qs<HTMLElement>('[data-scroll-hint]', this.element);
    this.bossStrip = qs<HTMLElement>('[data-boss-strip]', this.element);
    this.bossPhaseEl = qs<HTMLElement>('[data-boss-phase]', this.element);
    this.bossHpFill = qs<HTMLElement>('[data-boss-hp-fill]', this.element);
    this.bossHpText = qs<HTMLElement>('[data-boss-hp]', this.element);
    this.bossStatus = qs<HTMLElement>('[data-boss-status]', this.element);
    this.bossAbility = qs<HTMLElement>('[data-boss-ability]', this.element);
    this.debuffBanner = qs<HTMLElement>('[data-debuff]', this.element);
    this.debuffIcon = qs<HTMLElement>('[data-debuff-icon]', this.element);
    this.debuffTitle = qs<HTMLElement>('[data-debuff-title]', this.element);
    this.debuffDesc = qs<HTMLElement>('[data-debuff-desc]', this.element);
    this.hintCardIcon = qs<HTMLElement>('[data-hint-icon]', this.element);
    this.hintCardTitle = qs<HTMLElement>('[data-hint-title]', this.element);
    this.hintCardText = qs<HTMLElement>('[data-hint-text]', this.element);
    this.eventCard = qs<HTMLElement>('[data-event-card]', this.element);
    this.eventIcon = qs<HTMLElement>('[data-event-icon]', this.element);
    this.eventName = qs<HTMLElement>('[data-event-name]', this.element);
    this.eventDesc = qs<HTMLElement>('[data-event-desc]', this.element);
    this.upgradeChips = qs<HTMLElement>('[data-upgrade-chips]', this.element);
    this.upgradeCount = qs<HTMLElement>('[data-upgrade-count]', this.element);
    this.feedTabLabel = qs<HTMLElement>('[data-feed-tab]', this.element);
    this.commentExtra = qs<HTMLElement>('[data-comment-extra]', this.element);

    const pipsHost = qs<HTMLElement>('[data-pips]', this.element);
    pipsHost.innerHTML = Array.from({ length: 9 }, (_value, index) => {
      const boss = index === 8;
      return `<span class="run-pip${boss ? ' run-pip--boss' : ''}" data-pip="${index + 1}"></span>`;
    }).join('');
    this.pips = qsa<HTMLElement>('[data-pips] .run-pip', this.element);

    this.bindActions();
    this.feedScroll.addEventListener('scroll', () => {
      if (this.feedScroll.scrollTop > 42) {
        this.scrollConsumed = true;
        this.scrollHint.classList.add('is-hidden');
      }
    });
  }

  private bindActions(): void {
    const map: Array<[HTMLButtonElement, () => void]> = [
      [this.likeButton, this.callbacks.onLike],
      [this.commentButton, this.callbacks.onComment],
      [this.shareButton, this.callbacks.onShare],
      [this.ignoreButton, this.callbacks.onIgnore],
      [this.dodgeButton, this.callbacks.onDodge],
    ];
    map.forEach(([button, handler]) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        handler();
      });
    });
    qs<HTMLButtonElement>('[data-pause]', this.element).addEventListener('click', this.callbacks.onPause);
    qs<HTMLButtonElement>('[data-help]', this.element).addEventListener('click', this.callbacks.onTutorial);
  }

  mount(root: HTMLElement): void {
    root.replaceChildren(this.element);
  }

  mountFeed(room: GeneratedRoom, boss: BossRuntime | null, handlers: FeedHandlers): FeedRefs {
    this.feedHandlers = handlers;
    this.feedRefs = buildFeed(this.feedContent, room, boss, handlers);
    this.feedScroll.scrollTop = 0;
    this.scrollConsumed = false;
    this.scrollHint.classList.remove('is-hidden');
    this.setTheme(room);
    this.setRoomDetails(room);
    setHidden(this.bossStrip, boss === null);
    this.hideFakeLikes();
    this.hideAdvance();
    this.feedStatus.textContent = boss
      ? 'L’Algorithme contrôle la sortie.'
      : `${room.enemies.length} post${room.enemies.length > 1 ? 's' : ''} hostile${room.enemies.length > 1 ? 's' : ''} dans le fil.`;
    return this.feedRefs;
  }

  getFeedRefs(): FeedRefs | null {
    return this.feedRefs;
  }

  getFeedHandlers(): FeedHandlers | null {
    return this.feedHandlers;
  }

  addMinion(enemy: EnemyRuntime): EnemyCardRefs | null {
    if (!this.feedRefs || !this.feedHandlers) return null;
    return appendEnemyCard(this.feedRefs, enemy, this.feedHandlers);
  }

  setTheme(room: GeneratedRoom): void {
    if (this.cachedTheme === room.theme.id) return;
    this.cachedTheme = room.theme.id;
    const themeClasses = [
      'theme-pink',
      'theme-cyan',
      'theme-gold',
      'theme-lime',
      'theme-violet',
      'theme-orange',
      'theme-red',
      'theme-mint',
      'theme-boss',
    ];
    this.element.classList.remove(...themeClasses);
    this.element.classList.add(room.theme.className);
    this.element.style.setProperty('--accent', room.theme.accent);
    this.feedTabLabel.textContent = room.theme.feedLabel;
    this.feedTabLabel.style.color = room.theme.accent;
  }

  setRoomDetails(room: GeneratedRoom): void {
    if (room.event) {
      this.eventCard.classList.remove('is-quiet');
      this.eventIcon.textContent = room.event.icon;
      this.eventName.textContent = room.event.name;
      this.eventDesc.textContent = room.event.description;
    } else {
      this.eventCard.classList.add('is-quiet');
      this.eventIcon.textContent = room.isBoss ? '🧠' : '🫥';
      this.eventName.textContent = room.isBoss ? 'Le Noyau' : 'Fil calme';
      this.eventDesc.textContent = room.isBoss
        ? 'Pas de sortie. Pas de modération. Trois phases.'
        : 'Aucun événement de salle. Ça ne va pas durer.';
    }
    this.setHint(
      room.isBoss ? '🧠' : '💡',
      room.isBoss ? 'Le boss te regarde' : 'Le label du pouce',
      room.isBoss
        ? 'Attaque quand il est VULNÉRABLE. Esquive ses surcharges. Les pubs invoquées peuvent exploser.'
        : 'Touche une carte pour la cibler, puis utilise Liker. Les promos se règlent avec Ignorer.',
    );
  }

  setRunStatic(run: RunState): void {
    const signature = run.upgrades.join('|');
    if (signature !== this.cachedUpgradeSignature) {
      this.cachedUpgradeSignature = signature;
      this.upgradeCount.textContent = `${run.upgrades.length} / 10`;
      if (run.upgrades.length === 0) {
        this.upgradeChips.innerHTML = '<span class="upgrade-empty">Aucun buff. Pour l’instant.</span>';
      } else {
        this.upgradeChips.innerHTML = run.upgrades
          .map((id) => {
            const upgrade = getUpgrade(id as UpgradeId);
            return `<span class="upgrade-chip" title="${upgrade.description}">${upgrade.icon}<span>${upgrade.name}</span></span>`;
          })
          .join('');
      }
    }
    this.multiplierEl.textContent = `×${run.upgrades.includes('algo_fou') ? '1.2' : '1.0'}`;
  }

  update(snapshot: HudSnapshot): void {
    const { run } = snapshot;
    const hpRatio = Math.max(0, Math.min(1, run.hp / run.maxHp));
    this.hpFills.forEach((fill) => {
      fill.style.width = `${hpRatio * 100}%`;
    });
    if (this.cachedHpText !== `${run.hp}/${run.maxHp}`) {
      this.cachedHpText = `${run.hp}/${run.maxHp}`;
      const label = `${Math.ceil(run.hp)} / ${run.maxHp}`;
      this.hpTexts.forEach((el) => {
        el.textContent = label;
      });
      this.mobileHpText.textContent = `${Math.ceil(run.hp)}`;
    }
    this.hpFills.forEach((fill) => fill.classList.toggle('is-low', hpRatio <= 0.25));
    this.element.classList.toggle('is-low-hp', hpRatio <= 0.25);
    this.hpPanelHint(hpRatio);

    const score = formatNumber(run.score);
    if (score !== this.cachedScore) {
      this.cachedScore = score;
      this.scoreEls.forEach((el) => {
        el.textContent = score;
      });
    }

    const depth = run.floor === 9 ? 'LE NOYAU' : `ÉTAGE ${run.floor} / 9`;
    if (depth !== this.cachedDepth) {
      this.cachedDepth = depth;
      this.depthEls.forEach((el) => {
        el.textContent = depth;
      });
      this.pips.forEach((pip, index) => {
        const floor = index + 1;
        pip.classList.toggle('is-current', floor === run.floor);
        pip.classList.toggle('is-done', floor < run.floor);
      });
    }

    const combo = Math.max(0, snapshot.combo);
    const comboLabel = `×${combo}`;
    this.comboEl.textContent = comboLabel;
    this.comboBigEl.textContent = comboLabel;
    this.mobileComboEl.textContent = comboLabel;
    this.comboPillValue.textContent = String(combo);
    this.comboFill.style.width = `${Math.max(0, Math.min(1, snapshot.comboRatio)) * 100}%`;
    this.comboPill.hidden = combo < 2;
    this.comboPill.classList.toggle('is-hot', combo >= 5);
    this.comboEl.classList.toggle('is-hot', combo >= 2);
    this.element.classList.toggle('has-combo', combo >= 2);

    this.dodgesEl.textContent = formatNumber(run.stats.dodges);
    this.sharesEls.forEach((el) => {
      el.textContent = String(run.shares);
    });
    this.sharesBadge.textContent = String(run.shares);
    this.sharesBadge.classList.toggle('is-empty', run.shares <= 0);
    this.shareButton.disabled = run.shares <= 0 || snapshot.shareCooldown > 0;
    this.shareButton.classList.toggle('is-empty', run.shares <= 0);
    this.setCooldown(this.shareButton, snapshot.shareCooldown);

    const commentLocked = snapshot.debuff === 'comments';
    this.commentButton.disabled = snapshot.commentCooldown > 0.01 || commentLocked;
    this.commentButton.classList.toggle('is-locked', commentLocked);
    this.commentButton.classList.toggle('is-active-shield', snapshot.shieldRemaining > 0);
    this.setCooldown(this.commentButton, snapshot.commentCooldown);
    this.commentExtra.textContent =
      snapshot.shieldRemaining > 0 ? `${snapshot.shieldRemaining.toFixed(1)} s` : '';
    this.element.classList.toggle('is-shielded', snapshot.shieldRemaining > 0);

    this.setCooldown(this.likeButton, snapshot.likeCooldown);
    this.likeButton.classList.toggle('is-cooling', snapshot.likeCooldown > 0.01);
    this.setCooldown(this.dodgeButton, snapshot.dodgeCooldown);
    this.dodgeButton.disabled = snapshot.dodgeCooldown > 0.01;
    this.dodgeButton.classList.toggle('is-dodge-active', snapshot.dodgeRemaining > 0);

    this.ignoreButton.classList.toggle('is-armed', snapshot.target?.sponsored === true);
    this.ignoreButton.classList.toggle('is-inactive', snapshot.target?.sponsored !== true);

    this.updateTarget(snapshot.target);
    this.updateThreat(snapshot.threat);
    this.updateDebuff(snapshot.debuff);
    this.updateBoss(snapshot.boss, snapshot);
    this.setShuffle(snapshot.debuff === 'shuffle');

    if (snapshot.roomCleared) {
      this.element.classList.add('is-room-cleared');
    } else {
      this.element.classList.remove('is-room-cleared');
    }
  }

  private hpPanelHint(ratio: number): void {
    if (ratio <= 0.25) {
      this.hpHint.textContent = 'DANGER : le fil te réclame. Partage ou esquive.';
    } else if (ratio <= 0.5) {
      this.hpHint.textContent = 'Ça saigne. Enfin, numériquement.';
    } else {
      this.hpHint.textContent = 'Reste au-dessus de zéro.';
    }
  }

  private setCooldown(button: HTMLButtonElement, fraction: number): void {
    const veil = button.querySelector<HTMLElement>('[data-cd]');
    const clamped = Math.max(0, Math.min(1, fraction));
    if (veil) veil.style.height = `${clamped * 100}%`;
    button.classList.toggle('is-cooling', clamped > 0.01);
  }

  private updateTarget(target: TargetSnapshot | null): void {
    const signature = target
      ? `${target.id}:${Math.ceil(target.hp)}:${target.kind}`
      : 'none';
    if (signature === this.cachedTargetSignature) return;
    this.cachedTargetSignature = signature;

    if (!target) {
      this.targetCard.classList.add('is-empty');
      this.targetAvatar.textContent = '◎';
      this.targetName.textContent = 'Aucune cible';
      this.targetHandle.textContent = 'Scrolle dans le fil';
      this.targetHp.style.width = '0%';
      this.targetHpText.textContent = '—';
      this.targetWarning.hidden = true;
      this.dockTarget.innerHTML =
        '<span class="action-dock__target-dot" aria-hidden="true"></span><span data-dock-target-text>Aucune cible — scrolle dans le fil</span>';
      this.element.classList.remove('has-target');
      return;
    }

    this.targetCard.classList.remove('is-empty');
    this.targetAvatar.textContent = target.avatar;
    this.targetName.textContent = target.name;
    this.targetHandle.textContent = target.handle;
    const ratio = target.maxHp > 0 ? Math.max(0, target.hp / target.maxHp) : 0;
    this.targetHp.style.width = `${ratio * 100}%`;
    this.targetHpText.textContent = `${Math.ceil(target.hp)}`;
    this.targetWarning.hidden = !target.sponsored;
    this.targetWarning.textContent = target.sponsored
      ? '⚠ Pub piégée : « Ignorer » la désamorce. Un like la fait exploser.'
      : '';
    this.dockTarget.innerHTML = '<span class="action-dock__target-dot" aria-hidden="true"></span><span data-dock-target-text></span>';
    const dockText = this.dockTarget.querySelector<HTMLElement>('[data-dock-target-text]');
    if (dockText) {
      dockText.textContent = target.sponsored
        ? `Cible : ${target.handle} · ⚠ PUB PIÉGÉE → IGNORER`
        : `Cible : ${target.name} · ${target.handle}`;
    }
    this.dockTarget.classList.toggle('is-warning', target.sponsored);
    this.element.classList.add('has-target');
  }

  private updateThreat(threat: ThreatSnapshot | null): void {
    if (!threat) {
      if (!this.threatBanner.hidden) {
        this.threatBanner.hidden = true;
        this.threatBanner.classList.remove('is-visible', 'is-urgent');
        this.element.classList.remove('is-threatened');
      }
      this.cachedThreatSignature = '';
      return;
    }
    if (this.threatBanner.hidden) {
      this.threatBanner.hidden = false;
      this.element.classList.add('is-threatened');
    }
    this.threatBanner.classList.add('is-visible');
    const signature = `${threat.source}:${threat.text}`;
    if (signature !== this.cachedThreatSignature) {
      this.cachedThreatSignature = signature;
      this.threatTitle.textContent = threat.source;
      this.threatSource.textContent = threat.text;
    }
    this.threatAction.textContent = threat.action;
    this.threatTime.textContent = `${Math.max(0, threat.remaining).toFixed(1)} s`;
    const progress = threat.total > 0 ? Math.max(0, Math.min(1, threat.remaining / threat.total)) : 0;
    this.threatFill.style.width = `${progress * 100}%`;
    this.threatBanner.classList.toggle('is-urgent', threat.remaining <= 0.45);
  }

  private updateDebuff(debuff: 'comments' | 'shuffle' | null): void {
    if (this.cachedDebuff === debuff) return;
    this.cachedDebuff = debuff;
    if (!debuff) {
      this.debuffBanner.hidden = true;
      this.element.classList.remove('has-comment-lock', 'has-interface-lock');
      return;
    }
    this.debuffBanner.hidden = false;
    this.element.classList.toggle('has-comment-lock', debuff === 'comments');
    this.element.classList.toggle('has-interface-lock', debuff === 'shuffle');
    if (debuff === 'comments') {
      this.debuffIcon.textContent = '💬';
      this.debuffTitle.textContent = 'COMMENTAIRES DÉSACTIVÉS';
      this.debuffDesc.textContent = 'Un troll a fermé les réponses. Esquive ou encaisse.';
    } else {
      this.debuffIcon.textContent = '🧩';
      this.debuffTitle.textContent = 'INTERFACE PIRATÉE';
      this.debuffDesc.textContent = 'Les boutons changent de place. Les raccourcis clavier restent stables.';
    }
  }

  private updateBoss(boss: BossRuntime | null, snapshot: HudSnapshot): void {
    if (!boss) {
      if (!this.bossStrip.hidden) setHidden(this.bossStrip, true);
      this.element.classList.remove('is-boss-room');
      this.cachedBossSignature = '';
      return;
    }
    setHidden(this.bossStrip, false);
    this.element.classList.add('is-boss-room');
    const ratio = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
    this.bossHpFill.style.width = `${ratio * 100}%`;
    this.bossHpText.textContent = `${Math.ceil(boss.hp)}`;
    this.bossStatus.textContent =
      boss.status === 'vulnerable' ? 'VULNÉRABLE' : boss.status === 'armored' ? 'PAREFEU' : 'MUTATION';
    this.bossStatus.className = `boss-status boss-status--${boss.status}`;
    this.bossPhaseEl.textContent = `PHASE ${boss.phase} / 3`;
    this.bossAbility.textContent = boss.ability
      ? `CAPACITÉ : ${BOSS_ABILITY_INFO[boss.ability].title.toUpperCase()}`
      : 'EN ATTENTE';
    const signature = `${boss.phase}:${boss.status}:${Math.ceil(boss.hp)}:${boss.ability ?? ''}`;
    if (signature !== this.cachedBossSignature) {
      this.cachedBossSignature = signature;
      this.bossStrip.classList.remove('is-hit');
      void this.bossStrip.offsetWidth;
      this.bossStrip.classList.add('is-hit');
    }
    this.element.classList.toggle('is-boss-vulnerable', boss.status === 'vulnerable');
    this.element.classList.toggle('is-boss-armored', boss.status === 'armored');
    this.element.classList.toggle(
      'is-urgent-threat',
      snapshot.threat !== null && snapshot.threat.remaining <= 0.6,
    );
  }

  private setShuffle(shuffled: boolean): void {
    if (shuffled === this.lastShuffled) return;
    this.lastShuffled = shuffled;
    if (!shuffled) {
      this.actionButtons.forEach((button) => this.actionContainer.append(button));
      this.actionContainer.classList.remove('is-shuffled');
      return;
    }
    this.actionButtons.forEach((button) => this.actionContainer.append(button));
    const shuffledButtons = [...this.actionButtons].sort(() => Math.random() - 0.5);
    shuffledButtons.forEach((button) => this.actionContainer.append(button));
    this.actionContainer.classList.add('is-shuffled');
  }

  setAdvance(label: string): void {
    setHidden(this.advanceButton, false);
    this.advanceButton.innerHTML = `${label} ${icon('arrowDown')}`;
    if (this.feedRefs?.exitButton) {
      setHidden(this.feedRefs.exitButton, false);
      this.feedRefs.exitButton.textContent = label;
    }
    this.element.classList.add('is-room-cleared');
  }

  hideAdvance(): void {
    setHidden(this.advanceButton, true);
    if (this.feedRefs?.exitButton) setHidden(this.feedRefs.exitButton, true);
    this.element.classList.remove('is-room-cleared');
  }

  markRoomCleared(boss: boolean): void {
    if (!this.feedRefs) return;
    setFeedCleared(this.feedRefs, boss);
    this.feedStatus.textContent = boss
      ? 'Le noyau est hors ligne.'
      : 'Salle nettoyée. La descente est ouverte.';
    this.setHint(
      '🚪',
      boss ? 'Le noyau est tombé' : 'Salle nettoyée',
      boss ? 'La descente est terminée.' : 'Utilise Descendre pour rejoindre l’étage suivant.',
    );
    this.threatBanner.hidden = true;
    this.element.classList.remove('is-threatened');
  }

  updateExitProgress(remaining: number): void {
    if (this.feedRefs) setExitProgress(this.feedRefs, remaining);
    if (remaining > 0) {
      this.feedStatus.textContent = `${remaining} hostile${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}.`;
    }
  }

  setFeedStatus(text: string): void {
    this.feedStatus.textContent = text;
  }

  setHint(iconText: string, title: string, text: string): void {
    this.hintCardIcon.textContent = iconText;
    this.hintCardTitle.textContent = title;
    this.hintCardText.textContent = text;
  }

  showFakeLikes(): void {
    this.fakeLikeLayer.classList.add('is-active');
  }

  hideFakeLikes(): void {
    this.fakeLikeLayer.classList.remove('is-active');
    this.fakeLikes.forEach((button) => button.remove());
    this.fakeLikes.clear();
  }

  spawnFakeLike(x: number, y: number, onClick: () => void): string {
    const id = `fake-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fake-like';
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.innerHTML = `<span>♥</span><b>Liker ce post</b><small>+500 pts</small>`;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
      button.remove();
      this.fakeLikes.delete(id);
    });
    this.fakeLikeLayer.append(button);
    this.fakeLikes.set(id, button);
    return id;
  }

  removeFakeLike(id: string): void {
    const button = this.fakeLikes.get(id);
    button?.remove();
    this.fakeLikes.delete(id);
  }

  scrollToExit(): void {
    this.feedScroll.scrollTo({ top: this.feedScroll.scrollHeight, behavior: 'smooth' });
  }

  getAdvanceButton(): HTMLButtonElement {
    return this.advanceButton;
  }

  destroy(): void {
    this.hideFakeLikes();
  }
}
