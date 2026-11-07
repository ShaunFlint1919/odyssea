// =====================================================================================
//  COLLISIONS — player shots vs enemies / boss / enemy missiles (uniform grid of the
//  hittable enemies, rebuilt each step with a counting sort: no allocation), splash
//  damage, piercing shots (registerHit), arsenal blockers (orbiters) vs enemy bullets and
//  enemies, and air-enemy contact with the ship. Enemy bullets vs ship are resolved in
//  EnemyBullets.update().
// =====================================================================================
import { H, PLAY_W } from '../config';
import type { ArsenalBlocker, PlayerShot } from './arsenal/api';
import type { Enemy } from './enemies';
import type { World } from './world';

const CELL = 32;
const PAD = 32;          // grid covers [-PAD, PLAY_W + PAD] x [-PAD, H + PAD]
const SHOT_MARGIN = 10;  // enemies are inserted with this extra radius (max shot radius)
const MAX_ENEMIES = 160;
const MAX_ENTRIES = 4096;

export class Collisions {
  private readonly cols = Math.ceil((PLAY_W + PAD * 2) / CELL);
  private readonly rows = Math.ceil((H + PAD * 2) / CELL);
  private readonly start: Int32Array;
  private readonly fill: Int32Array;
  private readonly entries = new Int32Array(MAX_ENTRIES);
  private readonly cand: Enemy[] = new Array<Enemy>(MAX_ENEMIES);
  private candCount = 0;
  private dt = 0;
  private hitSfxT = 0;
  private readonly onShot: (s: PlayerShot) => void;
  private readonly onBlocker: (b: ArsenalBlocker) => void;

  constructor(private readonly w: World) {
    this.start = new Int32Array(this.cols * this.rows + 1);
    this.fill = new Int32Array(this.cols * this.rows);
    this.onShot = (s) => this.shot(s);
    this.onBlocker = (b) => this.blocker(b);
  }

