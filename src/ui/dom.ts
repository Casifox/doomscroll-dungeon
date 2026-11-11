export function qs<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Élément introuvable : ${selector}`);
  return node;
}

export function qsa<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function clear(node: Element): void {
  node.replaceChildren();
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    const num = value / 1_000_000;
    return `${num >= 10 ? Math.round(num) : num.toFixed(1).replace('.0', '')} M`;
  }
  if (value >= 1_000) {
    const num = value / 1_000;
    return `${num >= 10 ? Math.round(num) : num.toFixed(1).replace('.0', '')} k`;
  }
  return String(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
  element.classList.toggle('is-hidden', hidden);
}

export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): void {
  element.addEventListener(event, handler as EventListener);
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
