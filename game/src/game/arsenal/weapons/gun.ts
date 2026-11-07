// =====================================================================================
//  GUN BASE — cadence, energy draw and spec helpers shared by every front / rear gun.
//
//  Cadence: a volley fires every `interval` ms while the trigger is held. Volleys due
//  inside a frame are fired with their lateness so fast streams stay evenly spaced.
//  Energy: host.trySpendEnergy(energy) before every volley (false -> the volley is skipped,
//  the cadence continues). energy = def.energyPerShot * E(p) / R(p), i.e. the generator
//  drain per second grows only by E(p) = 1 + 0.05 (p - 1) while cadence rises with R(p).
// =====================================================================================
import type { SfxKey, WeaponDef } from '../../../types';
import { SHOT_RGB } from '../../../art/keys';
import type { ArsenalHost } from '../api';
import type { AnchorSource, ArsenalEnv } from '../env';
import { ANCHOR_SHIP } from '../env';
import type { FxPool } from '../fx';
import { makeSpec, type ShotPool, type ShotSpec } from '../shots';
import { shotTexture } from '../textures';
import { clampPower, energyMul, intervalMs, shotDamage } from '../scaling';

/** What guns and sidekicks need from the arsenal. */
export interface ArsenalCore extends AnchorSource {
  readonly env: ArsenalEnv;
  readonly host: ArsenalHost;
  readonly shots: ShotPool;
  /** Impact effects (above the shots). */
  readonly fx: FxPool;
  /** Muzzle flashes (above the ship). */
  readonly muzzles: FxPool;
  /** Front-gun muzzle point of the current hull, relative to the ship centre. */
  readonly noseX: number;
  readonly noseY: number;
}

export abstract class Gun {
  /** ms between volleys. */
  interval = 1000;
  /** Energy drawn per volley. */
  energy = 0;
  sfx: SfxKey | null = null;
  /**
   * Sub-volleys per volley: one paid volley is fired as `subs` evenly spaced bursts spread
   * over `subSpread` x interval (dense streams / ripple-fired missiles at the same DPS).
   */
  protected subs = 1;
  protected subSpread = 1;
  /** Volleys fired so far (alternating patterns, shared beam registries). */
  protected volleys = 0;
  private cooldown = 0;
  private idle = true;
  private subLeft = 0;
  private subIndex = 0;
  private subTimer = 0;

  constructor(protected readonly core: ArsenalCore) {}

  /** Advances the cadence; fires while `active` (trigger held and ship able to fire). */
  update(dtMs: number, active: boolean): void {
    // the remaining sub-volleys of a paid volley always complete
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

  private subStep(): number {
    return (this.interval * this.subSpread) / this.subs;
  }

  private trigger(lateMs: number): void {
    if (!this.core.host.trySpendEnergy(this.energy)) return;
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
  protected glow = 0xffffff;
  protected coreColor = 0xffffff;

  configure(def: WeaponDef, power: number, mode: 0 | 1): void {
    this.def = def;
    this.p = clampPower(power);
    this.mode = mode;
    this.sfx = def.sfx;
    const rgb = SHOT_RGB[def.color] ?? SHOT_RGB.white;
    this.glow = rgb.glow;
    this.coreColor = rgb.core;
    const r = this.build();
    this.interval = intervalMs(def.fireRate, r);
    this.energy = (Math.max(0, def.energyPerShot) * energyMul(this.p)) / r;
  }

  /** Builds the specs for the current def/power/mode; returns the cadence multiplier R(p). */
  protected abstract build(): number;

  /** A spec showing `sprite` (default: the weapon's projectile) in the weapon colour. */
  protected spec(sprite: string = this.def.projectile): ShotSpec {
    return makeSpec(shotTexture(this.core.env.scene, sprite, this.def.color), this.glow, this.coreColor);
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

  /** Muzzle flash on `slot` at (ox, oy) from the ship centre, pointing along `angle`. */
  protected flash(slot: number, ox: number, oy: number, angle: number, scale: number): void {
    this.core.muzzles.muzzle(slot, ANCHOR_SHIP, ox, oy, angle, this.coreColor, scale);
  }
}
