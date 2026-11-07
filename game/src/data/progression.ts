// =====================================================================================
//  PROGRESSION MODEL — the reference player of docs/BALANCE.md §4. It plays the campaign in
//  order, earns each level's expected income (kill credits at KILL_RATE + mid-boss + boss +
//  clear bonus) and re-buys its whole ship before every level. Trade-in refunds 100 %, so the
//  loadout is a pure function of the total ship value and of the unlocked items:
//   1. hull: the Lancer once the ship is worth LANCER_VALUE, a later hull once it costs at
//      most HULL_SHARE of the value;
//   2. shield: the best one costing at most SHIELD_SHARE of the value;
//   3. weapons (what is left minus the generator): FRONT_SHARE to the strongest front gun it
//      affords, SIDEKICK_SHARE (+ the front change) to the best sidekick pair, the rest to a
//      rear gun; leftovers go back into front power;
//   4. generator: the cheapest one whose output runs front + rear + full shield regeneration.
//  Every DPS / energy number is weaponFireStats() of the arsenal (src/game/arsenal/scaling.ts),
//  i.e. exactly what the guns fire. Pure functions, no Phaser.
// =====================================================================================
import type { GeneratorDef, HullDef, LevelDef, Loadout, ShieldDef, SidekickDef, WeaponDef } from '../types';
import { MAX_POWER } from '../config';
import { weaponFireStats } from '../game/arsenal/scaling';
import { SIDEKICK_PROJECTILES } from './sidekicks';
import { DPS_UPTIME, MIDBOSS_UPTIME } from './balance';

/** Ship value at which the reference player buys the Lancer (second sidekick mount). */
export const LANCER_VALUE = 12000;
/** Share of the ship value the reference player puts in a later hull / in the shield. */
export const HULL_SHARE = 0.18;
export const SHIELD_SHARE = 0.12;
/** Split of the weapon budget (rear gets the rest). */
export const FRONT_SHARE = 0.62;
export const SIDEKICK_SHARE = 0.28;
/** Share of a rear gun's DPS that reaches a target in front (mode B diagonals / flank shots). */
export const REAR_ON_TARGET = 0.3;
/** Forward-DPS weight per sidekick pattern (the orbiter only grinds what it touches). */
export const SIDEKICK_ON_TARGET: Record<string, number> = { pod: 1, twin: 1, orbiter: 0, rocket: 1, shard: 1, charge: 1 };
/**
 * Share of the level's expected 'power' drops (loot discs, relays, bombers... dropped before
 * the fight starts) that the reference player has collected when a (mid-)boss fight starts.
 * Each one is +1 front power for the rest of the level (src/game/pickups.ts).
 */
export const POWER_COLLECT = 0.8;

export interface ProgressionInput {
  hulls: HullDef[];
  shields: ShieldDef[];
  generators: GeneratorDef[];
  front: WeaponDef[];
  rear: WeaponDef[];
  sidekicks: SidekickDef[];
  /** Levels in campaign order. */
  levels: LevelDef[];
  startCredits: number;
  startLoadout: Loadout;
  /** Expected credits earned by completing level `index` (kills + clear bonus). */
  income(level: LevelDef, index: number): number;
  /** Planet boss / mid-boss hp of a level (0 = none). */
  bossHp(level: LevelDef): number;
  midbossHp(level: LevelDef): number;
  /** Expected number of 'power' drops spawned by the level's waves before level time `t`. */
  powerDrops(level: LevelDef, t: number): number;
}

export interface ProgressionStep {
  levelId: string;
  index: number;
  /** Total ship value (free credits + trade-in value of the loadout) before the level. */
  value: number;
  /** Expected credits earned in the level (kills + clear bonus). */
  income: number;
  loadout: Loadout;
  frontDps: number;
  sidekickDps: number;
  rearDps: number;
  /** Nominal DPS on a target in front: front + sidekicks + REAR_ON_TARGET x rear. */
  dps: number;
  /** In-level front power the reference player has when the boss / mid-boss fight starts. */
  bossPower: number;
  midbossPower: number;
  /** dps at bossPower: what the planet boss fight sees (0 when the level has no boss). */
  fightDps: number;
  /** dps at midbossPower: what the mid-boss fight sees (0 when the level has none). */
  midbossDps: number;
  /** Generator drain at full fire with the shield regenerating, and generator output (energy/s). */
  energyUse: number;
  energyOut: number;
  bossHp: number;
  midbossHp: number;
  /** Expected fight lengths: hp / (fight DPS x uptime). null when the level has none. */
  bossTtk: number | null;
  midbossTtk: number | null;
}

