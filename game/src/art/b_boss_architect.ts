// boss_architect (128 px) — Axiom Citadel final techno core: three concentric rings (segmented
// outer ring with glowing nodes, a circuit ring of teal traces, an armoured inner ring) around a
// great magenta eye core, two armoured arms with claws reaching DOWN and two upper pylons.
import {
  Grid, type Shape, type Ramp, plate, poly, circle, ring, arcShape, sym, dome, groove,
  rivet, glow, lamp, socket, frame, tube, line, quant, chamferRect,
  GREY, TEAL, MAGENTA,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 128;
const C = S / 2;
const CY = 52;
/** Dark glossy lens ramp. */
const LENS: Ramp = ['k', 'K', 'g', 'G', 'h'];

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const ARCHITECT_MOUNTS: BossMounts = {
  turret: [[-27, -39], [27, -39], [-29, 15], [29, 15]],
  cannon: [[0, 34]],
  pod: [[-48, -44], [48, -44]],
  core: [[0, -12]],
  wing: [[-46, 6], [46, 6]],
  muzzle: [[-44, 57], [44, 57], [0, 44]],
};

/** Armoured arm: shoulder -> elbow -> claw (left side; mirrored by the caller via flip). */
function arm(g: Grid, sh: number[], el: number[], wr: number[], flip: boolean): void {
  const X = (x: number) => (flip ? S - x : x);
  const A = [X(sh[0]), sh[1]], E = [X(el[0]), el[1]], W = [X(wr[0]), wr[1]];
  tube(g, [[A[0], A[1]], [E[0], E[1]]], 5.5, 4.5, { ramp: GREY, amb: 0.18, spec: 0.6, rim: 1, rib: 4, ribDepth: 1.2 });
  tube(g, [[E[0], E[1]], [W[0], W[1]]], 4.5, 3.6, { ramp: GREY, amb: 0.18, spec: 0.6, rim: 1, rib: 4, ribDepth: 1.2 });
  // armour sleeves
  const f1 = frame(A[0], A[1], E[0] - A[0], E[1] - A[1]);
  const l1 = Math.hypot(E[0] - A[0], E[1] - A[1]);
  plate(g, f1.poly([4, -7, l1 - 5, -6, l1 - 3, 0, l1 - 5, 6, 4, 7, 2, 0]), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
  const f2 = frame(E[0], E[1], W[0] - E[0], W[1] - E[1]);
  const l2 = Math.hypot(W[0] - E[0], W[1] - E[1]);
  plate(g, f2.poly([3, -5.5, l2 - 3, -5, l2 - 1, 0, l2 - 3, 5, 3, 5.5]), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 2 });
  const [t0x, t0y] = f2.pt(4, 0), [t1x, t1y] = f2.pt(l2 - 4, 0);
  line(g, t0x, t0y, t1x, t1y, 'T');
  // elbow joint
  dome(g, E[0], E[1], 5, 5, { ramp: GREY, amb: 0.2, spec: 0.8, rim: 1, drop: 1 });
  glow(g, E[0], E[1], 2, TEAL, 0, 4.6);
  // claw: three talons pointing along the forearm direction
  for (const v of [-4, 0, 4]) {
    const fc = frame(W[0] + f2.px * v, W[1] + f2.py * v, f2.fx + f2.px * v * 0.06, f2.fy + f2.py * v * 0.06);
    plate(g, fc.poly([-2, -2.2, 8, -1.4, 12, 0, 8, 1.4, -2, 2.2]), { base: 3, bevel: 1, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
  }
  plate(g, circle(W[0], W[1], 4.5), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  glow(g, W[0], W[1], 1.8, MAGENTA, 0, 4.8);
}

/** Draws the Architect body as a palette-independent code grid. */
export function drawArchitect(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- upper pylons (behind the rings)
  const pylon = poly([44, 30, 22, 8, 12, 4, 8, 10, 28, 40]);
  plate(g, M(pylon), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2 });
  plate(g, M(poly([40, 30, 22, 12, 15, 9, 13, 12, 30, 34])), { base: 2, bevel: 1, hi: -1, lo: -0.8 });
  for (const [x, y] of ARCHITECT_MOUNTS.pod) socket(g, C + x, C + y, 5.6);
  for (let i = 0; i < 4; i++) { lamp(g, 24 + i * 4, 16 + i * 4, TEAL); lamp(g, S - 26 - i * 4, 16 + i * 4, TEAL); }

  // ---- arms (behind the rings)
  arm(g, [36, 70], [16, 84], [20, 104], false);
  arm(g, [36, 70], [16, 84], [20, 104], true);
  for (const [x, y] of ARCHITECT_MOUNTS.wing) {
    plate(g, chamferRect(C + x - 7, C + y - 9, 14, 18, 4), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
    for (const dy of [-4, 1]) groove(g, C + x - 4, C + y + dy, C + x + 3, C + y + dy, 1);
  }

  // ---- lower emitter (cannon socket) under the rings
  plate(g, M(poly([52, 78, 64, 78, 64, 104, 56, 104, 50, 92])), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
  for (const [x, y] of ARCHITECT_MOUNTS.cannon) socket(g, C + x, C + y, 8);

  // ---- outer ring: 16 armour segments with glowing nodes and outer teeth
  plate(g, ring(C, CY, 30, 44), { ramp: GREY, base: 1, bevel: 1, hi: 1.4, lo: 0.4, rim: 2, drop: 2 });
  const N = 16;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2 + 0.035;
    const a1 = ((k + 1) / N) * Math.PI * 2 - 0.035;
    plate(g, arcShape(C, CY, 33.5, 42.5, a0, a1), { base: k % 2 ? 3 : 4, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
    const am = (a0 + a1) / 2;
    if (k % 2 === 0) {
      const f = frame(C, CY, Math.cos(am), Math.sin(am));
      plate(g, f.poly([42, -2.5, 46, -1.5, 46, 1.5, 42, 2.5]), { base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
    } else {
      lamp(g, Math.round(C + Math.cos(am) * 38 - 0.5), Math.round(CY + Math.sin(am) * 38 - 0.5), TEAL, true);
    }
  }
  for (const [x, y] of ARCHITECT_MOUNTS.turret) socket(g, C + x, C + y, 7);

  // ---- circuit ring: dark band with teal traces and nodes
  plate(g, ring(C, CY, 22, 33), { base: 1, bevel: 1, hi: 1, lo: -0.6, rim: 0 });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r0 = 23.5, r1 = k % 3 === 0 ? 32 : 28;
    line(g, C + Math.cos(a) * r0, CY + Math.sin(a) * r0, C + Math.cos(a) * r1, CY + Math.sin(a) * r1, k % 2 ? 't' : 'T');
    if (k % 3 === 0) g.set(Math.round(C + Math.cos(a) * 31 - 0.5), Math.round(CY + Math.sin(a) * 31 - 0.5), 'u');
  }
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    if (k % 6 < 4) g.set(Math.round(C + Math.cos(a) * 29.5 - 0.5), Math.round(CY + Math.sin(a) * 29.5 - 0.5), 'j');
  }

  // ---- inner armour ring
  plate(g, ring(C, CY, 15, 23), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    rivet(g, Math.round(C + Math.cos(a) * 19 - 0.5), Math.round(CY + Math.sin(a) * 19 - 0.5));
    const f = frame(C, CY, Math.cos(a - Math.PI / 8), Math.sin(a - Math.PI / 8));
    const [x0, y0] = f.pt(16, 0), [x1, y1] = f.pt(22, 0);
    groove(g, x0, y0, x1, y1, 2, 0);
  }

  // ---- the eye: dark glossy lens, magenta iris with striations, white-hot pupil
  const [ex, ey] = [C + ARCHITECT_MOUNTS.core[0][0], C + ARCHITECT_MOUNTS.core[0][1]];
  dome(g, ex, ey, 15, 15, { ramp: LENS, amb: 0.15, diff: 0.5, spec: 0.9, pow: 30 });
  for (let y = Math.floor(ey - 12); y <= ey + 12; y++) for (let x = Math.floor(ex - 12); x <= ex + 12; x++) {
    const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey);
    if (d > 11.5 || d < 4.5) continue;
    const t = (d - 4.5) / 7;
    const a = Math.atan2(y + 0.5 - ey, x + 0.5 - ex);
    const stri = Math.sin(a * 12) > 0.55 ? -0.9 : 0;
    g.set(x, y, MAGENTA[quant(4.6 - t * 3.2 + stri, x, y, 0.8) - 1]);
  }
  glow(g, ex, ey, 4.6, MAGENTA, 0, 5);
  plate(g, poly([ex - 1.2, ey - 4.5, ex + 1.2, ey - 4.5, ex + 1.2, ey + 4.5, ex - 1.2, ey + 4.5]), { ramp: MAGENTA, base: 1, bevel: 0 });
  for (const [x, y] of [[ex - 7, ey - 9], [ex - 6, ey - 9], [ex - 8, ey - 8], [ex - 7, ey - 8]]) g.set(x, y, 'w');
  g.set(ex + 6, ey + 7, 'h');
  void [rivet, M];
  return g;
}
