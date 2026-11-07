// Battle-damage overlay for boss bodies (final-phase `${bossKey}__dmg` textures). Works on the
// palette-independent code grid, so it is computed once per boss and rendered for every palette:
// scorch blotches, bitten-off armour edges with burnt rims, holes exposing glowing internals,
// cracks (some glowing with heat) and embers.
import { Grid, FIRE, levelOf } from './b_boss_kit';
import { bayer } from './pixel';
import { fbm, mulberry32 } from './noise';
import type { BossMounts, Offset } from './b_boss_types';

const K = 'k'.charCodeAt(0);

/** True for palette-ramp armour pixels (digits '1'..'5'). */
function isArmour(g: Grid, x: number, y: number): boolean {
  const c = g.get(x, y);
  return c >= 49 && c <= 53;
}

/** Remove connected pieces smaller than `min` px (debris left by bitten edges). */
function dropIslands(g: Grid, min: number): void {
  const seen = new Uint8Array(g.w * g.h);
  const stack: number[] = [];
  for (let i = 0; i < g.w * g.h; i++) {
    if (seen[i] || !g.px[i]) continue;
    const comp: number[] = [];
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop() as number;
      comp.push(j);
      const x = j % g.w, y = (j / g.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= g.w || Y >= g.h) continue;
        const k = Y * g.w + X;
        if (!seen[k] && g.px[k]) { seen[k] = 1; stack.push(k); }
      }
    }
    if (comp.length < min) for (const j of comp) g.px[j] = 0;
  }
}

function filledNeighbours(g: Grid, x: number, y: number): number {
  let n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g.filled(x + dx, y + dy)) n++;
  return n;
}

