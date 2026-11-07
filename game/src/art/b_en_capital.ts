// =====================================================================================
//  ENEMY ART — mid-boss capital ships (nose pointing DOWN, light from the top-left).
//   en_frigate (56): twin-prong prow with a charged spinal cannon, segmented armour plates,
//                    stepped bridge, spine turrets, swept wings with missile hatches and
//                    gun pods, triple engine block with fins.
//   en_carrier (72): wide rear sponsons, armour belts, flight deck with runway lights and
//                    parked fighters, two lit hangar bays, command island, four engines.
// =====================================================================================
import type { PixelMap } from './pixel';
import { Grid, type Mask } from './b_en_kit';

const METAL = 'KgGhH';

/** A raised armour plate: bevelled, casting a 1px shadow to the bottom-right. */
function plate(g: Grid, m: Mask, base: number, bevel = 1.5): void {
  g.castShadow(m, 1, 1, 1);
  g.shade(m, { base, bevel, hi: 2.6, lo: 2 });
}

/** Domed turret: metal barrel(s) pointing down, dark collar, palette dome with a highlight. */
function turret(g: Grid, cx: number, cy: number, r: number, barrelLen: number, twin = false): void {
  const top = Math.floor(cy);
  const len = Math.ceil(r) + barrelLen;
  const cols = twin ? [Math.floor(cx) - 2, Math.floor(cx) + 1] : [Math.floor(cx) - 1, Math.floor(cx)];
  for (const x of cols) g.fill(g.rect(x, top, 1, len), twin ? 'G' : 'h');
  if (!twin) g.fill(g.rect(cols[1], top, 1, len), 'G');
  for (const x of cols) g.set(x, top + len - 1, 'K');
  const dome = g.circle(cx, cy, r);
  g.castShadow(g.circle(cx, cy, r + 0.9), 1, 1, 1);
  g.fill(g.circle(cx, cy, r + 0.9), 'k');
  g.shade(dome, { base: 3, bevel: r, round: true, hi: 2.8 });
  g.set(Math.floor(cx - r * 0.45), Math.floor(cy - r * 0.45), '5');
}

/** Engine nozzle glow block (3 rows) starting at the rear edge y0. */
function nozzle(g: Grid, x0: number, y0: number, w: number): void {
  const mid = (w - 1) / 2;
  for (let i = 0; i < w; i++) {
    const d = Math.abs(i - mid) / Math.max(1, mid);
    g.set(x0 + i, y0, d < 0.34 ? 'Y' : d < 0.75 ? 'y' : 'E');
    g.set(x0 + i, y0 + 1, d < 0.34 ? 'y' : d < 0.75 ? 'E' : 'e');
    g.set(x0 + i, y0 + 2, d < 0.75 ? 'e' : 'K');
  }
}

/** Row of dark vent slots inside a rectangle (every other column). */
function vents(g: Grid, x: number, y: number, w: number, h: number): void {
  g.paint(g.rect(x, y, w, h), (px) => ((px - x) % 2 === 0 ? 'n' : ''));
}

