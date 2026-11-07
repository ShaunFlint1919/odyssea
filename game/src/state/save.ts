// =====================================================================================
//  SAVE — the single live SaveData object + localStorage persistence.
//  - Key 'nova-corsair.save.v1'. Every storage access is wrapped in try/catch (private
//    mode, quota, disabled storage, node tests without window/localStorage).
//  - Loaded data is deep-merged over fresh defaults (forward compatible: missing fields get
//    defaults, unknown fields are kept) and then sanitised against the content catalogue.
//  - saveNow() writes immediately; scheduleSave() debounces bursts (sliders, rapid taps).
// =====================================================================================
import type { Difficulty, Loadout, SaveData, Settings } from '../types';
import { MAX_POWER } from '../config';
import {
  GENERATORS, HULLS, INTEL, LEVELS, SHIELDS, SIDEKICKS, START_CREDITS, START_LOADOUT, WEAPONS, levelOrder,
} from '../data';

/** localStorage key of the campaign save. */
export const SAVE_KEY = 'nova-corsair.save.v1';
/** Debounce delay of scheduleSave() in ms. */
export const SAVE_DEBOUNCE_MS = 400;

export const DEFAULT_SETTINGS: Settings = {
  sfx: 0.8, music: 0.6, shake: true, vibrate: true, autofire: true, touchSensitivity: 1.2, showFps: false,
};

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

