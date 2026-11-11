import { formatCompact } from './dom';
import { BOSS_ABILITY_INFO } from '../entities/bosses';
import type {
  BossRuntime,
  EnemyRuntime,
  GeneratedRoom,
  FillerPost,
} from '../core/types';

export interface EnemyCardRefs {
  card: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  stateLabel: HTMLElement;
  timerWrap: HTMLElement;
  timerFill: HTMLElement;
  timerText: HTMLElement;
  targetButton: HTMLButtonElement;
  targetLabel: HTMLElement;
  likes: HTMLElement;
}

export interface FeedRefs {
  content: HTMLElement;
  scroll: HTMLElement;
  enemyNodes: Map<string, EnemyCardRefs>;
  bossNode: EnemyCardRefs | null;
  exitCard: HTMLElement | null;
  exitButton: HTMLButtonElement | null;
  exitTitle: HTMLElement | null;
  exitCopy: HTMLElement | null;
  exitLock: HTMLElement | null;
}

export interface FeedHandlers {
  onSelectEnemy: (id: string) => void;
  onAdvance: () => void;
}

function formatTimeLeft(seconds: number): string {
  return `${Math.max(0, seconds).toFixed(1)} s`;
}

export function buildFeed(
  content: HTMLElement,
  room: GeneratedRoom,
  boss: BossRuntime | null,
  handlers: FeedHandlers,
): FeedRefs {
  content.replaceChildren();
  const enemyNodes = new Map<string, EnemyCardRefs>();
  let bossNode: EnemyCardRefs | null = null;

  content.append(createRoomIntro(room));

  let lastPost: HTMLElement = content.firstElementChild as HTMLElement;

  if (boss) {
    bossNode = createEnemyCard(boss.id, boss.name, boss.handle, boss.avatar, boss.text, 'boss', true, handlers);
    content.append(bossNode.card);
    lastPost = bossNode.card;
  }

  const enemyCards = room.enemies.map((enemy) => {
    const node = createEnemyCard(
      enemy.id,
      enemy.name,
      enemy.handle,
      enemy.avatar,
      enemy.text,
      enemy.kind,
      false,
      handlers,
      enemy.elite,
    );
    enemyNodes.set(enemy.id, node);
    return node.card;
  });

  const fillerNodes = room.filler.map(createFillerPost);
  const total = Math.max(enemyCards.length, fillerNodes.length);
  for (let i = 0; i < total; i++) {
    const enemyCard = enemyCards[i];
    if (enemyCard) {
      content.append(enemyCard);
      lastPost = enemyCard;
    }
    const filler = fillerNodes[i];
    if (filler) {
      content.append(filler);
      lastPost = filler;
    }
  }

  const exitCard = createExitCard(room, handlers.onAdvance);
  content.append(exitCard.element);
  lastPost = exitCard.element;

  const loading = document.createElement('div');
  loading.className = 'feed-loading';
  loading.innerHTML = '<span></span><span></span><span></span><small>Chargement de l’abîme…</small>';
  content.append(loading);

  if (lastPost) {
    // Les cartes d'ennemis et la sortie partagent le même fond de post.
    lastPost.classList.add('post--adjacent');
  }

  return {
    content,
    scroll: content.closest<HTMLElement>('.feed-scroll') ?? content,
    enemyNodes,
    bossNode,
    exitCard: exitCard.element,
    exitButton: exitCard.button,
    exitTitle: exitCard.title,
    exitCopy: exitCard.copy,
    exitLock: exitCard.lock,
  };
}

