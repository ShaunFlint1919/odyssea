// TECHNO terrain painter: an endless armoured hull. 96 px world macro zones give structure —
// standard paneling (32 px cells split into 1/2/4 panels with bevels, seams, rivets and a few
// decorations), calm large plates, raised armour blocks casting shadows and recessed machinery
// bays — plus long trench runs (hazard rims, shadowed floor, ribbed lit wall, cross-beams,
// lights) joined by cross trenches, and double pipes with flanges. All per-cell hashes are
// precomputed into small per-chunk tables (no hashing in the pixel loops).
import { hash2 } from './noise';
import {
  CH, Chunk, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, pack, once, range, type Step,
} from './b_ter_core';

const PLATE = rampN(8, 0x0e1119, 0x151923, 0x1c212d, 0x232937, 0x2b3241, 0x343c4c, 0x3e4757, 0x4a5464);
const ARMOR = rampN(7, 0x121621, 0x1a1f2c, 0x232937, 0x2d3443, 0x383f50, 0x444c5e, 0x525b6e);
const BAY = rampN(6, 0x07080d, 0x0b0d14, 0x10131c, 0x161a25, 0x1d222f, 0x252b39);
const TRENCH = rampN(6, 0x050609, 0x090b11, 0x0e1119, 0x131722, 0x191e2b, 0x202635);
const PIPE = rampN(7, 0x10141c, 0x1a1f2a, 0x252b37, 0x323947, 0x414958, 0x525b6b, 0x656f80);
const HAZ_Y = pack(0x6e5a1e), HAZ_Y2 = pack(0x7c6626), HAZ_K = pack(0x15140f);
const L_TEAL = pack(0x2aa898), L_TEAL_D = pack(0x145a54), L_RED = pack(0xa83030), L_RED_D = pack(0x5a1a1c);
const L_AMB = pack(0xb0802c), L_AMB_D = pack(0x5a4218);

const MAC = 96;       // macro zone size
const SEG = 448;      // trench segment length (world px)
const PBAND = 192;    // pipe band height (world px)
const JOFF = 40;      // trench segment boundaries are shifted by this many px (joint position)
const JH = 14;        // half height of a joint (cross trench)
const DEPTH = 9;      // trench wall height (shadow length on the floor)
const K_PLATE = 0, K_ARMOR = 1, K_BAY = 2, K_TRENCH = 3, K_RIM = 4, K_PIPE = 5, K_LIGHT = 6;
const Z_PANELS = 0, Z_CALM = 1, Z_RAISED = 2, Z_BAY = 3;

/**
 * Trench layout around a chunk: per segment k a vertical run [x0, x1) (x0 < 0 = none);
 * consecutive runs are joined by a horizontal cross trench centred on the segment boundary.
 */
class Trenches {
  private readonly k0: number;
  private readonly x0: Int32Array;
  private readonly x1: Int32Array;

  constructor(c: Chunk, seed: number) {
    this.k0 = Math.floor((c.wy0 - CH - 64 - JOFF) / SEG) - 1;
    const k1 = Math.floor((c.wy0 + 64 - JOFF) / SEG) + 1;
    const n = k1 - this.k0 + 1;
    this.x0 = new Int32Array(n);
    this.x1 = new Int32Array(n);
    for (let j = 0; j < n; j++) {
      const k = this.k0 + j;
      if (k < 0 || (!c.force && hash2(k, 3, seed) > 0.7)) { this.x0[j] = -1; continue; }
      const width = 32 + Math.floor(hash2(k, 4, seed) * 4) * 4;
      const cx = 34 + Math.floor((hash2(k, 5, seed) * (c.w - 68)) / 4) * 4;
      this.x0[j] = cx - (width >> 1);
      this.x1[j] = cx + (width >> 1);
    }
  }

  /** True when world (x, wy) lies inside a trench (run or joint). */
  inside(x: number, wy: number): boolean {
    const j = Math.floor((wy - JOFF) / SEG) - this.k0;
    if (this.x0[j] >= 0 && x >= this.x0[j] && x < this.x1[j]) return true;
    const jb = Math.round((wy - JOFF) / SEG) - this.k0;
    const by = (jb + this.k0) * SEG + JOFF;
    if (wy - by < JH && by - wy <= JH && this.x0[jb] >= 0 && this.x0[jb - 1] >= 0) {
      const a = Math.min(this.x0[jb], this.x0[jb - 1]), b = Math.max(this.x1[jb], this.x1[jb - 1]);
      return x >= a && x < b;
    }
    return false;
  }