/** en_frigate (56) — mid-boss frigate. */
export function drawFrigate(): PixelMap {
  const g = new Grid(56, 56);
  // --- swept wings with armour plates, missile hatches and gun pods
  const wing = g.sym(g.poly([22.5, 37.5, 22, 13, 6.5, 21.5, 2.4, 29, 2.8, 35.6, 8, 38.6]));
  g.shade(wing, { base: 1.8, bevel: 2.2 });
  const wingPlate = g.and(g.shrink(wing, 1), g.sym(g.poly([22, 16.5, 12.5, 21.5, 12.5, 34.6, 22, 34.6])));
  plate(g, wingPlate, 2.7);
  g.darken(g.and(wingPlate, g.sym(g.rect(12, 28, 10, 1))), 1);
  for (const hx of [13, 16, 19]) {
    g.fill(g.sym(g.rect(hx, 31, 2, 2)), 'K');
    g.plotSym([hx, 31], 'n').plotSym([hx + 1, 32], 'r');
  }
  g.plotSym([20, 18, 13, 21], 'h');
  const podBarrels = g.sym(g.rect(8, 36, 2, 10));
  g.shade(podBarrels, { ramp: METAL, base: 2.3, bevel: 1, hi: 3 });
  g.fill(g.sym(g.rect(7, 42, 4, 2)), 'G').plotSym([7, 42], 'h');
  g.fill(g.sym(g.rect(8, 45, 2, 1)), 'K');
  const pods = g.sym(g.capsule(9, 21.5, 9, 37, 2.7));
  g.castShadow(pods, 1, 1);
  g.shade(pods, { base: 3, bevel: 2.7, round: true });
  g.darken(g.and(pods, g.sym(g.or(g.rect(6, 26, 6, 1), g.rect(6, 32, 6, 1)))), 2);
  g.plotSym([8, 20, 9, 20], 'E').plotSym([8, 19], 'y');
  g.plot([3, 30, 4, 31], 'R').plot([52, 30, 51, 31], 'T');
  // --- engine block with side fins and three nozzles
  const fins = g.sym(g.poly([16.5, 4.5, 11, 1.6, 10.4, 6.4, 15.5, 10]));
  g.shade(fins, { base: 1.8, bevel: 1.4 });
  const block = g.poly([16, 3.4, 40, 3.4, 42, 6.4, 40.5, 11.6, 15.5, 11.6, 14, 6.4]);
  g.shade(block, { base: 2.2, bevel: 2 });
  vents(g, 18, 8, 7, 2);
  vents(g, 32, 8, 7, 2);
  g.plot([27, 8, 28, 8], 'o').plot([27, 9, 28, 9], 'e');
  nozzle(g, 19, 1, 5);
  nozzle(g, 26, 1, 4);
  nozzle(g, 32, 1, 5);
  // --- main hull (twin-prong prow) with segmented armour plates
  const hull = g.sym(g.poly([28, 8, 22, 8, 21, 14, 20.5, 38, 22.5, 46, 23.4, 54.8, 25.6, 50.5, 25.9, 44.5, 28, 44]));
  g.castShadow(hull, 1, 1, 2);
  g.shade(hull, { base: 2.2, bevel: 2 });
  for (const [y0, y1] of [[14, 24], [25, 33], [34, 42]] as [number, number][]) plate(g, g.and(hull, g.rect(24, y0, 8, y1 - y0)), 3.1);
  for (const [y0, y1] of [[12, 23], [24, 37]] as [number, number][]) plate(g, g.and(g.shrink(hull, 1), g.sym(g.rect(21, y0, 3, y1 - y0))), 2.6);
  plate(g, g.and(hull, g.sym(g.poly([22.4, 44.6, 25.6, 44.6, 25.2, 49.6, 23.6, 52.8]))), 2.9, 1.2);
  g.plotSym([23, 24, 23, 33, 23, 41], 'y');
  // spinal cannon charging between the prongs
  g.fill(g.rect(27, 44, 2, 9), 't');
  g.plot([27, 45, 28, 46, 27, 47, 28, 48, 27, 49, 28, 50, 27, 51], 'T').plot([27, 52, 28, 52], 'q');
  g.plotSym([26, 45, 26, 48, 26, 51], 'h');
  // --- stepped bridge tower
  const lower = g.poly([23.4, 12.4, 32.6, 12.4, 33.6, 14.4, 33.6, 21.6, 31.6, 23.6, 24.4, 23.6, 22.4, 21.6, 22.4, 14.4]);
  g.castShadow(lower, 2, 2, 1);
  g.shade(lower, { base: 2.9, bevel: 1.6 });
  const upper = g.poly([25, 13.8, 31, 13.8, 31.6, 15.2, 31.6, 19.4, 30.4, 20.6, 25.6, 20.6, 24.4, 19.4, 24.4, 15.2]);
  plate(g, upper, 3.6, 1.4);
  g.fill(g.rect(25, 22, 6, 1), 'c').plot([25, 22], 'q').plot([26, 22, 27, 22], 'C');
  g.fill(g.rect(26, 16, 4, 1), 'K').plot([26, 18, 28, 18], 'h');
  g.plot([25, 10, 25, 11], 'h').plot([25, 9], 'R').plot([30, 10, 30, 11], 'G').plot([30, 9], 'y');
  // --- turrets
  turret(g, 28, 29.2, 3, 5);
  turret(g, 28, 38.4, 2.3, 4, true);
  turret(g, 16.5, 24.6, 1.9, 3, true);
  turret(g, 39.5, 24.6, 1.9, 3, true);
  return g.outline().toMap();
}

