// =====================================================================================
//  A-FX CORE — small shared helpers for the player / projectile / pickup / FX art modules:
//  an RGBA pixel buffer, strip-sheet packing, colour helpers, a convex polygon rasteriser
//  (used by the faceted gems) and char-map utilities used by the hull banking transform.
//  Everything is pixel exact (no anti-aliasing) unless a caller deliberately writes alpha.
// =====================================================================================
import type Phaser from 'phaser';
import { makeCanvas, parseColor } from './pixel';

/** RGBA pixel buffer. Coordinates outside the buffer are ignored. */
export class PixBuf {
  readonly data: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(Math.max(1, w * h * 4));
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Overwrite a pixel with a colour (alpha 0..1 multiplies the colour's own alpha). */
  put(x: number, y: number, hex: string, alpha = 1): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = parseColor(hex);
    const i = (y * this.w + x) * 4;
    const d = this.data;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    d[i + 3] = alpha >= 1 ? c[3] : Math.round(c[3] * (alpha > 0 ? alpha : 0));
  }

  alphaAt(x: number, y: number): number {
    if (!this.inside(x | 0, y | 0)) return 0;
    return this.data[((y | 0) * this.w + (x | 0)) * 4 + 3];
  }

  /** Pixel-exact filled rectangle. */
  rect(x: number, y: number, w: number, h: number, hex: string, alpha = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, hex, alpha);
  }

  toCanvas(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

/** Pack same-size buffers side by side into ONE canvas (single putImageData, no per-frame canvas). */
export function stripCanvas(frames: PixBuf[]): HTMLCanvasElement {
  const fw = frames[0].w, fh = frames[0].h;
  const strip = new PixBuf(fw * frames.length, fh);
  frames.forEach((f, i) => {
    for (let y = 0; y < fh; y++) strip.data.set(f.data.subarray(y * fw * 4, (y + 1) * fw * 4), (y * strip.w + i * fw) * 4);
  });
  return strip.toCanvas();
}

/** Register a horizontal strip canvas as a sheet with numbered frames 0..n-1 (same layout as pixel.addSheet). */
export function addStrip(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, n: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas);
  if (!tex) return;
  const fw = canvas.width / n;
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, canvas.height);
}

/** Convenience: register PixBuf frames as a numbered sheet. */
export function addBufSheet(scene: Phaser.Scene, key: string, frames: PixBuf[]): void {
  if (frames.length) addStrip(scene, key, stripCanvas(frames), frames.length);
}

/** Clamp to [lo, hi]. */
export const clamp = (v: number, lo = 0, hi = 1): number => (v < lo ? lo : v > hi ? hi : v);
/** Hermite smoothstep. */
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeOut = (t: number, p = 2): number => 1 - Math.pow(1 - clamp(t), p);

/** 0xRRGGBB -> '#rrggbb'. */
export const hexOf = (n: number): string => `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;

/** Scale the brightness of a colour (f < 1 darker, f > 1 brighter, clamped). */
export function scaleColor(hex: string, f: number): string {
  const [r, g, b] = parseColor(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix of two colours (alpha ignored). */
export function lerpColor(a: string, b: string, t: number): string {
  const A = parseColor(a), B = parseColor(b);
  const c = (i: number) => Math.round(A[i] + (B[i] - A[i]) * clamp(t)).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

/** Boost saturation of a colour away from its luma (f > 1 = more saturated). */
export function saturate(hex: string, f: number): string {
  const [r, g, b] = parseColor(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(l + (v - l) * f))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ------------------------------------------------------------------ convex polygon raster

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** Fill a convex polygon (any winding) by sampling pixel centres. Calls plot(x, y). */
export function fillConvex(pts: Vec2[], plot: (x: number, y: number) => void): void {
  if (pts.length < 3) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  // signed area -> winding
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  const s = area >= 0 ? 1 : -1;
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = true;
      for (let i = 0; i < pts.length && inside; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        const e = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * s;
        if (e < -1e-6) inside = false;
      }
      if (inside) plot(x, y);
    }
  }
}

export function norm3(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/** Rotate around the vertical (screen Y) axis. */
export function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

/** Light direction used by every A-FX sprite: from the top-left, towards the viewer. */
export const LIGHT: Vec3 = norm3([-0.55, -0.75, 0.9]);

/**
 * Flat-shaded convex polyhedron renderer. Space: x right, y DOWN (screen), z towards the
 * viewer; orthographic projection. The polyhedron must be convex and contain the origin
 * (normals are oriented outwards from the origin, so face winding does not matter).
 * Returns per-pixel light values (0..1, -1 = empty) and the face index per pixel, so callers
 * can quantise to their own ramp and pick facet-specific details.
 */
export function renderPolyhedron(
  w: number, h: number, verts: Vec3[], faces: number[][], scale: number, cx: number, cy: number, angle: number, tilt = 0,
): { light: Float32Array; face: Int16Array } {
  const light = new Float32Array(w * h).fill(-1);
  const face = new Int16Array(w * h).fill(-1);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  // spin around Y, then tilt the top towards the viewer (rotation around X)
  const rv = verts.map((v) => {
    const r = rotY(v, angle);
    return [r[0], r[1] * ct + r[2] * st, -r[1] * st + r[2] * ct] as Vec3;
  });
  const half = norm3([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
  faces.forEach((f, fi) => {
    const a = rv[f[0]], b = rv[f[1]], c = rv[f[2]];
    let n = norm3(cross3([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
    let mx = 0, my = 0, mz = 0;
    for (const i of f) { mx += rv[i][0]; my += rv[i][1]; mz += rv[i][2]; }
    if (dot3(n, [mx, my, mz]) < 0) n = [-n[0], -n[1], -n[2]];
    if (n[2] <= 0.03) return; // back face
    const diffuse = Math.max(0, dot3(n, LIGHT));
    const spec = Math.pow(Math.max(0, dot3(n, half)), 16);
    const val = clamp(0.16 + diffuse * 0.74 + spec * 0.45);
    const pts: Vec2[] = f.map((i) => [cx + rv[i][0] * scale, cy + rv[i][1] * scale]);
    fillConvex(pts, (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      light[y * w + x] = val;
      face[y * w + x] = fi;
    });
  });
  return { light, face };
}

// ------------------------------------------------------------------ char-map utilities

/** Ordered ramps of chars; shiftChar moves a char along its ramp. */
export function makeShifter(ramps: string[]): (ch: string, d: number) => string {
  const pos = new Map<string, [string, number]>();
  for (const r of ramps) for (let i = 0; i < r.length; i++) pos.set(r[i], [r, i]);
  return (ch: string, d: number): string => {
    const p = pos.get(ch);
    if (!p || d === 0) return ch;
    const [r, i] = p;
    return r[Math.max(0, Math.min(r.length - 1, i + d))];
  };
}
