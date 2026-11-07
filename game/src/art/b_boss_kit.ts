// =====================================================================================
//  BOSS ART KIT — palette-independent "code grid" + shading primitives used by every
//  boss / boss-part generator (src/art/b_boss_*.ts).
//
//  A Grid stores one colour CODE per pixel, using the exact pixel-map convention of
//  src/art/pixel.ts: digits '1'..'5' = palette ramp (dark -> light), letters = fixed colours
//  (COMMON_COLORS + BOSS_COLORS). A boss is composed ONCE as codes (bevelled plates, domes,
//  barrels, grooves, rivets, vents, glows, ASCII stamps) and then rendered for every Palette
//  by gridCanvas(), which only swaps the ramp colours. Everything is crisp (no anti-aliasing),
//  lit from the top-left, with ordered (Bayer) dithering for smooth retro gradients.
// =====================================================================================
import { bayer, COMMON_COLORS, makeCanvas, outlineCanvas, parseColor, rampColors, type ColorMap } from './pixel';
import { hash2 } from './noise';
import type { Palette } from '../types';

/** Five grid codes forming a colour ramp, dark -> light. */
export type Ramp = readonly [string, string, string, string, string];

/** The swappable palette ramp (digits). */
export const RAMP: Ramp = ['1', '2', '3', '4', '5'];
/** Fixed gunmetal greys (machinery, barrels, tracks). */
export const GREY: Ramp = ['K', 'g', 'G', 'h', 'H'];
/** Fixed glow ramps (read in every palette). */
export const FIRE: Ramp = ['r', 'e', 'E', 'y', 'w'];
export const TEAL: Ramp = ['j', 't', 'T', 'u', 'w'];
export const MAGENTA: Ramp = ['n', 'm', 'M', 'p', 'w'];
export const ICE: Ramp = ['b', 'c', 'C', 'q', 'w'];
export const ACID: Ramp = ['i', 'l', 'V', 'Z', 'w'];
export const BLOOD: Ramp = ['o', 'r', 'R', 'O', 'w'];

/** Extra fixed colours used by boss art (on top of COMMON_COLORS). */
export const BOSS_COLORS: ColorMap = {
  ...COMMON_COLORS,
  j: '#063834', u: '#b0fff0',            // teal deep / teal pale
  n: '#320a44', p: '#f6c4ff',            // magenta deep / magenta pale
  b: '#0a2444',                          // ice deep
  i: '#123208', l: '#3a8a10', V: '#9aee2a', Z: '#eaff96', // acid bio-glow
  o: '#3a0608', O: '#ff9a8a',            // blood deep / blood pale
  s: '#f0c890', S: '#5a3a1a',            // sand light / dark (desert dust, scorch rims)
};

// ------------------------------------------------------------------ code families (shade)
const FAMILY_STRINGS = ['k12345', 'kKgGhH', 'kreEyw', 'kjtTuw', 'knmMpw', 'kbcCqw', 'kilVZw', 'koRO'];
const FAM_ID = new Int8Array(128).fill(-1);
const FAM_IDX = new Int8Array(128).fill(-1);
const FAM_CODES: number[][] = FAMILY_STRINGS.map((s) => s.split('').map((c) => c.charCodeAt(0)));
FAMILY_STRINGS.forEach((s, fi) => {
  s.split('').forEach((c, ci) => {
    const code = c.charCodeAt(0);
    if (c === 'k' || c === 'w') return; // shared by several families: never re-shaded
    if (FAM_ID[code] === -1) { FAM_ID[code] = fi; FAM_IDX[code] = ci; }
  });
});
const CODE_K = 'k'.charCodeAt(0);

/** Shift a code `delta` steps darker (<0) or lighter (>0) inside its family. */
export function shadeCode(code: number, delta: number, minIdx = 0): number {
  const f = FAM_ID[code];
  if (f < 0) return code;
  const fam = FAM_CODES[f];
  const i = Math.max(minIdx, Math.min(fam.length - 1, FAM_IDX[code] + Math.round(delta)));
  return fam[i];
}

/** Ramp level (1..5) of a code within its family, or 0 when unknown (k, w, ...). */
export function levelOf(code: number): number {
  return FAM_ID[code] < 0 ? 0 : FAM_IDX[code];
}

