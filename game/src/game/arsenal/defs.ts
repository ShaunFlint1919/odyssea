// =====================================================================================
//  ARSENAL DEFS — catalogue lookups for the loadout ids (src/data). Unknown ids are
//  reported once (console.warn) instead of throwing mid-level; a missing front weapon
//  falls back to a basic pulse gun so the ship can always shoot.
// =====================================================================================
import type { SidekickDef, WeaponDef } from '../../types';
import { SIDEKICKS, WEAPONS } from '../../data';

const warned = new Set<string>();

function warnOnce(what: string, id: string): void {
  const k = `${what}:${id}`;
  if (warned.has(k)) return;
  warned.add(k);
  console.warn(`[arsenal] unknown ${what} id "${id}"`);
}

/** Basic pulse gun used when the loadout's front weapon id is unknown. */
export const FALLBACK_FRONT: WeaponDef = {
  id: 'pulse_blaster', name: 'Pulse', slot: 'front', pattern: 'pulse', cost: 0, upgradeBase: 0,
  damage: 5, fireRate: 5, energyPerShot: 2, projectile: 'pj_bolt', color: 'cyan', sfx: 'shot_pulse', desc: '',
};

/** WeaponDef by id (null for null / unknown ids). */
export function findWeapon(id: string | null | undefined): WeaponDef | null {
  if (!id) return null;
  for (let i = 0; i < WEAPONS.length; i++) if (WEAPONS[i].id === id) return WEAPONS[i];
  warnOnce('weapon', id);
  return null;
}

/** SidekickDef by id (null for null / unknown ids). */
export function findSidekick(id: string | null | undefined): SidekickDef | null {
  if (!id) return null;
  for (let i = 0; i < SIDEKICKS.length; i++) if (SIDEKICKS[i].id === id) return SIDEKICKS[i];
  warnOnce('sidekick', id);
  return null;
}
