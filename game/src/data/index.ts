// =====================================================================================
//  CONTENT — public entry point of every game catalogue (ship parts, bestiary, bosses,
//  campaign, lore) plus lookups and the content validator. Catalogues live in their own
//  files under src/data/; balance reasoning in docs/BALANCE.md.
// =====================================================================================
import type {
  BossDef, EnemyDef, GeneratorDef, HullDef, IntelDef, LevelDef, Loadout, PlanetDef, ShieldDef, SidekickDef, WeaponDef,
} from '../types';
import { HULLS as HULL_LIST } from './hulls';
import { SHIELDS as SHIELD_LIST } from './shields';
import { GENERATORS as GENERATOR_LIST } from './generators';
import { FRONT_WEAPONS as FRONT_LIST, REAR_WEAPONS as REAR_LIST, WEAPONS as WEAPON_LIST } from './weapons';
import { SIDEKICKS as SIDEKICK_LIST } from './sidekicks';
import { ENEMIES as ENEMY_LIST } from './enemies';
import { BOSSES as BOSS_LIST } from './bosses';
import { PLANETS as PLANET_LIST } from './planets';
import { LEVELS as LEVEL_LIST } from './levels';
import { INTEL as INTEL_LIST } from './intel';
import { validateBundle } from './validate';
import { levelStats, type LevelStats } from './balance';

export const HULLS: HullDef[] = HULL_LIST;
export const SHIELDS: ShieldDef[] = SHIELD_LIST;
export const GENERATORS: GeneratorDef[] = GENERATOR_LIST;
export const WEAPONS: WeaponDef[] = WEAPON_LIST;      // front + rear weapons
export const SIDEKICKS: SidekickDef[] = SIDEKICK_LIST;
export const ENEMIES: EnemyDef[] = ENEMY_LIST;
export const BOSSES: BossDef[] = BOSS_LIST;
export const PLANETS: PlanetDef[] = PLANET_LIST;
export const LEVELS: LevelDef[] = LEVEL_LIST;
export const INTEL: IntelDef[] = INTEL_LIST;

/** Front weapons only, in shop / price order. */
export const FRONT_WEAPONS: WeaponDef[] = FRONT_LIST;
/** Rear weapons only, in shop / price order. */
export const REAR_WEAPONS: WeaponDef[] = REAR_LIST;

export const START_CREDITS = 1500;
export const START_LOADOUT: Loadout = {
  hull: 'sparrow', front: 'pulse_blaster', frontPower: 1, rear: null, rearPower: 1,
  shield: 'sh_veil', generator: 'gen_cell', sidekickL: null, sidekickR: null,
};

/** Id lookup backed by a Map built on first use. Throws on an unknown id. */
function finder<T extends { id: string }>(list: T[], what: string) {
  let map: Map<string, T> | null = null;
  return (id: string): T => {
    if (!map) map = new Map(list.map((x) => [x.id, x]));
    const found = map.get(id);
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

/** Non-throwing level lookup (e.g. for ids read from a save or a URL). */
export function findLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

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
/** The planet a level belongs to. Throws on an unknown level id. */
export function planetOfLevel(levelId: string): PlanetDef {
  return getPlanet(getLevel(levelId).planet);
}
/** The three LevelDefs of a planet, in order. */
export function levelsOfPlanet(planetId: string): LevelDef[] {
  return getPlanet(planetId).levels.map((id) => getLevel(id));
}

/** Pacing and economy statistics of a level (see src/data/balance.ts). */
export function getLevelStats(levelId: string): LevelStats {
  const tryEnemy = (id: string) => ENEMIES.find((e) => e.id === id);
  const tryBoss = (id: string) => BOSSES.find((b) => b.id === id);
  return levelStats(getLevel(levelId), tryEnemy, tryBoss);
}
/** Credits a player can expect from a level (70 % of the wave enemies + mid-boss + boss). */
export function estimateLevelCredits(levelId: string): number {
  return getLevelStats(levelId).estCredits;
}

/** Cross-reference validation of all content. Returns a list of human-readable errors. */
export function validateContent(): string[] {
  return validateBundle({
    hulls: HULLS, shields: SHIELDS, generators: GENERATORS, weapons: WEAPONS, sidekicks: SIDEKICKS,
    enemies: ENEMIES, bosses: BOSSES, planets: PLANETS, levels: LEVELS, intel: INTEL,
    startLoadout: START_LOADOUT, startCredits: START_CREDITS,
  });
}

export type { LevelStats } from './balance';
export { KILL_RATE, REFERENCE_DPS, targetLevelCredits } from './balance';
export { BIOME_PALETTES, BIOME_BULLET_COLORS, LAND_BIOMES, PLANET_PALETTES, SEA_BIOMES } from './helpers';
export { ENEMY_MUZZLES, type SpriteMuzzles } from './muzzles';
export { nominalDps, powerFactor, PROJECTILES_AT_P1 } from './weapons';
