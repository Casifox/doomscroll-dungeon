export interface KeyboardActions {
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onIgnore: () => void;
  onDodge: () => void;
  onPause: () => void;
  isBlocked: () => boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
  );
}

/** Raccourcis globaux de la partie. Retourne une fonction de nettoyage. */
export function bindKeyboard(actions: KeyboardActions): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (actions.isBlocked() || isEditableTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (!event.repeat) actions.onLike();
        break;
      case 'KeyC':
        event.preventDefault();
        if (!event.repeat) actions.onComment();
        break;
      case 'KeyS':
        event.preventDefault();
        if (!event.repeat) actions.onShare();
        break;
      case 'KeyX':
        event.preventDefault();
        if (!event.repeat) actions.onIgnore();
        break;
      case 'ArrowDown':
        if (event.shiftKey) {
          event.preventDefault();
          if (!event.repeat) actions.onDodge();
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (!event.repeat) actions.onPause();
        break;
      default:
        break;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
