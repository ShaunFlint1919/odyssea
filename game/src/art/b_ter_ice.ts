// ICE terrain painter: wind-shaped snow fields (drifts + soft sastrugi), blue ice sheets with
// cracks and frozen bubbles, smooth frozen lakes with pressure cracks, dark rock outcrops with
// snow caps, south faces and bluish cast shadows, and thin crevasses.
import { fbm, valueNoise } from './noise';
import {
  CH, Chunk, field, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, scratchU8, sites, Site, Meander,
  ensureSite,
} from './b_ter_core';

// Snow is the brightest biome surface: kept mid-high value and low saturation so bullets pop.
const SNOW = rampN(8, 0x3e4a5e, 0x4e5c72, 0x5e6e86, 0x6e7f97, 0x7e90a6, 0x8ea0b4, 0x9eafc0, 0xadbdcc);
const ICE = rampN(8, 0x10223a, 0x172d4a, 0x1f3a5a, 0x284868, 0x325674, 0x3e6480, 0x4c728c, 0x5c8298);
const LAKE = rampN(6, 0x0c1a30, 0x11223c, 0x162b48, 0x1c3554, 0x24405e, 0x2e4c6a);
const ROCK = rampN(7, 0x111218, 0x1a1b23, 0x24252f, 0x2e303b, 0x3a3c48, 0x474956, 0x555866);
const FACE = rampN(5, 0x0c0d13, 0x13141c, 0x1b1c26, 0x242530, 0x2e2f3b);

const K_SNOW = 0, K_ICE = 1, K_LAKE = 2, K_ROCK = 3, K_FACE = 4, K_CRACK = 5;
const RT = 0.67, IT = 0.63, FACE_H = 5, SHADOW = 7;

/** Paints one ice chunk. */
export function paintIce(c: Chunk): void {
  const s = c.seed, W = c.w;
  const N = field(c, 8, (x, y) => fbm(x / 120, y / 90, s + 1, 2), 1);
  const P = field(c, 8, (x, y) => fbm(x / 150, y / 140, s + 2, 2) + 0.16 * (valueNoise(x / 600, y / 700, s + 9) - 0.5), 3);
  const R = field(c, 8, (x, y) => fbm(x / 70, y / 80, s + 3, 3) + 0.2 * (valueNoise(x / 500, y / 600, s + 4) - 0.5));
  const MID = lattice(c, 10, s + 5);
  const DET = lattice(c, 4, s + 6);
  const G = grain(c, s + 7, 1);
  const lakes = sites(c, 520, 1401, 0.55, 100, 70);
  ensureSite(c, lakes);
  const crev = new Meander(W, s + 30, {
    amp: W * 0.34, wave: 300, wave2: 60, amp2: 10, width: 2.4, widthVar: 1.2, widthWave: 90,
    gateWave: 500, gateLo: 0.62, gateHi: 0.66,
  }, valueNoise);
  const cr = crev.rows(c);
  const cls = scratchU8(W * CH);
  // rough rock field (margin included for faces / shadows)
  const M = c.M, S = c.S, rows = CH + 2 * M;
  for (let rr = 0; rr < rows; rr++) {
    let i = rr * S;
    for (let xx = 0; xx < S; xx++, i++) R[i] += (DET[i] - 0.5) * 0.05 + (MID[i] - 0.5) * 0.05;
  }
  paintGround(c, cls, N, P, R, MID, DET, G, cr.xc, cr.hw, cr.slope);
  for (let k = 0; k < lakes.length; k++) paintLake(c, cls, lakes[k], MID, DET, G);
  placeIceDoodads(c, cls, lakes);
}

