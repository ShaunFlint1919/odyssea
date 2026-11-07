// =====================================================================================
//  COLLISIONS — player shots vs enemies / boss / enemy missiles (uniform grid of the
//  hittable enemies, rebuilt each step with a counting sort: no allocation), splash
//  damage, piercing shots (registerHit), arsenal blockers (orbiters) vs enemy bullets and
//  enemies, and air-enemy contact with the ship. Enemy bullets vs ship are resolved in
//  EnemyBullets.update().
//
//  Swept shots: a shot is tested along the segment it travelled during the step
//  (PlayerShot.prevX/prevY -> x/y), taken relative to each target's own motion of the step
//  (Enemy.px/py, the boss's previous position, missile velocity), so fast shots never tunnel
//  through small or fast units whatever the frame rate. Every enemy is bucketed into the
//  cells its swept box (+ radius + SHOT_MARGIN) overlaps; a shot reads the cells of its own
//  segment's box. A non-piercing shot resolves its EARLIEST contact along the segment (boss,
//  missile or enemy); a piercing one damages everything it crosses, each once.
//
//  Damage model (docs/BALANCE.md §1): the struck target takes `damage` exactly once. Splash
//  hits every OTHER target in range (the boss counts as one target: body, core and parts).
// =====================================================================================
import { H, PLAY_W } from '../config';
import type { ArsenalBlocker, PlayerShot } from './arsenal/api';
import type { Enemy } from './enemies';
import type { World } from './world';
import { segmentCircle } from './world';

const CELL = 32;
const PAD = 32;          // grid covers [-PAD, PLAY_W + PAD] x [-PAD, H + PAD]
const SHOT_MARGIN = 10;  // enemies are inserted with this extra radius (max shot radius)
const MAX_ENEMIES = 160;
const MAX_ENTRIES = 4096;
/** registerHit() key of the boss for piercing shots (enemy serials are >= 1). */
const BOSS_HIT_KEY = -1;

