import { describe, expect, it } from 'vitest';
import { createRun } from '../src/core/game-state';
import {
  addScore,
  applyResultsToProfile,
  createResults,
  recordDodge,
  recordKill,
  recordRoomClear,
} from '../src/systems/scoring';
import { createDefaultProfile } from '../src/core/game-state';

describe('score', () => {
  it('ajoute des points avec un multiplicateur arrondi', () => {
    const run = createRun('SCORE');
    const points = addScore(run, 'kills', 55.4, 1.2);
    expect(points).toBe(66);
    expect(run.score).toBe(66);
    expect(run.breakdown.kills).toBe(66);
  });

  it('comptabilise les éliminations, les salles et les esquives', () => {
    const run = createRun('SCORE');
    recordKill(run, 3, false, 1);
    recordKill(run, 3, true, 1);
    recordRoomClear(run, 3, 1);
    recordDodge(run, 12, 1);
    expect(run.stats.kills).toBe(2);
    expect(run.stats.roomsCleared).toBe(1);
    expect(run.stats.dodges).toBe(1);
    expect(run.stats.damageAvoided).toBe(12);
    expect(run.breakdown.kills).toBeGreaterThan(0);
    expect(run.breakdown.rooms).toBeGreaterThan(0);
    expect(run.breakdown.dodges).toBeGreaterThan(0);
  });

  it('ajoute le bonus de survie et calcule le nouveau record', () => {
    const run = createRun('RESULT');
    run.score = 1000;
    run.elapsed = 42;
    run.stats.roomsCleared = 3;
    const result = createResults(run, false, 500);
    expect(result.score).toBe(1000 + 42 * 2);
    expect(result.survivalBonus).toBe(84);
    expect(result.newBest).toBe(true);
    expect(result.bestScore).toBe(result.score);
    expect(result.shareText).toContain('RESULT');
  });

  it('ne signale pas un nouveau record si le score est inférieur', () => {
    const run = createRun('OLD');
    run.score = 100;
    const result = createResults(run, false, 5000);
    expect(result.newBest).toBe(false);
    expect(result.bestScore).toBe(5000);
  });

  it('met à jour le profil sans écraser le meilleur score', () => {
    const profile = createDefaultProfile();
    profile.bestScore = 6000;
    profile.gamesPlayed = 3;
    const run = createRun('PROFIL');
    run.score = 3000;
    run.stats.kills = 8;
    run.stats.dodges = 4;
    const result = createResults(run, false, profile.bestScore);
    const updated = applyResultsToProfile(profile, result);
    expect(updated.bestScore).toBe(6000);
    expect(updated.gamesPlayed).toBe(4);
    expect(updated.totalKills).toBe(8);
    expect(updated.totalDodges).toBe(4);
    expect(updated.lastSeed).toBe('PROFIL');
  });

  it('ajoute une victoire et l’étage du boss au profil', () => {
    const profile = createDefaultProfile();
    const run = createRun('WIN');
    run.floor = 9;
    run.stats.bossDefeated = true;
    const result = createResults(run, true, 0);
    const updated = applyResultsToProfile(profile, result);
    expect(updated.victories).toBe(1);
    expect(updated.bestFloor).toBe(9);
    expect(result.shareText).toContain('désinstallé');
  });
});