// ------------------------------------------------------------------ grid
/** Palette-independent pixel grid of colour codes (0 = transparent). */
export class Grid {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number, px?: Uint8Array) {
    this.px = px ?? new Uint8Array(w * h);
  }
  clone(): Grid { return new Grid(this.w, this.h, this.px.slice()); }
  inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number): number { return this.inb(x, y) ? this.px[y * this.w + x] : 0; }
  filled(x: number, y: number): boolean { return this.get(x, y) !== 0; }
  set(x: number, y: number, ch: string): void { if (this.inb(x, y)) this.px[y * this.w + x] = ch.charCodeAt(0); }
  setCode(x: number, y: number, code: number): void { if (this.inb(x, y)) this.px[y * this.w + x] = code; }
  clear(x: number, y: number): void { if (this.inb(x, y)) this.px[y * this.w + x] = 0; }
  /** Relative shading of an existing pixel (no-op on transparent pixels). */
  shade(x: number, y: number, delta: number, minIdx = 0): void {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    const c = this.px[i];
    if (c) this.px[i] = shadeCode(c, delta, minIdx);
  }
  /** Copy another grid on top (non-transparent pixels only) at an offset. */
  blit(src: Grid, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (c) this.setCode(ox + x, oy + y, c);
    }
  }
}

// ------------------------------------------------------------------ shapes
/** A pixel shape: integer bounding box + membership test on pixel indices (centre-sampled). */
export interface Shape { x0: number; y0: number; x1: number; y1: number; has(x: number, y: number): boolean }

const bb = (x0: number, y0: number, x1: number, y1: number) => ({
  x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1),
});

/** Axis-aligned rectangle (integer pixel coords, w x h pixels). */
export function rect(x: number, y: number, w: number, h: number): Shape {
  return { x0: x, y0: y, x1: x + w - 1, y1: y + h - 1, has: (px, py) => px >= x && px < x + w && py >= y && py < y + h };
}

/** Rectangle with chamfered (cut) corners of `c` px. */
export function chamferRect(x: number, y: number, w: number, h: number, c: number): Shape {
  return poly([x + c, y, x + w - c, y, x + w, y + c, x + w, y + h - c, x + w - c, y + h, x + c, y + h, x, y + h - c, x, y + c]);
}

/** Filled polygon from a flat [x0,y0,x1,y1,...] list (continuous coords, even-odd rule). */
export function poly(pts: number[]): Shape {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  const n = pts.length / 2;
  return {
    ...bb(x0 - 1, y0 - 1, x1, y1),
    has: (px, py) => {
      const X = px + 0.5, Y = py + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
        if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
  };
}

/** Ellipse centred on continuous coords (cx, cy). Use .0 centres for even, .5 for odd diameters. */
export function ellipse(cx: number, cy: number, rx: number, ry = rx): Shape {
  return {
    ...bb(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry),
    has: (px, py) => {
      const dx = (px + 0.5 - cx) / rx, dy = (py + 0.5 - cy) / ry;
      return dx * dx + dy * dy <= 1;
    },
  };
}
export const circle = (cx: number, cy: number, r: number): Shape => ellipse(cx, cy, r, r);

/** Annulus between radii r0 < r1. */
export function ring(cx: number, cy: number, r0: number, r1: number): Shape {
  return {
    ...bb(cx - r1 - 1, cy - r1 - 1, cx + r1, cy + r1),
    has: (px, py) => {
      const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      return d <= r1 && d > r0;
    },
  };
}

/** Annular sector between radii and angles (radians, 0 = +x, clockwise because +y is down). */
export function arcShape(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): Shape {
  return {
    ...bb(cx - r1 - 1, cy - r1 - 1, cx + r1, cy + r1),
    has: (px, py) => {
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r1 || d <= r0) return false;
      let a = Math.atan2(dy, dx);
      while (a < a0) a += Math.PI * 2;
      while (a > a0 + Math.PI * 2) a -= Math.PI * 2;
      return a <= a1;
    },
  };
}

/** Capsule (segment with radius r). */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number): Shape {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  return {
    ...bb(Math.min(ax, bx) - r - 1, Math.min(ay, by) - r - 1, Math.max(ax, bx) + r, Math.max(ay, by) + r),
    has: (px, py) => {
      const X = px + 0.5, Y = py + 0.5;
      const t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2));
      return Math.hypot(X - (ax + dx * t), Y - (ay + dy * t)) <= r;
    },
  };
}