/** Apply deterministic battle damage to a copy of a boss grid. */
export function damaged(src: Grid, seed: number, mounts: BossMounts): Grid {
  const g = src.clone();
  const R = mulberry32(seed);
  const W = g.w, H = g.h;
  const avoid: Offset[] = [...mounts.turret, ...mounts.cannon, ...mounts.pod, ...mounts.core, ...mounts.wing];
  const farFromMounts = (x: number, y: number, d: number) => avoid.every(([ox, oy]) => Math.hypot(x - (W / 2 + ox), y - (H / 2 + oy)) > d);

  const interior: number[] = [];
  const edge: number[] = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!g.filled(x, y)) continue;
    const n = filledNeighbours(g, x, y);
    if (n === 4) interior.push(x, y); else edge.push(x, y);
  }
  const pick = (list: number[], ok: (x: number, y: number) => boolean): [number, number] | null => {
    for (let tries = 0; tries < 60; tries++) {
      const i = Math.floor(R() * (list.length / 2)) * 2;
      const x = list[i], y = list[i + 1];
      if (ok(x, y)) return [x, y];
    }
    return null;
  };
  const scale = W / 112;

  // ---- scorch blotches (soot, dithered)
  for (let b = 0; b < Math.round(5 * scale); b++) {
    const p = pick(interior, () => true);
    if (!p) continue;
    const r = (5 + R() * 7) * scale;
    for (let y = Math.floor(p[1] - r); y <= p[1] + r; y++) for (let x = Math.floor(p[0] - r); x <= p[0] + r; x++) {
      if (!g.filled(x, y)) continue;
      const d = Math.hypot(x - p[0], y - p[1]) / r;
      const n = fbm(x * 0.21, y * 0.21, seed + b, 3);
      const v = (1 - d) * 1.3 + (n - 0.5) * 1.2;
      if (v > 0.75) g.shade(x, y, -2, 1);
      else if (v > 0.35 && bayer(x, y) < (v - 0.35) * 2) g.shade(x, y, -1, 1);
    }
  }

  // ---- bitten-off armour edges with burnt rims
  for (let b = 0; b < Math.round(4 * scale); b++) {
    const p = pick(edge, (x, y) => farFromMounts(x, y, 8));
    if (!p) continue;
    const r = (2.5 + R() * 3) * scale;
    for (let y = Math.floor(p[1] - r - 1); y <= p[1] + r + 1; y++) for (let x = Math.floor(p[0] - r - 1); x <= p[0] + r + 1; x++) {
      const d = Math.hypot(x - p[0], y - p[1]);
      const jag = (fbm(x * 0.7, y * 0.7, seed * 3 + b, 2) - 0.5) * 2.4;
      if (d < r + jag) g.clear(x, y);
    }
    for (let y = Math.floor(p[1] - r - 3); y <= p[1] + r + 3; y++) for (let x = Math.floor(p[0] - r - 3); x <= p[0] + r + 3; x++) {
      if (!g.filled(x, y) || filledNeighbours(g, x, y) === 4) continue;
      g.shade(x, y, -2, 1);
      if (R() < 0.25) g.set(x, y, R() < 0.5 ? 'e' : 'E');
    }
  }

  dropIslands(g, 24);

  // ---- holes exposing glowing internals (machinery + heat)
  const holes: [number, number, number][] = [];
  for (let b = 0; b < Math.round(5 * scale); b++) {
    const p = pick(interior, (x, y) => isArmour(g, x, y) && farFromMounts(x, y, 11) && holes.every(([hx, hy]) => Math.hypot(x - hx, y - hy) > 16));
    if (!p) continue;
    const r = (3.2 + R() * 2.6) * scale;
    holes.push([p[0], p[1], r]);
    // soot halo around the hole
    const sr = r * 2.4;
    for (let y = Math.floor(p[1] - sr); y <= p[1] + sr; y++) for (let x = Math.floor(p[0] - sr); x <= p[0] + sr; x++) {
      if (!g.filled(x, y)) continue;
      const d = Math.hypot(x + 0.5 - p[0], y + 0.5 - p[1]) / sr;
      const n = fbm(x * 0.35, y * 0.35, seed * 5 + b, 2);
      const v = 1 - d + (n - 0.5) * 0.7;
      if (v > 0.45) g.shade(x, y, -2, 1);
      else if (v > 0.15 && bayer(x, y) < (v - 0.15) * 3) g.shade(x, y, -1, 1);
    }
    for (let y = Math.floor(p[1] - r - 2); y <= p[1] + r + 2; y++) for (let x = Math.floor(p[0] - r - 2); x <= p[0] + r + 2; x++) {
      if (!g.filled(x, y)) continue;
      const d = Math.hypot(x + 0.5 - p[0], y + 0.5 - p[1]);
      const jag = (fbm(x * 0.8, y * 0.8, seed * 7 + b, 2) - 0.5) * 2;
      const rr = r + jag;
      if (d < rr - 1.2) {
        const t = d / Math.max(1, rr - 1.2);
        // internal pipes as dark diagonal stripes over the heat glow
        if ((x + y + b) % 4 === 0 && t > 0.35) g.set(x, y, 'g');
        else g.set(x, y, FIRE[Math.max(0, Math.min(4, Math.round(4.2 - t * 3.4 + (bayer(x, y) - 0.5))))]);
      } else if (d < rr) g.setCode(x, y, K);
      else if (d < rr + 1.4) g.shade(x, y, -2, 1);
    }
  }

  // ---- cracks: random walks from holes and random spots; glowing near the holes
  const crack = (x0: number, y0: number, len: number, hot: boolean) => {
    let x = x0, y = y0;
    let a = R() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      a += (R() - 0.5) * 1.1;
      x += Math.cos(a); y += Math.sin(a);
      const X = Math.round(x), Y = Math.round(y);
      if (!g.filled(X, Y) || filledNeighbours(g, X, Y) < 4) break;
      g.set(X, Y, hot && i < len * 0.45 ? (i < len * 0.2 ? 'E' : 'e') : 'k');
      g.shade(X + 1, Y + 1, 1);
      if (R() < 0.18) crack(X, Y, Math.floor(len * 0.4), false);
    }
  };
  for (const [hx, hy, r] of holes) for (let i = 0; i < 3; i++) {
    const a = R() * Math.PI * 2;
    crack(hx + Math.cos(a) * (r + 0.5), hy + Math.sin(a) * (r + 0.5), Math.round((8 + R() * 10) * scale), true);
  }
  for (let i = 0; i < Math.round(5 * scale); i++) {
    const p = pick(interior, () => true);
    if (p) crack(p[0], p[1], Math.round((5 + R() * 7) * scale), false);
  }

  // ---- embers / sparks around the holes
  for (const [hx, hy, r] of holes) for (let i = 0; i < 4; i++) {
    const a = R() * Math.PI * 2, d = r + 1.5 + R() * 3;
    const X = Math.round(hx + Math.cos(a) * d), Y = Math.round(hy + Math.sin(a) * d);
    if (levelOf(g.get(X, Y)) > 0) g.set(X, Y, R() < 0.5 ? 'y' : 'E');
  }
  return g;
}