/** Credits spent on a weapon at power p (purchase + upgrades 1 -> p). */
export function weaponValue(w: WeaponDef, p: number): number {
  return w.cost + (w.upgradeBase * (p - 1) * p) / 2;
}

/** Forward DPS of a sidekick (damage x rate x projectiles x SIDEKICK_ON_TARGET). */
export function sidekickDps(s: SidekickDef | null | undefined): number {
  if (!s) return 0;
  return s.damage * s.fireRate * (SIDEKICK_PROJECTILES[s.pattern] ?? 1) * (SIDEKICK_ON_TARGET[s.pattern] ?? 1);
}

/** Nominal DPS of a weapon at a fractional power (linear in p, like M(p)), capped at MAX_POWER. */
export function dpsAtPower(def: WeaponDef, power: number): number {
  const p = Math.max(1, Math.min(MAX_POWER, power));
  const lo = Math.floor(p);
  const a = weaponFireStats(def, lo).dps;
  return lo >= MAX_POWER ? a : a + (p - lo) * (weaponFireStats(def, lo + 1).dps - a);
}

interface GunPick { def: WeaponDef; power: number; cost: number; dps: number; eps: number }

/**
 * Strongest gun of `list` (max nominal DPS, then cheapest) whose total value fits in `budget`
 * and whose drain fits in `maxEps` energy/s.
 */
function bestGun(list: WeaponDef[], budget: number, maxEps: number): GunPick | null {
  let best: GunPick | null = null;
  for (const def of list) {
    for (let p = MAX_POWER; p >= 1; p--) {
      const cost = weaponValue(def, p);
      if (cost > budget) continue;
      const st = weaponFireStats(def, p);
      if (st.energyPerSec > maxEps + 1e-9) continue;
      if (!best || st.dps > best.dps + 1e-9 || (Math.abs(st.dps - best.dps) <= 1e-9 && cost < best.cost)) {
        best = { def, power: p, cost, dps: st.dps, eps: st.energyPerSec };
      }
      break;
    }
  }
  return best;
}

interface PairPick { l: SidekickDef | null; r: SidekickDef | null; cost: number; dps: number }

/** Best sidekick pair for the hull's slots (max forward DPS, then cheapest) within `budget`. */
function bestPair(list: SidekickDef[], slots: number, budget: number): PairPick {
  const opts: (SidekickDef | null)[] = [null, ...list];
  let best: PairPick = { l: null, r: null, cost: 0, dps: 0 };
  for (const l of slots >= 1 ? opts : [null]) {
    for (const r of slots >= 2 ? opts : [null]) {
      const cost = (l?.cost ?? 0) + (r?.cost ?? 0);
      if (cost > budget) continue;
      const dps = sidekickDps(l) + sidekickDps(r);
      if (dps > best.dps + 1e-9 || (Math.abs(dps - best.dps) <= 1e-9 && cost < best.cost)) best = { l, r, cost, dps };
    }
  }
  return best;
}

interface Kit {
  hull: HullDef;
  shield: ShieldDef;
  gen: GeneratorDef;
  front: GunPick;
  rear: GunPick | null;
  pair: PairPick;
  /** Forward DPS: front + sidekicks + REAR_ON_TARGET x rear. */
  dps: number;
}

const shieldDrain = (s: ShieldDef) => s.regen * s.energyPerPoint;
const drainOf = (k: Kit) => k.front.eps + (k.rear?.eps ?? 0) + shieldDrain(k.shield);

/** Weapons bought with `budget` credits that a generator of `output` energy/s can run. */
function arm(input: ProgressionInput, fronts: WeaponDef[], rears: WeaponDef[], sks: SidekickDef[], hull: HullDef, shield: ShieldDef,
  gen: GeneratorDef, budget: number): Kit {
  const spare = gen.output - shieldDrain(shield);
  const startFront = input.front.find((w) => w.id === input.startLoadout.front) ?? input.front[0];
  const fallback = (): GunPick => {
    const st = weaponFireStats(startFront, 1);
    return { def: startFront, power: 1, cost: startFront.cost, dps: st.dps, eps: st.energyPerSec };
  };
  let front = bestGun(fronts, FRONT_SHARE * budget, spare) ?? fallback();
  const pair = bestPair(sks, hull.sidekickSlots, SIDEKICK_SHARE * budget + Math.max(0, FRONT_SHARE * budget - front.cost));
  const rear = bestGun(rears, budget - front.cost - pair.cost, spare - front.eps);
  const left = budget - front.cost - pair.cost - (rear?.cost ?? 0);
  front = bestGun(fronts, front.cost + left, spare - (rear?.eps ?? 0)) ?? front;
  const dps = front.dps + pair.dps + REAR_ON_TARGET * (rear?.dps ?? 0);
  return { hull, shield, gen, front, rear, pair, dps };
}