export function union(...s: Shape[]): Shape {
  return {
    x0: Math.min(...s.map((a) => a.x0)), y0: Math.min(...s.map((a) => a.y0)),
    x1: Math.max(...s.map((a) => a.x1)), y1: Math.max(...s.map((a) => a.y1)),
    has: (x, y) => s.some((a) => a.has(x, y)),
  };
}
export function diff(a: Shape, ...b: Shape[]): Shape {
  return { ...a, has: (x, y) => a.has(x, y) && !b.some((s) => s.has(x, y)) };
}
export function inter(a: Shape, b: Shape): Shape {
  return {
    x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1),
    has: (x, y) => a.has(x, y) && b.has(x, y),
  };
}
/** Mirror a shape horizontally inside a grid of width W (pixel x -> W-1-x). */
export function mirror(s: Shape, W: number): Shape {
  return { x0: W - 1 - s.x1, y0: s.y0, x1: W - 1 - s.x0, y1: s.y1, has: (x, y) => s.has(W - 1 - x, y) };
}
/** Shape plus its horizontal mirror. */
export const sym = (s: Shape, W: number): Shape => union(s, mirror(s, W));

/** Regular polygon (n sides) of circumradius r, first vertex at angle a0. */
export function ngon(cx: number, cy: number, r: number, n: number, a0 = -Math.PI / 2, ry = r): Shape {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * ry);
  }
  return poly(pts);
}

/** A local frame at (cx, cy) whose +u axis points along (dx, dy) and +v to its right-hand side. */
export interface Frame {
  pt(u: number, v: number): [number, number];
  poly(pts: number[]): Shape;
  fx: number; fy: number; px: number; py: number;
}
export function frame(cx: number, cy: number, dx: number, dy: number): Frame {
  const l = Math.hypot(dx, dy) || 1;
  const fx = dx / l, fy = dy / l, px = -fy, py = fx;
  const pt = (u: number, v: number): [number, number] => [cx + fx * u + px * v, cy + fy * u + py * v];
  return {
    pt, fx, fy, px, py,
    poly: (pts: number[]) => {
      const out: number[] = [];
      for (let i = 0; i < pts.length; i += 2) out.push(...pt(pts[i], pts[i + 1]));
      return poly(out);
    },
  };
}

