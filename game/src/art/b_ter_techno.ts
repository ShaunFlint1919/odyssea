// TECHNO terrain painter: an endless armoured hull. 96 px world macro zones give structure —
// standard paneling (32 px cells split into 1/2/4 panels with bevels, seams, rivets and a few
// decorations), calm large plates, raised armour blocks casting shadows and recessed machinery
// bays — plus long trench runs (hazard rims, shadowed floor, ribbed lit wall, cross-beams,
// lights) joined by cross trenches, and double pipes with flanges.
import { hash2 } from './noise';
import {
  CH, Chunk, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, pack, scratchU8,
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
const K_PLATE = 0, K_ARMOR = 1, K_BAY = 2, K_TRENCH = 3, K_RIM = 4, K_PIPE = 5, K_LIGHT = 6;
const Z_PANELS = 0, Z_CALM = 1, Z_RAISED = 2, Z_BAY = 3;

/** Zone type of a macro cell. */
function zoneOf(mx: number, my: number, seed: number): number {
  const h = hash2(mx, my, seed + 31);
  return h < 0.42 ? Z_PANELS : h < 0.62 ? Z_CALM : h < 0.82 ? Z_RAISED : Z_BAY;
}

/** True if world (x, wy) lies on a raised armour block (inset 7 px inside its macro cell). */
function onRaised(x: number, wy: number, seed: number): boolean {
  const mx = Math.floor(x / MAC), my = Math.floor(wy / MAC);
  if (zoneOf(mx, my, seed) !== Z_RAISED) return false;
  const lx = x - mx * MAC, ly = my * MAC + MAC - 1 - wy;
  return lx >= 7 && ly >= 7 && lx < MAC - 7 && ly < MAC - 7;
}

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

  /** Centre x of the vertical run at world y (or -1). */
  centre(wy: number): number {
    const j = Math.floor((wy - JOFF) / SEG) - this.k0;
    return this.x0[j] >= 0 ? (this.x0[j] + this.x1[j]) >> 1 : -1;
  }
}

/** Paints one techno chunk. */
export function paintTechno(c: Chunk): void {
  const s = c.seed, W = c.w;
  const GRIME = lattice(c, 20, s + 3, 0, 1.5);
  const STAIN = lattice(c, 64, s + 4, 0, 1.6);
  const G = grain(c, s + 5, 0);
  const cls = scratchU8(W * CH);
  paintHull(c, cls, GRIME, STAIN, G);
  paintTrenches(c, cls, G);
  paintPipes(c, cls, G);
  placeTechnoDoodads(c, cls);
}

/** Standard paneling tone at a pixel (32 px cells split into 1, 2 or 4 panels). */
function panelTone(x: number, wy: number, s: number, base: number, g: number, out: { col: number; lit: boolean }): number {
  const cx = x >> 5, cy = wy >> 5;
  const split = hash2(cx, cy, s + 11);
  let px0 = cx << 5, pw = 32, py0 = cy << 5, ph = 32;
  if (split > 0.55 && split < 0.75) { pw = 16; if ((x & 31) >= 16) px0 += 16; }
  else if (split >= 0.75 && split < 0.92) { ph = 16; if ((wy & 31) >= 16) py0 += 16; }
  else if (split >= 0.92) { pw = 16; ph = 16; if ((x & 31) >= 16) px0 += 16; if ((wy & 31) >= 16) py0 += 16; }
  const lx = x - px0, ly = py0 + ph - 1 - wy;
  let t = base + (hash2(px0, py0, s + 13) - 0.5) * 0.16;
  out.col = 0;
  out.lit = false;
  if (lx === pw - 1 || ly === ph - 1) return 0.02;                     // seam
  if (lx === 0 || ly === 0) return t + 0.28;                           // bevel highlight
  if (lx === pw - 2 || ly === ph - 2) return t - 0.16;                 // bevel shadow
  const deco = hash2(px0, py0, s + 17);
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
    const lc = hash2(px0, py0, s + 19);
    out.col = lc < 0.5 ? L_TEAL : lc < 0.8 ? L_AMB : L_RED;                             // status light
    out.lit = true;
    return t;
  }
  if (deco < 0.31 && lx >= pw - 8 && lx <= pw - 5 && ly >= 2 && ly <= 5) {
    const lc = hash2(px0, py0, s + 19);
    out.col = lc < 0.5 ? L_TEAL_D : lc < 0.8 ? L_AMB_D : L_RED_D;                       // light halo
    return t;
  }
  return t;
}

