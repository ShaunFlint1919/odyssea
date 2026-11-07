// DESERT terrain painter: wind-rippled dunes, red sandstone mesas with cliff faces and cast
// shadows, dry cracked riverbeds, oases with palms and half-buried ancient ruins.
// Structure (a plan of incremental steps): noise fields, mesa carving, one lean row-sliced main
// pass (sand / mesa / cliff / shadows) and row-sliced feature passes limited to their bounding
// boxes (riverbed, oases, ruins) — keeps every hot loop small and type-stable.
import { fbm, hash2, valueNoise } from './noise';
import {
  CH, Chunk, field, lattice, grain, sites, eachCell, Meander, farFromDoodads, rampN, tone, bayer4, lin, shade,
  list, ensureSite, Site, once, range, type Step,
} from './b_ter_core';

const ANG = 0.45, CA = Math.cos(ANG), SA = Math.sin(ANG);

// Sand ramps along a variation axis (dark -> light, 8 tones each).
const SAND = [
  rampN(8, 0x3a231e, 0x583826, 0x765032, 0x92663e, 0xa8794a, 0xba8b58),
  rampN(8, 0x3c2620, 0x5c3c29, 0x7a5535, 0x956b42, 0xaa7f4f, 0xbc915e),
  rampN(8, 0x3e2a22, 0x5e422d, 0x7b5a39, 0x957045, 0xa98352, 0xba9562),
];
const ROCK = rampN(7, 0x2a1617, 0x43251f, 0x5c3327, 0x744231, 0x89533b, 0x9d6647, 0xb07a55);
const CLIFF = rampN(6, 0x1c0f15, 0x2a161a, 0x3a1f1f, 0x4a2924, 0x5b342a, 0x6b4131);
const BED = rampN(6, 0x35271f, 0x473427, 0x58422f, 0x674e37, 0x755a40, 0x826549);
const WATER = rampN(6, 0x0c2230, 0x112d3c, 0x173a48, 0x1e4856, 0x285a66, 0x346c74);
const GRASS = rampN(6, 0x1c2614, 0x273418, 0x33441c, 0x415622, 0x50662a, 0x607432);
const STONE = rampN(6, 0x38302b, 0x4b4239, 0x5e5449, 0x726657, 0x857866, 0x978975);
const LIME = rampN(7, 0x3a2c24, 0x523f31, 0x6a543f, 0x806a4f, 0x957d5e, 0xa89070, 0xb9a282);
const MORTAR = rampN(3, 0x2a1e18, 0x36281f, 0x423226);

const T1 = 0.6;    // mesa threshold
const T2 = 0.69;   // second terrace
const CLIFF_H = 6, CLIFF_H2 = 3, SHADOW = 8;
const OASIS_R0 = 24, OASIS_RV = 14;
// classification codes (for doodad placement)
const K_SAND = 0, K_MESA = 1, K_CLIFF = 2, K_BED = 3, K_WATER = 4, K_GRASS = 5, K_FLOOR = 6, K_WALL = 7;

class Ruin {
  constructor(readonly x0: number, readonly r0: number, readonly w: number, readonly h: number,
    readonly cx: number, readonly cy: number, readonly id: number, readonly walls: Uint8Array) {}
}

