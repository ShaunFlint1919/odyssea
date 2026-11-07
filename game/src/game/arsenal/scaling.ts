// =====================================================================================
//  POWER SCALING — shared formulas (power p = 1..MAX_POWER).
//
//  Every gun computes, once per (weapon, power, mode):
//    interval(p)   = 1000 / (def.fireRate * R(p))             ms between volleys
//    energy(p)     = def.energyPerShot * E(p)                  per volley
//    total DPS(p)  = baseDps * M(p)                            sum over every projectile
//  with  M(p) = 1 + 0.45 (p - 1)     (x1 at p1 -> x5.05 at p10)
//        E(p) = 1 + 0.05 (p - 1)     (x1 at p1 -> x1.45 at p10, "mild")
//        R(p) = 1 + k (p - 1)        (cadence; k per pattern, 0.02..0.06)
//  and   baseDps = def.damage * N(1) * def.fireRate, N(p) = projectiles per volley (pattern
//  table). Per-projectile damage is therefore  def.damage * M(p) * N(1) / (N(p) * R(p)),
//  optionally redistributed by per-projectile weights (bigger bolts hit harder).
// =====================================================================================
import { MAX_POWER } from '../../config';

/** Clamp a power level to 1..MAX_POWER (integer). */
export function clampPower(p: number): number {
  if (!Number.isFinite(p)) return 1;
  return Math.max(1, Math.min(MAX_POWER, Math.round(p)));
}

/** Total output DPS multiplier at power p. */
export function dpsMul(p: number): number {
  return 1 + 0.45 * (p - 1);
}

/** Energy per volley multiplier at power p. */
export function energyMul(p: number): number {
  return 1 + 0.05 * (p - 1);
}

/** Cadence multiplier at power p for a pattern-specific slope k. */
export function rateMul(p: number, k: number): number {
  return 1 + k * (p - 1);
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

export const DEG = Math.PI / 180;
export const UP = -Math.PI / 2;
export const DOWN = Math.PI / 2;
export const LEFT = Math.PI;
export const RIGHT = 0;
export const HALF_PI = Math.PI / 2;
export const TAU = Math.PI * 2;