  /** Smallest x span [lo, hi) that may contain trench pixels at world y (lo >= hi: none). */
  span(wy: number, out: Int32Array): void {
    const j = Math.floor((wy - JOFF) / SEG) - this.k0;
    let lo = 1e6, hi = -1e6;
    if (this.x0[j] >= 0) { lo = this.x0[j]; hi = this.x1[j]; }
    const jb = Math.round((wy - JOFF) / SEG) - this.k0;
    const by = (jb + this.k0) * SEG + JOFF;
    if (wy - by < JH && by - wy <= JH && this.x0[jb] >= 0 && this.x0[jb - 1] >= 0) {
      lo = Math.min(lo, this.x0[jb], this.x0[jb - 1]);
      hi = Math.max(hi, this.x1[jb], this.x1[jb - 1]);
    }
    out[0] = lo;
    out[1] = hi;
  }

  /** Centre x of the vertical run at world y (or -1). */
  centre(wy: number): number {
    const j = Math.floor((wy - JOFF) / SEG) - this.k0;
    return this.x0[j] >= 0 ? (this.x0[j] + this.x1[j]) >> 1 : -1;
  }
}

/**
 * Per-chunk lookup tables: macro zone per 96 px cell, panel geometry + hashes per 16 px
 * sub-cell (32 px cells split into 1, 2 or 4 panels), calm-plate tone per 48 px cell.
 */
class Tables {
  readonly mx0 = -1;
  readonly my0: number;
  readonly nmx: number;
  readonly zone: Int8Array;
  readonly sy0: number;
  readonly nsx: number;
  readonly pX: Int32Array; readonly pY: Int32Array; readonly pW: Int32Array; readonly pH: Int32Array;
  readonly pid: Float32Array; readonly deco: Float32Array; readonly lc: Float32Array;
  readonly cy0: number;
  readonly ncx: number;
  readonly calm: Float32Array;

  constructor(c: Chunk) {
    const s = c.seed, W = c.w;
    // macro zones for x in [-6, W) and world y in [wy0 - CH + 1, wy0 + 6]
    this.my0 = Math.floor((c.wy0 - CH + 1) / MAC);
    const my1 = Math.floor((c.wy0 + 6) / MAC);
    this.nmx = Math.floor((W - 1) / MAC) - this.mx0 + 1;
    this.zone = new Int8Array(this.nmx * (my1 - this.my0 + 1));
    for (let j = 0; j <= my1 - this.my0; j++) {
      for (let i = 0; i < this.nmx; i++) {
        const h = hash2(this.mx0 + i, this.my0 + j, s + 31);
        this.zone[j * this.nmx + i] = h < 0.42 ? Z_PANELS : h < 0.62 ? Z_CALM : h < 0.82 ? Z_RAISED : Z_BAY;
      }
    }
    // panels per 16 px sub-cell
    this.sy0 = Math.floor((c.wy0 - CH + 1) / 16);
    const sy1 = Math.floor(c.wy0 / 16);
    this.nsx = Math.floor((W - 1) / 16) + 1;
    const n = this.nsx * (sy1 - this.sy0 + 1);
    this.pX = new Int32Array(n); this.pY = new Int32Array(n); this.pW = new Int32Array(n); this.pH = new Int32Array(n);
    this.pid = new Float32Array(n); this.deco = new Float32Array(n); this.lc = new Float32Array(n);
    for (let j = 0; j <= sy1 - this.sy0; j++) {
      for (let i = 0; i < this.nsx; i++) {
        const sx = i, sy = this.sy0 + j, cx = sx >> 1, cy = sy >> 1;
        const split = hash2(cx, cy, s + 11);
        let px0 = cx << 5, pw = 32, py0 = cy << 5, ph = 32;
        if (split > 0.55 && split < 0.75) { pw = 16; if (sx & 1) px0 += 16; }
        else if (split >= 0.75 && split < 0.92) { ph = 16; if (sy & 1) py0 += 16; }
        else if (split >= 0.92) { pw = 16; ph = 16; if (sx & 1) px0 += 16; if (sy & 1) py0 += 16; }
        const k = j * this.nsx + i;
        this.pX[k] = px0; this.pY[k] = py0; this.pW[k] = pw; this.pH[k] = ph;
        this.pid[k] = hash2(px0, py0, s + 13);
        this.deco[k] = hash2(px0, py0, s + 17);
        this.lc[k] = hash2(px0, py0, s + 19);
      }
    }
    // calm plates: one tone offset per 48 px cell
    this.cy0 = Math.floor((c.wy0 - CH + 2) / 48);
    const cy1 = Math.floor((c.wy0 + 1) / 48);
    this.ncx = Math.floor((W - 1) / 48) + 1;
    this.calm = new Float32Array(this.ncx * (cy1 - this.cy0 + 1));
    for (let j = 0; j <= cy1 - this.cy0; j++) {
      for (let i = 0; i < this.ncx; i++) this.calm[j * this.ncx + i] = hash2(i, this.cy0 + j, s + 23);
    }
  }

