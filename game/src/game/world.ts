// =====================================================================================
//  WORLD CONTEXT — the shared state every in-mission system reads (ship, enemies, enemy
//  bullets, pickups, boss, FX, level clock). GameScene builds one World per mission and
//  wires the systems into it; systems only hold a reference to the World, never to each
//  other directly, so construction order does not matter.
// =====================================================================================
import type Phaser from 'phaser';
import type { LevelDef, Settings, SfxKey } from '../types';
import type { HapticKind } from '../platform/haptics';
import type { Arsenal } from './arsenal/api';
import type { Fx } from './fx';
import type { Ship } from './ship';
import type { EnemyBullets } from './enemyBullets';
import type { Enemies } from './enemies';
import type { Pickups } from './pickups';
import type { Boss } from './boss';

/** Difficulty multipliers (from difficultyScale() in src/state/progress.ts) + derived damage multiplier. */
export interface DiffScale {
  hp: number;
  bulletSpeed: number;
  fireRate: number;
  credits: number;
  /** Multiplier applied to enemy bullet / contact damage. */
  damage: number;
}

/** Running totals for the LevelResult. */
export interface LevelStats {
  kills: number;
  spawned: number;
  score: number;
  credits: number;
  intelFound: string[];
}

/** Feedback services implemented by GameScene (audio, haptics, HUD, camera). */
export interface WorldServices {
  sfx(key: SfxKey): void;
  haptic(kind: HapticKind): void;
  /** Freeze the simulation for `ms` real milliseconds (impact feel). */
  hitStop(ms: number): void;
  /** Camera shake (respects settings.shake). intensity ~0.002 (tiny) .. 0.012 (huge). */
  shake(intensity: number, ms: number): void;
  hudFlash(kind: 'damage' | 'shield' | 'pickup' | 'energy'): void;
  banner(text: string, sub?: string, ms?: number): void;
  /** Gameplay time-scale beat (e.g. 0.3 for 600 ms on boss death). */
  slowMo(scale: number, ms: number): void;
}

/** Seeded RNG function returning floats in [0, 1). */
export type Rng = () => number;

export class World {
  /** Level clock in seconds (world time, includes the DEBUG.t fast-forward). */
  time = 0;
  /** Terrain scroll speed in px/s (ground units move with it). */
  scrollSpeed: number;
  /** True once the mission is over (clear or death): enemies stop firing, no new damage. */
  ended = false;
  /** Intel of this level already dropped (only one per level). */
  intelDropped = false;
  /** Air units cast ground shadows (false in space: there is no ground). */
  readonly shadows: boolean;
  readonly stats: LevelStats = { kills: 0, spawned: 0, score: 0, credits: 0, intelFound: [] };

  ship!: Ship;
  fx!: Fx;
  bullets!: EnemyBullets;
  enemies!: Enemies;
  pickups!: Pickups;
  boss!: Boss;
  arsenal!: Arsenal;

  constructor(
    readonly scene: Phaser.Scene,
    readonly level: LevelDef,
    readonly diff: DiffScale,
    readonly settings: Settings,
    /** Gameplay randomness (spawns, drops): seeded, deterministic. */
    readonly rng: Rng,
    /** Cosmetic randomness (particles) — separate stream so FX never change gameplay. */
    readonly fxRng: Rng,
    readonly services: WorldServices,
    /** Set to true when DEBUG.god: the ship never takes damage. */
    readonly god: boolean,
  ) {
    this.scrollSpeed = level.scrollSpeed;
    this.shadows = level.biome !== 'space';
  }
}

/** Angle in radians from (x0, y0) to (x1, y1). */
export function angleTo(x0: number, y0: number, x1: number, y1: number): number {
  return Math.atan2(y1 - y0, x1 - x0);
}

/** Clamp helper. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Shortest signed angular difference b - a in (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
