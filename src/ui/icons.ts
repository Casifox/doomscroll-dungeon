export type IconName =
  | 'heart'
  | 'comment'
  | 'share'
  | 'eyeOff'
  | 'wind'
  | 'pause'
  | 'play'
  | 'settings'
  | 'trophy'
  | 'skull'
  | 'arrowDown'
  | 'arrowRight'
  | 'lock'
  | 'copy'
  | 'check'
  | 'close'
  | 'volume'
  | 'music'
  | 'dice'
  | 'home'
  | 'restart'
  | 'info'
  | 'sparkles'
  | 'seed'
  | 'shield'
  | 'bolt';

const ICONS: Record<IconName, string> = {
  heart:
    '<path d="M12 20.4 4.7 13.6a4.8 4.8 0 0 1 0-6.9 4.9 4.9 0 0 1 6.9 0l.4.4.4-.4a4.9 4.9 0 0 1 6.9 0 4.8 4.8 0 0 1 0 6.9L12 20.4Z" fill="currentColor" stroke="none"/>',
  comment:
    '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 9.3 9.3 0 0 1-3.2-.6L4 21l.9-4.1a7.9 7.9 0 0 1-1.4-4.5A8.4 8.4 0 0 1 12 4.1a8.4 8.4 0 0 1 9 7.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  share:
    '<path d="M17 2.5 21 6.5l-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 6.5H9.5A5.5 5.5 0 0 0 4 12v2.5M7 21.5l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 17.5h11.5a5.5 5.5 0 0 0 5.5-5.5v-2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  eyeOff:
    '<path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.3 10.3 0 0 1 12 5c5.5 0 9 5.3 9 7 0 .7-.6 1.9-1.7 3.2M6.2 6.2C3.9 7.7 3 10.1 3 12c0 1.7 3.5 7 9 7 1.5 0 2.8-.4 4-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  wind:
    '<path d="M3 8h10.5a2.5 2.5 0 1 0-2.4-3.2M3 12h15a2.4 2.4 0 1 1-2.3 3M3 16h7a2.2 2.2 0 1 1-2 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  pause:
    '<rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor"/><rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  settings:
    '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  trophy:
    '<path d="M8 21h8M12 17v4M7 4h10v4.5a5 5 0 0 1-10 0V4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 5H4v1.5A4.5 4.5 0 0 0 8.5 11M17 5h3v1.5A4.5 4.5 0 0 1 15.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  skull:
    '<path d="M7 21v-3.2A8 8 0 1 1 17 17.8V21H7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9.2" cy="11" r="1.4" fill="currentColor"/><circle cx="14.8" cy="11" r="1.4" fill="currentColor"/><path d="M10 21v-3M14 21v-3M10.5 15.2h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  arrowDown:
    '<path d="M12 4v16m0 0 6-6m-6 6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  arrowRight:
    '<path d="M4 12h16m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  lock:
    '<rect x="4.5" y="10" width="15" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  copy:
    '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  check:
    '<path d="m4 12.5 5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  close:
    '<path d="m5 5 14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  volume:
    '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4v-5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  music:
    '<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.5" cy="16" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  dice:
    '<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/>',
  home:
    '<path d="m3.5 11 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 20v-9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  restart:
    '<path d="M4 4v6h6M4.6 15a8 8 0 1 0 1.8-8.3L4 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  info:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5V17M12 7.5v.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sparkles:
    '<path d="M12 3.5 13.5 9l5.5 1.5-5.5 1.5L12 17.5 10.5 12 5 10.5 10.5 9 12 3.5ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" fill="currentColor"/>',
  seed:
    '<path d="M12 21c0-5 2-9 7-11-1 7-3 10-7 11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 21C12 15 9 9 4 7c.7 7 3.5 12 8 14Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 21v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  shield:
    '<path d="M12 3.5 19 6v5.5c0 4.6-2.9 7.7-7 9-4.1-1.3-7-4.4-7-9V6l7-2.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8.8 12 2.2 2.2 4.3-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  bolt:
    '<path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" fill="currentColor"/>',
};

export function icon(name: IconName, className = ''): string {
  const classes = className ? `icon ${className}` : 'icon';
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

export const LOGO_MARK = `<svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true">
  <defs>
    <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff3d7f"/>
      <stop offset="1" stop-color="#b6ff3c"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="13" fill="#111119"/>
  <path d="M12 15c0-3.3 2.4-5 6.2-5h9c6 0 9 3 9 9v10c0 5-3 8-9 8H20c-4 0-6.3-1.8-6.3-5V15Z" fill="url(#logo-gradient)"/>
  <path d="M20 19h7.6c3 0 4.7 1.6 4.7 4.7v4.2c0 3-1.7 4.6-4.7 4.6h-6.1l-5 4V23c0-2.4.9-4 3.5-4Z" fill="#0b0b12"/>
  <circle cx="17.5" cy="39.5" r="2.6" fill="#ff3d7f"/>
  <path d="M25 38c-1.5 3-3.8 4.8-6.7 5.8" stroke="#b6ff3c" stroke-width="2.8" stroke-linecap="round" fill="none"/>
</svg>`;
