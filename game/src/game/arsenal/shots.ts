// =====================================================================================
//  PLAYER SHOT POOL — one pooled implementation of PlayerShot for every weapon.
//
//  - Shots are configured from a ShotSpec (built once per weapon/power, never per frame).
//  - Movement behaviours: straight (+accel/drag), homing, sine (helix), mine, flame, column
//    (beam segments glued to a sidekick). Any shot can grow over its life (scaleEnd).
//  - impact(x, y) ends a shot with its impact visuals (spark / blast ring / soft flash) and
//    splits prism bolts; dead shots are only flagged and are compacted in update(), so
//    shots may end (or spawn shards) safely inside forEach() callbacks.
//  - Piercing shots remember the enemies they hit in a HitRegistry; multi-segment beams
//    share one registry so a whole beam hits each enemy once. Beam segments can be
//    `hidden` (collision only) while one stretched sprite draws the whole beam.
// =====================================================================================
import Phaser from 'phaser';
import type { ArsenalHost, PlayerShot } from './api';
import { ImageGroup, type AnchorSource, type ArsenalEnv } from './env';
import type { FxPool } from './fx';
import { fxTexture } from './textures';
import { HALF_PI, TAU } from './scaling';
import { steer } from './homing';

// ---- movement behaviours
export const MOVE_STRAIGHT = 0;
export const MOVE_HOMING = 1;
export const MOVE_SINE = 2;
export const MOVE_MINE = 3;
export const MOVE_FLAME = 4;
export const MOVE_COLUMN = 5;

// ---- impact visuals
export const HIT_SPARK = 0; // spark star + small glow flash
export const HIT_BLAST = 1; // splash ring + big flash + spark (mortar, mines, rockets)
export const HIT_SOFT = 2;  // tiny glow flash (flames, shards, beams)

/** Hues given to prism shards (white bolt -> spectrum). */
const RAINBOW = [0xff6a6a, 0xffb050, 0xfff070, 0x7cff8c, 0x70e0ff, 0x8a9cff, 0xd890ff];
const WHITE = 0xffffff;

/** Everything needed to launch one kind of projectile. Built at configure time. */
export interface ShotSpec {
  key: string;          // texture key
  move: number;         // MOVE_*
  speed: number;        // initial speed px/s
  damage: number;
  radius: number;       // collision radius px at scale 1 (World grid assumes <= 10)
  splash: number;
  pierce: boolean;
  life: number;         // ms
  scaleX: number;
  scaleY: number;
  rotate: boolean;      // rotate along velocity (art points UP)
  spin: number;         // rad/s visual spin when !rotate
  additive: boolean;    // draw the body additively
  hidden: boolean;      // collision only: no sprite (a sibling shot draws the beam)
  halo: number;         // additive fx_glow diameter px (0 = none)
  haloAlpha: number;
  glow: number;         // glow colour (halo / impact tint)
  core: number;         // core colour (sparks / muzzle / ring tint)
  hit: number;          // HIT_*
  popOnExpire: boolean; // small fizzle when life runs out
  fadeMs: number;       // alpha fade over the last ms of life
  scaleEnd: number;     // scale (and radius) multiplier reached at the end of life
  cull: number;         // extra off-screen margin before culling (long stretched sprites)
  accel: number;        // px/s^2 along heading
  maxSpeed: number;
  drag: number;         // 1/s velocity damping
  turnRate: number;     // homing rad/s
  seekRange: number;    // homing search radius
  launchMs: number;     // homing: fly straight this long first
  amp: number;          // sine amplitude px
  omega: number;        // sine angular frequency rad/s
  splitDist: number;    // prism: split after travelling this far (0 = never)
  splitN: number;
  splitSpread: number;  // half-angle of the shard fan (rad)
  shard: ShotSpec | null;
  rainbow: boolean;     // tint the shards of this bolt with spectrum hues
  armMs: number;        // no collisions during the first ms
  driftY: number;       // mines: constant drift px/s
  trailMs: number;      // exhaust puff every ms (0 = none)
  trailSize: number;
  flicker: number;      // beams: random scaleX flicker amount (0..1)
  blink: boolean;       // mines: pulsing halo
}