  /** Zone of the macro cell containing world (x, wy) (x >= -6, wy within the chunk + 6). */
  zoneAt(x: number, wy: number): number {
    return this.zone[(Math.floor(wy / MAC) - this.my0) * this.nmx + Math.floor(x / MAC) - this.mx0];
  }

  /** True if world (x, wy) lies on a raised armour block (inset 7 px inside its macro cell). */
  onRaised(x: number, wy: number): boolean {
    if (this.zoneAt(x, wy) !== Z_RAISED) return false;
    const mx = Math.floor(x / MAC), my = Math.floor(wy / MAC);
    const lx = x - mx * MAC, ly = my * MAC + MAC - 1 - wy;
    return lx >= 7 && ly >= 7 && lx < MAC - 7 && ly < MAC - 7;
  }
}

/** Per-chunk state shared by the techno steps. */
interface Ctx {
  c: Chunk; GRIME: Float32Array; STAIN: Float32Array; G: Float32Array; cls: Uint8Array; tab: Tables; tr: Trenches;
  out: { col: number; lit: boolean }; span: Int32Array;
}

/** Techno chunk plan: grime fields, tables, hull, trenches, pipes, doodads. */
export function planTechno(c: Chunk): Step[] {
  const s = c.seed, W = c.w;
  let k!: Ctx;
  return [
    once(() => {
      k = {
        c, GRIME: lattice(c, 20, s + 3, 0, 1.5), STAIN: lattice(c, 64, s + 4, 0, 1.6), G: grain(c, s + 5, 0),
        cls: c.u8(W * CH), tab: new Tables(c), tr: new Trenches(c, s + 101), out: { col: 0, lit: false },
        span: new Int32Array(2),
      };
    }),
    range(CH, 4, (a, b) => hullRows(k, a, b)),
    range(CH, 8, (a, b) => trenchRows(k, a, b)),
    range(CH, 16, (a, b) => pipeRows(k, a, b)),
    once(() => placeTechnoDoodads(c, k.cls)),
  ];
}

