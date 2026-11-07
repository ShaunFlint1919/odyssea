// =====================================================================================
//  ENEMY ART — hazards: floating mine (2 blink frames) and lumpy cratered asteroids.
//  Asteroids are lit by a height field (dome + craters + noise) so that the palette ramp
//  turns them into different rock types (bone = sandstone, steel = iron, violet = crystal…).
// =====================================================================================
import type { PixelMap } from './pixel';
import { mulberry32, fbm } from './noise';
import { Grid, type Mask } from './b_en_kit';

/** hz_mine (14) — spiky floating mine. Frame 0 = warning light ON, frame 1 = OFF. */
export function drawMine(): PixelMap[] {
  const frames: PixelMap[] = [];
  for (let f = 0; f < 2; f++) {
    const g = new Grid(14, 14);
    const cx = 7, cy = 7;
    const spikes: Mask[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = i % 2 === 0 ? 6.4 : 5.6;
      const hw = i % 2 === 0 ? 1.1 : 0.9;
      const ca = Math.cos(a), sa = Math.sin(a);
      const bx = cx + ca * 3.4, by = cy + sa * 3.4;
      spikes.push(g.poly([bx - sa * hw, by + ca * hw, cx + ca * len, cy + sa * len, bx + sa * hw, by - ca * hw]));
    }
    g.shade(g.or(...spikes), { ramp: 'KgGhH', base: 2.7, bevel: 1, hi: 3 });
    const shell = g.circle(cx, cy, 4.3);
    g.shade(shell, { base: 2.3, bevel: 4.3, round: true, hi: 2.6 });
    g.darken(g.and(shell, g.rect(0, 9, 14, 1)), 1);
    g.fill(g.rect(5, 5, 4, 4), 'k');
    if (f === 0) g.fill(g.rect(6, 6, 2, 2), 'R').plot([6, 6], 'Y').plot([7, 6, 6, 7], 'y');
    else g.fill(g.rect(6, 6, 2, 2), 'r').plot([6, 6], 'R');
    frames.push(g.outline().toMap());
  }
  return frames;
}

/**
 * Lumpy cratered asteroid of the given size (deterministic per seed): a dome over a
 * harmonic-perturbed outline, a few broad lumps for facets and bowl craters with raised rims.
 */
export function drawRock(size: number, seed: number, craters: number): PixelMap {
  const g = new Grid(size, size);
  const rnd = mulberry32(seed);
  const c = size / 2;
  const R = size / 2 - 1.3;
  const harmonics = [2, 3, 5].map((k, i) => ({ k, amp: [0.08, 0.06, 0.035][i], ph: rnd() * Math.PI * 2 }));
  const radiusAt = (a: number) => R * (0.92 + harmonics.reduce((s, hm) => s + hm.amp * Math.sin(hm.k * a + hm.ph), 0));
  const lumps: { x: number; y: number; r: number; h: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * R * 0.6;
    lumps.push({ x: c + Math.cos(a) * d, y: c + Math.sin(a) * d, r: R * (0.35 + rnd() * 0.25), h: 0.12 + rnd() * 0.1 });
  }
  const holes: { x: number; y: number; r: number; d: number }[] = [];
  for (let tries = 0; holes.length < craters && tries < 60; tries++) {
    const a = rnd() * Math.PI * 2, dist = (0.1 + rnd() * 0.5) * R;
    const r = R * (holes.length === 0 ? 0.34 : 0.16 + rnd() * 0.12);
    const x = c + Math.cos(a) * dist, y = c + Math.sin(a) * dist;
    if (holes.some((h) => Math.hypot(h.x - x, h.y - y) < (h.r + r) * 1.25)) continue;
    holes.push({ x, y, r, d: 0.5 });
  }
  const height = new Float32Array(size * size);
  const body = g.where((x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const dx = px - c, dy = py - c;
    const rr = radiusAt(Math.atan2(dy, dx));
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > rr) return false;
    let h = Math.sqrt(Math.max(0, 1 - (d / rr) ** 2));
    for (const l of lumps) {
      const q = Math.sqrt((px - l.x) ** 2 + (py - l.y) ** 2) / l.r;
      if (q < 1) h += l.h * (1 - q * q) ** 2;
    }
    for (const hl of holes) {
      const q = Math.sqrt((px - hl.x) ** 2 + (py - hl.y) ** 2) / hl.r;
      if (q < 1) h -= hl.d * (1 - q * q);
      else if (q < 1.4) h += hl.d * 0.3 * (1 - (q - 1) / 0.4);
    }
    h += (fbm(x / 5, y / 5, seed, 2) - 0.5) * 0.08;
    height[y * size + x] = h;
    return true;
  });
  g.shade(body, { base: 2.2, height, relief: R * 0.85, hi: 2.4, lo: 2.4, gx: -0.03, gy: -0.03 });
  // reflected light on the shadowed rim keeps the dark side readable against dark space
  g.paint(g.edge(body, 'br'), (x, y) => (g.get(x, y) === '1' ? '2' : ''));
  return g.outline().toMap();
}

export const drawRockS = (): PixelMap => drawRock(16, 11, 1);
export const drawRockM = (): PixelMap => drawRock(28, 23, 3);
export const drawRockL = (): PixelMap => drawRock(44, 37, 4);