/** A fresh spec with neutral defaults. */
export function makeSpec(key: string, glow: number, core: number): ShotSpec {
  return {
    key, move: MOVE_STRAIGHT, speed: 600, damage: 1, radius: 3, splash: 0, pierce: false, life: 1200,
    scaleX: 1, scaleY: 1, rotate: true, spin: 0, additive: false, hidden: false, halo: 0, haloAlpha: 0.5,
    glow, core, hit: HIT_SPARK, popOnExpire: false, fadeMs: 0, scaleEnd: 1, cull: 0, accel: 0,
    maxSpeed: 2000, drag: 0, turnRate: 0, seekRange: 400, launchMs: 0, amp: 0, omega: 0, splitDist: 0,
    splitN: 0, splitSpread: 0, shard: null, rainbow: false, armMs: 0, driftY: 0, trailMs: 0, trailSize: 6,
    flicker: 0, blink: false,
  };
}

/** Set of enemy ids already hit (ring buffer, newest wins). */
export class HitRegistry {
  private readonly ids = new Float64Array(24);
  private n = 0;
  private head = 0;

  reset(): void {
    this.n = 0;
    this.head = 0;
  }

  has(id: number): boolean {
    const ids = this.ids;
    for (let i = 0; i < this.n; i++) if (ids[i] === id) return true;
    return false;
  }

  add(id: number): void {
    if (this.n < this.ids.length) {
      this.ids[this.n++] = id;
    } else {
      this.ids[this.head] = id;
      this.head = (this.head + 1) % this.ids.length;
    }
  }

  copyFrom(o: HitRegistry): void {
    this.ids.set(o.ids);
    this.n = o.n;
    this.head = o.head;
  }
}

/** A pooled live projectile (see PlayerShot in api.ts). */
export class Shot implements PlayerShot {
  x = 0;
  y = 0;
  radius = 3;
  damage = 1;
  splash = 0;
  pierce = false;

  vx = 0;
  vy = 0;
  speed = 0;
  alive = false;
  armMs = 0;
  age = 0;
  life = 0;
  spec: ShotSpec;
  img: Phaser.GameObjects.Image | null = null;
  halo: Phaser.GameObjects.Image | null = null;
  /** Body tint (prism spectrum), WHITE = none. */
  tint = WHITE;
  // homing
  tx = 0;
  ty = 0;
  hasTarget = false;
  retarget = 0;
  // sine
  baseX = 0;
  phase = 0;
  // prism
  travelled = 0;
  // column (beam glued to an anchor)
  anchor = 0;
  ox = 0;
  oy = 0;
  trailT = 0;
  readonly ownReg = new HitRegistry();
  reg: HitRegistry = this.ownReg;

  constructor(private readonly pool: ShotPool, spec: ShotSpec) {
    this.spec = spec;
  }

  registerHit(enemyId: number): boolean {
    const reg = this.reg;
    if (reg.has(enemyId)) return this.pierce;
    reg.add(enemyId); // also recorded for non-piercing bolts (their shards skip that enemy)
    return false;
  }

  impact(x: number, y: number): void {
    if (this.alive) this.pool.impact(this, x, y);
  }

  /** Tints the body (and halo) of a live shot. */
  setTint(color: number): void {
    this.tint = color;
    if (this.img) this.img.setTint(color);
    if (this.halo) this.halo.setTint(color);
  }
}

const CULL_MARGIN = 28;

export class ShotPool {
  private readonly live: Shot[] = [];
  private readonly free: Shot[] = [];
  private readonly bodies: ImageGroup;
  private readonly bodiesAdd: ImageGroup;
  private readonly halos: ImageGroup;
  private readonly glowKey: string;
  private readonly glowSize: number;
  private readonly host: ArsenalHost;
  private readonly dummy: ShotSpec;
  private dirty = false;
  private alive = 0;

