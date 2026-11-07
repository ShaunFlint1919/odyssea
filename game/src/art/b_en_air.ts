// =====================================================================================
//  ENEMY ART — small / medium air units (nose pointing DOWN, light from the top-left).
//  Every function returns a palette-independent PixelMap (or frames) at the exact size
//  listed in ENEMY_SPRITES; enemies.ts renders it once per Palette.
// =====================================================================================
import type { PixelMap } from './pixel';
import { Grid } from './b_en_kit';

const METAL = 'KgGhH';

/** en_dart (16) — small arrow fighter: swept delta wings, glass canopy near the nose. */
export function drawDart(): PixelMap {
  const g = new Grid(16, 16);
  const wing = g.sym(g.poly([7.5, 12.5, 1.1, 5.2, 1.1, 1.4, 3.6, 2.4, 7.5, 6.6]));
  g.shade(wing, { base: 1.9, bevel: 1.5 });
  g.darken(g.and(wing, g.sym(g.line(2, 2, 6, 6))), 1);
  g.plotSym([1, 2], 'R');
  const body = g.poly([8, 15.3, 9.8, 10.5, 10, 3.6, 9.2, 1.2, 6.8, 1.2, 6, 3.6, 6.2, 10.5]);
  g.castShadow(body, 1, 1);
  g.shade(body, { base: 3, bevel: 2, round: true });
  g.plot([7, 9], 'q').plot([8, 9, 7, 10], 'C').plot([8, 10, 7, 11, 8, 11], 'c');
  g.plot([7, 1, 8, 1], 'y').plot([7, 2, 8, 2], 'E');
  return g.outline().toMap();
}

/** en_wasp (16) — insectoid interceptor: banded abdomen, smoky glass double wings, red eyes. */
export function drawWasp(): PixelMap {
  const g = new Grid(16, 16);
  const wingA = g.sym(g.capsule(5.6, 7.2, 1.9, 2.4, 1.5));
  const wingB = g.sym(g.capsule(5.8, 9.6, 1.6, 11.2, 1.1));
  g.shade(wingB, { ramp: 'dcCq', base: 0.7, bevel: 1.1, hi: 3 });
  g.shade(wingA, { ramp: 'dcCq', base: 0.9, bevel: 1.5, hi: 3 });
  g.plotSym([2, 2, 3, 3], 'q');
  const abd = g.poly([8, 0.9, 10.5, 2.6, 11, 5.2, 10.2, 7.6, 5.8, 7.6, 5, 5.2, 5.5, 2.6]);
  g.shade(abd, { base: 3.2, bevel: 2.6, round: true, bias: (_x, y) => (y % 2 === 0 ? -1.8 : 0) });
  const th = g.ellipse(8, 9.3, 2.8, 2.1);
  g.castShadow(th, 1, 1);
  g.shade(th, { base: 3.2, bevel: 2.1, round: true });
  const hd = g.ellipse(8, 12.4, 2.3, 1.8);
  g.shade(hd, { base: 2.6, bevel: 1.8, round: true });
  g.plot([6, 12, 9, 12], 'R').plot([6, 11], 'y').plot([9, 11], 'E');
  g.plot([6, 14, 9, 14], 'h').plot([7, 14, 8, 14], 'K');
  return g.outline().toMap();
}

/** en_drone (12) — tiny round drone with a glowing red eye and side thrusters. */
export function drawDrone(): PixelMap {
  const g = new Grid(12, 12);
  g.fill(g.sym(g.rect(1, 5, 1, 2)), 'G').plot([1, 5], 'h').plot([10, 6], 'g');
  g.fill(g.rect(5, 1, 2, 1), 'G').plot([5, 1], 'h');
  const body = g.circle(6, 6, 4.1);
  g.shade(body, { base: 2.4, bevel: 4.1, round: true, hi: 2.6 });
  g.fill(g.circle(6, 6.7, 2.1), 'k');
  g.fill(g.circle(6, 6.7, 1.45), 'R');
  g.plot([5, 6], 'y').plot([6, 7], 'r');
  return g.outline().toMap();
}

