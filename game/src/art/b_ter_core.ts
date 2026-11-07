// =====================================================================================
//  TERRAIN CORE — shared low-level helpers for the per-biome terrain painters
//  (src/art/b_ter_<biome>.ts). Everything works in WORLD coordinates so chunks are seamless:
//    worldX = column (0..width-1), worldY = (index + 1) * CHUNK_H - 1 - row (increases UPWARD).
//  Every per-pixel buffer uses the same layout: the chunk plus a margin of M px on each side,
//  stride S = width + 2M, index(x, row) = (row + M) * S + x + M. Margins let painters sample
//  neighbours (slopes, cast shadows, cliff faces) across chunk edges with identical results.
// =====================================================================================
import { CHUNK_H } from '../config';
import { hash2 } from './noise';
import type { DoodadPlacement } from './terrain';

export const CH = CHUNK_H;
/** Margin (px) around the chunk covered by every field buffer. */
export const MARGIN = 14;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ------------------------------------------------------------------------------ colours

/** 0xRRGGBB -> opaque packed little-endian ABGR (for Uint32Array views over ImageData). */
export function pack(hex: number): number {
  return (0xff000000 | ((hex & 0xff) << 16) | (hex & 0xff00) | ((hex >> 16) & 0xff)) >>> 0;
}

/** Linear mix of two 0xRRGGBB colours. */
export function mixHex(a: number, b: number, t: number): number {
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
  return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0;
}

/** Packed ramp (dark -> light) from 0xRRGGBB stops. */
export function ramp(...hex: number[]): Uint32Array {
  return Uint32Array.from(hex.map(pack));
}

/** Packed ramp of `n` colours interpolated through the given 0xRRGGBB stops. */
export function rampN(n: number, ...stops: number[]): Uint32Array {
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    out[i] = pack(mixHex(stops[k], stops[k + 1], t - k));
  }
  return out;
}

/** Derived ramp: every colour of `src` (0xRRGGBB stops) mixed toward `toward` by t. */
export function rampToward(src: number[], toward: number, t: number): Uint32Array {
  return Uint32Array.from(src.map((c) => pack(mixHex(c, toward, t))));
}

/** Ordered 4x4 Bayer thresholds in [0, 1). */
const B4 = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));
/** Bayer threshold for a world pixel. */
export const bayer4 = (x: number, wy: number): number => B4[((wy & 3) << 2) | (x & 3)];

/** Pick a dithered colour from a ramp: t in [0,1] (tone), d in [0,1) (dither threshold). */
export function tone(r: Uint32Array, t: number, d: number): number {
  const n = r.length;
  const k = Math.floor(t * (n - 1) + d);
  return r[k < 0 ? 0 : k >= n ? n - 1 : k];
}

// ------------------------------------------------------------------------------ scratch pool

const pool: Float32Array[] = [];
let poolIdx = 0;

/** Pooled Float32Array of at least n entries (stale content!). Reset at every chunk start. */
export function scratch(n: number): Float32Array {
  let a = pool[poolIdx];
  if (!a || a.length < n) {
    a = new Float32Array(n);
    pool[poolIdx] = a;
  }
  poolIdx++;
  return a;
}

// ------------------------------------------------------------------------------ chunk context

/** Everything a painter needs to render one chunk. */
export class Chunk {
  readonly h = CH;
  readonly M = MARGIN;
  readonly S: number;          // stride of the margin layout
  readonly N: number;          // entries in a margin-layout buffer
  readonly wy0: number;        // world Y of row 0 (top row)
  readonly img: ImageData;
  readonly px: Uint32Array;    // packed ABGR pixels of img (w x CH)
  readonly doodads: DoodadPlacement[] = [];

  constructor(readonly w: number, readonly index: number, readonly seed: number) {
    this.S = w + 2 * MARGIN;
    this.N = this.S * (CH + 2 * MARGIN);
    this.wy0 = (index + 1) * CH - 1;
    this.img = new ImageData(w, CH);
    this.px = new Uint32Array(this.img.data.buffer);
    poolIdx = 0;
  }

  /** Index of (x, row) in the margin layout. */
  idx(x: number, r: number): number {
    return (r + MARGIN) * this.S + x + MARGIN;
  }

