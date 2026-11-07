// SPACE terrain painter: near-black void with subtle dithered nebula clouds (violet / teal) cut
// by dark dust lanes, three layers of stars, and occasional rocky asteroid platforms with
// craters and embedded metal structures (plates, girders, lights).
import { fbm, hash2, valueNoise } from './noise';
import {
  CH, Chunk, field, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, pack, sites,
  Site, Voronoi, ensureSite, list, once, range, type Step,
} from './b_ter_core';

const NEB_V = rampN(8, 0x040309, 0x08060f, 0x0d0918, 0x130c22, 0x1a102c, 0x221436, 0x2b1840, 0x351d4a);
const NEB_T = rampN(8, 0x03060a, 0x050a12, 0x08101a, 0x0b1624, 0x0f1d2e, 0x132538, 0x182d40, 0x1e3648);
const NEB_R = rampN(8, 0x07040a, 0x0d0610, 0x140918, 0x1c0c1e, 0x241024, 0x2c142a, 0x341830, 0x3c1c34);
const ROCK = rampN(8, 0x0c0b0e, 0x161418, 0x221e24, 0x2e2830, 0x3c343c, 0x4a4148, 0x5a5056, 0x6c6066);
const METAL = rampN(6, 0x14181f, 0x1f2530, 0x2c3442, 0x3c4656, 0x505c6e, 0x667488);
const STARS = [pack(0x2a3040), pack(0x464e66), pack(0x6a7290), pack(0x9aa2c0), pack(0xc8cee6)];
const LIGHT_R = pack(0xc04040), LIGHT_T = pack(0x30b0a0);
const HAZ_Y = pack(0x8a7222), HAZ_K = pack(0x1a1812);

const K_VOID = 0, K_ROCK = 1, K_METAL = 2;

/** Platform radii for a site. */
function radii(st: Site): [number, number] {
  return [56 + st.h3 * 50, 42 + st.h4 * 40];
}

/** Per-chunk state shared by the space steps. */
interface Ctx {
  c: Chunk; NEB: Float32Array; HUE: Float32Array; LANE: Float32Array; MID: Float32Array; DET: Float32Array;
  G: Float32Array; cls: Uint8Array; sites: Site[]; plats: Plat[];
}

/** Nebula void, rows [r0, r1): dithered clouds (teal / violet / red by a slow hue field), soft dust lanes. */
function voidRows(k: Ctx, r0: number, r1: number): void {
  const { c, NEB, HUE, LANE, MID, DET, cls } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy);
      let t = (NEB[i] - 0.42) * 2.6;
      t = t < 0 ? 0 : t * t * 0.9;
      t += (MID[i] - 0.5) * 0.3 * t + (DET[i] - 0.5) * 0.08 * t;
      const lane = LANE[i] - 0.5;
      const la = lane < 0 ? -lane : lane;
      if (la < 0.1 && HUE[i] > 0.3) t *= 1 - (0.1 - la) * 5 * (HUE[i] - 0.3);
      const h = HUE[i] + (d - 0.5) * 0.12;
      px[o] = tone(h < 0.42 ? NEB_T : h < 0.62 ? NEB_V : NEB_R, t, d);
      cls[o] = K_VOID;
    }
  }
}

/** Stars: one candidate per 5x5 world cell (seamless, never repeats); rare bright crosses. */
function paintStars(c: Chunk): void {
  const W = c.w, px = c.px, s = c.seed;
  const cy0 = Math.floor((c.wy0 - CH) / 5), cy1 = Math.floor((c.wy0 + 1) / 5);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = 0; cx * 5 < W + 1; cx++) {
      if (hash2(cx, cy, s + 21) > 0.2) continue;
      const x = cx * 5 + Math.floor(hash2(cx, cy, s + 22) * 5), r = c.wy0 - (cy * 5 + Math.floor(hash2(cx, cy, s + 23) * 5));
      const b = hash2(cx, cy, s + 24);
      const lvl = b < 0.62 ? 0 : b < 0.86 ? 1 : b < 0.96 ? 2 : b < 0.993 ? 3 : 4;
      if (x >= 0 && x < W && r >= 0 && r < CH) px[r * W + x] = STARS[lvl];
      if (lvl === 4) {
        for (let k = 0; k < 4; k++) {
          const qx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), qr = r + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (qx >= 0 && qx < W && qr >= 0 && qr < CH) px[qr * W + qx] = STARS[2];
        }
      }
    }
  }
}

