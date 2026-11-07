// =====================================================================================
//  REAR GUNS — one class per RearPattern, two modes each (0 = A, 1 = B):
//   tail     A: 1 -> 5 bolt streams straight back      B: 1 -> 4 parallel pairs at 45 deg forward
//            (2 sub-volleys: dense rows; bolts 4x11 -> 8x18 px)
//   flame    A: rear flame cone (1 -> 4 puffs/burst)    B: flames out of both flanks
//            (puffs grow 5 -> 21 px and cool white -> fire -> smoke over their life)
//   mines    A: 1 -> 3 proximity mines dropped behind   B: 1 -> 2 pairs lobbed sideways
//            (blinking spiked mines 11 -> 15 px, blast ring of the exact splash radius)
//   arc      A: 3 -> 7 ring arc fanned to the rear      B: 2 -> 5 rings per flank arc
//            (rings ripple from 9 to 21 px)
//   seekers  A: 2 -> 5 hunters ripple-launched back     B: 1 -> 3 hunters per flank
//            (twin-finned hunters with smoke trails)
//  Both modes have the same total DPS (balance model: damage * fireRate * N1 * M(p)).
// =====================================================================================
import type { RearPattern } from '../../../types';
import { SLOT_REAR } from '../effects';
import { HIT_BLAST, HIT_SOFT, MOVE_FLAME, MOVE_HOMING, MOVE_MINE, TRAIL_SMOKE, type ShotSpec } from '../projectiles';
import { BOLT_SIZES, boltTex, flameTex, glowTex, mineTex, missileTex, ringShotTex } from '../art';
import { blastRadius, impactFx, softImpactFx } from '../looks';
import { DEG, DOWN, LEFT, RIGHT, UP, ramp, table } from '../scaling';
import { WeaponGun, type ArsenalCore } from './base';

/** Rear muzzle (tail) and flank muzzle offsets from the ship centre. */
const TAIL_Y = 12;
const FLANK_X = 10;
const FLANK_Y = 2;

// ------------------------------------------------------------------------------ tail

const TAIL_TIER = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2];

class TailGun extends WeaponGun {
  private n = 1;
  private gap = 6;
  private tier = 0;
  private bolt!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.subs = 2;
    this.tier = table(p, TAIL_TIER);
    this.gap = BOLT_SIZES[this.tier][0] + 2;
    this.n = this.mode === 0 ? table(p, [1, 2, 2, 3, 3, 3, 4, 4, 5, 5]) : table(p, [1, 1, 2, 2, 2, 3, 3, 3, 4, 4]);
    const count = (this.mode === 0 ? this.n : this.n * 2) * this.subs;
    const s = this.spec(boltTex(scene, this.color, this.tier));
    s.speed = 600;
    s.life = 1100;
    s.damage = this.dmg(1, count, r);
    s.radius = 3 + this.tier * 0.8;
    s.halo = p >= 8 ? glowTex(scene, 13) : null;
    s.haloAlpha = 0.22;
    s.fx = impactFx(scene, this.color, this.tier >= 2 ? 1 : 0);
    this.bolt = s;
    return r;
  }

  protected volley(late: number): void {
    const sx = this.shipX(), sy = this.shipY();
    const shots = this.core.shots;
    const n = this.n;
    if (this.mode === 0) {
      for (let i = 0; i < n; i++) {
        const c = i - (n - 1) / 2;
        const ox = c * this.gap;
        const s = shots.fire(this.bolt, sx + ox, sy + TAIL_Y - Math.abs(c), DOWN + c * 1.6 * DEG);
        shots.advance(s, late);
        this.flash(SLOT_REAR + i, ox, TAIL_Y, DOWN, this.tier, 60);
      }
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const a = UP + side * 45 * DEG;
      const px = -Math.sin(a), py = Math.cos(a); // perpendicular to the diagonal
      for (let j = 0; j < n; j++) {
        const o = (j - (n - 1) / 2) * this.gap;
        const s = shots.fire(this.bolt, sx + side * 8 + px * o, sy - 2 + py * o, a);
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * 8, -2, a, this.tier, 60);
    }
  }
}

// ------------------------------------------------------------------------------ flame

