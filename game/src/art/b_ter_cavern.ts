// CAVERN terrain painter: a canyon-like cave — rugged raised rock walls encroaching from both
// sides (lit rims, south cliff faces, deep cast shadows), occasional rock pillars, a dark
// brown rocky floor with pebbles, cracks and puddles, glowing crystal patches and organic
// egg-pod biomass.
import { fbm, hash2, valueNoise } from './noise';
import {
  CH, Chunk, field, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, sites, Site,
  Voronoi, mixPacked, ensureSite, once, range, type Step,
} from './b_ter_core';

const WALL = rampN(8, 0x150f0e, 0x221814, 0x30221b, 0x3e2c22, 0x4e382a, 0x5e4533, 0x6e533d, 0x806248);
const FACE = rampN(6, 0x0e0909, 0x170f0d, 0x211612, 0x2c1e17, 0x38271d, 0x443024);
const FLOOR = rampN(8, 0x0e0b0c, 0x161112, 0x1f1716, 0x291e1b, 0x342720, 0x403027, 0x4c3a2e, 0x584435);
const POOL = rampN(4, 0x080a10, 0x0e121a, 0x151b26, 0x1e2632);
const GLOW_C = rampN(6, 0x0e1a22, 0x123040, 0x18485c, 0x206474, 0x2c8494, 0x46a8b4);
const GLOW_V = rampN(6, 0x1a1024, 0x2a1640, 0x3c205c, 0x522c78, 0x6a3c92, 0x8a54ac);
const FLESH = rampN(7, 0x1a0a14, 0x2c1020, 0x40182e, 0x56223c, 0x6c2e4a, 0x823c58, 0x985068);

const K_FLOOR = 0, K_WALL = 1, K_FACE = 2, K_CRYSTAL = 3, K_FLESH = 4, K_POOL = 5;
const FACE_H = 7, SHADOW = 9;

/** Wall boundary depth (px) from one side at world y: always leaves a central corridor. */
function wallDepth(wy: number, w: number, seed: number): number {
  const base = 0.05 + 0.15 * valueNoise(wy / 210, 1.3, seed) + 0.05 * valueNoise(wy / 70, 4.1, seed);
  const pinch = valueNoise(wy / 520, 7.7, seed);
  return w * (base + (pinch > 0.62 ? (pinch - 0.62) * 0.5 : 0));
}

/** Per-chunk state shared by the cavern steps. */
interface Ctx {
  c: Chunk; R: Float32Array; ROUGH: Float32Array; DET: Float32Array; PIL: Float32Array; MID: Float32Array;
  BIG: Float32Array; G: Float32Array; cls: Uint8Array; since: Int16Array; vor: Voronoi; crystals: Site[]; nests: Site[];
}

/** Cavern chunk plan: fields, rock field, main pass, crystal glows, nests, doodads. */
export function planCavern(c: Chunk): Step[] {
  const s = c.seed, W = c.w, rows = CH + 2 * c.M;
  let ROUGH!: Float32Array, DET!: Float32Array, PIL!: Float32Array;
  let k!: Ctx;
  return [
    once(() => { ROUGH = lattice(c, 14, s + 3); }),
    once(() => { DET = lattice(c, 4, s + 4); }),
    once(() => { PIL = field(c, 8, (x, y) => fbm(x / 70, y / 80, s + 5, 3) + 0.3 * (valueNoise(x / 400, y / 500, s + 6) - 0.5)); }),
    once(() => {
      const MID = lattice(c, 9, s + 7, 1);
      const BIG = lattice(c, 40, s + 12, 1, 1.5);
      const crystals = sites(c, 300, 901, 0.75, 60, 40);
      const nests = sites(c, 420, 951, 0.6, 70, 50);
      ensureSite(c, crystals);
      ensureSite(c, nests);
      k = {
        c, R: c.f32(c.N), ROUGH, DET, PIL, MID, BIG, G: grain(c, s + 9, 1), cls: c.u8(W * CH),
        since: new Int16Array(W), vor: new Voronoi(c, 23, s + 31, 0.9, 4), crystals, nests,
      };
    }),
    range(rows, 16, (a, b) => rockRows(k, a, b)),
    once(() => seedSince(k)),
    range(CH, 4, (a, b) => paintRows(k, a, b)),
    range(CH, 16, (a, b) => {
      for (let q = 0; q < k.crystals.length; q++) paintGlow(k, k.crystals[q], a, b);
      for (let q = 0; q < k.nests.length; q++) paintNest(k, k.nests[q], a, b);
    }),
    once(() => placeCavernDoodads(c, k.cls, k.crystals, k.nests)),
  ];
}

