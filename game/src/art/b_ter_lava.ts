// LAVA terrain painter: dark basalt plates (warped Voronoi) with bevelled edges, cracks that
// glow where the ground is hot, meandering lava rivers and pools with a hot gradient and
// floating dark crust, a red glow on nearby rock, and drifts of grey ash.
import { valueNoise } from './noise';
import {
  CH, Chunk, lattice, grain, eachCell, farFromDoodads, rampN, tone, bayer4, shade, scratch, scratchU8, sites, Site, Voronoi,
  Meander, mixPacked, pack, ensureSite,
} from './b_ter_core';

const BASALT = rampN(7, 0x0b080a, 0x130e11, 0x1b1418, 0x241b1f, 0x2e2327, 0x392b2f, 0x463438);
const ASH = rampN(6, 0x1e1b1d, 0x2a2628, 0x363133, 0x423c3e, 0x4e4749, 0x5a5254);
// lava: crust edge -> core (kept below sprite brightness; the hottest tone is used sparingly)
const LAVA = rampN(9, 0x260706, 0x420b08, 0x5e1208, 0x7c1a0a, 0x9a240c, 0xb4320e, 0xc84412, 0xd85a18, 0xe47622);
const CRUST = rampN(5, 0x140a0a, 0x1e100e, 0x2a1612, 0x361c16, 0x44241a);
const GLOW = pack(0x7a1a08);

const FLOWR = rampN(7, 0x0a080b, 0x120f14, 0x1b171e, 0x252029, 0x302935, 0x3c3442, 0x4a4152);
const FLOW_T = 0.66;
const K_ROCK = 0, K_LAVA = 1, K_ASH = 2, K_EDGE = 3;

/** Paints one lava chunk. */
export function paintLava(c: Chunk): void {
  const s = c.seed, W = c.w;
  const HEAT = lattice(c, 40, s + 3, 2, 1.6);
  const ASHF = lattice(c, 52, s + 4, 0, 1.6);
  const DET = lattice(c, 4, s + 7, 2);
  const MID = lattice(c, 12, s + 8, 9);
  const FLOW = lattice(c, 72, s + 10, 3, 1.7);
  const G = grain(c, s + 9, 1);
  const flow = new Meander(W, s + 20, {
    amp: W * 0.3, wave: 260, wave2: 70, amp2: 14, width: 17, widthVar: 6, widthWave: 150,
    gateWave: 900, gateLo: 0.38, gateHi: 0.46,
  }, valueNoise);
  const river = flow.rows(c);
  const pools = sites(c, 430, 1201, 0.6, 60, 40);
  ensureSite(c, pools);
  // lava distance field (<0 inside lava, px)
  const L = scratch(c.N);
  lavaField(c, L, river.xc, river.hw, river.slope, pools, MID, DET);
  const cls = scratchU8(W * CH);
  const vor = new Voronoi(c, 29, s + 31, 0.9, 12);
  paintRock(c, cls, vor, L, HEAT, ASHF, FLOW, DET, MID, G);
  paintFlow(c, cls, L, MID, DET, G);
  placeLavaDoodads(c, cls, HEAT, ASHF);
}

/** Signed distance-ish field to lava (river + pools), negative inside, over the chunk +2 px. */
function lavaField(c: Chunk, L: Float32Array, xcA: Float32Array, hwA: Float32Array, slA: Float32Array,
  pools: Site[], MID: Float32Array, DET: Float32Array): void {
  const W = c.w, M = c.M, S = c.S;
  for (let r = -2; r < CH + 2; r++) {
    const rr = r + M, hw = hwA[rr], xc = xcA[rr], k = 1 / Math.sqrt(1 + slA[rr] * slA[rr]);
    let i = rr * S + M - 2;
    for (let x = -2; x < W + 2; x++, i++) {
      const rough = (MID[i] - 0.5) * 8 + (DET[i] - 0.5) * 3;
      let v = hw > 0.5 ? Math.abs(x - xc) * k - hw + rough : 99;
      for (let p = 0; p < pools.length; p++) {
        const st = pools[p];
        const R = 14 + st.h3 * 16;
        const dx = x - st.wx, dy = (r - st.r) * 1.2;
        const q = Math.sqrt(dx * dx + dy * dy) - R + rough * 1.4;
        if (q < v) v = q;
      }
      L[i] = v;
    }
  }
}

