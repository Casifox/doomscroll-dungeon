import { formatNumber } from '../core/game-state';
import { randomSeed, sanitizeSeed } from '../core/rng';
import type { Profile, RunState, Settings, UpgradeId } from '../core/types';
import { getUpgrade } from '../systems/progression';
import { qs } from './dom';
import { icon } from './icons';
import { clearToasts } from './toast';

interface OverlayOptions {
  content: string;
  className?: string;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
  onKey?: (event: KeyboardEvent) => boolean | void;
}

interface OverlayEntry {
  layer: HTMLDivElement;
  panel: HTMLElement;
  dismissible: boolean;
  closeOnBackdrop: boolean;
  onClose?: () => void;
  onKey?: (event: KeyboardEvent) => boolean | void;
  previousFocus: Element | null;
  closed: boolean;
}

const overlayStack: OverlayEntry[] = [];
let overlayCounter = 0;

function focusableElements(panel: HTMLElement): HTMLElement[] {
  const selectors =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(panel.querySelectorAll<HTMLElement>(selectors)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

function closeEntry(entry: OverlayEntry): void {
  if (entry.closed) return;
  entry.closed = true;
  const index = overlayStack.indexOf(entry);
  if (index >= 0) overlayStack.splice(index, 1);
  entry.layer.classList.add('overlay-layer--closing');
  window.setTimeout(() => entry.layer.remove(), 180);
  if (overlayStack.length === 0) {
    document.body.classList.remove('has-overlay');
  }
  const previous = entry.previousFocus;
  if (previous instanceof HTMLElement && previous.isConnected) {
    previous.focus({ preventScroll: true });
  }
  entry.onClose?.();
}

function closeTopOverlay(): void {
  const top = overlayStack[overlayStack.length - 1];
  if (top && top.dismissible) closeEntry(top);
}

export function isOverlayOpen(): boolean {
  return overlayStack.length > 0;
}

export function closeAllOverlays(): void {
  while (overlayStack.length > 0) {
    const top = overlayStack[overlayStack.length - 1];
    if (!top) break;
    closeEntry(top);
  }
}

export function openModal(options: OverlayOptions): {
  layer: HTMLDivElement;
  panel: HTMLElement;
  close: () => void;
} {
  clearToasts();
  const root = qs<HTMLElement>('#overlay-root');
  const layer = document.createElement('div');
  layer.className = `overlay-layer ${options.className ?? ''}`;
  layer.style.zIndex = String(100 + overlayCounter++);
  layer.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal__close" type="button" aria-label="Fermer">
        ${icon('close')}
      </button>
      ${options.content}
    </div>
  `;
  const panel = qs<HTMLElement>('.modal', layer);
  const entry: OverlayEntry = {
    layer,
    panel,
    dismissible: options.dismissible ?? true,
    closeOnBackdrop: options.closeOnBackdrop ?? false,
    onClose: options.onClose,
    onKey: options.onKey,
    previousFocus: document.activeElement,
    closed: false,
  };
  overlayStack.push(entry);
  root.append(layer);
  document.body.classList.add('has-overlay');
  const wasDismissible = entry.dismissible;
  const closeButton = qs<HTMLButtonElement>('.modal__close', layer);
  closeButton.hidden = !wasDismissible;
  closeButton.addEventListener('click', () => closeEntry(entry));
  qs<HTMLElement>('.overlay-backdrop', layer).addEventListener('click', () => {
    if (entry.closeOnBackdrop && entry.dismissible) closeEntry(entry);
  });

  // Ferme les éventuels boutons marqués data-modal-close.
  layer.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => closeEntry(entry));
  });

  window.requestAnimationFrame(() => {
    const autofocus = layer.querySelector<HTMLElement>('[autofocus]');
    const first = autofocus ?? focusableElements(panel)[0];
    first?.focus({ preventScroll: true });
  });

  return {
    layer,
    panel,
    close: () => closeEntry(entry),
  };
}

document.addEventListener('keydown', (event) => {
  const top = overlayStack[overlayStack.length - 1];
  if (!top) return;
  if (top.onKey?.(event)) {
    event.stopPropagation();
    return;
  }
  if (event.key === 'Escape') {
    if (top.dismissible) {
      event.preventDefault();
      event.stopPropagation();
      closeEntry(top);
    }
    return;
  }
  if (event.key === 'Tab') {
    const focusable = focusableElements(top.panel);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

/* ------------------------------------------------------------------ */
/* Préparation de partie                                              */
/* ------------------------------------------------------------------ */

export interface RunSetupOptions {
  initialSeed?: string;
  savedRunFloor?: number | null;
  onLaunch: (seed: string) => void;
  onClose?: () => void;
}

const CONTROL_ROWS = [
  { icon: 'heart', key: 'Espace', label: 'Liker', desc: 'Attaquer la cible' },
  { icon: 'comment', key: 'C', label: 'Commenter', desc: 'Bouclier temporaire' },
  { icon: 'share', key: 'S', label: 'Partager', desc: 'Soigner (limité)' },
  { icon: 'eyeOff', key: 'X', label: 'Ignorer', desc: 'Désamorcer une pub' },
  { icon: 'wind', key: 'Maj ↓', label: 'Esquiver', desc: 'Molette rapide aussi' },
  { icon: 'pause', key: 'Échap', label: 'Pause', desc: 'Souffler un peu' },
] as const;

export function openRunSetup(options: RunSetupOptions): void {
  const controls = CONTROL_ROWS.map(
    (control) => `
      <div class="setup-control">
        <span class="setup-control__icon">${icon(control.icon as Parameters<typeof icon>[0])}</span>
        <span class="setup-control__copy"><b>${control.label}</b><small>${control.desc}</small></span>
        <kbd>${control.key}</kbd>
      </div>
    `,
  ).join('');

  const modal = openModal({
    className: 'overlay-layer--setup',
    content: `
      <div class="modal-head">
        <span class="modal-kicker">${icon('seed')} NOUVELLE DESCENTE</span>
        <h2 id="modal-title">Prépare ton scroll</h2>
        <p>8 étages de posts hostiles, puis <strong>L’Algorithme</strong>. Une partie dure 5 à 8 minutes. Une graine peut être partagée avec un ami.</p>
      </div>
      <div class="seed-box">
        <label for="seed-input">GRAINE DU DONJON <span>optionnel</span></label>
        <div class="seed-row">
          <input id="seed-input" class="seed-input" type="text" maxlength="16" inputmode="text" autocomplete="off" spellcheck="false" placeholder="ex. RATIO-2026" value="${sanitizeSeed(options.initialSeed ?? '')}" />
          <button class="btn btn-soft seed-random" type="button" title="Générer une graine aléatoire">${icon('dice')} Aléatoire</button>
        </div>
        <p class="seed-help">Même graine = mêmes salles, mêmes ennemis. Parfait pour comparer les scores.</p>
      </div>
      <div class="setup-controls">${controls}</div>
      ${
        options.savedRunFloor
          ? `<p class="setup-warning">${icon('info')} Une descente sauvegardée à l’étage ${options.savedRunFloor} sera remplacée.</p>`
          : ''
      }
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-modal-close>Annuler</button>
        <button class="btn btn-primary btn-launch" type="button" data-launch>
          <span>Lancer la descente</span>
          ${icon('arrowRight')}
        </button>
      </div>
    `,
    closeOnBackdrop: true,
    onClose: options.onClose,
  });

  const input = qs<HTMLInputElement>('#seed-input', modal.panel);
  const launch = () => {
    const seed = sanitizeSeed(input.value) || randomSeed();
    modal.close();
    options.onLaunch(seed);
  };
  qs<HTMLButtonElement>('[data-launch]', modal.panel).addEventListener('click', launch);
  qs<HTMLButtonElement>('.seed-random', modal.panel).addEventListener('click', () => {
    input.value = randomSeed();
    input.focus();
    input.select();
  });
  input.addEventListener('input', () => {
    const cleaned = sanitizeSeed(input.value);
    if (input.value !== cleaned) input.value = cleaned;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      launch();
    }
  });
  window.setTimeout(() => {
    input.focus();
    input.select();
  }, 80);
}

/* ------------------------------------------------------------------ */
/* Tutoriel                                                           */
/* ------------------------------------------------------------------ */

interface TutorialStep {
  kicker: string;
  title: string;
  text: string;
  tips: string[];
  visual: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    kicker: 'ÉTAPE 01 · LE SCROLL',
    title: 'Descends dans le fil',
    text: 'Le donjon est un fil d’actualité. Fais défiler le flux avec la molette, ton doigt ou le bouton Descendre.',
    tips: [
      'Les posts en bas du fil cachent la sortie.',
      'Un scroll rapide déclenche aussi une esquive.',
      'Tu n’as jamais besoin de deviner : les flèches t’indiquent la suite.',
    ],
    visual: `
      <div class="tut-feed">
        <div class="tut-feed__post"><span class="tut-avatar">😡</span><i></i><i></i></div>
        <div class="tut-feed__post"><span class="tut-avatar">🤡</span><i></i><i></i></div>
        <div class="tut-feed__exit">↓ SORTIE</div>
      </div>
      <div class="tut-scroll-hint">${icon('arrowDown')} molette / glissement</div>
    `,
  },
  {
    kicker: 'ÉTAPE 02 · L’ATTAQUE',
    title: 'Like pour éliminer',
    text: 'Chaque like attaque la cible sélectionnée. Enchaîne les likes rapidement pour faire monter ton combo et tes dégâts.',
    tips: [
      'Touche un post pour choisir ta cible.',
      'Les combos augmentent les dégâts et le score.',
      'Le Ragebait devient fou si tu likes pendant sa provocation.',
    ],
    visual: `
      <div class="tut-like-demo">
        <span class="tut-enemy-avatar">😡</span>
        <div class="tut-enemy-bar"><i></i></div>
        <button class="tut-heart-button">♥ <span>LIKE</span></button>
        <div class="tut-combo">COMBO ×5 <small>+ dégâts</small></div>
      </div>
    `,
  },
  {
    kicker: 'ÉTAPE 03 · LA DÉFENSE',
    title: 'Commenter pour bloquer',
    text: 'Commenter déploie un bouclier qui absorbe la majorité des dégâts pendant quelques secondes. Il a un temps de recharge.',
    tips: [
      'Le bouclier est parfait quand plusieurs attaques arrivent ensemble.',
      'Il ne bloque pas les explosions de pubs si elles te surprennent.',
      'Les trolls peuvent temporairement désactiver les commentaires.',
    ],
    visual: `
      <div class="tut-shield-demo">
        <div class="tut-shield-orb">🛡</div>
        <div class="tut-shield-copy"><b>BOUCLIER ACTIF</b><span>72 % des dégâts absorbés</span></div>
        <div class="tut-cooldown"><i></i><small>RECHARGE</small></div>
      </div>
    `,
  },
  {
    kicker: 'ÉTAPE 04 · SOIN & FILTRAGE',
    title: 'Partager, puis ignorer',
    text: 'Partager soigne immédiatement, mais tes réserves sont limitées. Ignorer désamorce les publications sponsorisées sans déclencher leur explosion.',
    tips: [
      '3 partages au départ — tu en récupères parfois entre deux étages.',
      'Ne like pas une pub piégée : vise-la puis appuie sur Ignorer.',
      'Les pubs affichent un compte à rebours avant d’exploser.',
    ],
    visual: `
      <div class="tut-utility-demo">
        <div class="tut-utility-card"><span>🔁</span><b>PARTAGER</b><small>+20 PV · 3 charges</small></div>
        <div class="tut-utility-card tut-utility-card--ignore"><span>🙈</span><b>IGNORER</b><small>désamorce les pubs</small></div>
        <div class="tut-warning-chip">🧨 EXPLOSE DANS 8 s</div>
      </div>
    `,
  },
  {
    kicker: 'ÉTAPE 05 · LA SURVIE',
    title: 'Esquive et respire',
    text: 'Quand une attaque est annoncée, un scroll rapide annule les dégâts. Le bouton Esquiver, Maj + ↓ ou un geste vif font l’affaire.',
    tips: [
      'Le bandeau ⚠️ indique qui attaque et dans combien de temps.',
      'Échap met la partie en pause. Tes réglages sont sauvegardés.',
      'L’Algorithme a trois phases. Tu as le droit d’avoir peur.',
    ],
    visual: `
      <div class="tut-dodge-demo">
        <div class="tut-threat"><span>⚠️</span><b>ATTAQUE IMMINENTE</b><i></i></div>
        <div class="tut-dodge-keys"><kbd>Maj</kbd><kbd>↓</kbd><span>ou</span><b>ESQUIVER</b></div>
        <div class="tut-dodge-word">ESQUIVE !</div>
      </div>
    `,
  },
];

export interface TutorialOptions {
  onClose?: () => void;
  startLabel?: string;
}

export function openTutorial(options: TutorialOptions = {}): void {
  const modal = openModal({
    className: 'overlay-layer--tutorial',
    content: `
      <div class="modal-head modal-head--center">
        <span class="modal-kicker">${icon('info')} MODE D’EMPLOI</span>
        <h2 id="modal-title">Survis au fil</h2>
        <p>Six secondes de lecture valent mieux que trois heures de scroll.</p>
      </div>
      <div class="tutorial" data-tutorial>
        <div class="tutorial__visual" data-tutorial-visual></div>
        <div class="tutorial__copy">
          <span class="tutorial__step" data-tutorial-step></span>
          <h3 data-tutorial-title></h3>
          <p data-tutorial-text></p>
          <ul data-tutorial-tips></ul>
        </div>
      </div>
      <div class="tutorial__footer">
        <div class="tutorial__dots" data-tutorial-dots></div>
        <div class="tutorial__nav">
          <button class="btn btn-ghost" type="button" data-tutorial-prev>Précédent</button>
          <button class="btn btn-primary" type="button" data-tutorial-next>Suivant</button>
        </div>
      </div>
      <button class="text-link tutorial__skip" type="button" data-tutorial-skip>
        Passer le tutoriel ${icon('arrowRight')}
      </button>
    `,
    closeOnBackdrop: false,
    onClose: options.onClose,
  });

  let index = 0;
  const visual = qs<HTMLElement>('[data-tutorial-visual]', modal.panel);
  const stepLabel = qs<HTMLElement>('[data-tutorial-step]', modal.panel);
  const title = qs<HTMLElement>('[data-tutorial-title]', modal.panel);
  const text = qs<HTMLElement>('[data-tutorial-text]', modal.panel);
  const tips = qs<HTMLElement>('[data-tutorial-tips]', modal.panel);
  const dots = qs<HTMLElement>('[data-tutorial-dots]', modal.panel);
  const prev = qs<HTMLButtonElement>('[data-tutorial-prev]', modal.panel);
  const next = qs<HTMLButtonElement>('[data-tutorial-next]', modal.panel);
  const skip = qs<HTMLButtonElement>('[data-tutorial-skip]', modal.panel);
  const finalLabel = options.startLabel ?? 'C’est compris';

  dots.innerHTML = TUTORIAL_STEPS.map((_step, dotIndex) => `<span data-dot="${dotIndex}"></span>`).join('');

  const render = () => {
    const step = TUTORIAL_STEPS[index];
    if (!step) return;
    visual.innerHTML = step.visual;
    stepLabel.textContent = step.kicker;
    title.textContent = step.title;
    text.textContent = step.text;
    tips.innerHTML = step.tips.map((tip) => `<li>${tip}</li>`).join('');
    prev.disabled = index === 0;
    next.innerHTML =
      index === TUTORIAL_STEPS.length - 1
        ? `${finalLabel} ${icon('arrowRight')}`
        : `Suivant ${icon('arrowRight')}`;
    dots.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
      dot.classList.toggle('is-done', dotIndex < index);
    });
  };

  prev.addEventListener('click', () => {
    index = Math.max(0, index - 1);
    render();
  });
  next.addEventListener('click', () => {
    if (index >= TUTORIAL_STEPS.length - 1) {
      modal.close();
      return;
    }
    index += 1;
    render();
  });
  skip.addEventListener('click', () => modal.close());
  modal.panel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      index = Math.min(TUTORIAL_STEPS.length - 1, index + 1);
      render();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      index = Math.max(0, index - 1);
      render();
    }
  });
  render();
}

/* ------------------------------------------------------------------ */
/* Paramètres                                                         */
/* ------------------------------------------------------------------ */

export interface SettingsOptions {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onResetProgress: () => void;
  onTutorial: () => void;
  onClose?: () => void;
}

export function openSettings(options: SettingsOptions): void {
  const settings = { ...options.settings };
  const modal = openModal({
    className: 'overlay-layer--settings',
    content: `
      <div class="modal-head">
        <span class="modal-kicker">${icon('settings')} PARAMÈTRES</span>
        <h2 id="modal-title">Régler le chaos</h2>
        <p>Les changements sont sauvegardés immédiatement, localement.</p>
      </div>
      <div class="settings-list">
        <label class="settings-slider" for="setting-sfx">
          <span class="settings-slider__head">${icon('volume')} <b>Effets sonores</b><output data-sfx-output>${Math.round(settings.sfxVolume * 100)} %</output></span>
          <input id="setting-sfx" type="range" min="0" max="100" step="1" value="${Math.round(settings.sfxVolume * 100)}" />
        </label>
        <label class="settings-slider" for="setting-music">
          <span class="settings-slider__head">${icon('music')} <b>Musique</b><output data-music-output>${Math.round(settings.musicVolume * 100)} %</output></span>
          <input id="setting-music" type="range" min="0" max="100" step="1" value="${Math.round(settings.musicVolume * 100)}" />
        </label>
        <label class="settings-toggle" for="setting-motion">
          <span><b>Réduire les animations</b><small>Coupe les secousses, particules et effets les plus intenses.</small></span>
          <input id="setting-motion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''} />
          <span class="switch" aria-hidden="true"></span>
        </label>
      </div>
      <div class="settings-divider"></div>
      <div class="settings-actions">
        <button class="btn btn-soft" type="button" data-settings-tutorial>${icon('info')} Revoir le tutoriel</button>
        <button class="btn btn-danger-soft" type="button" data-settings-reset>Réinitialiser mes scores</button>
      </div>
      <p class="settings-note">Aucune donnée personnelle n’est collectée. Tout reste dans ce navigateur.</p>
    `,
    onClose: options.onClose,
  });

  const sfxInput = qs<HTMLInputElement>('#setting-sfx', modal.panel);
  const musicInput = qs<HTMLInputElement>('#setting-music', modal.panel);
  const motionInput = qs<HTMLInputElement>('#setting-motion', modal.panel);
  const sfxOutput = qs<HTMLOutputElement>('[data-sfx-output]', modal.panel);
  const musicOutput = qs<HTMLOutputElement>('[data-music-output]', modal.panel);

  const push = () => {
    settings.sfxVolume = Number(sfxInput.value) / 100;
    settings.musicVolume = Number(musicInput.value) / 100;
    settings.reducedMotion = motionInput.checked;
    sfxOutput.textContent = `${Math.round(settings.sfxVolume * 100)} %`;
    musicOutput.textContent = `${Math.round(settings.musicVolume * 100)} %`;
    options.onChange({ ...settings });
  };
  sfxInput.addEventListener('input', push);
  musicInput.addEventListener('input', push);
  motionInput.addEventListener('change', push);

  qs<HTMLButtonElement>('[data-settings-tutorial]', modal.panel).addEventListener('click', () => {
    options.onTutorial();
  });

  const reset = qs<HTMLButtonElement>('[data-settings-reset]', modal.panel);
  let resetArmed = false;
  let resetTimer = 0;
  reset.addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      reset.classList.add('is-armed');
      reset.textContent = 'Confirmer la réinitialisation ?';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        resetArmed = false;
        reset.classList.remove('is-armed');
        reset.textContent = 'Réinitialiser mes scores';
      }, 3200);
      return;
    }
    resetArmed = false;
    window.clearTimeout(resetTimer);
    reset.classList.remove('is-armed');
    reset.textContent = 'Scores réinitialisés';
    options.onResetProgress();
  });
}

/* ------------------------------------------------------------------ */
/* Pause                                                              */
/* ------------------------------------------------------------------ */

export interface PauseOptions {
  run: RunState;
  onResume: () => void;
  onSettings: () => void;
  onTutorial: () => void;
  onAbandon: () => void;
  onClose?: () => void;
}

export function openPause(options: PauseOptions): void {
  const modal = openModal({
    className: 'overlay-layer--pause',
    content: `
      <div class="modal-head modal-head--center">
        <span class="modal-kicker">PAUSE</span>
        <h2 id="modal-title">Le fil t’attend</h2>
        <p>Profite de ce rare moment où rien ne te scrolle dessus.</p>
      </div>
      <div class="pause-stats">
        <div><span>ÉTAGE</span><strong>${options.run.floor}/${9}</strong></div>
        <div><span>SCORE</span><strong>${formatNumber(options.run.score)}</strong></div>
        <div><span>VIE</span><strong>${Math.ceil(options.run.hp)}/${options.run.maxHp}</strong></div>
        <div><span>GRAINE</span><strong class="pause-seed">${options.run.seed}</strong></div>
      </div>
      <div class="pause-actions">
        <button class="btn btn-primary pause-resume" type="button" data-pause-resume>${icon('play')} Reprendre</button>
        <button class="btn btn-soft" type="button" data-pause-settings>${icon('settings')} Paramètres</button>
        <button class="btn btn-soft" type="button" data-pause-tutorial>${icon('info')} Tutoriel</button>
        <button class="btn btn-danger-soft" type="button" data-pause-abandon>Abandonner la descente</button>
      </div>
      <p class="pause-note">La partie est sauvegardée au début de chaque étage.</p>
    `,
    onClose: options.onClose ?? options.onResume,
  });

  const resume = () => {
    modal.close();
    options.onResume();
  };
  qs<HTMLButtonElement>('[data-pause-resume]', modal.panel).addEventListener('click', resume);
  qs<HTMLButtonElement>('[data-pause-settings]', modal.panel).addEventListener('click', options.onSettings);
  qs<HTMLButtonElement>('[data-pause-tutorial]', modal.panel).addEventListener('click', options.onTutorial);
  qs<HTMLButtonElement>('[data-pause-abandon]', modal.panel).addEventListener('click', options.onAbandon);
}

/* ------------------------------------------------------------------ */
/* Améliorations                                                      */
/* ------------------------------------------------------------------ */

export interface UpgradeOptions {
  choices: UpgradeId[];
  floor: number;
  onChoose: (id: UpgradeId) => void;
}

export function openUpgrade(options: UpgradeOptions): void {
  let chosen = false;
  const cards = options.choices
    .map((id, index) => {
      const upgrade = getUpgrade(id);
      return `
        <button class="upgrade-card upgrade-card--${upgrade.tag.toLowerCase()}" type="button" data-upgrade="${upgrade.id}">
          <span class="upgrade-card__index">${index + 1}</span>
          <span class="upgrade-card__tag">${upgrade.tag}</span>
          <span class="upgrade-card__icon">${upgrade.icon}</span>
          <strong class="upgrade-card__name">${upgrade.name}</strong>
          <span class="upgrade-card__desc">${upgrade.description}</span>
          <em class="upgrade-card__flavor">« ${upgrade.flavor} »</em>
          <span class="upgrade-card__pick">Choisir ${icon('arrowRight')}</span>
        </button>
      `;
    })
    .join('');

  const modal = openModal({
    className: 'overlay-layer--upgrade',
    dismissible: false,
    closeOnBackdrop: false,
    onKey: (event) => {
      if (event.key === '1' || event.key === '2' || event.key === '3') {
        const id = options.choices[Number(event.key) - 1];
        if (id) {
          event.preventDefault();
          choose(id);
        }
        return true;
      }
      return false;
    },
    content: `
      <div class="modal-head modal-head--center">
        <span class="modal-kicker">${icon('sparkles')} ÉTAGE ${options.floor} NETTOYÉ</span>
        <h2 id="modal-title">Choisis ton poison</h2>
        <p>Une amélioration s’ajoute à ta descente. Elle reste jusqu’à la fin de la partie.</p>
      </div>
      <div class="upgrade-grid">${cards}</div>
      <p class="upgrade-hint">Touche 1, 2 ou 3 pour choisir au clavier.</p>
    `,
  });

  const choose = (id: UpgradeId) => {
    if (chosen) return;
    chosen = true;
    modal.close();
    options.onChoose(id);
  };

  modal.panel.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => {
    button.addEventListener('click', () => choose(button.dataset.upgrade as UpgradeId));
  });
}

/* ------------------------------------------------------------------ */
/* Boss                                                              */
/* ------------------------------------------------------------------ */

export interface BossIntroOptions {
  onFight: () => void;
}

export function openBossIntro(options: BossIntroOptions): void {
  const modal = openModal({
    className: 'overlay-layer--boss',
    dismissible: false,
    closeOnBackdrop: false,
    content: `
      <div class="boss-intro">
        <div class="boss-intro__alerts" aria-hidden="true">
          <span>ERREUR 0x000F</span><span>ACCÈS NON AUTORISÉ</span><span>VOUS ÊTES LE PRODUIT</span>
        </div>
        <div class="boss-intro__avatar">🧠<i class="boss-intro__ring"></i><i class="boss-intro__ring boss-intro__ring--two"></i></div>
        <span class="modal-kicker modal-kicker--danger">ÉTAGE 9 · LE NOYAU</span>
        <h2 id="modal-title" class="boss-intro__title">L’ALGORITHME</h2>
        <p class="boss-intro__quote">« J’ai vu tes 4 312 derniers scrolls. Tu es mon contenu préféré. Reste encore un peu. »</p>
        <div class="boss-intro__phases">
          <span>${icon('bolt')} 3 PHASES</span>
          <span>${icon('skull')} 1 SORTIE</span>
          <span>${icon('heart')} TES LIKES</span>
        </div>
        <button class="btn btn-danger btn-boss-fight" type="button" data-boss-fight>
          Désinstaller L’Algorithme ${icon('arrowRight')}
        </button>
        <small class="boss-intro__hint">Il génère des posts. Il ment. Il a peur des esquives.</small>
      </div>
    `,
  });
  qs<HTMLButtonElement>('[data-boss-fight]', modal.panel).addEventListener('click', () => {
    modal.close();
    options.onFight();
  });
}

/* ------------------------------------------------------------------ */
/* Confirmations et crédits                                           */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function openConfirm(options: ConfirmOptions): void {
  const modal = openModal({
    className: 'overlay-layer--confirm',
    content: `
      <div class="modal-head">
        <span class="modal-kicker">${icon('info')} CONFIRMATION</span>
        <h2 id="modal-title">${options.title}</h2>
        <p>${options.message}</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-cancel>${options.cancelLabel ?? 'Annuler'}</button>
        <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm>${options.confirmLabel}</button>
      </div>
    `,
    onClose: options.onCancel,
  });
  qs<HTMLButtonElement>('[data-cancel]', modal.panel).addEventListener('click', () => modal.close());
  qs<HTMLButtonElement>('[data-confirm]', modal.panel).addEventListener('click', () => {
    modal.close();
    options.onConfirm();
  });
}

export function openCredits(profile: Profile): void {
  openModal({
    className: 'overlay-layer--credits',
    content: `
      <div class="modal-head">
        <span class="modal-kicker">${icon('sparkles')} CRÉDITS</span>
        <h2 id="modal-title">Fait avec des likes<br />et du café froid</h2>
        <p>Doomscroll Dungeon est un jeu fictif, satirique et entièrement jouable hors ligne. Aucun réseau social réel n’a été blessé.</p>
      </div>
      <div class="credits-list">
        <div><span>CONCEPT & DÉVELOPPEMENT</span><b>Atelier du Fil Perdu</b></div>
        <div><span>TECHNOLOGIE</span><b>HTML5 · CSS3 · TypeScript · Vite</b></div>
        <div><span>SON</span><b>Web Audio API — synthèse en direct</b></div>
        <div><span>POLICE</span><b>Polices système, zéro requête externe</b></div>
        <div><span>DONNÉES</span><b>LocalStorage uniquement · aucune collecte</b></div>
        <div><span>REMERCIEMENTS</span><b>${formatNumber(profile.totalKills)} monstres neutralisés, ${formatNumber(profile.gamesPlayed)} descentes.</b></div>
      </div>
      <p class="credits-note">Les marques, interfaces et publications de ce jeu sont des créations originales. Toute ressemblance avec votre fil d’actualité est une coïncidence statistiquement inévitable.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" type="button" data-modal-close>Retour au fil</button>
      </div>
    `,
    closeOnBackdrop: true,
  });
}
