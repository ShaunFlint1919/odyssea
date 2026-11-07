// =====================================================================================
//  ENEMY ART KIT — a tiny raster toolkit shared by the enemy sprite modules (b_en_*.ts).
//
//  Sprites are composed on a char grid (one char per pixel, the alphabet of pixel.ts
//  maps: '.' transparent, '1'..'5' palette ramp, letters = COMMON_COLORS + EN_COLORS).
//  Shapes are boolean masks (ellipses, polygons, capsules, polar shapes) that are shaded
//  with a bevel / dome height model lit from the TOP-LEFT, then detailed with stamps,
//  cast shadows and a 1px dark outline. The resulting PixelMap is palette independent:
//  it is rendered once per Palette with rampColors().
// =====================================================================================
import { bayer, type ColorMap, type PixelMap } from './pixel';

export type Mask = Uint8Array;

/** Light direction (from the top-left, slightly towards the viewer), normalised. */
const LEN = Math.hypot(1, 1.15, 1.3);
const LX = -1 / LEN;
const LY = -1.15 / LEN;
const LZ = 1.3 / LEN;

/** Extra fixed colours used by enemy sprites (on top of COMMON_COLORS). */
export const EN_COLORS: ColorMap = {
  d: '#0e2a40',  // deep glass / hangar interior blue
  o: '#ff9a3a',  // warm amber light
  Y: '#fff4b0',  // hot white-yellow (tiny glow cores only)
  p: '#3a0c20',  // deep red-black (eye sockets, hot vents)
  n: '#151a2a',  // navy shadow (dark recesses, slits)
  s: '#b8c4d8',  // pale steel (foam / sensor glints)
};

/** Material chains (dark -> light) used by darken()/lighten(). */
const CHAINS = ['12345', 'KgGhH', 'dcCq', 'peEyY', 'prR', 'ktT', 'kmM'];
const CHAIN_OF = new Map<string, [string, number]>();
for (const c of CHAINS) for (let i = 0; i < c.length; i++) if (!CHAIN_OF.has(c[i])) CHAIN_OF.set(c[i], [c, i]);

/** Move a colour char `n` steps along its material chain (negative = darker). */
export function stepChar(ch: string, n: number): string {
  const e = CHAIN_OF.get(ch);
  if (!e) return ch;
  const [chain, i] = e;
  return chain[Math.max(0, Math.min(chain.length - 1, i + n))];
}

export interface ShadeOpts {
  /** Chars dark -> light (default palette ramp '12345'). */
  ramp?: string;
  /** Tone index of flat (facing the viewer) surfaces, may be fractional. Default 2 ('3'). */
  base?: number;
  /** Width of the bevelled edge in px (default 2). */
  bevel?: number;
  /** Rounded (pillow / dome) profile instead of a straight chamfer. */
  round?: boolean;
  /** Tone gain on slopes facing the light (default 2.4) / facing away (default 2). */
  hi?: number;
  lo?: number;
  /** Ordered dithering between tones (large surfaces only). */
  dither?: boolean;
  /** Linear tone gradients (+tone per px to the right / downwards). */
  gx?: number;
  gy?: number;
  /** Specular: where dot(N, L) >= spec the pixel becomes specCh. */
  spec?: number;
  specCh?: string;
  /** Extra per-pixel tone offset. */
  bias?: (x: number, y: number) => number;
  /** Explicit height field (0..1 per pixel) replacing the bevel model. */
  height?: Float32Array;
  /** Height scale used with `height` (slope multiplier, default 1). */
  relief?: number;
}

/** A char raster with mask builders and painting operations (all chainable). */
export class Grid {
  readonly px: string[];

  constructor(readonly w: number, readonly h: number) {
    this.px = new Array<string>(w * h).fill('.');
  }

  /** Horizontal centre (symmetry axis) in continuous coordinates. */
  get cx(): number { return this.w / 2; }
  get cy(): number { return this.h / 2; }

  inside(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number): string { return this.inside(x, y) ? this.px[y * this.w + x] : '.'; }
  set(x: number, y: number, ch: string): this {
    if (this.inside(x, y)) this.px[y * this.w + x] = ch;
    return this;
  }

  // ------------------------------------------------------------------ mask builders
  empty(): Mask { return new Uint8Array(this.w * this.h); }