/** One asteroid platform prepared for row-sliced painting (shape buffer, craters, metal parts). */
class Plat {
  readonly ax: number; readonly ay: number;
  readonly xa: number; readonly xb: number; readonly ra: number; readonly rb: number;
  readonly V: Float32Array; readonly vor: Voronoi; readonly id: number;
  readonly mw: number; readonly mh: number; readonly mx0: number; readonly mr0: number;
  readonly gy: number; readonly gLen: number; readonly gDir: number; readonly padX: number; readonly padR: number;

  constructor(c: Chunk, readonly st: Site) {
    const s = c.seed;
    const [ax, ay] = radii(st);
    this.ax = ax; this.ay = ay;
    // shape buffer bounds (+7 px for the up-left shadow lookups, +1 px for slopes)
    this.xa = Math.max(-7, Math.floor(st.wx - ax * 1.45)) | 0;
    this.xb = Math.min(c.w + 1, Math.ceil(st.wx + ax * 1.45)) | 0;
    this.ra = Math.max(-7, Math.floor(st.r - ay * 1.45)) | 0;
    this.rb = Math.min(CH + 1, Math.ceil(st.r + ay * 1.45)) | 0;
    this.V = c.f32(c.N);
    this.vor = new Voronoi(c, 26, s + 41 + Math.floor(st.wy), 0.85, 8);
    const id = Math.floor(st.wy);
    this.id = id;
    this.mw = 30 + Math.floor(st.h1 * 24);
    this.mh = 18 + Math.floor(st.h2 * 14);
    this.mx0 = Math.round(st.wx - this.mw / 2 + (hash2(id, 1, s) - 0.5) * 30) | 0;
    this.mr0 = Math.round(st.r - this.mh / 2 + (hash2(id, 2, s) - 0.5) * 20) | 0;
    this.gy = this.mr0 + Math.floor(this.mh / 2) - 1;
    this.gLen = 34 + Math.floor(hash2(id, 3, s) * 30);
    this.gDir = hash2(id, 4, s) < 0.5 ? -1 : 1;
    this.padX = this.mx0 + (this.gDir > 0 ? -16 : this.mw + 16);
    this.padR = this.mr0 + this.mh + 10;
  }
}

/** Platform shape values for chunk rows [r0, r1) (rows may start at -7). */
function shapeRows(k: Ctx, p: Plat, r0: number, r1: number): void {
  const { c, MID, DET } = k;
  const M = c.M, S = c.S, V = p.V, st = p.st;
  for (let r = Math.max(r0, p.ra); r <= Math.min(r1 - 1, p.rb + 1); r++) {
    const dy = (r - st.r) / p.ay;
    let i = (r + M) * S + p.xa + M;
    for (let x = p.xa; x <= p.xb + 1; x++, i++) {
      const dx = (x - st.wx) / p.ax;
      V[i] = 1 - Math.sqrt(dx * dx + dy * dy) + (MID[i] - 0.5) * 0.75 + (DET[i] - 0.5) * 0.16;
    }
  }
}

