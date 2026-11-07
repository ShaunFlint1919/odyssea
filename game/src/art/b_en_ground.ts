// =====================================================================================
//  ENEMY ART — ground units seen from above (they scroll with the terrain).
//  Turret-type units are split in a static base (gr_turret, gr_twin, gr_tank) and a
//  rotatable head of the SAME size (…Top functions): pivot = texture centre, barrel
//  pointing DOWN at rotation 0.
// =====================================================================================
import type { PixelMap } from './pixel';
import { Grid, rampChar } from './b_en_kit';

const METAL = 'KgGhH';

/** Octagon with chamfered corners inside a w x w box at margin m (continuous coords). */
function octagon(g: Grid, m: number, cut: number): number[] {
  const a = m, b = g.w - m;
  return [a + cut, a, b - cut, a, b, a + cut, b, b - cut, b - cut, b, a + cut, b, a, b - cut, a, a + cut];
}

/** Yellow/black diagonal hazard stripes in a rectangle. */
function hazard(g: Grid, x: number, y: number, w: number, h: number): void {
  g.paint(g.rect(x, y, w, h), (px, py) => ((px + py) % 4 < 2 ? 'y' : 'k'));
}

/** Recessed turret race (metal ring in a dark groove) with a dark pit under the head. */
function turretRace(g: Grid, c: number, rPit: number, rRace: number): void {
  g.fill(g.circle(c, c, rRace + 0.9), '1');
  const race = g.circle(c, c, rRace);
  g.shade(race, { ramp: METAL, base: 1.7, bevel: 1.4, hi: 1.6, lo: 1 });
  g.fill(g.circle(c, c, rPit), 'K');
}

/** Barrel pointing down: 2px tube from y0 to the bottom edge with a muzzle brake. */
function barrel(g: Grid, x: number, y0: number, y1: number, brake = true): void {
  const tube = g.rect(x, y0, 2, y1 - y0 + 1);
  g.shade(tube, { ramp: METAL, base: 2.5, bevel: 1, hi: 3 });
  if (brake) {
    g.fill(g.rect(x - 1, y1 - 2, 4, 2), 'G').plot([x - 1, y1 - 2], 'h').plot([x + 2, y1 - 1], 'g');
  }
  g.plot([x, y1, x + 1, y1], 'K');
}

/** gr_turret (20) — armoured octagonal base with a recessed turret race (head drawn separately). */
export function drawTurretBase(): PixelMap {
  const g = new Grid(20, 20);
  const base = g.poly(octagon(g, 1.2, 5));
  g.shade(base, { base: 2.2, bevel: 2.2 });
  turretRace(g, 10, 5, 6.6);
  g.plot([4, 4, 15, 4, 4, 15, 15, 15], 'h').plot([5, 4, 16, 4, 5, 15, 16, 15], '1');
  g.plot([9, 1, 10, 1], 'o').plot([9, 18, 10, 18], 'R');
  return g.outline().toMap();
}

/** gr_turret head (20) — compact dome with a long single barrel and a sensor eye. */
export function drawTurretTop(): PixelMap {
  const g = new Grid(20, 20);
  barrel(g, 9, 11, 19);
  g.fill(g.rect(8, 13, 4, 2), 'G').plot([8, 13], 'h').plot([11, 14], 'g');
  const dome = g.circle(10, 9.6, 4.1);
  g.castShadow(dome, 1, 1);
  g.shade(dome, { base: 2.8, bevel: 4.1, round: true, hi: 2.8 });
  g.plot([8, 7, 9, 7], '5').plot([8, 8], '5');
  g.plot([11, 11], 'R').plot([12, 11], 'r');
  return g.outline().toMap();
}

/** gr_twin (28) — square emplacement with hazard stripes and a wide turret race. */
export function drawTwinBase(): PixelMap {
  const g = new Grid(28, 28);
  const base = g.poly(octagon(g, 1.2, 6));
  g.shade(base, { base: 2.1, bevel: 3 });
  const deck = g.poly(octagon(g, 4.2, 4));
  g.shade(deck, { base: 2.5, bevel: 1.4 });
  hazard(g, 9, 24, 10, 2);
  hazard(g, 9, 2, 10, 2);
  turretRace(g, 14, 6.6, 8.6);
  g.plotSym([5, 5, 5, 22], 'R').plotSym([6, 6, 6, 21], '1');
  g.plotSym([2, 12, 2, 14, 2, 16], 'n');
  return g.outline().toMap();
}

/** gr_twin head (28) — armoured housing with two long barrels and a sensor window. */
export function drawTwinTop(): PixelMap {
  const g = new Grid(28, 28);
  barrel(g, 9, 16, 26);
  barrel(g, 17, 16, 26);
  const house = g.poly([9.2, 8, 18.8, 8, 20.8, 10.5, 20.8, 17.5, 18.8, 19.8, 9.2, 19.8, 7.2, 17.5, 7.2, 10.5]);
  g.castShadow(house, 1, 1);
  g.shade(house, { base: 2.9, bevel: 2.4, round: true });
  g.darken(g.rect(9, 13, 10, 1), 1);
  g.fill(g.rect(12, 16, 4, 2), 'c').plot([12, 16], 'q').plot([13, 16], 'C');
  g.plot([10, 10, 17, 10], 'h').plot([11, 11, 16, 11], '1').plot([14, 10], 'R');
  return g.outline().toMap();
}