/** Standard paneling tone at a pixel (panel data from the 16 px sub-cell table). */
function panelTone(tab: Tables, x: number, wy: number, base: number, g: number, out: { col: number; lit: boolean }): number {
  const kk = ((wy >> 4) - tab.sy0) * tab.nsx + (x >> 4);
  const px0 = tab.pX[kk], py0 = tab.pY[kk], pw = tab.pW[kk], ph = tab.pH[kk];
  const lx = x - px0, ly = py0 + ph - 1 - wy;
  let t = base + (tab.pid[kk] - 0.5) * 0.16;
  out.col = 0;
  out.lit = false;
  if (lx === pw - 1 || ly === ph - 1) return 0.02;                     // seam
  if (lx === 0 || ly === 0) return t + 0.28;                           // bevel highlight
  if (lx === pw - 2 || ly === ph - 2) return t - 0.16;                 // bevel shadow
  const deco = tab.deco[kk];
  const inner = lx >= 3 && ly >= 3 && lx <= pw - 5 && ly <= ph - 5;
  if ((lx === 2 || lx === pw - 4) && (ly === 2 || ly === ph - 4)) return t + 0.32;     // rivet
  if ((lx === 3 || lx === pw - 3) && (ly === 3 || ly === ph - 3)) return t - 0.14;     // rivet shadow
  if (deco < 0.09 && inner) {
    t = ((ly - 3) % 3 === 0) ? 0.05 : ((ly - 3) % 3 === 1 ? 0.32 : 0.2);              // vent slats
    return lx === 3 || ly === 3 ? t - 0.1 : t;
  }
  if (deco < 0.14 && inner) return ((lx & 3) === 0 || (ly & 3) === 0) ? 0.12 : 0.28 + (g - 0.5) * 0.1;  // mesh
  if (deco < 0.18 && ly < 5 && ly > 0) {
    out.col = (((x + wy) >> 2) & 1) ? (ly < 2 ? HAZ_Y2 : HAZ_Y) : HAZ_K;               // hazard band
    return t;
  }
  if (deco < 0.27 && lx >= 5 && ly >= 5 && lx <= pw - 7 && ly <= ph - 7) {             // raised greeble
    if (lx === 5 || ly === 5) return t + 0.34;
    if (lx === pw - 7 || ly === ph - 7) return t - 0.2;
    return t + 0.08;
  }
  if (deco < 0.27 && ((lx >= pw - 6 && lx <= pw - 4 && ly >= 7) || (ly >= ph - 6 && ly <= ph - 4 && lx >= 7))) return t - 0.2;
  if (deco < 0.31 && lx >= pw - 7 && lx <= pw - 6 && ly >= 3 && ly <= 4) {
    const lc = tab.lc[kk];
    out.col = lc < 0.5 ? L_TEAL : lc < 0.8 ? L_AMB : L_RED;                             // status light
    out.lit = true;
    return t;
  }
  if (deco < 0.31 && lx >= pw - 8 && lx <= pw - 5 && ly >= 2 && ly <= 5) {
    const lc = tab.lc[kk];
    out.col = lc < 0.5 ? L_TEAL_D : lc < 0.8 ? L_AMB_D : L_RED_D;                       // light halo
    return t;
  }
  return t;
}

/** Hull rows [r0, r1): macro zones (paneling / calm plates / raised armour / bays) + armour shadows. */
function hullRows(k: Ctx, r0: number, r1: number): void {
  const { c, cls, GRIME, STAIN, G, tab, out } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    const my = Math.floor(wy / MAC);
    const ly = my * MAC + MAC - 1 - wy;
    const calmRow = (Math.floor((wy + 1) / 48) - tab.cy0) * tab.ncx;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const mx = Math.floor(x / MAC), lx = x - mx * MAC;
      const zone = tab.zoneAt(x, wy);
      const base = 0.46 + (GRIME[i] - 0.5) * 0.2 + (g - 0.5) * 0.06 - (STAIN[i] > 0.62 ? (STAIN[i] - 0.62) * 0.8 : 0);
      let col = 0;
      let kind = K_PLATE;
      if (zone === Z_RAISED && lx >= 7 && ly >= 7 && lx < MAC - 7 && ly < MAC - 7) {
        // raised armour block: thick bevel, two big plates, rivet rows, central spine
        kind = K_ARMOR;
        const bx = lx - 7, by = ly - 7, n = MAC - 14;
        let t = base + 0.06;
        if (bx < 2 || by < 2) t = 0.95;
        else if (bx >= n - 2 || by >= n - 2) t = 0.1;
        else if (bx === (n >> 1) || by === (n >> 1)) t = 0.08;
        else if (bx === (n >> 1) + 1 || by === (n >> 1) + 1) t += 0.24;
        else if ((bx === 5 || bx === n - 6 || by === 5 || by === n - 6) && ((bx + by) & 7) === 0) t += 0.36;
        col = tone(ARMOR, t, d);
      } else if (zone === Z_BAY && lx >= 8 && ly >= 8 && lx < MAC - 8 && ly < MAC - 8) {
        // recessed machinery bay: deep floor, inner shadow from the north-west rim, greebles
        kind = K_BAY;
        const bx = lx - 8, by = ly - 8, n = MAC - 16;
        let t = 0.45 + (g - 0.5) * 0.1;
        if (bx < 6 || by < 6) t = 0.12;
        else if (bx >= n - 2 || by >= n - 2) t = 0.75;                                 // lit far wall
        else {
          const gx = (bx - 6) % 22, gy = (by - 6) % 18;
          if (gx >= 3 && gx <= 12 && gy >= 3 && gy <= 9) t = gx === 3 || gy === 3 ? 0.95 : gx === 12 || gy === 9 ? 0.25 : 0.62;
          else if (gx >= 4 && gx <= 14 && gy >= 4 && gy <= 11 && (gx > 12 || gy > 9)) t = 0.1;   // greeble shadow
          else if (((bx + by) & 7) === 0) t = 0.3;
        }
        col = tone(BAY, t, d);
      } else if (zone === Z_CALM) {
        // calm large plates: 48 px plates, bevels, rivet rows every 8 px
        const qx = lx % 48, qy = ly % 48;
        let t = base + (tab.calm[calmRow + ((x / 48) | 0)] - 0.5) * 0.12;
        if (qx === 47 || qy === 47) t = 0.02;
        else if (qx === 0 || qy === 0) t += 0.26;
        else if (qx === 46 || qy === 46) t -= 0.16;
        else if ((qx === 3 || qy === 3) && ((qx + qy) & 7) === 0) t += 0.3;
        col = tone(PLATE, t, d);
      } else {
        const t = panelTone(tab, x, wy, base, g, out);
        col = out.col !== 0 ? out.col : tone(PLATE, t, d);
        if (out.lit) kind = K_LIGHT;
      }
      // shadows: raised armour blocks cast 6 px to the south-east; bays sit below the rim
      if (kind !== K_ARMOR && tab.onRaised(x - 6, wy + 6) && !tab.onRaised(x, wy)) col = shade(col, 120, 122, 140, 4);
      else if (zone === Z_BAY && kind === K_PLATE && (lx >= MAC - 8 && lx < MAC - 6 || ly >= MAC - 8 && ly < MAC - 6)) col = shade(col, 150, 150, 165, 0);
      px[o] = col;
      cls[o] = kind;
    }
  }
}

