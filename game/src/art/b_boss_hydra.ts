// boss_hydra (112 px) — Verdance jungle multi-headed gun platform: an armoured turtle-shell
// hull with a magenta reactor, wide shoulder flanges, and five ribbed serpentine necks that
// fan out downwards, each ending in a hooded armoured gun head (glowing eyes, twin barrels).
import {
  Grid, type Shape, plate, poly, circle, ellipse, arcShape, sym, barrel, groove,
  rivet, rivetRing, vent, glow, lamp, socket, ngon, frame, tube, bezPath, fill, rect,
  GREY, FIRE, MAGENTA,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 112;

/** Left-side necks (cubic Bézier hull -> head), head direction and scale; mirrored on the right. */
const NECKS: { p: number[][]; head: [number, number]; dir: [number, number]; sc: number }[] = [
  { p: [[37, 42], [24, 44], [11, 48], [19, 60]], head: [15, 67], dir: [-0.55, 0.85], sc: 0.85 },
  { p: [[45, 52], [46, 64], [29, 66], [34, 77]], head: [32, 85], dir: [-0.2, 1], sc: 0.88 },
];
const CENTRE = { p: [[56, 56], [65, 64], [47, 70], [56, 79]], head: [56, 88] as [number, number], sc: 1 };

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const HYDRA_MOUNTS: BossMounts = {
  turret: [[-38, -24], [38, -24]],
  cannon: [],
  pod: [[-15, -45], [15, -45]],
  core: [[0, -26]],
  wing: [],
  muzzle: [[-48, 23], [-26, 43], [0, 49], [26, 43], [48, 23]],
};

function neck(g: Grid, p: number[][]): void {
  const path = bezPath(p[0], p[1], p[2], p[3], 28);
  tube(g, path, 5.2, 3.9, { amb: 0.16, spec: 0.45, rim: 1, rib: 3, ribDepth: 1.8 });
  // grey coupling collars at both ends
  for (const i of [1, path.length - 3]) {
    const [x, y] = path[i];
    const [nx, ny] = path[i + 1];
    barrel(g, x, y, x + (nx - x) * 1.6, y + (ny - y) * 1.6, i === 1 ? 6 : 4.6, { ramp: GREY, amb: 0.2, spec: 0.5, rim: 1 });
  }
}

function head(g: Grid, x: number, y: number, dx: number, dy: number, sc: number): void {
  const f = frame(x, y, dx, dy);
  const P = (pts: number[]) => f.poly(pts.map((v) => v * sc));
  // twin barrels out of the mouth, hot muzzles
  for (const v of [-1.8, 1.8]) {
    const [ax, ay] = f.pt(8 * sc, v * sc), [bx, by] = f.pt(17 * sc, v * sc);
    barrel(g, ax, ay, bx, by, 1.4 * sc + 0.2, { ramp: GREY, spec: 0.8, rim: 1 });
    const [mx, my] = f.pt(16.6 * sc, v * sc);
    glow(g, mx, my, 1.1, FIRE, 0, 4.6);
  }
  // flared hood, snout, dorsal ridge
  plate(g, P([-10, -6.5, -5, -9.2, 1, -8.2, 4.5, -4, 4.5, 4, 1, 8.2, -5, 9.2, -10, 6.5]), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 2 });
  plate(g, P([-3, -4.4, 8, -3.7, 12.8, -1.7, 12.8, 1.7, 8, 3.7, -3, 4.4]), { base: 4, bevel: 1, hi: 1.2, lo: 2.2, rim: 2, drop: 1 });
  const [r0x, r0y] = f.pt(-8 * sc, 0), [r1x, r1y] = f.pt(10 * sc, 0);
  groove(g, r0x, r0y, r1x, r1y, 1, 1);
  for (const v of [-4.4, 4.4]) {
    const [ex, ey] = f.pt(2.2 * sc, v * sc);
    glow(g, ex, ey, 1.7, MAGENTA, 0, 4.9);
  }
  for (const v of [-6.5, 6.5]) {
    const [rx, ry] = f.pt(-6 * sc, v * sc);
    rivet(g, Math.round(rx), Math.round(ry));
  }
}