/** gr_tank (24) — tracked hull: treads with tread pattern, engine deck, glacis, headlights. */
export function drawTankBase(): PixelMap {
  const g = new Grid(24, 24);
  const treads = g.sym(g.rect(2, 1, 5, 22));
  g.paint(treads, (x, y) => {
    const outer = x === 2 || x === 21;
    if (y % 3 === 0) return outer ? 'g' : 'K';
    if (outer) return x === 2 ? 'h' : 'G';
    return y % 3 === 1 ? 'G' : 'g';
  });
  const hull = g.rect(6, 2, 12, 20);
  g.castShadow(hull, 1, 0, 1);
  g.shade(hull, { base: 2.5, bevel: 2 });
  g.lighten(g.rect(8, 19, 8, 1), 1);
  g.paint(g.rect(8, 3, 8, 3), (x, y) => (x % 2 === 0 && y < 5 ? 'n' : ''));
  g.plot([7, 2, 16, 2], 'K').plot([7, 3, 16, 3], 'g');
  g.plot([7, 21, 16, 21], 'y').plot([8, 21, 15, 21], 'o');
  g.darken(g.ring(12, 12, 4.6, 5.6), 2);
  g.plot([8, 7, 8, 17], 'h').plot([15, 7, 15, 17], '1');
  return g.outline().toMap();
}

/** gr_tank head (24) — angular turret with a long main gun and a commander hatch. */
export function drawTankTop(): PixelMap {
  const g = new Grid(24, 24);
  barrel(g, 11, 15, 23);
  const tur = g.poly([8.6, 6.5, 15.4, 6.5, 17.4, 9.5, 17.4, 14.5, 15, 16.6, 9, 16.6, 6.6, 14.5, 6.6, 9.5]);
  g.castShadow(tur, 1, 1);
  g.shade(tur, { base: 2.9, bevel: 2.4 });
  g.fill(g.rect(10, 15, 4, 2), 'G').plot([10, 15], 'h').plot([13, 16], 'g');
  const hatch = g.circle(14.5, 10, 1.7);
  g.shade(hatch, { ramp: METAL, base: 2.5, bevel: 1.7, round: true });
  g.plot([9, 9], 'K').plot([9, 8], 'h').plot([10, 13], '2').plot([11, 13], '2');
  return g.outline().toMap();
}

/** gr_crawler (20) — six-legged armoured walker with a sensor head. */
export function drawCrawler(): PixelMap {
  const g = new Grid(20, 20);
  for (const [y0, dy] of [[6.5, -3], [10, -1.6], [13.5, 0.6]] as [number, number][]) {
    const kneeX = 3.4, kneeY = y0 + dy, footX = 1.6, footY = y0 + dy + 4.2;
    const leg = g.sym(g.or(g.capsule(8, y0, kneeX, kneeY, 0.75), g.capsule(kneeX, kneeY, footX, footY, 0.6)));
    g.shade(leg, { ramp: METAL, base: 2, bevel: 1, hi: 3 });
    g.plotSym([Math.floor(kneeX), Math.floor(kneeY)], 'h');
  }
  const body = g.ellipse(10, 9.6, 4.8, 6.6);
  g.castShadow(body, 1, 1);
  g.shade(body, { base: 2.8, bevel: 4.2, round: true });
  g.darken(g.rect(10, 4, 1, 10), 1);
  g.darken(g.rect(6, 9, 8, 1), 1);
  g.plot([8, 6, 12, 6], 'T');
  const head = g.ellipse(10, 16, 3.2, 2.4);
  g.shade(head, { base: 2, bevel: 2.4, round: true });
  g.plot([8, 16, 11, 16], 'R').plot([9, 17, 10, 17], 'y');
  return g.outline().toMap();
}

