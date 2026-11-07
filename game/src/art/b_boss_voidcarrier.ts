// boss_voidcarrier (128 px) — The Rift space carrier, nose DOWN: a long tapered armoured hull
// ending in two heavy prongs around a wide glowing hangar maw (launch deck, landing lights),
// big swept-back wings with hardpoints, a reactor/bridge spine and a bank of engines at the rear.
import {
  Grid, type Shape, plate, poly, circle, rect, chamferRect, sym, dome, barrel, groove, ridge,
  rivetLine, glow, lamp, socket, fill, vent, quant, GREY, TEAL, MAGENTA,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 128;
const C = S / 2;

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const VOIDCARRIER_MOUNTS: BossMounts = {
  turret: [[-38, -6], [38, -6], [-22, 32], [22, 32]],
  cannon: [],
  pod: [[-53, -16], [53, -16]],
  core: [[0, -18]],
  wing: [[-30, 12], [30, 12]],
  muzzle: [[-22, 58], [22, 58], [0, 46]],
};

function engine(g: Grid, cx: number, cy: number, r: number): void {
  plate(g, circle(cx, cy, r), { ramp: GREY, base: 3, bevel: 1, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
  plate(g, circle(cx, cy - 0.5, r - 1.6), { ramp: GREY, base: 1, bevel: 1, hi: -0.6, lo: 1.4 });
  glow(g, cx, cy - 0.8, r - 2.4, TEAL, 0, 5);
}

/** Draws the Void Carrier body as a palette-independent code grid. */
export function drawVoidcarrier(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- big swept-back wings (behind the hull)
  plate(g, M(poly([42, 36, 14, 28, 3, 34, 3, 50, 20, 64, 42, 88])), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2 });
  // trailing-edge flaps (darker) and leading-edge armour (lighter)
  plate(g, M(poly([40, 40, 15, 32, 7, 36, 8, 42, 40, 52])), { base: 2, bevel: 1, hi: 1.4, lo: 1, rim: 2 });
  for (const x of [16, 24, 32]) { groove(g, x, 34 + (x - 16) * 0.3, x, 44 + (x - 16) * 0.3, 1, 0); groove(g, S - 1 - x, 34 + (x - 16) * 0.3, S - 1 - x, 44 + (x - 16) * 0.3, 1, 0); }
  plate(g, M(poly([4, 49, 21, 62, 42, 84, 42, 88, 20, 66, 3, 52])), { base: 4, bevel: 1, hi: 1, lo: 2, rim: 0 });
  for (const [x0, y0, x1, y1] of [[10, 50, 40, 74], [16, 46, 40, 64]]) { groove(g, x0, y0, x1, y1, 1); groove(g, S - 1 - x0, y0, S - 1 - x1, y1, 1); }
  // wing hardpoints: wingtip pod sockets + mid-wing turret sockets
  for (const [x, y] of VOIDCARRIER_MOUNTS.pod) {
    plate(g, circle(C + x, C + y, 7.5), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
    socket(g, C + x, C + y, 5.4);
  }
  for (const [x, y] of VOIDCARRIER_MOUNTS.turret.slice(0, 2)) socket(g, C + x, C + y, 7);
  lamp(g, 3, 44, ['r', 'r', 'R', 'R', 'w'], true);
  lamp(g, S - 5, 44, ['i', 'l', 'V', 'V', 'w'], true);

  // ---- engine bank (rear, top)
  plate(g, chamferRect(36, 5, 56, 18, 5), { ramp: GREY, base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2 });
  for (const [x, r] of [[42, 6], [53, 6.5], [C, 7.5], [S - 53, 6.5], [S - 42, 6]] as const) engine(g, x, x === C ? 11 : 12, r);

  // ---- main hull: tapered, layered
  const hull = poly([42, 18, 86, 18, 92, 38, 90, 70, 84, 96, 44, 96, 38, 70, 36, 38]);
  plate(g, hull, { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 2 });
  for (const s of [-1, 1]) {
    const X = (x: number) => (s < 0 ? x : S - x);
    plate(g, poly([X(38), 40, X(47), 36, X(47), 90, X(43), 92, X(39), 70]), { base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2, drop: 1 });
    vent(g, s < 0 ? 40 : S - 46, 46, 5, 11, MAGENTA, 2, 1);
    barrel(g, X(43), 62, X(43), 84, 1.5, { ramp: GREY, spec: 0.8, rim: 1 });
  }
  // flank plating seams
  for (const y of [30, 58, 66, 74]) { groove(g, 37, y, 47, y, 1); groove(g, S - 48, y, S - 38, y, 1); }
  // dorsal spine: long tapered hexagon with hatches and a centre seam
  plate(g, poly([56, 19, 72, 19, 79, 30, 79, 78, 72, 88, 56, 88, 49, 78, 49, 30]), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 2 });
  plate(g, poly([58, 22, 70, 22, 74, 28, 54, 28]), { base: 3, bevel: 1, hi: 1.4, lo: 1.6, rim: 1 });
  for (const y of [34, 58, 78]) groove(g, 51, y, S - 52, y, 1);
  for (const x of [52, S - 53]) rivetLine(g, x, 32, x, 76, 6);
  for (const [x, y] of [[54, 76], [S - 58, 76]]) {
    plate(g, chamferRect(x, y, 4, 7, 1), { base: 3, bevel: 1, hi: -1, lo: -1 });
    g.set(x + 1, y + 1, 'T');
  }

  // ---- reactor (core mount) + command bridge
  const [cx, cy] = [C + VOIDCARRIER_MOUNTS.core[0][0], C + VOIDCARRIER_MOUNTS.core[0][1]];
  plate(g, circle(cx, cy, 12), { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2, drop: 2 });
  plate(g, circle(cx, cy, 9.5), { ramp: GREY, base: 2, bevel: 1, hi: -1, lo: -1 });
  glow(g, cx, cy, 7, MAGENTA, 1, 5);
  plate(g, chamferRect(C - 9, 62, 18, 12, 4), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 2 });
  for (let x = C - 6; x < C + 6; x++) { g.set(x, 70, (x & 1) ? 'T' : 'u'); g.set(x, 71, 't'); }
  dome(g, C, 66, 2.6, 2.2, { ramp: GREY, amb: 0.3, spec: 0.9 });

  // ---- prongs around the hangar maw
  const prong = poly([36, 80, 50, 88, 52, 114, 46, 126, 40, 124, 34, 104]);
  plate(g, M(prong), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 2 });
  plate(g, M(poly([38, 92, 47, 94, 48, 112, 44, 120, 39, 106])), { base: 4, bevel: 1, hi: 1, lo: 2, rim: 1 });
  for (const [x, y] of VOIDCARRIER_MOUNTS.turret.slice(2)) socket(g, C + x, C + y, 6.5);
  for (const x of [42, S - 43]) { fill(g, rect(x, 121, 2, 2), 'k'); g.set(x, 122, 'M'); }

  // ---- hangar maw: launch bay glowing at the back, deck lines, landing lights
  const maw = poly([50, 92, 78, 92, 77, 122, 51, 122]);
  for (let y = maw.y0; y <= maw.y1; y++) for (let x = maw.x0; x <= maw.x1; x++) {
    if (!maw.has(x, y)) continue;
    const t = (y - 92) / 30;
    const q = quant(4.2 - t * 4, x, y, 1);
    g.set(x, y, t > 0.7 && q <= 1 ? 'k' : MAGENTA[q - 1]);
  }
  for (let y = 95; y < 122; y++) {
    const spread = (y - 92) * 0.3;
    g.set(Math.round(C - 5 - spread), y, 'K');
    g.set(Math.round(C + 4 + spread), y, 'K');
  }
  for (let y = 98; y < 122; y += 4) { g.set(C - 1, y, 'y'); g.set(C, y, 'y'); }
  for (let y = 96; y < 122; y += 3) { g.set(52, y, 'T'); g.set(S - 53, y, 'T'); }
  plate(g, rect(48, 88, 32, 5), { base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2 });
  for (let x = 50; x < 78; x += 4) { g.set(x, 90, 'y'); g.set(x + 1, 90, 'K'); }
  ridge(g, 50, 93, 77, 93, 1, 1);

  // ---- wing-root armour blocks (wing part mounts)
  for (const [x, y] of VOIDCARRIER_MOUNTS.wing) {
    plate(g, chamferRect(C + x - 5, C + y - 9, 10, 18, 3), { base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
    for (const dy of [-5, 0, 5]) groove(g, C + x - 3, C + y + dy, C + x + 2, C + y + dy, 1);
  }
  lamp(g, 36, 98, TEAL);
  lamp(g, S - 37, 98, TEAL);
  return g;
}
