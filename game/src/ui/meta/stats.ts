// =====================================================================================
//  META SCREENS — loadout statistics for the Specs screen, the hangar summary and the shop
//  comparisons. Front / rear weapon numbers come from the arsenal's single source of truth
//  (weaponFireStats in src/game/arsenal/scaling.ts); sidekick volleys use the content balance
//  table (src/data/sidekicks.ts). Values are nominal (every projectile hitting).
// =====================================================================================
import type { Loadout, SidekickDef, WeaponDef } from '../../types';
import { weaponFireStats } from '../../game/arsenal/scaling';
import { SIDEKICK_PROJECTILES } from '../../data/sidekicks';
import { findGenerator, findHull, findShield, findSidekick, findWeapon } from './common';

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
}

/** Stats of a front / rear weapon at a power level (exactly as the arsenal fires it). */
export function weaponStats(def: WeaponDef, power: number): GunStats {
  const s = weaponFireStats(def, power);
  return {
    name: def.name,
    power: s.power,
    volley: s.volleysPerSec > 0 ? s.dps / s.volleysPerSec : 0,
    rate: s.volleysPerSec,
    dps: s.dps,
    energy: s.energyPerSec,
  };
}

/** Stats of a sidekick (sidekicks draw no generator energy). */
export function sidekickStats(def: SidekickDef): GunStats {
  const n = SIDEKICK_PROJECTILES[def.pattern] ?? 1;
  return { name: def.name, power: 1, volley: def.damage * n, rate: def.fireRate, dps: def.damage * n * def.fireRate, energy: 0 };
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
