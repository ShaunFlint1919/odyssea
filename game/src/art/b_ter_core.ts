// =====================================================================================
//  TERRAIN CORE — shared low-level helpers for the per-biome terrain painters
//  (src/art/b_ter_<biome>.ts). Everything works in WORLD coordinates so chunks are seamless:
//    worldX = column (0..width-1), worldY = (index + 1) * CHUNK_H - 1 - row (increases UPWARD).
//  Every per-pixel buffer uses the same layout: the chunk plus a margin of M px on each side,
//  stride S = width + 2M, index(x, row) = (row + M) * S + x + M. Margins let painters sample
//  neighbours (slopes, cast shadows, cliff faces) across chunk edges with identical results.
//  Painters return a PLAN: a list of small Steps (fields, row-sliced pixel passes) so a chunk
//  can be generated incrementally under a per-frame time budget (TerrainGenerator.beginChunk).
// =====================================================================================
import { CHUNK_H } from '../config';
import { hash2 } from './noise';
import type { DoodadPlacement } from './terrain';

export const CH = CHUNK_H;
/** Margin (px) around the chunk covered by every field buffer. */
export const MARGIN = 12;

/** Linear 0..1 ramp of v between a and b (cheap smoothstep substitute for hot loops). */
export const lin = (a: number, b: number, v: number): number => {
  const t = (v - a) / (b - a);
  return t < 0 ? 0 : t > 1 ? 1 : t;
};

/** Darkens a packed colour (channel multipliers /256) and adds a blue bias — cast shadows. */
export function shade(col: number, mr: number, mg: number, mb: number, addB: number): number {
  const r = col & 255, g = (col >> 8) & 255, b = (col >> 16) & 255;
  let nb = ((b * mb) >> 8) + addB;
  if (nb > 255) nb = 255;
  return 0xff000000 | (nb << 16) | (((g * mg) >> 8) << 8) | ((r * mr) >> 8);
}

// ------------------------------------------------------------------------------ colours

/**
 * 0xRRGGBB -> opaque packed little-endian ABGR as a SIGNED int32 (for Int32Array views over
 * ImageData; signed values stay small integers in V8 instead of heap numbers).
 */
export function pack(hex: number): number {
  return 0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff);
}

/** Linear mix of two 0xRRGGBB colours. */
function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Mix two PACKED colours (used rarely, outside the hottest loops). */
export function mixPacked(a: number, b: number, t: number): number {
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255;
  const br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
  const r = (ar + (br - ar) * t) | 0, g = (ag + (bg - ag) * t) | 0, bl = (ab + (bb - ab) * t) | 0;
  return 0xff000000 | (bl << 16) | (g << 8) | r;
}

/** Packed ramp of `n` colours interpolated through the given 0xRRGGBB stops. */
export function rampN(n: number, ...stops: number[]): Int32Array {
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    out[i] = pack(mixHex(stops[k], stops[k + 1], t - k));
  }
  return out;
}

/** Ordered 4x4 Bayer thresholds in [0, 1). */
const B4 = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));
/** Bayer threshold for a world pixel. */
export const bayer4 = (x: number, wy: number): number => B4[((wy & 3) << 2) | (x & 3)];

/** Pick a dithered colour from a ramp: t in [0,1] (tone), d in [0,1) (dither threshold). */
export function tone(r: Int32Array, t: number, d: number): number {
  const n = r.length;
  const k = Math.floor(t * (n - 1) + d);
  return r[k < 0 ? 0 : k >= n ? n - 1 : k];
}

// ------------------------------------------------------------------------------ scratch pool

/**
 * Scratch buffers and output image of ONE chunk job. Buffers are handed out in call order and
 * recycled by the generator once the job's result has been taken, so concurrent jobs never
 * share memory and sequential jobs allocate nothing.
 */