  constructor(env: ArsenalEnv, private readonly fx: FxPool, private readonly anchors: AnchorSource, initial: number) {
    this.host = env.host;
    const glow = fxTexture(env.scene, 'fx_glow');
    this.glowKey = glow.key;
    this.glowSize = glow.w;
    this.dummy = makeSpec(glow.key, WHITE, WHITE);
    const d = env.depths.shots;
    this.halos = new ImageGroup(env, d - 0.2, Phaser.BlendModes.ADD, Math.ceil(initial * 0.3), glow.key);
    this.bodies = new ImageGroup(env, d, Phaser.BlendModes.NORMAL, Math.ceil(initial * 0.7), glow.key);
    this.bodiesAdd = new ImageGroup(env, d + 0.1, Phaser.BlendModes.ADD, Math.ceil(initial * 0.3), glow.key);
    for (let i = 0; i < initial; i++) this.free.push(new Shot(this, this.dummy));
  }

  /** Number of live shots. */
  get count(): number {
    return this.alive;
  }

  /** Launches a shot from (x, y) along `angle` (rad, 0 = right, -PI/2 = up). */
  fire(spec: ShotSpec, x: number, y: number, angle: number): Shot {
    const s = this.free.pop() ?? new Shot(this, spec);
    s.spec = spec;
    s.alive = true;
    s.x = x;
    s.y = y;
    s.speed = spec.speed;
    s.vx = Math.cos(angle) * spec.speed;
    s.vy = Math.sin(angle) * spec.speed;
    s.radius = spec.radius;
    s.damage = spec.damage;
    s.splash = spec.splash;
    s.pierce = spec.pierce;
    s.armMs = spec.armMs;
    s.age = 0;
    s.life = spec.life;
    s.tint = WHITE;
    s.hasTarget = false;
    s.retarget = 0;
    s.baseX = x;
    s.phase = 0;
    s.travelled = 0;
    s.anchor = 0;
    s.ox = 0;
    s.oy = 0;
    s.trailT = spec.trailMs * 0.5;
    s.ownReg.reset();
    s.reg = s.ownReg;
    s.img = null;
    s.halo = null;
    if (!spec.hidden) {
      const img = (spec.additive ? this.bodiesAdd : this.bodies).take(spec.key);
      img.setScale(spec.scaleX, spec.scaleY);
      img.x = x;
      img.y = y;
      img.rotation = spec.rotate ? Math.atan2(s.vy, s.vx) + HALF_PI : spec.spin !== 0 ? Math.random() * TAU : 0;
      s.img = img;
      if (spec.halo > 0) {
        const h = this.halos.take(this.glowKey);
        h.setTint(spec.glow);
        h.setScale(spec.halo / this.glowSize);
        h.setAlpha(spec.haloAlpha);
        h.x = x;
        h.y = y;
        s.halo = h;
      }
    }
    this.live.push(s);
    this.alive++;
    return s;
  }

  /** Moves a just-fired shot forward by `ms` (smooth streams at high fire rates). */
  advance(s: Shot, ms: number): void {
    if (ms <= 0) return;
    const t = ms / 1000;
    s.x += s.vx * t;
    s.y += s.vy * t;
    s.travelled += s.speed * t;
    s.age += ms;
    if (s.img) {
      s.img.x = s.x;
      s.img.y = s.y;
    }
    if (s.halo) {
      s.halo.x = s.x;
      s.halo.y = s.y;
    }
  }