/** Cubic Bézier point. Points are [x, y]. */
export function bez(p0: number[], p1: number[], p2: number[], p3: number[], t: number): [number, number] {
  const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** Rasterise a shape into a mask covering its bbox expanded by `m` px. */
function rasterise(s: Shape, m: number): { ox: number; oy: number; w: number; h: number; mask: Uint8Array } {
  const ox = s.x0 - m, oy = s.y0 - m, w = s.x1 - s.x0 + 1 + 2 * m, h = s.y1 - s.y0 + 1 + 2 * m;
  const mask = new Uint8Array(w * h);
  for (let y = m; y < h - m; y++) for (let x = m; x < w - m; x++) if (s.has(ox + x, oy + y)) mask[y * w + x] = 1;
  return { ox, oy, w, h, mask };
}

/** Chamfer (3-4) inside distance in px (boundary pixels = 1). */
function insideDistance(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

// ------------------------------------------------------------------ lighting
/** 2D direction pointing towards the light (top-left). */
const L2X = -0.6, L2Y = -0.8;
/** 3D light direction (top-left, above). */
const L3 = (() => { const v = [-0.5, -0.62, 0.6]; const l = Math.hypot(v[0], v[1], v[2]); return v.map((a) => a / l); })();
const H3 = (() => { const v = [L3[0], L3[1], L3[2] + 1]; const l = Math.hypot(v[0], v[1], v[2]); return v.map((a) => a / l); })();

/** Quantise a fractional level (1..5) with ordered dithering. */
export function quant(lvl: number, x: number, y: number, dither = 1): number {
  const q = Math.floor(lvl + 0.5 + (bayer(x, y) - 0.5) * dither);
  return q < 1 ? 1 : q > 5 ? 5 : q;
}

/** Lambert + Blinn specular for a unit normal -> intensity 0..~1.2. */
export function lightN(nx: number, ny: number, nz: number, amb = 0.12, diff = 0.85, spec = 0.35, pow = 18): number {
  const lam = Math.max(0, nx * L3[0] + ny * L3[1] + nz * L3[2]);
  const s = Math.pow(Math.max(0, nx * H3[0] + ny * H3[1] + nz * H3[2]), pow);
  return amb + diff * lam + spec * s;
}

// ------------------------------------------------------------------ plates
export interface PlateOpts {
  ramp?: Ramp;
  base?: number;   // interior level 1..5 (fractional -> dithered)
  bevel?: number;  // width of the lit/shadowed edge band (px)
  hi?: number;     // levels added on edges facing the light
  lo?: number;     // levels removed on edges facing away
  rim?: 0 | 1 | 2; // dark 1px rim: 1 = shadow side only, 2 = all round except lit edges
  rimLevel?: number;
  drop?: number;   // cast shadow length onto existing pixels (towards bottom-right)
  sheen?: number;  // top-left -> bottom-right gradient amplitude (levels)
  noise?: number;  // random speckle amplitude (levels)
  dither?: number; // 0..1
  seed?: number;
  only?: boolean;  // only paint where pixels already exist (decals)
}

/** Cast a 1..n px shadow of `s` onto existing pixels towards the bottom-right. */
export function dropShadow(g: Grid, s: Shape, len = 1, strength = 2): void {
  const r = rasterise(s, len + 1);
  const mark = new Uint8Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (!r.mask[y * r.w + x]) continue;
    for (let k = 1; k <= len; k++) {
      const X = x + k, Y = y + k;
      if (X >= r.w || Y >= r.h || r.mask[Y * r.w + X]) continue;
      const i = Y * r.w + X;
      if (!mark[i] || mark[i] > k) mark[i] = k;
    }
  }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const k = mark[y * r.w + x];
    if (k) g.shade(r.ox + x, r.oy + y, k === 1 ? -strength : -Math.max(1, strength - 1));
  }
}

/** Bevelled, lit plate: the core primitive of boss armour. */
export function plate(g: Grid, s: Shape, o: PlateOpts = {}): void {
  const ramp = o.ramp ?? RAMP;
  const base = o.base ?? 3, bevel = o.bevel ?? 1, hi = o.hi ?? 1.6, lo = o.lo ?? 1.6;
  const dither = o.dither ?? 0.3, seed = o.seed ?? 7;
  if (o.drop) dropShadow(g, s, o.drop);
  const r = rasterise(s, bevel + 2);
  const d = insideDistance(r.mask, r.w, r.h);
  const cx = (s.x0 + s.x1 + 1) / 2, cy = (s.y0 + s.y1 + 1) / 2;
  const hw = Math.max(1, (s.x1 - s.x0 + 1) / 2), hh = Math.max(1, (s.y1 - s.y0 + 1) / 2);
  const win = Math.ceil(bevel) + 1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = y * r.w + x;
    if (!r.mask[i]) continue;
    const X = r.ox + x, Y = r.oy + y;
    if (!g.inb(X, Y)) continue;
    if (o.only && !g.filled(X, Y)) continue;
    let lvl = base;
    if (o.sheen) lvl += o.sheen * (((cx - X - 0.5) / hw + (cy - Y - 0.5) / hh) * 0.5);
    if (o.noise) lvl += o.noise * (hash2(X, Y, seed) - 0.5) * 2;
    const dist = d[i];
    if (bevel > 0 && dist <= bevel + 0.34) {
      // outward normal from nearby outside pixels
      let nx = 0, ny = 0;
      for (let v = -win; v <= win; v++) for (let u = -win; u <= win; u++) {
        const xx = x + u, yy = y + v;
        if (xx >= 0 && yy >= 0 && xx < r.w && yy < r.h && r.mask[yy * r.w + xx]) continue;
        const q = u * u + v * v;
        nx += u / q; ny += v / q;
      }
      const nl = Math.hypot(nx, ny);
      if (nl > 0) {
        nx /= nl; ny /= nl;
        const ring = Math.max(1, Math.ceil(dist - 0.34));
        const f = 1 - (ring - 1) / Math.max(1, bevel);
        const ld = nx * L2X + ny * L2Y;
        lvl += (ld >= 0 ? hi : lo) * ld * f;
        if (o.rim && ring === 1 && ld < (o.rim === 2 ? 0.45 : -0.25)) lvl = Math.min(lvl, o.rimLevel ?? 1);
      }
    }
    g.set(X, Y, ramp[quant(lvl, X, Y, dither) - 1]);
  }
}

