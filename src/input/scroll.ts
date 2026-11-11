export interface FastScrollOptions {
  isBlocked: () => boolean;
  onFastScroll: () => void;
}

/**
 * Détecte un geste de molette rapide (le « scroll esquive »).
 * Le défilement natif n'est jamais bloqué : le geste reste un scroll normal
 * auquel s'ajoute une esquive si elle est disponible.
 */
export function bindFastScroll(
  element: HTMLElement,
  options: FastScrollOptions,
): () => void {
  let accumulated = 0;
  let lastEventAt = 0;

  const onWheel = (event: WheelEvent) => {
    if (options.isBlocked() || event.ctrlKey || event.metaKey) return;
    const now = performance.now();
    if (now - lastEventAt > 260) accumulated = 0;
    lastEventAt = now;
    accumulated += Math.abs(event.deltaY) + Math.abs(event.deltaX) * 0.2;
    if (accumulated > 420) {
      accumulated = 0;
      options.onFastScroll();
    }
  };

  element.addEventListener('wheel', onWheel, { passive: true });
  return () => element.removeEventListener('wheel', onWheel);
}
