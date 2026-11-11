import type { ResultsData } from '../core/types';
import { formatDuration } from '../systems/scoring';
import { formatNumber } from '../core/game-state';
import { qs } from './dom';
import { icon } from './icons';
import { confetti } from './fx';
import { showToast } from './toast';

export interface ResultsHandlers {
  onReplaySame: () => void;
  onReplayNew: () => void;
  onMenu: () => void;
}

export function renderResults(
  root: HTMLElement,
  result: ResultsData,
  reducedMotion: boolean,
  handlers: ResultsHandlers,
): void {
  const victory = result.victory;
  const breakdownRows: Array<[string, number, string]> = [
    ['Ennemis neutralisés', result.breakdown.kills, '💀'],
    ['Étages nettoyés', result.breakdown.rooms, '🚪'],
    ['Combos', result.breakdown.combos, '⚡'],
    ['Esquives', result.breakdown.dodges, '💨'],
    ['Publications ignorées', result.breakdown.bonuses, '🙈'],
    ['Temps de survie', result.breakdown.survival, '⏱'],
  ];
  if (victory || result.breakdown.boss > 0) {
    breakdownRows.splice(4, 0, ['L’Algorithme', result.breakdown.boss, '🧠']);
  }

  root.innerHTML = `
    <section class="screen results-screen ${victory ? 'results-screen--victory' : 'results-screen--defeat'}">
      <div class="results-noise" aria-hidden="true"></div>
      <header class="results-topbar">
        <div class="menu-brand">
          <span class="menu-brand-mark">${icon(victory ? 'trophy' : 'skull')}</span>
          <span class="menu-brand-text">DOOMSCROLL DUNGEON<small>RAPPORT DE DESCENTE</small></span>
        </div>
        <span class="results-seed">${icon('seed')} GRAINE ${result.seed}</span>
      </header>

      <main class="results-main">
        <section class="results-score-panel">
          <span class="results-kicker ${victory ? 'is-victory' : ''}">
            ${victory ? 'ÉTAGE 9 · SYSTÈME HORS LIGNE' : 'SIGNAL PERDU · TON FIL CONTINUE'}
          </span>
          <h1 class="results-title">${victory ? 'ALGORITHME<br /><em>DÉSINSTALLÉ</em>' : 'LE FIL T’A<br /><em>DÉVORÉ</em>'}</h1>
          <p class="results-subtitle">
            ${
              victory
                ? 'Le noyau est hors ligne. Le fil est vide. Pour l’instant. Tu peux respirer.'
                : `Tu as atteint l’étage ${result.floor}/9. L’Algorithme a ajouté ton visage à ses recommandations.`
            }
          </p>

          <div class="score-showcase">
            <div class="score-showcase__head">
              <span>SCORE FINAL</span>
              ${result.newBest ? '<b class="new-record">NOUVEAU RECORD</b>' : '<b class="best-mini">RECORD : ' + formatNumber(result.bestScore) + '</b>'}
            </div>
            <strong class="score-big" data-final-score>0</strong>
            <div class="score-big-meta">
              <span>${formatDuration(result.elapsed)} de scroll</span>
              <span>${formatNumber(result.stats.kills)} ennemis</span>
              <span>${formatNumber(result.stats.maxCombo)} combo max</span>
            </div>
          </div>

          <div class="breakdown">
            ${breakdownRows
              .map(
                ([label, value, emoji]) => `
                  <div class="breakdown__row">
                    <span class="breakdown__emoji">${emoji}</span>
                    <span class="breakdown__label">${label}</span>
                    <strong>+${formatNumber(value)}</strong>
                  </div>
                `,
              )
              .join('')}
          </div>
        </section>

        <aside class="results-side">
          <div class="share-preview">
            <div class="share-preview__appbar">
              <span>${icon('seed')} chronofil</span>
              <small>${victory ? 'POST ÉPINGLÉ' : 'DERNIER POST'}</small>
            </div>
            <div class="share-preview__post">
              <div class="share-preview__head">
                <div class="share-avatar">${victory ? '😎' : '🫠'}</div>
                <div><strong>@toi</strong><span>${victory ? 'vient de quitter le donjon' : 'est toujours dans le fil'} · maintenant</span></div>
              </div>
              <p class="share-preview__text">${escapeResultText(result.shareText)}</p>
              <div class="share-preview__stats">
                <span>♥ ${formatNumber(result.score)}</span>
                <span>💬 1</span>
                <span>↻ ${formatNumber(result.stats.maxCombo)}</span>
              </div>
            </div>
          </div>

          <div class="results-actions">
            <button class="btn btn-primary btn-share" type="button" data-results-share>
              ${icon('share')} Partager mon score
            </button>
            <button class="btn btn-soft" type="button" data-results-copy>
              ${icon('copy')} Copier le texte
            </button>
            <button class="btn btn-soft" type="button" data-results-same>
              ${icon('restart')} Rejouer cette graine
            </button>
            <button class="btn btn-ghost" type="button" data-results-new>
              Nouvelle descente ${icon('arrowRight')}
            </button>
            <button class="text-link" type="button" data-results-menu>${icon('home')} Retour au menu</button>
          </div>
          <p class="results-note">${result.newBest ? 'Ton meilleur score est sauvegardé dans ce navigateur.' : 'Ton meilleur score reste ' + formatNumber(result.bestScore) + '.'} Aucune donnée n’est envoyée.</p>
        </aside>
      </main>

      <footer class="results-footer">
        <span>DOOMSCROLL DUNGEON v1.0</span>
        <span>${formatNumber(result.baseScore)} points de combat + ${formatNumber(result.survivalBonus)} de survie</span>
      </footer>
    </section>
  `;

  const scoreElement = qs<HTMLElement>('[data-final-score]', root);
  if (reducedMotion) {
    scoreElement.textContent = formatNumber(result.score);
  } else {
    const duration = 900;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      scoreElement.textContent = formatNumber(result.score * eased);
      if (progress < 1 && scoreElement.isConnected) requestAnimationFrame(animate);
      else scoreElement.textContent = formatNumber(result.score);
    };
    requestAnimationFrame(animate);
    if (victory) confetti(root, reducedMotion);
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.shareText);
      showToast('Résultat copié. Colle-le quelque part de dangereux.', 'success', '📋');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = result.shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Résultat copié.', 'success', '📋');
      } catch {
        showToast('Impossible de copier. Le texte est sélectionnable dans la carte.', 'danger', '⚠️');
      }
      textarea.remove();
    }
  };

  qs<HTMLButtonElement>('[data-results-copy]', root).addEventListener('click', () => {
    void copy();
  });

  const shareButton = qs<HTMLButtonElement>('[data-results-share]', root);
  const canShare = typeof navigator.share === 'function';
  if (!canShare) {
    shareButton.innerHTML = `${icon('share')} Copier et partager`;
  }
  shareButton.addEventListener('click', async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Doomscroll Dungeon',
          text: result.shareText,
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          await copy();
        }
      }
    } else {
      await copy();
    }
  });

  qs<HTMLButtonElement>('[data-results-same]', root).addEventListener('click', handlers.onReplaySame);
  qs<HTMLButtonElement>('[data-results-new]', root).addEventListener('click', handlers.onReplayNew);
  qs<HTMLButtonElement>('[data-results-menu]', root).addEventListener('click', handlers.onMenu);
}

function escapeResultText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
