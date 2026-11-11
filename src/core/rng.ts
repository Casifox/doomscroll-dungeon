/** Générateur pseudo-aléatoire déterministe (Mulberry32). */

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed: string): () => number {
  let a = hashSeed(seed) || 0x9e3779b9;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pick() : tableau vide');
  }
  return items[Math.floor(rng() * items.length)] as T;
}

export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomSeed(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  }
  return result;
}

export function sanitizeSeed(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  return cleaned;
}

export function randomBetween(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
