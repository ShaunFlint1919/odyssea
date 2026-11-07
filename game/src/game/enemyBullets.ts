// =====================================================================================
//  ENEMY BULLETS — one pool of 640 bullets stored in typed arrays (no per-frame
//  allocation) + a small pool of telegraphed lasers.
//   kinds: plain bullets, flak (bursts into 6 fragments after a fuse), homing missiles
//   (slow, can be shot down), fragments.
//  Bullet -> ship collision is resolved here (circle vs circle with the ship hit radius).
// =====================================================================================
import Phaser from 'phaser';
import { DEPTH, ENEMY_BULLET_DAMAGE, H, PLAY_W } from '../config';
import { ENEMY_BULLET_SPRITES, SHOT_RGB, enemyBulletKey } from '../art/keys';
import type { ShotColor } from '../types';
import { SHOT_COLORS } from '../types';
import { TEX_PX, fallbackTex } from './tex';
import type { World } from './world';
import { angleDiff } from './world';

/** Something a laser beam is attached to (an enemy, a boss muzzle). */
export interface LaserOwner {
  /** Changes when the owner object is recycled. */
  readonly serial: number;
  readonly alive: boolean;
  laserX(): number;
  laserY(): number;
}

export const KIND_PLAIN = 0;
export const KIND_FLAK = 1;
export const KIND_MISSILE = 2;

const MAX = 640;
const MAX_MISSILES = 48;
const MARGIN = 18;
const MISSILE_LIFE = 5.5;
const MISSILE_TURN = 1.9; // rad/s
const FLAK_FUSE = 0.85;

/**
 * Angle convention of elongated enemy bullet textures (eb_needle, eb_missile): drawn
 * pointing DOWN (+y), so the sprite rotation is the velocity angle minus PI/2.
 */
export const BULLET_ART_ANGLE = Math.PI / 2;

const ELONGATED: Record<string, boolean> = { eb_needle: true, eb_missile: true };
const SPRITE_NAMES = Object.keys(ENEMY_BULLET_SPRITES);
/** Flak shells are drawn this much larger than their fragments. */
const FLAK_SHELL_SCALE = 1.35;

/** Read-only view of a telegraphed laser. state: 0 warning line, 1 firing, 2 fading out. */
export interface LaserView {
  readonly active: boolean;
  readonly state: number;
  /** Seconds spent in the current state, and the warning duration. */
  readonly t: number;
  readonly warn: number;
  /** Beam column x, origin y (the beam goes down to the bottom of the screen) and full width (px). */
  readonly x: number;
  readonly y0: number;
  readonly width: number;
}

class Laser implements LaserView {
  active = false;
  owner: LaserOwner | null = null;
  serial = 0;
  state = 0; // 0 warn, 1 fire, 2 fade
  t = 0;
  warn = 0.7;
  dur = 0.8;
  width = 8;
  tick = 0;
  x = 0;
  y0 = 0;
  colorGlow = 0xffffff;
  constructor(
    readonly line: Phaser.GameObjects.Image,
    readonly beam: Phaser.GameObjects.Image,
    readonly glow: Phaser.GameObjects.Image,
  ) {}
}

export class EnemyBullets {
  private readonly scene: Phaser.Scene;
  readonly x = new Float32Array(MAX);
  readonly y = new Float32Array(MAX);
  readonly vx = new Float32Array(MAX);
  readonly vy = new Float32Array(MAX);
  /** Collision radius of each bullet (px). */
  readonly rad = new Float32Array(MAX);
  private readonly dmg = new Float32Array(MAX);
  private readonly life = new Float32Array(MAX);
  private readonly hp = new Float32Array(MAX);
  private readonly spd = new Float32Array(MAX);
  private readonly kind = new Uint8Array(MAX);
  private readonly color = new Uint8Array(MAX);
  /** Index of the bullet sprite in SPRITE_NAMES (flak fragments reuse the shell's sprite). */
  private readonly sprite = new Uint8Array(MAX);
  private readonly rotates = new Uint8Array(MAX);
  private readonly imgs: Phaser.GameObjects.Image[] = [];
  private readonly act = new Int32Array(MAX);
  private actCount = 0;
  private readonly slotOf = new Int32Array(MAX); // index in act[] of bullet i
  private readonly free = new Int32Array(MAX);
  private freeCount = 0;
  private readonly missiles = new Int32Array(MAX_MISSILES);
  private missileCount = 0;
  private readonly lasers: Laser[] = [];
  private readonly keyCache = new Map<string, string>();
  private trailT = 0;