/** Builds the ruin of a site, shifted away from the riverbed (null if it cannot fit). */
function makeRuin(s: Site, c: Chunk, river: Meander): Ruin | null {
  const w = 64 + Math.floor(s.h3 * 44), h = 52 + Math.floor(s.h4 * 36);
  let x0 = Math.round(Math.max(6, Math.min(c.w - w - 6, s.wx - w / 2))) | 0;
  const wyHi = s.wy + h / 2 + 6, wyLo = s.wy - h / 2 - 6;
  if (river.hits(x0, x0 + w, wyLo, wyHi, 10)) {
    const xr = river.xc(s.wy), hr = river.hw(s.wy) + 12;
    const left = Math.round(xr - hr - w), right = Math.round(xr + hr);
    if (left >= 6 && !river.hits(left, left + w, wyLo, wyHi, 10)) x0 = left;
    else if (right + w <= c.w - 6 && !river.hits(right, right + w, wyLo, wyHi, 10)) x0 = right;
    else return null;
  }
  const id = Math.floor(s.wy) | 0;
  const cx = Math.round(w * (0.35 + 0.25 * hash2(id, 1, c.seed))) | 0;
  const cy = Math.round(h * (0.38 + 0.25 * hash2(id, 2, c.seed))) | 0;
  const broken = 0.28 + 0.2 * hash2(id, 3, c.seed);
  // wall bitmap: outer walls + one inner cross wall pair, broken into 16 px segments
  const walls = new Uint8Array(w * h);
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      let seg: number;
      if (lx < 4) seg = 1 + (ly >> 4);
      else if (lx >= w - 4) seg = 40 + (ly >> 4);
      else if (ly < 4) seg = 80 + (lx >> 4);
      else if (ly >= h - 4) seg = 120 + (lx >> 4);
      else if (lx >= cx && lx < cx + 4 && ly < cy + 4) seg = 160 + (ly >> 4);
      else if (ly >= cy && ly < cy + 4) seg = 200 + (lx >> 4);
      else continue;
      if (hash2(seg, id, c.seed + 991) > broken) walls[ly * w + lx] = 1;
    }
  }
  return new Ruin(x0, (Math.round(s.r - h / 2) | 0), w, h, cx, cy, id, walls);
}

/** True if the ruin has a standing wall pixel at local coords (lx, ly). */
function wallAt(R: Ruin, lx: number, ly: number): boolean {
  return lx >= 0 && ly >= 0 && lx < R.w && ly < R.h && R.walls[ly * R.w + lx] === 1;
}

/** Per-chunk state shared by the desert steps (built once all fields exist). */
interface Ctx {
  c: Chunk; P: Float32Array; MID: Float32Array; DET: Float32Array; G: Float32Array; N: Float32Array; RM: Float32Array;
  cls: Uint8Array; since: Int16Array; since2: Int16Array;
  xc: Float32Array; hw: Float32Array; sl: Float32Array; oases: Site[]; ruins: Ruin[];
}

/** Applies the mesa cast shadow to an already chosen colour when a mesa occludes the light. */
function mesaShadow(P: Float32Array, i: number, S: number, col: number): number {
  return P[i - SHADOW * S - SHADOW] > T1 || P[i - (SHADOW >> 1) * (S + 1)] > T1 ? shade(col, 142, 140, 172, 10) : col;
}

/** Seeds the cliff counters (rows since the last mesa row above) through the top margin. */
function seedSince(k: Ctx): void {
  const { c, P, since, since2 } = k;
  const W = c.w, M = c.M, S = c.S;
  since.fill(99);
  since2.fill(99);
  for (let rr = 0; rr < M; rr++) {
    const o = rr * S + M;
    for (let x = 0; x < W; x++) {
      const p = P[o + x];
      since[x] = p > T1 ? 0 : since[x] < 99 ? since[x] + 1 : 99;
      since2[x] = p > T2 ? 0 : since2[x] < 99 ? since2[x] + 1 : 99;
    }
  }
}

