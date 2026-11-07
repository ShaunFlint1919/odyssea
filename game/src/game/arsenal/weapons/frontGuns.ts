// =====================================================================================
//  FRONT GUNS — one class per FrontPattern. Dense at power 1, visibly escalating to 10:
//   pulse    plasma bolt rows (~20 rows/s at p1 whatever the fire rate): 1 -> 7
//            streams, bolts 6x14 -> 10x22 px with glowing cores, outer streams fanning
//            2-6 deg (wing guns)
//   scatter  interleaved fireball fans (n, n - 1 in the gaps, ~10-12 fans/s): 3 -> 11
//            pellets, half-angle 10 -> 40.6 deg, pellets 8 -> 10 px, comet tails, glow from p4
//   gatling  rotary barrels: every sub-volley fires the next barrel (36 -> 100 tracers/s),
//            1 -> 4 barrels, tracers 3x15 -> 4x19 px, jitter 2 -> 4 deg, ejected casings
//   lance    piercing beam bursts (~9 bursts/s: a near-continuous laser at p10):
//            42 -> 96 px long, 6 -> 12 px core, crackle frames + electric zaps, a spark on
//            every pierced enemy
//   seeker   homing micro-missiles, 8 -> 22 per second (2..8 per volley, ripple-fired from
//            alternating wings), smoke trails, heavy 7x15 kite missiles from p6
//   helix    two interleaved sine streams of crescents (amplitude 13 -> 26 px), four from
//            p6 (26 -> 40 px), crescents 12 -> 16 px, glow from p3
//   mortar   swirling plasma orbs 16 -> 22 px, 1 -> 3 per volley, ember trails, splash ring
//            drawn at the splash radius (22 -> 54 px)
//   prism    faceted crystal bolts (~6-8 rows/s) splitting after 80 px into 3/5/7
//            spectrum shards, twin bolts from p6, shards re-split at p10
//  Damage follows the balance model (scaling.ts): total DPS = damage * fireRate * N1 * M(p);
//  sub-volleys / extra projectiles only split that damage (dmg()), energy is paid per volley.
// =====================================================================================
import type { FrontPattern } from '../../../types';
import { SLOT_FRONT } from '../effects';
import {
  HIT_BLAST, HitRegistry, MOVE_HOMING, MOVE_SINE, TRAIL_EMBER, TRAIL_SMOKE, TRAIL_ZAP, type ShotSpec,
} from '../projectiles';
import {
  SPECTRUM, beamTex, boltTex, crystalTex, emberTex, flashTex, glowTex, missileTex, needleTex, orbTex, pelletTex,
  shardTex, waveTex, zapTex,
} from '../art';
import { blastRadius, impactFx, softImpactFx } from '../looks';
import type { TexInfo } from '../textures';
import { DEG, TAU, UP, dpsMul, ramp, table } from '../scaling';
import { WeaponGun, type ArsenalCore } from './base';

// ------------------------------------------------------------------------------ pulse

/** Per level: flattened (x offset px, bolt tier 0..3, outward angle deg) triples. */
const PULSE_LAYOUT: readonly (readonly number[])[] = [
  [0, 1, 0],
  [-4, 1, 0, 4, 1, 0],
  [-9, 1, 0, 0, 2, 0, 9, 1, 0],
  [-10, 2, 0, 0, 2, 0, 10, 2, 0],
  [-14, 1, 2, -5, 2, 0, 5, 2, 0, 14, 1, 2],
  [-20, 1, 3, -11, 2, 0, 0, 3, 0, 11, 2, 0, 20, 1, 3],
  [-20, 2, 3, -11, 2, 0, 0, 3, 0, 11, 2, 0, 20, 2, 3],
  [-27, 1, 5, -17, 2, 2, -6, 3, 0, 6, 3, 0, 17, 2, 2, 27, 1, 5],
  [-32, 1, 6, -23, 2, 3, -12, 3, 0, 0, 3, 0, 12, 3, 0, 23, 2, 3, 32, 1, 6],
  [-33, 2, 6, -23, 3, 3, -12, 3, 0, 0, 3, 0, 12, 3, 0, 23, 3, 3, 33, 2, 6],
];
/** Damage weight per bolt tier (bigger bolts hit harder). */
const PULSE_WEIGHT = [0.8, 1, 1.35, 1.7];
/** Target visual rows per second per level (sub-volleys are derived from the fire rate). */
const PULSE_ROWS = [20, 20, 18, 18, 16, 15, 14, 13, 12, 12];