export class Pool {
  private readonly f = list<Float32Array>();
  private readonly u = list<Uint8Array>();
  private fi = 0;
  private ui = 0;
  img: ImageData | null = null;

  /** Starts a new job: every buffer becomes available again (stale content!). */
  reset(): void {
    this.fi = 0;
    this.ui = 0;
  }

  /** Float32Array of at least n entries (stale content). */
  f32(n: number): Float32Array {
    let a = this.f[this.fi];
    if (!a || a.length < n) {
      a = new Float32Array(n);
      this.f[this.fi] = a;
    }
    this.fi++;
    return a;
  }

  /** Uint8Array of at least n entries (stale content). */
  u8(n: number): Uint8Array {
    let a = this.u[this.ui];
    if (!a || a.length < n) {
      a = new Uint8Array(n);
      this.u[this.ui] = a;
    }
    this.ui++;
    return a;
  }
}

// ------------------------------------------------------------------------------ steps

/** One unit of incremental work: run() does some work and returns true once it is complete. */
export interface Step {
  run(deadline: number): boolean;
}

class OnceStep implements Step {
  constructor(private readonly fn: () => void) {}
  run(): boolean {
    this.fn();
    return true;
  }
}

class RangeStep implements Step {
  private cur = 0;
  private end = -1;
  constructor(private readonly count: () => number, private readonly batch: number,
    private readonly fn: (a: number, b: number) => void) {}
  run(deadline: number): boolean {
    if (this.end < 0) this.end = this.count();
    while (this.cur < this.end) {
      const b = Math.min(this.end, this.cur + this.batch);
      this.fn(this.cur, b);
      this.cur = b;
      if (performance.now() >= deadline) break;
    }
    return this.cur >= this.end;
  }
}

/** A step that runs fn once (keep it small: a field, a site list, doodad placement...). */
export const once = (fn: () => void): Step => new OnceStep(fn);

/**
 * A sliced step over indices [0, count) (usually rows) in batches of `batch`; the clock is
 * checked after every batch. `count` may be a function evaluated when the step starts.
 */
export const range = (count: number | (() => number), batch: number, fn: (a: number, b: number) => void): Step =>
  new RangeStep(typeof count === 'number' ? () => count : count, batch, fn);

// ------------------------------------------------------------------------------ fields

const BSPLINE = new Map<number, Float32Array>();
function bsplineWeights(step: number): Float32Array {
  let w = BSPLINE.get(step);
  if (w) return w;
  w = new Float32Array(step * 4);
  for (let k = 0; k < step; k++) {
    const t = k / step, t2 = t * t, t3 = t2 * t;
    w[k * 4] = (1 - 3 * t + 3 * t2 - t3) / 6;
    w[k * 4 + 1] = (4 - 6 * t2 + 3 * t3) / 6;
    w[k * 4 + 2] = (1 + 3 * t + 3 * t2 - 3 * t3) / 6;
    w[k * 4 + 3] = t3 / 6;
  }
  BSPLINE.set(step, w);
  return w;
}

/**
 * Samples fn(worldX, worldY) on a world-aligned lattice of integer spacing `step` and upsamples
 * it with a smooth cubic B-spline into a margin-layout buffer. Because the lattice is
 * world-aligned, the result is identical across chunk edges (seamless). Only `pad` px of the
 * margin are filled (the rest of the buffer is stale).
 */
export function field(c: Chunk, step: number, fn: (wx: number, wy: number) => number, pad = MARGIN): Float32Array {
  const M = c.M, w = c.w;
  const P = Math.min(pad, M);
  const gx0 = Math.floor(-P / step) - 1;
  const gx1 = Math.floor((w + P - 1) / step) + 2;
  const gy0 = Math.floor((c.wy0 - (CH + P - 1)) / step) - 1;
  const gy1 = Math.floor((c.wy0 + P) / step) + 2;
  const lw = gx1 - gx0 + 1, lh = gy1 - gy0 + 1;
  const L = c.f32(lw * lh);
  for (let j = 0; j < lh; j++) {
    const wy = (gy0 + j) * step;
    const o = j * lw;
    for (let i = 0; i < lw; i++) L[o + i] = fn((gx0 + i) * step, wy);
  }
  return upsample(c, step, L, lw, lh, gx0, gy0, P, 0.5, 1);
}