/** Main pass, rows [r0, r1) in order: dunes with wind ripples, mesas with terraces, cliff faces, shadows. */
function paintBaseRows(k: Ctx, r0: number, r1: number): void {
  const { c, P, MID, DET, G, N, RM, cls, since, since2 } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const sh = SHADOW * S + SHADOW, sh2 = (SHADOW >> 1) * S + (SHADOW >> 1);
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M;
    let o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy);
      const g = G[i];
      const p = P[i];
      const s1 = p > T1 ? 0 : since[x] < 99 ? since[x] + 1 : 99;
      const s2 = p > T2 ? 0 : since2[x] < 99 ? since2[x] + 1 : 99;
      since[x] = s1; since2[x] = s2;
      let col: number;
      let kind = K_SAND;
      if (p > T1) {
        // mesa top: flat sandstone with eroded strata rings and cracks
        kind = K_MESA;
        const lvl2 = p > T2;
        const T = lvl2 ? T2 : T1;
        const band = (p - T) * 46;
        let t = 0.5 + (lvl2 ? 0.1 : 0) + (DET[i] - 0.5) * 0.16 + (g - 0.5) * 0.12 + (P[i + S + 1] - P[i - S - 1]) * 5;
        if (band - Math.floor(band) < 0.16 && band < 2.5) t -= 0.18;
        if (P[i - S - 1] <= T || P[i - 1] <= T || P[i - S] <= T) t = 0.92 + (g - 0.5) * 0.1;
        else if (P[i + S + 1] <= T || P[i + 1] <= T) t -= 0.2;
        const m = MID[i] - 0.5;
        if (m > -0.018 && m < 0.018) t -= 0.34;
        else if (m >= 0.018 && m < 0.034) t += 0.12;
        let sha = false;
        if (!lvl2 && s2 <= CLIFF_H2) t = 0.2 - s2 * 0.03 + (g - 0.5) * 0.08;
        else if (!lvl2 && P[i - sh2] > T2) sha = true;
        col = tone(ROCK, t, d);
        if (sha) col = shade(col, 142, 140, 172, 10);
      } else if (s1 <= CLIFF_H) {
        // cliff face below a mesa edge: horizontal strata, darker toward the foot
        kind = K_CLIFF;
        const strata = ((wy + ((MID[i] * 3) | 0)) % 3 === 0) ? -0.14 : 0.04;
        let t = 0.8 - s1 * 0.1 + strata + (g - 0.5) * 0.12 + (DET[i] - 0.5) * 0.16;
        if (s1 === 1) t += 0.12;
        col = tone(CLIFF, t, d);
        if (s1 > 3 && P[i - sh] > T1) col = shade(col, 142, 140, 172, 10);
      } else {
        // sand dunes: ridged crests (lit windward / dark lee side) + wind ripples
        const n = N[i];
        const D = 1 - Math.abs(2 * n - 1);
        const dtl = 1 - Math.abs(2 * N[i - S - 1] - 1), dbr = 1 - Math.abs(2 * N[i + S + 1] - 1);
        let slope = (dbr - dtl) * 16;
        slope = slope > 0.3 ? 0.3 : slope < -0.34 ? -0.34 : slope;
        const ph = (x * SA + wy * CA) / 4.4 + MID[i] * 2.6;
        const f = ph - Math.floor(ph);
        const ripple = f < 0.2 ? 0.13 : f > 0.55 && f < 0.75 ? -0.15 : 0;
        const as = slope < 0 ? -slope : slope;
        const am = lin(0.3, 0.55, RM[i]) * (as < 0.12 ? 1 : as > 0.28 ? 0 : (0.28 - as) * 6.25);
        const t = 0.52 + slope + ripple * am + (D - 0.5) * 0.12 + (g - 0.5) * 0.06;
        const vi = (p - 0.25) * 7 + d * 0.9;
        col = tone(SAND[vi < 1 ? 0 : vi < 2 ? 1 : 2], t, d);
        if (P[i - sh] > T1 || P[i - sh2] > T1) col = shade(col, 142, 140, 172, 10);
      }
      px[o] = col;
      cls[o] = kind;
    }
  }
}

/** Dune slope light at a pixel (used by feature passes to blend into the dunes). */
function sandSlope(N: Float32Array, i: number, S: number): number {
  const dtl = 1 - Math.abs(2 * N[i - S - 1] - 1), dbr = 1 - Math.abs(2 * N[i + S + 1] - 1);
  const s = (dbr - dtl) * 16;
  return s > 0.3 ? 0.3 : s < -0.34 ? -0.34 : s;
}