  /** Ends a shot with its impact visuals (and prism shards). */
  impact(s: Shot, x: number, y: number): void {
    const sp = s.spec;
    const fx = this.fx;
    const glow = s.tint !== WHITE ? s.tint : sp.glow;
    s.x = x;
    s.y = y;
    switch (sp.hit) {
      case HIT_BLAST: {
        const r = Math.max(10, s.splash);
        fx.ring(x, y, r, sp.core, 320);
        fx.flash(x, y, glow, r * 1.8, 240, 0.9);
        fx.flash(x, y, WHITE, r * 0.7, 130, 1);
        fx.spark(x, y, sp.core, 1.8);
        break;
      }
      case HIT_SOFT:
        fx.flash(x, y, glow, 14, 100, 0.75);
        break;
      default:
        fx.spark(x, y, sp.core, 1.2);
        fx.flash(x, y, glow, 18, 110, 0.8);
    }
    if (sp.shard && sp.splitN > 0) this.split(s, true);
    this.kill(s);
  }

  private split(s: Shot, fromImpact: boolean): void {
    const sp = s.spec;
    const child = sp.shard as ShotSpec;
    const n = sp.splitN;
    const base = Math.atan2(s.vy, s.vx);
    for (let k = 0; k < n; k++) {
      const a = n === 1 ? base : base - sp.splitSpread + (2 * sp.splitSpread * k) / (n - 1);
      const c = this.fire(child, s.x, s.y, a + (Math.random() - 0.5) * 0.05);
      c.ownReg.copyFrom(s.reg);
      if (fromImpact && c.armMs < 70) c.armMs = 70; // clear the struck enemy first
      if (sp.rainbow) c.setTint(RAINBOW[n === 1 ? 3 : Math.round((k * (RAINBOW.length - 1)) / (n - 1))]);
      else if (s.tint !== WHITE) c.setTint(s.tint);
    }
    this.fx.flash(s.x, s.y, s.tint !== WHITE ? s.tint : sp.glow, 20 + n * 2, 120, 0.9);
  }

  private kill(s: Shot): void {
    if (!s.alive) return;
    s.alive = false;
    if (s.img) (s.spec.additive ? this.bodiesAdd : this.bodies).give(s.img);
    if (s.halo) this.halos.give(s.halo);
    s.img = null;
    s.halo = null;
    this.alive--;
    this.dirty = true;
  }

  private expire(s: Shot): void {
    const sp = s.spec;
    if (sp.popOnExpire) {
      this.fx.flash(s.x, s.y, sp.glow, 14 + sp.radius * 2, 140, 0.6);
      this.fx.spark(s.x, s.y, sp.core, 0.8);
    }
    this.kill(s);
  }