  /** Adds a doodad if its centre lies inside this chunk (rows 0..CH-1). */
  add(key: string, x: number, r: number, flipX = false, scale = 1): void {
    if (r < 0 || r >= CH || x < 0 || x >= this.w) return;
    const d: DoodadPlacement = { key, x: Math.round(x), y: Math.round(r) };
    if (flipX) d.flipX = true;
    if (scale !== 1) d.scale = scale;
    this.doodads.push(d);
  }
}

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
 * Samples fn(worldX, worldY) on a world-aligned lattice of spacing `step` (power of two) and
 * upsamples it with a smooth cubic B-spline into a margin-layout buffer. Because the lattice is
 * world-aligned, the result is identical across chunk edges (seamless).
 */
export function field(c: Chunk, step: number, fn: (wx: number, wy: number) => number): Float32Array {
  const M = c.M, S = c.S, w = c.w;
  const gx0 = Math.floor(-M / step) - 1;
  const gx1 = Math.floor((w + M - 1) / step) + 2;
  const wyTop = c.wy0 + M, wyBot = c.wy0 - (CH + M - 1);
  const gy0 = Math.floor(wyBot / step) - 1;
  const gy1 = Math.floor(wyTop / step) + 2;
  const lw = gx1 - gx0 + 1, lh = gy1 - gy0 + 1;
  const L = scratch(lw * lh);
  for (let j = 0; j < lh; j++) {
    const wy = (gy0 + j) * step;
    const o = j * lw;
    for (let i = 0; i < lw; i++) L[o + i] = fn((gx0 + i) * step, wy);
  }
  const Wt = bsplineWeights(step);
  // row pass: lattice rows -> full-resolution columns
  const T = scratch(lh * S);
  for (let xx = 0; xx < S; xx++) {
    const x = xx - M;
    const gx = Math.floor(x / step);
    const k = (x - gx * step) * 4;
    const w0 = Wt[k], w1 = Wt[k + 1], w2 = Wt[k + 2], w3 = Wt[k + 3];
    const base = gx - 1 - gx0;
    for (let j = 0; j < lh; j++) {
      const o = j * lw + base;
      T[j * S + xx] = w0 * L[o] + w1 * L[o + 1] + w2 * L[o + 2] + w3 * L[o + 3];
    }
  }
  // column pass
  const D = scratch(c.N);
  const rows = CH + 2 * M;
  for (let rr = 0; rr < rows; rr++) {
    const wy = c.wy0 - (rr - M);
    const gy = Math.floor(wy / step);
    const k = (wy - gy * step) * 4;
    const w0 = Wt[k], w1 = Wt[k + 1], w2 = Wt[k + 2], w3 = Wt[k + 3];
    const o0 = (gy - 1 - gy0) * S, o1 = o0 + S, o2 = o1 + S, o3 = o2 + S;
    const out = rr * S;
    for (let xx = 0; xx < S; xx++) D[out + xx] = w0 * T[o0 + xx] + w1 * T[o1 + xx] + w2 * T[o2 + xx] + w3 * T[o3 + xx];
  }
  return D;
}

/** Per-pixel hash grain in [0,1) for the margin layout (world-seeded, seamless). */
export function grain(c: Chunk, seed: number): Float32Array {
  const D = scratch(c.N);
  const M = c.M, S = c.S, rows = CH + 2 * M;
  for (let rr = 0; rr < rows; rr++) {
    const wy = c.wy0 - (rr - M);
    const o = rr * S;
    for (let xx = 0; xx < S; xx++) D[o + xx] = hash2(xx - M, wy, seed);
  }
  return D;
}

export interface Cells {
  f1: Float32Array;   // distance to the nearest feature point (px)
  f2: Float32Array;   // distance to the second nearest
  id: Float32Array;   // hash [0,1) of the nearest cell
}

/**
 * Cellular (Worley) noise in the margin layout, over jittered points of world cells of size
 * `cell`. Only `pad` px of margin are computed (the rest is left at 0). Optional domain warp.
 */
