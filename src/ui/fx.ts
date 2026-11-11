import { prefersReducedMotion } from './dom';

export type FloatVariant = 'damage' | 'heal' | 'shield' | 'score' | 'dot' | 'rage' | 'muted';

export function spawnFloat(
  anchor: HTMLElement,
  text: string,
  variant: FloatVariant = 'damage',
  reduced = prefersReducedMotion(),
): void {
  if (reduced) return;
  const el = document.createElement('span');
  el.className = `float-text float-text--${variant}`;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  const offset = Math.round(Math.random() * 28 - 14);
  el.style.setProperty('--fx-x', `${offset}px`);
  anchor.append(el);
  window.setTimeout(() => el.remove(), 950);
}

export function burstAt(
  anchor: HTMLElement,
  particles: string[],
  count = 7,
  reduced = prefersReducedMotion(),
): void {
  if (reduced) return;
  const rect = anchor.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'fx-particle';
    particle.textContent = particles[i % particles.length] ?? '♥';
    particle.setAttribute('aria-hidden', 'true');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 32 + Math.random() * 54;
    particle.style.left = `${cx}px`;
    particle.style.top = `${cy}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 20}px`);
    particle.style.setProperty('--rot', `${Math.random() * 90 - 45}deg`);
    document.body.append(particle);
    window.setTimeout(() => particle.remove(), 800);
  }
}

export function shakeScreen(
  root: HTMLElement,
  strong = false,
  reduced = prefersReducedMotion(),
): void {
  if (reduced) return;
  const className = strong ? 'is-shaking-hard' : 'is-shaking';
  root.classList.remove(className);
  // Force le redémarrage de l'animation.
  void root.offsetWidth;
  root.classList.add(className);
  window.setTimeout(() => root.classList.remove(className), strong ? 480 : 320);
}

export function flashDamage(root: HTMLElement, reduced = prefersReducedMotion()): void {
  if (reduced) return;
  let flash = root.querySelector<HTMLElement>('.damage-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.className = 'damage-flash';
    flash.setAttribute('aria-hidden', 'true');
    root.append(flash);
  }
  flash.classList.remove('is-active');
  void flash.offsetWidth;
  flash.classList.add('is-active');
  window.setTimeout(() => flash?.classList.remove('is-active'), 300);
}

export function glitchScreen(root: HTMLElement, duration = 1000, reduced = prefersReducedMotion()): void {
  if (reduced) return;
  root.classList.add('is-glitching');
  window.setTimeout(() => root.classList.remove('is-glitching'), duration);
}

export function confetti(root: HTMLElement, reduced = prefersReducedMotion()): void {
  if (reduced) return;
  const colors = ['#b6ff3c', '#ff3d7f', '#48e5ff', '#ffd166', '#b18cff'];
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.setAttribute('aria-hidden', 'true');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length] as string;
    piece.style.setProperty('--delay', `${Math.random() * 0.8}s`);
    piece.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    root.append(piece);
    window.setTimeout(() => piece.remove(), 3200);
  }
}

export function popElement(element: HTMLElement, className = 'is-popping'): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 380);
}