function createRoomIntro(room: GeneratedRoom): HTMLElement {
  const article = document.createElement('article');
  article.className = 'post room-intro';
  article.innerHTML = `
    <div class="room-intro__top">
      <div class="room-intro__badge">ÉTAGE <strong></strong> / ${room.totalFloors}</div>
      <div class="room-intro__theme"><span></span><strong></strong></div>
      <span class="room-intro__live"><i></i> FIL EN DIRECT</span>
    </div>
    <div class="room-intro__hero">
      <div class="room-intro__avatar">${room.isBoss ? '🧠' : '⌁'}</div>
      <div class="room-intro__copy">
        <span class="room-intro__author">${room.isBoss ? 'L’Algorithme' : 'Chronofil'}</span>
        <p class="room-intro__desc"></p>
      </div>
    </div>
    <div class="room-objective">
      <span class="room-objective__icon">◎</span>
      <div><small>OBJECTIF DE LA SALLE</small><p></p></div>
    </div>
    ${
      room.event
        ? `<div class="room-event-chip"><span>${room.event.icon}</span><div><b>ÉVÉNEMENT : ${room.event.name}</b><small>${room.event.description}</small></div></div>`
        : ''
    }
  `;
  const stage = article.querySelector<HTMLElement>('.room-intro__badge strong');
  if (stage) stage.textContent = String(room.floor);
  const themeName = article.querySelector<HTMLElement>('.room-intro__theme strong');
  if (themeName) themeName.textContent = room.theme.name;
  const desc = article.querySelector<HTMLElement>('.room-intro__desc');
  if (desc) desc.textContent = room.theme.description;
  const objective = article.querySelector<HTMLElement>('.room-objective p');
  if (objective) objective.textContent = room.objective;
  const themeDot = article.querySelector<HTMLElement>('.room-intro__theme span');
  if (themeDot) themeDot.style.background = room.theme.accent;
  article.style.setProperty('--accent', room.theme.accent);
  return article;
}

function createFillerPost(post: FillerPost): HTMLElement {
  const article = document.createElement('article');
  article.className = 'post filler-post';
  article.innerHTML = `
    <header class="post-head">
      <div class="post-avatar"></div>
      <div class="post-head__copy">
        <div class="post-head__line"><strong data-author></strong><span class="post-badge post-badge--muted" data-tag hidden></span></div>
        <span class="post-handle"><span data-handle></span> · <span data-time></span></span>
      </div>
      <span class="post-more" aria-hidden="true">···</span>
    </header>
    <p class="post-text" data-text></p>
    <div class="post-engagement" aria-hidden="true">
      <span>♥ <b data-likes></b></span>
      <span>💬 <b data-comments></b></span>
      <span>↻ <b data-shares></b></span>
    </div>
  `;
  const avatar = article.querySelector<HTMLElement>('.post-avatar');
  if (avatar) avatar.textContent = post.avatar;
  const author = article.querySelector<HTMLElement>('[data-author]');
  if (author) author.textContent = post.author;
  const handle = article.querySelector<HTMLElement>('[data-handle]');
  if (handle) handle.textContent = post.handle;
  const time = article.querySelector<HTMLElement>('[data-time]');
  if (time) time.textContent = post.time;
  const text = article.querySelector<HTMLElement>('[data-text]');
  if (text) text.textContent = post.text;
  const likes = article.querySelector<HTMLElement>('[data-likes]');
  if (likes) likes.textContent = formatCompact(post.likes);
  const comments = article.querySelector<HTMLElement>('[data-comments]');
  if (comments) comments.textContent = formatCompact(post.comments);
  const shares = article.querySelector<HTMLElement>('[data-shares]');
  if (shares) shares.textContent = formatCompact(Math.floor(post.likes / 8));
  if (post.tag) {
    const tag = article.querySelector<HTMLElement>('[data-tag]');
    if (tag) {
      tag.textContent = post.tag;
      tag.hidden = false;
    }
  }
  return article;
}

