// boss_dreadnought (128 px) — Thalassa ocean battleship seen from above, bow pointing DOWN.
// Long clean hull (wake-friendly outline) with an armour belt, planked deck, fore triple turret,
// raised fore barbette + aft barbette (cannon sockets), stepped superstructure (long cast
// shadows) with bridge windows, funnel reactor (core mount), radar mast, secondary twin turrets,
// a missile hatch grid, side sponsons with turret sockets and a stern drone pad (pod sockets).
import {
  Grid, type Shape, plate, poly, circle, ellipse, rect, chamferRect, dome, barrel, ridge,
  rivetLine, glow, lamp, socket, fill, vent, groove, ring, GREY, FIRE, TEAL,
} from './b_boss_kit';
import { DREADNOUGHT_MOUNTS } from './b_boss_mounts';

const S = 128;
const C = S / 2;

/** Left half of the hull outline (x, y); mirrored to close the polygon. */
const HULL_L = [
  [51, 2], [45, 4], [41, 9], [37, 18], [34, 30], [33, 40], [33, 80], [35, 92], [40, 104], [46, 113], [55, 121], [64, 126],
];

function hullShape(inset: number): Shape {
  const left = HULL_L.map(([x, y]) => [x + inset, y + (y < 10 ? inset : y > 120 ? -inset * 1.6 : 0)]);
  const right = [...left].reverse().map(([x, y]) => [S - x, y]);
  return poly([...left.flat(), ...right.flat()]);
}

function tripleTurret(g: Grid, cx: number, cy: number): void {
  for (const dx of [-5, 0, 5]) {
    barrel(g, cx + dx, cy + 4, cx + dx, cy + 23, 1.7, { ramp: GREY, spec: 0.9, rim: 1, drop: 2 });
    fill(g, rect(cx + dx - 1, cy + 20, 2, 1), 'h');
    fill(g, rect(cx + dx - 1, cy + 23, 2, 1), 'k');
  }
  plate(g, circle(cx, cy, 11.5), { base: 2, bevel: 1, hi: 1.6, lo: 1.4, rim: 2, drop: 2 });
  const hous = poly([cx - 9, cy - 8, cx - 5, cy - 11, cx + 5, cy - 11, cx + 9, cy - 8, cx + 11, cy + 5, cx + 8, cy + 9, cx - 8, cy + 9, cx - 11, cy + 5]);
  plate(g, hous, { base: 4, bevel: 2, hi: 1.2, lo: 2.2, rim: 2, drop: 2 });
  plate(g, poly([cx - 6, cy - 7, cx + 6, cy - 7, cx + 7, cy + 3, cx - 7, cy + 3]), { base: 3, bevel: 1, hi: 1.6, lo: 1.2, rim: 1 });
  dome(g, cx - 3, cy - 3, 2.4, 2.4, { ramp: GREY, amb: 0.25, spec: 0.8, drop: 1 });
  for (const dx of [-9, 8]) { g.set(cx + dx, cy - 4, 'k'); g.set(cx + dx, cy - 3, 'T'); }
  rivetLine(g, cx - 7, cy + 7, cx + 6, cy + 7, 3);
}

/** Secondary twin turret (built-in), barrels angled outwards/down. */
function twinTurret(g: Grid, cx: number, cy: number, side: number): void {
  for (const dv of [-1.2, 1.2]) {
    barrel(g, cx + dv, cy, cx + dv + side * 3, cy + 8, 0.9, { ramp: GREY, spec: 0.9, drop: 1 });
  }
  plate(g, circle(cx, cy, 4.6), { base: 4, bevel: 1, hi: 1.2, lo: 2.2, rim: 2, drop: 2 });
  g.set(Math.floor(cx) - 1, Math.floor(cy) - 1, '5');
  g.set(Math.floor(cx), Math.floor(cy) + 1, '2');
}

