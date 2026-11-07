// STUB — to be implemented by the platform module owner (see docs/ARCHITECTURE.md).
import type { Difficulty, SaveData, Settings } from '../types';
import { START_CREDITS, START_LOADOUT } from '../data';

export const DEFAULT_SETTINGS: Settings = {
  sfx: 0.8, music: 0.6, shake: true, vibrate: true, autofire: true, touchSensitivity: 1.2, showFps: false,
};

export function createSave(difficulty: Difficulty = 'normal'): SaveData {
  return {
    version: 1, createdAt: Date.now(), credits: START_CREDITS, score: 0, difficulty,
    loadout: { ...START_LOADOUT }, unlockedLevels: [], completedLevels: [], bestScores: {},
    intel: [], intelRead: [], currentLevel: '', stats: { kills: 0, deaths: 0, playSeconds: 0, creditsEarned: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

let current: SaveData = createSave();

/** The live save (mutate it, then call saveNow()). */
export function getSave(): SaveData { return current; }
/** True if a campaign save exists in storage. */
export function hasSaveGame(): boolean { return false; }
/** Load from storage (or keep defaults). Called once at boot. */
export function loadSave(): SaveData { return current; }
/** Persist the live save to storage. */
export function saveNow(): void {}
/** Start a new campaign (keeps settings). */
export function newGame(difficulty: Difficulty = 'normal'): SaveData { current = { ...createSave(difficulty), settings: current.settings }; return current; }
/** Patch settings and persist. */
export function updateSettings(patch: Partial<Settings>): void { Object.assign(current.settings, patch); saveNow(); }
