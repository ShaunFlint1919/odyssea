// Boss parts (BOSS_PART_SPRITES): separate, destroyable sprites placed on boss mounts.
// Turret / cannon / pod barrels point DOWN at rotation 0 and pivot on the texture centre, so
// gameplay can rotate them toward the player (angle = atan2(dy, dx) - PI/2).
import {
  Grid, type Ramp, plate, rect, circle, chamferRect, poly, ngon, barrel, groove, ridge, rivet,
  rivetRing, glow, lamp, fill, frame, GREY, TEAL,
} from './b_boss_kit';

/** Hot weak-point ramp: deep red -> red -> orange -> yellow -> white. */
export const CORE_GLOW: Ramp = ['r', 'R', 'E', 'y', 'w'];

/** part_turret (20 px): rotating ring + armoured head with twin barrels pointing down. */
export function drawTurret(): Grid {
  const g = new Grid(20, 20);
  plate(g, circle(10, 10, 7), { base: 2, bevel: 1, hi: 1.6, lo: 1.2, rim: 2 });
  rivetRing(g, 10, 10, 6, 8, Math.PI / 8);
  for (const x of [8, 12]) {
    barrel(g, x, 10, x, 18.8, 1.25, { ramp: GREY, spec: 0.9, rim: 1, drop: 1 });
    g.set(x - 1, 18, 'k'); g.set(x, 18, 'E');
    g.set(x - 1, 15, 'h');
  }
  plate(g, rect(7, 11, 6, 3), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  plate(g, ngon(10, 8.5, 5.2, 8, Math.PI / 8), { base: 4, bevel: 1, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  plate(g, rect(8, 6, 4, 3), { base: 3, bevel: 1, hi: 1.4, lo: 1.4, rim: 1 });
  g.set(9, 7, 'T'); g.set(10, 7, 'u');
  return g;
}

/** part_cannon (24 px): heavy single-barrel cannon with muzzle brake and a glowing charge coil. */
export function drawCannon(): Grid {
  const g = new Grid(24, 24);
  plate(g, circle(12, 12, 8.6), { base: 2, bevel: 1, hi: 1.6, lo: 1.2, rim: 2 });
  rivetRing(g, 12, 12, 7.5, 10, 0.3);
  barrel(g, 12, 9, 12, 21.5, 2.6, { ramp: GREY, amb: 0.15, spec: 0.9, rim: 1, drop: 1 });
  for (let x = 10; x < 14; x++) { g.set(x, 14, x & 1 ? 'E' : 'y'); g.set(x, 15, 'e'); }
  plate(g, rect(8, 19, 8, 4), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  for (const y of [20, 21]) { g.set(8, y, 'k'); g.set(15, y, 'k'); }
  fill(g, rect(11, 21, 2, 2), 'k');
  g.set(11, 22, 'e'); g.set(12, 22, 'e');
  plate(g, poly([6, 3, 18, 3, 20, 6, 19, 10, 15, 12.5, 9, 12.5, 5, 10, 4, 6]), { base: 3, bevel: 2, hi: 1.6, lo: 1.8, rim: 2, drop: 1 });
  plate(g, poly([8, 5, 16, 5, 17, 7.5, 15, 10, 9, 10, 7, 7.5]), { base: 4, bevel: 1, hi: 1.2, lo: 1.8, rim: 1 });
  plate(g, circle(12, 7.5, 2), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 2 });
  lamp(g, 17, 5, TEAL);
  rivet(g, 6, 9); rivet(g, 17, 9);
  return g;
}

/** part_pod (18 px): box launcher with three missiles lying nose-down in their rails. */
export function drawPod(): Grid {
  const g = new Grid(18, 18);
  plate(g, chamferRect(2, 2, 14, 14, 3), { base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  plate(g, rect(4, 3, 10, 12), { base: 1, bevel: 0 });
  for (const x of [4, 8, 12]) {
    barrel(g, x + 1, 4, x + 1, 14, 1.05, { ramp: GREY, amb: 0.3, spec: 0.8 });
    g.set(x, 4, 'G'); g.set(x + 1, 4, 'g');
    g.set(x, 13, 'R'); g.set(x + 1, 13, 'r');
    g.set(x, 14, 'O'); g.set(x + 1, 14, 'R');
    g.set(x, 7, 'y');
  }
  ridge(g, 3, 2, 14, 2, 1, 0);
  plate(g, rect(3, 15, 12, 2), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.6, rim: 1 });
  for (const x of [5, 9, 13]) g.set(x, 16, 'k');
  rivet(g, 3, 3); rivet(g, 13, 3);
  return g;
}

/**
 * part_core (28 px): armoured octagonal housing, four clamps and a glowing weak-point orb.
 * `pulse` = 1 draws the brighter, larger "beat" frame of the 2-frame pulse sheet.
 */
export function drawCore(pulse: 0 | 1): Grid {
  const g = new Grid(28, 28);
  plate(g, ngon(14, 14, 13, 8, Math.PI / 8), { base: 3, bevel: 2, hi: 1.6, lo: 1.8, rim: 2 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const f = frame(14, 14, Math.cos(a), Math.sin(a));
    plate(g, f.poly([8, -3, 13.5, -2.5, 13.5, 2.5, 8, 3]), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  }
  plate(g, circle(14, 14, 10), { ramp: GREY, base: 2, bevel: 1, hi: -1, lo: -1 });
  plate(g, circle(14, 14, 8.6), { ramp: GREY, base: 1, bevel: 0 });
  glow(g, 14, 14, pulse ? 8.4 : 7.2, CORE_GLOW, pulse ? 1 : 0, pulse ? 5.4 : 5);
  if (pulse) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.set(Math.round(14 + Math.cos(a) * 9.3 - 0.5), Math.round(14 + Math.sin(a) * 9.3 - 0.5), 'E');
  }
  g.set(10, 9, 'w'); g.set(11, 9, 'w'); g.set(10, 10, 'w');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    rivet(g, Math.round(14 + Math.cos(a) * 11.2 - 0.5), Math.round(14 + Math.sin(a) * 11.2 - 0.5));
  }
  return g;
}

/**
 * part_wing (32 px): swept armour plate for the LEFT side of a boss (root on the right edge,
 * tip to the left, leading edge facing down). Use setFlipX(true) for a right-side wing.
 */
export function drawWing(): Grid {
  const g = new Grid(32, 32);
  const outline = poly([30, 5, 30, 27, 23, 29, 8, 22, 2, 16, 3, 10, 9, 6, 20, 4]);
  plate(g, outline, { base: 3, bevel: 2, hi: 1.8, lo: 1.8, rim: 2 });
  plate(g, poly([27, 8, 27, 24, 21, 25, 10, 19, 6, 14, 7, 11, 11, 9, 20, 7]), { base: 4, bevel: 1, hi: 1.2, lo: 2, rim: 2, drop: 1 });
  plate(g, poly([24, 11, 24, 20, 19, 21, 12, 16, 13, 13, 19, 11]), { base: 3, bevel: 1, hi: 1.4, lo: 1.6, rim: 1 });
  groove(g, 9, 13, 23, 22, 1);
  // leading-edge stripe
  for (let x = 6; x < 29; x++) {
    const y = Math.round(22 + (x - 8) * (7 / 21) - 1);
    if (g.filled(x, y) && x % 3 !== 0) g.set(x, y, x % 3 === 1 ? 'y' : 'E');
  }
  // root bracket
  plate(g, rect(27, 7, 4, 18), { ramp: GREY, base: 3, bevel: 1, hi: 1.6, lo: 1.8, rim: 2 });
  for (const y of [9, 15, 21]) rivet(g, 28, y);
  for (const [x, y] of [[12, 9], [19, 7], [8, 13]]) rivet(g, x, y);
  lamp(g, 4, 12, TEAL);
  return g;
}