function createEnemyCard(
  id: string,
  name: string,
  handle: string,
  avatar: string,
  text: string,
  kind: EnemyRuntime['kind'] | 'boss',
  isBoss: boolean,
  handlers: FeedHandlers,
  elite = false,
): EnemyCardRefs {
  const article = document.createElement('article');
  article.className = `post enemy-card enemy-card--${kind}${isBoss ? ' boss-card' : ''}${elite ? ' is-elite' : ''}`;
  article.dataset.enemyId = id;
  article.innerHTML = `
    <span class="enemy-card__scanline" aria-hidden="true"></span>
    <header class="post-head">
      <div class="post-avatar post-avatar--enemy"><span data-avatar></span></div>
      <div class="post-head__copy">
        <div class="post-head__line">
          <strong data-name></strong>
          <span class="post-badge" data-badge></span>
        </div>
        <span class="post-handle"><span data-handle></span> · <span data-time>maintenant</span></span>
      </div>
      <button class="target-chip" type="button" data-target aria-pressed="false" aria-label="Cibler cet ennemi">
        <span class="target-chip__dot" aria-hidden="true"></span>
        <span data-target-label>Cibler</span>
      </button>
    </header>
    <p class="post-text" data-text></p>
    <div class="boss-phase-tag" data-boss-phase hidden></div>
    <div class="post-engagement post-engagement--enemy" aria-hidden="true">
      <span>♥ <b data-likes></b></span>
      <span>💬 <b>???</b></span>
      <span>↻ <b>???</b></span>
    </div>
    <div class="enemy-meter">
      <div class="meter-label">
        <span class="meter-label__hp"><i></i> VIE</span>
        <strong data-hp-text></strong>
        <span class="enemy-state" data-state>En ligne</span>
      </div>
      <div class="bar bar--hp"><i data-hp-fill></i></div>
      <div class="enemy-timer" data-timer hidden>
        <span data-timer-text></span>
        <div class="bar bar--timer"><i data-timer-fill></i></div>
      </div>
    </div>
    <div class="enemy-card__footer">
      <span data-footer-hint>${isBoss ? 'Le noyau du donjon. Trois phases. Zéro pitié.' : 'Touche la carte pour cibler. Like pour attaquer.'}</span>
      <span class="enemy-card__lock">${isBoss ? '☠ BOSS' : '⚔ HOSTILE'}</span>
    </div>
  `;

  const q = <T extends Element>(selector: string) => {
    const node = article.querySelector<T>(selector);
    if (!node) throw new Error(`Carte ennemie incomplète : ${selector}`);
    return node;
  };

  q<HTMLElement>('[data-avatar]').textContent = avatar;
  q<HTMLElement>('[data-name]').textContent = name;
  q<HTMLElement>('[data-handle]').textContent = handle;
  q<HTMLElement>('[data-text]').textContent = text;
  q<HTMLElement>('[data-hp-text]').textContent = isBoss ? '—' : '—';
  q<HTMLElement>('[data-hp-fill]').style.width = '100%';
  q<HTMLElement>('[data-likes]').textContent = isBoss ? '∞' : formatCompact(700 + Math.floor(Math.random() * 9000));

  const badge = q<HTMLElement>('[data-badge]');
  badge.textContent =
    kind === 'boss'
      ? 'BOSS'
      : kind === 'sponsored'
        ? 'SPONSORISÉ'
        : kind === 'troll'
          ? 'TROLL'
          : elite
            ? '★ ÉLITE'
            : 'ENNEMI';
  badge.classList.add(`post-badge--${kind}`);

  const target = q<HTMLButtonElement>('[data-target]');
  const select = (event: Event) => {
    event.stopPropagation();
    handlers.onSelectEnemy(id);
  };
  target.addEventListener('click', select);
  article.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button')) return;
    handlers.onSelectEnemy(id);
  });
  article.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !(event.target as HTMLElement).closest('button')) {
      handlers.onSelectEnemy(id);
    }
  });

  return {
    card: article,
    hpFill: q<HTMLElement>('[data-hp-fill]'),
    hpText: q<HTMLElement>('[data-hp-text]'),
    stateLabel: q<HTMLElement>('[data-state]'),
    timerWrap: q<HTMLElement>('[data-timer]'),
    timerFill: q<HTMLElement>('[data-timer-fill]'),
    timerText: q<HTMLElement>('[data-timer-text]'),
    targetButton: target,
    targetLabel: q<HTMLElement>('[data-target-label]'),
    likes: q<HTMLElement>('[data-likes]'),
  };
}

export function appendEnemyCard(
  feed: FeedRefs,
  enemy: EnemyRuntime,
  handlers: FeedHandlers,
): EnemyCardRefs {
  const node = createEnemyCard(
    enemy.id,
    enemy.name,
    enemy.handle,
    enemy.avatar,
    enemy.text,
    enemy.kind,
    false,
    handlers,
    enemy.elite,
  );
  const loading = feed.content.querySelector<HTMLElement>('.feed-loading');
  if (feed.exitCard?.parentElement === feed.content) {
    feed.exitCard.insertAdjacentElement('beforebegin', node.card);
  } else if (loading) {
    loading.insertAdjacentElement('beforebegin', node.card);
  } else {
    feed.content.append(node.card);
  }
  node.card.classList.add('is-spawning');
  feed.enemyNodes.set(enemy.id, node);
  return node;
}

