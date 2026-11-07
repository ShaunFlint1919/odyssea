// =====================================================================================
//  SPRITE PAINTER — small RGBA raster toolkit for the terrain doodads (b_ter_dd_*.ts) and
//  cloud puffs. Every volume is shaded with the same top-left light and Bayer-dithered onto
//  a colour ramp, so all doodads share one lighting model. Colours are 0xRRGGBB numbers.
// =====================================================================================
import { hash2 } from './noise';

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Bayer 4x4 threshold in [0,1). */
export const dith = (x: number, y: number): number => B4[((y & 3) << 2) | (x & 3)];

// Light direction (screen x right, y down, z toward the viewer): from the top-left, above.
const LL = Math.hypot(-0.55, -0.7, 0.85);
export const LX = -0.55 / LL, LY = -0.7 / LL, LZ = 0.85 / LL;

/** Pick a dithered colour of a ramp (dark -> light). */
export function pick(ramp: number[], t: number, x: number, y: number): number {
  const n = ramp.length;
  const k = Math.floor(t * (n - 1) + dith(x, y));
  return ramp[k < 0 ? 0 : k >= n ? n - 1 : k];
}

/** Mix two 0xRRGGBB colours. */
export function mixc(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

export interface BallOpts {
  rough?: number;         // per-pixel tone noise
  seed?: number;
  bias?: number;          // tone offset
  gain?: number;          // diffuse strength
  spec?: number;          // specular highlight strength (glossy)
  clip?: (x: number, y: number) => boolean; // return false to skip a pixel
  alpha?: number;
}

/** A small RGBA canvas being painted (0xRRGGBB colours, alpha 0..255). */
export class Spr {
  readonly d: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  /** Alpha at (x, y), 0 outside. */
  a(x: number, y: number): number {
    x |= 0; y |= 0;
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[(y * this.w + x) * 4 + 3] : 0;
  }

  /** Colour (0xRRGGBB) at (x, y). */
  c(x: number, y: number): number {
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    return (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2];
  }

  /** Overwrite a pixel. */
  set(x: number, y: number, col: number, a = 255): void {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = (col >> 16) & 255; this.d[i + 1] = (col >> 8) & 255; this.d[i + 2] = col & 255; this.d[i + 3] = a;
  }

  /** Alpha-over a pixel. */
  over(x: number, y: number, col: number, a: number): void {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 4;
    const sa = a / 255, da = this.d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    this.d[i] = (((col >> 16) & 255) * sa + this.d[i] * da * (1 - sa)) / oa;
    this.d[i + 1] = (((col >> 8) & 255) * sa + this.d[i + 1] * da * (1 - sa)) / oa;
    this.d[i + 2] = ((col & 255) * sa + this.d[i + 2] * da * (1 - sa)) / oa;
    this.d[i + 3] = oa * 255;
  }

  /** Paint only where the sprite is still transparent (draws "behind"). */
  under(x: number, y: number, col: number, a: number): void {
    if (this.a(x, y) === 0) this.set(x, y, col, a);
  }

  rect(x: number, y: number, w: number, h: number, col: number, a = 255): void {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, col, a);
  }

  /** Filled ellipse (pixel centres). */
  ellipse(cx: number, cy: number, rx: number, ry: number, col: number, a = 255): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, col, a);
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, col: number, a = 255): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, col, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled polygon (even-odd rule at pixel centres). pts = [x0, y0, x1, y1, ...]. */
  poly(pts: number[], col: number | ((x: number, y: number) => number), a = 255): void {
    let minY = Infinity, maxY = -Infinity;
    for (let k = 1; k < pts.length; k += 2) { minY = Math.min(minY, pts[k]); maxY = Math.max(maxY, pts[k]); }
    const n = pts.length >> 1;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let k = 0; k < n; k++) {
        const ax = pts[k * 2], ay = pts[k * 2 + 1], bx = pts[((k + 1) % n) * 2], by = pts[((k + 1) % n) * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          this.set(x, y, typeof col === 'number' ? col : col(x, y), a);
        }
      }
    }
  }

  /**
   * Shaded ellipsoid lit from the top-left (Lambert + optional specular), dithered on a ramp.
   * Works as a dome for rocks, crowns, eggs, balls...
   */
  ball(cx: number, cy: number, rx: number, ry: number, ramp: number[], o: BallOpts = {}): void {
    const rough = o.rough ?? 0, seed = o.seed ?? 1, bias = o.bias ?? 0, gain = o.gain ?? 1, spec = o.spec ?? 0;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const q = nx * nx + ny * ny;
        if (q > 1) continue;
        if (o.clip && !o.clip(x, y)) continue;
        const nz = Math.sqrt(1 - q);
        const lam = Math.max(0, nx * LX + ny * LY + nz * LZ);
        let t = 0.12 + lam * 0.85 * gain + bias + (hash2(x, y, seed) - 0.5) * rough;
        if (spec > 0) {
          const h = nx * LX + ny * LY + nz * LZ;
          if (h > 0.9) t += spec * (h - 0.9) * 10;
        }
        this.set(x, y, pick(ramp, t, x, y), o.alpha ?? 255);
      }
    }
  }

  /** A tapered leafy frond (palms, ferns) from (x0,y0) along angle `ang`, curling by `curl`. */
  frond(x0: number, y0: number, ang: number, len: number, curl: number, ramp: number[], leaf: number, seed: number): void {
    let x = x0, y = y0, a = ang;
    const steps = Math.ceil(len * 2);
    // lit when pointing up-left
    const facing = -(Math.cos(ang) * 0.6 + Math.sin(ang) * 0.8);
    for (let k = 0; k < steps; k++) {
      const f = k / steps;
      x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5;
      a += curl / steps;
      const w = leaf * (1 - f * 0.75) * (f < 0.12 ? f / 0.12 : 1);
      const px = -Math.sin(a), py = Math.cos(a);
      this.set(x, y, pick(ramp, 0.42 + facing * 0.25 + 0.1, x, y));
      if (k % 2 === 0) {
        for (let side = -1; side <= 1; side += 2) {
          for (let j = 1; j <= Math.round(w); j++) {
            const lx = x + px * j * side + Math.cos(a) * j * 0.45, ly = y + py * j * side + Math.sin(a) * j * 0.45;
            const lit = side * (px * LX + py * LY) > 0 ? 0.18 : -0.12;
            this.set(lx, ly, pick(ramp, 0.4 + facing * 0.22 + lit - j * 0.04 + (hash2(k, j * side, seed) - 0.5) * 0.15, lx, ly));
          }
        }
      }
    }
  }

  /** 1 px outline into transparent pixels (4-neighbourhood). */
  outline(col: number, a = 255): void {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.a(x, y) > 0) continue;
        if (this.a(x - 1, y) > 160 || this.a(x + 1, y) > 160 || this.a(x, y - 1) > 160 || this.a(x, y + 1) > 160) mark.push(x, y);
      }
    }
    for (let k = 0; k < mark.length; k += 2) this.set(mark[k], mark[k + 1], col, a);
  }

  /** Darkens the outermost opaque pixels on the bottom-right side (selective outline). */
  rimShade(col: number): void {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.a(x, y) < 160) continue;
        if (this.a(x + 1, y) === 0 || this.a(x, y + 1) === 0) mark.push(x, y);
      }
    }
    for (let k = 0; k < mark.length; k += 2) this.set(mark[k], mark[k + 1], col);
  }

  /** Contact / cast shadow: the current silhouette offset by (dx, dy), drawn behind. */
  shadow(dx: number, dy: number, alpha = 0.36, col = 0x000000): void {
    const sil: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.a(x, y) > 120) sil.push(x, y);
    const a = Math.round(alpha * 255);
    for (let k = 0; k < sil.length; k += 2) this.under(sil[k] + dx, sil[k + 1] + dy, col, a);
  }

  /** Long cast shadow of the silhouette (tall objects): smeared along (dx, dy). */
  longShadow(dx: number, dy: number, alpha = 0.34): void {
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = n; k >= 1; k--) this.shadow(Math.round((dx * k) / n), Math.round((dy * k) / n), alpha);
  }

  /** Soft dithered glow halo (semi-transparent) around (cx, cy), drawn behind. */
  glow(cx: number, cy: number, r: number, col: number, maxA = 120): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const q = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (q >= 1) continue;
        const k = (1 - q) * (1 - q);
        const lvl = Math.floor(k * 4 + dith(x, y)) / 4;
        if (lvl > 0) this.under(x, y, col, Math.round(maxA * lvl));
      }
    }
  }

  /** Converts to a canvas. */
  canvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.d);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