/** Fill a shape with one code (no shading). */
export function fill(g: Grid, s: Shape, ch: string, only = false): void {
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
    if (!s.has(x, y)) continue;
    if (only && !g.filled(x, y)) continue;
    g.set(x, y, ch);
  }
}

/** Remove pixels inside a shape (cut-outs). */
export function cut(g: Grid, s: Shape): void {
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) if (s.has(x, y)) g.clear(x, y);
}

/** Relative shading of every existing pixel inside a shape. */
export function shadeShape(g: Grid, s: Shape, delta: number, minIdx = 0): void {
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) if (s.has(x, y)) g.shade(x, y, delta, minIdx);
}

/** Re-paint existing pixels of a shape with another ramp, keeping their level (stripes, markings). */
export function repaint(g: Grid, s: Shape, ramp: Ramp, levelShift = 0): void {
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
    if (!s.has(x, y)) continue;
    const c = g.get(x, y);
    if (!c || c === CODE_K) continue;
    const lv = levelOf(c);
    if (lv <= 0) continue;
    g.set(x, y, ramp[Math.max(0, Math.min(4, lv - 1 + levelShift))]);
  }
}

// ------------------------------------------------------------------ volumes
export interface VolumeOpts {
  ramp?: Ramp;
  amb?: number; diff?: number; spec?: number; pow?: number;
  bias?: number;   // added to the level (levels)
  rim?: number;    // levels removed on the outermost ring
  dither?: number;
  drop?: number;
}

/** Shaded ellipsoid (dome, sphere, sac, eye). */
export function dome(g: Grid, cx: number, cy: number, rx: number, ry = rx, o: VolumeOpts = {}): void {
  const ramp = o.ramp ?? RAMP;
  const s = ellipse(cx, cy, rx, ry);
  if (o.drop) dropShadow(g, s, o.drop);
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    const r2 = nx * nx + ny * ny;
    if (r2 > 1) continue;
    const nz = Math.sqrt(1 - r2);
    let lvl = 1 + 4 * lightN(nx, ny, nz, o.amb, o.diff, o.spec, o.pow) + (o.bias ?? 0);
    const edge = 1 - 1.3 / Math.max(rx, ry);
    if (o.rim && r2 > edge * edge) lvl -= o.rim;
    g.set(x, y, ramp[quant(lvl, x, y, o.dither ?? 1) - 1]);
  }
}

/** Shaded cylinder from A to B (radius r, flat caps): barrels, pipes, pistons, neck segments. */
export function barrel(g: Grid, ax: number, ay: number, bx: number, by: number, r: number, o: VolumeOpts = {}): void {
  const ramp = o.ramp ?? RAMP;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const s = capsule(ax, ay, bx, by, r);
  if (o.drop) dropShadow(g, s, o.drop);
  for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
    const X = x + 0.5 - ax, Y = y + 0.5 - ay;
    const t = X * ux + Y * uy;
    if (t < -0.01 || t > len + 0.01) continue;
    const u = (X * px + Y * py) / r;
    if (u < -1 || u > 1) continue;
    const nz = Math.sqrt(1 - u * u);
    let lvl = 1 + 4 * lightN(px * u, py * u, nz, o.amb, o.diff, o.spec, o.pow) + (o.bias ?? 0);
    if (o.rim && Math.abs(u) > 1 - 1.2 / r) lvl -= o.rim;
    g.set(x, y, ramp[quant(lvl, x, y, o.dither ?? 1) - 1]);
  }
}

export interface TubeOpts extends VolumeOpts {
  rib?: number;     // rib spacing along the tube (px), 0 = smooth
  ribDepth?: number;
}

/**
 * Shaded tube along a polyline (necks, tentacles, cables, curved pipes): cylindrical
 * lighting, radius interpolated r0 -> r1 along the path, optional ribs (segment grooves).
 */