/** Platform pixels for rows [r0, r1): shaded rock, ridges, craters, lit rim, deck, girder, pad, shadows. */
function platRows(k: Ctx, p: Plat, r0: number, r1: number): void {
  const { c, cls, MID, DET, G } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px, s = c.seed;
  const { V, vor, id, mw, mh, mx0, mr0, gy, gLen, gDir, padX, padR } = p;
  const padRad = 9;
  for (let r = Math.max(r0, p.ra + 7); r <= Math.min(r1 - 1, p.rb); r++) {
    const wy = c.wy0 - r;
    for (let x = Math.max(0, p.xa + 7); x <= Math.min(W - 1, p.xb); x++) {
      const i = (r + M) * S + x + M, o = r * W + x;
      const v = V[i];
      if (v <= 0) {
        if (V[i - 6 * S - 6] > 0) px[o] = shade(px[o], 90, 90, 110, 0);   // drop shadow on the void
        continue;
      }
      const d = bayer4(x, wy), g = G[i];
      const vl = V[i - S - 1], vr = V[i + S + 1];
      const lmx = x - mx0, lmy = r - mr0;
      let col: number;
      const onGirder = r >= gy && r < gy + 3 && v > 0.05 && (gDir > 0 ? x >= mx0 + mw && x < mx0 + mw + gLen : x < mx0 && x >= mx0 - gLen);
      const pdx = x - padX, pdy = r - padR, pq = pdx * pdx + pdy * pdy;
      if (onGirder) {
        cls[o] = K_METAL;
        col = tone(METAL, r === gy ? 0.85 : r === gy + 2 ? 0.12 : ((x + 64) % 6 === 0 ? 0.2 : 0.55), d);
      } else if (pq <= padRad * padRad && v > 0.1) {
        // landing pad: hazard ring, dark centre, lit edge
        cls[o] = K_METAL;
        const q = Math.sqrt(pq);
        if (q > padRad - 2.2) col = (((Math.atan2(pdy, pdx) * 4 / Math.PI + 8) | 0) & 1) ? HAZ_Y : HAZ_K;
        else col = tone(METAL, 0.3 + (pdx + pdy < 0 ? 0.15 : 0) + (q < 2 ? 0.4 : 0), d);
      } else if (lmx >= 0 && lmy >= 0 && lmx < mw && lmy < mh && v > 0.1) {
        // embedded metal deck: panels, bevels, rivets, vents, a light
        cls[o] = K_METAL;
        let t = 0.5 + (hash2((lmx / 9) | 0, (lmy / 7) | 0, id + s) - 0.5) * 0.3;
        if (lmx === 0 || lmy === 0) t = 0.95;
        else if (lmx === mw - 1 || lmy === mh - 1) t = 0.1;
        else if (lmx % 9 === 0 || lmy % 7 === 0) t = 0.2;
        else if (lmx % 9 === 1 || lmy % 7 === 1) t += 0.18;
        else if ((lmx % 9 === 4 || lmx % 9 === 6) && lmy % 7 >= 3 && lmy % 7 <= 5 && hash2((lmx / 9) | 0, (lmy / 7) | 0, id + 9) < 0.4) t = 0.12;
        col = tone(METAL, t, d);
        if (lmx === mw - 3 && lmy === 2) col = (id & 1) ? LIGHT_R : LIGHT_T;
      } else {
        cls[o] = K_ROCK;
        vor.qx = x;
        vor.qy = wy;
        vor.run();
        let t = 0.42 + (vr - vl) * 2.4 + (v < 0.1 ? -0.12 : v * 0.22) + (DET[i + S + 1] - DET[i - S - 1]) * 2 + (g - 0.5) * 0.12;
        const ridge = MID[i] - 0.5;
        if (ridge > 0 && ridge < 0.025) t += 0.14;
        else if (ridge < 0 && ridge > -0.02) t -= 0.12;
        const cr = 5 + vor.id * 9;
        if (vor.id > 0.68 && vor.f1 < cr) {
          const q = vor.f1 / cr;
          const side = (vor.dx - vor.dy) / (vor.f1 + 0.5);           // >0 = lower-right inner wall
          t = q > 0.8 ? 0.62 + side * 0.2 : 0.2 + side * 0.22 + q * 0.12;
        }
        if (vl <= 0) t += 0.3;                                      // lit rim
        else if (vr <= 0) t -= 0.28;
        if (g > 0.985) t += 0.3;
        col = tone(ROCK, t, d);
        // shadows of the deck and girder on the rock
        if ((lmx >= 3 && lmy >= 3 && lmx < mw + 4 && lmy < mh + 4) || (r >= gy + 3 && r < gy + 6 && (gDir > 0 ? x >= mx0 + mw && x < mx0 + mw + gLen + 3 : x < mx0 + 3 && x >= mx0 - gLen))) {
          col = shade(col, 120, 120, 140, 4);
        }
      }
      px[o] = col;
    }
  }
}

