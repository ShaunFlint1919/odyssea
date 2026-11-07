// JUNGLE terrain painter: dense canopy of overlapping tree crowns (height-field domes with
// top-left light, cast shadows from emergent trees, deep dark gaps), a winding muddy river
// and grassy clearings with dirt patches.
import { hash2, valueNoise } from './noise';
import {
  CH, Chunk, lattice, grain, eachCell, Meander, farFromDoodads, rampN, tone, bayer4, shade,
  sites, ensureSite, Site, once, range, type Step,
} from './b_ter_core';

// Crown species ramps (dark gap -> sunlit top), 8 tones each — close hues, subtle variety.
const CROWNS = [
  rampN(8, 0x07120c, 0x0e2014, 0x16301a, 0x204220, 0x2c5426, 0x3a662c, 0x4c7832, 0x62883a),
  rampN(8, 0x061210, 0x0c2018, 0x132f20, 0x1c4028, 0x265230, 0x326438, 0x427440, 0x56844a),
  rampN(8, 0x0c120a, 0x182210, 0x243216, 0x32441c, 0x405622, 0x506628, 0x62762e, 0x768636),
  rampN(8, 0x0a120c, 0x121e12, 0x1c2c18, 0x283c1e, 0x344c24, 0x425c2a, 0x526a30, 0x667a38),
];
const BLOOM = rampN(6, 0x1c1418, 0x3a1e2a, 0x5a2a3a, 0x7a3a48, 0x944c54, 0xa8605e);
const GRASS = rampN(6, 0x16220e, 0x203214, 0x2c4418, 0x3a561e, 0x4a6826, 0x5c782e);
const DIRT = rampN(6, 0x221c12, 0x302818, 0x40361f, 0x504428, 0x605230, 0x6e5e3a);
const MUD = rampN(5, 0x1e160e, 0x2c2014, 0x3c2c1a, 0x4c3a22, 0x5c482a);
const WATER = rampN(6, 0x0a1a18, 0x0f2622, 0x14322c, 0x1b4036, 0x244e40, 0x30604c);

const K_GROUND = 0, K_CANOPY = 1, K_WATER = 2, K_BANK = 3, K_RUIN = 4;
const SMALL = 11, BIG = 32;

// sqrt(1 - q) for q in [0, 1) sampled at 256 steps (dome profile)
const DOME = new Float32Array(257).map((_, k) => Math.sqrt(Math.max(0, 1 - k / 256)));
// splat clip: shading reads H at +1 px, cast shadows read up to 6 px up-left
const CLIP_LO = 7, CLIP_HI = 2;

/** Dome record layout in the dome list: x, row, radius, base height, amplitude, crown id. */
const DSTRIDE = 6;

/**
 * Splats domes [k0, k1) of the list into the height / id buffers (max blend). Dome parameters
 * travel through a typed array instead of (boxed) call arguments.
 */
function splatDomes(c: Chunk, H: Float32Array, ID: Float32Array, DET: Float32Array, D: Float32Array, k0: number, k1: number): void {
  const M = c.M, S = c.S, W = c.w;
  for (let k = k0; k < k1; k++) {
    const o = k * DSTRIDE;
    const wx = D[o], cr = D[o + 1], R = D[o + 2], base = D[o + 3], amp = D[o + 4], id = D[o + 5];
    const ra = Math.max(-CLIP_LO, Math.floor(cr - R)), rb = Math.min(CH + CLIP_HI - 1, Math.ceil(cr + R));
    const xa = Math.max(-CLIP_LO, Math.floor(wx - R)), xb = Math.min(W + CLIP_HI - 1, Math.ceil(wx + R));
    if (ra > rb || xa > xb) continue;
    const inv = 256 / (R * R);
    for (let r = ra; r <= rb; r++) {
      const dy = r - cr;
      let i = (r + M) * S + xa + M;
      for (let x = xa; x <= xb; x++, i++) {
        const dx = x - wx;
        const q = (dx * dx + dy * dy) * inv * (0.86 + DET[i] * 0.28);
        if (q >= 256) continue;
        const h = base + amp * DOME[q | 0];
        if (h > H[i]) { H[i] = h; ID[i] = id; }
      }
    }
  }
}

/**
 * Appends the domes of one tree crown (central clump + ring of clumps) to the dome list.
 * Returns the new dome count.
 */