/** Two sub-volleys per paid volley: a continuous jet even at power 1. */
class FlameGun extends WeaponGun {
  private perSide = 1;
  private half = 0;
  private puff!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.subs = 2;
    let count: number;
    if (this.mode === 0) {
      this.perSide = table(p, [1, 1, 1, 2, 2, 2, 3, 3, 3, 4]);
      this.half = ramp(p, 8, 22.4) * DEG;
      count = this.perSide * this.subs;
    } else {
      this.perSide = table(p, [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
      this.half = ramp(p, 6, 16.8) * DEG;
      count = this.perSide * 2 * this.subs;
    }
    const s = this.spec(flameTex(scene, this.color));
    s.move = MOVE_FLAME;
    s.speed = 300;
    s.drag = 2.4;
    s.life = ramp(p, 240, 400);
    s.pierce = true;
    s.damage = this.dmg(1, count, r);
    s.radius = 3; // grows with radiusEnd: <= 9.6 px (World grid assumes shot radius <= 10)
    s.radiusEnd = ramp(p, 2.3, 3.2);
    s.rotate = false;
    s.quarter = true;
    s.hit = HIT_SOFT;
    s.fx = { ...softImpactFx(scene, this.color, 0), pierce: null };
    this.puff = s;
    return r;
  }

  private emit(x: number, y: number, dir: number, n: number, late: number): void {
    const shots = this.core.shots;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() * 2 - 1) * this.half;
      const s = shots.fire(this.puff, x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, a);
      const j = 0.85 + Math.random() * 0.3;
      s.vx *= j;
      s.vy *= j;
      shots.advance(s, late);
    }
  }

  protected volley(late: number): void {
    const sx = this.shipX(), sy = this.shipY();
    if (this.mode === 0) {
      this.emit(sx, sy + TAIL_Y, DOWN, this.perSide, late);
      this.flash(SLOT_REAR, 0, TAIL_Y - 2, DOWN, 1, 70);
    } else {
      this.emit(sx - FLANK_X, sy + FLANK_Y, LEFT, this.perSide, late);
      this.emit(sx + FLANK_X, sy + FLANK_Y, RIGHT, this.perSide, late);
      this.flash(SLOT_REAR, -FLANK_X + 2, FLANK_Y, LEFT, 1, 70);
      this.flash(SLOT_REAR + 1, FLANK_X - 2, FLANK_Y, RIGHT, 1, 70);
    }
  }
}

// ------------------------------------------------------------------------------ mines

/** Mode A drop offsets per mine count. */
const MINE_DROP: readonly (readonly number[])[] = [[0], [-7, 7], [0, -10, 10]];
const MINE_TIER = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2];

class MinesGun extends WeaponGun {
  private n = 1;
  private mine!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.n = this.mode === 0 ? (p < 5 ? 1 : p < 9 ? 2 : 3) : (p < 6 ? 1 : 2);
    const count = this.mode === 0 ? this.n : this.n * 2;
    const s = this.spec(mineTex(scene, this.color, table(p, MINE_TIER)));
    s.frameMs = 240;
    s.move = MOVE_MINE;
    s.speed = 120;
    s.drag = 2.8;
    s.driftY = 16;
    s.life = ramp(p, 3200, 5000);
    s.damage = this.dmg(1, count, r);
    s.splash = ramp(p, 24, 47.4);
    s.radius = ramp(p, 8, 10); // proximity trigger radius (World grid assumes shot radius <= 10)
    s.armMs = 220;
    s.rotate = false;
    s.quarter = true;
    s.halo = glowTex(scene, 19);
    s.haloAlpha = 0.55;
    s.blink = true;
    s.hit = HIT_BLAST;
    s.fx = impactFx(scene, this.color, 3, blastRadius(s.splash));
    s.popOnExpire = true;
    this.mine = s;
    return r;
  }

  protected volley(late: number): void {
    const sx = this.shipX(), sy = this.shipY();
    const shots = this.core.shots;
    if (this.mode === 0) {
      const L = MINE_DROP[this.n - 1];
      for (let i = 0; i < L.length; i++) {
        const a = DOWN - L[i] * 1.3 * DEG + (Math.random() - 0.5) * 16 * DEG;
        const s = shots.fire(this.mine, sx + L[i], sy + TAIL_Y - 2, a);
        const k = 0.75 + Math.random() * 0.5;
        s.vx *= k;
        s.vy *= k;
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR, 0, TAIL_Y, DOWN, 2, 80);
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const dir = side < 0 ? LEFT : RIGHT;
      for (let j = 0; j < this.n; j++) {
        const lift = (j === 0 ? 8 : 26) * DEG + (Math.random() - 0.5) * 6 * DEG;
        const a = dir - side * lift;
        const s = shots.fire(this.mine, sx + side * FLANK_X, sy + FLANK_Y, a);
        const k = ((j === 0 ? 270 : 180) / 120) * (0.9 + Math.random() * 0.2);
        s.vx *= k;
        s.vy *= k;
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * FLANK_X, FLANK_Y, dir, 2, 80);
    }
  }
}

// ------------------------------------------------------------------------------ arc

