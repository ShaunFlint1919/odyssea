// =====================================================================================
//  FRONT GUNS — one class per FrontPattern. Every level changes the look:
//   pulse    1 -> 5 parallel streams, bolts grow + glow (big/huge bolts hit harder)
//   scatter  3 -> 11 pellet fan, half-angle 10 deg -> 40.6 deg, bigger glowing pellets
//   gatling  dense needle stream (2 sub-volleys), cadence x1 -> x1.54, 1 -> 4 barrels
//   lance    piercing beam bursts, 2 -> 5 segments long (42 -> 96 px), width x1 -> x1.81
//   seeker   2 -> 6 homing micro-missiles per volley, ripple-fired in a widening fan
//   helix    two interleaved sine streams (amplitude 13 -> 26 px), four from p6 (26 -> 40 px)
//   mortar   heavy orbs, splash 22 -> 54 px, 1 -> 3 orbs per volley
//   prism    crystal bolts splitting after 80 px into 3/5/7 spectrum shards, 2 bolts from
//            p6, shards re-split at p10
//  Damage follows the balance model (src/data/weapons.ts PROJECTILES_AT_P1 / powerFactor):
//  total DPS = def.damage * def.fireRate * N1 * (1 + 0.45 (p - 1)).
// =====================================================================================
import type { FrontPattern } from '../../../types';
import { SLOT_FRONT } from '../fx';
import { HIT_BLAST, HIT_SOFT, HitRegistry, MOVE_HOMING, MOVE_SINE, makeSpec, type ShotSpec } from '../shots';
import { fxTexture } from '../textures';
import { DEG, TAU, UP, dpsMul, ramp, table } from '../scaling';
import { WeaponGun, type ArsenalCore } from './gun';

// ------------------------------------------------------------------------------ pulse

/** Per level: flattened (x offset, size class) pairs. Size 0 normal, 1 big, 2 huge. */
const PULSE_LAYOUT: readonly (readonly number[])[] = [
  [0, 0],
  [-4, 0, 4, 0],
  [-7, 0, 0, 0, 7, 0],
  [-7, 0, 0, 1, 7, 0],
  [-11, 0, -4, 0, 4, 0, 11, 0],
  [-11, 0, -4, 1, 4, 1, 11, 0],
  [-14, 0, -7, 0, 0, 1, 7, 0, 14, 0],
  [-14, 0, -7, 1, 0, 1, 7, 1, 14, 0],
  [-14, 1, -7, 1, 0, 2, 7, 1, 14, 1],
  [-15, 1, -7.5, 2, 0, 2, 7.5, 2, 15, 1],
];
const PULSE_WEIGHT = [1, 1.4, 1.8];
const PULSE_SCALE = [1, 1.3, 1.6];

class PulseGun extends WeaponGun {
  private layout: readonly number[] = PULSE_LAYOUT[0];
  private specs: ShotSpec[] = [];

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    this.layout = table(p, PULSE_LAYOUT);
    let weight = 0;
    for (let i = 1; i < this.layout.length; i += 2) weight += PULSE_WEIGHT[this.layout[i]];
    const unit = (this.def.damage * dpsMul(p)) / (r * weight);
    this.specs = [0, 1, 2].map((size) => {
      const s = this.spec();
      s.speed = 640;
      s.life = 1100;
      s.damage = unit * PULSE_WEIGHT[size];
      s.scaleX = PULSE_SCALE[size];
      s.scaleY = PULSE_SCALE[size] * (size === 2 ? 1.1 : 1);
      s.radius = 3.5 + size;
      s.halo = size === 0 ? (p >= 9 ? 10 : 0) : 12 + size * 4;
      s.haloAlpha = 0.42;
      return s;
    });
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const L = this.layout;
    for (let i = 0; i < L.length; i += 2) {
      const ox = L[i], size = L[i + 1];
      const oy = Math.abs(ox) * 0.35;
      const s = this.core.shots.fire(this.specs[size], x + ox, y + oy, UP);
      this.core.shots.advance(s, late);
      this.flash(SLOT_FRONT + (i >> 1), nx + ox, ny + oy, UP, 0.65 + size * 0.15);
    }
  }
}

// ------------------------------------------------------------------------------ scatter

const SCATTER_N = [3, 4, 5, 6, 7, 7, 8, 9, 10, 11];

