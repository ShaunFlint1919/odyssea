// Front and rear weapons. Exactly one front weapon per FrontPattern and one rear weapon per
// RearPattern. damage / fireRate / energyPerShot are the power-1 values; the gameplay
// weapon system scales them with power (more projectiles, cadence, damage).
// Balance reasoning and the DPS / energy tables: docs/BALANCE.md "Weapons".
import type { FrontPattern, RearPattern, WeaponDef } from '../types';

export const FRONT_WEAPONS: WeaponDef[] = [
  {
    id: 'pulse_blaster', name: 'Kestrel Coilgun', slot: 'front', pattern: 'pulse', cost: 500, upgradeBase: 300,
    damage: 5, fireRate: 5, energyPerShot: 2, projectile: 'pj_bolt', color: 'cyan', sfx: 'shot_pulse',
    desc: 'Reliable coil bolts. Upgrades add parallel streams and a faster cadence.',
  },
  {
    id: 'scatter_fan', name: 'Fanfire Scatter', slot: 'front', pattern: 'scatter', cost: 1500, upgradeBase: 750,
    damage: 4, fireRate: 3, energyPerShot: 4, projectile: 'pj_orb', color: 'orange', sfx: 'shot_scatter',
    desc: 'Fans out plasma pellets. Shreds swarms; widens to an eleven-shot wall.',
  },
  {
    id: 'gatling_rattler', name: 'Rattler Gatling', slot: 'front', pattern: 'gatling', cost: 3500, upgradeBase: 1500,
    damage: 4, fireRate: 12, energyPerShot: 1.3, projectile: 'pj_needle', color: 'yellow', sfx: 'shot_gatling',
    desc: 'Spinning barrels spit a dense needle stream. Melts anything in front of you.',
    unlockLevel: 'kessra-1',
  },
  {
    id: 'helix_serpent', name: 'Serpent Helix', slot: 'front', pattern: 'helix', cost: 6000, upgradeBase: 2400,
    damage: 6, fireRate: 5, energyPerShot: 3.2, projectile: 'pj_wave', color: 'green', sfx: 'shot_wave',
    desc: 'Twin waves braid around your line of fire, sweeping a wide lane.',
    unlockLevel: 'kessra-2',
  },
  {
    id: 'seeker_kite', name: 'Kitehawk Seekers', slot: 'front', pattern: 'seeker', cost: 9500, upgradeBase: 3600,
    damage: 16, fireRate: 2.5, energyPerShot: 7, projectile: 'pj_missile', color: 'pink', sfx: 'shot_missile',
    desc: 'Micro-missiles that pick their own targets. Never waste a shot.',
    unlockLevel: 'kessra-3',
  },
  {
    id: 'lance_star', name: 'Starpiercer Lance', slot: 'front', pattern: 'lance', cost: 14000, upgradeBase: 4900,
    damage: 40, fireRate: 2.5, energyPerShot: 8, projectile: 'pj_beam', color: 'blue', sfx: 'shot_laser',
    desc: 'Piercing beam bursts that punch through whole formations and armor.',
    unlockLevel: 'verdance-2',
  },
  {
    id: 'prism_shatter', name: 'Shatterprism', slot: 'front', pattern: 'prism', cost: 20000, upgradeBase: 6400,
    damage: 32, fireRate: 3.6, energyPerShot: 6, projectile: 'pj_shard', color: 'white', sfx: 'shot_laser',
    desc: 'Crystal bolts that burst into a shower of shards a moment after firing.',
    unlockLevel: 'thalassa-1',
  },
  {
    id: 'mortar_thunder', name: 'Thunderhead Mortar', slot: 'front', pattern: 'mortar', cost: 30000, upgradeBase: 9000,
    damage: 88, fireRate: 1.6, energyPerShot: 15, projectile: 'pj_bigorb', color: 'red', sfx: 'shot_heavy',
    desc: 'Slow plasma shells with a blast radius. Flatten bunkers and crowds alike.',
    unlockLevel: 'thalassa-3',
  },
];

export const REAR_WEAPONS: WeaponDef[] = [
  {
    id: 'tail_stinger', name: 'Tailstinger', slot: 'rear', pattern: 'tail', cost: 1000, upgradeBase: 450,
    damage: 4, fireRate: 4, energyPerShot: 1, projectile: 'pj_bolt', color: 'violet', sfx: 'shot_rear',
    desc: 'A: bolts straight back. B: twin bolts angled forward at 45 degrees.',
  },
  {
    id: 'flame_torch', name: 'Afterburn Torch', slot: 'rear', pattern: 'flame', cost: 3000, upgradeBase: 1200,
    damage: 2, fireRate: 10, energyPerShot: 0.7, projectile: 'pj_flame', color: 'orange', sfx: 'shot_rear',
    desc: 'A: a cone of flame behind you. B: flames licking out of both flanks.',
    unlockLevel: 'kessra-2',
  },
  {
    id: 'mine_caltrop', name: 'Caltrop Dropper', slot: 'rear', pattern: 'mines', cost: 6000, upgradeBase: 2200,
    damage: 30, fireRate: 1.2, energyPerShot: 4, projectile: 'pj_mine', color: 'yellow', sfx: 'shot_rear',
    desc: 'A: drops proximity mines in your wake. B: lobs them out to the sides.',
    unlockLevel: 'verdance-1',
  },
  {
    id: 'arc_backlash', name: 'Backlash Arc', slot: 'rear', pattern: 'arc', cost: 10000, upgradeBase: 3500,
    damage: 6, fireRate: 3, energyPerShot: 2, projectile: 'pj_ring', color: 'cyan', sfx: 'shot_rear',
    desc: 'A: a wide arc of rings to the rear. B: arcs sweeping both flanks.',
    unlockLevel: 'verdance-3',
  },
  {
    id: 'seeker_rearguard', name: 'Rearguard Hunters', slot: 'rear', pattern: 'seekers', cost: 16000, upgradeBase: 5000,
    damage: 14, fireRate: 2, energyPerShot: 4, projectile: 'pj_missile', color: 'pink', sfx: 'shot_missile',
    desc: 'A: homing missiles hunting behind you. B: hunters launched sideways.',
    unlockLevel: 'thalassa-2',
  },
];

/** Front + rear weapons (front first, each list in shop / price order). */
export const WEAPONS: WeaponDef[] = [...FRONT_WEAPONS, ...REAR_WEAPONS];

/**
 * Projectiles per volley at power 1 assumed by the balance model (docs/BALANCE.md): the
 * nominal DPS of a weapon is damage x fireRate x this value.
 */
export const PROJECTILES_AT_P1: Record<FrontPattern | RearPattern, number> = {
  pulse: 1, scatter: 3, gatling: 1, lance: 1, seeker: 2, helix: 2, mortar: 1, prism: 1,
  tail: 1, flame: 1, mines: 1, arc: 3, seekers: 2,
};

/** Nominal power-1 DPS of a weapon (every projectile hitting). */
export function nominalDps(w: WeaponDef): number {
  return w.damage * w.fireRate * (PROJECTILES_AT_P1[w.pattern] ?? 1);
}

/** Power multiplier assumed by the balance model: x(1 + 0.45 (p - 1)). */
export function powerFactor(power: number): number {
  return 1 + 0.45 * (Math.max(1, power) - 1);
}
