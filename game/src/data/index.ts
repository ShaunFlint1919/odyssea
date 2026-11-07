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
import { REPLAY_BONUS_FACTOR, clearBonus, levelStats, type LevelStats } from './balance';
import { POWER_COLLECT, REAR_ON_TARGET, dpsAtPower, sidekickDps, simulateProgression, targetDps, type ProgressionStep } from './progression';

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
/** Credits a player can expect from a level's kills (70 % of the wave enemies + mid-boss + boss). */
export function estimateLevelCredits(levelId: string): number {
  return getLevelStats(levelId).estCredits;
}

/**
 * Level-clear bonus credited when a level is COMPLETED (on top of the kill credits): a share
 * of the level's credit target, bigger on boss levels (docs/BALANCE.md §3). Pass
 * `replay = true` for a level that was already completed before: farming pays
 * REPLAY_BONUS_FACTOR of the bonus. Unknown level ids pay 0.
 */
export function levelClearBonus(levelId: string, bossDefeated: boolean, replay = false): number {
  const i = levelOrder().indexOf(levelId);
  if (i < 0) return 0;
  const bossLevel = bossDefeated && !!getLevel(levelId).boss;
  const full = clearBonus(i, bossLevel, levelOrder().length);
  return replay ? Math.round((full * REPLAY_BONUS_FACTOR) / 10) * 10 : full;
}

/** Expected credits of a first clear: kill credits + clear bonus. */
export function estimateLevelIncome(levelId: string): number {
  return estimateLevelCredits(levelId) + levelClearBonus(levelId, !!getLevel(levelId).boss);
}

let progression: ProgressionStep[] | null = null;
/** The reference player's campaign (src/data/progression.ts), one step per level, cached. */
export function referenceProgression(): ProgressionStep[] {
  if (!progression) {
    progression = simulateProgression({
      hulls: HULLS, shields: SHIELDS, generators: GENERATORS, front: FRONT_WEAPONS, rear: REAR_WEAPONS, sidekicks: SIDEKICKS,
      levels: levelOrder().map((id) => getLevel(id)),
      startCredits: START_CREDITS,
      startLoadout: START_LOADOUT,
      income: (l) => estimateLevelIncome(l.id),
      bossHp: (l) => (l.boss ? getBoss(l.boss).hp : 0),
      midbossHp: (l) => (l.midboss ? getEnemy(l.midboss.enemy).hp : 0),
      powerDrops: (l, t) => expectedPowerDrops(l.id, t),
    });
  }
  return progression;
}
/**
 * Expected number of 'power' pickups dropped by a level's wave enemies that spawn before
 * level time `t` (every unit destroyed; the mid-boss drops are not counted).
 */
export function expectedPowerDrops(levelId: string, t: number = Infinity): number {
  let n = 0;
  for (const w of getLevel(levelId).waves) {
    if (w.t >= t) continue;
    const drops = ENEMIES.find((e) => e.id === w.enemy)?.drops ?? [];
    const chance = drops.reduce((sum, d) => sum + (d.kind === 'power' ? d.chance : 0), 0);
    n += chance * w.count * (w.mirror ? 2 : 1);
  }
  return n;
}

/**
 * Nominal DPS a loadout brings to the planet boss ('boss') or the mid-boss ('midboss') fight
 * of a level: front gun at its power + POWER_COLLECT x the power drops before the fight (x its
 * single-target share), the sidekicks, and REAR_ON_TARGET x the rear gun. Fight length =
 * hp / (this x uptime).
 */
export function fightDps(loadout: Loadout, levelId: string, fight: 'boss' | 'midboss' = 'boss'): number {
  const l = getLevel(levelId);
  const until = fight === 'midboss' && l.midboss ? l.midboss.t : l.duration;
  const power = loadout.frontPower + POWER_COLLECT * expectedPowerDrops(levelId, until);
  const front = targetDps(getWeapon(loadout.front), power);
  const side = [loadout.sidekickL, loadout.sidekickR].reduce((sum, id) => sum + (id ? sidekickDps(getSidekick(id)) : 0), 0);
  const rear = loadout.rear ? REAR_ON_TARGET * dpsAtPower(getWeapon(loadout.rear), loadout.rearPower) : 0;
  return front + side + rear;
}

/** The reference player's loadout when it starts `levelId` (START_LOADOUT for unknown ids). */
export function referenceLoadout(levelId: string): Loadout {
  const step = referenceProgression().find((s) => s.levelId === levelId);
  return step ? { ...step.loadout } : { ...START_LOADOUT };
}

/** Cross-reference validation of all content. Returns a list of human-readable errors. */
export function validateContent(): string[] {
  return validateBundle({
    hulls: HULLS, shields: SHIELDS, generators: GENERATORS, weapons: WEAPONS, sidekicks: SIDEKICKS,
    enemies: ENEMIES, bosses: BOSSES, planets: PLANETS, levels: LEVELS, intel: INTEL,
    startLoadout: START_LOADOUT, startCredits: START_CREDITS,
  });
}

/**
 * Reference boss-fight DPS per planet (campaign order): the reference player's nominal DPS
 * (front with its in-level power pickups + sidekicks + a share of the rear gun) when it
 * meets each planet boss. Fight length = boss hp / (REFERENCE_DPS x DPS_UPTIME).
 */
export const REFERENCE_DPS: number[] = PLANETS.map((p) => {
  const id = p.levels[p.levels.length - 1];
  const step = referenceProgression().find((s) => s.levelId === id);
  return step ? Math.round(step.fightDps * 10) / 10 : 0;
});

export type { LevelStats } from './balance';
export type { ProgressionStep } from './progression';
export {
  BOSS_UPTIME, CLEAR_BONUS, CREDIT_CURVE, DPS_UPTIME, HUMAN_AIM, KILL_RATE, MIDBOSS_UPTIME, REPLAY_BONUS_FACTOR, energyFactor,
  targetLevelCredits,
} from './balance';
export { POWER_COLLECT, REAR_ON_TARGET, dpsAtPower, sidekickDps, singleTargetShare, targetDps, weaponValue } from './progression';
export { BIOME_PALETTES, BIOME_BULLET_COLORS, LAND_BIOMES, PLANET_PALETTES, SEA_BIOMES } from './helpers';
export { ENEMY_MUZZLES, type SpriteMuzzles } from './muzzles';
export { nominalDps, powerFactor, PROJECTILES_AT_P1 } from './weapons';