  private cellX(x: number): number {
    const c = Math.floor((x + PAD) / CELL);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private cellY(y: number): number {
    const c = Math.floor((y + PAD) / CELL);
    return c < 0 ? 0 : c >= this.rows ? this.rows - 1 : c;
  }

  /** Bucket every hittable enemy into the cells its (radius + margin) box overlaps. */
  private build(): void {
    const enemies = this.w.enemies;
    const list = enemies.list;
    const start = this.start, fill = this.fill;
    start.fill(0);
    this.candCount = 0;
    for (let k = 0; k < list.length && this.candCount < MAX_ENEMIES; k++) {
      const e = list[k];
      if (!enemies.hittable(e)) continue;
      this.cand[this.candCount++] = e;
      const r = e.radius + SHOT_MARGIN;
      const x0 = this.cellX(e.x - r), x1 = this.cellX(e.x + r), y0 = this.cellY(e.y - r), y1 = this.cellY(e.y + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) start[cy * this.cols + cx + 1]++;
    }
    const n = this.cols * this.rows;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    for (let i = 0; i < n; i++) fill[i] = start[i];
    for (let c = 0; c < this.candCount; c++) {
      const e = this.cand[c];
      const r = e.radius + SHOT_MARGIN;
      const x0 = this.cellX(e.x - r), x1 = this.cellX(e.x + r), y0 = this.cellY(e.y - r), y1 = this.cellY(e.y + r);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const ci = cy * this.cols + cx;
          if (fill[ci] < MAX_ENTRIES) this.entries[fill[ci]++] = c;
        }
      }
    }
  }

  /** Run every collision check of one simulation step (dt in seconds). */
  update(dt: number): void {
    const w = this.w;
    this.dt = dt;
    if (this.hitSfxT > 0) this.hitSfxT -= dt;
    this.build();
    w.arsenal.forEachShot(this.onShot);
    w.arsenal.forEachBlocker(this.onBlocker);
    // air enemies ramming the ship
    const ship = w.ship;
    if (ship.hittable) {
      const sx = ship.x, sy = ship.y, sr = ship.hitRadius;
      for (let c = 0; c < this.candCount; c++) {
        const e = this.cand[c];
        if (!e.active || e.layer !== 'air') continue;
        const dx = e.x - sx, dy = e.y - sy, rr = e.radius * 0.8 + sr;
        if (dx * dx + dy * dy < rr * rr) w.enemies.contact(e);
      }
    }
  }

  private hitFeedback(x: number, y: number, damage: number): void {
    const m = this.w.metrics;
    m.shotHits++;
    m.damageDealt += damage;
    this.w.fx.hit(x, y, 0xfff0a0);
    if (this.hitSfxT <= 0) {
      this.w.services.sfx('hit');
      this.hitSfxT = 0.05;
    }
  }

  private shot(s: PlayerShot): void {
    const w = this.w;
    const x = s.x, y = s.y, r = s.radius;
    if (y < -16 || y > H + 16 || x < -16 || x > PLAY_W + 16) return;
    // boss (parts first, then the pixel mask of the body)
    const boss = w.boss;
    if (boss.active) {
      const tgt = boss.hitTest(x, y, r);
      if (tgt >= 0) {
        if (s.pierce) {
          if (!s.registerHit(-1 - tgt)) {
            boss.damageAt(tgt, s.damage, x, y);
            this.hitFeedback(x, y, s.damage);
          }
        } else {
          boss.damageAt(tgt, s.damage, x, y);
          if (s.splash > 0) this.splash(x, y, s.splash, s.damage);
          this.hitFeedback(x, y, s.damage);
          s.impact(x, y);
          return;
        }
      }
    }
    // shootable enemy missiles
    if (w.bullets.hitMissile(x, y, r, s.damage) && !s.pierce) {
      s.impact(x, y);
      return;
    }
    // enemies in the shot's cell
    const ci = this.cellY(y) * this.cols + this.cellX(x);
    const a = this.start[ci], b = this.fill[ci];
    for (let k = a; k < b; k++) {
      const e = this.cand[this.entries[k]];
      if (!e.active) continue;
      const dx = e.x - x, dy = e.y - y, rr = e.radius + r;
      if (dx * dx + dy * dy >= rr * rr) continue;
      if (s.pierce) {
        if (s.registerHit(e.serial)) continue;
        w.enemies.damage(e, s.damage);
        this.hitFeedback(x, y, s.damage);
        continue;
      }
      w.enemies.damage(e, s.damage);
      if (s.splash > 0) this.splash(x, y, s.splash, s.damage);
      this.hitFeedback(x, y, s.damage);
      s.impact(x, y);
      return;
    }
  }

  /** Area damage around an impact point (enemies and boss). */
  private splash(x: number, y: number, radius: number, dmg: number): void {
    const w = this.w;
    for (let c = 0; c < this.candCount; c++) {
      const e = this.cand[c];
      if (!e.active) continue;
      const dx = e.x - x, dy = e.y - y, rr = e.radius + radius;
      if (dx * dx + dy * dy < rr * rr) w.enemies.damage(e, dmg);
    }
    if (w.boss.active) w.boss.splash(x, y, radius, dmg);
    w.fx.glow(x, y, 0xffc060, radius / 14, 160);
  }

  private blocker(b: ArsenalBlocker): void {
    const w = this.w;
    w.bullets.cancelInCircle(b.x, b.y, b.radius);
    if (b.contactDps <= 0) return;
    const dmg = b.contactDps * this.dt;
    for (let c = 0; c < this.candCount; c++) {
      const e = this.cand[c];
      if (!e.active) continue;
      const dx = e.x - b.x, dy = e.y - b.y, rr = e.radius + b.radius;
      if (dx * dx + dy * dy < rr * rr) w.enemies.damage(e, dmg);
    }
  }
}
