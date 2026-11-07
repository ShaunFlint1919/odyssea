// =====================================================================================
//  GUN BASE — cadence, energy draw and look helpers shared by every front / rear gun.
//
//  Cadence: a paid volley fires every `interval` ms while the trigger is held. Volleys due
//  inside a frame are fired with their lateness so fast streams stay evenly spaced.
//  Energy: host.trySpendEnergy(energy) before every paid volley (false -> the volley is
//  skipped, the cadence continues). energy = def.energyPerShot * E(p) / R(p), i.e. the
//  generator drain per second grows only by E(p) = 1 + 0.05 (p - 1) while cadence rises
//  with R(p) (exact numbers for displays: weaponFireStats() in ../scaling.ts).
//  Priority: while the front gun is starved, the rear gun does not draw energy.
//
//  Density: a paid volley can be fired as `subs` evenly spaced sub-volleys (subsFor()
//  aims at a number of visual rows per second). Projectiles per paid volley then grow and
//  each one carries a proportional share of the volley's damage, so DPS and energy stay
//  exactly the scaling.ts model while streams look dense even at power 1.
// =====================================================================================
import type { ShotColor, SfxKey, WeaponDef } from '../../../types';
import { MAX_POWER } from '../../../config';
import { SHOT_RGB } from '../../../art/keys';
import type { ArsenalHost } from '../api';
import type { AnchorSource, ArsenalEnv } from '../env';
import { ANCHOR_SHIP } from '../env';
import type { FxPool } from '../effects';
import { makeSpec, type ShotPool, type ShotSpec } from '../projectiles';
import { muzzleSet } from '../looks';
import type { TexInfo } from '../textures';
import { clampPower, energyMul, intervalMs, patternRate, shotDamage } from '../scaling';

/** What guns and sidekicks need from the arsenal. */
export interface ArsenalCore extends AnchorSource {
  readonly env: ArsenalEnv;
  readonly host: ArsenalHost;
  readonly shots: ShotPool;
  /** Impact / trail effects (additive, above the shots, below enemy bullets). */
  readonly fx: FxPool;
  /** Smoke puffs (normal blend, below the shots). */
  readonly smoke: FxPool;
  /** Muzzle flashes (above every other player-fire layer, below the enemy bullets). */
  readonly muzzles: FxPool;
  /** Front-gun muzzle point of the current hull, relative to the ship centre. */
  readonly noseX: number;
  readonly noseY: number;
  /**
   * Energy priority: true while the front gun's last volley was skipped for lack of energy.
   * The rear gun holds fire meanwhile, so cheap rapid rear volleys cannot starve the main gun.
   */
  frontStarved: boolean;
}

export abstract class Gun {
  /** ms between paid volleys. */
  interval = 1000;
  /** Energy drawn per paid volley. */
  energy = 0;
  sfx: SfxKey | null = null;
  /** Rear guns yield the energy to a starved front gun (see ArsenalCore.frontStarved). */
  protected isRear = false;
  /** Sub-volleys per paid volley, spread evenly over `subSpread` x interval. */
  protected subs = 1;
  protected subSpread = 1;
  /** Paid volleys fired so far (alternating patterns, shared beam registries). */
  protected volleys = 0;
  private cooldown = 0;
  private idle = true;
  private subLeft = 0;
  private subIndex = 0;
  private subTimer = 0;

  constructor(protected readonly core: ArsenalCore) {}

  /**
   * Advances the cadence; fires while `active` (trigger held and ship able to fire).
   * The remaining sub-volleys of a paid volley complete even if the trigger is released,
   * but are dropped when the ship cannot fire (`canFire` false: death, cut-scene).
   */
  update(dtMs: number, active: boolean, canFire: boolean): void {
    if (!canFire) this.subLeft = 0;
    if (this.subLeft > 0) {
      this.subTimer -= dtMs;
      while (this.subLeft > 0 && this.subTimer <= 0) {
        this.subIndex++;
        this.subLeft--;
        this.volley(-this.subTimer < dtMs ? -this.subTimer : dtMs, this.subIndex);
        this.subTimer += this.subStep();
      }
    }
    if (!active) {
      this.cooldown = this.cooldown > dtMs ? this.cooldown - dtMs : 0;
      this.idle = true;
      return;
    }
    if (this.idle) {
      this.idle = false;
      if (this.cooldown <= 0) {
        this.trigger(0);
        this.cooldown = this.interval;
        return;
      }
    }
    this.cooldown -= dtMs;
    let guard = 0;
    while (this.cooldown <= 0 && guard < 4) {
      const late = -this.cooldown < dtMs ? -this.cooldown : dtMs;
      this.trigger(late);
      this.cooldown += this.interval;
      guard++;
    }
    if (this.cooldown < 0) this.cooldown = 0;
  }

  /** Forget the trigger state (new loadout, level start). */
  reset(): void {
    this.cooldown = 0;
    this.idle = true;
    this.volleys = 0;
    this.subLeft = 0;
  }

