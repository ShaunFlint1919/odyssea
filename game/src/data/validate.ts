// =====================================================================================
//  CONTENT VALIDATION — cross-reference and design-rule checks over a content bundle.
//  Pure function of its input (tests feed it mutated copies to prove every rule fires).
//  Each error is one human-readable line: "<area> <id>: <problem>".
// =====================================================================================
import type {
  BossAttack, BossDef, EnemyDef, GeneratorDef, HullDef, IntelDef, LevelDef, Loadout, PlanetDef, ShieldDef,
  SidekickDef, WaveDef, WeaponDef,
} from '../types';
import { BIOMES, PALETTE_NAMES, SHOT_COLORS } from '../types';
import {
  BOSS_PART_SPRITES, BOSS_SPRITES, ENEMY_BULLET_SPRITES, ENEMY_SPRITES, HULL_SPRITES, PROJECTILE_SPRITES, SIDEKICK_SPRITES,
} from '../art/keys';
import { ENEMY_BULLET_DAMAGE, MAX_POWER, PLAY_W } from '../config';
import {
  BIOME_BULLET_COLORS, BIOME_PALETTES, BOSS_MOVES, CAMPAIGN, FIRE_PATTERNS, FORMATIONS, FRONT_PATTERNS, LAND_BIOMES,
  MIDBOSS_SPRITES, MOVE_PATTERNS, NAME_MAX, PICKUP_KINDS, PLANET_PALETTES, REAR_PATTERNS, SEA_BIOMES, SFX_KEYS,
  SIDEKICK_PATTERNS, SURFACE_MOVES,
} from './helpers';
import { lastSpawnTime } from './waves';

export interface ContentBundle {
  hulls: HullDef[];
  shields: ShieldDef[];
  generators: GeneratorDef[];
  weapons: WeaponDef[];
  sidekicks: SidekickDef[];
  enemies: EnemyDef[];
  bosses: BossDef[];
  planets: PlanetDef[];
  levels: LevelDef[];
  intel: IntelDef[];
  startLoadout: Loadout;
  startCredits: number;
}

