import type { Profile, SavedRun } from '../core/types';
import { formatNumber } from '../core/game-state';
import { icon, LOGO_MARK } from './icons';
import { qs } from './dom';

export interface MenuHandlers {
  onNew: () => void;
  onContinue: () => void;
  onTutorial: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

export function renderMenu(
  root: HTMLElement,
  profile: Profile,
  savedRun: SavedRun | null,
  handlers: MenuHandlers,
): void {
  root.innerHTML = `
    <section class="screen menu-screen">
      <div class="menu-floating" aria-hidden="true">
        <span class="floaty floaty--1">♥ +1</span>
        <span class="floaty floaty--2">💬 ratio</span>
        <span class="floaty floaty--3">🔁 partagé</span>
        <span class="floaty floaty--4">🙈 ignoré</span>
        <span class="floaty floaty--5">💀 404</span>
      </div>

      <header class="menu-topbar">
        <div class="menu-brand">
          <span class="menu-brand-mark">${LOGO_MARK}</span>
          <span class="menu-brand-text">CHRONOFIL<small>RÉSEAU MODÈLE · FICTIF</small></span>
        </div>
        <div class="menu-top-actions">
          <button class="btn btn-quiet" type="button" data-menu="tutorial">
            ${icon('info')} <span>Comment jouer</span>
          </button>
          <button class="icon-btn icon-btn--ghost" type="button" data-menu="settings" aria-label="Ouvrir les paramètres">
            ${icon('settings')}
          </button>
        </div>
      </header>

      <main class="menu-main">
        <section class="menu-hero">
          <div class="kicker"><span class="kicker__dot"></span> UN ROGUELITE QUI VOUS DÉVORE</div>
          <h1 class="logo" aria-label="Doomscroll Dungeon">
            <span class="logo__line logo__doom">DOOM</span>
            <span class="logo__line logo__scroll">SCROLL</span>
            <span class="logo__dungeon">DUNGEON</span>
          </h1>
          <p class="menu-tagline">
            Like les monstres. Commente pour survivre.<br />
            Descends avant que le fil ne te dévore.
          </p>

          <div class="menu-cta">
            <button class="btn btn-primary btn-hero" type="button" data-menu="new">
              <span class="btn-hero__text">Nouvelle descente</span>
              <span class="btn-hero__arrow">${icon('arrowRight')}</span>
            </button>
            <button class="btn btn-outline btn-continue" type="button" data-menu="continue" hidden>
              <span class="continue-pulse" aria-hidden="true"></span>
              <span class="continue-copy">
                <strong>Reprendre la descente</strong>
                <small>Étage <b data-continue-floor>1</b> · Graine <span data-continue-seed>—</span></small>
              </span>
              ${icon('play')}
            </button>
          </div>

          <div class="menu-controls" aria-label="Commandes principales">
            <span class="mini-control"><kbd>Espace</kbd> Liker</span>
            <span class="mini-control"><kbd>C</kbd> Commenter</span>
            <span class="mini-control"><kbd>S</kbd> Partager</span>
            <span class="mini-control"><kbd>Maj ↓</kbd> Esquiver</span>
          </div>

          <div class="menu-meta">
            <div class="best-chip">
              <span class="best-chip__icon">${icon('trophy')}</span>
              <span class="best-chip__copy">
                <small>MEILLEUR SCORE</small>
                <strong data-best-score>0</strong>
              </span>
            </div>
            <span class="menu-meta__stats">
              <span><b data-games-played>0</b> descentes</span>
              <span><b data-victories>0</b> victoires</span>
            </span>
            <button class="text-link" type="button" data-menu="credits">Crédits</button>
          </div>
        </section>

        <aside class="menu-preview" aria-hidden="true">
          <div class="preview-glow"></div>
          <div class="preview-orbit preview-orbit--one"></div>
          <div class="preview-orbit preview-orbit--two"></div>
          <div class="phone">
            <div class="phone-notch"></div>
            <div class="phone-status"><span>9:41</span><span>▮▮▮ 🔋</span></div>
            <div class="phone-appbar">
              <span class="phone-appbar__logo">${icon('seed')} chronofil</span>
              <span class="phone-appbar__live"><i></i> EN DIRECT</span>
            </div>
            <div class="phone-feed">
              <article class="mock-post mock-post--boss">
                <div class="mock-head">
                  <div class="mock-avatar mock-avatar--boss">🧠</div>
                  <div class="mock-head__copy"><strong>L’Algorithme</strong><span>@algo_souverain · maintenant</span></div>
                  <span class="mock-badge">BOSS</span>
                </div>
                <p>Tu es mon contenu préféré. Reste encore un peu.</p>
                <div class="mock-danger">
                  <span>⚠️</span>
                  <div class="mock-danger__copy"><b>SURCHARGE DE RATIO</b><i><u></u></i></div>
                </div>
                <div class="mock-actions"><span>♥ 1,2 M</span><span>💬 0</span><span>↻ 666 k</span></div>
              </article>
              <article class="mock-post">
                <div class="mock-head">
                  <div class="mock-avatar">😡</div>
                  <div class="mock-head__copy"><strong>Ragebait Certifié</strong><span>@ratio_royal · 1 min</span></div>
                </div>
                <p>Unpopular opinion : les gens qui lisent les CGU méritent ce qui leur arrive.</p>
                <div class="mock-actions"><span class="is-liked">♥ 8 421</span><span>💬 902</span><span>↻ 12</span></div>
              </article>
              <article class="mock-post mock-post--sponsored">
                <div class="mock-head">
                  <div class="mock-avatar">🧴</div>
                  <div class="mock-head__copy"><strong>Parfum Mystère</strong><span>@parfum_abime · sponsorisé</span></div>
                  <span class="mock-badge mock-badge--gold">SPONSORISÉ</span>
                </div>
                <p>Le parfum qui sent le wifi gratuit. Clique sur Liker pour tenter ta chance.</p>
                <div class="mock-actions"><span class="is-sponsor">🧨 explose dans 8 s</span><span>↻ 666</span></div>
              </article>
              <div class="mock-scroll-hint">↓ scrolle pour survivre ↓</div>
            </div>
            <div class="phone-dock">
              <div class="phone-health"><span>VIE</span><i><u></u></i><b>72</b></div>
              <div class="phone-actions">
                <span class="phone-action phone-action--like">♥</span>
                <span class="phone-action">💬</span>
                <span class="phone-action">🔁</span>
                <span class="phone-action">🙈</span>
              </div>
            </div>
          </div>
          <div class="sticker sticker--one">PAS UN VRAI RÉSEAU</div>
          <div class="sticker sticker--two">ROGUELITE<br />ACTION</div>
          <div class="sticker sticker--three">60 FPS<br />DE MAUVAISE FOI</div>
        </aside>
      </main>

      <footer class="menu-footer">
        <span>© 2026 Chronofil™ — une plateforme de fiction. Aucune donnée personnelle collectée.</span>
        <span class="menu-footer__warning"><b>⚠</b> Le scroll prolongé peut provoquer des bosses.</span>
        <span class="menu-version">v1.0</span>
      </footer>
    </section>
  `;

  qs<HTMLElement>('[data-best-score]', root).textContent = formatNumber(profile.bestScore);
  qs<HTMLElement>('[data-games-played]', root).textContent = formatNumber(profile.gamesPlayed);
  qs<HTMLElement>('[data-victories]', root).textContent = formatNumber(profile.victories);

  const continueButton = qs<HTMLButtonElement>('[data-menu="continue"]', root);
  if (savedRun) {
    continueButton.hidden = false;
    qs<HTMLElement>('[data-continue-floor]', root).textContent = String(savedRun.run.floor);
    qs<HTMLElement>('[data-continue-seed]', root).textContent = savedRun.run.seed;
  }

  qs<HTMLButtonElement>('[data-menu="new"]', root).addEventListener('click', handlers.onNew);
  qs<HTMLButtonElement>('[data-menu="tutorial"]', root).addEventListener('click', handlers.onTutorial);
  qs<HTMLButtonElement>('[data-menu="settings"]', root).addEventListener('click', handlers.onSettings);
  qs<HTMLButtonElement>('[data-menu="credits"]', root).addEventListener('click', handlers.onCredits);
  continueButton.addEventListener('click', handlers.onContinue);
}
