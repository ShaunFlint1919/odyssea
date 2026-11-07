// =====================================================================================
//  ENERGY / SHIELD / ARMOR MODEL (docs/ARCHITECTURE.md "Core rules"):
//   - the generator produces `output` energy per second up to `capacity`;
//   - each weapon volley costs energy (trySpend); no energy -> the volley is skipped;
//   - the shield regenerates `regen` points/s while energy is available, each point
//     drawing `energyPerPoint` energy;
//   - damage hits the shield first, the overflow goes to the armor (hull hp).
//  Pure logic (no Phaser), allocation free.
// =====================================================================================
import type { GeneratorDef, HullDef, ShieldDef } from '../types';

export class EnergyModel {
  energy: number;
  readonly energyMax: number;
  readonly output: number;
  shield: number;
  readonly shieldMax: number;
  readonly shieldRegen: number;
  readonly energyPerPoint: number;
  armor: number;
  readonly armorMax: number;
  /** Results of the last damage() call (out-parameters, no allocation). */
  lastShieldDamage = 0;
  lastArmorDamage = 0;

  constructor(hull: HullDef, shield: ShieldDef, gen: GeneratorDef) {
    this.energyMax = Math.max(1, gen.capacity);
    this.output = Math.max(0, gen.output);
    this.energy = this.energyMax;
    this.shieldMax = Math.max(0, shield.capacity);
    this.shield = this.shieldMax;
    this.shieldRegen = Math.max(0, shield.regen);
    this.energyPerPoint = Math.max(0, shield.energyPerPoint);
    this.armorMax = Math.max(1, hull.armor);
    this.armor = this.armorMax;
  }

  /** Generator output, then shield regeneration drawing energy. */
  update(dtSec: number): void {
    this.energy += this.output * dtSec;
    if (this.energy > this.energyMax) this.energy = this.energyMax;
    if (this.shield < this.shieldMax && this.shieldRegen > 0) {
      let pts = this.shieldRegen * dtSec;
      const missing = this.shieldMax - this.shield;
      if (pts > missing) pts = missing;
      if (this.energyPerPoint > 0) {
        const affordable = this.energy / this.energyPerPoint;
        if (pts > affordable) pts = affordable;
        this.energy -= pts * this.energyPerPoint;
        if (this.energy < 0) this.energy = 0;
      }
      this.shield += pts;
    }
  }

  /** Draw energy for one volley. */
  trySpend(amount: number): boolean {
    if (amount <= 0) return true;
    if (this.energy + 1e-6 >= amount) {
      this.energy -= amount;
      if (this.energy < 0) this.energy = 0;
      return true;
    }
    return false;
  }

  /** Shield first, then armor. Fills lastShieldDamage / lastArmorDamage. */
  damage(amount: number): void {
    let rest = Math.max(0, amount);
    const s = Math.min(this.shield, rest);
    this.shield -= s;
    rest -= s;
    const a = Math.min(this.armor, rest);
    this.armor -= a;
    this.lastShieldDamage = s;
    this.lastArmorDamage = a;
  }

  /** Repair armor by `amount` (capped). Returns the points actually restored. */
  repair(amount: number): number {
    const before = this.armor;
    this.armor = Math.min(this.armorMax, this.armor + Math.max(0, amount));
    return this.armor - before;
  }

  /** Instantly refill the shield. */
  refillShield(): void {
    this.shield = this.shieldMax;
  }

  get dead(): boolean {
    return this.armor <= 0;
  }
}