/** Basalt plates with bevels, cracks (glowing where hot), ash drifts and lava-side glow. */
function paintRock(c: Chunk, cls: Uint8Array, vor: Voronoi, L: Float32Array, HEAT: Float32Array, ASHF: Float32Array,
  FLOW: Float32Array, DET: Float32Array, MID: Float32Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  const wo = 7 * S + 7;                                             // second warp channel = MID shifted
  for (let r = 0; r < CH; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const lv = L[i];
      if (lv < 0) continue;                                         // lava pass paints it
      const d = bayer4(x, wy), g = G[i];
      const fl = FLOW[i];
      if (fl > FLOW_T) {
        // fresh ropy (pahoehoe) flow: curved glossy folds across the flow, raised lobe edge
        const ph = (x * 0.45 + wy * 0.89 + MID[i] * 14 + (DET[i] - 0.5) * 3) / 5.5;
        const f = ph - Math.floor(ph);
        let t = 0.4 + (f < 0.15 ? 0.3 : f < 0.42 ? 0.08 : f < 0.58 ? -0.22 : 0) + (g - 0.5) * 0.08;
        if (FLOW[i - S - 1] <= FLOW_T || FLOW[i - 1] <= FLOW_T || FLOW[i - S] <= FLOW_T) t = 0.86;
        else if (FLOW[i + S + 1] <= FLOW_T || FLOW[i + 1] <= FLOW_T) t = 0.12;
        if (lv < 7) t -= 0.05;
        let col = tone(FLOWR, t, d);
        if (lv < 7 && d < (1 - lv / 7) * 1.2) col = mixPacked(col, GLOW, 0.3);
        px[o] = col;
        cls[o] = lv < 7 ? K_EDGE : K_ROCK;
        continue;
      }
      vor.qx = x + (MID[i] - 0.5) * 18;
      vor.qy = wy + (MID[i + wo] - 0.5) * 18;
      vor.run();
      const gap = vor.f2 - vor.f1;
      const light = (vor.dy - vor.dx) / (vor.f1 + 6);
      let t = 0.46 + (vor.id - 0.5) * 0.32 + light * 0.2 + (DET[i + S + 1] - DET[i - S - 1]) * 1.3 + (g - 0.5) * 0.1;
      const heat = HEAT[i];
      let col: number;
      let kind = K_ROCK;
      if (gap < 1.7) {
        // crack: dim red glow in hot zones, a few brighter seams at the hottest spots
        if (heat > 0.66) {
          const k = (heat - 0.66) * 3.4 + (gap < 0.8 ? 0.12 : 0);
          col = tone(LAVA, 0.08 + k * 0.55 + (g - 0.5) * 0.08, d);
        } else col = tone(BASALT, 0.02, d);
      } else {
        if (gap < 3) t += light > 0 ? 0.16 : -0.14;                 // bevelled plate edges
        const cc = DET[i] - 0.5;
        if (cc > -0.016 && cc < 0.016) t -= 0.22;                    // fine internal cracks
        if (g > 0.986) t += 0.25;
        else if (G[i - S - 1] > 0.986) t -= 0.2;
        const ash = ASHF[i] + (MID[i] - 0.5) * 0.3;
        if (ash > 0.62) {
          kind = K_ASH;
          col = tone(ASH, t - 0.05 + (ash - 0.62) * 0.7, d);
        } else col = tone(BASALT, t, d);
        // hot cracks bleed a faint glow onto the plate edge
        if (heat > 0.7 && gap < 3.6 && d < (heat - 0.7) * 3) col = mixPacked(col, GLOW, 0.3);
      }
      // shadow cast by the raised flow lobes onto the plates
      if (FLOW[i - 2 * S - 2] > FLOW_T || FLOW[i - 3 * S - 3] > FLOW_T) col = shade(col, 130, 128, 140, 4);
      // radiant glow on rock next to lava
      if (lv < 7) {
        kind = K_EDGE;
        const k = 1 - lv / 7;
        if (d < k * k * 1.2) col = mixPacked(col, GLOW, 0.25 + k * 0.4);
      }
      px[o] = col;
      cls[o] = kind;
    }
  }
}

