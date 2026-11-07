// OCEAN terrain painter: deep blue water banded by depth with dashed wave crests, archipelagos
// with turquoise shallows, two foam lines, wet/dry sandy beaches, vegetated and rocky interiors.
import { fbm, valueNoise } from './noise';
import {
  CH, Chunk, field, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, once, range, type Step,
} from './b_ter_core';

const WATER = rampN(12, 0x07112a, 0x0a1834, 0x0d203f, 0x10284a, 0x133154, 0x163b5d, 0x194764, 0x1d546a, 0x22636f,
  0x297274, 0x318076, 0x3a8c78);
const SAND = rampN(6, 0x5e5038, 0x76664a, 0x8c7a58, 0x9e8a64, 0xae9a70, 0xbca87c);
const VEG = rampN(7, 0x0c1a10, 0x142816, 0x1c381c, 0x264a22, 0x325c28, 0x406c2e, 0x527c36);
const ROCK = rampN(7, 0x1c1a19, 0x2a2724, 0x3a3530, 0x4a443c, 0x5c5449, 0x6e6556, 0x807664);
const FOAM = rampN(4, 0x5c8c9c, 0x7aa6b4, 0x9cbfca, 0xbcd4dc);

const LAND = 0.6;
// sin() lookup (256 steps per turn) for the wave crests
const SIN = new Float32Array(256).map((_, k) => Math.sin((k / 256) * Math.PI * 2));
const SIN_K = 256 / (Math.PI * 2);
const K_DEEP = 0, K_MID = 1, K_SHALLOW = 2, K_BEACH = 3, K_LAND = 4;

/** Per-chunk state shared by the ocean steps. */
interface Ctx { c: Chunk; I: Float32Array; DET: Float32Array; MID: Float32Array; WAV: Float32Array; G: Float32Array; cls: Uint8Array }

/** Rough coastline: perturbs the island field in place for margin-layout rows M-4+[a, b). */
function roughCoast(k: Ctx, a: number, b: number): void {
  const { c, I, DET, MID } = k;
  const W = c.w, M = c.M, S = c.S;
  for (let rr = M - 4 + a; rr < M - 4 + b; rr++) {
    let i = rr * S + M - 4;
    for (let xx = -4; xx < W + 4; xx++, i++) I[i] += (DET[i] - 0.5) * 0.028 + (MID[i] - 0.5) * 0.05;
  }
}

/** Main pass, rows [r0, r1): depth-banded water, crests, shallows, foam, beaches, islands. */
function paintRows(k: Ctx, r0: number, r1: number): void {
  const { c, I, DET, MID, WAV, G, cls } = k;
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const sh = 3 * S + 3;
  for (let r = r0; r < r1; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const d = bayer4(x, wy), g = G[i];
      const v = I[i];
      let col: number;
      if (v < LAND) {
        const depth = (LAND - v) / 0.2;                       // 0 at the coast, 1 = open sea
        let t = 1 - (depth > 1 ? 1 : depth);
        t = t * t * 0.92 + 0.04 + (WAV[i] - 0.5) * 0.12;    // depth bands + slow swell
        // wavy dashed crests with a dark trough line below them
        const ph = (wy + 3.2 * SIN[((x * 0.11 + WAV[i] * 6.3) * SIN_K) & 255] + WAV[i] * 14) / 7.5;
        const f = ph - Math.floor(ph);
        if (f < 0.12 && DET[i] > 0.52) t += depth > 0.5 ? 0.2 : 0.11;
        else if (f >= 0.12 && f < 0.24 && DET[i] > 0.52) t -= 0.06;
        // shallow sea floor: sand ripples and dark weed/rock patches
        if (depth < 0.45) {
          const m = MID[i];
          if (m < 0.36) t -= (0.36 - m) * 0.9;
          else if (DET[i] > 0.62) t += 0.04;
        }
        t += (g - 0.5) * 0.04;
        col = tone(WATER, t, d);
        cls[o] = depth > 0.62 ? K_DEEP : depth > 0.3 ? K_MID : K_SHALLOW;
        // foam: breaking line at the shore + broken outer line
        const fo = LAND - v;
        if (fo < 0.011) col = tone(FOAM, 0.55 + (fo < 0.005 ? 0.4 : 0) + (g - 0.5) * 0.3, d);
        else if (fo > 0.03 && fo < 0.036 && DET[i] > 0.42) col = tone(FOAM, 0.15 + (g - 0.5) * 0.2, d);
        else if (fo < 0.018 && g > 0.6) col = tone(FOAM, 0.05, d);
        // land shadow on the shallows
        if (I[i - sh] > LAND + 0.03) col = shade(col, 150, 160, 180, 0);
      } else if (v < LAND + 0.022) {
        // beach: wet sand at the waterline, dry sand above
        cls[o] = K_BEACH;
        const wet = v < LAND + 0.006;
        let t = wet ? 0.18 : 0.55 + (v - LAND) * 12 + (I[i + S + 1] - I[i - S - 1]) * 6;
        t += (DET[i] - 0.5) * 0.2 + (g - 0.5) * 0.12;
        col = tone(SAND, t, d);
      } else {
        // island interior: rainforest canopy, rocky peaks on the highest ground
        cls[o] = K_LAND;
        const slope = (I[i + S + 1] - I[i - S - 1]) * 9;
        const bump = (DET[i + S + 1] - DET[i - S - 1]) * 2.4;    // lit tree clumps / rock knobs
        const rockLine = LAND + 0.13 + (MID[i] - 0.5) * 0.06;
        if (v > rockLine && (v > rockLine + 0.02 || d < (v - rockLine) * 50)) {
          // rocky peak: strong slope light, ridges and gullies, scree speckle
          let t = 0.48 + slope * 2.2 + (MID[i + S + 1] - MID[i - S - 1]) * 7 + bump * 0.8 + (g - 0.5) * 0.16;
          const rg = MID[i] - 0.5;
          if (rg > 0 && rg < 0.02) t += 0.2;
          else if (rg < 0 && rg > -0.02) t -= 0.2;
          if (g > 0.97) t += 0.25;
          col = tone(ROCK, t, d);
        } else {
          let t = 0.46 + slope * 0.8 + bump + (DET[i] - 0.5) * 0.3 + (g - 0.5) * 0.12;
          if (DET[i] < 0.4) t -= 0.22;                         // gaps between tree crowns
          if (v < LAND + 0.03) t -= 0.12;                     // darker fringe behind the beach
          col = tone(VEG, t, d);
        }
      }
      px[o] = col;
    }
  }
}