/**
 * Cheap smooth noise in [0,1): random lattice values (hash2) at spacing `step` upsampled with a
 * cubic B-spline (C2 smooth, no lattice artefacts). Feature size ~ step..2*step. `contrast`
 * stretches the values around 0.5 (B-spline averaging narrows the distribution).
 */
export function lattice(c: Chunk, step: number, seed: number, pad = MARGIN, contrast = 1.35): Float32Array {
  const M = c.M, w = c.w;
  const P = Math.min(pad, M);
  const gx0 = Math.floor(-P / step) - 1;
  const gx1 = Math.floor((w + P - 1) / step) + 2;
  const gy0 = Math.floor((c.wy0 - (CH + P - 1)) / step) - 1;
  const gy1 = Math.floor((c.wy0 + P) / step) + 2;
  const lw = gx1 - gx0 + 1, lh = gy1 - gy0 + 1;
  const L = c.f32(lw * lh);
  for (let j = 0; j < lh; j++) {
    const o = j * lw, gy = gy0 + j;
    for (let i = 0; i < lw; i++) L[o + i] = hash2(gx0 + i, gy, seed);
  }
  return upsample(c, step, L, lw, lh, gx0, gy0, P, 0.5, contrast);
}

/** Separable cubic B-spline upsampling of a lattice into the margin layout (out = mid + (v - mid) * k). */
function upsample(c: Chunk, step: number, L: Float32Array, lw: number, lh: number, gx0: number, gy0: number,
  P: number, mid: number, k: number): Float32Array {
  const M = c.M, S = c.S;
  const Wt = bsplineWeights(step);
  // row pass: lattice rows -> full-resolution columns
  const T = c.f32(lh * S);
  for (let xx = M - P; xx < S - M + P; xx++) {
    const x = xx - M;
    const gx = Math.floor(x / step);
    const q = (x - gx * step) * 4;
    const w0 = Wt[q], w1 = Wt[q + 1], w2 = Wt[q + 2], w3 = Wt[q + 3];
    const base = gx - 1 - gx0;
    for (let j = 0; j < lh; j++) {
      const o = j * lw + base;
      T[j * S + xx] = w0 * L[o] + w1 * L[o + 1] + w2 * L[o + 2] + w3 * L[o + 3];
    }
  }
  // column pass (two output rows per sweep when they share the same four lattice rows)
  const D = c.f32(c.N);
  const x0 = M - P, x1 = S - M + P, rEnd = CH + M + P;
  const add = mid - mid * k;
  for (let rr = M - P; rr < rEnd;) {
    const wy = c.wy0 - (rr - M);
    const gy = Math.floor(wy / step);
    const q = (wy - gy * step) * 4;
    const w0 = Wt[q] * k, w1 = Wt[q + 1] * k, w2 = Wt[q + 2] * k, w3 = Wt[q + 3] * k;
    const o0 = (gy - 1 - gy0) * S, o1 = o0 + S, o2 = o1 + S, o3 = o2 + S;
    const out = rr * S;
    if (q >= 4 && rr + 1 < rEnd) {
      // next row (wy - 1) lies in the same lattice interval
      const v0 = Wt[q - 4] * k, v1 = Wt[q - 3] * k, v2 = Wt[q - 2] * k, v3 = Wt[q - 1] * k;
      const out2 = out + S;
      for (let xx = x0; xx < x1; xx++) {
        const a = T[o0 + xx], b = T[o1 + xx], cc = T[o2 + xx], d = T[o3 + xx];
        D[out + xx] = add + w0 * a + w1 * b + w2 * cc + w3 * d;
        D[out2 + xx] = add + v0 * a + v1 * b + v2 * cc + v3 * d;
      }
      rr += 2;
    } else {
      for (let xx = x0; xx < x1; xx++) D[out + xx] = add + w0 * T[o0 + xx] + w1 * T[o1 + xx] + w2 * T[o2 + xx] + w3 * T[o3 + xx];
      rr += 1;
    }
  }
  return D;
}

