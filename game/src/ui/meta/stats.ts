// =====================================================================================
//  META SCREENS — loadout statistics for the Specs screen, the hangar summary and the shop
//  comparisons. Uses the shared power-scaling formulas of the arsenal
//  (src/game/arsenal/scaling.ts: DPS x M(p), energy per volley x E(p), cadence x R(p)) and
//  the projectiles-per-volley tables of the content balance model (src/data/weapons.ts,
//  src/data/sidekicks.ts). Values are nominal (every projectile hitting).
// =====================================================================================
import type { Loadout, SidekickDef, WeaponDef } from '../../types';
import { dpsMul, energyMul, rateMul } from '../../game/arsenal/scaling';
import { PROJECTILES_AT_P1 } from '../../data/weapons';
import { SIDEKICK_PROJECTILES } from '../../data/sidekicks';
import { findGenerator, findHull, findShield, findSidekick, findWeapon } from './common';

/** Cadence slope of R(p) used for display (the arsenal uses 0.02..0.06 per pattern). */
const RATE_SLOPE = 0.04;

export interface GunStats {
  name: string;
  power: number;
  /** Damage of one volley (all projectiles). */
  volley: number;
  /** Volleys per second. */
  rate: number;
  /** Nominal damage per second. */
  dps: number;
  /** Generator energy drawn per second while firing. */
  energy: number;
  projectiles: number;
}

/** Stats of a front / rear weapon at a power level. */
export function weaponStats(def: WeaponDef, power: number): GunStats {
  const p = Math.max(1, Math.round(power));
  const n = PROJECTILES_AT_P1[def.pattern] ?? 1;
  const rate = def.fireRate * rateMul(p, RATE_SLOPE);
  const dps = def.damage * n * def.fireRate * dpsMul(p);
  return {
    name: def.name,
    power: p,
    volley: rate > 0 ? dps / rate : 0,
    rate,
    dps,
    energy: def.energyPerShot * energyMul(p) * rate,
    projectiles: n,
  };
}

/** Stats of a sidekick (sidekicks draw no generator energy). */
export function sidekickStats(def: SidekickDef): GunStats {
  const n = SIDEKICK_PROJECTILES[def.pattern] ?? 1;
  return {
    name: def.name, power: 1, volley: def.damage * n, rate: def.fireRate, dps: def.damage * n * def.fireRate, energy: 0, projectiles: n,
  };
}

export interface EnergyBalance {
  output: number;
  capacity: number;
  front: number;
  rear: number;
  shield: number;
  /** output - (front + rear + shield). Negative: the guns will skip volleys under fire. */
  net: number;
  /** Seconds of full fire the buffer covers when net < 0 (Infinity when sustainable). */
  sustain: number;
}

/** Generator output vs. the drain of both guns firing and the shield regenerating. */
export function energyBalance(l: Loadout): EnergyBalance {
  const gen = findGenerator(l.generator);
  const sh = findShield(l.shield);
  const fw = findWeapon(l.front);
  const rw = findWeapon(l.rear);
  const output = gen?.output ?? 0;
  const capacity = gen?.capacity ?? 0;
  const front = fw ? weaponStats(fw, l.frontPower).energy : 0;
  const rear = rw ? weaponStats(rw, l.rearPower).energy : 0;
  const shield = sh ? sh.regen * sh.energyPerPoint : 0;
  const net = output - front - rear - shield;
  return { output, capacity, front, rear, shield, net, sustain: net < 0 ? capacity / -net : Infinity };
}

/** Sum of the nominal DPS of every gun of a loadout. */
export function totalDps(l: Loadout): number {
  let d = 0;
  const fw = findWeapon(l.front);
  if (fw) d += weaponStats(fw, l.frontPower).dps;
  const rw = findWeapon(l.rear);
  if (rw) d += weaponStats(rw, l.rearPower).dps;
  for (const id of [l.sidekickL, l.sidekickR]) {
    const sk = findSidekick(id);
    if (sk) d += sidekickStats(sk).dps;
  }
  return d;
}

/** Armor + shield capacity (effective hit points). */
export function toughness(l: Loadout): number {
  return (findHull(l.hull)?.armor ?? 0) + (findShield(l.shield)?.capacity ?? 0);
}