export function tube(g: Grid, path: [number, number][], r0: number, r1: number, o: TubeOpts = {}): void {
  const ramp = o.ramp ?? RAMP;
  const n = path.length;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = L[n - 1] || 1;
  const rm = Math.max(r0, r1) + 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of path) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const segBox = new Float32Array((n - 1) * 4);
  for (let i = 0; i < n - 1; i++) {
    segBox[i * 4] = Math.min(path[i][0], path[i + 1][0]) - rm;
    segBox[i * 4 + 1] = Math.max(path[i][0], path[i + 1][0]) + rm;
    segBox[i * 4 + 2] = Math.min(path[i][1], path[i + 1][1]) - rm;
    segBox[i * 4 + 3] = Math.max(path[i][1], path[i + 1][1]) + rm;
  }
  for (let y = Math.floor(y0 - rm); y <= Math.ceil(y1 + rm); y++) for (let x = Math.floor(x0 - rm); x <= Math.ceil(x1 + rm); x++) {
    const X = x + 0.5, Y = y + 0.5;
    let best = Infinity, bs = 0, btx = 0, bty = 1, bcx = 0, bcy = 0;
    for (let i = 0; i < n - 1; i++) {
      if (X < segBox[i * 4] || X > segBox[i * 4 + 1] || Y < segBox[i * 4 + 2] || Y > segBox[i * 4 + 3]) continue;
      const ax = path[i][0], ay = path[i][1], dx = path[i + 1][0] - ax, dy = path[i + 1][1] - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / l2));
      const cx = ax + dx * t, cy = ay + dy * t;
      const d = Math.hypot(X - cx, Y - cy);
      if (d < best) { best = d; bs = L[i] + t * Math.sqrt(l2); const l = Math.sqrt(l2); btx = dx / l; bty = dy / l; bcx = cx; bcy = cy; }
    }
    const r = r0 + (r1 - r0) * (bs / total);
    if (best > r) continue;
    const side = btx * (Y - bcy) - bty * (X - bcx) >= 0 ? 1 : -1;
    const u = (side * best) / r;
    const nz = Math.sqrt(Math.max(0, 1 - u * u));
    let lvl = 1 + 4 * lightN(-bty * u, btx * u, nz, o.amb, o.diff, o.spec, o.pow) + (o.bias ?? 0);
    if (o.rim && Math.abs(u) > 1 - 1.2 / r) lvl -= o.rim;
    if (o.rib) {
      const m = (total - bs) % o.rib;
      if (m < 1) lvl -= o.ribDepth ?? 1.6; else if (m < 2) lvl += 0.6;
    }
    g.set(x, y, ramp[quant(lvl, x, y, o.dither ?? 1) - 1]);
  }
}

/** Dense polyline sampling of a cubic Bézier (for tube()). */
export function bezPath(p0: number[], p1: number[], p2: number[], p3: number[], steps = 24): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) out.push(bez(p0, p1, p2, p3, i / steps));
  return out;
}

// ------------------------------------------------------------------ lines & details
/** Bresenham line of a fixed code. */
export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, ch: string): void {
  forLine(x0, y0, x1, y1, (x, y) => g.set(x, y, ch));
}
function forLine(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    fn(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Recessed panel seam: dark line + lit lower/right lip (top-left light). */
export function groove(g: Grid, x0: number, y0: number, x1: number, y1: number, depth = 2, lip = 1): void {
  const pts: number[] = [];
  forLine(x0, y0, x1, y1, (x, y) => pts.push(x, y));
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const on = new Set<number>();
  for (let i = 0; i < pts.length; i += 2) on.add(pts[i + 1] * 4096 + pts[i]);
  for (let i = 0; i < pts.length; i += 2) g.shade(pts[i], pts[i + 1], -depth);
  if (lip) for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] + (horiz ? 0 : 1), y = pts[i + 1] + (horiz ? 1 : 0);
    if (!on.has(y * 4096 + x)) g.shade(x, y, lip);
  }
}

/** Raised weld / ridge: lit line + dark lower/right side. */
export function ridge(g: Grid, x0: number, y0: number, x1: number, y1: number, up = 1, down = 1): void {
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  forLine(x0, y0, x1, y1, (x, y) => g.shade(x, y, up));
  forLine(x0, y0, x1, y1, (x, y) => g.shade(x + (horiz ? 0 : 1), y + (horiz ? 1 : 0), -down));
}

