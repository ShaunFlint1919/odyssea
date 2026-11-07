// Shop economy: trade-in math, None entries, sidekick slots, locks, power up/down, credits.
// Ids are derived from the real catalogue (src/data); suites skip while it is still empty.
import { beforeEach, describe, expect, it } from 'vitest';
import { GENERATORS, HULLS, LEVELS, SHIELDS, SIDEKICKS, WEAPONS } from '../src/data';
import { MAX_POWER } from '../src/config';
import { getSave, newGame } from '../src/state/save';
import {
  buyItem, categoryAvailable, changePower, equippedValue, loadoutValue, shopItems, sidekickSlots, switchCost, upgradeCost,
} from '../src/state/economy';
import type { ShopCategory } from '../src/game/contracts';
import type { SaveData } from '../src/types';

const FRONTS = WEAPONS.filter((w) => w.slot === 'front');
const REARS = WEAPONS.filter((w) => w.slot === 'rear');
const hullWith = (slots: number) => HULLS.find((h) => h.sidekickSlots === slots);
const HULL0 = hullWith(0);
const HULL1 = hullWith(1);
const HULL2 = hullWith(2);
const hasCore = HULLS.length > 0 && FRONTS.length > 0 && SHIELDS.length > 0 && GENERATORS.length > 0;

/** New campaign with every item unlocked, lots of credits and a loadout made of catalogue items. */
function setup(credits = 10_000_000): SaveData {
  const s = newGame('normal');
  s.completedLevels = LEVELS.map((l) => l.id);
  s.credits = credits;
  s.loadout = {
    hull: (HULL2 ?? HULLS[0]).id,
    front: FRONTS[0].id,
    frontPower: 1,
    rear: null,
    rearPower: 1,
    shield: SHIELDS[0].id,
    generator: GENERATORS[0].id,
    sidekickL: null,
    sidekickR: null,
  };
  return s;
}

describe.skipIf(!hasCore)('shop listing', () => {
  beforeEach(() => { setup(); });

  it('lists a None entry first for rear and sidekick slots only', () => {
    for (const c of ['rear', 'sidekickL', 'sidekickR'] as ShopCategory[]) {
      const items = shopItems(c);
      expect(items[0].id).toBeNull();
      expect(items[0].cost).toBe(0);
      expect(items[0].equipped).toBe(true);
    }
    for (const c of ['hull', 'front', 'shield', 'generator'] as ShopCategory[]) {
      expect(shopItems(c).every((i) => i.id !== null)).toBe(true);
    }
    expect(shopItems('front')).toHaveLength(FRONTS.length);
    expect(shopItems('rear')).toHaveLength(REARS.length + 1);
    expect(shopItems('sidekickR')).toHaveLength(SIDEKICKS.length + 1);
  });

  it('marks exactly the equipped item', () => {
    const items = shopItems('front');
    expect(items.filter((i) => i.equipped).map((i) => i.id)).toEqual([FRONTS[0].id]);
    expect(shopItems('shield').find((i) => i.equipped)?.id).toBe(SHIELDS[0].id);
  });

  it('flags items whose unlock level is not completed as locked', () => {
    const s = getSave();
    s.completedLevels = [];
    const lockedDef = [...HULLS, ...WEAPONS, ...SHIELDS, ...GENERATORS, ...SIDEKICKS].find((d) => d.unlockLevel);
    if (!lockedDef) return;
    const all = (['hull', 'front', 'rear', 'shield', 'generator', 'sidekickL'] as ShopCategory[]).flatMap((c) => shopItems(c));
    const entry = all.find((i) => i.id === lockedDef.id);
    if (entry && !entry.equipped) expect(entry.locked).toBe(true);
  });
});

