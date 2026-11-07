// boss_dreadnought (128 px) — Thalassa ocean battleship seen from above, bow pointing DOWN.
// Long clean hull (wake-friendly outline), planked deck, fore triple turret, raised fore
// barbette + aft barbette for heavy cannon parts, layered superstructure with bridge windows,
// funnel reactor (core mount), radar mast, side sponsons with turret sockets, stern drone deck.
import {
  Grid, type Shape, plate, poly, circle, ellipse, rect, chamferRect, dome, barrel, ridge,
  rivetLine, glow, lamp, socket, fill, vent, groove,
  GREY, FIRE, TEAL,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 128;
const C = S / 2;

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const DREADNOUGHT_MOUNTS: BossMounts = {
  turret: [[-25, -16], [25, -16], [-23, 14], [23, 14]],
  cannon: [[0, 20], [0, -42]],
  pod: [[-12, -56], [12, -56]],
  core: [[0, -20]],
  wing: [],
  muzzle: [[-5, 57], [0, 58], [5, 57]],
};

/** Left half of the hull outline (x, y); mirrored to close the polygon. */
const HULL_L = [
  [47, 2], [40, 4], [36, 10], [35, 22], [35, 82], [37, 93], [41, 104], [47, 113], [55, 121], [64, 126],
];

function hullShape(inset: number): Shape {
  const left = HULL_L.map(([x, y]) => [x + inset, y + (y < 10 ? inset : y > 120 ? -inset * 1.6 : 0)]);
  const right = [...left].reverse().map(([x, y]) => [S - x, y]);
  return poly([...left.flat(), ...right.flat()]);
}

function tripleTurret(g: Grid, cx: number, cy: number): void {
  for (const dx of [-5, 0, 5]) {
    barrel(g, cx + dx, cy + 4, cx + dx, cy + 21, 1.7, { ramp: GREY, spec: 0.8, rim: 1, drop: 1 });
    fill(g, rect(cx + dx - 1, cy + 19, 2, 1), 'h');
    fill(g, rect(cx + dx - 1, cy + 21, 2, 1), 'k');
  }
  plate(g, circle(cx, cy, 11), { base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2, drop: 2 });
  const hous = poly([cx - 9, cy - 7, cx - 5, cy - 10, cx + 5, cy - 10, cx + 9, cy - 7, cx + 10, cy + 5, cx + 7, cy + 9, cx - 7, cy + 9, cx - 10, cy + 5]);
  plate(g, hous, { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  plate(g, poly([cx - 6, cy - 6, cx + 6, cy - 6, cx + 7, cy + 3, cx - 7, cy + 3]), { base: 3, bevel: 1, hi: 1.6, lo: 1.2, rim: 1 });
  dome(g, cx - 3, cy - 2, 2.2, 2.2, { ramp: GREY, amb: 0.25, spec: 0.8 });
  for (const dx of [-8, 7]) { g.set(cx + dx, cy - 4, 'k'); g.set(cx + dx, cy - 3, 'T'); }
  rivetLine(g, cx - 7, cy + 7, cx + 6, cy + 7, 3);
}

/** Small twin AA mount on the deck edge, guns angled outwards/down. */
function aaMount(g: Grid, cx: number, cy: number, side: number): void {
  for (const dy of [0, 2]) { g.set(cx + side * 3, cy + dy, 'h'); g.set(cx + side * 4, cy + dy + 1, 'h'); g.set(cx + side * 5, cy + dy + 1, 'k'); }
  plate(g, circle(cx + 0.5, cy + 1.5, 3), { base: 4, bevel: 1, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  g.set(cx, cy + 1, 'K');
}

/** Draws the Dreadnought body as a palette-independent code grid. */
export function drawDreadnought(): Grid {
  const g = new Grid(S, S);

  // ---- sponsons (bulges on the hull sides) carrying the turret sockets
  for (const [x, y] of DREADNOUGHT_MOUNTS.turret) plate(g, circle(C + x, C + y, 9), { base: 2, bevel: 1, hi: 1.6, lo: 1.2, rim: 2 });

  // ---- hull side (dark) and deck (inset)
  plate(g, hullShape(0), { base: 2, bevel: 1, hi: 1.8, lo: 1, rim: 2 });
  const deck = hullShape(2);
  plate(g, deck, { base: 3, bevel: 1, hi: 1.2, lo: 1.2, rim: 0 });
  // longitudinal planking with staggered butt joints
  for (let x = 40; x < S - 39; x += 4) {
    for (let y = 6; y < 124; y++) {
      if (!deck.has(x, y) || !deck.has(x - 1, y) || !deck.has(x + 1, y)) continue;
      if ((y + x * 5) % 23 === 0) continue;
      g.shade(x, y, -1, 1);
    }
  }
  // deck-edge gunwale highlight + transverse frame lines
  for (let y = 6; y < 122; y++) for (let x = 36; x < S - 36; x++) {
    if (deck.has(x, y) && (!deck.has(x - 1, y) || !deck.has(x + 1, y))) g.shade(x, y, x < C ? 2 : 1);
  }
  for (const y of [26, 86]) groove(g, 39, y, S - 40, y, 1, 1);

  // ---- bow: forecastle plate, breakwater, anchors + chains
  plate(g, poly([47, 108, 64, 100, 81, 108, 72, 118, 64, 122, 56, 118]), { base: 4, bevel: 1, hi: 1.2, lo: 1.8, rim: 2, drop: 1 });
  ridge(g, 50, 108, 64, 101, 2, 1);
  ridge(g, 63, 101, 78, 108, 1, 1);
  for (const s of [-1, 1]) {
    const ax = C + s * 6 - (s > 0 ? 1 : 0);
    fill(g, rect(ax - 1, 114, 2, 2), 'K');
    for (let y = 108; y < 114; y += 2) g.set(ax, y, 'G');
  }

  // ---- barbettes: fore B + aft (cannon sockets), turret A (built-in triple turret)
  for (const [x, y] of DREADNOUGHT_MOUNTS.cannon) {
    plate(g, circle(C + x, C + y, 12), { base: 3, bevel: 2, hi: 1.6, lo: 1.8, rim: 2, drop: 2 });
    socket(g, C + x, C + y, 9.5);
  }
  tripleTurret(g, C, 98);

  // ---- side sponson turret sockets + twin AA mounts
  for (const [x, y] of DREADNOUGHT_MOUNTS.turret) socket(g, C + x, C + y, 7);
  for (const y of [32, 68, 92]) { aaMount(g, 41, y, -1); aaMount(g, S - 42, y, 1); }

  // ---- stern drone deck + pod sockets
  plate(g, chamferRect(44, 4, 40, 13, 4), { base: 4, bevel: 1, hi: 1.2, lo: 1.8, rim: 2, drop: 1 });
  for (const [x, y] of DREADNOUGHT_MOUNTS.pod) socket(g, C + x, C + y, 5.5);
  for (let x = 58; x < 70; x++) if ((x >> 1) % 2 === 0) { g.set(x, 6, 'y'); g.set(x, 13, 'y'); }

  // ---- superstructure: deckhouse, second tier, bridge, mast, funnel (core mount)
  plate(g, chamferRect(46, 30, 36, 50, 7), { base: 3, bevel: 2, hi: 1.6, lo: 1.8, rim: 2, drop: 2 });
  for (const x of [49, S - 50]) rivetLine(g, x, 38, x, 72, 5);
  for (const y of [40, 52]) for (const x of [43.5, S - 43.5]) dome(g, x, y, 1.9, 3.8, { amb: 0.3, spec: 0.6, rim: 1, drop: 1 });
  plate(g, chamferRect(50, 48, 28, 28, 6), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 2 });
  // bridge with wrap-around windows (front = bottom)
  plate(g, poly([53, 60, 75, 60, 78, 69, 73, 76, 55, 76, 50, 69]), { base: 4, bevel: 2, hi: 1.2, lo: 2.2, rim: 2, drop: 2 });
  plate(g, poly([56, 61, 72, 61, 74, 67, 54, 67]), { base: 5, bevel: 1, hi: 0, lo: 1.4, rim: 0 });
  for (let x = 54; x < 74; x++) { g.set(x, 71, (x & 1) ? 'T' : 'u'); g.set(x, 72, 't'); }
  g.set(53, 70, 't'); g.set(74, 70, 't');
  // radar mast + dish + yardarm
  ridge(g, 55, 55, 72, 55, 2, 1);
  plate(g, rect(62, 50, 4, 10), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 1, drop: 1 });
  dome(g, C, 53, 4.5, 2.6, { ramp: GREY, amb: 0.3, spec: 0.8, rim: 1, drop: 1 });
  glow(g, C, 53, 1.2, TEAL, 0, 4.4);
  // funnel / reactor stack (core mount)
  const [fx, fy] = [C + DREADNOUGHT_MOUNTS.core[0][0], C + DREADNOUGHT_MOUNTS.core[0][1]];
  plate(g, ellipse(fx, fy, 8, 9), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 2 });
  plate(g, ellipse(fx, fy - 0.5, 5.6, 6.4), { ramp: GREY, base: 1, bevel: 1, hi: -0.6, lo: 1.6 });
  glow(g, fx, fy, 4, FIRE, 0, 4.4);
  for (let y = fy - 5; y <= fy + 4; y += 3) groove(g, fx - 5, y, fx + 4, y, 1, 0);
  // vents on the deckhouse shoulders
  vent(g, 50, 33, 7, 5, FIRE, 2, 1);
  vent(g, S - 57, 33, 7, 5, FIRE, 2, 1);

  // ---- navigation lights (port red / starboard green) + deck lamps
  lamp(g, 37, 78, ['r', 'r', 'R', 'R', 'w'], true);
  lamp(g, S - 39, 78, ['i', 'l', 'V', 'V', 'w'], true);
  lamp(g, C - 1, 123, FIRE);
  for (const y of [20, 50]) { lamp(g, 39, y, TEAL); lamp(g, S - 40, y, TEAL); }
  return g;
}
