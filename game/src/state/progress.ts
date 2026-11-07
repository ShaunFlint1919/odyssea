// =====================================================================================
//  PROGRESS — campaign progression: level results, unlock chain, intel, difficulty.
//  The LevelEnd / GameOver scenes call applyLevelResult() exactly once per finished level.
// =====================================================================================
import type { Difficulty, LevelResult } from '../types';
import type { ShopCategory } from '../game/contracts';
import { GENERATORS, HULLS, INTEL, SHIELDS, SIDEKICKS, WEAPONS, levelOrder, nextLevelId } from '../data';
import { getSave, saveNow } from './save';

/** Share of the credits earned in a level that is kept when the level is failed / aborted. */
export const FAILED_CREDIT_RATIO = 0.5;

export interface DifficultyScale { hp: number; bulletSpeed: number; fireRate: number; credits: number }

/** Multipliers per difficulty (gameplay applies them; credits are scaled when they are granted in-level). */
export const DIFFICULTY_SCALES: Readonly<Record<Difficulty, Readonly<DifficultyScale>>> = Object.freeze({
  easy: Object.freeze({ hp: 0.75, bulletSpeed: 0.85, fireRate: 0.75, credits: 1 }),
  normal: Object.freeze({ hp: 1, bulletSpeed: 1, fireRate: 1, credits: 1 }),
  hard: Object.freeze({ hp: 1.35, bulletSpeed: 1.15, fireRate: 1.3, credits: 1.3 }),
});

const toCount = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

/**
 * Apply a finished (or failed) level to the save and persist it:
 * - credits += creditsEarned (x0.5, floored, when not completed); score += result score;
 * - bestScores[level] = max; collected intel is kept even on failure;
 * - on completion: level marked completed, next level in campaign order unlocked and selected;
 * - stats: kills, deaths (+1 per failed run), play time, credits earned.
 * Returns the newly unlocked level ids and the newly collected intel ids.
 */
export function applyLevelResult(result: LevelResult): { unlocked: string[]; newIntel: string[] } {
  const save = getSave();
  const id = result.levelId;
  const completed = result.completed === true;

  const earned = toCount(result.creditsEarned);
  const credited = completed ? earned : Math.floor(earned * FAILED_CREDIT_RATIO);
  const score = toCount(result.score);
  save.credits += credited;
  save.score += score;
  if (id && score > (save.bestScores[id] ?? 0)) save.bestScores[id] = score;

  const newIntel: string[] = [];
  const knownIntel = (iid: string) => INTEL.length === 0 || INTEL.some((i) => i.id === iid);
  for (const iid of result.intelFound ?? []) {
    if (typeof iid !== 'string' || !iid || save.intel.includes(iid) || !knownIntel(iid)) continue;
    save.intel.push(iid);
    newIntel.push(iid);
  }

  save.stats.kills += toCount(result.kills);
  if (!completed) save.stats.deaths += 1;
  save.stats.playSeconds += typeof result.timeSeconds === 'number' && Number.isFinite(result.timeSeconds) ? Math.max(0, result.timeSeconds) : 0;
  save.stats.creditsEarned += credited;

  const unlocked: string[] = [];
  if (completed && id) {
    if (!save.completedLevels.includes(id)) save.completedLevels.push(id);
    if (!save.unlockedLevels.includes(id)) save.unlockedLevels.push(id);
    const next = nextLevelId(id);
    if (next) {
      if (!save.unlockedLevels.includes(next)) {
        save.unlockedLevels.push(next);
        unlocked.push(next);
      }
      save.currentLevel = next;
    } else {
      save.currentLevel = id;
    }
  }
  saveNow();
  return { unlocked, newIntel };
}

/** Is the level playable (unlocked) in the current save? The first campaign level always is. */
export function isUnlocked(levelId: string): boolean {
  const save = getSave();
  return save.unlockedLevels.includes(levelId) || save.completedLevels.includes(levelId) || levelOrder()[0] === levelId;
}

/** Is the level completed in the current save? */
export function isCompleted(levelId: string): boolean {
  return getSave().completedLevels.includes(levelId);
}

/** True once the final campaign level has been completed. */
export function isCampaignComplete(): boolean {
  const order = levelOrder();
  return order.length > 0 && isCompleted(order[order.length - 1]);
}

/** Difficulty multipliers applied by gameplay (enemy hp, enemy bullet speed, fire rate, credits). Shared frozen object. */
export function difficultyScale(): { hp: number; bulletSpeed: number; fireRate: number; credits: number } {
  return DIFFICULTY_SCALES[getSave().difficulty] ?? DIFFICULTY_SCALES.normal;
}

/** Shop items that become available once `levelId` is completed (for the level-end "new gear" list). */
export function itemsUnlockedBy(levelId: string): { category: ShopCategory; id: string; name: string }[] {
  const out: { category: ShopCategory; id: string; name: string }[] = [];
  const add = (category: ShopCategory, list: readonly { id: string; name: string; unlockLevel?: string }[]) => {
    for (const d of list) if (d.unlockLevel === levelId) out.push({ category, id: d.id, name: d.name });
  };
  add('hull', HULLS);
  add('front', WEAPONS.filter((w) => w.slot === 'front'));
  add('rear', WEAPONS.filter((w) => w.slot === 'rear'));
  add('shield', SHIELDS);
  add('generator', GENERATORS);
  add('sidekickL', SIDEKICKS);
  return out;
}
