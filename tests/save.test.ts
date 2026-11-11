import { describe, expect, it } from 'vitest';
import { createRun } from '../src/core/game-state';
import { SaveStore, STORAGE_KEYS } from '../src/storage/save';

class FakeStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  dump(key: string): string | null {
    return this.getItem(key);
  }
}

describe('sauvegarde locale', () => {
  it('enregistre et relit le profil', () => {
    const storage = new FakeStorage();
    const store = new SaveStore(storage);
    const profile = store.loadProfile();
    profile.bestScore = 12345;
    profile.gamesPlayed = 4;
    profile.tutorialSeen = true;
    expect(store.saveProfile(profile)).toBe(true);
    const loaded = store.loadProfile();
    expect(loaded.bestScore).toBe(12345);
    expect(loaded.gamesPlayed).toBe(4);
    expect(loaded.tutorialSeen).toBe(true);
  });

  it('borne les volumes et applique les valeurs par défaut', () => {
    const storage = new FakeStorage();
    const store = new SaveStore(storage);
    storage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ sfxVolume: 5, musicVolume: -2, reducedMotion: true }),
    );
    const settings = store.loadSettings();
    expect(settings.sfxVolume).toBe(1);
    expect(settings.musicVolume).toBe(0);
    expect(settings.reducedMotion).toBe(true);
  });

  it('enregistre et restaure une partie en cours', () => {
    const storage = new FakeStorage();
    const store = new SaveStore(storage);
    const run = createRun('SAUVE-MOI');
    run.floor = 5;
    run.hp = 72;
    run.upgrades = ['super_like', 'pouce_fer'];
    run.score = 980;
    run.stats.kills = 7;
    expect(store.saveRun(run)).toBe(true);
    expect(store.hasRun()).toBe(true);
    const saved = store.loadRun();
    expect(saved).not.toBeNull();
    expect(saved?.run.seed).toBe('SAUVE-MOI');
    expect(saved?.run.floor).toBe(5);
    expect(saved?.run.hp).toBe(72);
    expect(saved?.run.upgrades).toEqual(['super_like', 'pouce_fer']);
    expect(saved?.run.stats.kills).toBe(7);
  });

  it('ignore les sauvegardes corrompues ou invalides', () => {
    const storage = new FakeStorage();
    const store = new SaveStore(storage);
    storage.setItem(STORAGE_KEYS.run, '{ pas du json');
    expect(store.loadRun()).toBeNull();

    storage.setItem(
      STORAGE_KEYS.run,
      JSON.stringify({ version: 999, savedAt: Date.now(), run: createRun('VIEUX') }),
    );
    expect(store.loadRun()).toBeNull();

    const broken = createRun('CASSÉ');
    broken.floor = 0;
    storage.setItem(
      STORAGE_KEYS.run,
      JSON.stringify({ version: 1, savedAt: Date.now(), run: broken }),
    );
    expect(store.loadRun()).toBeNull();
  });

  it('nettoie la sauvegarde de partie', () => {
    const storage = new FakeStorage();
    const store = new SaveStore(storage);
    store.saveRun(createRun('SUPPRIME'));
    expect(store.hasRun()).toBe(true);
    store.clearRun();
    expect(store.hasRun()).toBe(false);
  });

  it('fonctionne en mémoire si le stockage est indisponible', () => {
    const store = new SaveStore(null);
    const run = createRun('MEMOIRE');
    expect(store.saveRun(run)).toBe(true);
    expect(store.loadRun()?.run.seed).toBe('MEMOIRE');
    expect(store.persistent).toBe(false);
  });
});