class ArcGun extends WeaponGun {
  private perFan = 3;
  private half = 0;
  private ring!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    let count: number;
    if (this.mode === 0) {
      this.perFan = table(p, [3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
      this.half = ramp(p, 22, 53.5) * DEG;
      count = this.perFan;
    } else {
      this.perFan = table(p, [2, 2, 2, 3, 3, 3, 4, 4, 4, 5]);
      this.half = ramp(p, 12, 34.5) * DEG;
      count = this.perFan * 2;
    }
    const s = this.spec(ringShotTex(scene, this.color));
    s.speed = 400;
    s.life = 1000;
    s.damage = this.dmg(3, count, r);
    s.radius = 4.5;
    s.radiusEnd = 1.6; // rings ripple outwards (radius <= 7.2 px)
    s.rotate = false;
    s.halo = p >= 5 ? glowTex(scene, 15) : null;
    s.haloAlpha = 0.22;
    s.hit = HIT_SOFT;
    s.fx = softImpactFx(scene, this.color, 1);
    this.ring = s;
    return r;
  }

  private fan(x: number, y: number, dir: number, late: number): void {
    const n = this.perFan, half = this.half;
    const step = n > 1 ? (2 * half) / (n - 1) : 0;
    for (let k = 0; k < n; k++) {
      const a = dir - half + step * k;
      const s = this.core.shots.fire(this.ring, x + Math.cos(a) * 3, y + Math.sin(a) * 3, a);
      this.core.shots.advance(s, late);
    }
  }

  protected volley(late: number): void {
    const sx = this.shipX(), sy = this.shipY();
    if (this.mode === 0) {
      this.fan(sx, sy + TAIL_Y, DOWN, late);
      this.flash(SLOT_REAR, 0, TAIL_Y, DOWN, 2, 80);
    } else {
      this.fan(sx - FLANK_X, sy + FLANK_Y, LEFT, late);
      this.fan(sx + FLANK_X, sy + FLANK_Y, RIGHT, late);
      this.flash(SLOT_REAR, -FLANK_X, FLANK_Y, LEFT, 1, 80);
      this.flash(SLOT_REAR + 1, FLANK_X, FLANK_Y, RIGHT, 1, 80);
    }
  }
}

// ------------------------------------------------------------------------------ seekers

/** k-th slot of n slots centred on 0, visited centre-out: 0, +1, -1, +2 ... (odd n) or +0.5, -0.5 ... (even n). */
function centreOut(k: number, n: number): number {
  if (n & 1) return k === 0 ? 0 : (k & 1 ? 1 : -1) * Math.ceil(k / 2);
  return (k & 1 ? -1 : 1) * (Math.floor(k / 2) + 0.5);
}

/** Hunters are ripple-launched (one per sub-volley, both flanks together in mode B). */
class SeekersGun extends WeaponGun {
  private n = 2;
  private missile!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = this.rate();
    const scene = this.core.env.scene;
    this.n = this.mode === 0 ? table(p, [2, 2, 2, 3, 3, 3, 4, 4, 4, 5]) : (p < 4 ? 1 : p < 8 ? 2 : 3);
    const count = this.mode === 0 ? this.n : this.n * 2;
    this.subs = this.n;
    this.subSpread = 0.45;
    const s = this.spec(missileTex(scene, this.color, 1));
    s.frameMs = 60;
    s.move = MOVE_HOMING;
    s.speed = 120;
    s.accel = 850;
    s.maxSpeed = 430;
    s.turnRate = 4.6;
    s.seekRange = 440;
    s.launchMs = 170;
    s.life = 2600;
    s.damage = this.dmg(2, count, r);
    s.radius = 4.5;
    s.trail = TRAIL_SMOKE;
    s.trailMs = 42;
    s.popOnExpire = true;
    s.fx = impactFx(scene, this.color, 2);
    this.missile = s;
    return r;
  }

  protected volley(late: number, sub: number): void {
    const sx = this.shipX(), sy = this.shipY();
    const shots = this.core.shots;
    const c = centreOut(sub, this.n);
    if (this.mode === 0) {
      const a = DOWN + c * 22 * DEG;
      const s = shots.fire(this.missile, sx + c * 4, sy + TAIL_Y, a);
      shots.advance(s, late);
      this.flash(SLOT_REAR + sub, c * 4, TAIL_Y, a, 1, 70);
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const dir = side < 0 ? LEFT : RIGHT;
      const a = dir + c * 18 * DEG;
      const s = shots.fire(this.missile, sx + side * FLANK_X, sy + FLANK_Y + c * 3, a);
      shots.advance(s, late);
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * FLANK_X, FLANK_Y, dir, 1, 70);
    }
  }
}

/** Creates the gun implementing a rear pattern. */
export function createRearGun(core: ArsenalCore, pattern: RearPattern): WeaponGun {
  switch (pattern) {
    case 'flame': return new FlameGun(core);
    case 'mines': return new MinesGun(core);
    case 'arc': return new ArcGun(core);
    case 'seekers': return new SeekersGun(core);
    default: return new TailGun(core);
  }
}

/** True if `pattern` is a rear pattern. */
export function isRearPattern(pattern: string): pattern is RearPattern {
  return pattern === 'tail' || pattern === 'flame' || pattern === 'mines' || pattern === 'arc' || pattern === 'seekers';
}