  /** Moves every shot, applies behaviours, culls, then recycles dead shots. */
  update(dtMs: number): void {
    this.compact();
    const dt = dtMs / 1000;
    const b = this.host.bounds;
    const live = this.live;
    const n = live.length;
    for (let i = 0; i < n; i++) {
      const s = live[i];
      if (!s.alive) continue;
      s.age += dtMs;
      if (s.age >= s.life) {
        this.expire(s);
        continue;
      }
      if (s.armMs > 0) s.armMs -= dtMs;
      const sp = s.spec;
      const img = s.img;
      let alpha = 1;
      if (sp.fadeMs > 0) {
        const rem = s.life - s.age;
        if (rem < sp.fadeMs) alpha = rem / sp.fadeMs;
      }
      switch (sp.move) {
        case MOVE_HOMING:
          steer(s, sp, dt, dtMs, this.host);
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          break;
        case MOVE_SINE: {
          s.y += s.vy * dt;
          const arg = sp.omega * (s.age / 1000) + s.phase;
          const amp = s.age < 90 ? (sp.amp * s.age) / 90 : sp.amp;
          s.x = s.baseX + amp * Math.sin(arg);
          s.vx = amp * sp.omega * Math.cos(arg);
          break;
        }
        case MOVE_MINE:
        case MOVE_FLAME: {
          const k = Math.max(0, 1 - sp.drag * dt);
          s.vx *= k;
          s.vy *= k;
          s.x += s.vx * dt;
          s.y += (s.vy + sp.driftY) * dt;
          break;
        }
        case MOVE_COLUMN: {
          s.x = this.anchors.anchorX(s.anchor) + s.ox;
          s.y = this.anchors.anchorY(s.anchor) + s.oy;
          if (img) img.setScale(sp.scaleX * (1 - sp.flicker * Math.random()) * (0.35 + 0.65 * alpha), sp.scaleY);
          break;
        }
        default: {
          if (sp.accel !== 0) {
            const v = s.speed;
            let nv = v + sp.accel * dt;
            if (nv > sp.maxSpeed) nv = sp.maxSpeed;
            if (nv < 1) nv = 1;
            if (v > 0) {
              const k = nv / v;
              s.vx *= k;
              s.vy *= k;
            }
            s.speed = nv;
          }
          if (sp.drag > 0) {
            const k = Math.max(0, 1 - sp.drag * dt);
            s.vx *= k;
            s.vy *= k;
            s.speed *= k;
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.travelled += s.speed * dt;
          if (sp.splitDist > 0 && s.travelled >= sp.splitDist) {
            this.split(s, false);
            this.kill(s);
            continue;
          }
        }
      }
      const m = CULL_MARGIN + sp.cull;
      if (s.x < b.x - m || s.x > b.x + b.w + m || s.y < b.y - m || s.y > b.y + b.h + m) {
        this.kill(s);
        continue;
      }
      if (sp.scaleEnd !== 1 && sp.move !== MOVE_COLUMN) {
        const sc = 1 + (sp.scaleEnd - 1) * (s.age / s.life);
        s.radius = sp.radius * sc;
        if (img) img.setScale(sp.scaleX * sc, sp.scaleY * sc);
      }
      if (img) {
        img.x = s.x;
        img.y = s.y;
        if (sp.rotate) img.rotation = Math.atan2(s.vy, s.vx) + HALF_PI;
        else if (sp.spin !== 0) img.rotation += sp.spin * dt;
        img.alpha = alpha;
      }
      const h = s.halo;
      if (h) {
        h.x = s.x;
        h.y = s.y;
        h.alpha = sp.blink
          ? sp.haloAlpha * alpha * (0.35 + 0.65 * (Math.sin(s.age * (0.008 + s.age * 0.0000035)) * 0.5 + 0.5))
          : sp.haloAlpha * alpha;
      }
      if (sp.trailMs > 0) {
        s.trailT -= dtMs;
        if (s.trailT <= 0) {
          s.trailT += sp.trailMs;
          const inv = 1 / Math.max(1, Math.sqrt(s.vx * s.vx + s.vy * s.vy));
          this.fx.trail(s.x - s.vx * inv * 5, s.y - s.vy * inv * 5, sp.glow, sp.trailSize, -s.vx * 0.08, -s.vy * 0.08, 220);
        }
      }
    }
    this.compact();
  }

  private compact(): void {
    if (!this.dirty) return;
    const live = this.live;
    let j = 0;
    for (let i = 0; i < live.length; i++) {
      const s = live[i];
      if (s.alive) live[j++] = s;
      else this.free.push(s);
    }
    live.length = j;
    this.dirty = false;
  }

  /** Iterates collidable shots (alive, armed, damaging). Shots may end inside the callback. */
  forEach(cb: (shot: PlayerShot) => void): void {
    const live = this.live;
    const n = live.length;
    for (let i = 0; i < n && i < live.length; i++) {
      const s = live[i];
      if (s.alive && s.armMs <= 0 && s.damage > 0) cb(s);
    }
  }

  /** Removes every shot immediately (no impact visuals). */
  clear(): void {
    const live = this.live;
    for (let i = 0; i < live.length; i++) this.kill(live[i]);
    this.compact();
  }

  destroy(): void {
    this.clear();
    this.bodies.destroy();
    this.bodiesAdd.destroy();
    this.halos.destroy();
    this.free.length = 0;
  }
}