/** Solid rock field (>0 = raised rock) for margin rows [a, b): side walls + rare pillars. */
function rockRows(k: Ctx, a: number, b: number): void {
  const { c, R, ROUGH, DET, PIL } = k;
  const W = c.w, M = c.M, S = c.S, s = c.seed;
  for (let rr = a; rr < b; rr++) {
    const wy = c.wy0 - (rr - M);
    const L = wallDepth(wy, W, s + 11), Rr = W - wallDepth(wy, W, s + 23);
    let i = rr * S;
    for (let xx = 0; xx < S; xx++, i++) {
      const x = xx - M;
      const rough = (ROUGH[i] - 0.5) * 30 + (DET[i] - 0.5) * 7;
      const side = Math.max(L - x, x - Rr) + rough;
      const pil = (PIL[i] - 0.69) * 160 + rough * 0.6;
      R[i] = side > pil ? side : pil;
    }
  }
}

/** Seeds the cliff-face counters through the top margin. */
function seedSince(k: Ctx): void {
  const { c, R, since } = k;
  const W = c.w, M = c.M, S = c.S;
  since.fill(99);
  for (let rr = 0; rr < M; rr++) {
    const o = rr * S + M;
    for (let x = 0; x < W; x++) since[x] = R[o + x] > 0 ? 0 : since[x] < 99 ? since[x] + 1 : 99;
  }
}

