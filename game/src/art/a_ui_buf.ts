// =====================================================================================
//  Shared low-level helpers for the fonts / UI / planet generators (ART-A, "a_ui_" prefix).
//  - PixBuf: a tiny RGBA buffer with crisp (non anti-aliased) pixel operations.
//  - Mask helpers: boolean shapes with dilation (outlines) and shifts (extrusions).
//  - Glyph-sheet parser for the hand-authored bitmap fonts.
//  - 3D value noise (sphere surfaces without seams or pole pinching).
// =====================================================================================
import { makeCanvas, parseColor, bayer } from './pixel';

/** RGBA pixel buffer (8 bits per channel). Generator-time only, never used per frame. */
export class PixBuf {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Overwrite a pixel with a '#rrggbb' / '#rrggbbaa' colour. */
  set(x: number, y: number, hex: string): void {
    if (!this.inside(x, y)) return;
    const c = parseColor(hex);
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  /** Overwrite a pixel with raw channels. */
  setRGBA(x: number, y: number, r: number, g: number, b: number, a = 255): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  /** Alpha-composite a colour over the pixel (alpha 0..1 multiplies the colour's own alpha). */
  blend(x: number, y: number, hex: string, alpha = 1): void {
    if (!this.inside(x, y) || alpha <= 0) return;
    const c = parseColor(hex);
    this.blendRGB(x, y, c[0], c[1], c[2], (c[3] / 255) * alpha);
  }

  /** Alpha-composite raw channels (sa 0..1) over the pixel. */
  blendRGB(x: number, y: number, r: number, g: number, b: number, sa: number): void {
    if (!this.inside(x, y) || sa <= 0) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const da = d[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    d[i] = (r * sa + d[i] * da * (1 - sa)) / oa;
    d[i + 1] = (g * sa + d[i + 1] * da * (1 - sa)) / oa;
    d[i + 2] = (b * sa + d[i + 2] * da * (1 - sa)) / oa;
    d[i + 3] = oa * 255;
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  fillRect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, hex);
  }

  /** Copy another buffer onto this one (alpha-over). */
  draw(src: PixBuf, dx: number, dy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        const a = src.data[i + 3];
        if (a === 0) continue;
        this.blendRGB(dx + x, dy + y, src.data[i], src.data[i + 1], src.data[i + 2], a / 255);
      }
    }
  }

  toCanvas(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

// ------------------------------------------------------------------------------ colours

/** Piecewise-linear colour ramp: stops sorted by position (0..1). Returns '#rrggbb'. */
export function gradientAt(stops: ReadonlyArray<readonly [number, string]>, t: number): string {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i];
    if (t <= p1) {
      const [p0, c0] = stops[i - 1];
      const k = p1 === p0 ? 1 : (t - p0) / (p1 - p0);
      const A = parseColor(c0), B = parseColor(c1);
      return hex3(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k);
    }
  }
  return stops[stops.length - 1][1];
}

/** '#rrggbb' from float channels (clamped, rounded). */
export function hex3(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Pick a colour from a discrete ramp at a continuous index with ordered dithering
 * (crisp retro gradients). Indices below 0 / above the end clamp to the ends.
 */
export function ditherRamp(ramp: readonly string[], idx: number, x: number, y: number): string {
  const i = Math.floor(idx + bayer(x, y) - 0.5);
  return ramp[Math.max(0, Math.min(ramp.length - 1, i))];
}

// ------------------------------------------------------------------------------ masks

/** Boolean shape of a fixed size (1 = inside). */
export class Mask {
  readonly m: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.m = new Uint8Array(w * h);
  }
  get(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1;
  }
  set(x: number, y: number, v = true): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = v ? 1 : 0;
  }
  /** Pixels outside this mask that touch it (4- or 8-neighbourhood). */
  ring(diagonals: boolean): Mask {
    const out = new Mask(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if ((!dx && !dy) || (!diagonals && dx && dy)) continue;
            if (this.get(x + dx, y + dy)) { near = true; break; }
          }
        }
        if (near) out.set(x, y);
      }
    }
    return out;
  }
  /** Union with another mask of the same size. */
  or(o: Mask): Mask {
    const out = new Mask(this.w, this.h);
    for (let i = 0; i < this.m.length; i++) out.m[i] = this.m[i] | o.m[i];
    return out;
  }
  /** Copy shifted by (dx, dy). */
  shift(dx: number, dy: number): Mask {
    const out = new Mask(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.get(x, y)) out.set(x + dx, y + dy);
    return out;
  }
}

/**
 * Fill a polygon into a mask (even-odd rule, sampled at pixel centres → crisp edges).
 * `pts` is a flat list [x0, y0, x1, y1, ...]. `value` false clears instead of filling.
 */
export function fillPolygon(mask: Mask, pts: readonly number[], value = true): void {
  const n = pts.length / 2;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { minY = Math.min(minY, pts[i * 2 + 1]); maxY = Math.max(maxY, pts[i * 2 + 1]); }
  const xs: number[] = [];
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(mask.h - 1, Math.ceil(maxY)); y++) {
    const sy = y + 0.5;
    xs.length = 0;
    for (let i = 0; i < n; i++) {
      const x0 = pts[i * 2], y0 = pts[i * 2 + 1];
      const x1 = pts[((i + 1) % n) * 2], y1 = pts[((i + 1) % n) * 2 + 1];
      if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.ceil(xs[k] - 0.5), xb = Math.floor(xs[k + 1] - 0.5);
      for (let x = Math.max(0, xa); x <= Math.min(mask.w - 1, xb); x++) mask.set(x, y, value);
    }
  }
}

// ------------------------------------------------------------------------------ glyph sheets

/**
 * Parse hand-authored glyph blocks. Each block = [chars, rows]; every row holds the glyphs of
 * the block side by side, `w` columns each, separated by one space. '#' = ink, anything else
 * = empty. Returns char -> rows (array of `w`-wide strings).
 */
export function parseGlyphBlocks(w: number, h: number, blocks: ReadonlyArray<readonly [string, readonly string[]]>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [chars, rows] of blocks) {
    if (rows.length !== h && import.meta.env?.DEV) console.warn(`[fonts] block "${chars}" has ${rows.length} rows, expected ${h}`);
    for (let i = 0; i < chars.length; i++) {
      const g: string[] = [];
      for (let r = 0; r < h; r++) {
        const row = rows[r] ?? '';
        g.push(row.substr(i * (w + 1), w).padEnd(w, '.'));
      }
      out.set(chars[i], g);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------ 3D noise

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1440662683) + Math.imul(seed | 0, 974634721)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const sstep = (t: number) => t * t * (3 - 2 * t);

/** Smooth 3D value noise in [0, 1). */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = sstep(x - xi), v = sstep(y - yi), w = sstep(z - zi);
  const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/** Fractal 3D value noise, ~[0, 1). */
export function fbm3(x: number, y: number, z: number, seed: number, octaves = 4): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3(x * freq, y * freq, z * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Integer hash -> [0, 1) for scattering details deterministically. */
export function hash1(n: number, seed: number): number {
  return hash3(n, n * 7 + 3, seed, seed ^ 0x5bd1e995);
}
