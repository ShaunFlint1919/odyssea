// boss_forge (112 px) — Cinder lava magma forge reactor: a ring of radial heat fins with
// white-hot slots between them, an octagonal armoured housing held by four buttresses with
// pistons, a crucible of churning molten metal at its heart and a magma cannon pointing DOWN.
import {
  Grid, type Shape, plate, poly, circle, ring, rect, sym, barrel, groove, ridge, rivet, rivetRing,
  glow, lamp, socket, ngon, frame, ventV, fill, quant,
  GREY, FIRE,
} from './b_boss_kit';
import { fbm } from './noise';
import type { BossMounts } from './b_boss_types';

const S = 112;
const C = S / 2;
const CY = 50;

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const FORGE_MOUNTS: BossMounts = {
  turret: [[-31, -37], [31, -37], [-31, 25], [31, 25]],
  cannon: [],
  pod: [[-42, -6], [42, -6]],
  core: [[0, -6]],
  wing: [],
  muzzle: [[0, 54], [-31, 25], [31, 25]],
};

/** Molten metal: noise-driven crust over a white-hot gradient. */
function molten(g: Grid, cx: number, cy: number, r: number): void {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > r) continue;
    const t = d / r;
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    const swirl = fbm(Math.cos(a + t * 2.2) * 2.4 + 5, Math.sin(a + t * 2.2) * 2.4 + t * 3, 77, 3);
    let lvl = 5.2 - t * 2.6 - (swirl > 0.56 ? 2.2 * (swirl - 0.5) * 4 : 0);
    if (t > 0.86) lvl -= 0.8;
    g.set(x, y, FIRE[quant(lvl, x, y, 0.8) - 1]);
  }
}

/** Draws the Forge body as a palette-independent code grid. */
export function drawForge(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- glowing heat ring under the fins
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x + 0.5 - C, y + 0.5 - CY);
    if (d < 30 || d > 45.5) continue;
    const t = (d - 30) / 15.5;
    g.set(x, y, FIRE[quant(4.6 - t * 3.6, x, y, 1) - 1]);
  }
  // ---- radial heat fins
  const FINS = 24;
  for (let k = 0; k < FINS; k++) {
    const a = (k / FINS) * Math.PI * 2 + Math.PI / FINS;
    const f = frame(C, CY, Math.cos(a), Math.sin(a));
    plate(g, f.poly([31, -2.4, 46.5, -2.6, 46.5, 2.6, 31, 2.4]), { base: 3, bevel: 1, hi: 1.8, lo: 1.8, rim: 2 });
  }

  // ---- magma cannon (front) under the housing
  barrel(g, C, 76, C, 104, 6.5, { ramp: GREY, amb: 0.16, spec: 0.7, rim: 1, drop: 2 });
  for (const y of [84, 92]) {
    plate(g, rect(C - 8, y, 16, 3), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
    for (let x = C - 6; x < C + 6; x++) g.set(x, y + 1, x & 1 ? 'E' : 'e');
  }
  plate(g, poly([C - 9, 99, C + 9, 99, C + 8, 109, C - 8, 109]), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
  plate(g, circle(C, 105, 4.6), { ramp: GREY, base: 1, bevel: 0 });
  glow(g, C, 105.5, 3.6, FIRE, 0, 5);

  // ---- four buttresses with hydraulic pistons + turret sockets
  for (const [x, y] of FORGE_MOUNTS.turret) {
    const bx = C + x, by = C + y;
    const a = Math.atan2(by - CY, bx - C);
    const f = frame(C, CY, Math.cos(a), Math.sin(a));
    plate(g, f.poly([22, -13, 42, -12, 52, -8, 52, 8, 42, 12, 22, 13]), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
    plate(g, f.poly([26, -8, 38, -7.5, 38, 7.5, 26, 8]), { base: 2, bevel: 1, hi: -1, lo: -1 });
    for (const v of [-5, 5]) {
      const [p0x, p0y] = f.pt(25, v), [p1x, p1y] = f.pt(36, v);
      barrel(g, p0x, p0y, p1x, p1y, 1.8, { ramp: GREY, spec: 0.8, rim: 1 });
    }
    socket(g, bx, by, 7.5);
  }

  // ---- octagonal housing
  plate(g, ngon(C, CY, 33, 8, Math.PI / 8), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 2 });
  plate(g, ngon(C, CY, 28.5, 8, Math.PI / 8), { base: 2, bevel: 1, hi: -1, lo: -0.8 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    rivet(g, Math.round(C + Math.cos(a) * 30.5 - 0.5), Math.round(CY + Math.sin(a) * 30.5 - 0.5));
  }
  // glowing vents on the housing faces
  ventV(g, 30, 44, 4, 12, FIRE, 2, 2);
  ventV(g, S - 34, 44, 4, 12, FIRE, 2, 2);

  // ---- crucible: grey rim, molten core (core mount)
  const [cx, cy] = [C + FORGE_MOUNTS.core[0][0], C + FORGE_MOUNTS.core[0][1]];
  plate(g, circle(cx, cy, 22), { ramp: GREY, base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
  rivetRing(g, cx, cy, 20.4, 20);
  plate(g, ring(cx, cy, 17, 19), { ramp: GREY, base: 2, bevel: 1, hi: -1, lo: -1 });
  molten(g, cx, cy, 17);
  // clamps holding the crucible
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const f = frame(cx, cy, Math.cos(a), Math.sin(a));
    plate(g, f.poly([14, -3, 23, -3.5, 23, 3.5, 14, 3]), { base: 4, bevel: 1, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  }

  // ---- side pod sockets on armoured blisters breaking the fin ring
  for (const [x, y] of FORGE_MOUNTS.pod) {
    plate(g, circle(C + x, C + y, 8.5), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
    socket(g, C + x, C + y, 6);
  }
  // ---- rear exhaust chimney
  plate(g, circle(C, 9, 5.5), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
  plate(g, circle(C, 9, 3.8), { ramp: GREY, base: 1, bevel: 0 });
  glow(g, C, 9.5, 2.8, FIRE, 0, 4.6);

  // ---- warning lamps
  lamp(g, C - 12, 20, FIRE, true);
  lamp(g, C + 10, 20, FIRE, true);
  void [M, groove, ridge, fill];
  return g;
}