/** Snow, ice sheets, rock outcrops (with faces and shadows) and crevasses. */
function paintGround(c: Chunk, cls: Uint8Array, N: Float32Array, P: Float32Array, R: Float32Array, MID: Float32Array,
  DET: Float32Array, G: Float32Array, xcA: Float32Array, hwA: Float32Array, slA: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const since = new Int16Array(W).fill(99);
  for (let rr = 0; rr < M; rr++) {
    const o = rr * S + M;
    for (let x = 0; x < W; x++) since[x] = R[o + x] > RT ? 0 : since[x] < 99 ? since[x] + 1 : 99;
  }
  const sh = SHADOW * S + SHADOW, sh2 = 3 * S + 3;
  for (let r = 0; r < CH; r++) {
    const rr = r + M, wy = c.wy0 - r;
    const xc = xcA[rr], hw = hwA[rr], kk = 1 / Math.sqrt(1 + slA[rr] * slA[rr]);
    let i = rr * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const rv = R[i];
      const s1 = rv > RT ? 0 : since[x] < 99 ? since[x] + 1 : 99;
      since[x] = s1;
      let col: number;
      let kind = K_SNOW;
      if (rv > RT) {
        // rock outcrop: snow caps on lit (north-west) slopes, dark crevices
        kind = K_ROCK;
        const big = (R[i + S + 1] - R[i - S - 1]) * 7;
        const slope = big + (DET[i + S + 1] - DET[i - S - 1]) * 1.2;
        let t = 0.42 + slope + (g - 0.5) * 0.12 + (rv - RT) * 1.2;
        const m = MID[i] - 0.5;
        if (m > -0.016 && m < 0.016) t -= 0.3;
        const capped = big + (MID[i] - 0.5) * 0.25 + (rv - RT) * 0.8 > 0.07;
        if (R[i - S - 1] <= RT || R[i - 1] <= RT || R[i - S] <= RT) col = tone(SNOW, 0.86 + (g - 0.5) * 0.1, d);
        else if (capped) col = tone(SNOW, 0.6 + slope * 0.7 + (g - 0.5) * 0.1, d);
        else col = tone(ROCK, t, d);
      } else if (s1 <= FACE_H) {
        kind = K_FACE;
        let t = 0.8 - s1 * 0.13 + (DET[i] - 0.5) * 0.3 + (g - 0.5) * 0.1;
        if (s1 === 1) t += 0.1;
        col = tone(FACE, t, d);
      } else {
        const p = P[i];
        if (p > IT) {
          // blue ice sheet: wind-polished streaks, frozen bubbles, crack network, snow-dusted rim
          kind = K_ICE;
          let t = 0.42 + (p - IT) * 1.6 + (MID[i] - 0.5) * 0.4 + (g - 0.5) * 0.08;
          if (P[i - 2 * S - 2] <= IT || P[i - S - 1] <= IT) t -= 0.16;            // snow bank shadow
          const streak = (x * 0.3 + wy * 0.95 + MID[i] * 9) % 11;
          if (streak < 1.2) t += 0.12;
          const a = DET[i] - 0.5, b = MID[i] - 0.5;
          if ((a > -0.022 && a < 0.022) || (b > -0.012 && b < 0.012)) t += 0.32;   // white cracks
          else if (a >= 0.022 && a < 0.04) t -= 0.12;
          if (g > 0.99) t += 0.4;                                              // bubbles
          col = tone(ICE, t, d);
          if (p < IT + 0.02 && d < (IT + 0.02 - p) * 50) col = tone(SNOW, 0.45 + (g - 0.5) * 0.1, d);
        } else {
          // snow: soft drifts lit from the top-left + faint sastrugi
          const slope = (N[i + S + 1] - N[i - S - 1]) * 12;
          let t = 0.62 + (slope > 0.24 ? 0.24 : slope < -0.28 ? -0.28 : slope) + (DET[i] - 0.5) * 0.06 + (g - 0.5) * 0.05;
          const ph = (x * 0.42 + wy * 0.9) / 5.2 + MID[i] * 3;
          const f = ph - Math.floor(ph);
          const am = MID[i] > 0.45 ? 1 : 0.4;
          t += am * (f < 0.16 ? 0.07 : f > 0.6 && f < 0.72 ? -0.08 : 0);
          if (g > 0.993) t += 0.2;                                             // ice glints
          col = tone(SNOW, t, d);
        }
        if (R[i - sh] > RT || R[i - sh2] > RT) col = shade(col, 150, 158, 196, 14);
      }
      // crevasse: dark blue slit with a lit far edge
      if (hw > 0.5 && kind !== K_ROCK) {
        const dist = Math.abs(x - xc) * kk - hw * (0.7 + 0.6 * DET[i]);
        if (dist < 0) { kind = K_CRACK; col = tone(ICE, dist < -1 ? 0.02 : 0.14, d); }
        else if (dist < 1 && x > xc) col = tone(SNOW, 0.9, d);
      }
      px[o] = col;
      cls[o] = kind;
    }
  }
}