/** gr_bunker (32) — sloped armoured bunker with gun slits, roof hatch, vents and antenna. */
export function drawBunker(): PixelMap {
  const g = new Grid(32, 32);
  const walls = g.poly(octagon(g, 1.4, 7));
  g.shade(walls, { base: 2.4, bevel: 5 });
  const roof = g.poly(octagon(g, 7, 3));
  g.shade(roof, { base: 2.8, bevel: 1.4 });
  g.darken(g.and(roof, g.or(g.rect(16, 8, 1, 16), g.rect(8, 16, 16, 1))), 1);
  // gun slits (front) with barrels, and side slits
  for (const sx of [8, 14, 20]) {
    g.fill(g.rect(sx, 26, 4, 2), 'k');
    g.plot([sx + 1, 27, sx + 2, 27], 'G').plot([sx + 1, 26], 'r').plot([sx + 2, 26], 'p');
  }
  g.fill(g.sym(g.rect(3, 12, 2, 8)), 'k');
  g.plotSym([3, 15, 3, 16], 'r');
  // roof hatch, vents, rivets, antenna
  const hatch = g.circle(12, 12, 2.6);
  g.castShadow(hatch, 1, 1);
  g.shade(hatch, { ramp: METAL, base: 2.4, bevel: 2.6, round: true });
  g.plot([12, 11, 12, 12], 'g');
  g.paint(g.rect(17, 18, 6, 4), (x, y) => (y % 2 === 0 ? 'n' : x % 2 ? '2' : ''));
  g.plotSym([9, 9, 9, 22], 'h');
  g.fill(g.rect(21, 10, 2, 2), 'K').plot([21, 10], 'h').plot([22, 9], 'R');
  return g.outline().toMap();
}

/** gr_silo (28) — missile silo: bevelled rim, hazard ring, sliding doors parted over a warhead. */
export function drawSilo(): PixelMap {
  const g = new Grid(28, 28);
  const rim = g.circle(14, 14, 12.7);
  g.shade(rim, { base: 2.2, bevel: 3.2, round: true });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const x = Math.floor(14 + Math.cos(a) * 11.2), y = Math.floor(14 + Math.sin(a) * 11.2);
    g.set(x, y, 'R');
  }
  g.paint(g.ring(14, 14, 9.2, 10.4), (x, y) => {
    const a = Math.atan2(y + 0.5 - 14, x + 0.5 - 14);
    return Math.floor(((a + Math.PI) / (Math.PI * 2)) * 20) % 2 ? 'y' : 'k';
  });
  const pit = g.circle(14, 14, 9.2);
  g.fill(pit, 'k');
  const head = g.circle(14, 14.4, 3.4);
  g.shade(head, { ramp: 'prR', base: 1.4, bevel: 3.4, round: true });
  g.plot([13, 12], 'H').plot([14, 12], 'R');
  const doorL = g.and(pit, g.rect(0, 0, 12, 28));
  const doorR = g.and(pit, g.rect(16, 0, 12, 28));
  g.shade(doorL, { base: 3, bevel: 1.6 });
  g.shade(doorR, { base: 3, bevel: 1.6 });
  // door ribs and inner edge chevrons
  g.darken(g.and(g.or(doorL, doorR), g.or(g.rect(0, 9, 28, 1), g.rect(0, 18, 28, 1))), 1);
  g.plot([11, 11, 11, 13, 11, 15, 11, 17], 'y').plot([16, 12, 16, 14, 16, 16], 'y');
  return g.outline().toMap();
}

/** gr_radar (24) — radar dish on a platform with a beacon and supply crates (weak loot carrier). */
export function drawRadar(): PixelMap {
  const g = new Grid(24, 24);
  const plat = g.poly([4.4, 8.4, 19.6, 8.4, 22.6, 11.4, 22.6, 22.6, 1.4, 22.6, 1.4, 11.4]);
  g.shade(plat, { base: 2, bevel: 1.6 });
  for (const [x, y] of [[2, 18], [19, 18]] as [number, number][]) {
    const crate = g.rect(x, y, 3, 4);
    g.shade(crate, { ramp: 'peEyY', base: 1.6, bevel: 1, hi: 1.5 });
    g.plot([x, y + 1, x + 1, y + 1, x + 2, y + 1], 'p');
  }
  g.fill(g.rect(11, 19, 2, 2), 'K').plot([11, 19], 'R').plot([12, 19], 'r');
  g.plot([6, 21, 8, 21, 15, 21, 17, 21], 'n');
  // dish: bright upper-left rim, shadowed inner crescent, lit lower-right inner wall
  const cx = 12, cy = 9.4, rx = 9, ry = 7.8;
  const dish = g.ellipse(cx, cy, rx, ry);
  g.castShadow(dish, 1, 2, 1);
  const uv = (x: number, y: number) => [(x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry];
  g.paint(dish, (x, y) => {
    const [u, v] = uv(x, y);
    return rampChar(3.1 - 1.6 * (u + v));
  });
  const bowl = g.shrink(dish, 1, true);
  g.paint(bowl, (x, y) => {
    const [u, v] = uv(x, y);
    const r = Math.sqrt(u * u + v * v);
    return rampChar(2.3 + 1.5 * (u + v) * 0.75 + (Math.abs(r - 0.5) < 0.09 ? -1 : 0));
  });
  // struts + feed horn
  g.fill(g.or(g.line(12, 3, 12, 8), g.line(5, 12, 10, 10), g.line(19, 12, 14, 10)), 'G');
  g.plot([12, 4, 6, 12, 18, 12], 'h');
  g.fill(g.rect(11, 9, 2, 2), 'K').plot([11, 9], 'h').plot([12, 10], 'R');
  return g.outline().toMap();
}