let GTILE: Float32Array | null = null;

/**
 * Per-pixel white-noise grain in [0,1) for the margin layout. Reads a 256x256 hash tile with a
 * hashed offset per 256-row world block: a pure function of world coordinates (seamless,
 * margin-consistent), one array read per pixel instead of a hash.
 */
export function grain(c: Chunk, seed: number, pad = 1): Float32Array {
  if (!GTILE) {
    GTILE = new Float32Array(65536);
    for (let k = 0; k < 65536; k++) GTILE[k] = hash2(k & 255, k >> 8, 0x51ed);
  }
  const T = GTILE;
  const D = c.f32(c.N);
  const M = c.M, S = c.S, P = Math.min(pad, M);
  let blk = 1e9, ox = 0, oy = 0;
  for (let rr = M - P; rr < CH + M + P; rr++) {
    const wy = c.wy0 - (rr - M);
    const k = wy >> 8;
    if (k !== blk) {
      blk = k;
      ox = (hash2(k, 1, seed) * 256) | 0;
      oy = (hash2(k, 2, seed) * 256) | 0;
    }
    const base = ((wy + oy) & 255) << 8;
    const o = rr * S;
    for (let xx = M - P; xx < S - M + P; xx++) D[o + xx] = T[base | ((xx - M + ox) & 255)];
  }
  return D;
}

// ------------------------------------------------------------------------------ sites & cells

/**
 * An array that is already in the generic (object) elements kind, so empty and filled lists
 * share one hidden class (avoids V8 deopts when hot loops see both).
 */
export function list<T>(): T[] {
  const a = [null] as unknown as T[];
  a.length = 0;
  return a;
}

/**
 * A deterministic world-space feature (oasis, ruin, island, platform...). Fields start as
 * doubles so the hidden class never changes representation (keeps optimised code stable).
 */
export class Site {
  wx = 0.5;   // world x
  wy = 0.5;   // world y
  r = 0.5;    // chunk row of the centre (may be outside 0..CH-1)
  h1 = 0.5; h2 = 0.5; h3 = 0.5; h4 = 0.5; // hashes in [0,1)
  constructor(wx: number, wy: number, r: number, h1: number, h2: number, h3: number, h4: number) {
    this.wx = wx; this.wy = wy; this.r = r; this.h1 = h1; this.h2 = h2; this.h3 = h3; this.h4 = h4;
  }
}

/**
 * Sites placed in horizontal world bands of height `band` (at most one per band, with
 * probability `prob`), returned when they lie within `reach` px of this chunk.
 * x is chosen in [xMin, w - xMin].
 */
export function sites(c: Chunk, band: number, salt: number, prob: number, reach: number, xMin: number): Site[] {
  const out = list<Site>();
  const lo = Math.floor((c.wy0 - CH - reach) / band), hi = Math.floor((c.wy0 + reach) / band);
  for (let b = lo; b <= hi; b++) {
    if (b < 0) continue;
    if (hash2(b, 17, c.seed + salt) >= prob) continue;
    const h1 = hash2(b, 29, c.seed + salt), h2 = hash2(b, 31, c.seed + salt);
    const wx = xMin + h1 * Math.max(0, c.w - 2 * xMin);
    const wy = (b + 0.2 + 0.6 * h2) * band;
    const r = c.wy0 - wy;
    if (r < -reach || r > CH + reach) continue;
    out.push(new Site(wx, wy, r, h1, h2, hash2(b, 37, c.seed + salt), hash2(b, 41, c.seed + salt)));
  }
  return out;
}