/** The reference loadout for a ship value and the items unlocked so far. */
function allocate(input: ProgressionInput, value: number, unlocked: (d: { unlockLevel?: string }) => boolean): Kit {
  const hulls = input.hulls.filter(unlocked);
  const shields = input.shields.filter(unlocked);
  const gens = input.generators.filter(unlocked);
  const fronts = input.front.filter(unlocked);
  const rears = input.rear.filter(unlocked);
  const sks = input.sidekicks.filter(unlocked);
  const start = input.startLoadout;

  // 1. hull: the Lancer at LANCER_VALUE, later hulls at HULL_SHARE of the value
  let hull = input.hulls.find((h) => h.id === start.hull) ?? hulls[0];
  const lancer = hulls.find((h) => h.sidekickSlots === 2);
  if (lancer && value >= LANCER_VALUE) {
    hull = lancer;
    for (const h of hulls) if (h.cost > hull.cost && h.cost <= HULL_SHARE * value) hull = h;
  }
  // 2. shield at SHIELD_SHARE of the value
  let shield = input.shields.find((s) => s.id === start.shield) ?? shields[0];
  for (const s of shields) if (s.cost > shield.cost && s.cost <= SHIELD_SHARE * value) shield = s;

  // 3 + 4. for every affordable generator, the weapons it can run with what is left; keep the
  // strongest kit (ties: the cheaper generator)
  let best: Kit | null = null;
  for (const gen of gens) {
    const budget = value - hull.cost - shield.cost - gen.cost;
    if (budget < 0 && best) break;
    const kit = arm(input, fronts, rears, sks, hull, shield, gen, Math.max(0, budget));
    if (!best || kit.dps > best.dps + 1e-9) best = kit;
  }
  return best as Kit;
}

/** Plays the campaign with the reference player (see the header). */
export function simulateProgression(input: ProgressionInput): ProgressionStep[] {
  const steps: ProgressionStep[] = [];
  const startFront = input.front.find((w) => w.id === input.startLoadout.front);
  const all = [...input.hulls, ...input.shields, ...input.generators, ...input.front, ...input.rear, ...input.sidekicks];
  const priceOf = (id: string | null) => (id ? all.find((d) => d.id === id)?.cost ?? 0 : 0);
  const s = input.startLoadout;
  let value = input.startCredits + priceOf(s.hull) + (startFront ? weaponValue(startFront, s.frontPower) : 0)
    + priceOf(s.shield) + priceOf(s.generator) + priceOf(s.sidekickL) + priceOf(s.sidekickR);
  const done = new Set<string>();
  input.levels.forEach((level, index) => {
    const kit = allocate(input, value, (d) => !d.unlockLevel || done.has(d.unlockLevel));
    const rearDps = kit.rear ? kit.rear.dps : 0;
    const dps = kit.dps;
    const bossHp = input.bossHp(level);
    const midbossHp = input.midbossHp(level);
    const income = input.income(level, index);
    const bossPower = Math.min(MAX_POWER, kit.front.power + POWER_COLLECT * input.powerDrops(level, level.duration));
    const midbossPower = level.midboss
      ? Math.min(MAX_POWER, kit.front.power + POWER_COLLECT * input.powerDrops(level, level.midboss.t))
      : kit.front.power;
    const fightDps = bossHp > 0 ? dps - kit.front.dps + dpsAtPower(kit.front.def, bossPower) : 0;
    const midbossDps = midbossHp > 0 ? dps - kit.front.dps + dpsAtPower(kit.front.def, midbossPower) : 0;
    steps.push({
      levelId: level.id,
      index,
      value,
      income,
      loadout: {
        hull: kit.hull.id,
        front: kit.front.def.id,
        frontPower: kit.front.power,
        rear: kit.rear ? kit.rear.def.id : null,
        rearPower: kit.rear ? kit.rear.power : 1,
        shield: kit.shield.id,
        generator: kit.gen.id,
        sidekickL: kit.pair.l ? kit.pair.l.id : null,
        sidekickR: kit.pair.r ? kit.pair.r.id : null,
      },
      frontDps: kit.front.dps,
      sidekickDps: kit.pair.dps,
      rearDps,
      dps,
      bossPower,
      midbossPower,
      fightDps,
      midbossDps,
      energyUse: drainOf(kit),
      energyOut: kit.gen.output,
      bossHp,
      midbossHp,
      bossTtk: bossHp > 0 ? bossHp / (fightDps * DPS_UPTIME) : null,
      midbossTtk: midbossHp > 0 ? midbossHp / (midbossDps * MIDBOSS_UPTIME) : null,
    });
    value += income;
    done.add(level.id);
  });
  return steps;
}