interface ExitCard {
  element: HTMLElement;
  button: HTMLButtonElement;
  title: HTMLElement;
  copy: HTMLElement;
  lock: HTMLElement;
}

function createExitCard(room: GeneratedRoom, onAdvance: () => void): ExitCard {
  const article = document.createElement('article');
  article.className = 'post exit-card';
  article.innerHTML = `
    <div class="exit-card__visual" aria-hidden="true"><span data-lock>🔒</span><div class="exit-card__door"></div></div>
    <div class="exit-card__copy">
      <small>${room.isBoss ? 'DERNIÈRE SORTIE' : 'FIN DE LA SALLE'}</small>
      <strong data-exit-title>${room.isBoss ? 'LE NOYAU BLOQUE LA SORTIE' : 'SORTIE VERROUILLÉE'}</strong>
      <p data-exit-copy>${
        room.isBoss
          ? 'Désinstalle L’Algorithme pour terminer la descente.'
          : 'Neutralise tous les posts hostiles pour déverrouiller la descente.'
      }</p>
      <button class="btn btn-primary exit-card__button" type="button" data-exit-button hidden>
        Descendre d’un étage ${room.isBoss ? '' : '↓'}
      </button>
    </div>
  `;
  const button = article.querySelector<HTMLButtonElement>('[data-exit-button]');
  const title = article.querySelector<HTMLElement>('[data-exit-title]');
  const copy = article.querySelector<HTMLElement>('[data-exit-copy]');
  const lock = article.querySelector<HTMLElement>('[data-lock]');
  if (!button || !title || !copy || !lock) {
    throw new Error('Carte de sortie incomplète');
  }
  button.addEventListener('click', onAdvance);
  return { element: article, button, title, copy, lock };
}

export function setFeedCleared(feed: FeedRefs, isBoss = false): void {
  if (!feed.exitCard) return;
  feed.exitCard.classList.add('is-unlocked');
  if (feed.exitLock) feed.exitLock.textContent = isBoss ? '☠' : '🔓';
  if (feed.exitTitle) {
    feed.exitTitle.textContent = isBoss ? 'LE NOYAU EST TOMBÉ' : 'SORTIE DÉVERROUILLÉE';
  }
  if (feed.exitCopy) {
    feed.exitCopy.textContent = isBoss
      ? 'La descente est terminée. L’Algorithme te recommande de ne plus revenir.'
      : 'La salle est propre. Descends avant que de nouveaux posts n’apparaissent.';
  }
  if (feed.exitButton) {
    feed.exitButton.hidden = true;
  }
}

export function setExitProgress(feed: FeedRefs, remaining: number): void {
  if (!feed.exitCard || remaining <= 0) return;
  if (feed.exitCopy) {
    feed.exitCopy.textContent =
      remaining === 1
        ? 'Encore 1 post hostile à neutraliser avant la descente.'
        : `Encore ${remaining} posts hostiles à neutraliser avant la descente.`;
  }
}