class PulseGun extends WeaponGun {
  private layout: readonly number[] = PULSE_LAYOUT[0];
  private specs: ShotSpec[] = [];

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.layout = table(p, PULSE_LAYOUT);
    this.subs = this.subsFor(table(p, PULSE_ROWS), 4);
    let weight = 0;
    for (let i = 1; i < this.layout.length; i += 3) weight += PULSE_WEIGHT[this.layout[i]];
    const unit = (this.def.damage * dpsMul(p)) / (r * weight * this.subs);
    const specs: ShotSpec[] = [];
    for (let t = 0; t < 4; t++) {
      const s = this.spec(boltTex(scene, this.color, t));
      s.speed = 700;
      s.life = 1000;
      s.rotate = false;
      s.damage = unit * PULSE_WEIGHT[t];
      s.radius = 3 + t * 0.8;
      s.halo = t === 3 ? glowTex(scene, 15) : null;
      s.haloAlpha = 0.24;
      s.fx = impactFx(scene, this.color, t <= 1 ? 0 : t - 1);
      specs.push(s);
    }
    this.specs = specs;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const L = this.layout;
    const shots = this.core.shots;
    for (let i = 0; i < L.length; i += 3) {
      const ox = L[i], tier = L[i + 1];
      const oy = Math.abs(ox) * 0.3;
      const a = UP + (ox < 0 ? -L[i + 2] : L[i + 2]) * DEG;
      const s = shots.fire(this.specs[tier], x + ox, y + oy, a);
      shots.advance(s, late);
      this.flash(SLOT_FRONT + ((i / 3) | 0), nx + ox, ny + oy - 1, UP, tier > 2 ? 2 : tier, 60);
    }
  }
}

// ------------------------------------------------------------------------------ scatter

const SCATTER_N = [3, 4, 5, 6, 7, 7, 8, 9, 10, 11];
const SCATTER_TIER = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2];
/** Target fans per second per level (sub-volleys derived from the fire rate, 1..3). */
const SCATTER_ROWS = [10, 10, 10, 10, 10, 11, 11, 12, 12, 12];

/** Fans of a paid volley alternate n pellets and n - 1 pellets in the gaps (n, n - 1, n). */
class ScatterGun extends WeaponGun {
  private n = 3;
  private half = 0;
  private pellet!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.n = table(p, SCATTER_N);
    this.half = ramp(p, 10, 40.6) * DEG;
    this.subs = this.subsFor(table(p, SCATTER_ROWS), 3);
    const tier = table(p, SCATTER_TIER);
    const per = this.subs * this.n - (this.subs > 1 ? 1 : 0);
    const s = this.spec(pelletTex(scene, this.color, tier));
    s.speed = 520;
    s.life = 950;
    s.damage = this.dmg(3, per, r);
    s.radius = 3.5 + tier;
    s.halo = p >= 4 ? glowTex(scene, 13 + tier * 2) : null;
    s.haloAlpha = 0.22;
    s.fx = impactFx(scene, this.color, tier >= 2 ? 1 : 0);
    this.pellet = s;
    return r;
  }

  protected volley(late: number, sub: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny + 2;
    const shots = this.core.shots;
    const half = this.half;
    const step = this.n > 1 ? (2 * half) / (this.n - 1) : 0;
    const gaps = sub === 1;
    const n = gaps ? this.n - 1 : this.n;
    const start = gaps ? -half + step / 2 : -half;
    for (let k = 0; k < n; k++) {
      const a = UP + start + step * k + (Math.random() - 0.5) * step * 0.25;
      const s = shots.fire(this.pellet, x + Math.cos(a) * 4, y + 3 + Math.sin(a) * 4, a);
      const j = 0.93 + Math.random() * 0.14;
      s.vx *= j;
      s.vy *= j;
      s.speed *= j;
      shots.advance(s, late);
    }
    this.flash(SLOT_FRONT, nx, ny, UP, gaps ? 1 : 2, 70);
  }
}

// ------------------------------------------------------------------------------ gatling

const GATLING_BARRELS: readonly (readonly number[])[] = [[0], [-3, 3], [-6, 0, 6], [-9, -3, 3, 9]];
const GATLING_N = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4];
const GATLING_TIER = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
/** Target tracers per second per level (sub-volleys = tracers per paid volley, 1..8). */
const GATLING_RATE = [36, 38, 48, 52, 56, 66, 72, 78, 90, 100];