describe.skipIf(!hasCore || FRONTS.length < 2)('trade-in', () => {
  beforeEach(() => { setup(); });

  it('refunds 100 % of purchase + upgrades and resets power to 1', () => {
    const s = getSave();
    const [a, b] = FRONTS;
    const start = s.credits;
    expect(changePower('front', 1).ok).toBe(true);
    expect(changePower('front', 1).ok).toBe(true);
    expect(s.loadout.frontPower).toBe(3);
    const upgrades = a.upgradeBase * 1 + a.upgradeBase * 2;
    expect(s.credits).toBe(start - upgrades);
    expect(equippedValue('front')).toBe(a.cost + upgrades);

    const net = switchCost('front', b.id);
    expect(net).toBe(b.cost - (a.cost + upgrades));
    const r = buyItem('front', b.id);
    expect(r.ok).toBe(true);
    expect(r.credits).toBe(s.credits);
    expect(s.credits).toBe(start - upgrades - net);
    expect(s.credits).toBe(start - b.cost + a.cost);
    expect(s.loadout.front).toBe(b.id);
    expect(s.loadout.frontPower).toBe(1);
  });

  it('buying the equipped item is a free no-op', () => {
    const s = getSave();
    const before = s.credits;
    expect(switchCost('front', FRONTS[0].id)).toBe(0);
    expect(buyItem('front', FRONTS[0].id)).toEqual({ ok: true, credits: before });
    expect(s.credits).toBe(before);
  });

  it('rejects None for mandatory slots and unknown / wrong-slot ids', () => {
    expect(buyItem('front', null)).toMatchObject({ ok: false, reason: 'slot' });
    expect(buyItem('hull', null)).toMatchObject({ ok: false, reason: 'slot' });
    expect(buyItem('shield', 'no_such_item')).toMatchObject({ ok: false, reason: 'slot' });
    if (REARS.length) expect(buyItem('front', REARS[0].id)).toMatchObject({ ok: false, reason: 'slot' });
  });

  it('fails with reason "credits" and changes nothing when the player cannot pay', () => {
    const s = getSave();
    const target = [...FRONTS].sort((x, y) => y.cost - x.cost).find((w) => w.id !== s.loadout.front && w.cost > 0);
    if (!target) return;
    s.credits = 0;
    const loadout = { ...s.loadout };
    const r = buyItem('front', target.id);
    if (switchCost('front', target.id) > 0) {
      expect(r).toEqual({ ok: false, reason: 'credits', credits: 0 });
      expect(s.loadout).toEqual(loadout);
    } else {
      expect(r.ok).toBe(true);
    }
  });

  it('refuses locked items (unlock level not completed) and sells them once unlocked', () => {
    const s = getSave();
    s.completedLevels = [];
    const cases: [ShopCategory, { id: string; unlockLevel?: string }[], string | null][] = [
      ['hull', HULLS, s.loadout.hull], ['front', FRONTS, s.loadout.front], ['rear', REARS, s.loadout.rear],
      ['shield', SHIELDS, s.loadout.shield], ['generator', GENERATORS, s.loadout.generator],
      ['sidekickL', SIDEKICKS, s.loadout.sidekickL],
    ];
    for (const [cat, list, equipped] of cases) {
      if (!categoryAvailable(cat)) continue;
      const def = list.find((d) => d.unlockLevel && d.id !== equipped);
      if (!def) continue;
      expect(buyItem(cat, def.id)).toMatchObject({ ok: false, reason: 'locked' });
      s.completedLevels = [def.unlockLevel as string];
      expect(buyItem(cat, def.id).ok).toBe(true);
      s.completedLevels = [];
    }
  });
});

describe.skipIf(!hasCore || REARS.length === 0)('rear gun and None entry', () => {
  beforeEach(() => { setup(); });

  it('has no power to change without a rear gun, sells back at full value with None', () => {
    const s = getSave();
    expect(changePower('rear', 1)).toMatchObject({ ok: false, reason: 'slot' });
    const start = s.credits;
    const rear = REARS[0];
    expect(buyItem('rear', rear.id).ok).toBe(true);
    expect(s.loadout.rearPower).toBe(1);
    expect(changePower('rear', 1).ok).toBe(true);
    expect(s.credits).toBe(start - rear.cost - rear.upgradeBase);
    expect(switchCost('rear', null)).toBe(-(rear.cost + rear.upgradeBase));
    expect(buyItem('rear', null).ok).toBe(true);
    expect(s.loadout.rear).toBeNull();
    expect(s.loadout.rearPower).toBe(1);
    expect(s.credits).toBe(start);
  });
});

describe.skipIf(!hasCore)('weapon power', () => {
  beforeEach(() => { setup(); });

  it('upgradeCost = upgradeBase * power', () => {
    const w = FRONTS[0];
    for (let p = 1; p < MAX_POWER; p++) expect(upgradeCost(w.id, p)).toBe(w.upgradeBase * p);
    expect(upgradeCost('no_such_weapon', 3)).toBe(0);
  });

  it('goes up to MAX_POWER and back down to 1, refunding the last upgrade each step', () => {
    const s = getSave();
    const w = FRONTS[0];
    const start = s.credits;
    expect(changePower('front', -1)).toMatchObject({ ok: false, reason: 'min' });
    for (let p = 1; p < MAX_POWER; p++) {
      const r = changePower('front', 1);
      expect(r.ok).toBe(true);
      expect(s.loadout.frontPower).toBe(p + 1);
    }
    expect(changePower('front', 1)).toMatchObject({ ok: false, reason: 'max' });
    expect(start - s.credits).toBe((w.upgradeBase * (MAX_POWER - 1) * MAX_POWER) / 2);
    const before = s.credits;
    expect(changePower('front', -1).ok).toBe(true);
    expect(s.credits - before).toBe(w.upgradeBase * (MAX_POWER - 1));
    while (s.loadout.frontPower > 1) expect(changePower('front', -1).ok).toBe(true);
    expect(s.credits).toBe(start);
  });

  it('refuses an upgrade the player cannot afford', () => {
    const s = getSave();
    const w = FRONTS[0];
    if (w.upgradeBase <= 0) return;
    s.credits = w.upgradeBase - 1;
    expect(changePower('front', 1)).toEqual({ ok: false, reason: 'credits', credits: w.upgradeBase - 1 });
    expect(s.loadout.frontPower).toBe(1);
  });
});

