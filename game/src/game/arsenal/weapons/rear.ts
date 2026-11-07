// =====================================================================================
//  REAR GUNS — one class per RearPattern, two modes each (0 = A, 1 = B):
//   tail     A: 1 -> 5 bolt streams straight back      B: 1 -> 4 parallel pairs at 45 deg forward
//   flame    A: rear flame cone (1 -> 4 puffs/volley)   B: flames out of both flanks
//   mines    A: 1 -> 3 proximity mines dropped behind   B: 1 -> 2 pairs lobbed sideways
//   arc      A: 3 -> 7 ring arc fanned to the rear      B: 2 -> 5 rings per flank arc
//   seekers  A: 2 -> 5 hunters launched backwards       B: 1 -> 3 hunters per flank
//  Both modes have the same total DPS (balance model: damage * fireRate * N1 * M(p)).
// =====================================================================================
import type { RearPattern } from '../../../types';
import { SLOT_REAR } from '../fx';
import { HIT_BLAST, HIT_SOFT, MOVE_FLAME, MOVE_HOMING, MOVE_MINE, type ShotSpec } from '../shots';
import { DEG, DOWN, LEFT, RIGHT, UP, rateMul, ramp, table } from '../scaling';
import { WeaponGun, type ArsenalCore } from './gun';

/** Rear muzzle (tail) and flank muzzle offsets from the ship centre. */
const TAIL_Y = 12;
const FLANK_X = 10;
const FLANK_Y = 2;

// ------------------------------------------------------------------------------ tail

class TailGun extends WeaponGun {
  private n = 1;
  private bolt!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = rateMul(p, 0.03);
    this.n = this.mode === 0 ? table(p, [1, 2, 2, 3, 3, 3, 4, 4, 5, 5]) : table(p, [1, 1, 2, 2, 2, 3, 3, 3, 4, 4]);
    const count = this.mode === 0 ? this.n : this.n * 2;
    const s = this.spec();
    s.speed = 560;
    s.life = 1100;
    s.damage = this.dmg(1, count, r);
    s.radius = 3.5;
    s.scaleX = s.scaleY = ramp(p, 1, 1.3);
    s.halo = p >= 6 ? 10 : 0;
    s.haloAlpha = 0.4;
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
        const ox = c * 5;
        const s = shots.fire(this.bolt, sx + ox, sy + TAIL_Y - Math.abs(c), DOWN + c * 1.6 * DEG);
        shots.advance(s, late);
        this.flash(SLOT_REAR + i, ox, TAIL_Y, DOWN, 0.7);
      }
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const a = UP + side * 45 * DEG;
      const px = -Math.sin(a), py = Math.cos(a); // perpendicular to the diagonal
      for (let j = 0; j < n; j++) {
        const o = (j - (n - 1) / 2) * 5;
        const s = shots.fire(this.bolt, sx + side * 8 + px * o, sy - 2 + py * o, a);
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * 8, -2, a, 0.7);
    }
  }
}

// ------------------------------------------------------------------------------ flame

class FlameGun extends WeaponGun {
  private perSide = 1;
  private half = 0;
  private puff!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = rateMul(p, 0.02);
    let count: number;
    if (this.mode === 0) {
      this.perSide = table(p, [1, 1, 1, 2, 2, 2, 3, 3, 3, 4]);
      this.half = ramp(p, 8, 22.4) * DEG;
      count = this.perSide;
    } else {
      this.perSide = table(p, [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
      this.half = ramp(p, 6, 16.8) * DEG;
      count = this.perSide * 2;
    }
    const life = ramp(p, 230, 392);
    const s = this.spec();
    s.move = MOVE_FLAME;
    s.speed = 290;
    s.drag = 2.4;
    s.life = life;
    s.pierce = true;
    s.damage = this.dmg(1, count, r);
    s.radius = 3; // grows with scaleEnd: <= 9.6 px
    s.scaleX = s.scaleY = 0.6;
    s.scaleEnd = ramp(p, 2.3, 3.2);
    s.fadeMs = life * 0.55;
    s.additive = true;
    s.rotate = false;
    s.spin = 7;
    s.hit = HIT_SOFT;
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
      this.flash(SLOT_REAR, 0, TAIL_Y - 2, DOWN, 0.8);
    } else {
      this.emit(sx - FLANK_X, sy + FLANK_Y, LEFT, this.perSide, late);
      this.emit(sx + FLANK_X, sy + FLANK_Y, RIGHT, this.perSide, late);
      this.flash(SLOT_REAR, -FLANK_X + 2, FLANK_Y, LEFT, 0.7);
      this.flash(SLOT_REAR + 1, FLANK_X - 2, FLANK_Y, RIGHT, 0.7);
    }
  }
}

// ------------------------------------------------------------------------------ mines