/** Warm-up chunks only: guarantees a site in the middle of the chunk so its code path runs. */
export function ensureSite(c: Chunk, list: Site[]): void {
  if (c.force && list.length === 0) list.push(new Site(c.w * 0.5, c.wy0 - CH * 0.5, CH * 0.5, 0.37, 0.61, 0.5, 0.45));
}

/**
 * Visits one jittered candidate point per world cell (size `cell`) whose centre lies inside the
 * chunk. Deterministic across chunks (each candidate belongs to exactly one chunk).
 * cb(x, row, h1, h2) — h1/h2 are independent hashes in [0,1).
 */
export function eachCell(c: Chunk, cell: number, salt: number, cb: (x: number, r: number, h1: number, h2: number) => void): void {
  const cy0 = Math.floor((c.wy0 - CH + 1) / cell), cy1 = Math.floor(c.wy0 / cell);
  const cx1 = Math.floor((c.w - 1) / cell);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = 0; cx <= cx1; cx++) {
      const wx = (cx + 0.15 + 0.7 * hash2(cx, cy, c.seed + salt)) * cell;
      const wy = (cy + 0.15 + 0.7 * hash2(cx, cy, c.seed + salt + 1)) * cell;
      const r = c.wy0 - wy;
      if (wx >= c.w || r < 0 || r >= CH) continue;
      cb(wx, r, hash2(cx, cy, c.seed + salt + 2), hash2(cx, cy, c.seed + salt + 3));
    }
  }
}

/** True when (x, r) is at least `d` px away from every doodad already placed in the chunk. */
export function farFromDoodads(c: Chunk, x: number, r: number, d: number): boolean {
  const d2 = d * d, list = c.doodads;
  for (let k = 0; k < list.length; k++) {
    const dx = list[k].x - x, dy = list[k].y - r;
    if (dx * dx + dy * dy < d2) return false;
  }
  return true;
}

export interface MeanderOpts {
  amp: number; wave: number; wave2: number; amp2: number; width: number; widthVar: number; widthWave: number;
  gateWave?: number; gateLo?: number; gateHi?: number; centre?: number;
}

/**
 * A smooth meandering band (river, canyon, lava flow...) defined in world space:
 * centre x and half-width are pure functions of worldY, so every chunk agrees.
 */
export class Meander {
  constructor(readonly w: number, readonly seed: number, readonly o: MeanderOpts,
    readonly noise: (x: number, y: number, s: number) => number) {}

  /** Centre x at world y. */
  xc(wy: number): number {
    const o = this.o;
    return this.w * (o.centre ?? 0.5) + o.amp * (this.noise(wy / o.wave, 3.7, this.seed) * 2 - 1)
      + o.amp2 * (this.noise(wy / o.wave2, 8.3, this.seed) * 2 - 1);
  }

  /** Half-width at world y (0 where the band is gated off). */
  hw(wy: number): number {
    const o = this.o;
    let width = o.width + o.widthVar * (this.noise(wy / o.widthWave, 5.1, this.seed) * 2 - 1);
    if (o.gateWave) {
      const g = this.noise(wy / o.gateWave, 1.9, this.seed);
      const lo = o.gateLo ?? 0.4, hi = o.gateHi ?? 0.55;
      width *= g <= lo ? 0 : g >= hi ? 1 : Math.sqrt((g - lo) / (hi - lo));
    }
    return width;
  }

  /** Per margin-layout row: centre x, half-width and dx/dy slope of the centre line. */
  rows(c: Chunk): { xc: Float32Array; hw: Float32Array; slope: Float32Array } {
    const rows = CH + 2 * c.M;
    const xc = c.f32(rows), hw = c.f32(rows), slope = c.f32(rows);
    for (let rr = 0; rr < rows; rr++) {
      const wy = c.wy0 - (rr - c.M);
      xc[rr] = this.xc(wy);
      slope[rr] = (this.xc(wy + 1) - this.xc(wy - 1)) * 0.5;
      hw[rr] = c.force ? Math.max(this.hw(wy), this.o.width) : this.hw(wy);
    }
    return { xc, hw, slope };
  }