/** Main pass, rows [r0, r1) in order: boulder walls, south faces, floor with dust, rubble, puddles. */
function paintRows(k: Ctx, r0: number, r1: number): void {
  const { c, cls, R, ROUGH, DET, MID, BIG, G, since, vor } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const sh = SHADOW * S + SHADOW, sh2 = 4 * S + 4;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const v = R[i];
      const s1 = v > 0 ? 0 : since[x] < 99 ? since[x] + 1 : 99;
      since[x] = s1;
      let col: number;
      if (v > 0) {
        // raised rock top: chunky boulders (Voronoi) lit from the top-left, large ridges and
        // gullies, dark crevices, lit north-west rim and dark south-east rim
        cls[o] = K_WALL;
        vor.qx = x + (DET[i] - 0.5) * 6;
        vor.qy = wy + (ROUGH[i] - 0.5) * 6;
        vor.run();
        const rad = vor.f1 + 4;
        const light = (vor.dy - vor.dx) / rad;
        let t = 0.4 + light * 0.28 + (vor.id - 0.5) * 0.24 + (DET[i + S + 1] - DET[i - S - 1]) * 1.6 + (g - 0.5) * 0.1;
        t += (BIG[i + S + 1] - BIG[i - S - 1]) * 7 + (BIG[i] - 0.5) * 0.24;
        t += (v > 40 ? 40 : v) * 0.004 - vor.f1 * 0.008;
        const gap = vor.f2 - vor.f1;
        if (gap < 1.4) t = 0.06 + (g - 0.5) * 0.06;
        else if (gap < 2.6) t += light > 0 ? 0.14 : -0.12;
        if (R[i - S - 1] <= 0 || R[i - 1] <= 0 || R[i - S] <= 0) t = 0.9 + (g - 0.5) * 0.1;
        else if (R[i + 1] <= 0) t -= 0.25;
        col = tone(WALL, t, d);
      } else if (s1 <= FACE_H) {
        // south-facing cliff face: vertical streaks, darker toward the foot
        cls[o] = K_FACE;
        let t = 0.85 - s1 * 0.1 + (DET[i] - 0.5) * 0.3 + (g - 0.5) * 0.12;
        if (((x * 7 + ((MID[i] * 9) | 0)) % 5) === 0) t -= 0.18;
        if (s1 === 1) t += 0.1;
        col = tone(FACE, t, d);
        if (s1 > 3 && R[i - sh] > 0) col = shade(col, 150, 150, 170, 4);
      } else {
        // cave floor: dust drifts, rubble patches with pebbles, cracks, dark puddles,
        // darker toward the walls (ambient occlusion)
        cls[o] = K_FLOOR;
        const m = MID[i], b = BIG[i];
        let t = 0.42 + (DET[i] - 0.5) * 0.2 + (m - 0.5) * 0.3 + (ROUGH[i] - 0.5) * 0.22 + (g - 0.5) * 0.12
          + (MID[i + S + 1] - MID[i - S - 1]) * 2 + (b - 0.5) * 0.3;
        const occ = v > -16 ? (v + 16) / 16 : 0;
        t -= occ * 0.32;
        const cr = m - 0.5;
        if (cr > -0.012 && cr < 0.012) t -= 0.28;
        const rubble = ROUGH[i] > 0.6 ? 0.94 : 0.984;
        if (g > rubble) t += 0.36;                              // pebble
        else if (G[i - S - 1] > rubble) t -= 0.3;               // its shadow
        if (m < 0.2 && ROUGH[i] < 0.42) {
          cls[o] = K_POOL;
          col = tone(POOL, 0.35 + (0.2 - m) * 2.5 + (g > 0.97 ? 0.4 : 0), d);
        } else col = tone(FLOOR, t, d);
        if (R[i - sh] > 0 || R[i - sh2] > 0) col = shade(col, 132, 132, 160, 6);
      }
      px[o] = col;
    }
  }
}

/** Crystal patch, rows [r0, r1): dithered cyan or violet glow on the floor around a crystal cluster. */
function paintGlow(k: Ctx, st: Site, r0: number, r1: number): void {
  const { c, cls, DET, G } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const R = 26 + st.h3 * 14, ramp = st.h4 < 0.55 ? GLOW_C : GLOW_V;
  for (let r = Math.max(r0, Math.floor(st.r - R)); r <= Math.min(r1 - 1, Math.ceil(st.r + R)); r++) {
    const wy = c.wy0 - r;
    for (let x = Math.max(0, Math.floor(st.wx - R)); x <= Math.min(W - 1, Math.ceil(st.wx + R)); x++) {
      const o = r * W + x;
      if (cls[o] !== K_FLOOR && cls[o] !== K_POOL) continue;
      const i = (r + M) * S + x + M;
      const dx = x - st.wx, dy = r - st.r;
      const q = Math.sqrt(dx * dx + dy * dy) / R + (DET[i] - 0.5) * 0.25;
      if (q >= 1) continue;
      const k = (1 - q) * (1 - q);
      const lvl = Math.floor(k * 4 + bayer4(x, wy)) / 4;       // dithered glow strength
      if (lvl <= 0) continue;
      if (k > 0.2) cls[o] = K_CRYSTAL;
      px[o] = mixPacked(px[o], tone(ramp, 0.25 + k * 0.75 + (G[i] > 0.97 ? 0.25 : 0), 0.5), lvl * 0.85);
    }
  }
}

