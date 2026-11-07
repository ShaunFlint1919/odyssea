// =====================================================================================
//  GALAXY MAP helpers: curved dotted routes between planets with marching-dot animation.
//  Routes are sampled once (constant-speed arc length); the dots are redrawn into one
//  Graphics object at ~30 Hz without allocations.
// =====================================================================================
import Phaser from 'phaser';
import { COLORS } from '../../config';

export type RouteState = 'done' | 'active' | 'locked';

interface Route {
  xs: Float32Array;
  ys: Float32Array;
  len: Float32Array;   // cumulative arc length per sample
  total: number;
  state: RouteState;
  skipA: number;       // arc length hidden under the start planet
  skipB: number;       // arc length hidden under the end planet
}

const STYLE: Record<RouteState, { color: number; alpha: number; speed: number; spacing: number; size: number }> = {
  done: { color: COLORS.teal, alpha: 0.8, speed: 5, spacing: 6, size: 2 },
  active: { color: COLORS.accent, alpha: 1, speed: 22, spacing: 6, size: 2 },
  locked: { color: 0x8a84a0, alpha: 0.55, speed: 0, spacing: 7, size: 2 },
};

/** Dotted animated routes drawn into a single Graphics. */
export class RouteRenderer {
  readonly gfx: Phaser.GameObjects.Graphics;
  private readonly routes: Route[] = [];
  private t = 0;
  private acc = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.gfx = scene.add.graphics().setDepth(depth);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
  }

  /**
   * Add a quadratic route from (ax, ay) to (bx, by) bending by `bend` (fraction of the
   * length, sign = side). ra / rb = radii of the planets at both ends (dots hidden there).
   */
  add(ax: number, ay: number, bx: number, by: number, bend: number, ra: number, rb: number, state: RouteState): void {
    const dx = bx - ax, dy = by - ay;
    const d = Math.hypot(dx, dy) || 1;
    const cx = (ax + bx) / 2 - (dy / d) * d * bend;
    const cy = (ay + by) / 2 + (dx / d) * d * bend;
    const n = Math.max(8, Math.ceil(d / 2));
    const xs = new Float32Array(n + 1), ys = new Float32Array(n + 1), len = new Float32Array(n + 1);
    let total = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      xs[i] = u * u * ax + 2 * u * t * cx + t * t * bx;
      ys[i] = u * u * ay + 2 * u * t * cy + t * t * by;
      if (i > 0) total += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
      len[i] = total;
    }
    this.routes.push({ xs, ys, len, total, state, skipA: ra + 4, skipB: rb + 4 });
    this.draw();
  }

  private tick(_time: number, delta: number): void {
    this.t += delta / 1000;
    this.acc += delta;
    if (this.acc < 33) return;
    this.acc = 0;
    this.draw();
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    for (const r of this.routes) {
      const st = STYLE[r.state];
      const phase = (this.t * st.speed) % st.spacing;
      g.fillStyle(st.color, st.alpha);
      let k = 0;
      for (let s = r.skipA + phase; s < r.total - r.skipB; s += st.spacing) {
        while (k < r.len.length - 1 && r.len[k + 1] < s) k++;
        if (k >= r.len.length - 1) break;
        const seg = r.len[k + 1] - r.len[k] || 1;
        const f = (s - r.len[k]) / seg;
        const x = r.xs[k] + (r.xs[k + 1] - r.xs[k]) * f;
        const y = r.ys[k] + (r.ys[k + 1] - r.ys[k]) * f;
        g.fillRect(Math.round(x - st.size / 2), Math.round(y - st.size / 2), st.size, st.size);
      }
      if (r.state === 'active') {
        // a brighter "comet" head running along the active route
        const head = r.skipA + ((this.t * 40) % Math.max(1, r.total - r.skipA - r.skipB));
        let j = 0;
        while (j < r.len.length - 1 && r.len[j + 1] < head) j++;
        g.fillStyle(COLORS.accentLight, 1);
        g.fillRect(Math.round(r.xs[j]) - 1, Math.round(r.ys[j]) - 1, 3, 3);
      }
    }
  }
}