function crownDomes(D: Float32Array, n: number, wx: number, cr: number, R: number, base: number, id: number, hseed: number): number {
  const ring = R > 11 ? 6 : 4;
  const a0 = hseed * 6.283;
  for (let k = 0; k < ring; k++) {
    const a = a0 + (k / ring) * 6.283;
    const dist = R * (0.5 + 0.12 * Math.sin(a * 3 + hseed * 9));
    const o = n * DSTRIDE;
    D[o] = wx + Math.cos(a) * dist; D[o + 1] = cr + Math.sin(a) * dist; D[o + 2] = R * 0.52;
    D[o + 3] = base + R * 0.25; D[o + 4] = R * 0.42; D[o + 5] = id;
    n++;
  }
  const o = n * DSTRIDE;
  D[o] = wx; D[o + 1] = cr; D[o + 2] = R * 0.62; D[o + 3] = base + R * 0.3; D[o + 4] = R * 0.5; D[o + 5] = id;
  return n + 1;
}

/** Per-chunk state shared by the jungle steps. */
interface Ctx {
  c: Chunk; DET: Float32Array; MID: Float32Array; G: Float32Array; H: Float32Array; ID: Float32Array;
  cls: Uint8Array; xc: Float32Array; hw: Float32Array; sl: Float32Array; flow: Meander; ruins: Site[];
  DL: Float32Array; nd: number;
}

/** Crown grids: [cell, min radius, radius variation, base height, probability, salt]. */
const GRIDS = [[SMALL, 7.5, 4, 0, 1, 11], [BIG, 13, 6, 6, 0.55, 23]];

/** Clearing value at a world point (high = open ground); temple sites force a clearing. */
function clearing(k: Ctx, wx: number, wy: number): number {
  const s = k.c.seed;
  let v = valueNoise(wx / 150, wy / 190, s + 3) * 0.75 + valueNoise(wx / 40, wy / 40, s + 4) * 0.25;
  for (let q = 0; q < k.ruins.length; q++) {
    const st = k.ruins[q], dx = wx - st.wx, dy = wy - st.wy;
    if (dx * dx + dy * dy < 46 * 46) v += 0.4;
  }
  return v;
}

/** Appends the crowns of cell rows [j0, j1) of crown grid g to the dome list. */
function crownRows(k: Ctx, g: number, j0: number, j1: number): void {
  const c = k.c, s = c.seed, W = c.w;
  const [cell, rMin, rVar, base, prob, salt] = GRIDS[g];
  const reach = CLIP_LO + rMin + rVar + cell;
  const cy0 = Math.floor((c.wy0 - CH - reach) / cell);
  const cx0 = Math.floor(-reach / cell), cx1 = Math.floor((W + reach) / cell);
  for (let cy = cy0 + j0; cy < cy0 + j1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      if (hash2(cx, cy, s + salt + 2) > prob) continue;
      const wx = (cx + 0.1 + 0.8 * hash2(cx, cy, s + salt)) * cell;
      const wy = (cy + 0.1 + 0.8 * hash2(cx, cy, s + salt + 1)) * cell;
      if (clearing(k, wx, wy) > 0.66 - (base > 0 ? 0.06 : 0)) continue;
      const h = k.flow.hw(wy);
      if (h > 0.5 && Math.abs(wx - k.flow.xc(wy)) < h + (base > 0 ? 6 : 1)) continue;
      const R = rMin + rVar * hash2(cx, cy, s + salt + 3);
      if (k.nd < 16384 - 8) k.nd = crownDomes(k.DL, k.nd, wx, c.wy0 - wy, R, base, 0.001 + hash2(cx, cy, s + salt + 4) * 0.998, hash2(cx, cy, s + salt + 5));
    }
  }
}

/** Number of crown cell rows of grid g overlapping the chunk (+ reach). */
function crownRowCount(c: Chunk, g: number): number {
  const [cell, rMin, rVar] = GRIDS[g];
  const reach = CLIP_LO + rMin + rVar + cell;
  return Math.floor((c.wy0 + reach) / cell) - Math.floor((c.wy0 - CH - reach) / cell) + 1;
}