class ScatterGun extends WeaponGun {
  private n = 3;
  private half = 0;
  private pellet!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    this.n = table(p, SCATTER_N);
    this.half = ramp(p, 10, 40.6) * DEG;
    const s = this.spec();
    s.speed = 500;
    s.life = 950;
    s.damage = this.dmg(3, this.n, r);
    s.radius = 4;
    s.rotate = false;
    s.scaleX = s.scaleY = p >= 8 ? 1.25 : 1;
    s.halo = p >= 4 ? 12 : 0;
    s.haloAlpha = 0.35;
    this.pellet = s;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny + 2;
    const n = this.n, half = this.half;
    const step = n > 1 ? (2 * half) / (n - 1) : 0;
    for (let k = 0; k < n; k++) {
      const a = UP - half + step * k + (Math.random() - 0.5) * step * 0.35;
      const s = this.core.shots.fire(this.pellet, x + Math.cos(a) * 4, y + 3 + Math.sin(a) * 4, a);
      const j = 0.93 + Math.random() * 0.14;
      s.vx *= j;
      s.vy *= j;
      s.speed *= j;
      this.core.shots.advance(s, late);
    }
    this.flash(SLOT_FRONT, nx, ny, UP, 1.15 + this.p * 0.04);
  }
}

// ------------------------------------------------------------------------------ gatling

const GATLING_BARRELS: readonly (readonly number[])[] = [[0], [-2.5, 2.5], [-5, 0, 5], [-7, -2.5, 2.5, 7]];
const GATLING_N = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4];

/** Two sub-volleys per paid volley; with several barrels they alternate (odd / even). */
class GatlingGun extends WeaponGun {
  private barrels: readonly number[] = GATLING_BARRELS[0];
  private jitter = 0;
  private needle!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const nb = table(p, GATLING_N);
    this.subs = 2;
    this.barrels = GATLING_BARRELS[nb - 1];
    this.jitter = ramp(p, 2.2, 4.5) * DEG;
    const s = this.spec();
    s.speed = 800;
    s.life = 900;
    s.damage = this.dmg(1, nb === 1 ? 2 : nb, r);
    s.radius = 3;
    s.scaleY = ramp(p, 1, 1.3);
    s.additive = p >= 7;
    this.needle = s;
    return r;
  }

  protected volley(late: number, sub: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const B = this.barrels;
    for (let b = 0; b < B.length; b++) {
      if (B.length > 1 && (b & 1) !== sub) continue;
      const ox = B[b] + (Math.random() - 0.5) * 1.4;
      const a = UP + (Math.random() * 2 - 1) * this.jitter;
      const s = this.core.shots.fire(this.needle, x + ox, y + Math.abs(B[b]) * 0.3, a);
      this.core.shots.advance(s, late + Math.random() * 4);
      this.flash(SLOT_FRONT + b, nx + B[b], ny, UP, 0.6);
    }
  }
}

// ------------------------------------------------------------------------------ lance

const BEAM_STEP = 18; // collision segment spacing (px)

/**
 * One burst = one stretched beam sprite (pointed ends) + a soft additive aura + hidden
 * collision segments every 18 px, all sharing a hit registry (each enemy is hit once).
 */
class LanceGun extends WeaponGun {
  private segments = 2;
  private length = 42;
  private body!: ShotSpec;
  private aura!: ShotSpec;
  private seg!: ShotSpec;
  private readonly regs: HitRegistry[] = [];

  constructor(core: ArsenalCore) {
    super(core);
    for (let i = 0; i < 8; i++) this.regs.push(new HitRegistry());
  }

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    this.segments = 2 + Math.floor((p - 1) / 3);
    this.length = this.segments * BEAM_STEP + 6;
    const w = ramp(p, 1, 1.81);
    const dmg = this.dmg(1, 1, r); // one burst = one projectile

    const body = this.spec();
    body.speed = 920;
    body.life = 800;
    body.pierce = true;
    body.damage = dmg;
    body.radius = 3 + 2.2 * w;
    body.scaleX = w;
    body.scaleY = this.length / 24;
    body.cull = this.length / 2;
    body.hit = HIT_SOFT;
    this.body = body;

    const glow = fxTexture(this.core.env.scene, 'fx_glow');
    const aura = makeSpec(glow.key, this.glow, this.coreColor);
    aura.speed = 920;
    aura.life = 800;
    aura.damage = 0; // visual only (never iterated for collisions)
    aura.additive = true;
    aura.scaleX = (10 + 5 * w) / glow.w;
    aura.scaleY = (this.length + 22) / glow.w;
    aura.cull = this.length / 2 + 12;
    this.aura = aura;

