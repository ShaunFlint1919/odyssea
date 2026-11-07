// =====================================================================================
//  POWER SCALING — shared formulas (power p = 1..MAX_POWER). Single source of truth for
//  the guns AND for any UI that displays weapon numbers (use weaponFireStats()).
//
//  For a weapon def at power p:
//    M(p) = 1 + 0.45 (p - 1)          total DPS multiplier       (x1 -> x5.05 at p10)
//    R(p) = 1 + RATE_SLOPE[pattern] (p - 1)   cadence multiplier  (x1.18 .. x1.54 at p10)
//    E(p) = 1 + 0.05 (p - 1)          energy-per-SECOND multiplier (x1 -> x1.45 at p10)
//    volleys/s      = def.fireRate * R(p)
//    energy/volley  = def.energyPerShot * E(p) / R(p)   (so energy/s = energyPerShot * fireRate * E(p))
//    nominal DPS    = def.damage * def.fireRate * N1 * M(p)
//  N1 = projectiles per volley at p1 of the content balance model (src/data/weapons.ts
//  PROJECTILES_AT_P1). Per-projectile damage = def.damage * M(p) * N1 / (Np * R(p)) where
//  Np = projectiles per paid volley at p (pattern tables), optionally re-weighted (bigger
//  bolts hit harder). Rear modes A and B share the same totals.
// =====================================================================================
import type { FrontPattern, RearPattern, WeaponDef } from '../../types';
import { MAX_POWER } from '../../config';

/** Cadence slope k of R(p) = 1 + k (p - 1), per pattern. */
export const RATE_SLOPE: Record<FrontPattern | RearPattern, number> = {
  pulse: 0.03, scatter: 0.03, gatling: 0.06, lance: 0.03, seeker: 0.03, helix: 0.03, mortar: 0.025, prism: 0.03,
  tail: 0.03, flame: 0.02, mines: 0.025, arc: 0.03, seekers: 0.03,
};

/** Projectiles per volley at power 1 (same values as PROJECTILES_AT_P1 in src/data/weapons.ts). */
export const N1: Record<FrontPattern | RearPattern, number> = {
  pulse: 1, scatter: 3, gatling: 1, lance: 1, seeker: 2, helix: 2, mortar: 1, prism: 1,
  tail: 1, flame: 1, mines: 1, arc: 3, seekers: 2,
};

/** Clamp a power level to 1..MAX_POWER (integer). */
export function clampPower(p: number): number {
  if (!Number.isFinite(p)) return 1;
  return Math.max(1, Math.min(MAX_POWER, Math.round(p)));
}

/** Total output DPS multiplier at power p. */
export function dpsMul(p: number): number {
  return 1 + 0.45 * (p - 1);
}

/** Energy-per-second multiplier at power p. */
export function energyMul(p: number): number {
  return 1 + 0.05 * (p - 1);
}

/** Cadence multiplier at power p for a pattern-specific slope k. */
export function rateMul(p: number, k: number): number {
  return 1 + k * (p - 1);
}

/** Cadence multiplier R(p) of a weapon pattern. */
export function patternRate(pattern: string, p: number): number {
  return rateMul(p, (RATE_SLOPE as Record<string, number>)[pattern] ?? 0.03);
}

/** Linear ramp a (p1) -> b (p MAX_POWER). */
export function ramp(p: number, a: number, b: number): number {
  return a + (b - a) * (p - 1) / (MAX_POWER - 1);
}

/** Pick the entry of a per-level table (index p - 1, clamped). */
export function table<T>(p: number, values: readonly T[]): T {
  return values[Math.max(0, Math.min(values.length - 1, p - 1))];
}

/**
 * Per-projectile damage so that the total DPS follows M(p):
 * def.damage * M(p) * n1 / (np * R(p)), where n1/np are the projectiles per volley at p1/p.
 */
export function shotDamage(baseDamage: number, p: number, n1: number, np: number, r: number): number {
  return (baseDamage * dpsMul(p) * n1) / (Math.max(1, np) * r);
}

/** ms between volleys for a fire rate in volleys/s (guarded against 0 / NaN). */
export function intervalMs(fireRate: number, r: number): number {
  const rate = fireRate > 0 && Number.isFinite(fireRate) ? fireRate * r : 1;
  return 1000 / rate;
}

/** Exact numbers of a front / rear weapon as the arsenal fires it (nominal: every projectile hits). */
export interface WeaponFireStats {
  power: number;
  volleysPerSec: number;
  energyPerVolley: number;
  energyPerSec: number;
  dps: number;
}

/** Exact cadence / energy / nominal DPS of `def` at `power` (for shop / specs displays). */
export function weaponFireStats(def: WeaponDef, power: number): WeaponFireStats {
  const p = clampPower(power);
  const r = patternRate(def.pattern, p);
  const rate = def.fireRate > 0 ? def.fireRate * r : 0;
  const energyPerVolley = (Math.max(0, def.energyPerShot) * energyMul(p)) / r;
  const n1 = (N1 as Record<string, number>)[def.pattern] ?? 1;
  return {
    power: p,
    volleysPerSec: rate,
    energyPerVolley,
    energyPerSec: energyPerVolley * rate,
    dps: def.damage * def.fireRate * n1 * dpsMul(p),
  };
}

export const DEG = Math.PI / 180;
export const UP = -Math.PI / 2;
export const DOWN = Math.PI / 2;
export const LEFT = Math.PI;
export const RIGHT = 0;
export const HALF_PI = Math.PI / 2;
export const TAU = Math.PI * 2;