describe.skipIf(!hasCore || !HULL2 || SIDEKICKS.length === 0)('sidekick slots', () => {
  beforeEach(() => { setup(); });

  it('a 2-slot hull carries both sidekicks', () => {
    const s = getSave();
    expect(sidekickSlots()).toBe(2);
    expect(categoryAvailable('sidekickL')).toBe(true);
    expect(categoryAvailable('sidekickR')).toBe(true);
    expect(buyItem('sidekickL', SIDEKICKS[0].id).ok).toBe(true);
    expect(buyItem('sidekickR', SIDEKICKS[SIDEKICKS.length - 1].id).ok).toBe(true);
    expect(s.loadout.sidekickL).toBe(SIDEKICKS[0].id);
    expect(s.loadout.sidekickR).toBe(SIDEKICKS[SIDEKICKS.length - 1].id);
  });

  it.skipIf(!HULL1)('a 1-slot hull only allows the LEFT sidekick; switching auto-sells the right one', () => {
    const s = getSave();
    const left = SIDEKICKS[0];
    const right = SIDEKICKS[SIDEKICKS.length - 1];
    buyItem('sidekickL', left.id);
    buyItem('sidekickR', right.id);
    const start = s.credits;
    const hull1 = HULL1 as NonNullable<typeof HULL1>;
    const net = switchCost('hull', hull1.id);
    expect(net).toBe(hull1.cost - (HULL2 as NonNullable<typeof HULL2>).cost - right.cost);
    expect(buyItem('hull', hull1.id).ok).toBe(true);
    expect(s.credits).toBe(start - net);
    expect(s.loadout.sidekickL).toBe(left.id);
    expect(s.loadout.sidekickR).toBeNull();
    expect(categoryAvailable('sidekickR')).toBe(false);
    expect(buyItem('sidekickR', right.id)).toMatchObject({ ok: false, reason: 'slot' });
    expect(buyItem('sidekickL', right.id).ok).toBe(true);
  });

  it.skipIf(!HULL0)('a 0-slot hull carries no sidekick', () => {
    const s = getSave();
    const left = SIDEKICKS[0];
    buyItem('sidekickL', left.id);
    const start = s.credits;
    const hull0 = HULL0 as NonNullable<typeof HULL0>;
    expect(buyItem('hull', hull0.id).ok).toBe(true);
    expect(s.loadout.sidekickL).toBeNull();
    expect(s.loadout.sidekickR).toBeNull();
    expect(s.credits).toBe(start - (hull0.cost - (HULL2 as NonNullable<typeof HULL2>).cost - left.cost));
    expect(buyItem('sidekickL', left.id)).toMatchObject({ ok: false, reason: 'slot' });
    expect(buyItem('sidekickL', null).ok).toBe(true); // selling / None is always allowed
  });
});

describe.skipIf(!hasCore)('ship value', () => {
  beforeEach(() => { setup(); });

  it('loadoutValue sums the trade-in value of every slot', () => {
    const s = getSave();
    changePower('front', 1);
    changePower('front', 1);
    if (SIDEKICKS.length && sidekickSlots() > 0) buyItem('sidekickL', SIDEKICKS[0].id);
    const hull = HULLS.find((h) => h.id === s.loadout.hull);
    const sk = SIDEKICKS.find((k) => k.id === s.loadout.sidekickL);
    const expected = (hull?.cost ?? 0) + FRONTS[0].cost + FRONTS[0].upgradeBase * 3 + SHIELDS[0].cost + GENERATORS[0].cost + (sk?.cost ?? 0);
    expect(loadoutValue()).toBe(expected);
  });

  it('selling everything and buying it back is credit-neutral', () => {
    const s = getSave();
    if (!SIDEKICKS.length || sidekickSlots() === 0) return;
    const start = s.credits;
    buyItem('sidekickL', SIDEKICKS[0].id);
    buyItem('sidekickL', null);
    expect(s.credits).toBe(start);
  });
});