    const seg = this.spec();
    seg.hidden = true;
    seg.speed = 920;
    seg.life = 800;
    seg.pierce = true;
    seg.damage = dmg;
    seg.radius = body.radius;
    seg.hit = HIT_SOFT;
    this.seg = seg;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const shots = this.core.shots;
    const x = this.shipX() + nx, y = this.shipY() + ny - 4;
    const reg = this.regs[this.volleys & 7];
    reg.reset();
    const cy = y - this.length / 2;
    const a = shots.fire(this.aura, x, cy, UP);
    a.setTint(this.glow);
    shots.advance(a, late);
    const b = shots.fire(this.body, x, cy, UP);
    b.reg = reg;
    shots.advance(b, late);
    for (let k = 0; k < this.segments; k++) {
      const s = shots.fire(this.seg, x, y - 9 - k * BEAM_STEP, UP);
      s.reg = reg;
      shots.advance(s, late);
    }
    this.flash(SLOT_FRONT, nx, ny, UP, 1.1 + this.p * 0.07);
    this.core.fx.flash(x, this.shipY() + ny, this.glow, 14 + this.p * 2, 110, 0.8);
  }
}

// ------------------------------------------------------------------------------ seeker

const SEEKER_N = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];

/** Missiles of a volley are ripple-fired (alternating wings) over 45 % of the interval. */
class SeekerGun extends WeaponGun {
  private missile!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const n = table(p, SEEKER_N);
    this.subs = n;
    this.subSpread = 0.45;
    const s = this.spec();
    s.move = MOVE_HOMING;
    s.speed = 150;
    s.accel = 950;
    s.maxSpeed = 460;
    s.turnRate = 5.2;
    s.seekRange = 460;
    s.launchMs = 100;
    s.life = 2600;
    s.damage = this.dmg(2, n, r);
    s.radius = 4;
    s.trailMs = 20;
    s.trailSize = 9;
    s.popOnExpire = true;
    this.missile = s;
    return r;
  }

  protected volley(late: number, sub: number): void {
    const sx = this.shipX(), sy = this.shipY();
    const shots = this.core.shots;
    let j = 0, side = 0;
    if (this.subs & 1) {
      if (sub > 0) {
        j = (sub - 1) >> 1;
        side = (sub - 1) & 1 ? 1 : -1;
      }
    } else {
      j = sub >> 1;
      side = sub & 1 ? 1 : -1;
    }
    if (side === 0) {
      const s = shots.fire(this.missile, sx + this.core.noseX, sy + this.core.noseY + 4, UP);
      shots.advance(s, late);
      this.flash(SLOT_FRONT, this.core.noseX, this.core.noseY + 4, UP, 0.7);
      return;
    }
    const a = UP + side * (32 + 16 * j) * DEG;
    const ox = side * (6 + 3 * j), oy = -2 + 2 * j;
    const s = shots.fire(this.missile, sx + ox, sy + oy, a);
    shots.advance(s, late);
    this.flash(SLOT_FRONT + 1 + sub, ox, oy, a, 0.6);
  }
}

// ------------------------------------------------------------------------------ helix

/** Three sub-volleys per paid volley so each stream shows ~6 shots per wavelength. */
class HelixGun extends WeaponGun {
  private four = false;
  private inner!: ShotSpec;
  private outer!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    this.subs = 3;
    this.four = p >= 6;
    const n = (this.four ? 4 : 2) * this.subs;
    const speed = 440;
    const make = (amp: number, wavelength: number, scale: number): ShotSpec => {
      const s = this.spec();
      s.move = MOVE_SINE;
      s.speed = speed;
      s.amp = amp;
      s.omega = (TAU * speed) / wavelength;
      s.life = 1500;
      s.damage = this.dmg(2, n, r);
      s.radius = 5 * scale;
      s.scaleX = s.scaleY = scale;
      s.halo = p >= 3 ? 14 * scale : 0;
      s.haloAlpha = 0.4;
      s.hit = HIT_SOFT;
      return s;
    };
    this.inner = make(ramp(p, 13, 26), 176, ramp(p, 1, 1.3));
    this.outer = make(ramp(p, 26, 40), 236, 1);
    return r;
  }

  protected volley(late: number, sub: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const shots = this.core.shots;
    for (let k = 0; k < 2; k++) {
      const s = shots.fire(this.inner, x, y, UP);
      s.phase = k * Math.PI;
      shots.advance(s, late);
    }
    if (this.four) {
      for (let k = 0; k < 2; k++) {
        const s = shots.fire(this.outer, x, y + 2, UP);
        s.phase = Math.PI * 0.5 + k * Math.PI;
        shots.advance(s, late);
      }
    }
    if (sub === 0) this.flash(SLOT_FRONT, nx, ny, UP, 0.9);
  }
}

// ------------------------------------------------------------------------------ mortar

/** Per orb count: flattened (x offset, angle deg) pairs. */
const MORTAR_LAYOUT: readonly (readonly number[])[] = [[0, 0], [-7, -5, 7, 5], [0, 0, -10, -8, 10, 8]];