/** Hull: macro zones (paneling / calm plates / raised armour / recessed bays) + armour shadows. */
function paintHull(c: Chunk, cls: Uint8Array, GRIME: Float32Array, STAIN: Float32Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px, s = c.seed;
  const out = { col: 0, lit: false };
  for (let r = 0; r < CH; r++) {
    const wy = c.wy0 - r;
    const my = Math.floor(wy / MAC);
    const ly = my * MAC + MAC - 1 - wy;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const mx = Math.floor(x / MAC), lx = x - mx * MAC;
      const zone = zoneOf(mx, my, s);
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
        let t = base + (hash2(Math.floor(x / 48), Math.floor((wy + 1) / 48), s + 23) - 0.5) * 0.12;
        if (qx === 47 || qy === 47) t = 0.02;
        else if (qx === 0 || qy === 0) t += 0.26;
        else if (qx === 46 || qy === 46) t -= 0.16;
        else if ((qx === 3 || qy === 3) && ((qx + qy) & 7) === 0) t += 0.3;
        col = tone(PLATE, t, d);
      } else {
        const t = panelTone(x, wy, s, base, g, out);
        col = out.col !== 0 ? out.col : tone(PLATE, t, d);
        if (out.lit) kind = K_LIGHT;
      }
      // shadows: raised armour blocks cast 6 px to the south-east; bays sit below the rim
      if (kind !== K_ARMOR && onRaised(x - 6, wy + 6, s) && !onRaised(x, wy, s)) col = shade(col, 120, 122, 140, 4);
      else if (zone === Z_BAY && kind === K_PLATE && (lx >= MAC - 8 && lx < MAC - 6 || ly >= MAC - 8 && ly < MAC - 6)) col = shade(col, 150, 150, 165, 0);
      px[o] = col;
      cls[o] = kind;
    }
  }
}

/** Trenches: hazard-striped rims, floor shadowed by the west / north walls, ribbed lit east wall, beams, lights. */
function paintTrenches(c: Chunk, cls: Uint8Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const tr = new Trenches(c, c.seed + 101);
  const DEPTH = 9;
  for (let r = 0; r < CH; r++) {
    const wy = c.wy0 - r;
    const cx = tr.centre(wy);
    for (let x = 0; x < W; x++) {
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

/** Double pipes across the hull (one run per band, maybe) with flanges and shadows. */
function paintPipes(c: Chunk, cls: Uint8Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px, s = c.seed;
  for (let r = 0; r < CH; r++) {
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
      const k = pipeRow / (thick - 1);
      let t = k < 0.12 ? 0.62 : k < 0.32 ? 0.92 : k < 0.55 ? 0.62 : k < 0.8 ? 0.36 : 0.12;
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
  const all = (x: number, r: number, rad: number, k: number) =>
    at(x, r) === k && at(x - rad, r) === k && at(x + rad, r) === k && at(x, r - rad) === k && at(x, r + rad) === k;
  eachCell(c, 44, 1601, (x, r, h1, h2) => {
    if (!farFromDoodads(c, x, r, 28)) return;
    const kind = at(x, r);
    if (kind === K_RIM && h1 < 0.6) c.add('dd_light', x, r);
    else if (kind === K_PIPE && h1 < 0.4) c.add('dd_pipe', x, r, h2 < 0.5);
    else if (all(x, r, 16, K_ARMOR) && h1 < 0.45) c.add('dd_tower', x, r, h2 < 0.5);
    else if (all(x, r, 12, K_BAY) && h1 < 0.4) c.add('dd_vent_grate', x, r, h2 < 0.5);
    else if (all(x, r, 12, K_PLATE)) {
      if (h1 < 0.14) c.add('dd_hatch', x, r);
      else if (h1 < 0.24) c.add('dd_vent_grate', x, r, h2 < 0.5);
      else if (h1 < 0.3) c.add('dd_pipe', x, r, h2 < 0.5);
    } else if (kind === K_TRENCH && h1 < 0.2) c.add('dd_light', x, r);
  });
}