export function cellular(c: Chunk, cell: number, seed: number, jitter: number, pad: number,
  warpX?: Float32Array, warpY?: Float32Array, warpAmp = 0): Cells {
  const M = c.M, S = c.S, w = c.w;
  const reach = pad + warpAmp + cell;
  const cx0 = Math.floor(-reach / cell) - 1, cx1 = Math.floor((w + reach) / cell) + 1;
  const cy0 = Math.floor((c.wy0 - CH - reach) / cell) - 1, cy1 = Math.floor((c.wy0 + reach) / cell) + 1;
  const nx = cx1 - cx0 + 1, ny = cy1 - cy0 + 1;
  const PX = scratch(nx * ny), PY = scratch(nx * ny), PI = scratch(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gx = cx0 + i, gy = cy0 + j, k = j * nx + i;
      PX[k] = (gx + 0.5 + (hash2(gx, gy, seed) - 0.5) * jitter) * cell;
      PY[k] = (gy + 0.5 + (hash2(gx, gy, seed + 71) - 0.5) * jitter) * cell;
      PI[k] = hash2(gx, gy, seed + 151);
    }
  }
  const f1 = scratch(c.N), f2 = scratch(c.N), id = scratch(c.N);
  const inv = 1 / cell;
  for (let r = -pad; r < CH + pad; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M - pad;
    for (let x = -pad; x < w + pad; x++, i++) {
      let qx = x, qy = wy;
      if (warpX && warpY) {
        qx += (warpX[i] - 0.5) * warpAmp;
        qy += (warpY[i] - 0.5) * warpAmp;
      }
      const ccx = Math.floor(qx * inv) - cx0, ccy = Math.floor(qy * inv) - cy0;
      let d1 = 1e9, d2 = 1e9, best = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = (ccy + dy) * nx;
        for (let dx = -1; dx <= 1; dx++) {
          const k = row + ccx + dx;
          const ex = PX[k] - qx, ey = PY[k] - qy;
          const d = ex * ex + ey * ey;
          if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
        }
      }
      f1[i] = Math.sqrt(d1);
      f2[i] = Math.sqrt(d2);
      id[i] = PI[best];
    }
  }
  return { f1, f2, id };
}

// ------------------------------------------------------------------------------ sites & cells

/** A deterministic world-space feature (oasis, ruin, island, platform...). */
export interface Site {
  wx: number;   // world x
  wy: number;   // world y
  r: number;    // chunk row of the centre (may be outside 0..CH-1)
  h1: number; h2: number; h3: number; h4: number; // hashes in [0,1)
}

/**
 * Sites placed in horizontal world bands of height `band` (at most one per band, with
 * probability `prob`), returned when they lie within `reach` px of this chunk.
 * x is chosen in [xMin, w - xMin].
 */
export function sites(c: Chunk, band: number, salt: number, prob: number, reach: number, xMin: number): Site[] {
  const out: Site[] = [];
  const lo = Math.floor((c.wy0 - CH - reach) / band), hi = Math.floor((c.wy0 + reach) / band);
  for (let b = lo; b <= hi; b++) {
    if (b < 0) continue;
    if (hash2(b, 17, c.seed + salt) >= prob) continue;
    const h1 = hash2(b, 29, c.seed + salt), h2 = hash2(b, 31, c.seed + salt);
    const wx = xMin + h1 * Math.max(0, c.w - 2 * xMin);
    const wy = (b + 0.2 + 0.6 * h2) * band;
    const r = c.wy0 - wy;
    if (r < -reach || r > CH + reach) continue;
    out.push({ wx, wy, r, h1, h2, h3: hash2(b, 37, c.seed + salt), h4: hash2(b, 41, c.seed + salt) });
  }
  return out;
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
  const d2 = d * d;
  for (const o of c.doodads) {
    const dx = o.x - x, dy = o.y - r;
    if (dx * dx + dy * dy < d2) return false;
  }
  return true;
}

/** Row-wise smooth 1D meander: fills centre x and half-width per margin-layout row. */
export function meander(c: Chunk, seed: number, opts: {
  amp: number; wave: number; wave2: number; amp2: number; width: number; widthVar: number; widthWave: number;
  gateWave?: number; gateLo?: number; gateHi?: number; centre?: number;
}, noise: (x: number, y: number, s: number) => number): { xc: Float32Array; hw: Float32Array; slope: Float32Array } {
  const rows = CH + 2 * c.M;
  const xc = scratch(rows), hw = scratch(rows), slope = scratch(rows);
  const centre = opts.centre ?? 0.5;
  const at = (wy: number) => c.w * centre + opts.amp * (noise(wy / opts.wave, 3.7, seed) * 2 - 1) + opts.amp2 * (noise(wy / opts.wave2, 8.3, seed) * 2 - 1);
  for (let rr = 0; rr < rows; rr++) {
    const wy = c.wy0 - (rr - c.M);
    xc[rr] = at(wy);
    slope[rr] = (at(wy + 1) - at(wy - 1)) * 0.5;
    let width = opts.width + opts.widthVar * (noise(wy / opts.widthWave, 5.1, seed) * 2 - 1);
    if (opts.gateWave) width *= smoothstep(opts.gateLo ?? 0.4, opts.gateHi ?? 0.55, noise(wy / opts.gateWave, 1.9, seed));
    hw[rr] = width;
  }
  return { xc, hw, slope };
}