/** Rotary barrels: every sub-volley fires the next barrel in turn. */
class GatlingGun extends WeaponGun {
  private barrels: readonly number[] = GATLING_BARRELS[0];
  private jitter = 0;
  private needle!: ShotSpec;
  private casing!: TexInfo;
  private muzzleTier = 0;
  private barrel = 0;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    const nb = table(p, GATLING_N);
    const tier = table(p, GATLING_TIER);
    this.barrels = GATLING_BARRELS[nb - 1];
    this.subs = this.subsFor(table(p, GATLING_RATE), 8);
    this.jitter = ramp(p, 2, 4) * DEG;
    this.muzzleTier = tier >= 2 ? 1 : 0;
    this.casing = emberTex(scene);
    const s = this.spec(needleTex(scene, this.color, tier));
    s.speed = 840;
    s.life = 800;
    s.rotate = false;
    s.damage = this.dmg(1, this.subs, r);
    s.radius = 3;
    s.fx = impactFx(scene, this.color, tier >= 2 ? 1 : 0);
    this.needle = s;
    return r;
  }

  protected volley(late: number, sub: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const B = this.barrels;
    const shots = this.core.shots;
    this.barrel = (this.barrel + 1) % B.length;
    const b = this.barrel;
    const ox = B[b] + (Math.random() - 0.5) * 1.2;
    const a = UP + (Math.random() * 2 - 1) * this.jitter;
    const s = shots.fire(this.needle, x + ox, y + Math.abs(B[b]) * 0.3, a);
    shots.advance(s, late + Math.random() * 3);
    this.flash(SLOT_FRONT + b, nx + B[b], ny + Math.abs(B[b]) * 0.3, UP, this.muzzleTier, 50);
    if (sub & 1) return;
    const side = this.volleys & 1 ? 1 : -1;
    this.core.fx.particle(this.casing, x + side * 5, y + 10, side * (50 + Math.random() * 40), 15 + Math.random() * 30, 3,
      240, 0xffd060, 0.9);
  }
}

// ------------------------------------------------------------------------------ lance

const BEAM_STEP = 18; // collision segment spacing (px)
const LANCE_TIER = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];
const LANCE_RADIUS = [5, 5.5, 6.5, 7.5];

/**
 * One burst = one beam sprite of exact length (crackle frames, electric zaps) + hidden
 * collision segments every 18 px, all sharing a hit registry (each enemy is hit once per
 * burst; a spark marks every pierced enemy).
 */
class LanceGun extends WeaponGun {
  private segments = 2;
  private length = 42;
  private body!: ShotSpec;
  private seg!: ShotSpec;
  private noseFlash!: TexInfo;
  private muzzleTier = 2;
  private regIndex = 0;
  private readonly regs: HitRegistry[] = [];

  constructor(core: ArsenalCore) {
    super(core);
    for (let i = 0; i < 8; i++) this.regs.push(new HitRegistry());
  }

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    const tier = table(p, LANCE_TIER);
    this.segments = 2 + Math.floor((p - 1) / 3);
    this.length = this.segments * BEAM_STEP + 6;
    this.subs = this.subsFor(9, 4);
    this.muzzleTier = tier >= 2 ? 3 : 2;
    this.noseFlash = flashTex(scene, tier >= 2 ? 2 : 1);
    const dmg = this.dmg(1, this.subs, r); // one burst = one projectile
    const fx = impactFx(scene, this.color, 2);

    const body = this.spec(beamTex(scene, this.color, tier, this.length));
    body.frameMs = 45;
    body.speed = 1000;
    body.life = 700;
    body.pierce = true;
    body.rotate = false;
    body.damage = dmg;
    body.radius = LANCE_RADIUS[tier];
    body.cull = this.length / 2;
    body.fx = fx;
    body.trail = TRAIL_ZAP;
    body.trailMs = 30;
    body.trailTex = zapTex(scene, this.color);
    body.trailSpread = this.length / 2 - 4;
    this.body = body;

