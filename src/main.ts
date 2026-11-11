import './styles/base.css';
import './styles/menu.css';
import './styles/game.css';
import './styles/feed.css';
import './styles/overlays.css';
import './styles/results.css';
import './styles/animations.css';

import { GameController } from './core/game-loop';
import { qs } from './ui/dom';

const root = qs<HTMLElement>('#screen-root');

try {
  const controller = new GameController(root);
  if (import.meta.env.DEV) {
    (window as unknown as { __doomscroll?: GameController }).__doomscroll = controller;
  }
} catch (error) {
  console.error('Doomscroll Dungeon n’a pas pu démarrer :', error);
  root.innerHTML = `
    <section class="boot-error">
      <span>💀</span>
      <h1>Le fil a crashé</h1>
      <p>Recharge la page. Si le problème persiste, vide le stockage local du site.</p>
      <button class="btn btn-primary" onclick="location.reload()">Relancer</button>
    </section>
  `;
}