/** Space chunk plan: nebula fields, void, stars, asteroid platforms, doodads. */
export function planSpace(c: Chunk): Step[] {
  const s = c.seed, W = c.w;
  let NEB!: Float32Array, HUE!: Float32Array, LANE!: Float32Array, MID!: Float32Array;
  let k!: Ctx;
  return [
    once(() => { NEB = field(c, 8, (x, y) => fbm(x / 150, y / 210, s + 1, 3) + 0.25 * (valueNoise(x / 520, y / 700, s + 2) - 0.5), 0); }),
    once(() => { HUE = lattice(c, 96, s + 3, 0, 1.6); LANE = lattice(c, 36, s + 7, 0, 1.6); }),
    once(() => { MID = lattice(c, 12, s + 4, 12); }),
    once(() => {
      const DET = lattice(c, 4, s + 5, 12);
      const plats = sites(c, 640, 1001, 0.55, 130, 80);
      ensureSite(c, plats);
      k = { c, NEB, HUE, LANE, MID, DET, G: grain(c, s + 6, 0), cls: c.u8(W * CH), sites: plats, plats: list<Plat>() };
      for (let q = 0; q < plats.length; q++) {
        const p = new Plat(c, plats[q]);
        if (p.xa <= p.xb && p.ra <= p.rb && p.rb >= 0 && p.ra < CH) k.plats.push(p);
      }
    }),
    range(CH, 4, (a, b) => voidRows(k, a, b)),
    once(() => paintStars(c)),
    range(CH + 9, 16, (a, b) => { for (let q = 0; q < k.plats.length; q++) shapeRows(k, k.plats[q], a - 7, b - 7); }),
    range(CH, 4, (a, b) => { for (let q = 0; q < k.plats.length; q++) platRows(k, k.plats[q], a, b); }),
    once(() => placeSpaceDoodads(c, k.cls, k.sites)),
  ];
}

/** Beacons and debris on platforms, satellites and drifting debris in the void. */
function placeSpaceDoodads(c: Chunk, cls: Uint8Array, plats: Site[]): void {
  const W = c.w;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  for (let k = 0; k < plats.length; k++) {
    const st = plats[k];
    const bx = st.wx + (st.h4 - 0.5) * 40, br = st.r + (st.h3 - 0.5) * 30;
    if (at(bx, br) === K_ROCK) c.add('dd_beacon', bx, br);
  }
  eachCell(c, 64, 1101, (x, r, h1, h2) => {
    const kind = at(x, r);
    if (!farFromDoodads(c, x, r, 34)) return;
    if (kind === K_ROCK && h1 < 0.4) c.add('dd_station_debris', x, r, h2 < 0.5, 0.8 + h2 * 0.3);
    else if (kind === K_VOID && at(x - 18, r) === K_VOID && at(x + 18, r) === K_VOID) {
      if (h1 < 0.035) c.add('dd_satellite', x, r, h2 < 0.5);
      else if (h1 < 0.12) c.add('dd_station_debris', x, r, h2 < 0.5, 0.7 + h2 * 0.3);
    }
  });
}