/** A blank save (no campaign started: unlockedLevels is empty). */
export function createSave(difficulty: Difficulty = 'normal'): SaveData {
  return {
    version: 1, createdAt: Date.now(), credits: START_CREDITS, score: 0, difficulty,
    loadout: { ...START_LOADOUT }, unlockedLevels: [], completedLevels: [], bestScores: {},
    intel: [], intelRead: [], currentLevel: '', stats: { kills: 0, deaths: 0, playSeconds: 0, creditsEarned: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

let current: SaveData = createSave();
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

// ------------------------------------------------------------------------- storage access

/** The browser localStorage, or null when unavailable (node, private mode, blocked). */
function storage(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    return s && typeof s.getItem === 'function' ? s : null;
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** True when the save can actually be persisted on this device. */
export function storageAvailable(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const probe = `${SAVE_KEY}.probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------- merge + sanitise

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Deep-merges `over` (untrusted, parsed JSON) onto `base` (fresh defaults).
 * Type mismatches fall back to the default; unknown keys of `over` are kept.
 */
function mergeValue(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (Array.isArray(base)) return Array.isArray(over) ? over.slice() : base;
  if (isObj(base)) {
    if (!isObj(over)) return base;
    const out: Obj = {};
    for (const k of Object.keys(over)) out[k] = over[k];
    for (const k of Object.keys(base)) out[k] = mergeValue(base[k], over[k]);
    return out;
  }
  if (base === null) return over === null || typeof over === 'string' ? over : null;
  if (typeof base === 'number') return typeof over === 'number' && Number.isFinite(over) ? over : base;
  return typeof over === typeof base ? over : base;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const nonNegInt = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) if (typeof x === 'string' && x && !out.includes(x)) out.push(x);
  return out;
}

/** Keeps `id` if the (non-empty) catalogue knows it, else returns `fallback`. */
function known<T extends { id: string }>(list: readonly T[], id: string | null, fallback: string | null, ok: (d: T) => boolean = () => true): string | null {
  if (id === null) return null;
  if (list.length === 0) return id; // catalogue not loaded (tests / early dev): trust the save
  const def = list.find((d) => d.id === id);
  return def && ok(def) ? id : fallback;
}

function sanitizeLoadout(l: Loadout): Loadout {
  const hull = known(HULLS, l.hull, START_LOADOUT.hull) ?? START_LOADOUT.hull;
  const front = known(WEAPONS, l.front, START_LOADOUT.front, (w) => w.slot === 'front') ?? START_LOADOUT.front;
  const rear = known(WEAPONS, l.rear, null, (w) => w.slot === 'rear');
  const power = (p: number) => clamp(Number.isFinite(p) ? Math.round(p) : 1, 1, MAX_POWER);
  return {
    hull,
    front,
    frontPower: front === l.front ? power(l.frontPower) : 1,
    rear,
    rearPower: rear !== null && rear === l.rear ? power(l.rearPower) : 1,
    shield: known(SHIELDS, l.shield, START_LOADOUT.shield) ?? START_LOADOUT.shield,
    generator: known(GENERATORS, l.generator, START_LOADOUT.generator) ?? START_LOADOUT.generator,
    sidekickL: known(SIDEKICKS, l.sidekickL, null),
    sidekickR: known(SIDEKICKS, l.sidekickR, null),
  };
}

function sanitizeSettings(s: Settings): Settings {
  const unit = (v: number, d: number) => (Number.isFinite(v) ? clamp(v, 0, 1) : d);
  return {
    sfx: unit(s.sfx, DEFAULT_SETTINGS.sfx),
    music: unit(s.music, DEFAULT_SETTINGS.music),
    shake: !!s.shake,
    vibrate: !!s.vibrate,
    autofire: !!s.autofire,
    touchSensitivity: Number.isFinite(s.touchSensitivity) ? clamp(s.touchSensitivity, 0.8, 2) : DEFAULT_SETTINGS.touchSensitivity,
    showFps: !!s.showFps,
  };
}

/** Builds a valid SaveData from anything (parsed JSON of any version). */
function sanitize(raw: unknown): SaveData {
  const merged = mergeValue(createSave(), raw) as SaveData & Obj;
  const levelIds = new Set(LEVELS.map((l) => l.id));
  const intelIds = new Set(INTEL.map((i) => i.id));
  const knownLevel = (id: string) => levelIds.size === 0 || levelIds.has(id);

  const unlockedLevels = stringList(merged.unlockedLevels).filter(knownLevel);
  const completedLevels = stringList(merged.completedLevels).filter(knownLevel);
  for (const id of completedLevels) if (!unlockedLevels.includes(id)) unlockedLevels.push(id);

  const bestScores: Record<string, number> = {};
  if (isObj(merged.bestScores)) {
    for (const [k, v] of Object.entries(merged.bestScores)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) bestScores[k] = Math.floor(v);
    }
  }

  const loadout = sanitizeLoadout(merged.loadout);
  let credits = nonNegInt(merged.credits);
  // Sidekicks the hull cannot carry any more (catalogue change) are sold at full price.
  const hullDef = HULLS.find((h) => h.id === loadout.hull);
  if (hullDef) {
    const refund = (id: string | null) => SIDEKICKS.find((s) => s.id === id)?.cost ?? 0;
    if (hullDef.sidekickSlots < 2 && loadout.sidekickR) { credits += refund(loadout.sidekickR); loadout.sidekickR = null; }
    if (hullDef.sidekickSlots < 1 && loadout.sidekickL) { credits += refund(loadout.sidekickL); loadout.sidekickL = null; }
  }

  let currentLevel = typeof merged.currentLevel === 'string' ? merged.currentLevel : '';
  if (unlockedLevels.length === 0) currentLevel = '';
  else if (!currentLevel || !unlockedLevels.includes(currentLevel)) currentLevel = unlockedLevels[unlockedLevels.length - 1];

  const intel = stringList(merged.intel).filter((id) => intelIds.size === 0 || intelIds.has(id));
  const stats = merged.stats;
  const out: SaveData & Obj = {
    ...merged,
    version: 1,
    createdAt: Number.isFinite(merged.createdAt) && merged.createdAt > 0 ? merged.createdAt : Date.now(),
    credits,
    score: nonNegInt(merged.score),
    difficulty: DIFFICULTIES.includes(merged.difficulty) ? merged.difficulty : 'normal',
    loadout,
    unlockedLevels,
    completedLevels,
    bestScores,
    intel,
    intelRead: stringList(merged.intelRead).filter((id) => intel.includes(id)),
    currentLevel,
    stats: {
      ...stats,
      kills: nonNegInt(stats.kills),
      deaths: nonNegInt(stats.deaths),
      playSeconds: Number.isFinite(stats.playSeconds) ? Math.max(0, stats.playSeconds) : 0,
      creditsEarned: nonNegInt(stats.creditsEarned),
    },
    settings: sanitizeSettings(merged.settings),
  };
  return out;
}

// ------------------------------------------------------------------------- public API

/** The live save (mutate it, then call saveNow() or scheduleSave()). */
export function getSave(): SaveData { return current; }

/** True only when a campaign has been started (at least one level unlocked) in the live save. */
export function hasSaveGame(): boolean { return current.unlockedLevels.length > 0; }

/** Load from storage (or keep the current defaults). Called once at boot. */
export function loadSave(): SaveData {
  const raw = readRaw();
  if (raw === null) return current;
  try {
    current = sanitize(JSON.parse(raw));
  } catch {
    // Corrupt save: keep a copy for manual recovery, continue with defaults.
    writeRaw(`${SAVE_KEY}.corrupt`, raw);
  }
  return current;
}

/** Persist the live save to storage right now (cancels a pending debounced write). */
export function saveNow(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  let json: string;
  try {
    json = JSON.stringify(current);
  } catch {
    return;
  }
  writeRaw(SAVE_KEY, json);
}

/** Debounced persist: many calls within SAVE_DEBOUNCE_MS result in a single write. */
export function scheduleSave(delayMs: number = SAVE_DEBOUNCE_MS): void {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    saveNow();
  }, delayMs);
}

/** Writes a pending debounced save immediately (app backgrounded / page hidden). */
export function flushSave(): void {
  if (pendingTimer !== null) saveNow();
}

/** True while a debounced write is waiting. */
export function hasPendingSave(): boolean { return pendingTimer !== null; }

/** Start a new campaign (keeps settings): first level unlocked and selected, start credits + loadout. Persists. */
export function newGame(difficulty: Difficulty = 'normal'): SaveData {
  const first = levelOrder()[0] ?? '';
  const fresh = createSave(difficulty);
  fresh.settings = { ...current.settings };
  if (first) {
    fresh.unlockedLevels = [first];
    fresh.currentLevel = first;
  }
  current = fresh;
  saveNow();
  return current;
}

/** Deletes the campaign (keeps settings) and persists. hasSaveGame() is false afterwards. */
export function eraseSave(): void {
  const settings = { ...current.settings };
  current = createSave();
  current.settings = settings;
  saveNow();
}

/** Patch settings (in place, so cached references stay valid) and persist (debounced: safe on every slider move). */
export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(current.settings, sanitizeSettings({ ...current.settings, ...patch }));
  scheduleSave();
}