/** Draws the Hydra body as a palette-independent code grid. */
export function drawHydra(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- rear thrusters (partly under the shell)
  for (const x of [44, S - 44]) {
    plate(g, circle(x, 8, 5.5), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
    plate(g, circle(x, 7.5, 3.6), { ramp: GREY, base: 1, bevel: 1, hi: -0.4, lo: 1.4 });
    glow(g, x, 7, 2.4, MAGENTA, 0, 4.4);
  }

  // ---- shoulder flanges with turret sockets
  const flange = poly([36, 16, 16, 22, 5, 34, 8, 46, 22, 50, 36, 46]);
  plate(g, M(flange), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 1 });
  plate(g, M(poly([30, 21, 17, 26, 11, 35, 13, 43, 24, 45, 30, 42])), { base: 2, bevel: 1, hi: -1, lo: -0.8 });
  for (const [x, y] of HYDRA_MOUNTS.turret) socket(g, S / 2 + x, S / 2 + y, 7.5);
  for (const x of [9, S - 10]) { rivet(g, x, 38); rivet(g, x + (x < S / 2 ? 2 : -2), 43); }
  vent(g, 22, 18, 7, 3, undefined, 2);
  vent(g, S - 29, 18, 7, 3, undefined, 2);

  // ---- necks + heads (outer first so inner necks overlap them)
  for (const n of NECKS) {
    const pm = n.p.map(([x, y]) => [S - x, y]);
    neck(g, n.p);
    neck(g, pm);
  }
  neck(g, CENTRE.p);
  for (const n of NECKS) {
    head(g, n.head[0], n.head[1], n.dir[0], n.dir[1], n.sc);
    head(g, S - n.head[0], n.head[1], -n.dir[0], n.dir[1], n.sc);
  }
  head(g, CENTRE.head[0], CENTRE.head[1], 0, 1, CENTRE.sc);

  // ---- neck collar band under the shell front
  plate(g, poly([31, 40, S - 31, 40, S - 37, 59, 37, 59]), { ramp: GREY, base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2, drop: 1 });
  for (const x of [42, 49, 56, 63, 70]) groove(g, x, 47, x, 57, 1);

  // ---- turtle shell: base, six radial plates, centre hex with reactor (core mount)
  plate(g, ellipse(56, 30, 29, 27), { base: 2, bevel: 1, hi: 1.4, lo: 1, rim: 2, drop: 2 });
  const cy = 30;
  for (let k = 0; k < 6; k++) {
    const a0 = -Math.PI / 2 + (k / 6) * Math.PI * 2 - Math.PI / 6 + 0.07;
    plate(g, arcShape(56, cy, 12.5, 26.5, a0, a0 + Math.PI / 3 - 0.14), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2 });
  }
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
    rivet(g, Math.round(56 + Math.cos(a) * 22), Math.round(cy + Math.sin(a) * 22));
    rivet(g, Math.round(56 + Math.cos(a) * 17), Math.round(cy + Math.sin(a) * 17));
  }
  plate(g, ngon(56, cy, 12, 6, -Math.PI / 2), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  const coreY = S / 2 + HYDRA_MOUNTS.core[0][1];
  plate(g, circle(56, coreY, 7.5), { ramp: GREY, base: 2, bevel: 1, hi: 1.6, lo: 1.6, rim: 2 });
  rivetRing(g, 56, coreY, 6.3, 8, 0.4);
  glow(g, 56, coreY, 5, MAGENTA, 0);
  for (const x of [36, S - 37]) lamp(g, x, 12, MAGENTA);

  // ---- rear pod sockets on the shell edge
  for (const [x, y] of HYDRA_MOUNTS.pod) socket(g, S / 2 + x, S / 2 + y, 6.5);

  // ---- vent slits on the shell flanks with magenta glow
  for (const x of [31, S - 35]) { fill(g, rect(x, 28, 4, 1), 'k'); fill(g, rect(x, 31, 4, 1), 'm'); fill(g, rect(x, 34, 4, 1), 'k'); }
  void FIRE;
  return g;
}