/** Trench rows [r0, r1): hazard-striped rims, floor shadowed by the west / north walls, ribbed lit east wall, beams, lights. */
function trenchRows(k: Ctx, r0: number, r1: number): void {
  const { c, cls, G, tr, span } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    tr.span(wy, span);
    const xa = Math.max(0, span[0]), xb = Math.min(W, span[1]);
    if (xa >= xb) continue;
    const cx = tr.centre(wy);
    for (let x = xa; x < xb; x++) {
      if (!tr.inside(x, wy)) continue;
      const o = r * W + x, i = (r + M) * S + x + M;
      const d = bayer4(x, wy), g = G[i];
      const rim = !tr.inside(x - 2, wy) || !tr.inside(x + 2, wy) || !tr.inside(x, wy + 2) || !tr.inside(x, wy - 2);
      let col: number;
      if (rim) {
        col = (((x + wy) >> 2) & 1) ? HAZ_Y : HAZ_K;
        if (!tr.inside(x - 1, wy) || !tr.inside(x, wy + 1)) col = shade(col, 290, 290, 290, 0);   // lit outer lip
        else if (!tr.inside(x + 1, wy) || !tr.inside(x, wy - 1)) col = shade(col, 150, 150, 150, 0);
        cls[o] = K_RIM;
      } else {
        let t = 0.46 + (g - 0.5) * 0.1;
        const shadowed = !tr.inside(x - 2 - DEPTH, wy) || !tr.inside(x, wy + 2 + DEPTH) || !tr.inside(x - DEPTH, wy + DEPTH);
        if (!tr.inside(x + 6, wy)) t = 0.72 + ((wy & 7) === 0 ? -0.3 : (wy & 7) === 1 ? 0.18 : 0);  // ribbed lit east wall
        else if (!tr.inside(x, wy - 6)) t = 0.62;                                                   // lit south wall
        else {
          if (((wy + 3) % 24) < 2) t += 0.24;                                                        // cross-beam
          if (cx >= 0 && (x === cx || x === cx - 1) && tr.inside(x, wy + 8) && tr.inside(x, wy - 8)) t = 0.14;  // conduit
          if (shadowed) t -= 0.3;
        }
        col = tone(TRENCH, t, d);
        if (cx >= 0 && x === cx + 2 && (wy & 15) === 0 && tr.inside(x, wy + 8) && !shadowed) col = (wy & 16) ? L_TEAL : L_RED;
        cls[o] = K_TRENCH;
      }
      px[o] = col;
    }
  }
}