/** Lava river / pools: hot gradient toward the core, slow flow streaks, floating crust plates. */
function paintFlow(c: Chunk, cls: Uint8Array, L: Float32Array, MID: Float32Array, DET: Float32Array, G: Float32Array): void {
  const W = c.w, M = c.M, S = c.S, px = c.px;
  for (let r = 0; r < CH; r++) {
    const wy = c.wy0 - r;
    let i = (r + M) * S + M, o = r * W;
    for (let x = 0; x < W; x++, i++, o++) {
      const lv = L[i];
      if (lv >= 0) continue;
      cls[o] = K_LAVA;
      const d = bayer4(x, wy), g = G[i];
      const depth = -lv;
      let t = 0.16 + (depth > 10 ? 10 : depth) * 0.05 + (g - 0.5) * 0.08;
      const ph = (wy * 0.18 + (MID[i] - 0.5) * 9 + x * 0.05) % 5;
      if (ph < 0.7) t += 0.1;                                       // flow streaks
      const crust = MID[i] * 0.75 + DET[i] * 0.25;
      if (depth > 3 && crust > 0.6) {
        // floating crust raft with a lit edge
        const lit = MID[i - S - 1] * 0.75 + DET[i - S - 1] * 0.25 < 0.6;
        px[o] = tone(CRUST, (crust - 0.6) * 5 + (lit ? 0.4 : 0) + (g - 0.5) * 0.15, d);
        continue;
      }
      if (depth > 3 && crust > 0.56) t += 0.2;                      // hot seam around the raft
      if (depth < 1.5) t = 0.06;                                    // cooled dark rim
      px[o] = tone(LAVA, t > 0.86 ? 0.86 : t, d);
    }
  }
}

/** Vents on hot rock, obsidian shards, lava rocks near flows, dead trees in ash. */
function placeLavaDoodads(c: Chunk, cls: Uint8Array, HEAT: Float32Array, ASHF: Float32Array): void {
  const W = c.w, M = c.M, S = c.S;
  const at = (x: number, r: number) => cls[(Math.max(0, Math.min(CH - 1, r | 0))) * W + Math.max(0, Math.min(W - 1, x | 0))];
  const solid = (x: number, r: number, rad: number) => {
    for (let k = 0; k < 5; k++) {
      const q = at(x + (k === 1 ? rad : k === 2 ? -rad : 0), r + (k === 3 ? rad : k === 4 ? -rad : 0));
      if (q === K_LAVA) return false;
    }
    return true;
  };
  eachCell(c, 42, 1301, (x, r, h1, h2) => {
    if (!solid(x, r, 12) || !farFromDoodads(c, x, r, 22)) return;
    const i = (Math.round(r) + M) * S + Math.round(x) + M;
    const kind = at(x, r);
    if (kind === K_EDGE && h1 < 0.4) c.add('dd_lava_rock', x, r, h2 < 0.5, 0.8 + h2 * 0.4);
    else if (kind === K_ASH && h1 < 0.32) c.add('dd_ash_tree', x, r, h2 < 0.5, 0.85 + h2 * 0.3);
    else if (HEAT[i] > 0.64 && h1 < 0.2) c.add('dd_vent', x, r, h2 < 0.5);
    else if (h1 < 0.14) c.add('dd_obsidian', x, r, h2 < 0.5, 0.8 + h2 * 0.35);
    else if (ASHF[i] > 0.5 && h1 < 0.22) c.add('dd_lava_rock', x, r, h2 < 0.5, 0.7);
  });
}