/** en_kamikaze (14) — spiky suicide craft: ram spike, three swept spikes per side, hot core. */
export function drawKamikaze(): PixelMap {
  const g = new Grid(14, 14);
  const cx = 7, cy = 6.6;
  const spike = (tx: number, ty: number, hw: number) => {
    const dx = tx - cx, dy = ty - cy, l = Math.hypot(dx, dy);
    const ux = dx / l, uy = dy / l, bx = cx + ux * 2.2, by = cy + uy * 2.2;
    return g.poly([bx - uy * hw, by + ux * hw, tx, ty, bx + uy * hw, by - ux * hw]);
  };
  const spikes = g.sym(g.or(spike(1, 1.1, 1.3), spike(0.5, 7.4, 1.4), spike(1.6, 12.8, 1.3)));
  g.shade(spikes, { ramp: METAL, base: 2.5, bevel: 1, hi: 3 });
  const ram = g.poly([7, 13.9, 8.6, 9.6, 5.4, 9.6]);
  g.shade(ram, { ramp: METAL, base: 2.9, bevel: 1, hi: 3 });
  g.fill(g.rect(6, 1, 2, 2), 'g');
  const hull = g.ellipse(cx, cy, 3.3, 4.1);
  g.castShadow(hull, 1, 1);
  g.shade(hull, { base: 2.4, bevel: 3.3, round: true });
  g.fill(g.ellipse(7, 7.1, 2, 2.3), 'p');
  g.fill(g.ellipse(7, 7.1, 1.3, 1.6), 'E');
  g.plot([6, 6], 'Y').plot([7, 6, 6, 7], 'y');
  g.plot([6, 1, 7, 1], 'y').plot([6, 2, 7, 2], 'E');
  return g.outline().toMap();
}

/** en_hornet (20) — forward-swept fighter: wingtips reach towards the nose, twin tail fins. */
export function drawHornet(): PixelMap {
  const g = new Grid(20, 20);
  const fins = g.sym(g.poly([8.8, 2.6, 5.4, 1.1, 5.2, 3.2, 8.8, 6]));
  g.shade(fins, { base: 1.8, bevel: 1.2 });
  const wing = g.sym(g.poly([8.6, 6, 8.6, 11.6, 2.6, 16.6, 1.1, 16, 1.4, 13.2]));
  g.shade(wing, { base: 2.2, bevel: 1.6 });
  g.darken(g.and(wing, g.sym(g.line(3, 14, 8, 9))), 1);
  g.plotSym([1, 14], 'R').plotSym([2, 15], 'r');
  const body = g.poly([10, 19.4, 11.6, 15, 12, 6.5, 11.3, 1.2, 8.7, 1.2, 8, 6.5, 8.4, 15]);
  g.castShadow(body, 1, 1);
  g.shade(body, { base: 3, bevel: 2.2, round: true });
  g.plot([8, 9, 8, 10], 'n').plot([11, 9, 11, 10], 'n');
  g.plot([9, 12], 'q').plot([10, 12, 9, 13], 'C').plot([10, 13, 9, 14, 10, 14], 'c');
  g.plot([9, 1, 10, 1], 'y').plot([9, 2, 10, 2], 'E');
  return g.outline().toMap();
}

/** en_saucer (20) — disc with a ring of rim lights and a glass dome. */
export function drawSaucer(): PixelMap {
  const g = new Grid(20, 20);
  const disc = g.circle(10, 10, 8.9);
  g.shade(disc, { base: 2.3, bevel: 3.4, round: true });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.darken(g.and(disc, g.line(10 + Math.cos(a) * 6.6, 10 + Math.sin(a) * 6.6, 10 + Math.cos(a) * 8.6, 10 + Math.sin(a) * 8.6)), 1);
  }
  g.darken(g.ring(10, 10, 5.4, 6.4), 1);
  const inner = g.circle(10, 10, 5.4);
  g.shade(inner, { base: 3, bevel: 2, round: true });
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    const x = Math.floor(10 + Math.cos(a) * 7.5), y = Math.floor(10 + Math.sin(a) * 7.5);
    g.set(x, y, i % 2 ? 'T' : 'y');
  }
  const dome = g.circle(10, 10, 3.5);
  g.fill(g.circle(10, 10, 4.2), 'k');
  g.shade(dome, { ramp: 'dcCq', base: 1.4, bevel: 3.5, round: true, hi: 3 });
  g.plot([8, 8], 'q');
  return g.outline().toMap();
}

/**
 * en_spinner (18) — rotating 4-point star blade; 4 frames covering a quarter turn (seamless
 * loop). Each blade is a ridge (two facets), so the lit facet moves as the blade turns.
 */
