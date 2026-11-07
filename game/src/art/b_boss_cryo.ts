// boss_cryo (104 px) — Glacia ice crystal sentinel: a cluster of double-terminated hexagonal
// crystal prisms (three faces + tip facets, each lit as a flat plane) held by a gunmetal halo
// frame, a cold sentinel eye glowing through the main crystal, side and crown spikes. Points DOWN.
import {
  Grid, plate, poly, ring, circle, rivet, glow, lamp, socket, frame, lightN, line,
  GREY, ICE,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 104;
const C = S / 2;

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const CRYO_MOUNTS: BossMounts = {
  turret: [[-28, -26], [28, -26]],
  cannon: [],
  pod: [[-16, -42], [16, -42]],
  core: [[0, -8]],
  wing: [[-38, 6], [38, 6]],
  muzzle: [[0, 47], [-46, 2], [46, 2], [-27, 42], [27, 42]],
};

/**
 * Double-terminated hexagonal crystal prism from (x, y) along (dx, dy): length L, half-width w,
 * top tip length ht, bottom tip length hb. Three longitudinal faces (left / middle / right)
 * and their tip facets are each filled with one flat tone from their 3D normal.
 */
function prism(g: Grid, x: number, y: number, dx: number, dy: number, L: number, w: number, ht: number, hb: number, bias = 0): void {
  const f = frame(x, y, dx, dy);
  const out = f.poly([0, 0, ht, -w, L - hb, -w, L, 0, L - hb, w, ht, w]);
  const third = w / 3;
  for (let py = out.y0; py <= out.y1; py++) for (let px = out.x0; px <= out.x1; px++) {
    if (!out.has(px, py)) continue;
    const X = px + 0.5 - x, Y = py + 0.5 - y;
    const u = X * f.fx + Y * f.fy, v = X * f.px + Y * f.py;
    let k = 1;
    if (u < ht) k = u / ht; else if (u > L - hb) k = (L - u) / hb;
    const side = v < -third * k ? -1 : v > third * k ? 1 : 0;
    const region = u < ht ? -1 : u > L - hb ? 1 : 0;
    // 3D normal: sideways for side faces, tilted along the axis on the tip facets
    let nx = f.px * side * 0.85 + f.fx * region * 0.75;
    let ny = f.py * side * 0.85 + f.fy * region * 0.75;
    let nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    let lvl = 1 + 4 * lightN(nx, ny, nz, 0.1, 0.95, 0.35, 8) + bias;
    if (side === 0 && region === 0) lvl += 0.3;
    g.set(px, py, String(Math.max(1, Math.min(5, Math.round(lvl)))));
  }
  // facet ridges: bright on the lit side, dark on the other
  const ridge = (u0: number, v0: number, u1: number, v1: number, ch: string) => {
    const [a, b] = f.pt(u0, v0), [c, d] = f.pt(u1, v1);
    line(g, a, b, c, d, ch);
  };
  const litLeft = f.px * -0.6 + f.py * -0.8 < 0; // is the -v side facing the light?
  ridge(ht, -third, L - hb, -third, litLeft ? '5' : '4');
  ridge(ht, third, L - hb, third, litLeft ? '2' : '5');
  ridge(0.5, 0, ht, -third, '5');
  ridge(0.5, 0, ht, third, '4');
  ridge(L - hb, -third, L - 0.5, 0, '4');
  ridge(L - hb, third, L - 0.5, 0, '2');
}

/** Draws the Cryo sentinel body as a palette-independent code grid. */
export function drawCryo(): Grid {
  const g = new Grid(S, S);

  // ---- gunmetal halo frame (behind the crystals)
  plate(g, ring(C, 46, 30, 37), { ramp: GREY, base: 2, bevel: 1, hi: 1.8, lo: 1.4, rim: 2 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    rivet(g, Math.round(C + Math.cos(a) * 33.5 - 0.5), Math.round(46 + Math.sin(a) * 33.5 - 0.5));
  }

  // ---- side spikes, crown spikes and lower fangs (left + mirrored)
  const SPIKES: [number, number, number, number, number, number][] = [
    [28, 48, -1, 0.06, 26, 5.5],
    [32, 22, -0.66, -0.75, 20, 5],
    [36, 70, -0.5, 0.86, 28, 6],
  ];
  for (const [x, y, dx, dy, len, w] of SPIKES) {
    prism(g, x, y, dx, dy, len, w, 3, 9);
    prism(g, S - x, y, -dx, dy, len, w, 3, 9);
  }
  // frame clamps holding the spikes
  for (const [x, y, dx, dy] of SPIKES) {
    for (const s of [1, -1]) {
      const X = s > 0 ? x : S - x, DX = s > 0 ? dx : -dx;
      const f = frame(X, y, DX, dy);
      plate(g, f.poly([-3, -6, 4, -5.5, 4, 5.5, -3, 6]), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
      const [lx, ly] = f.pt(0.5, 0);
      g.set(Math.round(lx), Math.round(ly), 'C');
    }
  }
  for (const [x, y] of CRYO_MOUNTS.turret) socket(g, C + x, C + y, 7);
  for (const [x, y] of CRYO_MOUNTS.pod) socket(g, C + x, C + y, 5.5);

  // ---- flanking crystals + main crystal
  prism(g, 38, 16, -0.3, 1, 64, 9, 10, 18, -0.2);
  prism(g, S - 38, 16, 0.3, 1, 64, 9, 10, 18, -0.2);
  prism(g, C, 2, 0, 1, 98, 16.5, 16, 28);

  // ---- sentinel eye: gunmetal setting with the cold core glowing through the crystal
  const [cx, cy] = [C + CRYO_MOUNTS.core[0][0], C + CRYO_MOUNTS.core[0][1]];
  plate(g, circle(cx, cy, 10.5), { ramp: GREY, base: 3, bevel: 1, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
  plate(g, circle(cx, cy, 8), { ramp: GREY, base: 1, bevel: 1, hi: -0.4, lo: 1.2 });
  glow(g, cx, cy, 6.6, ICE, 0, 5);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const f = frame(cx, cy, Math.cos(a), Math.sin(a));
    plate(g, f.poly([8.5, -2.5, 13, -2, 13, 2, 8.5, 2.5]), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  }
  // inner refraction streaks + frost glints on the crystal
  line(g, 44, 20, 47, 14, 'q');
  line(g, 45, 62, 46, 78, 'q');
  for (const [x, y] of [[47, 26], [57, 66], [39, 40], [64, 36], [51, 88]]) {
    if (!g.filled(x, y)) continue;
    g.set(x, y, 'w');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (g.filled(x + dx, y + dy)) g.set(x + dx, y + dy, 'q');
  }
  lamp(g, C - 1, 100, ICE);
  void poly;
  return g;
}