class MortarGun extends WeaponGun {
  private layout: readonly number[] = MORTAR_LAYOUT[0];
  private orb!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const n = p < 5 ? 1 : p < 9 ? 2 : 3;
    this.layout = MORTAR_LAYOUT[n - 1];
    const sc = ramp(p, 1, 1.45);
    const s = this.spec();
    s.speed = 220;
    s.life = 2800;
    s.damage = this.dmg(1, n, r);
    s.splash = ramp(p, 22, 54.4);
    s.radius = 6 * sc;
    s.scaleX = s.scaleY = sc;
    s.rotate = false;
    s.spin = 3;
    s.halo = 30 * sc;
    s.haloAlpha = 0.5;
    s.hit = HIT_BLAST;
    s.popOnExpire = true;
    this.orb = s;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny - 2;
    const L = this.layout;
    for (let i = 0; i < L.length; i += 2) {
      const s = this.core.shots.fire(this.orb, x + L[i], y + Math.abs(L[i]) * 0.4, UP + L[i + 1] * DEG);
      this.core.shots.advance(s, late);
    }
    this.flash(SLOT_FRONT, nx, ny, UP, 1.6);
  }
}

// ------------------------------------------------------------------------------ prism

const PRISM_BOLTS = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
const PRISM_SHARDS = [3, 3, 5, 5, 7, 3, 5, 5, 7, 7];

/**
 * White crystal bolts split after 80 px into an odd fan of spectrum-tinted piercing shards
 * (always a centre shard). A bolt that hits before splitting shatters through the target.
 * Damage: bolt = full projectile damage; the k shards share 2 x bolt damage.
 */
class PrismGun extends WeaponGun {
  private bolts = 1;
  private bolt!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    this.bolts = table(p, PRISM_BOLTS);
    const k = table(p, PRISM_SHARDS);
    const boltDmg = this.dmg(1, this.bolts, r);
    const shardDmg = (boltDmg * 2) / k;

    const shard = this.spec('pj_shard');
    shard.speed = 580;
    shard.life = 650;
    shard.pierce = true;
    shard.damage = shardDmg;
    shard.radius = 3.5;
    shard.scaleX = shard.scaleY = ramp(p, 1.1, 1.4);
    shard.additive = true;
    shard.hit = HIT_SOFT;
    shard.fadeMs = 160;
    if (p >= 10) {
      const fine = this.spec('pj_shard');
      fine.speed = 600;
      fine.life = 420;
      fine.pierce = true;
      fine.damage = shardDmg * 0.6;
      fine.radius = 3;
      fine.additive = true;
      fine.hit = HIT_SOFT;
      fine.fadeMs = 140;
      shard.splitDist = 70;
      shard.splitN = 2;
      shard.splitSpread = 7 * DEG;
      shard.shard = fine;
    }

    const b = this.spec();
    b.speed = 520;
    b.life = 1200;
    b.damage = boltDmg;
    b.radius = 4.5;
    b.scaleX = b.scaleY = ramp(p, 1.5, 1.9);
    b.halo = 18 + p;
    b.haloAlpha = 0.6;
    b.splitDist = 80;
    b.splitN = k;
    b.splitSpread = ramp(p, 10, 30) * DEG;
    b.shard = shard;
    b.rainbow = true;
    this.bolt = b;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    if (this.bolts === 1) {
      const s = this.core.shots.fire(this.bolt, x, y, UP);
      this.core.shots.advance(s, late);
    } else {
      for (let side = -1; side <= 1; side += 2) {
        const s = this.core.shots.fire(this.bolt, x + side * 7, y + 2, UP + side * 3 * DEG);
        this.core.shots.advance(s, late);
      }
    }
    this.flash(SLOT_FRONT, nx, ny, UP, 1.1);
  }
}

/** Creates the gun implementing a front pattern. */
export function createFrontGun(core: ArsenalCore, pattern: FrontPattern): WeaponGun {
  switch (pattern) {
    case 'scatter': return new ScatterGun(core);
    case 'gatling': return new GatlingGun(core);
    case 'lance': return new LanceGun(core);
    case 'seeker': return new SeekerGun(core);
    case 'helix': return new HelixGun(core);
    case 'mortar': return new MortarGun(core);
    case 'prism': return new PrismGun(core);
    default: return new PulseGun(core);
  }
}

/** True if `pattern` is a front pattern. */
export function isFrontPattern(pattern: string): pattern is FrontPattern {
  return pattern === 'pulse' || pattern === 'scatter' || pattern === 'gatling' || pattern === 'lance'
    || pattern === 'seeker' || pattern === 'helix' || pattern === 'mortar' || pattern === 'prism';
}