export function drawSpinner(): PixelMap[] {
  const frames: PixelMap[] = [];
  const R = 8.6, hubR = 3.2, period = Math.PI / 2, c = 9;
  for (let f = 0; f < 4; f++) {
    const g = new Grid(18, 18);
    const phi = (f * period) / 4;
    const height = new Float32Array(g.w * g.h);
    const blades = g.where((x, y) => {
      const dx = x + 0.5 - c, dy = y + 0.5 - c;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > R || r < hubR) return false;
      const t = (r - hubR) / (R - hubR);
      let u = Math.atan2(dy, dx) - phi + 0.6 * t;
      u = ((((u + period / 2) % period) + period) % period) - period / 2;
      const hw = (period / 2) * 0.92 * Math.pow(1 - t, 1.1);
      if (Math.abs(u) > hw) return false;
      height[y * g.w + x] = (1 - Math.abs(u) / hw) * (1 - 0.4 * t);
      return true;
    });
    g.shade(blades, { base: 2.6, height, relief: 2.6, hi: 2.4, lo: 2.2 });
    const hub = g.circle(c, c, 3.6);
    g.fill(g.circle(c, c, 4.2), 'k');
    g.shade(hub, { ramp: METAL, base: 2.4, bevel: 3.6, round: true });
    g.fill(g.circle(c, c, 1.8), 'm').fill(g.rect(8, 8, 2, 2), 'M').plot([8, 8], 'q');
    frames.push(g.outline().toMap());
  }
  return frames;
}

/** en_manta (24) — wide flat ray: broad wings, forward horns, whip tail, glowing wing spots. */
export function drawManta(): PixelMap {
  const g = new Grid(24, 24);
  const tail = g.capsule(12, 1.6, 12, 6, 0.7);
  g.shade(tail, { base: 2, bevel: 1 });
  const body = g.sym(g.poly([12, 4, 9.4, 5, 5.5, 7.4, 2.4, 10, 1, 12.6, 3, 13.8, 6, 15.2, 8.4, 17.8, 8.6, 21.8, 9.8, 22, 10.4, 19, 12, 18.6]));
  g.shade(body, { base: 2.1, bevel: 2.6, round: true });
  // wing panel seams sweeping towards the tips
  g.darken(g.and(body, g.sym(g.line(9, 8, 3, 12))), 1);
  g.darken(g.and(body, g.sym(g.line(9, 13, 5, 14))), 1);
  const spine = g.ellipse(12, 11.5, 2.7, 7.2);
  g.castShadow(spine, 1, 1);
  g.shade(spine, { base: 3.1, bevel: 2.7, round: true });
  g.plotSym([6, 10, 4, 11, 8, 12], 'T').plotSym([7, 10], 't');
  g.plotSym([10, 18], 'y').plotSym([9, 18], 'R');
  g.plotSym([10, 5], 'E');
  return g.outline().toMap();
}

/** en_sentinel (28) — armoured octagonal pod with segmented plates and a big glowing eye. */
export function drawSentinel(): PixelMap {
  const g = new Grid(28, 28);
  const shell = g.poly([9, 1.4, 19, 1.4, 26.6, 9, 26.6, 19, 19, 26.6, 9, 26.6, 1.4, 19, 1.4, 9]);
  g.shade(shell, { base: 2.1, bevel: 2.6 });
  // radial plate seams
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    g.darken(g.and(shell, g.line(14 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 14 + Math.cos(a) * 13, 14 + Math.sin(a) * 13)), 2);
  }
  // rivets on each plate
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.set(Math.floor(14 + Math.cos(a) * 11), Math.floor(14 + Math.sin(a) * 11), 'h');
  }
  const inner = g.circle(14, 14, 9.3);
  g.fill(g.circle(14, 14, 10.1), 'k');
  g.shade(inner, { base: 3, bevel: 3, round: true });
  const socket = g.ellipse(14, 15.2, 6.4, 5.3);
  g.fill(socket, 'k');
  g.castShadow(g.sub(inner, socket), 0, 1, 1);
  const eye = g.ellipse(14, 15.2, 5.4, 4.3);
  g.fill(eye, 'r');
  g.fill(g.ellipse(14, 15.4, 4.4, 3.3), 'R');
  g.fill(g.ellipse(14, 15.6, 3.0, 2.3), 'E');
  g.fill(g.ellipse(14, 15.6, 1.8, 1.4), 'y');
  g.fill(g.rect(13, 13, 2, 5), 'p');
  g.plot([11, 13, 12, 13], 'Y').plot([11, 14], 'y');
  // sensor nub + vents
  g.fill(g.rect(13, 2, 2, 2), 'K').plot([13, 2], 'T').plot([14, 2], 't');
  g.plotSym([4, 13, 4, 14, 4, 15], 'n');
  return g.outline().toMap();
}

