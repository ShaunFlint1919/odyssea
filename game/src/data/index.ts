// STUB — to be implemented by the content module owner (see docs/ARCHITECTURE.md).
import type {
  BossDef, EnemyDef, GeneratorDef, HullDef, IntelDef, LevelDef, Loadout, PlanetDef, ShieldDef, SidekickDef, WeaponDef,
} from '../types';

export const HULLS: HullDef[] = [];
export const SHIELDS: ShieldDef[] = [];
export const GENERATORS: GeneratorDef[] = [];
export const WEAPONS: WeaponDef[] = [];      // front + rear weapons
export const SIDEKICKS: SidekickDef[] = [];
export const ENEMIES: EnemyDef[] = [];
export const BOSSES: BossDef[] = [];
export const PLANETS: PlanetDef[] = [];
export const LEVELS: LevelDef[] = [];
export const INTEL: IntelDef[] = [];

export const START_CREDITS = 1500;
export const START_LOADOUT: Loadout = {
  hull: 'sparrow', front: 'pulse_blaster', frontPower: 1, rear: null, rearPower: 1,
  shield: 'sh_veil', generator: 'gen_cell', sidekickL: null, sidekickR: null,
};

function finder<T extends { id: string }>(list: T[], what: string) {
  return (id: string): T => {
    const found = list.find((x) => x.id === id);
    if (!found) throw new Error(`Unknown ${what} id "${id}"`);
    return found;
  };
}
export const getHull = finder(HULLS, 'hull');
export const getShield = finder(SHIELDS, 'shield');
export const getGenerator = finder(GENERATORS, 'generator');
export const getWeapon = finder(WEAPONS, 'weapon');
export const getSidekick = finder(SIDEKICKS, 'sidekick');
export const getEnemy = finder(ENEMIES, 'enemy');
export const getBoss = finder(BOSSES, 'boss');
export const getPlanet = finder(PLANETS, 'planet');
export const getLevel = finder(LEVELS, 'level');
export const getIntel = finder(INTEL, 'intel');

/** All level ids in campaign order. */
export function levelOrder(): string[] {
  return PLANETS.flatMap((p) => p.levels);
}
/** Next level in campaign order, or null after the final level. */
export function nextLevelId(id: string): string | null {
  const order = levelOrder();
  const i = order.indexOf(id);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
/** Cross-reference validation of all content. Returns a list of human-readable errors. */
export function validateContent(): string[] {
  return [];
}