/** Ocean chunk plan: island / detail / swell fields, coastline roughness, main pass, doodads. */
export function planOcean(c: Chunk): Step[] {
  const s = c.seed, W = c.w;
  let I!: Float32Array, DET!: Float32Array, MID!: Float32Array;
  let k!: Ctx;
  return [
    // islands: 3-octave fbm, density modulated by a very slow wave (open sea <-> archipelago)
    once(() => { I = field(c, 8, (x, y) => fbm(x / 120, y / 130, s + 1, 3) + 0.2 * (valueNoise(x / 600, y / 900, s + 2) - 0.5), 4); }),
    once(() => { DET = lattice(c, 4, s + 5, 4); }),
    once(() => { MID = lattice(c, 12, s + 6, 4); }),
    once(() => { k = { c, I, DET, MID, WAV: lattice(c, 28, s + 7, 0), G: grain(c, s + 9, 0), cls: c.u8(W * CH) }; }),
    range(CH + 8, 16, (a, b) => roughCoast(k, a, b)),
    range(CH, 4, (a, b) => paintRows(k, a, b)),
    once(() => placeOceanDoodads(c, k.cls)),
  ];
}

/** Islets and wrecks in open water, reefs in the shallows, buoys near the coasts. */
function placeOceanDoodads(c: Chunk, cls: Uint8Array): void {
  const W = c.w;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  const all = (x: number, r: number, rad: number, ok: number) =>
    at(x, r) <= ok && at(x - rad, r) <= ok && at(x + rad, r) <= ok && at(x, r - rad) <= ok && at(x, r + rad) <= ok;
  eachCell(c, 52, 801, (x, r, h1, h2) => {
    const k = at(x, r);
    if (!farFromDoodads(c, x, r, 30)) return;
    if (k === K_DEEP && all(x, r, 22, K_MID)) {
      if (h1 < 0.16) c.add('dd_islet', x, r, h2 < 0.5, 0.9 + h2 * 0.25);
      else if (h1 < 0.24) c.add('dd_wreck', x, r, h2 < 0.5);
      else if (h1 < 0.36) c.add('dd_buoy', x, r);
    } else if (k === K_MID && all(x, r, 12, K_SHALLOW)) {
      if (h1 < 0.3) c.add('dd_buoy', x, r);
      else if (h1 < 0.42) c.add('dd_wreck', x, r, h2 < 0.5, 0.85);
    } else if (k === K_SHALLOW && all(x, r, 8, K_SHALLOW) && h1 < 0.55) {
      c.add('dd_reef', x, r, h2 < 0.5, 0.8 + h2 * 0.35);
    }
  });
}
