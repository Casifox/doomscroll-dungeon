import { qs } from './dom';

export type ToastKind = 'info' | 'success' | 'danger' | 'lore';

const MAX_TOASTS = 3;

export function showToast(
  message: string,
  kind: ToastKind = 'info',
  icon?: string,
  duration = 3000,
): void {
  const root = qs<HTMLElement>('#toast-root');
  while (root.children.length >= MAX_TOASTS) {
    root.firstElementChild?.remove();
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${kind}`;
  toast.setAttribute('role', 'status');
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'toast__icon';
    iconEl.textContent = icon;
    iconEl.setAttribute('aria-hidden', 'true');
    toast.append(iconEl);
  }
  const text = document.createElement('span');
  text.className = 'toast__text';
  text.textContent = message;
  toast.append(text);
  root.append(toast);
  window.setTimeout(() => {
    toast.classList.add('toast--leaving');
    window.setTimeout(() => toast.remove(), 240);
  }, duration);
}

export function clearToasts(): void {
  const root = document.querySelector<HTMLElement>('#toast-root');
  root?.replaceChildren();
}