/** Dry riverbed pass, rows [r0, r1): cracked clay, pebbles, lit west bank / dark east bank. */
function paintRiverRows(k: Ctx, r0: number, r1: number): void {
  const { c, P, MID, DET, G, cls, xc, hw, sl } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  for (let r = r0; r < r1; r++) {
    const rr = r + M, h = hw[rr];
    if (h < 0.5) continue;
    const cx = xc[rr], kk = 1 / Math.sqrt(1 + sl[rr] * sl[rr]);
    const xa = Math.max(0, Math.floor(cx - (h * 1.2 + 4) / kk)), xb = Math.min(W - 1, Math.ceil(cx + (h * 1.2 + 4) / kk));
    const wy = c.wy0 - r;
    for (let x = xa; x <= xb; x++) {
      const i = rr * S + x + M, o = r * W + x;
      if (cls[o] !== K_SAND) continue;
      const dist = Math.abs(x - cx) * kk;
      const edge = h * (0.84 + 0.3 * MID[i]);
      if (dist >= edge + 2) continue;
      const d = bayer4(x, wy), g = G[i];
      let col: number;
      if (dist < edge - 2) {
        cls[o] = K_BED;
        let t = 0.56 + (1 - dist / edge) * 0.14 + (DET[i] - 0.5) * 0.14 + (g - 0.5) * 0.08;
        const a = DET[i] - 0.5, b = MID[i] - 0.5;
        if ((a > -0.03 && a < 0.03) || (b > -0.017 && b < 0.017)) t = 0.1;
        else if ((a >= 0.03 && a < 0.05) || (b >= 0.017 && b < 0.03)) t += 0.14;
        if (g > 0.982) col = tone(STONE, 0.78, d);
        else if (g < 0.014) col = tone(STONE, 0.4, d);
        else col = tone(BED, t, d);
      } else {
        const t = x < cx ? 0.2 + (g - 0.5) * 0.1 : 0.78 + (g - 0.5) * 0.1;
        const vi = (P[i] - 0.25) * 7 + d * 0.9;
        col = tone(SAND[vi < 1 ? 0 : vi < 2 ? 1 : 2], t, d);
      }
      px[o] = mesaShadow(P, i, S, col);
    }
  }
}

/** Oasis pass, rows [r0, r1): water pool with a bright shallow rim, wet mud ring, sparse grass ring. */
function paintOasisRows(k: Ctx, O: Site, r0: number, r1: number): void {
  const { c, P, MID, DET, G, N, cls } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const R = OASIS_R0 + O.h3 * OASIS_RV, ext = 1.6 * R;
  const ra = Math.max(r0, Math.floor(O.r - ext)), rb = Math.min(r1 - 1, Math.ceil(O.r + ext));
  const xa = Math.max(0, Math.floor(O.wx - ext)), xb = Math.min(W - 1, Math.ceil(O.wx + ext));
  for (let r = ra; r <= rb; r++) {
    const wy = c.wy0 - r, dy = (r - O.r) * 1.15;
    for (let x = xa; x <= xb; x++) {
      const i = (r + M) * S + x + M, o = r * W + x;
      const kind = cls[o];
      if (kind === K_MESA || kind === K_CLIFF) continue;
      const dx = x - O.wx;
      const q = Math.sqrt(dx * dx + dy * dy) / R + (MID[i] - 0.5) * 0.32 + (DET[i] - 0.5) * 0.08;
      if (q >= 1.5) continue;
      const d = bayer4(x, wy), g = G[i];
      let col: number;
      if (q < 0.62) {
        cls[o] = K_WATER;
        let t = 0.15 + q * 0.6 + (g - 0.5) * 0.06;
        const wv = (x * 0.45 + wy * 0.9 + MID[i] * 6) % 7;
        if (wv < 0.9 && q < 0.5 && DET[i] > 0.45) t += 0.32;
        if (q > 0.56) t = q > 0.595 ? 1 : 0.82;
        col = tone(WATER, t, d);
      } else if (q < 0.74) {
        cls[o] = K_GRASS;
        col = tone(BED, 0.12 + (g - 0.5) * 0.1, d);
      } else {
        const dens = 1 - (q - 0.74) / 0.76;
        if (DET[i] * 0.6 + g * 0.4 >= dens * 0.95) continue;
        cls[o] = K_GRASS;
        col = tone(GRASS, 0.45 + (DET[i] - 0.5) * 0.6 + (g - 0.5) * 0.2 + sandSlope(N, i, S) * 0.5, d);
      }
      px[o] = mesaShadow(P, i, S, col);
    }
  }
}

