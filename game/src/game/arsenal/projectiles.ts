// =====================================================================================
//  PLAYER SHOT POOL — one pooled implementation of PlayerShot for every weapon.
//
//  - Shots are configured from a ShotSpec (built once per weapon/power, never per frame).
//    Bodies are dedicated pixel-exact textures (./art.ts): no non-integer scaling; animated
//    bodies step their frames (looping every frameMs, or spread over the shot's life).
//  - Movement behaviours: straight (+accel/drag), homing, sine (helix), mine, flame, column
//    (beam segments glued to a sidekick). The collision radius can grow over life
//    (radiusEnd) while growth is shown by the texture frames.
//  - Trails (smoke puffs + hot embers, ember sparks, beam crackle) are pooled FX items.
//  - impact(x, y) ends a shot with its ImpactFx (spark / flash / white core / splash ring /
//    embers scaled to the hit) and splits prism bolts; piercing shots show a small spark on
//    every NEW hit (registerHit). Dead shots are only flagged and compacted in update(), so
//    shots may end (or spawn shards) safely inside forEach() callbacks.
//  - Splits never create damage out of thin air: the fan of a split shares `splitShare` x
//    the parent's damage (in flight) or `impactShare` x (after the parent hit its target).
//  - Every update records where each shot was before it moved (PlayerShot.prevX / prevY, the
//    spawn point until its first move): the World sweeps that segment (no tunnelling).
//  - Piercing shots remember the enemies they hit in a HitRegistry; multi-segment beams
//    share one registry so a whole beam hits each enemy once. Beam segments can be
//    `hidden` (collision only) while one sprite draws the whole beam.
// =====================================================================================
import Phaser from 'phaser';
import type { ArsenalHost, PlayerShot } from './api';
import { ImageGroup, type AnchorSource, type ArsenalEnv } from './env';
import type { FxPool } from './effects';
import { emberTex, glowTex, smokeTex } from './art';
import { NO_IMPACT, type ImpactFx } from './looks';
import type { TexInfo } from './textures';
import { HALF_PI } from './scaling';
import { steer } from './steering';

// ---- movement behaviours
export const MOVE_STRAIGHT = 0;
export const MOVE_HOMING = 1;
export const MOVE_SINE = 2;
export const MOVE_MINE = 3;
export const MOVE_FLAME = 4;
export const MOVE_COLUMN = 5;

// ---- impact styles
export const HIT_SPARK = 0; // ImpactFx as configured (spark star, flash, embers)
export const HIT_BLAST = 1; // same + splash ring (ImpactFx.blast)
export const HIT_SOFT = 2;  // flash + embers only (flames, shards, beams)

// ---- trails
export const TRAIL_NONE = 0;
export const TRAIL_SMOKE = 1; // grey smoke puffs (normal blend) + a hot ember every other puff
export const TRAIL_EMBER = 2; // glowing embers drifting back
export const TRAIL_ZAP = 3;   // crackle zaps along the shot (trailTex), lance beams

const WHITE = 0xffffff;

/** Everything needed to launch one kind of projectile. Built at configure time. */
export interface ShotSpec {
  tex: TexInfo;         // body texture (sheet: animated)
  frameMs: number;      // > 0: frames loop every frameMs; 0: frames are spread over the life
  move: number;         // MOVE_*
  speed: number;        // initial speed px/s
  damage: number;
  radius: number;       // collision radius px (World grid assumes <= 10)
  radiusEnd: number;    // radius multiplier reached at the end of life (flames, rings)
  splash: number;
  pierce: boolean;
  life: number;         // ms
  rotate: boolean;      // rotate along velocity (art points UP)
  quarter: boolean;     // !rotate: random multiple of 90 deg at launch (organic sprites stay crisp)
  hidden: boolean;      // collision only: no sprite (a sibling shot draws the beam)
  halo: TexInfo | null; // additive glow following the shot (tinted `glow`)
  haloAlpha: number;
  blink: boolean;       // halo pulses faster and faster (mines)
  glow: number;         // glow colour (halo / flash / ember tint)
  core: number;         // core colour (embers of heavy hits)
  hit: number;          // HIT_*
  fx: ImpactFx;
  popOnExpire: boolean; // small fizzle when life runs out
  fadeMs: number;       // alpha fade over the last ms of life (0 = none)
  cull: number;         // extra off-screen margin before culling (long sprites)
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
  /** Total damage of the fan of an in-flight split, as a multiple of the parent's damage (1 = conserved). */
  splitShare: number;
  /** Same for a split on impact (the parent already dealt its damage to the struck target). */
  impactShare: number;
  shard: ShotSpec | null;
  shardTex: readonly TexInfo[] | null; // per-shard textures (spectrum), picked across the fan
  armMs: number;        // no collisions during the first ms
  driftY: number;       // mines: constant drift px/s
  trail: number;        // TRAIL_*
  trailMs: number;
  trailTex: TexInfo | null; // TRAIL_ZAP sprite
  trailSpread: number;  // TRAIL_ZAP: half-length (px) along the shot over which zaps appear
}