/** Grooves along the outline of a rectangle (inset panel). */
export function panel(g: Grid, x: number, y: number, w: number, h: number, depth = 2): void {
  groove(g, x, y, x + w - 1, y, depth);
  groove(g, x, y, x, y + h - 1, depth);
  ridge(g, x, y + h - 1, x + w - 1, y + h - 1, 1, 0);
  ridge(g, x + w - 1, y, x + w - 1, y + h - 1, 1, 0);
}

/** Single rivet: bright pixel + dark pixel to the bottom-right. */
export function rivet(g: Grid, x: number, y: number, big = false): void {
  g.shade(x, y, 2);
  g.shade(x + 1, y + 1, -2);
  if (big) { g.shade(x + 1, y, 1); g.shade(x, y + 1, 1); }
}

/** Rivets every `step` px along a segment. */
export function rivetLine(g: Grid, x0: number, y0: number, x1: number, y1: number, step: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(len / step));
  for (let i = 0; i <= n; i++) rivet(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
}

/** Rivets on a circle. */
export function rivetRing(g: Grid, cx: number, cy: number, r: number, n: number, a0 = 0): void {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    rivet(g, Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5));
  }
}

/** Slatted vent (horizontal slats), optionally glowing between the slats. */
export function vent(g: Grid, x: number, y: number, w: number, h: number, glow?: Ramp, pitch = 2, hot = 2): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    if (!g.filled(X, Y)) continue;
    const slot = j % pitch === 0;
    if (slot) {
      if (glow) {
        const c = Math.abs(i - (w - 1) / 2) / Math.max(1, w / 2);
        g.set(X, Y, glow[Math.max(0, Math.min(4, Math.round(hot + 1 - c * 2)))]);
      } else g.set(X, Y, 'k');
    } else g.shade(X, Y, j % pitch === 1 ? 1 : 0);
  }
  groove(g, x - 1, y - 1, x + w, y - 1, 1, 0);
}

/** Vertical-slatted vent. */
export function ventV(g: Grid, x: number, y: number, w: number, h: number, glow?: Ramp, pitch = 2, hot = 2): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    if (!g.filled(X, Y)) continue;
    if (i % pitch === 0) {
      if (glow) {
        const c = Math.abs(j - (h - 1) / 2) / Math.max(1, h / 2);
        g.set(X, Y, glow[Math.max(0, Math.min(4, Math.round(hot + 1 - c * 2)))]);
      } else g.set(X, Y, 'k');
    } else g.shade(X, Y, i % pitch === 1 ? 1 : 0);
  }
}

/**
 * Glowing orb: white-hot centre fading to the ramp's dark end, plus an optional dithered
 * halo of glow colour bleeding onto the surrounding (existing) pixels.
 */
export function glow(g: Grid, cx: number, cy: number, r: number, ramp: Ramp, halo = 0, hot = 5): void {
  const R = r + halo;
  for (let y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= r) {
      const t = d / Math.max(0.5, r);
      const lvl = hot - t * (hot - 1.4);
      g.set(x, y, ramp[quant(lvl, x, y) - 1]);
    } else if (halo > 0 && d <= R && g.filled(x, y)) {
      const p = 1 - (d - r) / halo;
      if (bayer(x, y) < p * 0.75) g.set(x, y, ramp[p > 0.6 ? 1 : 0]);
    }
  }
}

/** Small light: 1-2 px glow dot with a dark socket. */
export function lamp(g: Grid, x: number, y: number, ramp: Ramp, big = false): void {
  if (big) {
    g.set(x, y, ramp[4]); g.set(x + 1, y, ramp[3]); g.set(x, y + 1, ramp[3]); g.set(x + 1, y + 1, ramp[2]);
    g.shade(x + 2, y + 2, -2); g.shade(x + 2, y + 1, -1); g.shade(x + 1, y + 2, -1);
  } else {
    g.set(x, y, ramp[3]);
    g.shade(x + 1, y + 1, -2);
  }
}

/**
 * ASCII stamp. '.' / ' ' = skip, '+' / '-' = relative shade +1/-1, '*' / '_' = +2/-2,
 * anything else = that code (digits = ramp, letters = fixed colours).
 */