/** Ruin pass, rows [r0, r1): limestone flagstones half buried in sand, broken walls, faces, shadows. */
function paintRuinRows(k: Ctx, R: Ruin, r0: number, r1: number): void {
  const { c, MID, DET, G, cls } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px, s = c.seed;
  const ra = Math.max(r0, R.r0 - 1), rb = Math.min(r1 - 1, R.r0 + R.h + 6);
  const xa = Math.max(0, R.x0 - 1), xb = Math.min(W - 1, R.x0 + R.w + 5);
  for (let r = ra; r <= rb; r++) {
    const wy = c.wy0 - r, ly = r - R.r0;
    for (let x = xa; x <= xb; x++) {
      const i = (r + M) * S + x + M, o = r * W + x;
      const kind = cls[o];
      if (kind === K_MESA || kind === K_CLIFF || kind === K_WATER) continue;
      const lx = x - R.x0;
      const d = bayer4(x, wy), g = G[i];
      let col = px[o];
      let shadow = false;
      if (wallAt(R, lx, ly)) {
        // wall top: lit top/left lip, dark bottom/right lip, block joints
        cls[o] = K_WALL;
        let t = 0.62 + (g - 0.5) * 0.12 + (DET[i] - 0.5) * 0.16;
        if (!wallAt(R, lx - 1, ly) || !wallAt(R, lx, ly - 1)) t = 0.97;
        else if (!wallAt(R, lx + 1, ly) || !wallAt(R, lx, ly + 1)) t = 0.42;
        else if (((lx * 3 + ly * 5) % 9) === 0) t -= 0.16;
        col = tone(LIME, t, d);
      } else if (wallAt(R, lx, ly - 1) || wallAt(R, lx, ly - 2) || wallAt(R, lx, ly - 3)) {
        // south-facing wall face: courses of blocks
        cls[o] = K_WALL;
        const face = wallAt(R, lx, ly - 1) ? 1 : wallAt(R, lx, ly - 2) ? 2 : 3;
        let t = 0.38 - face * 0.07 + (g - 0.5) * 0.08;
        if (((lx + face * 3) % 6) === 0) t -= 0.12;
        col = tone(LIME, t, d);
      } else {
        if (lx >= 0 && ly >= 0 && lx < R.w && ly < R.h) {
          const edgeD = Math.min(lx, ly, R.w - 1 - lx, R.h - 1 - ly);
          const cover = MID[i] * 0.75 + DET[i] * 0.25 + lin(14, 0, edgeD) * 0.35;
          if (cover < 0.56) {
            // flagstones 8x7 with staggered rows, worn edges, missing slabs
            const ty = (ly / 7) | 0, sx = lx + ((ty & 1) ? 4 : 0);
            const tx = (sx / 8) | 0, mx = sx % 8, my = ly % 7;
            const hs = hash2(tx, ty, R.id + s);
            if (hash2(tx, ty, R.id + s + 5) < 0.16 || cover > 0.53) {
              // missing slab / thin sand film: keep the sand
            } else {
              cls[o] = K_FLOOR;
              if (mx === 0 || my === 0) col = tone(MORTAR, 0.3 + g * 0.4, d);
              else {
                let t = 0.34 + hs * 0.3 + (g - 0.5) * 0.12 + (DET[i] - 0.5) * 0.12;
                if (mx === 1 || my === 1) t += 0.16;
                else if (mx === 7 || my === 6) t -= 0.1;
                col = tone(LIME, t, d);
              }
            }
          }
        }
        shadow = wallAt(R, lx - 3, ly - 4) || wallAt(R, lx - 2, ly - 4) || wallAt(R, lx - 4, ly - 4) || wallAt(R, lx - 3, ly - 3);
      }
      if (shadow) col = shade(col, 142, 140, 172, 10);
      px[o] = col;
    }
  }
}

