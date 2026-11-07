// Sidekick drones (left / right mounts). Ids are the SIDEKICK_SPRITES keys. Sidekicks draw
// no generator energy. fireRate = volleys per second (charge: 1 / charge time).
import type { SidekickDef } from '../types';

export const SIDEKICKS: SidekickDef[] = [
  {
    id: 'sk_pod', name: 'Escort Pod', pattern: 'pod', cost: 1200, damage: 4, fireRate: 3,
    projectile: 'pj_bolt', color: 'cyan',
    desc: 'Loyal little gun pod. Fires straight ahead alongside your main gun.',
  },
  {
    id: 'sk_twin', name: 'Twinfang Drone', pattern: 'twin', cost: 3500, damage: 4, fireRate: 3,
    projectile: 'pj_needle', color: 'green',
    desc: 'Fires two needles angled outward, catching flankers early.',
    unlockLevel: 'kessra-1',
  },
  {
    id: 'sk_orbiter', name: 'Satellite Ward', pattern: 'orbiter', cost: 7000, damage: 10, fireRate: 4,
    projectile: 'pj_orb', color: 'blue',
    desc: 'Circles your hull, eating enemy bullets and grinding anything it touches.',
    unlockLevel: 'kessra-3',
  },
  {
    id: 'sk_rocket', name: 'Skyhook Rockets', pattern: 'rocket', cost: 12000, damage: 30, fireRate: 1.2,
    projectile: 'pj_missile', color: 'orange',
    desc: 'Launches a homing rocket at the nearest threat every 0.8 s.',
    unlockLevel: 'verdance-2',
  },
  {
    id: 'sk_shard', name: 'Shardcaster', pattern: 'shard', cost: 20000, damage: 9, fireRate: 2.2,
    projectile: 'pj_shard', color: 'violet',
    desc: 'Casts piercing crystal shards in a tight three-way fan.',
    unlockLevel: 'thalassa-1',
  },
  {
    id: 'sk_charge', name: 'Stormcharge Pod', pattern: 'charge', cost: 32000, damage: 160, fireRate: 0.4,
    projectile: 'pj_beam', color: 'white',
    desc: 'Builds a charge for 2.5 s, then unleashes a devastating piercing beam.',
    unlockLevel: 'umbra-1',
  },
];

/** Volleys of a sidekick pattern -> projectiles per volley assumed by the balance model. */
export const SIDEKICK_PROJECTILES: Record<string, number> = {
  pod: 1, twin: 2, orbiter: 1, rocket: 1, shard: 3, charge: 1,
};