const HIT_NONE = 0;
const HIT_BOSS = 1;
const HIT_MISSILE = 2;
const HIT_ENEMY = 3;

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
  /** Contact point of the last enemy found by sweepEnemies() (no allocation). */
  private hx = 0;
  private hy = 0;
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

  /**
   * Bucket every hittable enemy into the cells overlapped by its swept box: its motion of
   * this step (px, py) -> (x, y), grown by its radius + SHOT_MARGIN.
   */
  private build(): void {
    const enemies = this.w.enemies;
    const list = enemies.list;
    const start = this.start, fill = this.fill, cols = this.cols;
    start.fill(0);
    this.candCount = 0;
    for (let k = 0; k < list.length && this.candCount < MAX_ENEMIES; k++) {
      const e = list[k];
      if (!enemies.hittable(e)) continue;
      this.cand[this.candCount++] = e;
      const r = e.radius + SHOT_MARGIN;
      const x0 = this.cellX((e.px < e.x ? e.px : e.x) - r), x1 = this.cellX((e.px < e.x ? e.x : e.px) + r);
      const y0 = this.cellY((e.py < e.y ? e.py : e.y) - r), y1 = this.cellY((e.py < e.y ? e.y : e.py) + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) start[cy * cols + cx + 1]++;
    }
    const n = cols * this.rows;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    for (let i = 0; i < n; i++) fill[i] = start[i];
    for (let c = 0; c < this.candCount; c++) {
      const e = this.cand[c];
      const r = e.radius + SHOT_MARGIN;
      const x0 = this.cellX((e.px < e.x ? e.px : e.x) - r), x1 = this.cellX((e.px < e.x ? e.x : e.px) + r);
      const y0 = this.cellY((e.py < e.y ? e.py : e.y) - r), y1 = this.cellY((e.py < e.y ? e.y : e.py) + r);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const ci = cy * cols + cx;
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

  /**
   * Enemies whose circle the swept shot (x0, y0) -> (x1, y1) touches, read from the grid
   * cells of the segment's box. pierce = false: returns the one with the earliest contact
   * (contact point in hx / hy) or null, ignoring contacts at t >= maxT. pierce = true:
   * damages every enemy touched that the shot has not hit yet (registry), returns null.
   */
  private sweepEnemies(s: PlayerShot, x0: number, y0: number, x1: number, y1: number, maxT: number): Enemy | null {
    const w = this.w;
    const r = s.radius;
    const extra = r > SHOT_MARGIN ? r - SHOT_MARGIN : 0;
    const cx0 = this.cellX((x0 < x1 ? x0 : x1) - extra), cx1 = this.cellX((x0 < x1 ? x1 : x0) + extra);
    const cy0 = this.cellY((y0 < y1 ? y0 : y1) - extra), cy1 = this.cellY((y0 < y1 ? y1 : y0) + extra);
    let best: Enemy | null = null;
    let bestT = maxT;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const ci = cy * this.cols + cx;
        const a = this.start[ci], b = this.fill[ci];
        for (let k = a; k < b; k++) {
          const e = this.cand[this.entries[k]];
          if (!e.active) continue;
          // the segment relative to the enemy's own motion of this step
          const ax = x0 + (e.x - e.px), ay = y0 + (e.y - e.py);
          const t = segmentCircle(ax, ay, x1, y1, e.x, e.y, e.radius + r);
          if (t < 0) continue;
          const hx = ax + (x1 - ax) * t, hy = ay + (y1 - ay) * t;
          if (s.pierce) {
            if (s.registerHit(e.serial)) continue; // already hit by this shot (or its beam)
            w.enemies.damage(e, s.damage);
            this.hitFeedback(hx, hy, s.damage);
            continue;
          }
          if (t < bestT) {
            bestT = t;
            best = e;
            this.hx = hx;
            this.hy = hy;
          }
        }
      }
    }
    return best;
  }

  private shot(s: PlayerShot): void {
    const w = this.w;
    const x1 = s.x, y1 = s.y, x0 = s.prevX, y0 = s.prevY, r = s.radius;
    if ((y0 < -16 && y1 < -16) || (y0 > H + 16 && y1 > H + 16) || (x0 < -16 && x1 < -16) || (x0 > PLAY_W + 16 && x1 > PLAY_W + 16)) return;
    const boss = w.boss;
    const bullets = w.bullets;
    if (s.pierce) {
      // a piercing shot hurts the boss ONCE (one hit key for the whole boss): the first
      // element it touches takes the damage (destroyable part, else core x1.5, else body)
      if (boss.active && boss.sweep(x0, y0, x1, y1, r) >= 0 && !s.registerHit(BOSS_HIT_KEY)) {
        boss.damageAt(boss.sweepTarget, s.damage, boss.sweepX, boss.sweepY);
        this.hitFeedback(boss.sweepX, boss.sweepY, boss.fighting ? s.damage : 0);
      }
      if (bullets.sweepMissile(x0, y0, x1, y1, r, this.dt) >= 0) bullets.damageMissile(bullets.sweepIndex, s.damage);
      this.sweepEnemies(s, x0, y0, x1, y1, 2);
      return;
    }
    // non-piercing: the earliest contact along the segment takes the shot
    let kind = HIT_NONE;
    let bestT = 2;
    let hx = 0, hy = 0;
    if (boss.active) {
      const t = boss.sweep(x0, y0, x1, y1, r);
      if (t >= 0) {
        kind = HIT_BOSS;
        bestT = t;
        hx = boss.sweepX;
        hy = boss.sweepY;
      }
    }
    const tm = bullets.sweepMissile(x0, y0, x1, y1, r, this.dt);
    if (tm >= 0 && tm < bestT) {
      kind = HIT_MISSILE;
      bestT = tm;
      hx = x0 + (x1 - x0) * tm;
      hy = y0 + (y1 - y0) * tm;
    }
    const e = this.sweepEnemies(s, x0, y0, x1, y1, bestT);
    if (e) {
      kind = HIT_ENEMY;
      hx = this.hx;
      hy = this.hy;
    }
    switch (kind) {
      case HIT_BOSS:
        s.registerHit(BOSS_HIT_KEY); // its shards (prism) skip the boss
        boss.damageAt(boss.sweepTarget, s.damage, hx, hy);
        if (s.splash > 0) this.splash(hx, hy, s.splash, s.damage, null, true);
        this.hitFeedback(hx, hy, boss.fighting ? s.damage : 0);
        s.impact(hx, hy);
        return;
      case HIT_MISSILE:
        bullets.damageMissile(bullets.sweepIndex, s.damage);
        s.impact(hx, hy);
        return;
      case HIT_ENEMY: {
        const hit = e as Enemy;
        s.registerHit(hit.serial); // its shards (prism) skip the struck enemy
        w.enemies.damage(hit, s.damage);
        if (s.splash > 0) this.splash(hx, hy, s.splash, s.damage, hit, false);
        this.hitFeedback(hx, hy, s.damage);
        s.impact(hx, hy);
        return;
      }
      default:
        return;
    }
  }

  /**
   * Area damage around an impact point to every target in range EXCEPT the struck one:
   * `skip` (the enemy hit directly) and `skipBoss` (the boss was hit directly; it counts as
   * one target). The boss, when only in range, takes it once (Boss.splash()).
   */
  private splash(x: number, y: number, radius: number, dmg: number, skip: Enemy | null, skipBoss: boolean): void {
    const w = this.w;
    for (let c = 0; c < this.candCount; c++) {
      const e = this.cand[c];
      if (e === skip || !e.active) continue;
      const dx = e.x - x, dy = e.y - y, rr = e.radius + radius;
      if (dx * dx + dy * dy < rr * rr) w.enemies.damage(e, dmg);
    }
    if (!skipBoss && w.boss.active) w.boss.splash(x, y, radius, dmg);
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
