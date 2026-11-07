// boss_hive (112 px) — Umbra Deep cavern organic hive mother, head DOWN: a huge glossy
// abdomen of overlapping chitin tergites with edge spines and bio-luminescent egg sacs, a
// chitin thorax with three pairs of jointed legs, a many-eyed head and two serrated mandibles
// framing an acid-glowing maw.
import {
  Grid, type Shape, type Ramp, plate, poly, circle, ellipse, sym, dome, groove, glow, socket, tube, bezPath,
  lightN, quant, frame,
  ACID,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 112;
const C = S / 2;
/** Glowing sac ramp: no white top so the bulbs read as translucent, not as eyeballs. */
const SAC: Ramp = ['i', 'l', 'V', 'Z', 'Z'];

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const HIVE_MOUNTS: BossMounts = {
  turret: [[-19, 9], [19, 9]],
  cannon: [],
  pod: [[-21, -37], [21, -37]],
  core: [[0, -27]],
  wing: [],
  muzzle: [[0, 42], [-7, 30], [7, 30]],
};

/** Left legs: hip, knee, claw tip (mirrored on the right). */
const LEGS: number[][][] = [
  [[42, 56], [19, 42], [8, 28]],
  [[40, 64], [13, 60], [4, 75]],
  [[42, 72], [21, 81], [15, 99]],
];

function leg(g: Grid, hip: number[], knee: number[], tip: number[]): void {
  tube(g, [[hip[0], hip[1]], [knee[0], knee[1]]], 4.2, 3.2, { amb: 0.15, spec: 0.7, pow: 10, rim: 1, bias: -0.4, dither: 0.5 });
  const mid = [(knee[0] + tip[0]) / 2 + (tip[1] - knee[1]) * 0.08, (knee[1] + tip[1]) / 2 - (tip[0] - knee[0]) * 0.08];
  tube(g, [[knee[0], knee[1]], [mid[0], mid[1]], [tip[0], tip[1]]], 3, 0.7, { amb: 0.15, spec: 0.7, pow: 10, rim: 1, bias: -0.2, dither: 0.5 });
  dome(g, knee[0], knee[1], 3.5, 3.5, { amb: 0.2, spec: 0.8, pow: 8, rim: 1, dither: 0.5 });
  const f = frame(mid[0], mid[1], tip[0] - knee[0], tip[1] - knee[1]);
  for (const u of [-3, 1]) {
    const [x, y] = f.pt(u, -2.6);
    g.set(Math.round(x), Math.round(y), '1');
  }
}

function mandible(g: Grid, side: number): void {
  const X = (x: number) => (side < 0 ? x : S - 1 - x);
  const p = bezPath([X(46), 86], [X(33), 95], [X(37), 108], [X(51), 107], 22);
  tube(g, p, 4.6, 0.8, { amb: 0.2, spec: 0.8, pow: 9, rim: 1, bias: 0.3, dither: 0.5 });
  for (const [x, y] of [[41, 100], [43, 103], [46, 105]]) {
    g.set(X(x), y, 'k');
    g.set(X(x) + (side < 0 ? 1 : -1), y + 1, '1');
  }
}

/**
 * Abdomen of overlapping tergites: ellipsoid lighting, each band rolled so its rear edge
 * catches the light and its front edge tucks (dark) under the next band.
 */
function abdomen(g: Grid, cx: number, cy: number, rx: number, ry: number, bands: number[]): Shape {
  const shape = ellipse(cx, cy, rx, ry);
  for (let b = 0; b < bands.length - 1; b++) {
    const y0 = bands[b], y1 = bands[b + 1];
    for (let y = Math.floor(y0); y <= Math.ceil(y1) + 1; y++) for (let x = shape.x0; x <= shape.x1; x++) {
      if (!shape.has(x, y)) continue;
      const dx = (x + 0.5 - cx) / rx;
      const curve = dx * dx * 6;
      const yy = y - curve;
      if (yy < y0 || yy > y1 + 1.5) continue;
      const t = (yy - y0) / (y1 - y0);
      const ny0 = (y + 0.5 - cy) / ry;
      const r2 = Math.min(0.999, dx * dx + ny0 * ny0);
      let nx = dx, ny = ny0 + (0.55 - t) * -0.9, nz = Math.sqrt(1 - r2);
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      let lvl = 1 + 4 * lightN(nx, ny, nz, 0.14, 0.82, 0.5, 12);
      if (t > 0.86) lvl -= 1.4;
      if (r2 > 0.86) lvl -= 0.8;
      g.set(x, y, String(quant(lvl, x, y, 0.55)));
    }
  }
  return shape;
}

/** Draws the Hive mother body as a palette-independent code grid. */
export function drawHive(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- legs and mandibles (under the body)
  for (const [h, k, t] of LEGS) {
    leg(g, h, k, t);
    leg(g, [S - h[0], h[1]], [S - k[0], k[1]], [S - t[0], t[1]]);
  }
  mandible(g, -1);
  mandible(g, 1);

  // ---- abdomen edge spines
  for (const [x, y, a] of [[27, 16, -2.5], [24, 28, -3], [25, 40, -3.3], [31, 51, -3.8]]) {
    const f = frame(x, y, Math.cos(a), Math.sin(a));
    plate(g, M(f.poly([0, -3, 7, 0, 0, 3])), { base: 2, bevel: 1, hi: 1.8, lo: 1, rim: 2 });
  }
  // ---- abdomen tergites
  abdomen(g, C, 31, 31, 28, [3, 12, 21, 30, 39, 48, 59]);
  // dorsal ridge knobs
  for (const y of [7, 16, 25, 34, 43]) dome(g, C, y + 2, 2.2, 2.6, { amb: 0.3, spec: 0.9, pow: 6, rim: 1 });

  // ---- bio-luminescent egg sacs on the flanks
  for (const [x, y, r] of [[33, 14, 4.6], [27, 28, 5.4], [31, 43, 4.6]]) {
    for (const X of [x, S - x]) {
      plate(g, circle(X, y, r + 1.4), { base: 1, bevel: 1, hi: 0.6, lo: -0.6, rim: 2 });
      dome(g, X, y, r, r, { ramp: SAC, amb: 0.45, diff: 0.55, spec: 0, dither: 0.6 });
      glow(g, X + 0.4, y + 0.6, r * 0.5, ACID, 0, 4.6);
      g.set(Math.round(X - r * 0.45), Math.round(y - r * 0.5), 'w');
    }
  }
  for (const [x, y] of HIVE_MOUNTS.pod) socket(g, C + x, C + y, 5.6);

  // ---- egg chamber (core mount): membrane ring with a glowing nucleus
  const [cx, cy] = [C + HIVE_MOUNTS.core[0][0], C + HIVE_MOUNTS.core[0][1]];
  plate(g, ellipse(cx, cy, 11, 9.6), { base: 2, bevel: 2, hi: -1, lo: -1.2, rim: 2 });
  dome(g, cx, cy, 8.2, 7.2, { ramp: SAC, amb: 0.4, diff: 0.6, spec: 0, dither: 0.6 });
  glow(g, cx + 0.5, cy + 0.6, 4.2, ACID, 0, 4.9);
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 + 0.3;
    groove(g, cx + Math.cos(ang) * 4.5, cy + Math.sin(ang) * 4, cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 7.2, 1, 0);
  }
  g.set(cx - 5, cy - 4, 'w');

  // ---- thorax: armoured chitin shield with shoulder sockets
  const thorax = poly([C - 20, 56, C - 12, 52, C + 12, 52, C + 20, 56, C + 22, 66, C + 16, 77, C - 16, 77, C - 22, 66]);
  plate(g, thorax, { base: 3, bevel: 2, hi: 2, lo: 1.8, rim: 2, drop: 2 });
  dome(g, C, 64, 14, 9, { amb: 0.2, spec: 0.7, pow: 10, bias: 0.2, dither: 0.5 });
  groove(g, C - 1, 56, C - 1, 72, 2, 1);
  for (const [x, y] of HIVE_MOUNTS.turret) socket(g, C + x, C + y, 7);

  // ---- head with compound eyes
  plate(g, M(poly([C - 15, 76, C, 74, C, 97, C - 8, 96, C - 15, 87])), { base: 3, bevel: 2, hi: 2, lo: 1.8, rim: 2, drop: 2 });
  dome(g, C, 83, 11, 8, { amb: 0.2, spec: 0.75, pow: 10, bias: 0.3, dither: 0.5 });
  for (const [x, y, rx, ry] of [[48.5, 81, 3.4, 2.6], [S - 48.5, 81, 3.4, 2.6]]) {
    plate(g, ellipse(x, y, rx + 1, ry + 1), { base: 1, bevel: 0 });
    dome(g, x, y, rx, ry, { ramp: SAC, amb: 0.5, diff: 0.5, spec: 0, dither: 0.4 });
    glow(g, x + 0.5, y + 0.4, 1.4, ACID, 0, 5);
  }
  for (const [x, y] of [[44, 86], [S - 45, 86], [51, 87], [S - 52, 87], [C - 1, 79]]) {
    g.set(x, y, 'Z'); g.set(x + 1, y, 'V'); g.set(x, y + 1, 'l'); g.set(x + 1, y + 1, 'i');
  }
  // acid maw between the mandibles
  plate(g, ellipse(C, 96, 6, 4.5), { base: 1, bevel: 1, hi: -0.6, lo: 0.4, rim: 2 });
  glow(g, C, 97, 3.6, ACID, 1, 4.7);
  for (const x of [C - 4, C + 3]) { g.set(x, 93, '4'); g.set(x, 94, '3'); }
  return g;
}
