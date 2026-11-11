export interface FastSwipeOptions {
  isBlocked: () => boolean;
  onFastSwipe: () => void;
}

/** Détecte un swipe vertical rapide sur le fil (mobile / tablette). */
export function bindFastSwipe(
  element: HTMLElement,
  options: FastSwipeOptions,
): () => void {
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startTime = 0;
  let tracking = false;

  const onTouchStart = (event: TouchEvent) => {
    if (options.isBlocked() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    startX = touch.clientX;
    startY = touch.clientY;
    lastX = startX;
    lastY = startY;
    startTime = performance.now();
    tracking = true;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!tracking) return;
    const touch = event.touches[0];
    if (!touch) return;
    lastX = touch.clientX;
    lastY = touch.clientY;
  };

  const onTouchEnd = () => {
    if (!tracking) return;
    tracking = false;
    if (options.isBlocked()) return;
    const elapsed = performance.now() - startTime;
    const dx = lastX - startX;
    const dy = lastY - startY;
    const vertical = Math.abs(dy);
    const horizontal = Math.abs(dx);
    if (elapsed < 300 && vertical > 90 && vertical > horizontal * 1.25) {
      options.onFastSwipe();
    }
  };

  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchmove', onTouchMove, { passive: true });
  element.addEventListener('touchend', onTouchEnd, { passive: true });
  element.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchmove', onTouchMove);
    element.removeEventListener('touchend', onTouchEnd);
    element.removeEventListener('touchcancel', onTouchEnd);
  };
}