/** en_bomber (32) — heavy twin-engine bomber: straight wings, engine nacelles, glass nose. */
export function drawBomber(): PixelMap {
  const g = new Grid(32, 32);
  const tail = g.sym(g.poly([14, 2.6, 8.4, 2.2, 8.2, 5.4, 14, 7.6]));
  g.shade(tail, { base: 2, bevel: 1.4 });
  const wing = g.sym(g.poly([14, 10.4, 1.2, 12.6, 1.1, 17.6, 14, 20]));
  g.shade(wing, { base: 2.2, bevel: 1.8 });
  g.darken(g.and(wing, g.sym(g.line(2, 15, 13, 15))), 1);
  g.plotSym([1, 13], 'R');
  const nac = g.sym(g.capsule(8, 6.6, 8, 21.6, 2.7));
  g.castShadow(nac, 1, 1);
  g.shade(nac, { base: 2.9, bevel: 2.7, round: true });
  g.plotSym([7, 22, 8, 22], 'n').plotSym([7, 21], 'K');
  g.plotSym([7, 4, 8, 4], 'y').plotSym([7, 5, 8, 5], 'E').plotSym([6, 5, 9, 5], 'e');
  const body = g.poly([16, 30.6, 18.9, 26, 19.7, 8, 18.6, 2.2, 13.4, 2.2, 12.3, 8, 13.1, 26]);
  g.castShadow(body, 1, 1);
  g.shade(body, { base: 3, bevel: 3.2, round: true });
  // bomb bay doors
  const bay = g.rect(14, 11, 4, 9);
  g.darken(g.edge(bay), 2);
  g.darken(g.line(16, 11, 16, 19), 1);
  // cockpit glass
  g.fill(g.poly([13.6, 24, 18.4, 24, 18, 27.4, 16, 28.8, 14, 27.4]), 'c');
  g.plot([14, 24, 15, 24], 'q').plot([16, 24, 14, 25, 15, 25], 'C').plot([17, 24], 'C');
  // tail gun
  g.plot([15, 2, 16, 2], 'G').plot([15, 1], 'h').plot([16, 1], 'g');
  return g.outline().toMap();
}

/** en_gunship (40) — armed gunship: armoured hull, twin side gun pods with long cannons. */
export function drawGunship(): PixelMap {
  const g = new Grid(40, 40);
  // side cannons (drawn first, pods cover their roots)
  const barrels = g.sym(g.rect(6, 26, 2, 13));
  g.shade(barrels, { ramp: 'KgGhH', base: 2.2, bevel: 1, hi: 3 });
  g.fill(g.sym(g.rect(6, 37, 2, 1)), 'K');
  g.fill(g.sym(g.rect(5, 33, 4, 2)), 'g').plotSym([5, 33], 'h');
  // struts
  const strut = g.sym(g.poly([14, 13, 7, 14, 7, 23, 14, 24]));
  g.shade(strut, { base: 1.8, bevel: 1.5 });
  // gun pods
  const pods = g.sym(g.capsule(7, 9.5, 7, 28, 3.3));
  g.castShadow(pods, 1, 1);
  g.shade(pods, { base: 2.8, bevel: 3.3, round: true });
  g.darken(g.and(pods, g.sym(g.rect(4, 17, 7, 1))), 2);
  g.plotSym([6, 8, 7, 8], 'y').plotSym([5, 9, 8, 9], 'E');
  g.plotSym([4, 21, 4, 23, 4, 25], 'y');
  // hull
  const hull = g.poly([20, 38.6, 24.4, 34, 26.6, 26, 26.6, 8, 24.6, 2.4, 15.4, 2.4, 13.4, 8, 13.4, 26, 15.6, 34]);
  g.castShadow(hull, 1, 1);
  g.shade(hull, { base: 2.9, bevel: 3 });
  g.darken(g.and(hull, g.or(g.rect(14, 12, 12, 1), g.rect(14, 22, 12, 1))), 1);
  // engines
  g.fill(g.rect(16, 1, 3, 3), 'e').fill(g.rect(21, 1, 3, 3), 'e');
  g.plot([16, 1, 17, 1, 21, 1, 22, 1], 'y').plot([18, 1, 23, 1, 17, 2, 22, 2], 'E');
  // top turret
  const tur = g.circle(20, 17, 3.1);
  g.castShadow(tur, 1, 1);
  g.shade(tur, { ramp: 'KgGhH', base: 2.5, bevel: 3.1, round: true });
  g.fill(g.rect(19, 19, 2, 4), 'G').plot([19, 20, 19, 21], 'h').plot([19, 22, 20, 22], 'K');
  // cockpit
  g.fill(g.poly([16.6, 28, 23.4, 28, 22.6, 32, 20, 33.6, 17.4, 32]), 'c');
  g.plot([17, 28, 18, 28], 'q').plot([19, 28, 17, 29, 18, 29, 20, 28], 'C');
  return g.outline().toMap();
}