/** Organic nest, rows [r0, r1): fleshy membrane with veins and glossy blisters (egg pods on top). */
function paintNest(k: Ctx, st: Site, r0: number, r1: number): void {
  const { c, cls, DET, MID, G } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const R = 26 + st.h3 * 14;
  for (let r = Math.max(r0, Math.floor(st.r - R)); r <= Math.min(r1 - 1, Math.ceil(st.r + R)); r++) {
    const wy = c.wy0 - r;
    for (let x = Math.max(0, Math.floor(st.wx - R)); x <= Math.min(W - 1, Math.ceil(st.wx + R)); x++) {
      const o = r * W + x;
      if (cls[o] !== K_FLOOR && cls[o] !== K_POOL) continue;
      const i = (r + M) * S + x + M;
      const dx = x - st.wx, dy = r - st.r;
      const q = Math.sqrt(dx * dx + dy * dy) / R + (MID[i] - 0.5) * 0.5;
      if (q >= 1) continue;
      const d = bayer4(x, wy), g = G[i];
      if (q > 0.8 && d > (1 - q) * 5) continue;
      cls[o] = K_FLESH;
      let t = 0.3 + (1 - q) * 0.3 + (DET[i + S + 1] - DET[i - S - 1]) * 2.4 + (g - 0.5) * 0.1;
      const v = DET[i] - 0.5;
      if (v > -0.035 && v < 0.035) t += 0.34;                    // veins
      else if (v > 0.035 && v < 0.06) t -= 0.12;
      if (MID[i] > 0.64 && DET[i] > 0.58) t += 0.3;              // glossy blisters
      px[o] = tone(FLESH, t, d);
    }
  }
}

/** Crystals on glow patches, egg pods on nests, stalagmites near walls, boulders on the floor. */
function placeCavernDoodads(c: Chunk, cls: Uint8Array, crystals: Site[], nests: Site[]): void {
  const W = c.w, s = c.seed;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  for (let k = 0; k < crystals.length; k++) {
    const st = crystals[k];
    if (at(st.wx, st.r) === K_CRYSTAL) c.add('dd_crystal', st.wx, st.r, st.h1 < 0.5, 1);
    const n = 1 + Math.floor(st.h2 * 3);
    for (let j = 0; j < n; j++) {
      const a = hash2(j, k, s + 3) * 6.283, d = 10 + hash2(j, k, s + 4) * 10;
      const x = st.wx + Math.cos(a) * d, r = st.r + Math.sin(a) * d;
      if (at(x, r) === K_CRYSTAL || at(x, r) === K_FLOOR) c.add('dd_crystal', x, r, j % 2 === 0, 0.6 + hash2(j, k, s + 5) * 0.3);
    }
  }
  for (let k = 0; k < nests.length; k++) {
    const st = nests[k];
    const n = 2 + Math.floor(st.h2 * 3);
    for (let j = 0; j < n; j++) {
      const a = hash2(j, k, s + 6) * 6.283, d = j === 0 ? 0 : 8 + hash2(j, k, s + 7) * 12;
      const x = st.wx + Math.cos(a) * d, r = st.r + Math.sin(a) * d;
      if (at(x, r) === K_FLESH && farFromDoodads(c, x, r, 10)) c.add('dd_egg_pod', x, r, j % 2 === 1, 0.75 + hash2(j, k, s + 8) * 0.35);
    }
  }
  eachCell(c, 40, 931, (x, r, h1, h2) => {
    const kind = at(x, r);
    if (kind !== K_FLOOR || !farFromDoodads(c, x, r, 20)) return;
    const nearWall = at(x - 14, r) === K_WALL || at(x + 14, r) === K_WALL || at(x, r - 14) === K_FACE || at(x, r - 14) === K_WALL;
    if (nearWall && h1 < 0.5) c.add('dd_stalagmite', x, r, h2 < 0.5, 0.8 + h2 * 0.4);
    else if (h1 < 0.14) c.add('dd_boulder', x, r, h2 < 0.5, 0.7 + h2 * 0.4);
  });
}