export function updateEnemyCard(
  refs: EnemyCardRefs,
  enemy: EnemyRuntime | BossRuntime,
  isTarget: boolean,
  isBoss: boolean,
): void {
  const alive = enemy.alive;
  const hpRatio = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 0;
  refs.hpFill.style.width = `${Math.max(0, hpRatio) * 100}%`;
  refs.hpText.textContent = `${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}`;
  refs.card.classList.toggle('is-targeted', isTarget && alive);
  refs.card.classList.toggle('is-dead', !alive);
  refs.card.classList.toggle('is-low', hpRatio <= 0.3 && alive);
  refs.targetButton.disabled = !alive;
  refs.targetButton.setAttribute('aria-pressed', String(isTarget && alive));
  refs.targetLabel.textContent = isTarget ? 'Ciblé' : 'Cibler';
  refs.card.style.setProperty('--hp-ratio', String(hpRatio));

  if (!alive) {
    const label =
      'resolution' in enemy && enemy.resolution
        ? {
            defeated: '☠ NEUTRALISÉ',
            ignored: '🙈 IGNORÉ',
            exploded: '💥 EXPLOSÉ',
            expired: '💥 EXPLOSÉ',
            blocked: '🚫 BLOQUÉ',
          }[enemy.resolution]
        : '☠ NEUTRALISÉ';
    refs.stateLabel.textContent = label;
    refs.card.classList.add('is-resolved');
    refs.timerWrap.hidden = true;
    return;
  }

  if ('phase' in enemy) {
    refs.card.classList.toggle('is-armored', enemy.status === 'armored');
    refs.card.classList.toggle('is-transitioning', enemy.status === 'transition');
    const phaseLabel = document.createElement('span');
    phaseLabel.textContent = `PHASE ${enemy.phase} · ${enemy.status === 'vulnerable' ? 'VULNÉRABLE' : enemy.status === 'armored' ? 'PAREFEU' : 'MUTATION'}`;
    refs.stateLabel.textContent = phaseLabel.textContent;
    refs.stateLabel.className = `enemy-state boss-state boss-state--${enemy.status}`;
    const phaseTag = refs.card.querySelector<HTMLElement>('[data-boss-phase]');
    if (phaseTag) {
      phaseTag.hidden = false;
      phaseTag.textContent = `PHASE ${enemy.phase} / 3`;
      phaseTag.querySelectorAll('i').forEach((pip, index) => {
        pip.classList.toggle('is-active', index < enemy.phase);
      });
    }
    if (enemy.ability && enemy.telegraphRemaining > 0) {
      refs.timerWrap.hidden = false;
      refs.timerWrap.classList.add('is-danger');
      refs.timerText.textContent = `⚠ ${BOSS_ABILITY_INFO[enemy.ability].title.toUpperCase()} · ${formatTimeLeft(enemy.telegraphRemaining)}`;
      const total = Math.max(0.01, enemy.telegraphTotal);
      refs.timerFill.style.width = `${Math.max(0, Math.min(1, enemy.telegraphRemaining / total)) * 100}%`;
    } else {
      refs.timerWrap.hidden = true;
      refs.timerWrap.classList.remove('is-danger');
    }
    return;
  }

  if (enemy.kind === 'sponsored') {
    refs.timerWrap.hidden = false;
    refs.timerWrap.classList.add('is-fuse');
    refs.timerText.textContent = `🧨 EXPLOSE DANS ${formatTimeLeft(enemy.sponsorFuse)}`;
    refs.timerFill.style.width = `${Math.max(0, Math.min(1, enemy.sponsorFuse / (enemy.sponsorFuseTotal || 1))) * 100}%`;
    refs.stateLabel.textContent = 'PIÈGE SPONSORISÉ';
    refs.card.classList.add('is-sponsored');
  } else if (enemy.telegraphRemaining > 0) {
    refs.timerWrap.hidden = false;
    refs.timerWrap.classList.add('is-danger');
    refs.timerText.textContent = `⚠ ATTAQUE · ${formatTimeLeft(enemy.telegraphRemaining)}`;
    refs.timerFill.style.width = `${Math.max(0, Math.min(1, enemy.telegraphRemaining / Math.max(0.01, enemy.telegraphTotal))) * 100}%`;
  } else {
    refs.timerWrap.hidden = true;
    refs.timerWrap.classList.remove('is-danger');
  }

  refs.card.classList.toggle('is-telegraphing', enemy.telegraphRemaining > 0);
  refs.card.classList.toggle('is-taunting', enemy.taunting);
  refs.card.classList.toggle('is-enraged', enemy.enrage > 0);

  if (enemy.taunting) {
    refs.stateLabel.textContent = 'PROVOCATION — ATTENDS';
  } else if (enemy.enrage > 0) {
    refs.stateLabel.textContent = `ENRAGÉ +${enemy.enrage}`;
  } else if (enemy.telegraphRemaining > 0) {
    refs.stateLabel.textContent = '⚠ ATTAQUE IMMINENTE';
  } else if (enemy.kind === 'sponsored') {
    refs.stateLabel.textContent = 'PIÈGE SPONSORISÉ';
  } else {
    refs.stateLabel.textContent = enemy.kind === 'troll' ? 'PIRATE L’INTERFACE' : 'EN LIGNE';
  }
}

export function scrollFeedToBottom(feed: FeedRefs, smooth = true): void {
  if (!feed.scroll) return;
  feed.scroll.scrollTo({
    top: feed.scroll.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

export function scrollFeedToTop(feed: FeedRefs): void {
  feed.scroll.scrollTo({ top: 0, behavior: 'auto' });
}
