// boss_colossus (112 px) — Kessra desert armoured crawler fortress: four track pods on
// suspension struts, side gun sponsons, rear engine deck with exhaust stacks, front dozer ram
// and a central raised cannon deck with a twin heavy cannon pointing down (towards the player).
import {
  Grid, type Shape, plate, chamferRect, rect, poly, circle, sym, dome, barrel, groove, ridge,
  rivet, rivetLine, rivetRing, vent, ventV, glow, lamp, socket, fill,
  GREY, RAMP, FIRE, TEAL,
} from './b_boss_kit';
import type { BossMounts } from './b_boss_types';

const S = 112;

/** Mount points (offsets from the sprite centre) for separate boss parts. */
export const COLOSSUS_MOUNTS: BossMounts = {
  turret: [[-41, -1], [41, -1]],
  cannon: [],
  pod: [[-21, -40], [21, -40]],
  core: [[0, -33]],
  wing: [],
  muzzle: [[-7, 53], [7, 53]],
};

function track(g: Grid, x: number, y: number, w: number, h: number): void {
  plate(g, chamferRect(x, y, w, h, 3), { ramp: GREY, base: 1, bevel: 1, hi: 2, lo: 0.4, rim: 2 });
  for (let j = y + 2; j + 2 < y + h - 1; j += 4) {
    const inset = j < y + 4 || j > y + h - 6 ? 2 : 1;
    plate(g, rect(x + inset, j, w - inset * 2, 3), { ramp: GREY, base: 3, bevel: 1, hi: 1.4, lo: 1.6, only: true });
  }
  const cx = x + Math.floor(w / 2) - 1;
  for (let j = y + 3; j < y + h - 3; j += 4) { g.set(cx, j, 'K'); g.set(cx + 1, j, 'K'); }
}

function exhaust(g: Grid, cx: number, cy: number, r: number): void {
  plate(g, circle(cx, cy, r), { ramp: GREY, base: 3, bevel: 1, hi: 1.8, lo: 1.8, rim: 2, drop: 1 });
  plate(g, circle(cx, cy, r - 1.6), { ramp: GREY, base: 1, bevel: 1, hi: -0.4, lo: 1.5 });
  glow(g, cx + 0.4, cy + 0.6, r - 2.6, FIRE, 0, 4.4);
}

/** Small anti-air turret: dome with twin stubby guns pointing down. */
function aaTurret(g: Grid, cx: number, cy: number): void {
  plate(g, circle(cx, cy, 4.5), { ramp: GREY, base: 2, bevel: 1, hi: 1.5, lo: 1.5, rim: 2, drop: 1 });
  for (const dx of [-2, 1]) { fill(g, rect(Math.floor(cx) + dx, Math.floor(cy) + 2, 1, 6), 'h'); g.set(Math.floor(cx) + dx, Math.floor(cy) + 7, 'k'); }
  dome(g, cx, cy, 3.4, 3.4, { amb: 0.25, spec: 0.6, rim: 1 });
}