/** Main pass, rows [r0, r1): canopy shading / shadows, river, banks and clearing ground. */
function paintRows(k: Ctx, r0: number, r1: number): void {
  const { c, DET, MID, G, H, ID, cls } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const sh = 5 * S + 5, sh2 = 3 * S + 3;
  for (let r = r0; r < r1; r++) {
    const rr = r + M, wy = c.wy0 - r;
    const xc = k.xc[rr], hw = k.hw[rr], kk = 1 / Math.sqrt(1 + k.sl[rr] * k.sl[rr]);
    let i = rr * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const h = H[i];
      let col: number;
      if (h > 0) {
        // canopy: dome slope light + emergent height + leaf clumps, dark gaps between crowns
        cls[o] = K_CANOPY;
        const id = ID[i];
        const slope = (H[i + S + 1] - H[i - S - 1]) * 0.11;
        let t = 0.4 + (slope > 0.34 ? 0.34 : slope < -0.42 ? -0.42 : slope) + h * 0.011 + (DET[i] - 0.5) * 0.18 + (g - 0.5) * 0.07;
        if (H[i - 1] < h - 2.5 || H[i - S] < h - 2.5) t += 0.1;        // clump rim catching light
        if (H[i + 1] < h - 2.5 || H[i + S] < h - 2.5) t -= 0.12;
        if (g > 0.93) t += slope > 0 ? 0.16 : 0.08;                       // leaf glints / dark holes
        else if (g < 0.07) t -= 0.16;
        const occl = H[i - sh] - h, occl2 = H[i - sh2] - h;
        const shadow = occl > 4 || occl2 > 3.2;
        const sp = id < 0.38 ? 0 : id < 0.66 ? 1 : id < 0.86 ? 2 : 3;
        if (id > 0.975 && !shadow) col = tone(BLOOM, t + (DET[i] > 0.6 ? 0.15 : 0), d);
        else col = tone(CROWNS[sp], t, d);
        if (shadow) col = shade(col, 116, 126, 150, 6);
      } else {
        const dist = hw > 0.5 ? Math.abs(x - xc) * kk : 1e9;
        const edge = hw * (0.88 + 0.24 * MID[i]);
        if (dist < edge) {
          // river: dark murky water, current streaks, lighter rim at the waterline
          cls[o] = K_WATER;
          let t = 0.3 + (1 - dist / edge) * 0.25 + (g - 0.5) * 0.06;
          const ph = (wy * 0.21 + (x - xc) * 0.9 + MID[i] * 4) % 9;
          if (ph < 1 && dist < edge - 2) t += 0.22;
          if (dist > edge - 1.5) t = 0.85;
          col = tone(WATER, t, d);
        } else if (dist < edge + 4) {
          cls[o] = K_BANK;
          const t = 0.25 + (dist - edge) * 0.12 + (g - 0.5) * 0.12 + (MID[i] - 0.5) * 0.3;
          col = tone(MUD, t, d);
        } else {
          // clearing ground: grass with dirt patches
          cls[o] = K_GROUND;
          const m = MID[i];
          if (m < 0.36 + DET[i] * 0.1) col = tone(DIRT, 0.35 + (m - 0.3) * 1.5 + (g - 0.5) * 0.2, d);
          else col = tone(GRASS, 0.42 + (DET[i] - 0.5) * 0.7 + (g - 0.5) * 0.2, d);
        }
        // canopy cast shadow and contact occlusion around crowns
        if (H[i - sh] > 0 || H[i - sh2] > 0) col = shade(col, 120, 128, 150, 8);
        else if (H[i - 1] > 0 || H[i - S] > 0) col = shade(col, 170, 176, 190, 4);
      }
      px[o] = col;
    }
  }
}

/** Jungle chunk plan: fields, crown list, crown splats, main pass, temples, doodads. */
export function planJungle(c: Chunk): Step[] {
  const s = c.seed, W = c.w, M = c.M;
  let DET!: Float32Array;
  let k!: Ctx;
  return [
    once(() => { DET = lattice(c, 3, s + 5, M, 1.5); }),
    once(() => {
      const MID = lattice(c, 10, s + 6, 2);
      const G = grain(c, s + 7, 0);
      const flow = new Meander(W, s + 20, {
        amp: W * 0.3, wave: 280, wave2: 75, amp2: 16, width: 15, widthVar: 6, widthWave: 160,
        gateWave: 1300, gateLo: 0.33, gateHi: 0.4,
      }, valueNoise);
      const river = flow.rows(c);
      const ruins = sites(c, 640, 611, 0.45, 70, 60);
      ensureSite(c, ruins);
      const H = c.f32(c.N), ID = c.f32(c.N);
      H.fill(0, 0, c.N);
      k = {
        c, DET, MID, G, H, ID, cls: c.u8(W * CH), xc: river.xc, hw: river.hw, sl: river.slope, flow, ruins,
        DL: c.f32(16384 * DSTRIDE), nd: 0,
      };
    }),
    range(() => crownRowCount(c, 0), 3, (a, b) => crownRows(k, 0, a, b)),
    range(() => crownRowCount(c, 1), 2, (a, b) => crownRows(k, 1, a, b)),
    range(() => k.nd, 96, (a, b) => splatDomes(c, k.H, k.ID, k.DET, k.DL, a, b)),
    range(CH, 4, (a, b) => paintRows(k, a, b)),
    once(() => {
      for (let q = 0; q < k.ruins.length; q++) paintTemple(c, k.cls, k.ruins[q], k.MID, k.G);
      placeJungleDoodads(c, k.cls, k.H, k.ruins);
    }),
  ];
}

