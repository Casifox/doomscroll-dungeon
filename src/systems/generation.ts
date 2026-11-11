import {
  BOSS_THEME,
  ENEMY_TEMPLATES,
  FILLER_POSTS,
  THEMES,
  makeGeneratedEnemy,
  ROOM_EVENTS,
} from '../entities/enemies';
import { RUN_CONFIG } from '../core/config';
import { createRng, pick, shuffle } from '../core/rng';
import type {
  EnemyKind,
  FillerPost,
  GeneratedEnemy,
  GeneratedRoom,
  RoomEvent,
  Theme,
} from '../core/types';

const COMPOSITIONS: Record<number, EnemyKind[][]> = {
  1: [['ragebait']],
  2: [['ragebait', 'sponsored'], ['sponsored', 'ragebait']],
  3: [['troll'], ['ragebait', 'troll']],
  4: [
    ['ragebait', 'troll'],
    ['ragebait', 'ragebait', 'sponsored'],
  ],
  5: [
    ['sponsored', 'troll'],
    ['ragebait', 'troll'],
  ],
  6: [['ragebait', 'troll', 'sponsored']],
  7: [
    ['troll', 'ragebait', 'ragebait'],
    ['troll', 'troll', 'ragebait'],
  ],
  8: [
    ['troll', 'ragebait', 'sponsored'],
    ['ragebait', 'troll', 'ragebait'],
  ],
};

/** L'ordre des thèmes est mélangé une fois par graine, puis associé aux étages. */
export function getThemeForFloor(seed: string, floor: number): Theme {
  if (floor >= RUN_CONFIG.bossFloor) return BOSS_THEME;
  const rng = createRng(`${seed}:themes`);
  const order = shuffle(rng, THEMES);
  return order[(floor - 1) % order.length] as Theme;
}

export function generateRoom(seed: string, floor: number): GeneratedRoom {
  if (floor < 1 || floor > RUN_CONFIG.totalFloors) {
    throw new Error(`Étage invalide : ${floor}`);
  }

  const rng = createRng(`${seed}:floor:${floor}`);
  const isBoss = floor === RUN_CONFIG.bossFloor;
  const theme = isBoss ? BOSS_THEME : getThemeForFloor(seed, floor);
  const event = isBoss || floor === 1 || rng() > 0.45 ? null : pick(rng, ROOM_EVENTS);
  const fillerPool = shuffle(rng, FILLER_POSTS);

  if (isBoss) {
    const filler = fillerPool.slice(0, 2).map(
      (post, index): FillerPost => ({ ...post, id: `boss-filler-${floor}-${index}` }),
    );
    return {
      floor,
      totalFloors: RUN_CONFIG.totalFloors,
      isBoss: true,
      theme,
      event: null,
      enemies: [],
      filler,
      objective: 'Désinstalle L’Algorithme. Il n’y a pas de sortie avant.',
    };
  }

  const sequences = COMPOSITIONS[floor];
  if (!sequences || sequences.length === 0) {
    throw new Error(`Aucune composition pour l'étage ${floor}`);
  }
  const composition = pick(rng, sequences);
  const order = shuffle(rng, composition);

  const templates: Record<EnemyKind, typeof ENEMY_TEMPLATES.ragebait> = {
    ragebait: shuffle(rng, ENEMY_TEMPLATES.ragebait),
    sponsored: shuffle(rng, ENEMY_TEMPLATES.sponsored),
    troll: shuffle(rng, ENEMY_TEMPLATES.troll),
  };
  const counters: Record<EnemyKind, number> = { ragebait: 0, sponsored: 0, troll: 0 };

  const enemies: GeneratedEnemy[] = order.map((kind, index) => {
    const templateIndex = counters[kind] % templates[kind].length;
    const template = templates[kind][templateIndex] as (typeof templates)[EnemyKind][number];
    counters[kind]++;
    return makeGeneratedEnemy(kind, floor, index, template, rng);
  });

  const fillerCount = enemies.length >= 3 ? 2 : 3;
  const filler = fillerPool.slice(0, fillerCount).map(
    (post, index): FillerPost => ({ ...post, id: `filler-${floor}-${index}` }),
  );

  const objectives = [
    'Neutralise tous les posts hostiles pour déverrouiller la sortie.',
    'Purge la salle. Le scroll n’est pas une fuite, c’est une tactique.',
    'Élimine les menaces. Les pubs se règlent avec « Ignorer », pas avec un like.',
  ];
  const objective = pick(rng, objectives);

  return {
    floor,
    totalFloors: RUN_CONFIG.totalFloors,
    isBoss: false,
    theme,
    event,
    enemies,
    filler,
    objective,
  };
}

/** Sbires invoqués par L'Algorithme. */
export function generateMinion(seed: string, kind: EnemyKind, counter: number): GeneratedEnemy {
  const rng = createRng(`${seed}:minion:${counter}`);
  const template = pick(rng, ENEMY_TEMPLATES[kind]);
  const minion = makeGeneratedEnemy(kind, RUN_CONFIG.bossFloor, 90 + counter, template, rng, true);
  return { ...minion, id: `minion-${counter}-${kind}-${Math.floor(rng() * 9999)}` };
}

export function getRoomEventById(id: string | undefined | null): RoomEvent | null {
  if (!id) return null;
  return ROOM_EVENTS.find((event) => event.id === id) ?? null;
}