  /** True when the band comes within `pad` px of the world rectangle [x0,x1] x [wyLo,wyHi]. */
  hits(x0: number, x1: number, wyLo: number, wyHi: number, pad: number): boolean {
    for (let wy = wyLo; wy <= wyHi; wy += 6) {
      const h = this.hw(wy);
      if (h < 0.5) continue;
      const x = this.xc(wy);
      if (x + h + pad > x0 && x - h - pad < x1) return true;
    }
    return false;
  }
}

/**
 * Per-pixel Voronoi evaluator over jittered world-cell points (no allocation per query).
 * Usage in hot loops: set qx / qy (world coords) then call run() — passing doubles through
 * fields avoids boxing them as call arguments. Results: f1/f2 = distances to the nearest /
 * second nearest point, (dx, dy) = query minus nearest point in WORLD units (dy grows upward),
 * id = hash of the nearest cell.
 */
export class Voronoi {
  qx = 0.5; qy = 0.5;
  f1 = 0.5; f2 = 0.5; dx = 0.5; dy = 0.5; id = 0.5;
  private readonly PX: Float32Array;
  private readonly PY: Float32Array;
  private readonly PI: Float32Array;
  private readonly nx: number;
  private readonly cx0: number;
  private readonly cy0: number;
  private readonly inv: number;

  /** `reach` = how many px outside the chunk will be queried (margins, warps). */
  constructor(c: Chunk, readonly cell: number, seed: number, jitter: number, reach: number) {
    const r = reach + cell;
    this.cx0 = Math.floor(-r / cell) - 1;
    const cx1 = Math.floor((c.w + r) / cell) + 1;
    this.cy0 = Math.floor((c.wy0 - CH - r) / cell) - 1;
    const cy1 = Math.floor((c.wy0 + r) / cell) + 1;
    this.nx = cx1 - this.cx0 + 1;
    const ny = cy1 - this.cy0 + 1;
    this.PX = c.f32(this.nx * ny);
    this.PY = c.f32(this.nx * ny);
    this.PI = c.f32(this.nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        const gx = this.cx0 + i, gy = this.cy0 + j, k = j * this.nx + i;
        this.PX[k] = (gx + 0.5 + (hash2(gx, gy, seed) - 0.5) * jitter) * cell;
        this.PY[k] = (gy + 0.5 + (hash2(gx, gy, seed + 71) - 0.5) * jitter) * cell;
        this.PI[k] = hash2(gx, gy, seed + 151);
      }
    }
    this.inv = 1 / cell;
  }

  /** Evaluates the diagram at world (x, wy) (convenience; prefer qx/qy + run() in hot loops). */
  at(x: number, wy: number): void {
    this.qx = x;
    this.qy = wy;
    this.run();
  }

  /** Evaluates the diagram at (qx, qy). */
  run(): void {
    const x = this.qx, wy = this.qy;
    const ccx = Math.floor(x * this.inv) - this.cx0, ccy = Math.floor(wy * this.inv) - this.cy0;
    const PX = this.PX, PY = this.PY, nx = this.nx;
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const row = (ccy + dy) * nx + ccx;
      for (let dx = -1; dx <= 1; dx++) {
        const k = row + dx;
        const ex = x - PX[k], ey = wy - PY[k];
        const d = ex * ex + ey * ey;
        if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
      }
    }
    this.f1 = Math.sqrt(d1);
    this.f2 = Math.sqrt(d2);
    this.dx = x - PX[best];
    this.dy = wy - PY[best];
    this.id = this.PI[best];
  }
}
