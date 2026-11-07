// =====================================================================================
//  WAVE PATTERN BLOCKS — small composable builders used by the level scripts in
//  src/data/levels/*. They only produce plain WaveDef objects (the gameplay spawner never
//  sees these helpers). Conventions (see docs/BALANCE.md "Wave semantics"):
//   - t in seconds since level start, x in 0..1 across the 264 px playfield;
//   - 'column' spawns `count` units one after another (`interval` s apart) at x;
//   - 'line' / 'wall' / 'arc' / 'v' spawn all members at once, `spacing` px apart;
//   - mirror: a copy of the wave also spawns at 1 - x;
//   - strafe units enter from the side nearest to x, rise units from the bottom edge.
//  Randomised blocks use mulberry32 seeded by the caller (never Math.random).
// =====================================================================================
import type { Formation, MovePattern, WaveDef } from '../types';
import { mulberry32 } from '../art/noise';

/** A block is a wave or a (nested) list of waves; buildWaves() flattens and sorts them. */
export type WaveBlock = WaveDef | WaveBlock[];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Raw wave constructor (rounds t / x, drops undefined optional fields). */
export function wave(
  t: number, enemy: string, count: number, formation: Formation, x: number,
  opt: { spacing?: number; interval?: number; move?: MovePattern; mirror?: boolean } = {},
): WaveDef {
  const w: WaveDef = { t: r2(t), enemy, count, formation, x: r2(x) };
  if (opt.spacing !== undefined) w.spacing = opt.spacing;
  if (opt.interval !== undefined) w.interval = opt.interval;
  if (opt.move !== undefined) w.move = opt.move;
  if (opt.mirror) w.mirror = true;
  return w;
}

/** One unit at x. */
export const one = (t: number, e: string, x: number, move?: MovePattern): WaveDef =>
  wave(t, e, 1, 'single', x, { move });

/** Mirrored pair of single units at x and 1 - x. */
export const duo = (t: number, e: string, x: number, move?: MovePattern): WaveDef =>
  wave(t, e, 1, 'single', x, { move, mirror: true });

/** V formation (tip towards the player) centred on x. */
export const vee = (t: number, e: string, x: number, n = 5, spacing = 22, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'v', x, { spacing, move });

/** Mirrored pair of V formations at x and 1 - x. */
export const vees = (t: number, e: string, x: number, n = 3, spacing = 22, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'v', x, { spacing, move, mirror: true });

/** Horizontal line centred on x, all members at once. */
export const line = (t: number, e: string, x: number, n: number, spacing = 36, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'line', x, { spacing, move });

/** Full-width wall of units (centred). */
export const wall = (t: number, e: string, n = 8, spacing = 30, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'wall', 0.5, { spacing, move });

/** Crescent of units centred on x. */
export const arc = (t: number, e: string, x: number, n = 7, spacing = 26, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'arc', x, { spacing, move });

/** Column: n units entering one after another at x. */
export const col = (t: number, e: string, x: number, n = 5, interval = 0.35, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move });

/** Mirrored pair of columns at x and 1 - x. */
export const cols = (t: number, e: string, x: number, n = 4, interval = 0.4, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move, mirror: true });

/** Snaking column (sine movement). */
export const snake = (t: number, e: string, x: number, n = 6, interval = 0.3): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move: 'sine' });

/** Mirrored pair of snaking columns. */
export const snakes = (t: number, e: string, x: number, n = 5, interval = 0.3): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move: 'sine', mirror: true });

/** Looping column (circle movement). */
export const loop = (t: number, e: string, x: number, n = 5, interval = 0.35): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move: 'circle' });

/** Pincer: a column swooping in from the left side, then one from the right side. */
export function swoop(t: number, e: string, n = 4, interval = 0.3, lag = 0.8): WaveDef[] {
  return [
    wave(t, e, n, 'column', 0.18, { interval, move: 'swoopR' }),
    wave(t + lag, e, n, 'column', 0.82, { interval, move: 'swoopL' }),
  ];
}

/** Strafing column entering from one side ('L' or 'R'). */
export const strafe = (t: number, e: string, side: 'L' | 'R', n = 4, interval = 0.45): WaveDef =>
  wave(t, e, n, 'column', side === 'L' ? 0.02 : 0.98, { interval, move: 'strafe' });

/** Crossing strafes from both sides at once. */
export const cross = (t: number, e: string, n = 4, interval = 0.45): WaveDef =>
  wave(t, e, n, 'column', 0.02, { interval, move: 'strafe', mirror: true });

/** Ambush: units bursting in from the bottom edge at each x, staggered. */
export function rise(t: number, e: string, xs: number[], stagger = 0.2): WaveDef[] {
  return xs.map((x, i) => one(t + i * stagger, e, x, 'rise'));
}

/** Divers: units that enter, pause and dive at the player, staggered. */
export function dives(t: number, e: string, xs: number[], stagger = 0.3): WaveDef[] {
  return xs.map((x, i) => one(t + i * stagger, e, x, 'dive'));
}

/** Ground / sea emplacements at each x (scroll with the terrain). */
export function ground(t: number, e: string, xs: number[], stagger = 0): WaveDef[] {
  return xs.map((x, i) => one(t + i * stagger, e, x));
}

/** Convoy: a column of vehicles driving on the terrain. */
export const convoy = (t: number, e: string, x: number, n = 3, interval = 1.2): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move: 'groundMove' });

/** Mirrored pair of convoys. */
export const convoys = (t: number, e: string, x: number, n = 3, interval = 1.2): WaveDef =>
  wave(t, e, n, 'column', x, { interval, move: 'groundMove', mirror: true });

/** Random swarm (positions chosen by the gameplay spawner), staggered by interval. */
export const swarm = (t: number, e: string, n: number, interval = 0.3, move?: MovePattern): WaveDef =>
  wave(t, e, n, 'random', 0.5, { interval, move });

/**
 * Hazard field: n drifting hazards spread over `span` seconds at deterministic pseudo-random
 * x positions (mulberry32 seeded with `seed`), avoiding immediate repeats of the same lane.
 */
export function field(t: number, e: string, n: number, span: number, seed: number, move: MovePattern = 'drift'): WaveDef[] {
  const rnd = mulberry32(seed);
  const out: WaveDef[] = [];
  let last = -1;
  for (let i = 0; i < n; i++) {
    let x = 0.1 + rnd() * 0.8;
    if (last >= 0 && Math.abs(x - last) < 0.18) x = x > 0.5 ? x - 0.3 : x + 0.3;
    last = x;
    out.push(one(t + (span * i) / Math.max(1, n), e, x, move));
  }
  return out;
}

/** Flatten blocks and sort them by time (stable), ready for LevelDef.waves. */
export function buildWaves(...blocks: WaveBlock[]): WaveDef[] {
  const out: WaveDef[] = [];
  const walk = (b: WaveBlock) => {
    if (Array.isArray(b)) b.forEach(walk);
    else out.push(b);
  };
  blocks.forEach(walk);
  return out
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.t - b.w.t || a.i - b.i)
    .map((e) => e.w);
}

/** Time at which the last member of a wave spawns. */
export function lastSpawnTime(w: WaveDef): number {
  const staggered = w.formation === 'column' || w.formation === 'random';
  return staggered ? w.t + (w.count - 1) * (w.interval ?? 0.35) : w.t;
}