/** Mode A drop offsets per mine count. */
const MINE_DROP: readonly (readonly number[])[] = [[0], [-7, 7], [0, -10, 10]];

class MinesGun extends WeaponGun {
  private n = 1;
  private mine!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = rateMul(p, 0.025);
    this.n = this.mode === 0 ? (p < 5 ? 1 : p < 9 ? 2 : 3) : (p < 6 ? 1 : 2);
    const count = this.mode === 0 ? this.n : this.n * 2;
    const s = this.spec();
    s.move = MOVE_MINE;
    s.speed = 120;
    s.drag = 2.8;
    s.driftY = 16;
    s.life = ramp(p, 3200, 5000);
    s.damage = this.dmg(1, count, r);
    s.splash = ramp(p, 24, 47.4);
    s.radius = ramp(p, 8, 10); // proximity trigger radius (World grid assumes shot radius <= 10)
    s.scaleX = s.scaleY = ramp(p, 1, 1.35);
    s.armMs = 220;
    s.rotate = false;
    s.spin = 1.8;
    s.halo = 18;
    s.haloAlpha = 0.7;
    s.blink = true;
    s.hit = HIT_BLAST;
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
        const s = shots.fire(this.mine, sx + L[i], sy + TAIL_Y - 2, DOWN - L[i] * 1.3 * DEG);
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR, 0, TAIL_Y, DOWN, 0.9);
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const dir = side < 0 ? LEFT : RIGHT;
      for (let j = 0; j < this.n; j++) {
        const lift = (j === 0 ? 8 : 26) * DEG;
        const a = dir - side * lift;
        const s = shots.fire(this.mine, sx + side * FLANK_X, sy + FLANK_Y, a);
        const k = j === 0 ? 270 / 120 : 180 / 120;
        s.vx *= k;
        s.vy *= k;
        s.speed *= k;
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * FLANK_X, FLANK_Y, dir, 0.8);
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
    const r = rateMul(p, 0.03);
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
    const s = this.spec();
    s.speed = 400;
    s.life = 1100;
    s.damage = this.dmg(3, count, r);
    s.radius = 5;
    s.rotate = false;
    s.scaleX = s.scaleY = ramp(p, 0.9, 1.2);
    s.halo = p >= 5 ? 14 : 0;
    s.haloAlpha = 0.35;
    s.hit = HIT_SOFT;
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
      this.flash(SLOT_REAR, 0, TAIL_Y, DOWN, 1);
    } else {
      this.fan(sx - FLANK_X, sy + FLANK_Y, LEFT, late);
      this.fan(sx + FLANK_X, sy + FLANK_Y, RIGHT, late);
      this.flash(SLOT_REAR, -FLANK_X, FLANK_Y, LEFT, 0.8);
      this.flash(SLOT_REAR + 1, FLANK_X, FLANK_Y, RIGHT, 0.8);
    }
  }
}

// ------------------------------------------------------------------------------ seekers

class SeekersGun extends WeaponGun {
  private n = 2;
  private missile!: ShotSpec;

  protected build(): number {
    const p = this.p;
    const r = rateMul(p, 0.03);
    this.n = this.mode === 0 ? table(p, [2, 2, 2, 3, 3, 3, 4, 4, 4, 5]) : (p < 4 ? 1 : p < 8 ? 2 : 3);
    const count = this.mode === 0 ? this.n : this.n * 2;
    const s = this.spec();
    s.move = MOVE_HOMING;
    s.speed = 120;
    s.accel = 850;
    s.maxSpeed = 420;
    s.turnRate = 4.6;
    s.seekRange = 440;
    s.launchMs = 170;
    s.life = 2600;
    s.damage = this.dmg(2, count, r);
    s.radius = 4;
    s.trailMs = 30;
    s.trailSize = 7;
    s.popOnExpire = true;
    this.missile = s;
    return r;
  }

  protected volley(late: number): void {
    const sx = this.shipX(), sy = this.shipY();
    const shots = this.core.shots;
    if (this.mode === 0) {
      const n = this.n;
      for (let i = 0; i < n; i++) {
        const c = i - (n - 1) / 2;
        const a = DOWN + c * 26 * DEG;
        const s = shots.fire(this.missile, sx + c * 5, sy + TAIL_Y, a);
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR, 0, TAIL_Y, DOWN, 0.9);
      return;
    }
    for (let side = -1; side <= 1; side += 2) {
      const dir = side < 0 ? LEFT : RIGHT;
      for (let j = 0; j < this.n; j++) {
        const c = j - (this.n - 1) / 2;
        const a = dir + c * 18 * DEG;
        const s = shots.fire(this.missile, sx + side * FLANK_X, sy + FLANK_Y + c * 4, a);
        shots.advance(s, late);
      }
      this.flash(SLOT_REAR + (side < 0 ? 0 : 1), side * FLANK_X, FLANK_Y, dir, 0.7);
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