/** A fresh spec with neutral defaults. */
export function makeSpec(tex: TexInfo, glow: number, core: number): ShotSpec {
  return {
    tex, frameMs: 0, move: MOVE_STRAIGHT, speed: 600, damage: 1, radius: 3, radiusEnd: 1, splash: 0, pierce: false,
    life: 1200, rotate: true, quarter: false, hidden: false, halo: null, haloAlpha: 0.3, blink: false,
    glow, core, hit: HIT_SPARK, fx: NO_IMPACT, popOnExpire: false, fadeMs: 0, cull: 0, accel: 0, maxSpeed: 2000, drag: 0,
    turnRate: 0, seekRange: 400, launchMs: 0, amp: 0, omega: 0, splitDist: 0, splitN: 0, splitSpread: 0, splitShare: 1,
    impactShare: 0, shard: null, shardTex: null, armMs: 0, driftY: 0, trail: TRAIL_NONE, trailMs: 40, trailTex: null, trailSpread: 0,
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
  /** Position before the last move (swept collisions), see PlayerShot. */
  prevX = 0;
  prevY = 0;
  /** Fired since the last update(): prevX / prevY still hold the spawn point. */
  fresh = false;
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
  tex: TexInfo;
  frame = 0;
  img: Phaser.GameObjects.Image | null = null;
  halo: Phaser.GameObjects.Image | null = null;
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
  trailN = 0;
  readonly ownReg = new HitRegistry();
  reg: HitRegistry = this.ownReg;

  constructor(private readonly pool: ShotPool, spec: ShotSpec) {
    this.spec = spec;
    this.tex = spec.tex;
  }

  registerHit(enemyId: number): boolean {
    const reg = this.reg;
    if (reg.has(enemyId)) return this.pierce;
    reg.add(enemyId); // also recorded for non-piercing bolts (their shards skip that enemy)
    if (this.pierce && this.alive) this.pool.pierceHit(this);
    return false;
  }

  impact(x: number, y: number): void {
    if (this.alive) this.pool.impact(this, x, y);
  }
}

const CULL_MARGIN = 28;

export class ShotPool {
  private readonly live: Shot[] = [];
  private readonly free: Shot[] = [];
  private readonly bodies: ImageGroup;
  private readonly halos: ImageGroup;
  private readonly host: ArsenalHost;
  private readonly dummy: ShotSpec;
  private readonly smokeTex: TexInfo;
  private readonly emberTex: TexInfo;
  private dirty = false;
  private alive = 0;

  /**
   * @param fx    additive impact / trail pool (above the shots)
   * @param smoke normal-blend smoke pool (below the shots)
   */
  constructor(env: ArsenalEnv, private readonly fx: FxPool, private readonly smoke: FxPool,
    private readonly anchors: AnchorSource, initial: number) {
    this.host = env.host;
    const init = glowTex(env.scene, 11);
    this.smokeTex = smokeTex(env.scene);
    this.emberTex = emberTex(env.scene);
    this.dummy = makeSpec(init, WHITE, WHITE);
    const d = env.depths.shots;
    // Images are pre-created for a typical peak (the groups grow on demand); Shot objects for `initial`.
    this.halos = new ImageGroup(env, d - 0.2, Phaser.BlendModes.ADD, Math.ceil(initial * 0.2), init.key);
    this.bodies = new ImageGroup(env, d, Phaser.BlendModes.NORMAL, Math.ceil(initial * 0.5), init.key);
    for (let i = 0; i < initial; i++) this.free.push(new Shot(this, this.dummy));
  }

  /** Number of live shots. */
  get count(): number {
    return this.alive;
  }

  /**
   * Launches a shot from (x, y) along `angle` (rad, 0 = right, -PI/2 = up), optionally with
   * another body texture than the spec's (spectrum shards).
   */
  fire(spec: ShotSpec, x: number, y: number, angle: number, tex: TexInfo = spec.tex): Shot {
    const s = this.free.pop() ?? new Shot(this, spec);
    s.spec = spec;
    s.tex = tex;
    s.frame = 0;
    s.alive = true;
    s.x = x;
    s.y = y;
    s.prevX = x;
    s.prevY = y;
    s.fresh = true;
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
    s.hasTarget = false;
    s.retarget = 0;
    s.baseX = x;
    s.phase = 0;
    s.travelled = 0;
    s.anchor = 0;
    s.ox = 0;
    s.oy = 0;
    s.trailT = spec.trailMs * 0.5;
    s.trailN = 0;
    s.ownReg.reset();
    s.reg = s.ownReg;
    s.img = null;
    s.halo = null;
    if (!spec.hidden) {
      const img = this.bodies.take(tex.key, tex.first);
      img.x = x;
      img.y = y;
      img.rotation = spec.rotate ? Math.atan2(s.vy, s.vx) + HALF_PI : spec.quarter ? ((Math.random() * 4) | 0) * HALF_PI : 0;
      s.img = img;
      if (spec.halo) {
        const h = this.halos.take(spec.halo.key);
        h.setTint(spec.glow);
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

  /** Small spark where a piercing shot just hit a new enemy. */
  pierceHit(s: Shot): void {
    const tex = s.spec.fx.pierce;
    if (tex) this.fx.play(tex, s.x, s.y, 100);
  }

  /** Ends a shot with its impact visuals (and prism shards). */
  impact(s: Shot, x: number, y: number): void {
    const sp = s.spec;
    const f = sp.fx;
    const fx = this.fx;
    const glow = sp.glow;
    s.x = x;
    s.y = y;
    if (sp.hit === HIT_BLAST && f.blast) fx.play(f.blast, x, y, f.blastMs);
    if (f.flash) fx.play(f.flash, x, y, f.flashMs, glow, f.flashAlpha);
    if (f.core) fx.play(f.core, x, y, f.flashMs * 0.7);
    if (f.spark && sp.hit !== HIT_SOFT) fx.play(f.spark, x, y, f.sparkMs);
    if (f.embers > 0) fx.burst(this.emberTex, x, y, f.embers, f.emberSpeed, f.embers > 3 && Math.random() < 0.5 ? sp.core : glow);
    if (sp.shard && sp.splitN > 0) this.split(s, true);
    this.kill(s);
  }

  private split(s: Shot, fromImpact: boolean): void {
    const sp = s.spec;
    const child = sp.shard as ShotSpec;
    const hues = sp.shardTex;
    const n = sp.splitN;
    const base = Math.atan2(s.vy, s.vx);
    // the fan shares a fixed multiple of the parent's actual damage (see ShotSpec.splitShare)
    const each = (s.damage * (fromImpact ? sp.impactShare : sp.splitShare)) / n;
    for (let k = 0; k < n; k++) {
      const a = n === 1 ? base : base - sp.splitSpread + (2 * sp.splitSpread * k) / (n - 1);
      const tex = hues ? hues[n === 1 ? hues.length >> 1 : Math.round((k * (hues.length - 1)) / (n - 1))] : child.tex;
      const c = this.fire(child, s.x, s.y, a + (Math.random() - 0.5) * 0.05, tex);
      c.damage = each;
      c.ownReg.copyFrom(s.reg);
      if (fromImpact && c.armMs < 70) c.armMs = 70; // clear the struck enemy first
    }
    const f = sp.fx;
    if (f.flash) this.fx.play(f.flash, s.x, s.y, f.flashMs, sp.glow, f.flashAlpha);
    if (f.spark) this.fx.play(f.spark, s.x, s.y, f.sparkMs);
  }

  private kill(s: Shot): void {
    if (!s.alive) return;
    s.alive = false;
    if (s.img) this.bodies.give(s.img);
    if (s.halo) this.halos.give(s.halo);
    s.img = null;
    s.halo = null;
    this.alive--;
    this.dirty = true;
  }

  private expire(s: Shot): void {
    const sp = s.spec;
    if (sp.popOnExpire) {
      const f = sp.fx;
      if (f.flash) this.fx.play(f.flash, s.x, s.y, f.flashMs, sp.glow, f.flashAlpha * 0.7);
      this.fx.burst(this.emberTex, s.x, s.y, 2, 60, sp.glow);
    }
    this.kill(s);
  }

  private trail(s: Shot, sp: ShotSpec): void {
    switch (sp.trail) {
      case TRAIL_SMOKE: {
        const inv = 1 / Math.max(1, Math.sqrt(s.vx * s.vx + s.vy * s.vy));
        const bx = s.x - s.vx * inv * 6, by = s.y - s.vy * inv * 6;
        this.smoke.play(this.smokeTex, bx + (Math.random() - 0.5) * 2, by + (Math.random() - 0.5) * 2, 300);
        if ((s.trailN & 1) === 0) this.fx.particle(this.emberTex, bx, by, -s.vx * 0.12, -s.vy * 0.12, 3, 150, sp.glow);
        break;
      }
      case TRAIL_EMBER:
        this.fx.particle(this.emberTex, s.x + (Math.random() - 0.5) * 6, s.y + (Math.random() - 0.5) * 6,
          -s.vx * 0.2 + (Math.random() - 0.5) * 30, -s.vy * 0.2 + (Math.random() - 0.5) * 30, 2.5, 280, (s.trailN & 1) ? sp.core : sp.glow);
        break;
      case TRAIL_ZAP:
        if (sp.trailTex) {
          const along = (Math.random() * 2 - 1) * sp.trailSpread;
          const inv = 1 / Math.max(1, s.speed);
          const side = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
          this.fx.play(sp.trailTex, s.x + s.vx * inv * along - s.vy * inv * side, s.y + s.vy * inv * along + s.vx * inv * side,
            70, WHITE, 1, (Math.random() * 4 | 0) * HALF_PI);
        }
        break;
      default:
        break;
    }
    s.trailN++;
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
      if (s.fresh) {
        s.fresh = false; // keep the spawn point: the first sweep covers spawn -> first move
      } else {
        s.prevX = s.x;
        s.prevY = s.y;
      }
      s.age += dtMs;
      if (s.age >= s.life) {
        this.expire(s);
        continue;
      }
      if (s.armMs > 0) s.armMs -= dtMs;
      const sp = s.spec;
      const img = s.img;
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
          const k = sp.drag * dt < 1 ? 1 - sp.drag * dt : 0;
          s.vx *= k;
          s.vy *= k;
          s.x += s.vx * dt;
          s.y += (s.vy + sp.driftY) * dt;
          break;
        }
        case MOVE_COLUMN:
          s.x = this.anchors.anchorX(s.anchor) + s.ox;
          s.y = this.anchors.anchorY(s.anchor) + s.oy;
          break;
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
            const k = sp.drag * dt < 1 ? 1 - sp.drag * dt : 0;
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
      if (sp.radiusEnd !== 1) s.radius = sp.radius * (1 + (sp.radiusEnd - 1) * (s.age / s.life));
      if (img) {
        img.x = s.x;
        img.y = s.y;
        if (sp.rotate) img.rotation = Math.atan2(s.vy, s.vx) + HALF_PI;
        const tex = s.tex;
        if (tex.frames > 1) {
          const f = sp.frameMs > 0 ? ((s.age / sp.frameMs) | 0) % tex.frames : Math.min(tex.frames - 1, ((s.age * tex.frames) / s.life) | 0);
          if (f !== s.frame) {
            s.frame = f;
            img.setFrame(f);
          }
        }
        let alpha = 1;
        if (sp.fadeMs > 0) {
          const rem = s.life - s.age;
          if (rem < sp.fadeMs) {
            alpha = rem / sp.fadeMs;
            img.alpha = alpha;
          }
        }
        const h = s.halo;
        if (h) {
          h.x = s.x;
          h.y = s.y;
          if (sp.blink) h.alpha = sp.haloAlpha * (0.3 + 0.7 * (Math.sin(s.age * (0.008 + s.age * 0.0000035)) * 0.5 + 0.5));
          else if (alpha < 1) h.alpha = sp.haloAlpha * alpha;
        }
      }
      if (sp.trail !== TRAIL_NONE) {
        s.trailT -= dtMs;
        if (s.trailT <= 0) {
          s.trailT += sp.trailMs;
          this.trail(s, sp);
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
    this.halos.destroy();
    this.free.length = 0;
  }
}