  /** Drops the sub-volleys still pending from the last paid volley (shots cleared). */
  cancelPending(): void {
    this.subLeft = 0;
  }

  private subStep(): number {
    return (this.interval * this.subSpread) / this.subs;
  }

  private trigger(lateMs: number): void {
    const core = this.core;
    // very low frame rates: finish the previous paid volley before starting a new one
    while (this.subLeft > 0) {
      this.subIndex++;
      this.subLeft--;
      this.volley(lateMs, this.subIndex);
    }
    if (this.isRear && core.frontStarved) return;
    const ok = core.host.trySpendEnergy(this.energy);
    if (!this.isRear) core.frontStarved = !ok;
    if (!ok) return;
    this.subIndex = 0;
    this.volley(lateMs, 0);
    if (this.subs > 1) {
      this.subLeft = this.subs - 1;
      this.subTimer = this.subStep() - lateMs;
    }
    this.volleys++;
    if (this.sfx) this.core.host.sfx(this.sfx);
  }

  /**
   * Spawns one (sub-)volley; `lateMs` = how long ago it was due (pre-advance the shots),
   * `sub` = 0..subs-1 within the paid volley.
   */
  protected abstract volley(lateMs: number, sub: number): void;
}

/** A front or rear gun built from a WeaponDef at a power level (and rear mode). */
export abstract class WeaponGun extends Gun {
  protected def!: WeaponDef;
  protected p = 1;
  protected mode: 0 | 1 = 0;
  protected color: ShotColor = 'white';
  protected glow = 0xffffff;
  protected coreColor = 0xffffff;
  /** Muzzle flash sheets of the weapon colour, tiers 0..3. */
  protected muzzleTex: TexInfo[] = [];

  configure(def: WeaponDef, power: number, mode: 0 | 1): void {
    this.def = def;
    this.p = clampPower(power);
    this.mode = mode;
    this.isRear = def.slot === 'rear';
    this.sfx = def.sfx;
    this.color = SHOT_RGB[def.color] ? def.color : 'white';
    const rgb = SHOT_RGB[this.color];
    this.glow = rgb.glow;
    this.coreColor = rgb.core;
    this.muzzleTex = muzzleSet(this.core.env.scene, this.color);
    this.subs = 1;
    this.subSpread = 1;
    const r = this.build();
    this.interval = intervalMs(def.fireRate, r);
    this.energy = (Math.max(0, def.energyPerShot) * energyMul(this.p)) / r;
  }

  /**
   * Generates every texture this weapon uses from its current power up to MAX_POWER (both
   * rear modes), so in-level power-ups never generate art mid-fight. Restores the config.
   */
  prewarm(): void {
    const p0 = this.p, m0 = this.mode, subs = this.subs, spread = this.subSpread;
    for (let q = p0; q <= MAX_POWER; q++) {
      for (let m = 0; m < (this.isRear ? 2 : 1); m++) {
        this.p = q;
        this.mode = m as 0 | 1;
        this.build();
      }
    }
    this.p = p0;
    this.mode = m0;
    this.subs = subs;
    this.subSpread = spread;
    this.build();
  }

  /** Builds the specs for the current def/power/mode (sets subs); returns the cadence multiplier R(p). */
  protected abstract build(): number;

  /** Cadence multiplier R(p) of this weapon (RATE_SLOPE of its pattern, see scaling.ts). */
  protected rate(): number {
    return patternRate(this.def.pattern, this.p);
  }

  /** Paid volleys per second at the current power. */
  protected volleysPerSec(): number {
    return Math.max(0.1, this.def.fireRate * this.rate());
  }

  /** Sub-volleys per paid volley so the stream shows about `rows` rows per second. */
  protected subsFor(rows: number, maxSubs: number): number {
    return Math.max(1, Math.min(maxSubs, Math.round(rows / this.volleysPerSec())));
  }

  /** A spec showing `tex` in the weapon colours. */
  protected spec(tex: TexInfo): ShotSpec {
    return makeSpec(tex, this.glow, this.coreColor);
  }

  /** Per-projectile damage: def.damage * M(p) * n1 / (np * r) (see scaling.ts). */
  protected dmg(n1: number, np: number, r: number): number {
    return shotDamage(this.def.damage, this.p, n1, np, r);
  }

  protected shipX(): number {
    return this.core.host.shipX();
  }

  protected shipY(): number {
    return this.core.host.shipY();
  }

  /** Muzzle flash (size tier 0..3) on `slot` at (ox, oy) from the ship centre, pointing along `angle`. */
  protected flash(slot: number, ox: number, oy: number, angle: number, tier: number, ms = 70): void {
    const tex = this.muzzleTex[tier < 0 ? 0 : tier > 3 ? 3 : tier];
    if (tex) this.core.muzzles.muzzle(slot, ANCHOR_SHIP, ox, oy, angle, tex, ms);
  }
}