    const seg = this.spec(body.tex);
    seg.hidden = true;
    seg.speed = 1000;
    seg.life = 700;
    seg.pierce = true;
    seg.damage = dmg;
    seg.radius = body.radius;
    seg.fx = fx;
    this.seg = seg;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const shots = this.core.shots;
    const x = this.shipX() + nx, y = this.shipY() + ny - 4;
    this.regIndex = (this.regIndex + 1) & 7;
    const reg = this.regs[this.regIndex];
    reg.reset();
    const b = shots.fire(this.body, x, y - this.length / 2, UP);
    b.reg = reg;
    shots.advance(b, late);
    for (let k = 0; k < this.segments; k++) {
      const s = shots.fire(this.seg, x, y - 9 - k * BEAM_STEP, UP);
      s.reg = reg;
      shots.advance(s, late);
    }
    this.flash(SLOT_FRONT, nx, ny, UP, this.muzzleTier, 80);
    this.core.fx.play(this.noseFlash, x, this.shipY() + ny, 110, this.glow, 0.8);
  }
}

// ------------------------------------------------------------------------------ seeker

/** Target missiles per second per level (2..8 per volley, ripple-fired). */
const SEEKER_RATE = [8, 9, 10, 12, 13, 15, 16, 18, 20, 22];

/** Missiles of a volley are ripple-fired (alternating wings) over 45 % of the interval. */
class SeekerGun extends WeaponGun {
  private missile!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    const n = Math.max(2, Math.min(8, Math.round(table(p, SEEKER_RATE) / this.volleysPerSec())));
    this.subs = n;
    this.subSpread = 0.45;
    const heavy = p >= 6;
    const s = this.spec(missileTex(scene, this.color, heavy ? 3 : 0));
    s.frameMs = 60;
    s.move = MOVE_HOMING;
    s.speed = 150;
    s.accel = 950;
    s.maxSpeed = 470;
    s.turnRate = 5.2;
    s.seekRange = 460;
    s.launchMs = 100;
    s.life = 2600;
    s.damage = this.dmg(2, n, r);
    s.radius = heavy ? 5 : 4;
    s.halo = glowTex(scene, heavy ? 13 : 11);
    s.haloAlpha = 0.3;
    s.trail = TRAIL_SMOKE;
    s.trailMs = 42;
    s.popOnExpire = true;
    s.fx = impactFx(scene, this.color, heavy ? 2 : 1);
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
      this.flash(SLOT_FRONT, this.core.noseX, this.core.noseY + 2, UP, 1, 70);
      return;
    }
    const a = UP + side * (30 + 14 * j) * DEG;
    const ox = side * (6 + 3 * j), oy = -2 + 2 * j;
    const s = shots.fire(this.missile, sx + ox, sy + oy, a);
    shots.advance(s, late);
    this.flash(SLOT_FRONT + 1 + sub, ox, oy, a, 0, 70);
  }
}

// ------------------------------------------------------------------------------ helix

const HELIX_TIER = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3];

/** ~15 crescent rows per second (sub-volleys from the fire rate): ~6 per wavelength. */
class HelixGun extends WeaponGun {
  private four = false;
  private inner!: ShotSpec;
  private outer!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.subs = this.subsFor(15, 4);
    this.four = p >= 6;
    const tier = table(p, HELIX_TIER);
    const n = (this.four ? 4 : 2) * this.subs;
    const speed = 440;
    const make = (t: number, amp: number, wavelength: number): ShotSpec => {
      const s = this.spec(waveTex(scene, this.color, t));
      s.move = MOVE_SINE;
      s.speed = speed;
      s.amp = amp;
      s.omega = (TAU * speed) / wavelength;
      s.life = 1500;
      s.damage = this.dmg(2, n, r);
      s.radius = 4 + t;
      s.halo = p >= 3 ? glowTex(scene, 13 + 2 * t) : null;
      s.haloAlpha = 0.22;
      s.fx = impactFx(scene, this.color, t >= 2 ? 1 : 0);
      return s;
    };
    this.inner = make(tier, ramp(p, 13, 26), 176);
    this.outer = make(Math.max(0, tier - 1), ramp(p, 26, 40), 236);
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
    if (sub === 0) this.flash(SLOT_FRONT, nx, ny, UP, this.four ? 2 : 1, 80);
  }
}

// ------------------------------------------------------------------------------ mortar

/** Per orb count: flattened (x offset, angle deg) pairs. */
const MORTAR_LAYOUT: readonly (readonly number[])[] = [[0, 0], [-8, -5, 8, 5], [0, 0, -12, -8, 12, 8]];
const MORTAR_TIER = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];