/** en_carrier (72) — mid-boss carrier. */
export function drawCarrier(): PixelMap {
  const g = new Grid(72, 72);
  const hull = g.sym(g.poly([36, 2.6, 18, 2.6, 12, 5.6, 7.4, 5.6, 2.8, 10.4, 2.8, 24.6, 7.6, 29, 7.6, 51, 11.6, 60, 19.6, 66.4, 27.6, 69.6, 36, 69.6]));
  g.shade(hull, { base: 2.1, bevel: 2.2 });
  // --- sponsons (rear, wide): armour plates with PD turrets
  const sponson = g.and(g.shrink(hull, 1), g.sym(g.poly([13, 8, 4, 11.5, 4, 23.6, 8.6, 27.4, 15, 27.4, 15, 8])));
  plate(g, sponson, 2.7);
  g.darken(g.and(sponson, g.sym(g.rect(4, 17, 11, 1))), 1);
  // --- side armour belts along the hull
  for (let y = 30; y < 58; y += 7) plate(g, g.and(g.shrink(hull, 1), g.sym(g.rect(8, y, 5, 6))), 2.5, 1.2);
  // --- inner hull plating between sponsons/belts and the deck
  for (const [y0, y1] of [[10, 19], [20, 28], [29, 40]] as [number, number][]) plate(g, g.and(hull, g.sym(g.rect(16, y0, 11, y1 - y0))), 2.9);
  g.darken(g.and(hull, g.sym(g.rect(15, 9, 1, 33))), 1);
  // missile cells on the rear plates + reactor vents
  for (const cx of [18, 21, 24]) {
    g.fill(g.sym(g.rect(cx, 12, 2, 2)), 'K');
    g.plotSym([cx, 12], 'n').plotSym([cx + 1, 13], 'r');
  }
  vents(g, 17, 22, 9, 3);
  vents(g, 46, 22, 9, 3);
  g.plotSym([17, 25, 25, 25], 'o');
  // --- engine block + four nozzles
  const block = g.rect(16, 3, 40, 6);
  g.shade(block, { base: 2, bevel: 1.6 });
  vents(g, 17, 6, 5, 2);
  vents(g, 50, 6, 5, 2);
  nozzle(g, 18, 1, 6);
  nozzle(g, 27, 1, 5);
  nozzle(g, 40, 1, 5);
  nozzle(g, 48, 1, 6);
  // --- flight deck (recessed runway)
  const deck = g.and(hull, g.rect(28, 10, 16, 60));
  g.castShadow(g.rect(27, 9, 18, 1), 0, 1, 1);
  g.shade(deck, { base: 1.1, bevel: 1, hi: 1.4, lo: 0.8 });
  g.paint(g.rect(35, 13, 2, 52), (_x, y) => (y % 6 < 3 ? '4' : ''));
  g.paint(g.or(g.rect(28, 11, 1, 58), g.rect(43, 11, 1, 58)), (_x, y) => (y % 5 === 0 ? 'T' : y % 5 === 2 ? 't' : ''));
  for (let k = 0; k < 3; k++) {
    const yy = 59 + k * 3;
    g.plot([32, yy, 33, yy + 1, 39, yy, 38, yy + 1], 'y');
  }
  // parked fighters on the deck
  for (const [fx, fy] of [[30, 18], [39, 24], [30, 30]] as [number, number][]) {
    g.stamp(['.h.', 'GhG', '.g.'], fx, fy);
  }
  // --- hangar bays (recessed, lit interior, hazard lip)
  for (const bx of [15, 47]) {
    const bay = g.rect(bx, 44, 10, 14);
    g.fill(g.edge(g.grow(bay, 1), 'all'), 'g');
    g.plot([bx - 1, 43], 'h');
    g.paint(bay, (x, y) => (y === 44 ? 'K' : y === 45 ? (x % 2 ? 'o' : 'n') : 'd'));
    g.paint(g.rect(bx + 4, 47, 2, 10), (_x, y) => (y % 3 === 0 ? 'T' : 't'));
    g.stamp(['.h.', 'GhG', 'g.g'], bx + 1, 50);
    g.stamp(['.h.', 'GhG', 'g.g'], bx + 6, 53);
    g.paint(g.rect(bx - 1, 58, 12, 1), (x) => (x % 2 ? 'y' : 'k'));
  }
  // --- command island (offset to starboard)
  const island = g.poly([47.4, 28.6, 56.6, 28.6, 58.6, 31.4, 58.6, 39, 56.4, 41.4, 48.6, 41.4, 46.4, 39, 46.4, 31.4]);
  g.castShadow(island, 2, 3, 1);
  g.shade(island, { base: 3, bevel: 1.8 });
  const tower = g.poly([49, 30, 55, 30, 56.4, 32, 56.4, 36.4, 55, 38, 49, 38, 47.6, 36.4, 47.6, 32]);
  plate(g, tower, 3.6, 1.4);
  g.fill(g.rect(49, 39, 7, 1), 'c').plot([49, 39], 'q').plot([50, 39, 51, 39], 'C');
  const radar = g.circle(52.4, 33.6, 2.1);
  g.shade(radar, { ramp: METAL, base: 2.8, bevel: 2.1, round: true });
  g.plot([52, 33], 'K').plot([55, 31], 'R').plot([49, 31], 'y');
  // --- point-defence turrets
  turret(g, 9.5, 14, 2.4, 2, true);
  turret(g, 62.5, 14, 2.4, 2, true);
  turret(g, 20, 35, 2.6, 3);
  turret(g, 10.5, 41.6, 2, 3, true);
  turret(g, 61.5, 41.6, 2, 3, true);
  // --- hull rivets + running lights
  g.plotSym([14, 31, 14, 39, 14, 43, 14, 51], 'h');
  g.plot([3, 18, 3, 22], 'R').plot([68, 18, 68, 22], 'T').plot([20, 65, 51, 65], 'o');
  return g.outline().toMap();
}
