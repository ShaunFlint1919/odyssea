// Campaign progress: unlock chain, 50 % credits on failure, intel, best scores, difficulty.
// Level / intel ids come from the real catalogue; suites skip while it is still empty.
import { beforeEach, describe, expect, it } from 'vitest';
import { GENERATORS, HULLS, INTEL, SHIELDS, SIDEKICKS, WEAPONS, levelClearBonus, levelOrder } from '../src/data';
import { getSave, newGame } from '../src/state/save';
import {
  DIFFICULTY_SCALES, applyLevelResult, difficultyScale, isCampaignComplete, isCompleted, isUnlocked, itemsUnlockedBy,
} from '../src/state/progress';
import type { LevelResult } from '../src/types';

const ORDER = levelOrder();

function result(levelId: string, patch: Partial<LevelResult> = {}): LevelResult {
  return {
    levelId, completed: true, kills: 10, spawned: 12, creditsEarned: 1000, score: 5000,
    intelFound: [], timeSeconds: 90, bossDefeated: false, ...patch,
  };
}

describe.skipIf(ORDER.length < 2)('unlock chain', () => {
  beforeEach(() => { newGame('normal'); });

  it('starts with only the first level unlocked', () => {
    expect(isUnlocked(ORDER[0])).toBe(true);
    expect(isUnlocked(ORDER[1])).toBe(false);
    expect(isCompleted(ORDER[0])).toBe(false);
    expect(getSave().currentLevel).toBe(ORDER[0]);
  });

  it('completing a level unlocks and selects the next one, full credits + mission pay', () => {
    const s = getSave();
    const credits = s.credits;
    const bonus = levelClearBonus(ORDER[0], false, false);
    expect(bonus).toBeGreaterThan(0);
    const r = applyLevelResult(result(ORDER[0], { creditsEarned: 1234 }));
    expect(r.unlocked).toEqual([ORDER[1]]);
    expect(r.bonus).toBe(bonus);
    expect(r.completedBefore).toBe(false);
    expect(isCompleted(ORDER[0])).toBe(true);
    expect(isUnlocked(ORDER[1])).toBe(true);
    expect(s.currentLevel).toBe(ORDER[1]);
    expect(s.credits).toBe(credits + 1234 + bonus);
    expect(s.stats.creditsEarned).toBe(1234 + bonus);
    expect(s.stats.deaths).toBe(0);
  });

  it('replaying a completed level unlocks nothing new, pays the replay rate and keeps the frontier', () => {
    applyLevelResult(result(ORDER[0]));
    const s = getSave();
    const credits = s.credits;
    const replayBonus = levelClearBonus(ORDER[0], false, true);
    const r = applyLevelResult(result(ORDER[0], { creditsEarned: 300 }));
    expect(r.unlocked).toEqual([]);
    expect(r.completedBefore).toBe(true);
    expect(r.bonus).toBe(replayBonus);
    expect(replayBonus).toBeLessThanOrEqual(levelClearBonus(ORDER[0], false, false));
    expect(s.credits).toBe(credits + 300 + replayBonus);
    expect(s.completedLevels.filter((id) => id === ORDER[0])).toHaveLength(1);
    // the next mission stays on the frontier (ORDER[1]), not on the replayed level's successor chain
    expect(s.currentLevel).toBe(ORDER[1]);
  });

  it('walks the whole campaign in order; the final level unlocks nothing', () => {
    for (let i = 0; i < ORDER.length; i++) {
      expect(isUnlocked(ORDER[i])).toBe(true);
      const r = applyLevelResult(result(ORDER[i]));
      expect(r.unlocked).toEqual(i + 1 < ORDER.length ? [ORDER[i + 1]] : []);
    }
    expect(getSave().currentLevel).toBe(ORDER[ORDER.length - 1]);
    expect(isCampaignComplete()).toBe(true);
    expect(getSave().unlockedLevels).toHaveLength(ORDER.length);
  });
});