/** Draws the Colossus body as a palette-independent code grid. */
export function drawColossus(): Grid {
  const g = new Grid(S, S);
  const M = (s: Shape) => sym(s, S);

  // ---- track pods (rear + front, both sides) and suspension struts
  for (const side of [0, 1]) {
    const tx = side ? S - 3 - 19 : 3;
    track(g, tx, 5, 19, 37);
    track(g, tx, 64, 19, 39);
  }
  for (const yy of [23.5, 83.5]) {
    barrel(g, 17, yy, 31, yy, 3.5, { ramp: GREY, amb: 0.2, rim: 1 });
    barrel(g, S - 17, yy, S - 31, yy, 3.5, { ramp: GREY, amb: 0.2, rim: 1 });
    for (const x of [21, 25, S - 22, S - 26]) ridge(g, x, Math.floor(yy) - 3, x, Math.floor(yy) + 3, 1, 1);
  }
  // pod hub caps
  for (const y of [23.5, 83.5]) {
    for (const X of [12.5, S - 12.5]) {
      plate(g, circle(X, y, 6), { base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
      dome(g, X, y, 3.6, 3.6, { ramp: GREY, amb: 0.25, spec: 0.6 });
      rivetRing(g, X, y, 4.8, 6, 0.4);
    }
  }

  // ---- underbody hull
  plate(g, chamferRect(23, 8, S - 46, 95, 12), { base: 2, bevel: 1, hi: 1.6, lo: 1, rim: 2 });

  // ---- side armour skirts: three bolted segments per side
  for (const [y0, y1] of [[19, 44], [46, 70], [72, 95]] as const) {
    const top = y0 === 19 ? [24, 25, 33, 19] : [24, y0, 34, y0];
    plate(g, M(poly([...top, 34, y1, 24, y1 - 3])), { base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 2, drop: 1 });
    for (const x of [27, 31]) { rivet(g, x, y0 + 3); rivet(g, x, y1 - 4); rivet(g, S - 1 - x - 1, y0 + 3); rivet(g, S - 1 - x - 1, y1 - 4); }
  }

  // ---- side gun sponsons (between the pods) with turret sockets
  const spon = poly([7, 49, 16, 44, 30, 46, 30, 61, 16, 63, 7, 58]);
  plate(g, M(spon), { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 1 });
  for (const [x, y] of COLOSSUS_MOUNTS.turret) socket(g, S / 2 + x, S / 2 + y, 7.5);

  // ---- rear engine deck: radiators, exhaust stacks, pod sockets, reactor hatch (core)
  plate(g, chamferRect(36, 7, S - 72, 30, 6), { base: 3, bevel: 2, hi: 1.6, lo: 1.6, rim: 2, drop: 1 });
  plate(g, chamferRect(41, 11, S - 82, 19, 3), { base: 2, bevel: 1, hi: -1, lo: -0.6 });
  ventV(g, 43, 13, 9, 9, FIRE, 2, 1);
  ventV(g, S - 52, 13, 9, 9, FIRE, 2, 1);
  for (const [x, y] of COLOSSUS_MOUNTS.pod) socket(g, S / 2 + x, S / 2 + y, 6.5);
  exhaust(g, 56, 12.5, 5);
  plate(g, chamferRect(47, 18, 18, 12, 3), { ramp: GREY, base: 3, bevel: 1, hi: 1.4, lo: 1.6, rim: 2, drop: 1 });
  glow(g, 56, 24, 4.4, FIRE, 0, 4.6);
  for (const x of [48, 63]) { g.set(x, 20, 'h'); g.set(x, 27, 'h'); }

  // ---- mid deck flanking the turret: armour cheeks with vents and pipes
  const cheek = poly([35, 38, 44, 36, 44, 80, 35, 82]);
  plate(g, M(cheek), { base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 2, drop: 1 });
  vent(g, 37, 41, 5, 9, undefined, 2);
  vent(g, S - 42, 41, 5, 9, undefined, 2);
  for (const x of [38.5, S - 38.5]) barrel(g, x, 54, x, 76, 1.6, { ramp: GREY, amb: 0.2 });
  for (const x of [37, S - 39]) rivetLine(g, x, 52, x, 78, 6);

  // ---- front glacis + dozer ram with teeth and hazard band
  plate(g, poly([30, 82, S - 30, 82, S - 27, 92, 27, 92]), { base: 3, bevel: 2, hi: 1.6, lo: 1.6, rim: 2, drop: 1 });
  const ram = poly([26, 91, S - 26, 91, S - 33, 106, 33, 106]);
  plate(g, ram, { base: 4, bevel: 2, hi: 1.4, lo: 2, rim: 2, drop: 1 });
  for (let x = 36; x < S - 36; x += 6) {
    plate(g, poly([x, 104, x + 4, 104, x + 2, 109]), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 1 });
  }
  for (let x = 28; x < S - 28; x++) for (let y = 95; y < 100; y++) {
    if (!g.filled(x, y)) continue;
    g.set(x, y, ((x + y) >> 2) % 2 === 0 ? (y === 95 ? 'y' : 'E') : 'K');
  }
  groove(g, 29, 94, S - 30, 94, 2);
  ridge(g, 30, 100, S - 31, 100, 1, 2);
  aaTurret(g, 31, 86);
  aaTurret(g, S - 31, 86);

  // ---- cannon deck: turret ring, turret, twin heavy barrels
  plate(g, circle(56, 57, 22), { ramp: GREY, base: 2, bevel: 2, hi: 1.8, lo: 1.4, rim: 2, drop: 2 });
  rivetRing(g, 56, 57, 20.4, 28);
  const turret = poly([44, 36, 68, 36, 74, 44, 74, 64, 68, 72, 44, 72, 38, 64, 38, 44]);
  plate(g, turret, { base: 3, bevel: 2, hi: 1.8, lo: 1.6, rim: 2, drop: 2 });
  plate(g, poly([47, 40, 65, 40, 69, 46, 69, 58, 65, 62, 47, 62, 43, 58, 43, 46]), { base: 4, bevel: 1, hi: 1.2, lo: 1.8, rim: 1, drop: 1 });
  groove(g, 47, 51, 64, 51, 1);
  for (const x of [41, S - 42]) rivetLine(g, x, 47, x, 61, 4);
  // vision blocks + cupola with sensor eye
  for (const x of [46, 63]) { fill(g, rect(x, 43, 3, 2), 'k'); g.set(x + 1, 43, 't'); g.set(x, 43, 'T'); }
  dome(g, 56, 55.5, 4.5, 4.5, { ramp: GREY, amb: 0.2, spec: 0.7, rim: 1, drop: 1 });
  glow(g, 56, 56, 2.2, TEAL, 0);
  // mantlet + barrels with cooling rings and muzzle brakes
  plate(g, chamferRect(43, 64, 26, 11, 3), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 2 });
  for (const x of [46, 64]) rivet(g, x, 69);
  for (const bx of [49, 63]) {
    barrel(g, bx, 72, bx, 103, 3.5, { ramp: GREY, amb: 0.16, spec: 0.7, rim: 1, drop: 1 });
    for (const y of [78, 84, 90]) { plate(g, rect(bx - 4, y, 8, 2), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8 }); }
    plate(g, chamferRect(bx - 5, 100, 10, 9, 2), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
    for (const y of [102, 105]) { g.set(bx - 5, y, 'k'); g.set(bx + 4, y, 'k'); }
    fill(g, rect(bx - 2, 105, 4, 4), 'k');
    fill(g, rect(bx - 1, 107, 2, 2), 'e');
  }

  // ---- lights
  lamp(g, 40, 88, FIRE, true);
  lamp(g, S - 42, 88, FIRE, true);
  lamp(g, 26, 26, TEAL);
  lamp(g, S - 27, 26, TEAL);
  lamp(g, 38, 9, FIRE);
  lamp(g, S - 39, 9, FIRE);
  void RAMP;
  return g;
}