class MortarGun extends WeaponGun {
  private layout: readonly number[] = MORTAR_LAYOUT[0];
  private orb!: ShotSpec;
  private noseFlash!: TexInfo;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    const n = p < 5 ? 1 : p < 9 ? 2 : 3;
    const tier = table(p, MORTAR_TIER);
    this.layout = MORTAR_LAYOUT[n - 1];
    this.noseFlash = flashTex(scene, 2);
    const s = this.spec(orbTex(scene, this.color, tier));
    s.frameMs = 70;
    s.speed = 230;
    s.life = 2800;
    s.rotate = false;
    s.damage = this.dmg(1, n, r);
    s.splash = ramp(p, 22, 54.4);
    s.radius = 6 + tier;
    s.halo = glowTex(scene, 27 + 4 * tier);
    s.haloAlpha = 0.3;
    s.hit = HIT_BLAST;
    s.fx = impactFx(scene, this.color, 3, blastRadius(s.splash));
    s.trail = TRAIL_EMBER;
    s.trailMs = 34;
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
    this.flash(SLOT_FRONT, nx, ny, UP, 3, 90);
    this.core.fx.play(this.noseFlash, x, y + 2, 140, this.glow, 0.85);
  }
}

// ------------------------------------------------------------------------------ prism

const PRISM_BOLTS = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
const PRISM_SHARDS = [3, 3, 5, 5, 7, 3, 5, 5, 7, 7];
const PRISM_TIER = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2];
/** Target bolt rows per second per level (1..2 sub-volleys). */
const PRISM_ROWS = [8, 8, 8, 8, 6, 6, 6, 6, 6, 6];

/**
 * White crystal bolts (~8 rows/s at low power) split after 80 px into an odd fan
 * of spectrum shards (always a centre shard). A bolt that hits before splitting shatters
 * through the target. Damage: bolt = full projectile damage; the k shards share 2 x bolt
 * damage.
 */
class PrismGun extends WeaponGun {
  private bolts = 1;
  private bolt!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.subs = this.subsFor(table(p, PRISM_ROWS), 2);
    this.bolts = table(p, PRISM_BOLTS);
    const k = table(p, PRISM_SHARDS);
    const st = 1;
    const boltDmg = this.dmg(1, this.bolts * this.subs, r);
    const shardDmg = (boltDmg * 2) / k;
    const hues = (t: number): TexInfo[] => SPECTRUM.map((h) => shardTex(scene, h, t));

    const shard = this.spec(shardTex(scene, SPECTRUM[3], st));
    shard.speed = 590;
    shard.life = 650;
    shard.pierce = true;
    shard.damage = shardDmg;
    shard.radius = 3.5;
    shard.fadeMs = 150;
    shard.fx = softImpactFx(scene, 'white', 0);
    if (p >= 10) {
      const fine = this.spec(shardTex(scene, SPECTRUM[3], 0));
      fine.speed = 610;
      fine.life = 420;
      fine.pierce = true;
      fine.damage = shardDmg * 0.6;
      fine.radius = 3;
      fine.fadeMs = 130;
      fine.fx = shard.fx;
      shard.splitDist = 70;
      shard.splitN = 2;
      shard.splitSpread = 7 * DEG;
      shard.shard = fine;
      shard.shardTex = hues(0);
    }

    const b = this.spec(crystalTex(scene, table(p, PRISM_TIER)));
    b.frameMs = 70;
    b.speed = 540;
    b.life = 1200;
    b.rotate = false;
    b.damage = boltDmg;
    b.radius = 4.5;
    b.halo = glowTex(scene, 17 + 2 * table(p, PRISM_TIER));
    b.haloAlpha = 0.3;
    b.splitDist = 80;
    b.splitN = k;
    b.splitSpread = ramp(p, 10, 30) * DEG;
    b.shard = shard;
    b.shardTex = hues(st);
    b.fx = impactFx(scene, 'white', 1);
    this.bolt = b;
    return r;
  }

  protected volley(late: number): void {
    const nx = this.core.noseX, ny = this.core.noseY;
    const x = this.shipX() + nx, y = this.shipY() + ny;
    const shots = this.core.shots;
    if (this.bolts === 1) {
      const s = shots.fire(this.bolt, x, y, UP);
      shots.advance(s, late);
    } else {
      for (let side = -1; side <= 1; side += 2) {
        const s = shots.fire(this.bolt, x + side * 7, y + 2, UP + side * 3 * DEG);
        shots.advance(s, late);
      }
    }
    this.flash(SLOT_FRONT, nx, ny, UP, this.bolts > 1 ? 2 : 1, 70);
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