export function stamp(g: Grid, map: string[], x: number, y: number, flip = false): void {
  for (let j = 0; j < map.length; j++) {
    const row = map[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[flip ? row.length - 1 - i : i];
      const X = x + i, Y = y + j;
      switch (ch) {
        case '.': case ' ': break;
        case '+': g.shade(X, Y, 1); break;
        case '-': g.shade(X, Y, -1); break;
        case '*': g.shade(X, Y, 2); break;
        case '_': g.shade(X, Y, -2); break;
        default: g.set(X, Y, ch);
      }
    }
  }
}

/**
 * Mount socket for a separate boss part (turret / pod / core): raised mounting ring, recessed
 * floor (inverted bevel), bolt circle and a pivot hub. Reads as an empty mount when no part sits on it.
 */
export function socket(g: Grid, cx: number, cy: number, r: number, ramp: Ramp = RAMP): void {
  plate(g, circle(cx, cy, r), { ramp, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
  plate(g, circle(cx, cy, r - 1.5), { ramp, base: 2, bevel: 1, hi: -1.2, lo: -1 });
  const n = r > 6 ? 8 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    rivet(g, Math.round(cx + Math.cos(a) * (r - 2.8) - 0.5), Math.round(cy + Math.sin(a) * (r - 2.8) - 0.5));
  }
  dome(g, cx, cy, Math.max(1.4, r * 0.28), Math.max(1.4, r * 0.28), { ramp: GREY, amb: 0.2, spec: 0.6 });
}

// ------------------------------------------------------------------ rendering
const lutCache = new Map<string, Uint8ClampedArray>();
function lutFor(palette: Palette | 'none', extra?: ColorMap): Uint8ClampedArray {
  const key = palette + (extra ? JSON.stringify(extra) : '');
  const hit = lutCache.get(key);
  if (hit) return hit;
  const colors: ColorMap = { ...BOSS_COLORS, ...(palette === 'none' ? {} : rampColors(palette)), ...(extra ?? {}) };
  const lut = new Uint8ClampedArray(128 * 4);
  for (const [ch, hex] of Object.entries(colors)) {
    const code = ch.charCodeAt(0);
    if (code >= 128) continue;
    const [r, g, b, a] = parseColor(hex);
    lut.set([r, g, b, a], code * 4);
  }
  lutCache.set(key, lut);
  return lut;
}

/**
 * 1px dark outline ('k') around the silhouette, computed once in grid space (same result as
 * outlineCanvas() on every rendered palette, without the per-palette pixel pass).
 */
export function outlineGrid(src: Grid, diagonals = false): Grid {
  const g = src.clone();
  const k = 'k'.charCodeAt(0);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (src.filled(x, y)) continue;
    let near = src.filled(x - 1, y) || src.filled(x + 1, y) || src.filled(x, y - 1) || src.filled(x, y + 1);
    if (!near && diagonals) near = src.filled(x - 1, y - 1) || src.filled(x + 1, y - 1) || src.filled(x - 1, y + 1) || src.filled(x + 1, y + 1);
    if (near) g.setCode(x, y, k);
  }
  return g;
}

/** Render a grid for one palette (outline it first with outlineGrid(), or pass outline = true). */
export function gridCanvas(g: Grid, palette: Palette, outline = false, extra?: ColorMap): HTMLCanvasElement {
  const lut = lutFor(palette, extra);
  const { canvas, ctx } = makeCanvas(g.w, g.h);
  const img = ctx.createImageData(g.w, g.h);
  const d = img.data;
  for (let i = 0; i < g.w * g.h; i++) {
    const c = g.px[i];
    if (!c) continue;
    const o = c * 4;
    if (import.meta.env?.DEV && lut[o + 3] === 0) console.warn(`[bosses] unknown colour code '${String.fromCharCode(c)}'`);
    d[i * 4] = lut[o]; d[i * 4 + 1] = lut[o + 1]; d[i * 4 + 2] = lut[o + 2]; d[i * 4 + 3] = lut[o + 3];
  }
  ctx.putImageData(img, 0, 0);
  return outline ? outlineCanvas(canvas) : canvas;
}

/** Deterministic RNG helper bound to a seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