  constructor(private readonly w: World) {
    const scene = (this.scene = w.scene);
    const fb = fallbackTex(scene, 'bullet');
    for (let i = 0; i < MAX; i++) {
      this.imgs.push(scene.add.image(-50, -50, fb).setDepth(DEPTH.enemyBullets).setVisible(false));
      this.free[this.freeCount++] = MAX - 1 - i;
    }
    for (let i = 0; i < 16; i++) {
      const line = scene.add.image(0, 0, TEX_PX).setOrigin(0.5, 0).setDepth(DEPTH.enemyBullets - 1).setVisible(false);
      const beam = scene.add.image(0, 0, TEX_PX).setOrigin(0.5, 0).setDepth(DEPTH.enemyBullets).setVisible(false);
      const glow = scene.add.image(0, 0, scene.textures.exists('fx_glow') ? 'fx_glow' : fallbackTex(scene, 'glow'))
        .setDepth(DEPTH.enemyBullets + 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.lasers.push(new Laser(line, beam, glow));
    }
  }

  /** Number of live bullets (lasers excluded). */
  get count(): number {
    return this.actCount;
  }

  /** Index into x / y / vx / vy / rad of the k-th live bullet (0 <= k < count). */
  activeAt(k: number): number {
    return this.act[k];
  }

  /** The laser slots (read-only view for the autopilot; check `active`). */
  get laserViews(): readonly LaserView[] {
    return this.lasers;
  }

  /** Resolved texture key for a bullet sprite/colour (cached; falls back if the art is missing). */
  private key(sprite: string, color: ShotColor): string {
    const k = enemyBulletKey(sprite, color);
    let v = this.keyCache.get(k);
    if (v === undefined) {
      v = this.scene.textures.exists(k) ? k : fallbackTex(this.scene, 'bullet');
      this.keyCache.set(k, v);
    }
    return v;
  }

  /**
   * Fire one bullet. angle in radians (0 = right, PI/2 = down), speed in px/s (difficulty
   * already applied by the caller). Returns the bullet index or -1 when the pool is full.
   */
  fire(x: number, y: number, angle: number, speed: number, sprite: string, color: ShotColor, kind = KIND_PLAIN): number {
    if (this.freeCount === 0) return -1;
    const i = this.free[--this.freeCount];
    this.slotOf[i] = this.actCount;
    this.act[this.actCount++] = i;
    const spr = kind === KIND_MISSILE ? 'eb_missile' : sprite;
    const size = (ENEMY_BULLET_SPRITES as Record<string, number>)[spr] ?? 8;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = Math.cos(angle) * speed;
    this.vy[i] = Math.sin(angle) * speed;
    this.spd[i] = speed;
    this.rad[i] = spr === 'eb_needle' ? 2.2 : Math.max(2, size * 0.36);
    this.dmg[i] = (ENEMY_BULLET_DAMAGE[spr] ?? 3) * this.w.diff.damage;
    this.life[i] = 0;
    this.hp[i] = kind === KIND_MISSILE ? 3 * this.w.diff.hp : 0;
    this.kind[i] = kind;
    this.color[i] = Math.max(0, SHOT_COLORS.indexOf(color));
    this.sprite[i] = Math.max(0, SPRITE_NAMES.indexOf(spr));
    this.rotates[i] = ELONGATED[spr] ? 1 : 0;
    const img = this.imgs[i];
    img.setTexture(this.key(spr, color)).setPosition(x, y).setVisible(true).setAlpha(1)
      .setScale(kind === KIND_FLAK ? FLAK_SHELL_SCALE : 1);
    img.rotation = this.rotates[i] ? angle - BULLET_ART_ANGLE : 0;
    if (kind === KIND_MISSILE && this.missileCount < MAX_MISSILES) this.missiles[this.missileCount++] = i;
    return i;
  }

  private release(i: number): void {
    const k = this.slotOf[i];
    const last = this.act[--this.actCount];
    this.act[k] = last;
    this.slotOf[last] = k;
    this.free[this.freeCount++] = i;
    this.imgs[i].setVisible(false);
    if (this.kind[i] === KIND_MISSILE) {
      for (let m = 0; m < this.missileCount; m++) {
        if (this.missiles[m] === i) {
          this.missiles[m] = this.missiles[--this.missileCount];
          break;
        }
      }
    }
  }

  private burstFlak(i: number): void {
    const x = this.x[i], y = this.y[i];
    const color = SHOT_COLORS[this.color[i]];
    const sp = this.spd[i] * 1.35 + 20;
    const ph = this.w.fxRng() * Math.PI;
    const spr = SPRITE_NAMES[this.sprite[i]];
    for (let k = 0; k < 6; k++) this.fire(x, y, ph + (k * Math.PI) / 3, sp, spr, color, KIND_PLAIN);
    this.w.fx.blast(x, y, 's', 0.6);
    this.w.fx.glow(x, y, SHOT_RGB[color].glow, 0.8, 140);
  }

  private popMissile(i: number): void {
    this.w.fx.blast(this.x[i], this.y[i], 's', 0.7);
    this.w.fx.sparks(this.x[i], this.y[i], 4, 70);
  }

  /** Advance bullets and lasers, resolve hits on the ship. dt in seconds. */
  update(dt: number): void {
    const ship = this.w.ship;
    const sx = ship.x, sy = ship.y;
    const hittable = ship.hittable;
    const sr = ship.hitRadius;
    this.trailT -= dt;
    const trail = this.trailT <= 0;
    if (trail) this.trailT = 0.05;
    for (let k = this.actCount - 1; k >= 0; k--) {
      const i = this.act[k];
      this.life[i] += dt;
      const kind = this.kind[i];
      if (kind === KIND_MISSILE) {
        if (this.life[i] > MISSILE_LIFE) {
          this.popMissile(i);
          this.release(i);
          continue;
        }
        const a = Math.atan2(this.vy[i], this.vx[i]);
        let na = a;
        if (ship.alive && this.y[i] < sy - 10) {
          const want = Math.atan2(sy - this.y[i], sx - this.x[i]);
          const d = angleDiff(a, want);
          const maxT = MISSILE_TURN * dt;
          na = a + (d > maxT ? maxT : d < -maxT ? -maxT : d);
        }
        const s = Math.min(this.spd[i] * 1.6, Math.hypot(this.vx[i], this.vy[i]) + 18 * dt);
        this.vx[i] = Math.cos(na) * s;
        this.vy[i] = Math.sin(na) * s;
        this.imgs[i].rotation = na - BULLET_ART_ANGLE;
        if (trail) this.w.fx.trail(this.x[i] - Math.cos(na) * 5, this.y[i] - Math.sin(na) * 5);
      } else if (kind === KIND_FLAK && this.life[i] >= FLAK_FUSE) {
        this.burstFlak(i);
        this.release(i);
        continue;
      }
      const x = (this.x[i] += this.vx[i] * dt);
      const y = (this.y[i] += this.vy[i] * dt);
      if (x < -MARGIN || x > PLAY_W + MARGIN || y < -MARGIN - 20 || y > H + MARGIN) {
        this.release(i);
        continue;
      }
      if (hittable) {
        const dx = x - sx, dy = y - sy, rr = this.rad[i] + sr;
        if (dx * dx + dy * dy < rr * rr) {
          ship.hit(this.dmg[i], x, y);
          this.w.fx.hit(x, y, SHOT_RGB[SHOT_COLORS[this.color[i]]].glow);
          this.release(i);
          continue;
        }
      }
      this.imgs[i].setPosition(x, y);
    }
    this.updateLasers(dt, hittable, sx, sy, sr);
  }

  // ------------------------------------------------------------------ lasers

  /** Start a telegraphed vertical laser on an owner (no-op if that owner already has one). */
  startLaser(owner: LaserOwner, color: ShotColor, warnSec = 0.75, fireSec = 0.8, width = 8): void {
    let slot: Laser | null = null;
    for (const l of this.lasers) {
      if (l.active && l.owner === owner && l.serial === owner.serial) return;
      if (!l.active && !slot) slot = l;
    }
    if (!slot) return;
    const l = slot;
    l.active = true;
    l.owner = owner;
    l.serial = owner.serial;
    l.state = 0;
    l.t = 0;
    l.warn = warnSec;
    l.dur = fireSec;
    l.width = width;
    l.tick = 0;
    l.x = owner.laserX();
    l.y0 = owner.laserY();
    const rgb = SHOT_RGB[color];
    l.colorGlow = rgb.glow;
    const beamKey = this.key('eb_laser', color);
    l.line.setTint(rgb.glow).setVisible(true).setAlpha(0.6);
    l.beam.setTexture(beamKey).setVisible(false).clearTint();
    l.glow.setTint(rgb.glow).setVisible(false);
  }

  private updateLasers(dt: number, hittable: boolean, sx: number, sy: number, sr: number): void {
    for (const l of this.lasers) {
      if (!l.active) continue;
      const o = l.owner!;
      const ownerOk = o.alive && o.serial === l.serial && !this.w.ended;
      if (ownerOk) {
        l.x = o.laserX();
        l.y0 = o.laserY();
      } else if (l.state < 2) {
        l.state = 2;
        l.t = 0;
      }
      l.t += dt;
      const len = Math.max(1, H - l.y0 + 8);
      if (l.state === 0) {
        const blink = Math.floor(l.t * 16) % 2 === 0;
        l.line.setPosition(l.x, l.y0).setDisplaySize(1, len).setAlpha(blink ? 0.85 : 0.35);
        if (l.t >= l.warn) {
          l.state = 1;
          l.t = 0;
          l.line.setVisible(false);
          l.beam.setVisible(true);
          l.glow.setVisible(true);
          this.w.services.sfx('enemy_laser');
        }
      } else if (l.state === 1) {
        const grow = Math.min(1, l.t / 0.08);
        const flick = 0.88 + ((Math.floor(l.t * 30) % 3) * 0.06);
        const bw = l.width * grow * flick;
        l.beam.setPosition(l.x, l.y0).setDisplaySize(bw, len);
        l.glow.setPosition(l.x, l.y0).setScale(0.7 + 0.2 * flick).setAlpha(0.9);
        if (hittable && sy > l.y0 - sr && Math.abs(sx - l.x) < bw * 0.42 + sr) {
          l.tick -= dt;
          if (l.tick <= 0) {
            l.tick = 0.1;
            this.w.ship.hit(ENEMY_BULLET_DAMAGE.eb_laser * this.w.diff.damage, sx, sy - 4);
            this.w.fx.hit(sx, sy - 6, l.colorGlow);
          }
        }
        if (l.t >= l.dur) {
          l.state = 2;
          l.t = 0;
        }
      } else {
        const p = Math.min(1, l.t / 0.15);
        l.line.setVisible(false);
        l.beam.setPosition(l.x, l.y0).setDisplaySize(Math.max(0.5, l.width * (1 - p)), len);
        l.glow.setAlpha(0.9 * (1 - p));
        if (p >= 1) {
          l.active = false;
          l.owner = null;
          l.beam.setVisible(false);
          l.glow.setVisible(false);
        }
      }
    }
  }

  /** True if the owner has an active (warning or firing) laser. */
  hasLaser(owner: LaserOwner): boolean {
    for (const l of this.lasers) if (l.active && l.owner === owner && l.serial === owner.serial && l.state < 2) return true;
    return false;
  }

  // ------------------------------------------------------------------ interactions

  /** Player shot vs homing missiles: damages the first missile within r. Returns true on hit. */
  hitMissile(x: number, y: number, r: number, damage: number): boolean {
    for (let m = 0; m < this.missileCount; m++) {
      const i = this.missiles[m];
      const dx = this.x[i] - x, dy = this.y[i] - y, rr = this.rad[i] + r + 2;
      if (dx * dx + dy * dy < rr * rr) {
        this.hp[i] -= damage;
        if (this.hp[i] <= 0) {
          this.popMissile(i);
          this.w.stats.score += 10;
          this.release(i);
        } else {
          this.w.fx.hit(this.x[i], this.y[i], 0xffffff);
        }
        return true;
      }
    }
    return false;
  }

  /** Destroy every bullet within r of (x, y) (orbiter blockers). Returns how many. */
  cancelInCircle(x: number, y: number, r: number): number {
    let n = 0;
    for (let k = this.actCount - 1; k >= 0; k--) {
      const i = this.act[k];
      const dx = this.x[i] - x, dy = this.y[i] - y, rr = this.rad[i] + r;
      if (dx * dx + dy * dy < rr * rr) {
        this.w.fx.hit(this.x[i], this.y[i], SHOT_RGB[SHOT_COLORS[this.color[i]]].glow);
        this.release(i);
        n++;
      }
    }
    return n;
  }

  /** Turn every live bullet into a small credit gem (boss death). */
  convertToGems(): void {
    for (let k = this.actCount - 1; k >= 0; k--) {
      const i = this.act[k];
      const big = this.rad[i] >= 4;
      this.w.pickups.spawnGem(this.x[i], this.y[i], big ? 2 : 1, 0, 0);
      this.release(i);
    }
    this.endLasers();
  }

  /** Remove every bullet (optionally with a small sparkle on a few of them). */
  clearAll(sparkle: boolean): void {
    for (let k = this.actCount - 1; k >= 0; k--) {
      const i = this.act[k];
      if (sparkle && k % 4 === 0) this.w.fx.hit(this.x[i], this.y[i], 0xffffff);
      this.release(i);
    }
    this.endLasers();
  }

  private endLasers(): void {
    for (const l of this.lasers) {
      if (l.active && l.state < 2) {
        l.state = 2;
        l.t = 0;
      }
    }
  }
}