/** Design limits enforced by the validator (documented in docs/BALANCE.md). */
export const RULES = {
  maxWaveCount: 16,
  firstWaveMaxT: 3,
  avgGapMax: 4,
  maxGap: 6,
  tailMax: 8,
  midbossWindow: [0.45, 0.75] as [number, number],
  midbossHp: [1500, 4000] as [number, number],
  durationRange: [60, 130] as [number, number],
  scrollRange: [40, 80] as [number, number],
  briefingMax: 120,
  descMax: 110,
  intelBodyMax: 400,
  intelMinFindChance: 0.9,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const has = <T extends object>(obj: T, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/** Validate a whole content bundle. Returns every problem found (empty = valid). */
export function validateBundle(c: ContentBundle): string[] {
  const errors: string[] = [];
  const err = (area: string, id: string, msg: string) => errors.push(`${area} ${id}: ${msg}`);

  const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
  const enemies = byId(c.enemies);
  const bosses = byId(c.bosses);
  const levels = byId(c.levels);
  const planets = byId(c.planets);
  const intel = byId(c.intel);
  const levelIds = new Set(c.levels.map((l) => l.id));

  // ---------------------------------------------------------------- ids & names
  const uniq = (area: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (!x.id || typeof x.id !== 'string') err(area, String(x.id), 'missing id');
      else if (seen.has(x.id)) err(area, x.id, 'duplicate id');
      seen.add(x.id);
    }
  };
  uniq('hull', c.hulls); uniq('shield', c.shields); uniq('generator', c.generators); uniq('weapon', c.weapons);
  uniq('sidekick', c.sidekicks); uniq('enemy', c.enemies); uniq('boss', c.bosses); uniq('planet', c.planets);
  uniq('level', c.levels); uniq('intel', c.intel);
  uniq('shop item (global)', [...c.hulls, ...c.shields, ...c.generators, ...c.weapons, ...c.sidekicks]);
  uniq('enemy/boss (global)', [...c.enemies, ...c.bosses]);

  const name = (area: string, id: string, n: string, max = NAME_MAX) => {
    if (!n || typeof n !== 'string' || !n.trim()) err(area, id, 'empty name');
    else if (n.length > max) err(area, id, `name "${n}" longer than ${max} chars`);
  };
  const desc = (area: string, id: string, d: string, max = RULES.descMax) => {
    if (!d || !d.trim()) err(area, id, 'empty description');
    else if (d.length > max) err(area, id, `description longer than ${max} chars (${d.length})`);
  };
  const unlock = (area: string, id: string, u?: string) => {
    if (u !== undefined && !levelIds.has(u)) err(area, id, `unlockLevel "${u}" is not a level`);
  };
  const priceOrder = (area: string, list: { id: string; cost: number }[]) => {
    for (let i = 1; i < list.length; i++) {
      if (!(list[i].cost > list[i - 1].cost)) err(area, list[i].id, 'cost must increase along the shop list');
    }
  };

  // ---------------------------------------------------------------- hulls
  const hullIds = c.hulls.map((h) => h.id);
  for (const s of HULL_SPRITES) if (!hullIds.includes(s)) err('hull', s, 'HULL_SPRITES entry without a HullDef');
  for (const h of c.hulls) {
    if (!(HULL_SPRITES as readonly string[]).includes(h.id)) err('hull', h.id, 'id is not a HULL_SPRITES key');
    name('hull', h.id, h.name); desc('hull', h.id, h.desc); unlock('hull', h.id, h.unlockLevel);
    if (!isNum(h.cost) || h.cost < 0 || h.cost > 90000) err('hull', h.id, 'cost outside 0..90000');
    if (!isNum(h.armor) || h.armor < 16 || h.armor > 60) err('hull', h.id, 'armor outside 16..60');
    if (!isNum(h.speed) || h.speed < 120 || h.speed > 200) err('hull', h.id, 'speed outside 120..200');
    if (!isNum(h.hitRadius) || h.hitRadius < 3 || h.hitRadius > 6) err('hull', h.id, 'hitRadius outside 3..6');
    if (![0, 1, 2].includes(h.sidekickSlots)) err('hull', h.id, 'sidekickSlots must be 0, 1 or 2');
  }
  priceOrder('hull', c.hulls);

  // ---------------------------------------------------------------- shields / generators
  if (c.shields[0]?.id !== 'sh_veil') err('shield', String(c.shields[0]?.id), "first shield must be 'sh_veil'");
  if (c.shields.length < 5) err('shield', '*', 'need at least 5 shields');
  for (const s of c.shields) {
    name('shield', s.id, s.name); desc('shield', s.id, s.desc); unlock('shield', s.id, s.unlockLevel);
    if (!isNum(s.cost) || s.cost < 1000 || s.cost > 60000) err('shield', s.id, 'cost outside 1000..60000');
    if (!(s.capacity > 0) || !(s.regen > 0) || !(s.energyPerPoint > 0)) err('shield', s.id, 'capacity / regen / energyPerPoint must be > 0');
    if (!SHOT_COLORS.includes(s.color)) err('shield', s.id, `unknown colour ${s.color}`);
  }
  priceOrder('shield', c.shields);
  if (c.generators[0]?.id !== 'gen_cell') err('generator', String(c.generators[0]?.id), "first generator must be 'gen_cell'");
  if (c.generators.length < 5) err('generator', '*', 'need at least 5 generators');
  for (const g of c.generators) {
    name('generator', g.id, g.name); desc('generator', g.id, g.desc); unlock('generator', g.id, g.unlockLevel);
    if (!isNum(g.cost) || g.cost < 1000 || g.cost > 60000) err('generator', g.id, 'cost outside 1000..60000');
    if (!(g.capacity > 0) || !(g.output > 0)) err('generator', g.id, 'capacity / output must be > 0');
  }
  priceOrder('generator', c.generators);

  // ---------------------------------------------------------------- weapons
  const front = c.weapons.filter((w) => w.slot === 'front');
  const rear = c.weapons.filter((w) => w.slot === 'rear');
  if (front[0]?.id !== 'pulse_blaster' || front[0]?.pattern !== 'pulse') err('weapon', String(front[0]?.id), "first front weapon must be 'pulse_blaster' (pulse)");
  for (const p of FRONT_PATTERNS) {
    const n = front.filter((w) => w.pattern === p).length;
    if (n !== 1) err('weapon', p, `exactly one front weapon per pattern expected, found ${n}`);
  }
  for (const p of REAR_PATTERNS) {
    const n = rear.filter((w) => w.pattern === p).length;
    if (n !== 1) err('weapon', p, `exactly one rear weapon per pattern expected, found ${n}`);
  }
  for (const w of c.weapons) {
    name('weapon', w.id, w.name); desc('weapon', w.id, w.desc); unlock('weapon', w.id, w.unlockLevel);
    if (w.slot !== 'front' && w.slot !== 'rear') err('weapon', w.id, `bad slot ${w.slot}`);
    const okPattern = w.slot === 'front' ? (FRONT_PATTERNS as string[]).includes(w.pattern) : (REAR_PATTERNS as string[]).includes(w.pattern);
    if (!okPattern) err('weapon', w.id, `pattern ${w.pattern} does not fit slot ${w.slot}`);
    if (!has(PROJECTILE_SPRITES, w.projectile)) err('weapon', w.id, `unknown projectile sprite ${w.projectile}`);
    if (!SHOT_COLORS.includes(w.color)) err('weapon', w.id, `unknown colour ${w.color}`);
    if (!SFX_KEYS.includes(w.sfx)) err('weapon', w.id, `unknown sfx ${w.sfx}`);
    if (!(w.damage > 0) || !(w.fireRate > 0) || !(w.energyPerShot >= 0)) err('weapon', w.id, 'damage / fireRate must be > 0, energyPerShot >= 0');
    if (!(w.cost > 0) || !(w.upgradeBase > 0)) err('weapon', w.id, 'cost / upgradeBase must be > 0');
    const ratio = w.upgradeBase / w.cost;
    if (ratio < 0.25 || ratio > 0.65) err('weapon', w.id, `upgradeBase / cost = ${ratio.toFixed(2)} outside 0.25..0.65`);
    if (w.slot === 'front' && (w.cost < 500 || w.cost > 30000)) err('weapon', w.id, 'front weapon cost outside 500..30000');
  }
  for (const list of [front, rear]) {
    const colours = new Set<string>();
    for (const w of list) {
      if (colours.has(w.color)) err('weapon', w.id, `colour ${w.color} already used by another ${w.slot} weapon`);
      colours.add(w.color);
    }
  }
  priceOrder('front weapon', front);
  priceOrder('rear weapon', rear);

  // ---------------------------------------------------------------- sidekicks
  const skIds = c.sidekicks.map((s) => s.id);
  for (const s of SIDEKICK_SPRITES) if (!skIds.includes(s)) err('sidekick', s, 'SIDEKICK_SPRITES entry without a SidekickDef');
  for (const s of c.sidekicks) {
    if (!(SIDEKICK_SPRITES as readonly string[]).includes(s.id)) err('sidekick', s.id, 'id is not a SIDEKICK_SPRITES key');
    else if (s.id !== `sk_${s.pattern}`) err('sidekick', s.id, `pattern ${s.pattern} does not match its sprite`);
    if (!SIDEKICK_PATTERNS.includes(s.pattern)) err('sidekick', s.id, `unknown pattern ${s.pattern}`);
    name('sidekick', s.id, s.name); desc('sidekick', s.id, s.desc); unlock('sidekick', s.id, s.unlockLevel);
    if (!has(PROJECTILE_SPRITES, s.projectile)) err('sidekick', s.id, `unknown projectile sprite ${s.projectile}`);
    if (!SHOT_COLORS.includes(s.color)) err('sidekick', s.id, `unknown colour ${s.color}`);
    if (!(s.damage > 0) || !(s.fireRate > 0) || !(s.cost > 0)) err('sidekick', s.id, 'damage / fireRate / cost must be > 0');
  }
  priceOrder('sidekick', c.sidekicks);

  // ---------------------------------------------------------------- start loadout
  const L = c.startLoadout;
  const hull = c.hulls.find((h) => h.id === L.hull);
  const frontW = c.weapons.find((w) => w.id === L.front);
  if (!hull) err('START_LOADOUT', 'hull', `unknown hull ${L.hull}`);
  if (!frontW || frontW.slot !== 'front') err('START_LOADOUT', 'front', `${L.front} is not a front weapon`);
  if (L.rear !== null && c.weapons.find((w) => w.id === L.rear)?.slot !== 'rear') err('START_LOADOUT', 'rear', `${L.rear} is not a rear weapon`);
  if (!c.shields.some((s) => s.id === L.shield)) err('START_LOADOUT', 'shield', `unknown shield ${L.shield}`);
  if (!c.generators.some((g) => g.id === L.generator)) err('START_LOADOUT', 'generator', `unknown generator ${L.generator}`);
  for (const side of [L.sidekickL, L.sidekickR]) {
    if (side !== null && !c.sidekicks.some((s) => s.id === side)) err('START_LOADOUT', 'sidekick', `unknown sidekick ${side}`);
  }
  const equipped = (L.sidekickL ? 1 : 0) + (L.sidekickR ? 1 : 0);
  if (hull && equipped > hull.sidekickSlots) err('START_LOADOUT', 'sidekick', 'more sidekicks than hull slots');
  for (const [k, p] of [['frontPower', L.frontPower], ['rearPower', L.rearPower]] as const) {
    if (!Number.isInteger(p) || p < 1 || p > MAX_POWER) err('START_LOADOUT', k, `power ${p} outside 1..${MAX_POWER}`);
  }
  const startItems = [hull, frontW, c.shields.find((s) => s.id === L.shield), c.generators.find((g) => g.id === L.generator)];
  for (const it of startItems) if (it?.unlockLevel) err('START_LOADOUT', it.id, 'start item must not be locked');
  if (!isNum(c.startCredits) || c.startCredits < 0) err('START_CREDITS', '*', 'must be a number >= 0');

  // ---------------------------------------------------------------- enemies
  const usedSprites = new Set<string>();
  const checkShot = (area: string, id: string, fire: string, sprite: string, color: string, speed: number, rate: number) => {
    if (!FIRE_PATTERNS.includes(fire as never)) err(area, id, `unknown fire pattern ${fire}`);
    if (!has(ENEMY_BULLET_SPRITES, sprite)) err(area, id, `unknown bullet sprite ${sprite}`);
    else if (!has(ENEMY_BULLET_DAMAGE, sprite)) err(area, id, `bullet sprite ${sprite} has no ENEMY_BULLET_DAMAGE entry`);
    if (!SHOT_COLORS.includes(color as never)) err(area, id, `unknown bullet colour ${color}`);
    if (fire === 'none') return;
    if (!(rate > 0)) err(area, id, 'fire rate must be > 0');
    if (!(speed > 0)) err(area, id, 'bullet speed must be > 0');
    if ((fire === 'missile') !== (sprite === 'eb_missile')) err(area, id, "'missile' fire and the eb_missile sprite go together");
    if ((fire === 'laser') !== (sprite === 'eb_laser')) err(area, id, "'laser' fire and the eb_laser sprite go together");
  };
  for (const e of c.enemies) {
    name('enemy', e.id, e.name);
    if (!has(ENEMY_SPRITES, e.sprite)) { err('enemy', e.id, `unknown sprite ${e.sprite}`); continue; }
    usedSprites.add(e.sprite);
    if (!PALETTE_NAMES.includes(e.palette)) err('enemy', e.id, `unknown palette ${e.palette}`);
    const expected = e.sprite.startsWith('gr_') ? 'ground' : e.sprite.startsWith('sea_') ? 'sea' : 'air';
    if (e.layer !== expected) err('enemy', e.id, `layer ${e.layer} does not match sprite ${e.sprite} (${expected})`);
    if (!MOVE_PATTERNS.includes(e.move)) err('enemy', e.id, `unknown move ${e.move}`);
    const surface = SURFACE_MOVES.includes(e.move);
    if (e.layer === 'air' && surface) err('enemy', e.id, `air unit cannot use move ${e.move}`);
    if (e.layer !== 'air' && !surface) err('enemy', e.id, `${e.layer} unit must use 'ground' or 'groundMove'`);
    if (e.sprite.startsWith('hz_') && !['drift', 'straight', 'rise', 'sine'].includes(e.move)) err('enemy', e.id, `hazard move ${e.move} not allowed`);
    if (!(e.hp > 0)) err('enemy', e.id, 'hp must be > 0');
    if (!(e.speed >= 0)) err('enemy', e.id, 'speed must be >= 0');
    if (e.fire === 'none' && e.fireRate !== 0) err('enemy', e.id, "fire 'none' needs fireRate 0");
    checkShot('enemy', e.id, e.fire, e.bulletSprite, e.bulletColor, e.bulletSpeed, e.fireRate);
    if (!(e.contactDamage >= 0) || !(e.score >= 0) || !(e.credits >= 0)) err('enemy', e.id, 'contactDamage / score / credits must be >= 0');
    if (!['s', 'm', 'l'].includes(e.explosion)) err('enemy', e.id, `bad explosion ${e.explosion}`);
    for (const d of e.drops ?? []) {
      if (!PICKUP_KINDS.includes(d.kind)) err('enemy', e.id, `unknown drop kind ${d.kind}`);
      if (!(d.chance > 0 && d.chance <= 1)) err('enemy', e.id, `drop chance ${d.chance} outside (0, 1]`);
    }
  }
  for (const s of Object.keys(ENEMY_SPRITES)) if (!usedSprites.has(s)) err('enemy', s, 'ENEMY_SPRITES entry not used by any enemy');

  // ---------------------------------------------------------------- bosses
  const expectedBosses = CAMPAIGN.map((p) => p.boss);
  for (const b of expectedBosses) if (!bosses.has(b)) err('boss', b, 'missing boss');
  for (const b of c.bosses) {
    if (!expectedBosses.includes(b.id)) err('boss', b.id, 'not a campaign boss id');
    name('boss', b.id, b.name);
    name('boss', b.id, b.title, 24);
    if (b.sprite !== `boss_${b.id}` || !has(BOSS_SPRITES, b.sprite)) err('boss', b.id, `sprite ${b.sprite} must be boss_${b.id} (BOSS_SPRITES)`);
    const half = (BOSS_SPRITES as Record<string, number>)[b.sprite] / 2 || 0;
    if (!PALETTE_NAMES.includes(b.palette)) err('boss', b.id, `unknown palette ${b.palette}`);
    if (!(b.hp > 0) || !(b.score >= 0) || !(b.credits >= 0)) err('boss', b.id, 'hp must be > 0, score / credits >= 0');
    if (b.phases.length < 2 || b.phases.length > 4) err('boss', b.id, `${b.phases.length} phases (need 2..4)`);
    const muzzle = (where: string, a: BossAttack) => {
      checkShot('boss', `${b.id} ${where}`, a.fire, a.bulletSprite, a.bulletColor, a.bulletSpeed, a.rate);
      if (a.fire === 'none') err('boss', `${b.id} ${where}`, "attack fire cannot be 'none'");
      if (a.from && (Math.abs(a.from[0]) > half || Math.abs(a.from[1]) > half)) err('boss', `${b.id} ${where}`, 'muzzle outside the body');
    };
    let prevSig = '';
    let spawns = 0;
    let prevEvery = Infinity;
    b.phases.forEach((ph, i) => {
      const where = `phase ${i + 1}`;
      const last = i === b.phases.length - 1;
      const prevHp = i === 0 ? 1 : b.phases[i - 1].untilHp;
      if (last ? ph.untilHp !== 0 : !(ph.untilHp > 0 && ph.untilHp < prevHp)) err('boss', `${b.id} ${where}`, 'untilHp must decrease within (0, 1) and end at 0');
      if (!BOSS_MOVES.includes(ph.move)) err('boss', `${b.id} ${where}`, `unknown move ${ph.move}`);
      if (!(ph.speed >= 0)) err('boss', `${b.id} ${where}`, 'speed must be >= 0');
      if (ph.attacks.length === 0) err('boss', `${b.id} ${where}`, 'no attacks');
      ph.attacks.forEach((a, k) => muzzle(`${where} attack ${k + 1}`, a));
      const sig = ph.attacks.map((a) => a.fire).sort().join('+');
      if (sig === prevSig) err('boss', `${b.id} ${where}`, 'same bullet patterns as the previous phase');
      prevSig = sig;
      if (ph.spawn) {
        spawns++;
        const m = enemies.get(ph.spawn.enemy);
        if (!m) err('boss', `${b.id} ${where}`, `spawns unknown enemy ${ph.spawn.enemy}`);
        else if (m.layer !== 'air') err('boss', `${b.id} ${where}`, `minion ${m.id} must be an air unit`);
        if (!(ph.spawn.every > 0)) err('boss', `${b.id} ${where}`, 'spawn interval must be > 0');
        if (ph.spawn.every > prevEvery) err('boss', `${b.id} ${where}`, 'minion spawns must escalate (interval may not grow)');
        prevEvery = ph.spawn.every;
      } else if (spawns > 0) err('boss', `${b.id} ${where}`, 'a later phase stops spawning minions');
    });
    if (spawns === 0) err('boss', b.id, 'no phase spawns minions');
    if (!b.phases[b.phases.length - 1]?.spawn) err('boss', b.id, 'the final phase must spawn minions');
    const parts = b.parts ?? [];
    if (parts.length < 2 || parts.length > 6) err('boss', b.id, `${parts.length} parts (need 2..6)`);
    parts.forEach((p, k) => {
      const where = `part ${k + 1}`;
      const ps = (BOSS_PART_SPRITES as Record<string, number>)[p.sprite];
      if (!ps) { err('boss', `${b.id} ${where}`, `unknown part sprite ${p.sprite}`); return; }
      const lim = half - ps / 2;
      if (Math.abs(p.offset[0]) > lim || Math.abs(p.offset[1]) > lim) err('boss', `${b.id} ${where}`, `offset ${p.offset} outside the ${half * 2}px body`);
      if (!(p.hp >= 0)) err('boss', `${b.id} ${where}`, 'hp must be >= 0');
      if (p.attack) muzzle(where, p.attack);
    });
  }

  // ---------------------------------------------------------------- planets
  const order = CAMPAIGN.map((p) => p.planet);
  if (c.planets.length !== CAMPAIGN.length) err('planet', '*', `expected ${CAMPAIGN.length} planets, found ${c.planets.length}`);
  c.planets.forEach((p, i) => {
    const ref = CAMPAIGN[i];
    if (!ref || p.id !== ref.planet) err('planet', p.id, `campaign order expects ${ref?.planet} at position ${i + 1}`);
    else {
      if (p.name !== ref.name) err('planet', p.id, `name must be "${ref.name}"`);
      if (p.biome !== ref.biome) err('planet', p.id, `biome must be ${ref.biome}`);
    }
    if (!BIOMES.includes(p.biome)) err('planet', p.id, `unknown biome ${p.biome}`);
    const identity = PLANET_PALETTES[p.id] ?? [];
    if (identity.length < 2 || identity.length > 3) err('planet', p.id, 'colour identity needs 2-3 palettes (PLANET_PALETTES)');
    for (const pal of identity) {
      if (!(BIOME_PALETTES[p.biome] ?? []).includes(pal)) err('planet', p.id, `palette ${pal} does not contrast with the ${p.biome} terrain`);
    }
    desc('planet', p.id, p.desc, 140);
    if (!(p.mapX >= 0.15 && p.mapX <= 0.85) || !(p.mapY >= 0.12 && p.mapY <= 0.88)) err('planet', p.id, 'map position outside x 0.15..0.85 / y 0.12..0.88');
    if (i > 0 && !(p.mapY < c.planets[i - 1].mapY)) err('planet', p.id, 'map route must climb (mapY decreasing)');
    if (p.levels.length !== 3) err('planet', p.id, 'needs exactly 3 levels');
    p.levels.forEach((lid, k) => {
      if (lid !== `${p.id}-${k + 1}`) err('planet', p.id, `level ${k + 1} must be ${p.id}-${k + 1}`);
      if (!levels.has(lid)) err('planet', p.id, `unknown level ${lid}`);
    });
  });
  for (const l of c.levels) {
    const owners = c.planets.filter((p) => p.levels.includes(l.id));
    if (owners.length !== 1) err('level', l.id, `listed by ${owners.length} planets (need exactly 1)`);
  }

  // ---------------------------------------------------------------- levels & waves
  const usedEnemies = new Set<string>();
  const intelRefs = new Map<string, string[]>();
  for (const l of c.levels) {
    const planet = planets.get(l.planet);
    const camp = CAMPAIGN.find((p) => p.planet === l.planet);
    if (!planet) err('level', l.id, `unknown planet ${l.planet}`);
    if (l.id !== `${l.planet}-${l.index}`) err('level', l.id, 'id must be <planet>-<index>');
    if (planet && planet.levels[l.index - 1] !== l.id) err('level', l.id, 'index does not match its position on the planet');
    if (planet && l.biome !== planet.biome) err('level', l.id, `biome ${l.biome} differs from planet biome ${planet.biome}`);
    name('level', l.id, l.name);
    desc('level', l.id, l.briefing, RULES.briefingMax);
    if (!Number.isInteger(l.seed) || l.seed < 0) err('level', l.id, 'seed must be a non-negative integer');
    if (!(l.duration >= RULES.durationRange[0] && l.duration <= RULES.durationRange[1])) err('level', l.id, `duration outside ${RULES.durationRange.join('..')}`);
    if (!(l.scrollSpeed >= RULES.scrollRange[0] && l.scrollSpeed <= RULES.scrollRange[1])) err('level', l.id, `scrollSpeed outside ${RULES.scrollRange.join('..')}`);
    const land = LAND_BIOMES.includes(l.biome);
    const sea = SEA_BIOMES.includes(l.biome);
    const contrast = BIOME_PALETTES[l.biome] ?? [];
    const palettes = (PLANET_PALETTES[l.planet] ?? []).filter((p) => contrast.includes(p));
    const colours = BIOME_BULLET_COLORS[l.biome] ?? [];
    const identity = (where: string, e: EnemyDef) => {
      if (!palettes.includes(e.palette)) err('level', `${l.id} ${where}`, `${e.id} palette ${e.palette} not in the ${l.planet} identity (${palettes.join('/')})`);
      if (e.fire !== 'none' && !colours.includes(e.bulletColor)) err('level', `${l.id} ${where}`, `${e.id} bullet colour ${e.bulletColor} unreadable on ${l.biome}`);
      if (e.layer === 'ground' && !land) err('level', `${l.id} ${where}`, `ground unit ${e.id} in a ${l.biome} level`);
      if (e.layer === 'sea' && !sea) err('level', `${l.id} ${where}`, `sea unit ${e.id} outside an ocean level`);
    };

    if (l.waves.length === 0) err('level', l.id, 'no waves');
    let prevT = -Infinity;
    let intelMiss = 1;
    l.waves.forEach((w: WaveDef, i) => {
      const where = `wave ${i + 1} (t=${w.t})`;
      if (!(w.t >= prevT)) err('level', `${l.id} ${where}`, 'waves must be sorted by t');
      prevT = w.t;
      if (!(w.t >= 0 && w.t <= l.duration)) err('level', `${l.id} ${where}`, `t outside [0, ${l.duration}]`);
      if (!Number.isInteger(w.count) || w.count < 1 || w.count > RULES.maxWaveCount) err('level', `${l.id} ${where}`, `count ${w.count} outside 1..${RULES.maxWaveCount}`);
      if (!FORMATIONS.includes(w.formation)) err('level', `${l.id} ${where}`, `unknown formation ${w.formation}`);
      if (!(w.x >= 0 && w.x <= 1)) err('level', `${l.id} ${where}`, `x ${w.x} outside [0, 1]`);
      if (w.spacing !== undefined && !(w.spacing > 0)) err('level', `${l.id} ${where}`, 'spacing must be > 0');
      if (w.interval !== undefined && !(w.interval > 0)) err('level', `${l.id} ${where}`, 'interval must be > 0');
      if (lastSpawnTime(w) > l.duration + 0.01) err('level', `${l.id} ${where}`, 'last member spawns after the level duration');
      if (w.mirror && Math.abs(w.x - 0.5) < 0.08) err('level', `${l.id} ${where}`, 'mirrored wave too close to the centre');
      if (w.formation === 'line' || w.formation === 'wall') {
        const halfSpan = ((w.count - 1) * (w.spacing ?? 24)) / 2;
        const cx = w.x * PLAY_W;
        if (cx - halfSpan < 0 || cx + halfSpan > PLAY_W) err('level', `${l.id} ${where}`, `${w.formation} wider than the playfield`);
      }
      const e = enemies.get(w.enemy);
      if (!e) { err('level', `${l.id} ${where}`, `unknown enemy ${w.enemy}`); return; }
      usedEnemies.add(e.id);
      identity(where, e);
      if (w.move !== undefined) {
        if (!MOVE_PATTERNS.includes(w.move)) err('level', `${l.id} ${where}`, `unknown move ${w.move}`);
        const surface = SURFACE_MOVES.includes(w.move);
        if (e.layer === 'air' && surface) err('level', `${l.id} ${where}`, `air unit ${e.id} cannot use move ${w.move}`);
        if (e.layer !== 'air' && !surface) err('level', `${l.id} ${where}`, `${e.layer} unit ${e.id} cannot use move ${w.move}`);
      }
      const drop = e.drops?.find((d) => d.kind === 'intel');
      if (drop) intelMiss *= (1 - drop.chance) ** (w.count * (w.mirror ? 2 : 1));
    });

    // pacing: never an empty screen
    const times = [...new Set(l.waves.map((w) => w.t))].sort((a, b) => a - b);
    if (times.length >= 2) {
      const avg = (times[times.length - 1] - times[0]) / (times.length - 1);
      let maxGap = 0;
      for (let i = 1; i < times.length; i++) maxGap = Math.max(maxGap, times[i] - times[i - 1]);
      if (avg > RULES.avgGapMax) err('level', l.id, `average wave gap ${avg.toFixed(2)} s > ${RULES.avgGapMax} s`);
      if (maxGap > RULES.maxGap) err('level', l.id, `gap of ${maxGap.toFixed(1)} s between waves (max ${RULES.maxGap} s)`);
    }
    if (times.length && times[0] > RULES.firstWaveMaxT) err('level', l.id, `first wave at ${times[0]} s (max ${RULES.firstWaveMaxT} s)`);
    if (times.length && times[times.length - 1] < l.duration - RULES.tailMax) err('level', l.id, `no wave in the last ${RULES.tailMax} s`);

    // boss / mid-boss structure
    if (l.index === 3) {
      if (!l.boss) err('level', l.id, 'level 3 must have a boss');
      else {
        const b = bosses.get(l.boss);
        if (!b) err('level', l.id, `unknown boss ${l.boss}`);
        else {
          if (camp && camp.boss !== l.boss) err('level', l.id, `boss must be ${camp.boss}`);
          if (!palettes.includes(b.palette)) err('level', l.id, `boss palette ${b.palette} not in the ${l.planet} identity (${palettes.join('/')})`);
          for (const ph of b.phases) {
            for (const a of ph.attacks) if (!colours.includes(a.bulletColor)) err('level', l.id, `boss bullet colour ${a.bulletColor} unreadable on ${l.biome}`);
            if (ph.spawn) {
              const m = enemies.get(ph.spawn.enemy);
              if (m) { usedEnemies.add(m.id); identity(`boss minion`, m); }
            }
          }
          for (const p of b.parts ?? []) if (p.attack && !colours.includes(p.attack.bulletColor)) err('level', l.id, `boss part bullet colour ${p.attack.bulletColor} unreadable on ${l.biome}`);
        }
      }
    } else if (l.boss) err('level', l.id, 'only level 3 of a planet has a boss');
    if (l.index === 2) {
      if (!l.midboss) err('level', l.id, 'level 2 must have a mid-boss');
      else {
        const m = enemies.get(l.midboss.enemy);
        if (!m) err('level', l.id, `unknown mid-boss ${l.midboss.enemy}`);
        else {
          usedEnemies.add(m.id);
          identity('mid-boss', m);
          if (!MIDBOSS_SPRITES.includes(m.sprite)) err('level', l.id, `mid-boss sprite ${m.sprite} not in ${MIDBOSS_SPRITES.join('/')}`);
          if (m.hp < RULES.midbossHp[0] || m.hp > RULES.midbossHp[1]) err('level', l.id, `mid-boss hp ${m.hp} outside ${RULES.midbossHp.join('..')}`);
          const drop = m.drops?.find((d) => d.kind === 'intel');
          if (drop) intelMiss *= 1 - drop.chance;
        }
        const [a, b] = RULES.midbossWindow;
        if (!(l.midboss.t >= a * l.duration && l.midboss.t <= b * l.duration)) err('level', l.id, `mid-boss at ${l.midboss.t} s, expected ${a * 100}-${b * 100} % of the duration`);
      }
    } else if (l.midboss) err('level', l.id, 'only level 2 of a planet has a mid-boss');

    // intel
    if (l.intel !== undefined) {
      if (!intel.has(l.intel)) err('level', l.id, `unknown intel ${l.intel}`);
      const refs = intelRefs.get(l.intel) ?? [];
      refs.push(l.id);
      intelRefs.set(l.intel, refs);
      if (1 - intelMiss < RULES.intelMinFindChance) err('level', l.id, `intel ${l.intel} is not reliably dropped (needs an enemy with an 'intel' drop)`);
    }
  }
  for (const e of c.enemies) if (!usedEnemies.has(e.id)) err('enemy', e.id, 'never used by a level, mid-boss or boss');

  // ---------------------------------------------------------------- intel
  for (const i of c.intel) {
    if (!i.from?.trim() || i.from.length > 24) err('intel', i.id, 'from must be 1..24 chars');
    if (!i.title?.trim() || i.title.length > 28) err('intel', i.id, 'title must be 1..28 chars');
    if (!i.body?.trim() || i.body.length > RULES.intelBodyMax) err('intel', i.id, `body must be 1..${RULES.intelBodyMax} chars (${i.body?.length})`);
    const refs = intelRefs.get(i.id) ?? [];
    if (refs.length !== 1) err('intel', i.id, `referenced by ${refs.length} levels (need exactly 1)`);
  }

  return errors;
}
