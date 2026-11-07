// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
import type { LevelResult } from '../types';

/** Apply a finished (or failed) level to the save: credits, score, unlocks, intel, stats. Persists. */
export function applyLevelResult(result: LevelResult): { unlocked: string[]; newIntel: string[] } {
  void result;
  return { unlocked: [], newIntel: [] };
}
/** Is the level playable (unlocked) in the current save? */
export function isUnlocked(levelId: string): boolean { void levelId; return true; }
/** Is the level completed in the current save? */
export function isCompleted(levelId: string): boolean { void levelId; return false; }
/** Difficulty multipliers applied by gameplay (enemy hp, enemy bullet speed, credits). */
export function difficultyScale(): { hp: number; bulletSpeed: number; fireRate: number; credits: number } {
  return { hp: 1, bulletSpeed: 1, fireRate: 1, credits: 1 };
}