/** Pipe rows [r0, r1): double pipes across the hull (one run per band, maybe), flanges, shadows. */
function pipeRows(k: Ctx, r0: number, r1: number): void {
  const { c, cls, G } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px, s = c.seed;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    const band = Math.floor(wy / PBAND);
    if (!c.force && hash2(band, 7, s + 201) > 0.5) continue;
    const thick = 8 + Math.floor(hash2(band, 9, s + 201) * 2) * 2;
    const twin = hash2(band, 13, s + 201) < 0.6;
    const span = twin ? thick * 2 + 2 : thick;
    const top = band * PBAND + 30 + Math.floor(hash2(band, 8, s + 201) * (PBAND - 60 - span));   // world y of the top row
    const x0 = hash2(band, 10, s + 201) < 0.5 ? 0 : Math.floor(hash2(band, 11, s + 201) * W * 0.45);
    const x1 = x0 === 0 ? Math.floor(W * (0.55 + 0.45 * hash2(band, 12, s + 201))) : W;
    const yy = top - wy;                                             // rows from the top of the run
    if (yy < 0 || yy > span + 3) continue;
    const pipeRow = twin && yy > thick + 1 ? yy - thick - 2 : yy;    // row inside the current pipe
    const gapRow = twin && (yy === thick || yy === thick + 1);
    for (let x = Math.max(0, x0); x < Math.min(W, x1 + 4); x++) {
      const o = r * W + x, i = (r + M) * S + x + M;
      const d = bayer4(x, wy);
      if (yy >= span || x >= x1 || gapRow) {
        if (x >= x0 + 3 && (yy < span + 4) && (yy >= span || x >= x1 || gapRow)) px[o] = shade(px[o], 120, 120, 140, 0);
        continue;
      }
      const kk = pipeRow / (thick - 1);
      let t = kk < 0.12 ? 0.62 : kk < 0.32 ? 0.92 : kk < 0.55 ? 0.62 : kk < 0.8 ? 0.36 : 0.12;
      const fl = (x - x0) % 44;
      if (fl < 4) t += fl === 0 ? 0.2 : fl === 3 ? -0.2 : 0.12;      // flange ring
      if (x === x1 - 1 || x === x0) t -= 0.15;
      t += (G[i] - 0.5) * 0.08;
      px[o] = tone(PIPE, t, d);
      cls[o] = K_PIPE;
    }
  }
}

/** Towers on armour, hatches / vent grates on plating, lights along trench rims, pipe junctions. */
function placeTechnoDoodads(c: Chunk, cls: Uint8Array): void {
  const W = c.w;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  const all = (x: number, r: number, rad: number, kind: number) =>
    at(x, r) === kind && at(x - rad, r) === kind && at(x + rad, r) === kind && at(x, r - rad) === kind && at(x, r + rad) === kind;
  eachCell(c, 44, 1601, (x, r, h1, h2) => {
    if (!farFromDoodads(c, x, r, 28)) return;
    const kind = at(x, r);
    if (kind === K_RIM && h1 < 0.6) c.add('dd_light', x, r);
    else if (kind === K_PIPE && h1 < 0.4) c.add('dd_pipe', x, r, h2 < 0.5);
    else if (all(x, r, 16, K_ARMOR) && h1 < 0.45) c.add('dd_tower', x, r, h2 < 0.5);
    else if (all(x, r, 12, K_BAY) && h1 < 0.4) c.add('dd_vent_grate', x, r, h2 < 0.5);
    else if (all(x, r, 12, K_PLATE)) {
      if (h1 < 0.09) c.add('dd_hatch', x, r);
      else if (h1 < 0.2) c.add('dd_vent_grate', x, r, h2 < 0.5);
      else if (h1 < 0.26) c.add('dd_pipe', x, r, h2 < 0.5);
    } else if (kind === K_TRENCH && h1 < 0.2) c.add('dd_light', x, r);
  });
}