/** Draws the Dreadnought body as a palette-independent code grid. */
export function drawDreadnought(): Grid {
  const g = new Grid(S, S);

  // ---- sponsons (bulges on the hull sides) carrying the turret sockets
  for (const [x, y] of DREADNOUGHT_MOUNTS.turret) plate(g, circle(C + x, C + y, 9), { base: 2, bevel: 1, hi: 1.6, lo: 1.2, rim: 2 });

  // ---- hull side (dark), armour belt, deck (inset)
  plate(g, hullShape(0), { base: 2, bevel: 1, hi: 1.8, lo: 1, rim: 2 });
  const deck = hullShape(2.5);
  plate(g, deck, { base: 3, bevel: 1, hi: 1.4, lo: 1.4, rim: 0 });
  for (let x = 40; x < S - 39; x += 4) {
    for (let y = 6; y < 124; y++) {
      if (!deck.has(x, y) || !deck.has(x - 1, y) || !deck.has(x + 1, y)) continue;
      if ((y + x * 5) % 23 === 0) continue;
      g.shade(x, y, -1, 1);
    }
  }
  for (let y = 8; y < 118; y += 6) { g.shade(34, y, 2); g.shade(S - 35, y, 1); }
  for (const y of [28, 86]) groove(g, 37, y, S - 38, y, 1, 1);

  // ---- bow: forecastle, breakwater, anchors, missile hatch grid
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
  tripleTurret(g, C, 97);
  // vertical launch hatches beside the fore barbette
  for (const s of [-1, 1]) for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
    const x = s < 0 ? 41 + i * 4 : S - 44 - i * 4, y = 76 + j * 4;
    fill(g, rect(x, y, 3, 3), '2');
    g.set(x, y, '4'); g.set(x + 2, y + 2, '1');
  }

  // ---- side sponson turret sockets + secondary twin turrets
  for (const [x, y] of DREADNOUGHT_MOUNTS.turret) socket(g, C + x, C + y, 7);
  for (const y of [38, 60]) { twinTurret(g, 43, y, -1); twinTurret(g, S - 43, y, 1); }

  // ---- stern drone pad (pod sockets) with landing ring
  plate(g, chamferRect(46, 5, 36, 13, 4), { base: 4, bevel: 1, hi: 1.2, lo: 1.8, rim: 2, drop: 1 });
  for (const [x, y] of DREADNOUGHT_MOUNTS.pod) socket(g, C + x, C + y, 5.5);
  plate(g, ring(C, 11, 3, 4.6), { ramp: ['K', 'e', 'E', 'y', 'y'], base: 4, bevel: 0 });

  // ---- superstructure: deckhouse, second tier, bridge (stepped, long cast shadows)
  plate(g, chamferRect(47, 30, 34, 50, 7), { base: 3, bevel: 2, hi: 1.6, lo: 1.8, rim: 2, drop: 3 });
  for (const x of [50, S - 51]) rivetLine(g, x, 38, x, 72, 5);
  for (const y of [44, 54]) for (const x of [44.5, S - 44.5]) dome(g, x, y, 1.9, 3.8, { amb: 0.3, spec: 0.6, rim: 1, drop: 1 });
  plate(g, chamferRect(51, 46, 26, 30, 6), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 3 });
  plate(g, poly([53, 60, 75, 60, 78, 69, 73, 77, 55, 77, 50, 69]), { base: 4, bevel: 2, hi: 1.2, lo: 2.2, rim: 2, drop: 3 });
  plate(g, poly([56, 61, 72, 61, 74, 67, 54, 67]), { base: 5, bevel: 1, hi: 0, lo: 1.4, rim: 0 });
  for (let x = 54; x < 74; x++) { g.set(x, 72, (x & 1) ? 'T' : 'u'); g.set(x, 73, 't'); }
  g.set(53, 71, 't'); g.set(74, 71, 't');
  // radar mast + yardarm + dish
  ridge(g, 55, 53, 72, 53, 2, 1);
  plate(g, rect(62, 48, 4, 12), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 1, drop: 2 });
  dome(g, C, 51, 5, 2.8, { ramp: GREY, amb: 0.3, spec: 0.8, rim: 1, drop: 2 });
  glow(g, C, 51, 1.3, TEAL, 0, 4.6);
  // funnel / reactor stack (core mount) + exhaust vents
  const [fx, fy] = [C + DREADNOUGHT_MOUNTS.core[0][0], C + DREADNOUGHT_MOUNTS.core[0][1]];
  plate(g, ellipse(fx, fy, 8.5, 9.5), { base: 4, bevel: 2, hi: 1.2, lo: 2, rim: 2, drop: 3 });
  plate(g, ellipse(fx, fy - 0.5, 6, 7), { ramp: GREY, base: 1, bevel: 1, hi: -0.6, lo: 1.6 });
  glow(g, fx, fy, 4.2, FIRE, 0, 4.6);
  for (let y = fy - 5; y <= fy + 4; y += 3) groove(g, fx - 5, y, fx + 4, y, 1, 0);
  vent(g, 51, 33, 7, 5, FIRE, 2, 1);
  vent(g, S - 58, 33, 7, 5, FIRE, 2, 1);

  // ---- navigation lights (port red / starboard green) + deck lamps
  lamp(g, 35, 72, ['r', 'r', 'R', 'R', 'w'], true);
  lamp(g, S - 37, 72, ['i', 'l', 'V', 'V', 'w'], true);
  lamp(g, C - 1, 123, FIRE);
  for (const y of [22, 92]) { lamp(g, 37, y, TEAL); lamp(g, S - 38, y, TEAL); }
  return g;
}