const STONE = rampN(6, 0x2a2a22, 0x3c3c30, 0x4e4e3e, 0x62604c, 0x76735c, 0x88846a);
const MOSS = rampN(4, 0x1e3018, 0x2a401e, 0x385226, 0x48622e);

/** Overgrown stepped stone platform under a ruin site (the dd_jungle_ruin sprite sits on top). */
function paintTemple(c: Chunk, cls: Uint8Array, st: Site, MID: Float32Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const half = 26 + Math.floor(st.h3 * 8);
  const cr = Math.round(st.r), cx = Math.round(st.wx);
  for (let r = Math.max(0, cr - half - 2); r <= Math.min(CH - 1, cr + half + 5); r++) {
    const wy = c.wy0 - r;
    for (let x = Math.max(0, cx - half - 2); x <= Math.min(W - 1, cx + half + 5); x++) {
      const o = r * W + x, i = (r + M) * S + x + M;
      if (cls[o] === K_CANOPY || cls[o] === K_WATER) continue;
      const lx = x - cx, ly = r - cr;
      const ring = Math.max(Math.abs(lx), Math.abs(ly));
      const d = bayer4(x, wy), g = G[i];
      if (ring <= half) {
        cls[o] = K_RUIN;
        const step = Math.floor((half - ring) / 5);
        const edge = (half - ring) % 5;
        let t = 0.42 + step * 0.06 + (g - 0.5) * 0.14;
        if (edge === 0) t = lx + ly < 0 ? 0.95 : 0.18;              // step lips: lit NW, dark SE
        else if ((((lx + 64) >> 2) + ((ly + 64) >> 2)) % 3 === 0 && edge > 1) t -= 0.1;
        const moss = MID[i] + (g - 0.5) * 0.2 > 0.6;
        px[o] = moss && edge !== 0 ? tone(MOSS, t, d) : tone(STONE, t, d);
      } else if (Math.max(Math.abs(lx - 4), Math.abs(ly - 4)) <= half) {
        px[o] = shade(px[o], 130, 136, 156, 6); // platform cast shadow
      }
    }
  }
}

/** Trees and ferns along clearings and banks, flowers in clearings, ruins on temple sites. */
function placeJungleDoodads(c: Chunk, cls: Uint8Array, H: Float32Array, ruins: Site[]): void {
  const W = c.w, M = c.M, S = c.S;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  for (let k = 0; k < ruins.length; k++) c.add('dd_jungle_ruin', ruins[k].wx, ruins[k].r);
  eachCell(c, 40, 701, (x, r, h1, h2) => {
    const kind = at(x, r);
    if (kind === K_GROUND && farFromDoodads(c, x, r, 20)) {
      const nearCanopy = at(x - 10, r) === K_CANOPY || at(x + 10, r) === K_CANOPY || at(x, r - 10) === K_CANOPY || at(x, r + 10) === K_CANOPY;
      if (nearCanopy && h1 < 0.3) c.add(h2 < 0.35 ? 'dd_tree_big' : 'dd_tree_small', x, r, h2 < 0.5);
      else if (h1 < 0.24) c.add('dd_fern', x, r, h2 < 0.5, 0.85 + h2 * 0.3);
      else if (h1 < 0.34) c.add('dd_flower', x, r, h2 < 0.5);
    } else if (kind === K_BANK && h1 < 0.3 && farFromDoodads(c, x, r, 18)) {
      c.add('dd_fern', x, r, h2 < 0.5, 0.8);
    } else if (kind === K_CANOPY && h1 < 0.16 && farFromDoodads(c, x, r, 30)) {
      const i = (Math.round(r) + M) * S + Math.round(x) + M;
      if (H[i] > 9) c.add('dd_tree_big', x, r, h2 < 0.5);
    }
  });
}