describe.skipIf(ORDER.length === 0)('failed levels', () => {
  beforeEach(() => { newGame('normal'); });

  it('keeps 50 % of the credits (floored), unlocks nothing and counts a death', () => {
    const s = getSave();
    const credits = s.credits;
    const r = applyLevelResult(result(ORDER[0], { completed: false, creditsEarned: 1001, kills: 7 }));
    expect(r.unlocked).toEqual([]);
    expect(s.credits).toBe(credits + 500);
    expect(s.stats.creditsEarned).toBe(500);
    expect(s.stats.deaths).toBe(1);
    expect(s.stats.kills).toBe(7);
    expect(isCompleted(ORDER[0])).toBe(false);
    if (ORDER.length > 1) expect(isUnlocked(ORDER[1])).toBe(false);
    expect(s.currentLevel).toBe(ORDER[0]);
  });

  it('ignores garbage numbers', () => {
    const s = getSave();
    const credits = s.credits;
    applyLevelResult(result(ORDER[0], { completed: false, creditsEarned: Number.NaN, score: -40, timeSeconds: Number.POSITIVE_INFINITY }));
    expect(s.credits).toBe(credits);
    expect(s.score).toBe(0);
    expect(Number.isFinite(s.stats.playSeconds)).toBe(true);
  });
});

describe.skipIf(ORDER.length === 0)('score and stats', () => {
  beforeEach(() => { newGame('normal'); });

  it('accumulates the score and keeps the best score per level', () => {
    const s = getSave();
    applyLevelResult(result(ORDER[0], { score: 4000 }));
    applyLevelResult(result(ORDER[0], { score: 2500, completed: false }));
    applyLevelResult(result(ORDER[0], { score: 6100 }));
    expect(s.score).toBe(4000 + 2500 + 6100);
    expect(s.bestScores[ORDER[0]]).toBe(6100);
    expect(s.stats.playSeconds).toBe(270);
  });
});

describe.skipIf(ORDER.length === 0 || INTEL.length === 0)('intel', () => {
  beforeEach(() => { newGame('normal'); });

  it('reports newly collected intel once, also when the level was failed', () => {
    const id = INTEL[0].id;
    const r1 = applyLevelResult(result(ORDER[0], { completed: false, intelFound: [id] }));
    expect(r1.newIntel).toEqual([id]);
    expect(getSave().intel).toEqual([id]);
    const r2 = applyLevelResult(result(ORDER[0], { intelFound: [id, id] }));
    expect(r2.newIntel).toEqual([]);
    expect(getSave().intel).toEqual([id]);
  });

  it('ignores unknown intel ids', () => {
    const r = applyLevelResult(result(ORDER[0], { intelFound: ['no_such_intel'] }));
    expect(r.newIntel).toEqual([]);
    expect(getSave().intel).toEqual([]);
  });
});

describe('difficulty', () => {
  it('returns the documented multipliers', () => {
    const s = newGame('easy');
    expect(difficultyScale()).toEqual({ hp: 0.75, bulletSpeed: 0.85, fireRate: 0.75, credits: 1 });
    s.difficulty = 'normal';
    expect(difficultyScale()).toEqual({ hp: 1, bulletSpeed: 1, fireRate: 1, credits: 1 });
    s.difficulty = 'hard';
    expect(difficultyScale()).toEqual({ hp: 1.35, bulletSpeed: 1.15, fireRate: 1.3, credits: 1.3 });
    expect(difficultyScale()).toBe(DIFFICULTY_SCALES.hard); // shared object: no allocation per call
  });
});

describe('unlockable gear', () => {
  it('lists every catalogue item gated by a level under that level', () => {
    const gated = [...HULLS, ...WEAPONS, ...SHIELDS, ...GENERATORS, ...SIDEKICKS].filter((d) => d.unlockLevel);
    for (const d of gated) {
      expect(itemsUnlockedBy(d.unlockLevel as string).some((x) => x.id === d.id)).toBe(true);
    }
    expect(itemsUnlockedBy('no_such_level')).toEqual([]);
  });
});