/**
 * Mesa field adjustments for margin rows [rr0, rr1): rough edges, and no mesas in riverbeds,
 * oases or ruins.
 */
function carveRows(k: Ctx, rr0: number, rr1: number): void {
  const { c, P, MID, DET, xc: xcA, hw: hwA, sl: slA, oases, ruins } = k;
  const M = c.M, S = c.S;
  for (let rr = rr0; rr < rr1; rr++) {
    const xc = xcA[rr], hw = hwA[rr], kk = 1 / Math.sqrt(1 + slA[rr] * slA[rr]);
    let i = rr * S;
    for (let xx = 0; xx < S; xx++, i++) {
      let p = P[i] + (DET[i] - 0.5) * 0.03 + (MID[i] - 0.5) * 0.035;
      if (hw > 0.5) {
        const dd = Math.abs(xx - M - xc) * kk;
        if (dd < hw + 34) p -= 0.5 * lin(hw + 34, hw + 8, dd);
      }
      P[i] = p;
    }
    for (let o = 0; o < oases.length; o++) {
      const O = oases[o], R = 76;
      const dy = rr - M - O.r;
      if (dy <= -R || dy >= R) continue;
      const xa = Math.max(0, Math.floor(O.wx - R) + M), xb = Math.min(S, Math.ceil(O.wx + R) + M);
      for (let xx = xa; xx < xb; xx++) {
        const dx = xx - M - O.wx, q = dx * dx + dy * dy;
        if (q < R * R) P[rr * S + xx] -= 0.5 * lin(R * R, 44 * 44, q);
      }
    }
    for (let o = 0; o < ruins.length; o++) {
      const R = ruins[o];
      const r = rr - M;
      if (r < R.r0 - 44 || r >= R.r0 + R.h + 44) continue;
      const dy = Math.max(R.r0 - r, 0, r - (R.r0 + R.h));
      const xa = Math.max(0, R.x0 - 44 + M), xb = Math.min(S, R.x0 + R.w + 44 + M);
      for (let xx = xa; xx < xb; xx++) {
        const x = xx - M;
        const dx = Math.max(R.x0 - x, 0, x - (R.x0 + R.w));
        P[rr * S + xx] -= 0.5 * lin(44, 10, dx > dy ? dx : dy);
      }
    }
  }
}

/** Doodads: palms around oases, pillars and pyramids in ruins, rocks / cacti / bones on sand. */
function placeDoodads(c: Chunk, cls: Uint8Array, oases: Site[], ruins: Ruin[]): void {
  const W = c.w, s = c.seed;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  const clear = (x: number, r: number, rad: number, want: number) =>
    at(x, r) === want && at(x - rad, r) === want && at(x + rad, r) === want && at(x, r - rad) === want && at(x, r + rad) === want;
  for (let q = 0; q < oases.length; q++) {
    const O = oases[q];
    const R = OASIS_R0 + O.h3 * OASIS_RV;
    const n = 4 + Math.floor(O.h4 * 4);
    const id = Math.floor(O.wy);
    for (let j = 0; j < n; j++) {
      const a = O.h1 * 6.283 + j * (6.283 / n) + hash2(j, id, s) * 0.7;
      const rad = R * (0.92 + 0.4 * hash2(j, id, s + 1));
      const x = O.wx + Math.cos(a) * rad, r = O.r + (Math.sin(a) * rad) / 1.15;
      if (x > 4 && x < W - 4) c.add('dd_palm', x, r, hash2(j, id, s + 2) < 0.5, 0.85 + 0.3 * hash2(j, id, s + 3));
    }
  }
  for (let q = 0; q < ruins.length; q++) {
    const R = ruins[q];
    const corners = [1, 1, R.w - 2, 1, 1, R.h - 2, R.w - 2, R.h - 2, R.cx + 1, R.cy + 1];
    for (let j = 0; j < 5; j++) {
      if (hash2(j, R.id, s + 7) < 0.55) c.add('dd_ruin_pillar', R.x0 + corners[j * 2], R.r0 + corners[j * 2 + 1]);
    }
    if (hash2(R.id, 9, s) < 0.6) {
      const qx = R.x0 + (R.cx < R.w / 2 ? R.cx + (R.w - R.cx) / 2 : R.cx / 2);
      c.add('dd_ruin_pyramid', qx, R.r0 + R.cy + (R.h - R.cy) / 2 + 2);
    }
  }
  eachCell(c, 52, 501, (x, r, h1, h2) => {
    const kind = at(x, r);
    if (kind === K_SAND && clear(x, r, 8, K_SAND) && farFromDoodads(c, x, r, 26)) {
      if (h1 < 0.2) c.add('dd_dune_rock', x, r, h2 < 0.5, 0.8 + h2 * 0.4);
      else if (h1 < 0.28) c.add('dd_cactus', x, r, h2 < 0.5, 0.9 + h2 * 0.2);
      else if (h1 < 0.315) c.add('dd_bones', x, r, h2 < 0.5);
    } else if (kind === K_MESA && h1 < 0.14 && clear(x, r, 6, K_MESA) && farFromDoodads(c, x, r, 24)) {
      c.add('dd_dune_rock', x, r, h2 < 0.5, 0.7 + h2 * 0.3);
    } else if (kind === K_BED && h1 < 0.16 && farFromDoodads(c, x, r, 24)) {
      c.add('dd_bones', x, r, h2 < 0.5, 0.8);
    }
  });
}