  /** Pixels whose centre lies inside the ellipse (continuous coordinates). */
  ellipse(cx: number, cy: number, rx: number, ry: number): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) m[y * this.w + x] = 1;
      }
    }
    return m;
  }

  circle(cx: number, cy: number, r: number): Mask { return this.ellipse(cx, cy, r, r); }

  /** Ring between radii r0 and r1. */
  ring(cx: number, cy: number, r0: number, r1: number): Mask { return this.sub(this.circle(cx, cy, r1), this.circle(cx, cy, r0)); }

  /** Even-odd polygon fill at pixel centres; pts = flat [x0, y0, x1, y1, ...]. */
  poly(pts: number[]): Mask {
    const m = this.empty();
    const n = pts.length >> 1;
    const xs: number[] = [];
    for (let y = 0; y < this.h; y++) {
      const py = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
        if ((yi > py) !== (yj > py)) xs.push(xi + ((py - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x + 0.5 <= xs[k + 1] && x < this.w; x++) m[y * this.w + x] = 1;
      }
    }
    return m;
  }

  /** Axis-aligned rectangle in pixel coordinates (x, y = top-left pixel). */
  rect(x: number, y: number, w: number, h: number): Mask {
    const m = this.empty();
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) m[j * this.w + i] = 1;
    }
    return m;
  }

  /** Pixels whose centre is within `r` of the segment (continuous coordinates). */
  capsule(x0: number, y0: number, x1: number, y1: number, r: number): Mask {
    const m = this.empty();
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1e-6;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
        const ex = px - (x0 + dx * t), ey = py - (y0 + dy * t);
        if (ex * ex + ey * ey <= r * r) m[y * this.w + x] = 1;
      }
    }
    return m;
  }

  /** 1px Bresenham line between pixel coordinates (inclusive). */
  line(x0: number, y0: number, x1: number, y1: number): Mask {
    const m = this.empty();
    let x = Math.round(x0), y = Math.round(y0);
    const xe = Math.round(x1), ye = Math.round(y1);
    const dx = Math.abs(xe - x), dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1, sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (this.inside(x, y)) m[y * this.w + x] = 1;
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return m;
  }

  /** Mask from a predicate on polar coordinates around (cx, cy) (angle: 0 = right, +PI/2 = down). */
  polar(cx: number, cy: number, fn: (r: number, a: number) => boolean): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (fn(Math.hypot(dx, dy), Math.atan2(dy, dx))) m[y * this.w + x] = 1;
      }
    }
    return m;
  }

  /** Mask from an arbitrary pixel predicate. */
  where(fn: (x: number, y: number) => boolean): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (fn(x, y)) m[y * this.w + x] = 1;
    return m;
  }

  /** Mask of pixels whose current char is in `chars` (default: any opaque pixel). */
  opaque(chars?: string): Mask {
    const m = this.empty();
    for (let i = 0; i < m.length; i++) {
      const c = this.px[i];
      if (c !== '.' && (!chars || chars.includes(c))) m[i] = 1;
    }
    return m;
  }

  // ------------------------------------------------------------------ mask algebra
  or(...ms: Mask[]): Mask {
    const m = this.empty();
    for (const a of ms) for (let i = 0; i < m.length; i++) m[i] |= a[i];
    return m;
  }
  and(a: Mask, b: Mask): Mask {
    const m = this.empty();
    for (let i = 0; i < m.length; i++) m[i] = a[i] & b[i];
    return m;
  }
  sub(a: Mask, b: Mask): Mask {
    const m = this.empty();
    for (let i = 0; i < m.length; i++) m[i] = a[i] & (b[i] ^ 1);
    return m;
  }
  /** Mirror across the vertical axis. */
  mirror(a: Mask): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) m[y * this.w + x] = a[y * this.w + (this.w - 1 - x)];
    return m;
  }
  /** Mirror across the horizontal axis. */
  flipY(a: Mask): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) m[y * this.w + x] = a[(this.h - 1 - y) * this.w + x];
    return m;
  }
  /** Union with its mirror image (left/right symmetric). */
  sym(a: Mask): Mask { return this.or(a, this.mirror(a)); }
  shift(a: Mask, dx: number, dy: number): Mask {
    const m = this.empty();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const sx = x - dx, sy = y - dy;
        if (sx >= 0 && sy >= 0 && sx < this.w && sy < this.h) m[y * this.w + x] = a[sy * this.w + sx];
      }
    }
    return m;
  }
  /** Dilate by n px (4-neighbourhood, or 8 with diag). */
  grow(a: Mask, n = 1, diag = false): Mask {
    let cur = a;
    for (let k = 0; k < n; k++) {
      const m = Uint8Array.from(cur);
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (cur[y * this.w + x]) continue;
          if (this.nb(cur, x, y, diag)) m[y * this.w + x] = 1;
        }
      }
      cur = m;
    }
    return cur;
  }
  /** Erode by n px. */
  shrink(a: Mask, n = 1, diag = false): Mask {
    let cur = a;
    for (let k = 0; k < n; k++) {
      const m = Uint8Array.from(cur);
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (!cur[y * this.w + x]) continue;
          if (this.nbOut(cur, x, y, diag)) m[y * this.w + x] = 0;
        }
      }
      cur = m;
    }
    return cur;
  }
  /** Inner border of a mask (pixels touching the outside). `side` restricts to edges facing a direction. */
  edge(a: Mask, side: 'all' | 'tl' | 'br' | 'top' | 'bottom' | 'left' | 'right' = 'all'): Mask {
    const m = this.empty();
    const out = (x: number, y: number) => !this.inside(x, y) || !a[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!a[y * this.w + x]) continue;
        const l = out(x - 1, y), r = out(x + 1, y), t = out(x, y - 1), b = out(x, y + 1);
        let hit = false;
        switch (side) {
          case 'all': hit = l || r || t || b; break;
          case 'tl': hit = l || t; break;
          case 'br': hit = r || b; break;
          case 'top': hit = t; break;
          case 'bottom': hit = b; break;
          case 'left': hit = l; break;
          case 'right': hit = r; break;
        }
        if (hit) m[y * this.w + x] = 1;
      }
    }
    return m;
  }
  /** Keep only pixels with y in [y0, y1] and x in [x0, x1]. */
  clip(a: Mask, x0: number, y0: number, x1: number, y1: number): Mask {
    return this.and(a, this.where((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
  }
  count(a: Mask): number {
    let n = 0;
    for (let i = 0; i < a.length; i++) n += a[i];
    return n;
  }

  private nb(m: Mask, x: number, y: number, diag: boolean): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!diag && dx && dy)) continue;
        const nx = x + dx, ny = y + dy;
        if (this.inside(nx, ny) && m[ny * this.w + nx]) return true;
      }
    }
    return false;
  }
  private nbOut(m: Mask, x: number, y: number, diag: boolean): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!diag && dx && dy)) continue;
        const nx = x + dx, ny = y + dy;
        if (!this.inside(nx, ny) || !m[ny * this.w + nx]) return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------ painting
  /** Fill a mask with one char. */
  fill(m: Mask, ch: string): this {
    for (let i = 0; i < m.length; i++) if (m[i]) this.px[i] = ch;
    return this;
  }

  /** Fill a mask with chars from fn(x, y) (return '' to skip a pixel). */
  paint(m: Mask, fn: (x: number, y: number) => string): this {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!m[y * this.w + x]) continue;
        const ch = fn(x, y);
        if (ch) this.px[y * this.w + x] = ch;
      }
    }
    return this;
  }

  /**
   * Shade a mask: every pixel gets a height (bevel or dome profile from its distance to
   * the mask edge, or the explicit `height` field), a normal from the height gradient and
   * a tone = base + lighting (top-left light), quantised onto `ramp`.
   */
  shade(m: Mask, o: ShadeOpts = {}): this {
    const { w, h } = this;
    const ramp = o.ramp ?? '12345';
    const base = o.base ?? 2;
    const bevel = Math.max(0.5, o.bevel ?? 2);
    const hi = o.hi ?? 2.4, lo = o.lo ?? 2;
    let H: Float32Array;
    let slope: number;
    if (o.height) {
      H = o.height;
      slope = o.relief ?? 1;
    } else {
      const d = distanceInside(m, w, h);
      H = new Float32Array(w * h);
      for (let i = 0; i < H.length; i++) {
        if (!m[i]) continue;
        const t = Math.min(d[i], bevel) / bevel;
        H[i] = o.round ? Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))) : t;
      }
      slope = bevel;
    }
    const hAt = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h || !m[y * w + x]) ? 0 : H[y * w + x];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!m[i]) continue;
        const gx = (hAt(x + 1, y) - hAt(x - 1, y)) * 0.5 * slope;
        const gy = (hAt(x, y + 1) - hAt(x, y - 1)) * 0.5 * slope;
        const nl = Math.hypot(gx, gy, 1);
        const dot = (-gx * LX - gy * LY + LZ) / nl;
        const lit = dot - LZ;
        let t = base + lit * (lit > 0 ? hi : lo);
        if (o.gx) t += o.gx * (x + 0.5 - w / 2);
        if (o.gy) t += o.gy * (y + 0.5 - h / 2);
        if (o.bias) t += o.bias(x, y);
        const q = o.dither ? Math.floor(t + bayer(x, y)) : Math.round(t);
        let ch = ramp[Math.max(0, Math.min(ramp.length - 1, q))];
        if (o.spec !== undefined && dot >= o.spec) ch = o.specCh ?? ramp[ramp.length - 1];
        this.px[i] = ch;
      }
    }
    return this;
  }

  /** Move every pixel of the mask `n` steps along its material chain (negative = darker). */
  tone(m: Mask, n: number): this {
    for (let i = 0; i < m.length; i++) if (m[i] && this.px[i] !== '.') this.px[i] = stepChar(this.px[i], n);
    return this;
  }
  darken(m: Mask, n = 1): this { return this.tone(m, -n); }
  lighten(m: Mask, n = 1): this { return this.tone(m, n); }

  /** Shadow cast by a raised part onto what lies below/right of it (only where not covered). */
  castShadow(raised: Mask, dx = 1, dy = 1, n = 1): this {
    const s = this.sub(this.shift(raised, dx, dy), raised);
    return this.darken(s, n);
  }

  /** Overlay an ASCII snippet at (x, y); '.' and ' ' are skipped. */
  stamp(rows: string[], x: number, y: number): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, ch);
      }
    });
    return this;
  }

  /** Stamp at (x, y) and mirrored on the other side of the vertical axis. */
  stampSym(rows: string[], x: number, y: number): this {
    this.stamp(rows, x, y);
    const wRow = rows.reduce((a, r) => Math.max(a, r.length), 0);
    const mirrored = rows.map((r) => r.padEnd(wRow, '.').split('').reverse().join(''));
    return this.stamp(mirrored, this.w - x - wRow, y);
  }

  /** Plot single pixels: pts = flat [x0, y0, x1, y1, ...]. */
  plot(pts: number[], ch: string): this {
    for (let i = 0; i + 1 < pts.length; i += 2) this.set(pts[i], pts[i + 1], ch);
    return this;
  }
  /** Plot pixels and their mirror images. */
  plotSym(pts: number[], ch: string): this {
    for (let i = 0; i + 1 < pts.length; i += 2) {
      this.set(pts[i], pts[i + 1], ch);
      this.set(this.w - 1 - pts[i], pts[i + 1], ch);
    }
    return this;
  }

  /** Concentric glow: outer -> inner chars on shrinking circles (e.g. 'eEy'). */
  glow(cx: number, cy: number, r: number, chars: string, step = 1): this {
    for (let k = 0; k < chars.length; k++) {
      const rr = r - k * step;
      if (rr <= 0) break;
      this.fill(this.circle(cx, cy, rr), chars[k]);
    }
    return this;
  }

  /** 1px outline around every opaque pixel (only written into transparent pixels). */
  outline(ch = 'k', diag = false): this {
    const solid = this.opaque();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid[y * this.w + x]) continue;
        if (this.nb(solid, x, y, diag)) this.px[y * this.w + x] = ch;
      }
    }
    return this;
  }

  /** Copy the left half onto the right half (mirror), keeping the left untouched. */
  mirrorLeft(): this {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < Math.floor(this.w / 2); x++) this.px[y * this.w + (this.w - 1 - x)] = this.px[y * this.w + x];
    }
    return this;
  }

  /** Paste another grid at (x, y) ('.' skipped). */
  paste(src: Grid, x: number, y: number): this {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const ch = src.px[j * src.w + i];
        if (ch !== '.') this.set(x + i, y + j, ch);
      }
    }
    return this;
  }

  toMap(): PixelMap {
    const out: PixelMap = [];
    for (let y = 0; y < this.h; y++) out.push(this.px.slice(y * this.w, (y + 1) * this.w).join(''));
    return out;
  }
}

/** Chamfer (1, sqrt2) distance from each mask pixel to the nearest pixel outside the mask. */
export function distanceInside(m: Mask, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? INF : 0;
  const S = Math.SQRT2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!m[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + S, at(x + 1, y - 1) + S);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!m[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + S, at(x - 1, y + 1) + S);
    }
  }
  return d;
}

/** Points evenly spread on a circle (angle 0 = right, +PI/2 = down), rounded to pixels. */
export function ringPoints(cx: number, cy: number, r: number, n: number, phase = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push(Math.floor(cx + Math.cos(a) * r), Math.floor(cy + Math.sin(a) * r));
  }
  return out;
}