/** Frozen lake: dark smooth ice, concentric pressure cracks, reflections, snowy shore. */
function paintLake(c: Chunk, cls: Uint8Array, st: Site, MID: Float32Array, DET: Float32Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const R = 38 + st.h3 * 26, ext = R * 1.3;
  for (let r = Math.max(0, Math.floor(st.r - ext)); r <= Math.min(CH - 1, Math.ceil(st.r + ext)); r++) {
    const wy = c.wy0 - r;
    for (let x = Math.max(0, Math.floor(st.wx - ext)); x <= Math.min(W - 1, Math.ceil(st.wx + ext)); x++) {
      const o = r * W + x;
      if (cls[o] === K_ROCK || cls[o] === K_FACE) continue;
      const i = (r + M) * S + x + M;
      const dx = x - st.wx, dy = (r - st.r) * 1.25;
      const q = Math.sqrt(dx * dx + dy * dy) / R + (MID[i] - 0.5) * 0.35;
      if (q >= 1.05) continue;
      const d = bayer4(x, wy), g = G[i];
      if (q >= 0.97) { px[o] = tone(SNOW, 0.85, d); continue; }      // packed snow shore lip
      cls[o] = K_LAKE;
      let t = 0.25 + q * 0.45 + (g - 0.5) * 0.06;
      const ring = (q * 9 + DET[i] * 0.8) % 1;
      if (ring < 0.07) t += 0.42;                                    // pressure cracks
      const refl = (dx * 0.5 - dy * 0.5 + MID[i] * 10) % 16;
      if (refl > 0 && refl < 1.5 && q < 0.85) t += 0.25;              // sky reflection streaks
      px[o] = tone(LAKE, t, d);
    }
  }
}

/** Pines on snow (in clumps), snowy rocks, ice spires on ice, rare frozen wrecks. */
function placeIceDoodads(c: Chunk, cls: Uint8Array, lakes: Site[]): void {
  const W = c.w;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  eachCell(c, 46, 1501, (x, r, h1, h2) => {
    const kind = at(x, r);
    if (!farFromDoodads(c, x, r, 20)) return;
    if (kind === K_SNOW && at(x - 8, r) === K_SNOW && at(x + 8, r) === K_SNOW) {
      if (h1 < 0.18) {
        c.add('dd_pine', x, r, h2 < 0.5, 0.85 + h2 * 0.3);
        if (h2 < 0.6 && at(x + 11, r + 6) === K_SNOW) c.add('dd_pine', x + 11, r + 6, h2 < 0.3, 0.75);
      } else if (h1 < 0.25) c.add('dd_snow_rock', x, r, h2 < 0.5, 0.8 + h2 * 0.4);
      else if (h1 < 0.27) c.add('dd_frozen_wreck', x, r, h2 < 0.5);
    } else if (kind === K_ICE && h1 < 0.22) c.add('dd_ice_spire', x, r, h2 < 0.5, 0.8 + h2 * 0.4);
  });
  for (let k = 0; k < lakes.length; k++) {
    const st = lakes[k];
    if (st.h2 < 0.35 && at(st.wx, st.r) === K_LAKE) c.add('dd_ice_spire', st.wx, st.r, st.h1 < 0.5, 0.7);
  }
}