/** Desert chunk plan: fields, mesa carving, main pass, riverbed, oases, ruins, doodads. */
export function planDesert(c: Chunk): Step[] {
  const s = c.seed, W = c.w, rows = CH + 2 * c.M;
  let N!: Float32Array, RM!: Float32Array, P!: Float32Array, MID!: Float32Array, DET!: Float32Array;
  let k!: Ctx;
  return [
    once(() => { N = field(c, 8, (x, y) => fbm((x * CA - y * SA) / 150, (x * SA + y * CA) / 60, s + 1, 2), 1); }),
    once(() => { RM = lattice(c, 48, s + 4, 0); }),
    once(() => { P = field(c, 8, (x, y) => fbm(x / 110, y / 110, s + 5, 3) + 0.22 * (valueNoise(x / 700, y / 600, s + 6) - 0.5)); }),
    once(() => { MID = lattice(c, 12, s + 8); }),
    once(() => { DET = lattice(c, 4, s + 9); }),
    once(() => {
      const G = grain(c, s + 13, 0);
      const wadi = new Meander(W, s + 20, {
        amp: W * 0.24, wave: 230, wave2: 70, amp2: 20, width: 20, widthVar: 6, widthWave: 130,
        gateWave: 1000, gateLo: 0.42, gateHi: 0.5,
      }, valueNoise);
      const river = wadi.rows(c);
      const oases = sites(c, 560, 301, 0.6, 110, 60);
      const ruinSites = sites(c, 760, 401, 0.5, 140, 60);
      ensureSite(c, oases);
      ensureSite(c, ruinSites);
      const ruins = list<Ruin>();
      for (let q = 0; q < ruinSites.length; q++) {
        const R = makeRuin(ruinSites[q], c, wadi);
        if (R) ruins.push(R);
      }
      k = {
        c, P, MID, DET, G, N, RM, cls: c.u8(W * CH), since: new Int16Array(W), since2: new Int16Array(W),
        xc: river.xc, hw: river.hw, sl: river.slope, oases, ruins,
      };
    }),
    range(rows, 16, (a, b) => carveRows(k, a, b)),
    once(() => seedSince(k)),
    range(CH, 4, (a, b) => paintBaseRows(k, a, b)),
    range(CH, 8, (a, b) => paintRiverRows(k, a, b)),
    range(CH, 8, (a, b) => {
      for (let o = 0; o < k.oases.length; o++) paintOasisRows(k, k.oases[o], a, b);
      for (let o = 0; o < k.ruins.length; o++) paintRuinRows(k, k.ruins[o], a, b);
    }),
    once(() => placeDoodads(c, k.cls, k.oases, k.ruins)),
  ];
}
